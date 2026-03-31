"""
main.py — FastAPI application for Moriarty — Quantum Circuit Debugger.

Exposes RESTful endpoints for:
  • Circuit execution (measurement counts + statevector).
  • Circuit optimisation via Qiskit's transpiler.
  • Export to LaTeX, PNG image, and Bloch sphere visualisation.
  • Advanced algorithms (VQE / QAOA).
  • Quantum Fourier Transform (QFT) construction and simulation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    CircuitRequest,
    ExecutionResult,
    AlgorithmRequest,
    AlgorithmResponse,
    VQERequest,
    VQEResponse,
    QFTRequest,
    QFTResponse,
    QAOARequest,
    QAOAResponse,
    QuantumWalkRequest,
    QuantumWalkResponse,
)
from simulation import (
    build_circuit,
    run_circuit,
    get_statevector,
    get_bloch_image,
    build_qft_circuit,
)
from optimization import optimize_circuit
from algorithms import (
    run_optimization, run_vqe, generate_vqe_code,
    generate_maxcut_code, maxcut_hamiltonian_from_adjacency,
    run_qaoa, generate_qaoa_code,
    run_quantum_walk, generate_walk_code, generate_graph,
)
from algorithms.qaoa import build_qaoa_circuit
from algorithms.vqe import build_vqe_ansatz

import traceback
import os
import re
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Moriarty API",
    description="Backend API for Moriarty — building, simulating, optimising, and exporting quantum circuits.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — smart origin policy
#
# Allowed by default (no configuration needed):
#   • Any localhost / 127.0.0.1 origin on any port  (local development)
#
# To allow additional origins in production, set the CORS_ORIGINS env var:
#   CORS_ORIGINS=https://myapp.example.com,https://other.example.com
# ---------------------------------------------------------------------------

_TRUSTED_PATTERNS = [
    re.compile(r"^https?://localhost(:\d+)?$"),
    re.compile(r"^https?://127\.0\.0\.1(:\d+)?$"),
]

_extra_origins: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
]


def _is_allowed_origin(origin: str) -> bool:
    if origin in _extra_origins:
        return True
    return any(p.match(origin) for p in _TRUSTED_PATTERNS)


class SmartCORSMiddleware(BaseHTTPMiddleware):
    """Dynamic CORS middleware that validates origins at request time."""

    async def dispatch(self, request: StarletteRequest, call_next):
        origin = request.headers.get("origin", "")
        allowed = _is_allowed_origin(origin) if origin else False

        # Handle pre-flight OPTIONS requests
        if request.method == "OPTIONS" and origin:
            if allowed:
                from starlette.responses import Response
                return Response(
                    status_code=204,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Credentials": "true",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Max-Age": "600",
                    },
                )

        response = await call_next(request)

        if origin and allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response


app.add_middleware(SmartCORSMiddleware)


# ---------------------------------------------------------------------------
# Health / Root
# ---------------------------------------------------------------------------


@app.get("/")
def read_root():
    """Root endpoint — verify the API is running."""
    return {"message": "Moriarty API is running"}


@app.get("/health")
def health_check():
    """Lightweight health-check for monitoring and load-balancer probes."""
    return {"status": "ok"}


@app.get("/config")
def get_config():
    """
    Returns runtime feature flags so the frontend can adapt its UI.
    ENABLE_AI is injected by docker-compose.ai.yml; defaults to false.
    """
    ai_enabled = os.environ.get("ENABLE_AI", "false").lower() == "true"
    return {"ai_enabled": ai_enabled}


# ---------------------------------------------------------------------------
# Circuit execution
# ---------------------------------------------------------------------------


@app.post("/execute", response_model=ExecutionResult)
async def execute_circuit_endpoint(request: CircuitRequest):
    """
    Simulate a quantum circuit and return measurement counts + statevector.

    The circuit is built from the list of gates, executed on the Aer
    simulator for the requested number of shots, and the statevector is
    extracted from a separate measurement-free run.
    """
    try:
        gates_data = [gate.model_dump() for gate in request.gates]
        circuit = build_circuit(request.num_qubits, gates_data)

        # Measurement counts
        result_counts = run_circuit(circuit, shots=request.shots)
        if "error" in result_counts:
            raise HTTPException(status_code=500, detail=result_counts["error"])

        # Statevector (best-effort — does not block counts)
        result_sv = get_statevector(circuit)
        if "error" in result_sv:
            print(f"[WARN] Statevector error: {result_sv['error']}")

        return ExecutionResult(
            counts=result_counts.get("counts", {}),
            statevector=result_sv.get("statevector"),
            status="completed",
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Circuit optimisation
# ---------------------------------------------------------------------------


@app.post("/optimize")
async def optimize_circuit_endpoint(request: CircuitRequest):
    """
    Optimise the circuit using Qiskit's transpiler (level 3) and return
    a comparison of original vs. optimised depth and gate counts.
    """
    try:
        gates_data = [gate.model_dump() for gate in request.gates]
        circuit = build_circuit(request.num_qubits, gates_data)

        result = optimize_circuit(circuit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Export endpoints
# ---------------------------------------------------------------------------


@app.post("/export/latex")
async def export_latex(request: CircuitRequest):
    """Generate LaTeX source code for the quantum circuit diagram."""
    try:
        gates_data = [gate.model_dump() for gate in request.gates]
        circuit = build_circuit(request.num_qubits, gates_data)
        latex_source = circuit.draw(output="latex_source")
        return {"latex": latex_source}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export/image")
async def export_image(request: CircuitRequest):
    """Render the circuit as a PNG image and return it Base64-encoded."""
    try:
        import base64
        from io import BytesIO

        gates_data = [gate.model_dump() for gate in request.gates]
        circuit = build_circuit(request.num_qubits, gates_data)

        fig = circuit.draw(output="mpl")
        buf = BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode("utf-8")

        return {"image_base64": img_str}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export/bloch")
async def export_bloch_sphere_endpoint(request: CircuitRequest):
    """Generate per-qubit Bloch sphere images (Base64 PNGs)."""
    try:
        gates_data = [gate.model_dump() for gate in request.gates]
        circuit = build_circuit(request.num_qubits, gates_data)

        result = get_bloch_image(circuit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Advanced algorithms (VQE / QAOA)
# ---------------------------------------------------------------------------


@app.post("/run-algorithm", response_model=AlgorithmResponse)
async def run_algorithm_endpoint(request: AlgorithmRequest):
    """
    Run a variational quantum algorithm (VQE or QAOA).

    The user's circuit acts as the ansatz; rotation gates become tuneable
    parameters that the classical optimiser adjusts to minimise the
    Hamiltonian expectation value.
    """
    try:
        result = run_optimization(
            circuit_data=request.circuit,
            hamiltonian_str=request.hamiltonian,
            max_iter=request.max_iter,
            method=request.optimizer,
        )

        if result.get("status") == "failed":
            raise HTTPException(status_code=500, detail=result.get("error"))

        return AlgorithmResponse(
            status="completed",
            optimal_energy=result.get("optimal_energy"),
            optimal_params=result.get("optimal_params"),
            history=result.get("history"),
            message=result.get("message"),
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Quantum Fourier Transform (QFT)
# ---------------------------------------------------------------------------


@app.post("/qft", response_model=QFTResponse)
async def run_qft_endpoint(request: QFTRequest):
    """
    Build and simulate a Quantum Fourier Transform circuit.

    Optionally initialise the register to a specific bitstring before
    applying QFT (or inverse QFT).  Returns measurement counts,
    statevector, circuit depth, and total gate count.
    """
    try:
        # Build the QFT circuit
        qft_circuit = build_qft_circuit(request.num_qubits, inverse=request.inverse)

        # Optionally prepend X gates to set the initial state
        if request.initial_state:
            from qiskit import QuantumCircuit

            init_qc = QuantumCircuit(request.num_qubits)
            for i, bit in enumerate(reversed(request.initial_state)):
                if bit == "1":
                    init_qc.x(i)
            full_circuit = init_qc.compose(qft_circuit)
        else:
            full_circuit = qft_circuit

        # Gather metrics
        depth = full_circuit.depth()
        num_gates = sum(full_circuit.count_ops().values())

        # Simulate
        result_counts = run_circuit(full_circuit, shots=request.shots)
        result_sv = get_statevector(full_circuit)

        return QFTResponse(
            counts=result_counts.get("counts"),
            statevector=result_sv.get("statevector"),
            circuit_depth=depth,
            num_gates=num_gates,
            status="completed",
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
#  QAOA endpoint
# ---------------------------------------------------------------------------


@app.post("/qaoa", response_model=QAOAResponse)
async def run_qaoa_endpoint(request: QAOARequest):
    """
    Run a full QAOA optimization for an Ising-model cost Hamiltonian.

    Accepts an interaction matrix J_{ij}, number of QAOA layers, and
    optimizer settings.  Returns optimal parameters, measurement counts,
    statevector probabilities, convergence history, and auto-generated
    code for Qiskit, PennyLane, Cirq, Q#, and OpenQASM.
    """
    try:
        result = run_qaoa(
            num_qubits=request.num_qubits,
            interaction_matrix=request.interaction_matrix,
            p_layers=request.p_layers,
            max_iter=request.max_iter,
            method=request.optimizer,
            shots=request.shots,
            linear_terms=request.linear_terms,
        )

        # Generate code for all frameworks
        code = {}
        for fw in ("qiskit", "pennylane", "cirq", "qsharp", "qasm"):
            code[fw] = generate_qaoa_code(
                num_qubits=request.num_qubits,
                interaction_matrix=request.interaction_matrix,
                opt_gammas=result["optimal_gammas"],
                opt_betas=result["optimal_betas"],
                framework=fw,
                linear_terms=request.linear_terms,
            )

        # Generate circuit diagram
        circuit_diagram = None
        try:
            import base64
            from io import BytesIO
            import matplotlib
            matplotlib.use("Agg")

            qc = build_qaoa_circuit(
                num_qubits=request.num_qubits,
                interaction_matrix=request.interaction_matrix,
                gammas=result["optimal_gammas"],
                betas=result["optimal_betas"],
                linear_terms=request.linear_terms,
            )
            fig = qc.draw(output="mpl")
            buf = BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight", dpi=120)
            buf.seek(0)
            circuit_diagram = base64.b64encode(buf.read()).decode("utf-8")
            import matplotlib.pyplot as plt
            plt.close(fig)
        except Exception:
            pass  # diagram is optional, don't fail the request

        return QAOAResponse(
            status="completed",
            optimal_energy=result["optimal_energy"],
            optimal_gammas=result["optimal_gammas"],
            optimal_betas=result["optimal_betas"],
            optimal_params=result["optimal_params"],
            history=result["history"],
            counts=result["counts"],
            probabilities=result["probabilities"],
            most_likely_state=result["most_likely_state"],
            p_layers=result["p_layers"],
            code=code,
            circuit_diagram=circuit_diagram,
            message=result.get("message"),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
#  VQE (standalone) endpoint
# ---------------------------------------------------------------------------


@app.post("/vqe", response_model=VQEResponse)
async def run_vqe_endpoint(request: VQERequest):
    """
    Run a full standalone VQE optimization.

    Accepts Hamiltonian bases/scales, builds an RY ansatz internally,
    optimises parameters, and returns measurement counts, convergence
    history, and auto-generated code for all five frameworks.
    """
    try:
        # Determine bases/scales from adjacency matrix or direct input
        is_maxcut = (
            request.problem_type == "maxcut" and request.adjacency_matrix is not None
        )

        if is_maxcut:
            h_bases, h_scales = maxcut_hamiltonian_from_adjacency(
                request.adjacency_matrix,
                invert=request.invert_adjacency,
            )
            # Auto-derive num_qubits from adjacency matrix dimensions
            n_qubits = len(request.adjacency_matrix)
        else:
            h_bases = request.hamiltonian_bases or []
            h_scales = request.hamiltonian_scales or []
            n_qubits = request.num_qubits

        if not h_bases:
            raise HTTPException(
                status_code=400,
                detail="Provide hamiltonian_bases/scales or adjacency_matrix with problem_type='maxcut'.",
            )

        result = run_vqe(
            num_qubits=n_qubits,
            hamiltonian_bases=h_bases,
            hamiltonian_scales=h_scales,
            ansatz_depth=request.ansatz_depth,
            max_iter=request.max_iter,
            method=request.optimizer,
            shots=request.shots,
        )

        # Generate code for all frameworks
        code = {}
        for fw in ("qiskit", "pennylane", "cirq", "qsharp", "qasm"):
            if is_maxcut:
                code[fw] = generate_maxcut_code(
                    adjacency_matrix=request.adjacency_matrix,
                    opt_params=result["optimal_params"],
                    invert_adjacency=request.invert_adjacency,
                    framework=fw,
                )
            else:
                code[fw] = generate_vqe_code(
                    num_qubits=n_qubits,
                    hamiltonian_bases=h_bases,
                    hamiltonian_scales=h_scales,
                    opt_params=result["optimal_params"],
                    ansatz_depth=request.ansatz_depth,
                    framework=fw,
                )

        # Generate circuit diagram
        circuit_diagram = None
        try:
            import base64
            from io import BytesIO
            import matplotlib
            matplotlib.use("Agg")
            import numpy as np

            ansatz, params = build_vqe_ansatz(n_qubits, request.ansatz_depth)
            bound = ansatz.assign_parameters(
                dict(zip(params, result["optimal_params"]))
            )
            fig = bound.draw(output="mpl")
            buf = BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight", dpi=120)
            buf.seek(0)
            circuit_diagram = base64.b64encode(buf.read()).decode("utf-8")
            import matplotlib.pyplot as plt
            plt.close(fig)
        except Exception:
            pass  # diagram is optional, don't fail the request

        return VQEResponse(
            status="completed",
            optimal_energy=result["optimal_energy"],
            optimal_params=result["optimal_params"],
            history=result["history"],
            counts=result["counts"],
            probabilities=result["probabilities"],
            most_likely_state=result["most_likely_state"],
            ansatz_depth=result["ansatz_depth"],
            code=code,
            circuit_diagram=circuit_diagram,
            hamiltonian_bases=h_bases,
            hamiltonian_scales=h_scales,
            message=result.get("message"),
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
#  Quantum Walk endpoint
# ---------------------------------------------------------------------------


@app.post("/quantum-walk", response_model=QuantumWalkResponse)
async def run_quantum_walk_endpoint(request: QuantumWalkRequest):
    """
    Run a Continuous-Time Quantum Walk (CTQW) on a graph.

    Provide ``topology`` + ``num_vertices`` to auto-generate a graph, or
    supply a custom ``adjacency_matrix``.
    """
    try:
        # Build adjacency matrix
        if request.adjacency_matrix:
            adj = request.adjacency_matrix
        elif request.topology:
            adj = generate_graph(request.topology, request.num_vertices)
        else:
            adj = generate_graph("cycle", request.num_vertices)

        result = run_quantum_walk(
            adjacency_matrix=adj,
            initial_vertex=request.initial_vertex,
            num_steps=request.num_steps,
            dt=request.dt,
            shots=request.shots,
        )

        # Generate code for all frameworks
        code = {}
        for fw in ("qiskit", "pennylane", "cirq", "qsharp", "qasm"):
            code[fw] = generate_walk_code(
                adjacency_matrix=adj,
                initial_vertex=request.initial_vertex,
                num_steps=request.num_steps,
                dt=request.dt,
                framework=fw,
            )

        return QuantumWalkResponse(
            status="completed",
            probability_evolution=result["probability_evolution"],
            final_counts=result["final_counts"],
            most_likely_vertex=result["most_likely_vertex"],
            most_likely_state=result["most_likely_state"],
            num_vertices=result["num_vertices"],
            num_qubits=result["num_qubits"],
            num_steps=result["num_steps"],
            dt=result["dt"],
            initial_vertex=result["initial_vertex"],
            code=code,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# AI Chat Assistant (Ollama / Qiskit model)
# ---------------------------------------------------------------------------


from pydantic import BaseModel
from typing import Optional, List
from chat import chat_with_model, check_ollama_available, stream_chat, build_circuit_from_text, list_models, pull_model, delete_model
from fastapi.responses import StreamingResponse as FastAPIStreamingResponse


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    model: Optional[str] = None
    circuit_context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    model: str
    available: bool
    error: Optional[str] = None
    circuit: Optional[dict] = None


class BuildCircuitRequest(BaseModel):
    description: str
    model: Optional[str] = None


@app.get("/chat/status")
async def chat_status():
    """
    Check whether the Ollama service is running and which models are available.
    The frontend uses this to show/hide the AI assistant panel.
    """
    status = await check_ollama_available()
    return status


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Send a message to the local Qiskit AI model via Ollama.

    Accepts the full conversation history so the model maintains context.
    Optionally accepts the current circuit state for context-aware responses.
    Falls back gracefully when Ollama is not running.
    """
    try:
        history = [
            {"role": m.role, "content": m.content}
            for m in (request.history or [])
        ]
        result = await chat_with_model(
            message=request.message,
            history=history,
            model=request.model,
            circuit_context=request.circuit_context,
        )
        return ChatResponse(
            response=result["response"],
            model=result["model"],
            available=result["available"],
            error=result["error"],
            circuit=result.get("circuit"),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Stream the AI response token by token using Server-Sent Events (SSE).
    Tokens arrive in real-time so the user sees the response being typed out,
    eliminating the long wait for the full response to be generated.
    """
    history = [
        {"role": m.role, "content": m.content}
        for m in (request.history or [])
    ]
    return FastAPIStreamingResponse(
        stream_chat(
            message=request.message,
            history=history,
            model=request.model,
            circuit_context=request.circuit_context,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/chat/build-circuit")
async def chat_build_circuit_endpoint(request: BuildCircuitRequest):
    """
    Convert a natural language circuit description into a circuit grid.
    Returns a grid dict compatible with the frontend setCircuit() function.
    Example: {"description": "Bell state"} -> {"grid": {"q0-s0": "H", ...}, "num_qubits": 2}
    """
    try:
        result = await build_circuit_from_text(
            description=request.description,
            model=request.model,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/models")
async def chat_models_endpoint():
    """
    Return the model catalogue with installation status for each model.
    The frontend uses this to show which models are installed and which need downloading.
    """
    try:
        models = await list_models()
        return {"models": models}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class PullModelRequest(BaseModel):
    model_id: str


@app.post("/chat/models/pull")
async def chat_models_pull_endpoint(request: PullModelRequest):
    """
    Download a model from Ollama, streaming progress as SSE.
    The frontend shows a progress bar while the model is being downloaded.
    """
    return FastAPIStreamingResponse(
        pull_model(request.model_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.delete("/chat/models/{model_id:path}")
async def chat_models_delete_endpoint(model_id: str):
    """
    Delete a locally installed model from Ollama.
    The frontend shows a trash icon on installed models.
    """
    result = await delete_model(model_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Delete failed"))
    return {"success": True, "model_id": model_id}
