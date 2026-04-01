"""
chat.py — AI Chat Assistant for the Quantum Circuit Debugger.

Connects to a locally running Ollama instance.
Endpoints:
  * /chat/stream        — streaming SSE for real-time token output
  * /chat               — non-streaming fallback
  * /chat/status        — availability check
  * /chat/build-circuit — convert natural language to circuit grid JSON
"""

import httpx
import json
import os
import re
from typing import Optional, AsyncIterator

# ---------------------------------------------------------------------------
# Ollama configuration
# OLLAMA_HOST is injected by docker-compose: http://ollama:11434
# Falls back to localhost for native/development installs
# ---------------------------------------------------------------------------
OLLAMA_BASE_URL = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
DEFAULT_MODEL   = "qwen2.5:1.5b"

GENERATION_OPTIONS = {
    "temperature": 0.3,
    "num_predict": 300,  # Reduzido de 600 para respostas mais rápidas
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "num_ctx": 2048,
    "num_gpu": 99,  # Usar GPU se disponível (99 = todas as camadas)
    "batch_size": 512,  # Aumentar batch size para processamento mais rápido
}

BUILD_CIRCUIT_OPTIONS = {
    "temperature": 0.1,
    "num_predict": 200,  # Reduzido de 500 - circuitos precisam de menos tokens
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "num_ctx": 1024,
    "num_gpu": 99,
    "batch_size": 512,
}

# ---------------------------------------------------------------------------
# Pre-defined circuits for well-known algorithms
# (the small model cannot reliably generate these)
# ---------------------------------------------------------------------------

PRESET_CIRCUITS: dict = {
    # ---- Bell state --------------------------------------------------------
    "bell": {
        "grid": {"q0-s0": "H", "q0-s1": "\u2022", "q1-s1": "\u2295",
                 "q0-s2": "M", "q1-s2": "M"},
        "params": {},
        "num_qubits": 2,
        "description": "Bell state (maximally entangled 2-qubit state)",
    },
    # ---- GHZ 3-qubit -------------------------------------------------------
    "ghz": {
        "grid": {
            "q0-s0": "H",
            "q0-s1": "\u2022", "q1-s1": "\u2295",
            "q0-s2": "\u2022", "q2-s2": "\u2295",
            "q0-s3": "M", "q1-s3": "M", "q2-s3": "M",
        },
        "params": {},
        "num_qubits": 3,
        "description": "GHZ state — 3-qubit maximally entangled state",
    },
    # ---- Grover 2-qubit (oracle marks |11>) --------------------------------
    "grover": {
        "grid": {
            # Hadamard layer
            "q0-s0": "H", "q1-s0": "H",
            # Oracle: CZ marks |11>
            "q0-s1": "\u2022", "q1-s1": "Z",
            # Diffuser: H X CZ X H
            "q0-s2": "H", "q1-s2": "H",
            "q0-s3": "X", "q1-s3": "X",
            "q0-s4": "\u2022", "q1-s4": "Z",
            "q0-s5": "X", "q1-s5": "X",
            "q0-s6": "H", "q1-s6": "H",
            # Measure
            "q0-s7": "M", "q1-s7": "M",
        },
        "params": {},
        "num_qubits": 2,
        "description": "Grover's search (2 qubits, oracle marks |11⟩ — 1 iteration)",
    },
    # ---- Quantum Teleportation ---------------------------------------------
    "teleportation": {
        "grid": {
            # Prepare Bell pair between q1 and q2
            "q1-s0": "H",
            "q1-s1": "\u2022", "q2-s1": "\u2295",
            # Bell measurement on q0 and q1
            "q0-s2": "\u2022", "q1-s2": "\u2295",
            "q0-s3": "H",
            "q0-s4": "M", "q1-s4": "M",
            # Classical corrections (represented as X/Z on q2)
            "q2-s5": "X",
            "q2-s6": "Z",
        },
        "params": {},
        "num_qubits": 3,
        "description": "Quantum teleportation — transfers qubit state from q0 to q2",
    },
    # ---- QFT 3-qubit -------------------------------------------------------
    "qft": {
        "grid": {
            "q0-s0": "H",
            "q0-s1": "\u2022", "q1-s1": "S",
            "q0-s2": "\u2022", "q2-s2": "T",
            "q1-s3": "H",
            "q1-s4": "\u2022", "q2-s4": "S",
            "q2-s5": "H",
            # SWAP q0 <-> q2
            "q0-s6": "SWAP", "q2-s6": "SWAP",
            "q0-s7": "M", "q1-s7": "M", "q2-s7": "M",
        },
        "params": {},
        "num_qubits": 3,
        "description": "Quantum Fourier Transform (QFT) on 3 qubits",
    },
    # ---- Deutsch-Jozsa (balanced oracle) -----------------------------------
    "deutsch": {
        "grid": {
            "q0-s0": "H", "q1-s0": "X",
            "q1-s1": "H",
            "q0-s2": "\u2022", "q1-s2": "\u2295",
            "q0-s3": "H",
            "q0-s4": "M",
        },
        "params": {},
        "num_qubits": 2,
        "description": "Deutsch-Jozsa algorithm (balanced oracle — CNOT)",
    },
    # ---- Bernstein-Vazirani (hidden string 11) ------------------------------
    "bernstein": {
        "grid": {
            "q0-s0": "H", "q1-s0": "H", "q2-s0": "X",
            "q2-s1": "H",
            "q0-s2": "\u2022", "q2-s2": "\u2295",
            "q1-s3": "\u2022", "q2-s3": "\u2295",
            "q0-s4": "H", "q1-s4": "H",
            "q0-s5": "M", "q1-s5": "M",
        },
        "params": {},
        "num_qubits": 3,
        "description": "Bernstein-Vazirani algorithm (hidden string s=11)",
    },
    # ---- Superdense coding -------------------------------------------------
    "superdense": {
        "grid": {
            # Create Bell pair
            "q0-s0": "H",
            "q0-s1": "\u2022", "q1-s1": "\u2295",
            # Encode message 11 (X then Z on q0)
            "q0-s2": "X",
            "q0-s3": "Z",
            # Decode
            "q0-s4": "\u2022", "q1-s4": "\u2295",
            "q0-s5": "H",
            "q0-s6": "M", "q1-s6": "M",
        },
        "params": {},
        "num_qubits": 2,
        "description": "Superdense coding — sends 2 classical bits using 1 qubit",
    },
    # ---- Toffoli gate demo -------------------------------------------------
    "toffoli": {
        "grid": {
            "q0-s0": "X", "q1-s0": "X",
            "q0-s1": "\u2022", "q1-s1": "\u2022", "q2-s1": "\u2295",
            "q0-s2": "M", "q1-s2": "M", "q2-s2": "M",
        },
        "params": {},
        "num_qubits": 3,
        "description": "Toffoli (CCX) gate — quantum AND gate with controls on |11⟩",
    },
}

# Keywords that map to preset circuits (lowercase)
PRESET_KEYWORDS: list[tuple[list[str], str]] = [
    (["grover", "grover's", "grovers", "amplitude amplification"], "grover"),
    (["teleport", "teleportation", "quantum teleport"], "teleportation"),
    (["qft", "quantum fourier", "fourier transform"], "qft"),
    (["ghz", "greenberger", "3-qubit entangled", "3 qubit ghz"], "ghz"),
    (["bell", "bell state", "bell pair", "epr pair"], "bell"),
    (["deutsch", "deutsch-jozsa", "deutsch jozsa"], "deutsch"),
    (["bernstein", "bernstein-vazirani", "bernstein vazirani", "hidden string"], "bernstein"),
    (["superdense", "super dense", "dense coding"], "superdense"),
    (["toffoli", "ccx", "quantum and", "fredkin"], "toffoli"),
]


def _match_preset(description: str) -> Optional[dict]:
    """Return a preset circuit if the description matches a known algorithm."""
    desc_lower = description.lower()
    for keywords, preset_key in PRESET_KEYWORDS:
        if any(kw in desc_lower for kw in keywords):
            preset = PRESET_CIRCUITS[preset_key]
            return {
                "grid": preset["grid"],
                "params": preset["params"],
                "num_qubits": preset["num_qubits"],
                "description": preset["description"],
                "raw_gates": [],
                "available": True,
                "error": None,
                "preset": True,
            }
    return None


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a quantum computing expert assistant integrated into the Quantum Circuit Debugger.

You can help users:
1. **Understand gates** - H, X, Y, Z, S, T, RX, RY, RZ, CNOT, CY, CZ, CH, SWAP, CCX (Toffoli), CSWAP (Fredkin), M (Measure)
2. **Build circuits** - describe step-by-step gate placement
3. **Explain algorithms** - Bell states, GHZ, QFT, Grover, Shor, VQE, QAOA, teleportation
4. **Interpret results** - measurement counts, statevectors, Bloch sphere
5. **Generate code** - Qiskit, OpenQASM, PennyLane, Cirq, Q#
6. **Analyse and debug circuits** - detect errors, explain issues, suggest fixes

CIRCUIT BUILDING FORMAT:
When the user asks you to create, build, or show a circuit, you MUST include a JSON block using this exact format:

```circuit
{
  "num_qubits": 2,
  "gates": [
    {"name": "H", "qubit": 0, "step": 0},
    {"name": "CNOT", "control": 0, "target": 1, "step": 1},
    {"name": "M", "qubit": 0, "step": 2},
    {"name": "M", "qubit": 1, "step": 2}
  ],
  "description": "Bell state (maximally entangled 2-qubit state)"
}
```

Gate rules:
- Single-qubit gates: use "qubit" field (H, X, Y, Z, S, T, RX, RY, RZ, M)
- Two-qubit gates: use "control" and "target" fields (CNOT, CY, CZ, CH, SWAP, CRX, CRY, CRZ)
- Three-qubit gates: "control"+"control2"+"target" for CCX; "control"+"swap1"+"swap2" for CSWAP
- Rotation gates (RX, RY, RZ, CRX, CRY, CRZ): add "angle" in radians (default 1.5708 = pi/2)
- Steps start at 0; gates at the same step are applied in parallel
- Always include M gates at the end for circuits that should be simulated

CIRCUIT ANALYSIS:
When the user asks you to analyse, explain, debug, or check the current circuit, examine the circuit context and:
- Describe what the circuit does
- Identify errors or issues (unmatched controls, missing measurements, etc.)
- Suggest improvements or fixes
- Explain the expected output or quantum state

Be concise, accurate, and educational."""


BUILD_CIRCUIT_SYSTEM = """You are a quantum circuit compiler. Convert natural language to JSON.

Output ONLY valid JSON (no extra text, no markdown):
{
  "num_qubits": <int>,
  "gates": [
    {"name": "H", "qubit": 0, "step": 0},
    {"name": "CNOT", "control": 0, "target": 1, "step": 1},
    {"name": "M", "qubit": 0, "step": 2}
  ],
  "description": "<one sentence>"
}

Gates: H X Y Z S T RX RY RZ M CNOT CY CZ CH SWAP CRX CRY CRZ CCX CSWAP
- Single qubit: {"name":"H","qubit":0,"step":0}
- CNOT: {"name":"CNOT","control":0,"target":1,"step":1}
- Rotation: {"name":"RX","qubit":0,"step":0,"angle":1.5708}
- CCX: {"name":"CCX","control":0,"control2":1,"target":2,"step":2}
Always end with M gates on measured qubits."""


# ---------------------------------------------------------------------------
# Model catalogue — models the user can choose from
# ---------------------------------------------------------------------------

AVAILABLE_MODELS = [
    {
        "id": "qwen2.5:1.5b",
        "name": "Qwen 2.5 — 1.5B",
        "creator": "Alibaba",
        "size_gb": 1.0,
        "ram_gb": 2,
        "description": "Lightest model. Fast responses, basic reasoning. Ideal for low-end machines.",
        "tag": "lightweight",
    },
    {
        "id": "qwen2.5:3b",
        "name": "Qwen 2.5 — 3B",
        "creator": "Alibaba",
        "size_gb": 2.0,
        "ram_gb": 4,
        "description": "Balanced model. Good reasoning for most quantum circuits. Recommended for most users.",
        "tag": "recommended",
    },
    {
        "id": "deepseek-r1:7b",
        "name": "DeepSeek R1 — 7B",
        "creator": "DeepSeek AI",
        "size_gb": 4.7,
        "ram_gb": 8,
        "description": "Best reasoning. Generates complex algorithms (Grover, QFT, Shor) reliably. Requires 8 GB RAM.",
        "tag": "best-reasoning",
    },
    {
        "id": "granite-code:8b",
        "name": "Granite Code — 8B",
        "creator": "IBM",
        "size_gb": 4.9,
        "ram_gb": 8,
        "description": "IBM's code-specialist model. Excellent for Qiskit/OpenQASM code generation. Requires 8 GB RAM.",
        "tag": "code-specialist",
    },
    {
        "id": "granite3.3:8b",
        "name": "Granite 3.3 — 8B",
        "creator": "IBM",
        "size_gb": 4.9,
        "ram_gb": 8,
        "description": "IBM's latest instruction-following model. Strong reasoning and code generation for quantum algorithms.",
        "tag": "code-specialist",
    },
]


async def list_models() -> list:
    """
    Return the model catalogue enriched with 'installed' status from Ollama.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                installed_ids = {m["name"] for m in resp.json().get("models", [])}
            else:
                installed_ids = set()
    except Exception:
        installed_ids = set()

    result = []
    for m in AVAILABLE_MODELS:
        entry = dict(m)
        # Ollama stores models as "name:tag" — use EXACT match only to avoid
        # false positives (e.g. qwen2.5:1.5b matching qwen2.5:3b)
        entry["installed"] = m["id"] in installed_ids
        result.append(entry)
    return result


async def pull_model(model_id: str) -> AsyncIterator[str]:
    """
    Pull (download) a model from Ollama and stream progress as SSE.
    Yields SSE events: {status, completed, total, percent, done, error}
    """
    # Validate model_id is in our catalogue
    valid_ids = {m["id"] for m in AVAILABLE_MODELS}
    if model_id not in valid_ids:
        yield f"data: {json.dumps({'error': f'Unknown model: {model_id}', 'done': True})}"
        return

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/pull",
                json={"name": model_id, "stream": True},
            ) as resp:
                if resp.status_code != 200:
                    await resp.aread()
                    yield f"data: {json.dumps({'error': f'Ollama pull error {resp.status_code}', 'done': True})}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    status = chunk.get("status", "")
                    completed = chunk.get("completed", 0)
                    total = chunk.get("total", 0)
                    percent = round((completed / total * 100), 1) if total > 0 else 0
                    done = status == "success"

                    yield f"data: {json.dumps({'status': status, 'completed': completed, 'total': total, 'percent': percent, 'done': done})}\n\n"

                    if done:
                        return

    except httpx.ConnectError:
        yield f"data: {json.dumps({'error': 'Ollama is not running. Start it with: ollama serve', 'done': True})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"


async def delete_model(model_id: str) -> dict:
    """
    Delete a model from Ollama local storage.
    Returns {success: bool, error?: str}
    """
    valid_ids = {m["id"] for m in AVAILABLE_MODELS}
    if model_id not in valid_ids:
        return {"success": False, "error": f"Unknown model: {model_id}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                "DELETE",
                f"{OLLAMA_BASE_URL}/api/delete",
                json={"name": model_id},
            )
            if resp.status_code in (200, 204):
                return {"success": True}
            else:
                body = resp.text
                return {"success": False, "error": f"Ollama error {resp.status_code}: {body}"}
    except httpx.ConnectError:
        return {"success": False, "error": "Ollama is not running"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Ollama availability check
# ---------------------------------------------------------------------------

async def check_ollama_available() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"available": True, "models": models}
    except Exception:
        pass
    return {"available": False, "models": []}


def check_ollama_available_sync() -> dict:
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"available": True, "models": models}
    except Exception:
        pass
    return {"available": False, "models": []}


# ---------------------------------------------------------------------------
# Build rich circuit context string
# ---------------------------------------------------------------------------

def _build_circuit_context_str(circuit_context: dict) -> str:
    gates = circuit_context.get("gates", [])
    num_qubits = circuit_context.get("num_qubits", 3)
    error = circuit_context.get("error")
    result = circuit_context.get("result")
    warnings = circuit_context.get("warnings", [])

    lines = [f"\n\n[CURRENT CIRCUIT - {num_qubits} qubit(s)]"]

    if not gates:
        lines.append("Circuit is empty.")
    else:
        lines.append(f"Gates ({len(gates)} total):")
        for g in gates[:20]:
            name = g.get("name", "?")
            qubits = g.get("qubits", [])
            step = g.get("step", "?")
            params = g.get("params")
            param_str = ""
            if params:
                vals = list(params.values())
                if vals:
                    param_str = f" angle={vals[0]:.3f}rad"
            lines.append(f"  step {step}: {name} on q{qubits}{param_str}")

    if warnings:
        lines.append("Detected issues:")
        for w in warnings:
            lines.append(f"  WARNING: {w}")

    if error:
        lines.append(f"Last execution error: {error}")

    if result:
        counts = result.get("counts", {})
        if counts:
            top = sorted(counts.items(), key=lambda x: -x[1])[:5]
            top_str = ", ".join(f"|{k}> = {v}" for k, v in top)
            lines.append(f"Last simulation results: {top_str}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Build messages list (shared between streaming and non-streaming)
# ---------------------------------------------------------------------------

def _build_messages(
    message: str,
    history: list,
    circuit_context: Optional[dict] = None,
) -> list:
    context_str = ""
    if circuit_context:
        context_str = _build_circuit_context_str(circuit_context)

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context_str}]

    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": message})
    return messages


# ---------------------------------------------------------------------------
# Circuit grid converter: gates list -> CircuitGrid (cellId -> gateName)
# ---------------------------------------------------------------------------

def gates_to_grid(gates_json: list, num_qubits: int) -> tuple:
    """
    Convert a list of gate dicts (from the model) into:
      - grid: {cellId: gateName}  e.g. {"q0-s0": "H", "q0-s1": "•", "q1-s1": "⊕"}
      - params: {cellId: [angle]}
    """
    grid: dict = {}
    params: dict = {}

    for g in gates_json:
        name = g.get("name", "").upper()
        step = int(g.get("step", 0))

        if name in ("H", "X", "Y", "Z", "S", "T", "M"):
            q = int(g.get("qubit", 0))
            grid[f"q{q}-s{step}"] = name

        elif name in ("RX", "RY", "RZ"):
            q = int(g.get("qubit", 0))
            cell = f"q{q}-s{step}"
            grid[cell] = name
            params[cell] = [float(g.get("angle", 1.5708))]

        elif name in ("CNOT", "CX"):
            ctrl = int(g.get("control", 0))
            tgt = int(g.get("target", 1))
            grid[f"q{ctrl}-s{step}"] = "\u2022"  # bullet •
            grid[f"q{tgt}-s{step}"] = "\u2295"   # circled plus ⊕

        elif name in ("CY", "CZ", "CH"):
            ctrl = int(g.get("control", 0))
            tgt = int(g.get("target", 1))
            gate_name = name[1:]  # CY->Y, CZ->Z, CH->H
            grid[f"q{ctrl}-s{step}"] = "\u2022"
            grid[f"q{tgt}-s{step}"] = gate_name

        elif name in ("CRX", "CRY", "CRZ"):
            ctrl = int(g.get("control", 0))
            tgt = int(g.get("target", 1))
            base = name[1:]  # CRX -> RX
            grid[f"q{ctrl}-s{step}"] = "\u2022"
            cell_tgt = f"q{tgt}-s{step}"
            grid[cell_tgt] = base
            params[cell_tgt] = [float(g.get("angle", 1.5708))]

        elif name == "SWAP":
            q1 = int(g.get("qubit", g.get("swap1", 0)))
            q2 = int(g.get("target", g.get("swap2", 1)))
            grid[f"q{q1}-s{step}"] = "SWAP"
            grid[f"q{q2}-s{step}"] = "SWAP"

        elif name in ("CCX", "TOFFOLI"):
            c1 = int(g.get("control", 0))
            c2 = int(g.get("control2", 1))
            tgt = int(g.get("target", 2))
            grid[f"q{c1}-s{step}"] = "\u2022"
            grid[f"q{c2}-s{step}"] = "\u2022"
            grid[f"q{tgt}-s{step}"] = "\u2295"

        elif name in ("CSWAP", "FREDKIN"):
            ctrl = int(g.get("control", 0))
            s1 = int(g.get("swap1", 1))
            s2 = int(g.get("swap2", 2))
            grid[f"q{ctrl}-s{step}"] = "\u2022"
            grid[f"q{s1}-s{step}"] = "SWAP"
            grid[f"q{s2}-s{step}"] = "SWAP"

    return grid, params


# ---------------------------------------------------------------------------
# Extract circuit JSON block from model response
# ---------------------------------------------------------------------------

def _extract_circuit_from_response(response: str) -> Optional[dict]:
    """
    Look for a ```circuit ... ``` block in the model response and convert it
    to a grid + params dict ready to be loaded into the debugger.
    Returns None if no circuit block is found.
    """
    match = re.search(r'```circuit\s*([\s\S]*?)```', response)
    if not match:
        return None

    try:
        data = json.loads(match.group(1).strip())
        gates_json = data.get("gates", [])
        num_qubits = int(data.get("num_qubits", 2))
        desc = data.get("description", "Circuit from AI")
        grid, params = gates_to_grid(gates_json, num_qubits)
        return {
            "grid": grid,
            "params": params,
            "num_qubits": num_qubits,
            "description": desc,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Build circuit from natural language (dedicated endpoint)
# ---------------------------------------------------------------------------

async def build_circuit_from_text(
    description: str,
    model: Optional[str] = None,
) -> dict:
    """
    Convert a natural language circuit description to a grid.
    First checks preset circuits (Grover, QFT, etc.), then falls back to the model.
    """
    # 1. Check preset circuits first (reliable, instant)
    preset = _match_preset(description)
    if preset:
        return preset

    # 2. Fall back to model for custom circuits
    selected_model = model or DEFAULT_MODEL
    messages = [
        {"role": "system", "content": BUILD_CIRCUIT_SYSTEM},
        {"role": "user", "content": f"Create a quantum circuit for: {description}"},
    ]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": selected_model,
                    "messages": messages,
                    "stream": False,
                    "options": BUILD_CIRCUIT_OPTIONS,
                },
            )
            if resp.status_code != 200:
                return {"error": f"Ollama error {resp.status_code}", "available": False}

            raw = resp.json().get("message", {}).get("content", "")

            # Extract JSON from the response (model may wrap in markdown)
            json_match = re.search(r'\{[\s\S]*\}', raw)
            if not json_match:
                return {"error": f"Model did not return valid JSON. Raw: {raw[:200]}", "available": True}

            data = json.loads(json_match.group())
            gates_json = data.get("gates", [])
            num_qubits = int(data.get("num_qubits", 2))
            desc = data.get("description", description)

            grid, params = gates_to_grid(gates_json, num_qubits)

            return {
                "grid": grid,
                "params": params,
                "num_qubits": num_qubits,
                "description": desc,
                "raw_gates": gates_json,
                "available": True,
                "error": None,
                "preset": False,
            }

    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "available": True}
    except httpx.ConnectError:
        return {"error": "Ollama is not running. Start it with: ollama serve", "available": False}
    except httpx.TimeoutException:
        return {"error": "Request timed out. Try again.", "available": True}
    except Exception as e:
        return {"error": str(e), "available": True}


# ---------------------------------------------------------------------------
# Streaming generator — yields SSE-formatted chunks
# ---------------------------------------------------------------------------

async def stream_chat(
    message: str,
    history: list,
    model: Optional[str] = None,
    circuit_context: Optional[dict] = None,
) -> AsyncIterator[str]:
    """
    Stream the model response as Server-Sent Events (SSE).
    The final event includes any circuit JSON block found in the response.
    Before streaming, check if the message is a circuit-build request for a preset.
    """
    # Resolve model: use requested model if installed, else fall back to first available
    requested_model = model or DEFAULT_MODEL
    try:
        async with httpx.AsyncClient(timeout=3.0) as _c:
            _tags = await _c.get(f"{OLLAMA_BASE_URL}/api/tags")
            if _tags.status_code == 200:
                installed = {m["name"] for m in _tags.json().get("models", [])}
                if requested_model in installed:
                    selected_model = requested_model
                elif installed:
                    # Prefer DEFAULT_MODEL if available, otherwise first installed
                    selected_model = DEFAULT_MODEL if DEFAULT_MODEL in installed else next(iter(installed))
                else:
                    selected_model = requested_model  # will fail with clear error
            else:
                selected_model = requested_model
    except Exception:
        selected_model = requested_model

    # Check if user is asking to create a known preset circuit
    # If so, inject the preset circuit data into the done event
    preset_circuit = None
    msg_lower = message.lower()
    create_keywords = ["create", "build", "make", "show", "generate", "give me", "crie", "construa"]
    if any(kw in msg_lower for kw in create_keywords):
        preset = _match_preset(message)
        if preset:
            preset_circuit = {
                "grid": preset["grid"],
                "params": preset["params"],
                "num_qubits": preset["num_qubits"],
                "description": preset["description"],
            }

    messages = _build_messages(message, history, circuit_context)
    full_response = ""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": selected_model,
                    "messages": messages,
                    "stream": True,
                    "options": GENERATION_OPTIONS,
                },
            ) as resp:
                if resp.status_code != 200:
                    await resp.aread()
                    yield f"data: {json.dumps({'error': f'Ollama error {resp.status_code}', 'done': True, 'available': False})}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    token = chunk.get("message", {}).get("content", "")
                    done = chunk.get("done", False)

                    if token:
                        full_response += token
                        yield f"data: {json.dumps({'token': token, 'done': False, 'available': True})}\n\n"

                    if done:
                        # Use preset circuit if available, otherwise try to extract from response
                        circuit_data = preset_circuit or _extract_circuit_from_response(full_response)
                        yield f"data: {json.dumps({'token': '', 'done': True, 'response': full_response, 'model': selected_model, 'requested_model': requested_model, 'available': True, 'circuit': circuit_data})}\n\n"
                        return

    except httpx.ConnectError:
        yield f"data: {json.dumps({'error': 'Ollama is not running. Start it with: ollama serve', 'done': True, 'available': False})}\n\n"
    except httpx.TimeoutException:
        yield f"data: {json.dumps({'error': 'Request timed out. The model may be loading - try again.', 'done': True, 'available': False})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'done': True, 'available': False})}\n\n"


# ---------------------------------------------------------------------------
# Non-streaming fallback (kept for compatibility)
# ---------------------------------------------------------------------------

async def chat_with_model(
    message: str,
    history: list,
    model: Optional[str] = None,
    circuit_context: Optional[dict] = None,
) -> dict:
    selected_model = model or DEFAULT_MODEL
    messages = _build_messages(message, history, circuit_context)

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": selected_model,
                    "messages": messages,
                    "stream": False,
                    "options": GENERATION_OPTIONS,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                reply = data.get("message", {}).get("content", "")
                circuit_data = _extract_circuit_from_response(reply)
                return {
                    "response": reply,
                    "model": selected_model,
                    "available": True,
                    "error": None,
                    "circuit": circuit_data,
                }
            else:
                return {
                    "response": "",
                    "model": selected_model,
                    "available": False,
                    "error": f"Ollama returned status {resp.status_code}: {resp.text[:200]}",
                    "circuit": None,
                }
    except httpx.ConnectError:
        return {
            "response": "",
            "model": selected_model,
            "available": False,
            "error": "Ollama is not running. Start it with: ollama serve",
            "circuit": None,
        }
    except httpx.TimeoutException:
        return {
            "response": "",
            "model": selected_model,
            "available": False,
            "error": "Request timed out. The model may be loading - try again in a moment.",
            "circuit": None,
        }
    except Exception as e:
        return {
            "response": "",
            "model": selected_model,
            "available": False,
            "error": str(e),
            "circuit": None,
        }
