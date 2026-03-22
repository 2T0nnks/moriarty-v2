/**
 * api.ts — HTTP client layer for the Quantum Circuit Debugger backend.
 *
 * Wraps Axios calls to every API endpoint and exports strongly-typed
 * interfaces for request / response payloads.
 */

import axios from 'axios';

/** Base URL of the FastAPI backend.
 * NEXT_PUBLIC_API_URL is baked into the client bundle at build time.
 * In Docker: set to http://localhost:8000 (the host-exposed backend port).
 * In dev: falls back to http://localhost:8000.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single quantum gate in the circuit model. */
export interface QuantumGate {
    name: string;
    qubits: number[];
    params?: number[];
}

/** Result of a circuit execution (counts + optional statevector). */
export interface ExecutionResult {
    counts: Record<string, number>;
    statevector?: number[][]; // [[real, imag], ...]
    status: string;
    error?: string;
}

/** Result of circuit optimisation (depth / gate-count comparison). */
export interface OptimizationResult {
    original_depth: number;
    optimized_depth: number;
    original_ops: Record<string, number>;
    optimized_ops: Record<string, number>;
    optimized_qasm: string;
    improvement_msg: string;
    error?: string;
}

/** Result of a VQE / QAOA algorithm run. */
export interface AlgorithmResponse {
    status: string;
    optimal_energy?: number;
    optimal_params?: number[];
    history?: number[];
    message?: string;
    error?: string;
}

/** Result of a QFT simulation. */
export interface QFTResponse {
    counts?: Record<string, number>;
    statevector?: number[][];
    circuit_depth?: number;
    num_gates?: number;
    status: string;
    error?: string;
}

/** Full QAOA execution result with code export. */
export interface QAOAResponse {
    status: string;
    optimal_energy?: number;
    optimal_gammas?: number[];
    optimal_betas?: number[];
    optimal_params?: number[];
    history?: number[];
    counts?: Record<string, number>;
    probabilities?: number[];
    most_likely_state?: string;
    p_layers?: number;
    code?: Record<string, string>;
    circuit_diagram?: string;
    message?: string;
    error?: string;
}

/** Full standalone VQE execution result with code export. */
export interface VQEResponse {
    status: string;
    optimal_energy?: number;
    optimal_params?: number[];
    history?: number[];
    counts?: Record<string, number>;
    probabilities?: number[];
    most_likely_state?: string;
    ansatz_depth?: number;
    code?: Record<string, string>;
    circuit_diagram?: string;
    hamiltonian_bases?: string[];
    hamiltonian_scales?: number[];
    message?: string;
    error?: string;
}

/** Quantum Walk (CTQW) execution result. */
export interface QuantumWalkResponse {
    status: string;
    probability_evolution?: { time: number; probabilities: number[] }[];
    final_counts?: Record<string, number>;
    most_likely_vertex?: number;
    most_likely_state?: string;
    num_vertices?: number;
    num_qubits?: number;
    num_steps?: number;
    dt?: number;
    initial_vertex?: number;
    code?: Record<string, string>;
    error?: string;
}

// ---------------------------------------------------------------------------
// Endpoint wrappers
// ---------------------------------------------------------------------------

/**
 * Execute a quantum circuit and return measurement counts + statevector.
 *
 * @param gates     Ordered gate list.
 * @param numQubits Number of qubits.
 * @param shots     Measurement repetitions (default 1024).
 */
export const executeCircuit = async (
    gates: QuantumGate[],
    numQubits: number,
    shots: number = 1024,
): Promise<ExecutionResult> => {
    try {
        const response = await axios.post(`${API_URL}/execute`, {
            gates,
            num_qubits: numQubits,
            shots,
        });
        return response.data;
    } catch (error) {
        console.error('Error executing circuit:', error);
        throw error;
    }
};

/**
 * Optimise the circuit via Qiskit's transpiler and return comparison metrics.
 *
 * @param gates     Ordered gate list.
 * @param numQubits Number of qubits.
 */
export const optimizeCircuit = async (
    gates: QuantumGate[],
    numQubits: number,
): Promise<OptimizationResult> => {
    try {
        const response = await axios.post(`${API_URL}/optimize`, {
            gates,
            num_qubits: numQubits,
        });
        return response.data;
    } catch (error) {
        console.error('Error optimizing circuit:', error);
        throw error;
    }
};

/**
 * Request LaTeX source code for the circuit.
 */
export const exportToLatex = async (
    gates: QuantumGate[],
    numQubits: number,
): Promise<{ latex: string }> => {
    const response = await axios.post(`${API_URL}/export/latex`, {
        gates,
        num_qubits: numQubits,
    });
    return response.data;
};

/**
 * Request a rendered PNG image of the circuit (Base64-encoded).
 */
export const exportToImage = async (
    gates: QuantumGate[],
    numQubits: number,
): Promise<{ image_base64: string }> => {
    const response = await axios.post(`${API_URL}/export/image`, {
        gates,
        num_qubits: numQubits,
    });
    return response.data;
};

/**
 * Request per-qubit Bloch sphere visualisations (Base64 PNGs).
 */
export const exportToBloch = async (
    gates: QuantumGate[],
    numQubits: number,
): Promise<{ bloch_images?: string[]; image_base64?: string }> => {
    const response = await axios.post(`${API_URL}/export/bloch`, {
        gates,
        num_qubits: numQubits,
    });
    return response.data;
};

/**
 * Run a variational quantum algorithm (VQE / QAOA).
 *
 * @param gates       Ansatz circuit gates.
 * @param numQubits   Number of qubits.
 * @param hamiltonian Hamiltonian expression string.
 * @param algorithm   ``"VQE"`` or ``"QAOA"``.
 * @param maxIter     Maximum optimiser iterations.
 * @param optimizer   SciPy optimiser name.
 */
export const runAlgorithm = async (
    gates: QuantumGate[],
    numQubits: number,
    hamiltonian: string,
    algorithm: string = 'VQE',
    maxIter: number = 50,
    optimizer: string = 'COBYLA',
): Promise<AlgorithmResponse> => {
    try {
        const response = await axios.post(`${API_URL}/run-algorithm`, {
            circuit: { gates, num_qubits: numQubits },
            hamiltonian,
            algorithm,
            max_iter: maxIter,
            optimizer,
        });
        return response.data;
    } catch (error) {
        console.error('Error running algorithm:', error);
        throw error;
    }
};

/**
 * Build and simulate a Quantum Fourier Transform circuit.
 *
 * @param numQubits    Number of qubits.
 * @param initialState Optional bitstring to initialise the register.
 * @param inverse      Whether to apply QFT† instead of QFT.
 * @param shots        Measurement repetitions (default 1024).
 */
export const runQFT = async (
    numQubits: number,
    initialState?: string,
    inverse: boolean = false,
    shots: number = 1024,
): Promise<QFTResponse> => {
    try {
        const response = await axios.post(`${API_URL}/qft`, {
            num_qubits: numQubits,
            initial_state: initialState || null,
            inverse,
            shots,
        });
        return response.data;
    } catch (error) {
        console.error('Error running QFT:', error);
        throw error;
    }
};

/**
 * Run a QAOA optimization with generalised Ising Hamiltonian.
 * H = Σ J_{ij} Z_i Z_j + Σ h_i Z_i
 *
 * @param numQubits         Number of qubits.
 * @param interactionMatrix Upper-triangular coupling matrix J_{ij}.
 * @param pLayers           Number of QAOA layers (default 1).
 * @param maxIter           Max optimizer iterations (default 100).
 * @param optimizer         SciPy optimizer (default COBYLA).
 * @param shots             Measurement shots (default 1024).
 * @param linearTerms       Optional single-qubit Z field h_i array.
 */
export const runQAOA = async (
    numQubits: number,
    interactionMatrix: number[][],
    pLayers: number = 1,
    maxIter: number = 100,
    optimizer: string = 'COBYLA',
    shots: number = 1024,
    linearTerms?: number[],
): Promise<QAOAResponse> => {
    try {
        const response = await axios.post(`${API_URL}/qaoa`, {
            num_qubits: numQubits,
            interaction_matrix: interactionMatrix,
            linear_terms: linearTerms || null,
            p_layers: pLayers,
            max_iter: maxIter,
            optimizer,
            shots,
        });
        return response.data;
    } catch (error) {
        console.error('Error running QAOA:', error);
        throw error;
    }
};

/**
 * Run a standalone VQE optimization with Hamiltonian bases/scales.
 *
 * @param numQubits        Number of qubits.
 * @param hamiltonianBases Pauli basis strings, e.g. ["ZZ", "ZI"].
 * @param hamiltonianScales Scale factors for each basis term.
 * @param ansatzDepth      Number of RY ansatz layers (default 1).
 * @param maxIter          Max optimizer iterations (default 100).
 * @param optimizer        SciPy optimizer (default COBYLA).
 * @param shots            Measurement shots (default 1024).
 */
export const runVQE = async (
    numQubits: number,
    hamiltonianBases: string[],
    hamiltonianScales: number[],
    ansatzDepth: number = 1,
    maxIter: number = 100,
    optimizer: string = 'COBYLA',
    shots: number = 1024,
    adjacencyMatrix?: number[][],
    problemType?: string,
    invertAdjacency?: boolean,
): Promise<VQEResponse> => {
    try {
        const payload: any = {
            num_qubits: numQubits,
            ansatz_depth: ansatzDepth,
            max_iter: maxIter,
            optimizer,
            shots,
        };
        if (adjacencyMatrix && problemType === 'maxcut') {
            payload.adjacency_matrix = adjacencyMatrix;
            payload.problem_type = 'maxcut';
            payload.invert_adjacency = invertAdjacency ?? true;
        } else {
            payload.hamiltonian_bases = hamiltonianBases;
            payload.hamiltonian_scales = hamiltonianScales;
        }
        const response = await axios.post(`${API_URL}/vqe`, payload);
        return response.data;
    } catch (error) {
        console.error('Error running VQE:', error);
        throw error;
    }
};

/**
 * Run a Continuous-Time Quantum Walk (CTQW) on a graph.
 *
 * @param topology        Graph topology: cycle, path, complete, star, grid.
 * @param numVertices     Number of graph vertices.
 * @param initialVertex   Starting vertex (0-indexed).
 * @param numSteps        Number of time snapshots.
 * @param dt              Time step size.
 * @param shots           Measurement shots (default 1024).
 * @param adjacencyMatrix Optional custom adjacency matrix.
 */
export const runQuantumWalk = async (
    topology: string,
    numVertices: number,
    initialVertex: number = 0,
    numSteps: number = 10,
    dt: number = 0.5,
    shots: number = 1024,
    adjacencyMatrix?: number[][],
): Promise<QuantumWalkResponse> => {
    try {
        const response = await axios.post(`${API_URL}/quantum-walk`, {
            topology,
            num_vertices: numVertices,
            adjacency_matrix: adjacencyMatrix || null,
            initial_vertex: initialVertex,
            num_steps: numSteps,
            dt,
            shots,
        });
        return response.data;
    } catch (error) {
        console.error('Error running quantum walk:', error);
        throw error;
    }
};


// ---------------------------------------------------------------------------
// AI Chat Assistant
// ---------------------------------------------------------------------------

export interface ChatMessagePayload {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatCircuitContext {
    gates: Array<{ name: string; qubits: number[]; step: number; params?: Record<string, number> }>;
    num_qubits: number;
    error?: string | null;
    result?: { counts?: Record<string, number>; statevector?: number[][] } | null;
    warnings?: string[];
}

export interface CircuitGrid {
    grid: Record<string, string>;
    params: Record<string, number[]>;
    num_qubits: number;
    description: string;
    error?: string | null;
    available?: boolean;
}

export interface ChatResponse {
    response: string;
    model: string;
    available: boolean;
    error?: string | null;
    circuit?: CircuitGrid | null;
}

/**
 * Check whether the Ollama service is running and which models are available.
 * Used by the ChatAssistant component to show the online/offline status dot.
 */
export const checkChatStatus = async (): Promise<{ available: boolean; models: string[] }> => {
    try {
        const response = await axios.get(`${API_URL}/chat/status`, { timeout: 4000 });
        return response.data;
    } catch {
        return { available: false, models: [] };
    }
};

/**
 * Send a message to the local Qiskit AI model via Ollama.
 *
 * @param message        The user's message.
 * @param history        Previous conversation turns.
 * @param circuitContext Optional current circuit state for context-aware responses.
 * @param model          Optional model override (defaults to granite3.3:8b on the server).
 */
export const sendChatMessage = async (
    message: string,
    history: ChatMessagePayload[] = [],
    circuitContext?: ChatCircuitContext,
    model?: string,
): Promise<ChatResponse> => {
    try {
        const response = await axios.post(`${API_URL}/chat`, {
            message,
            history,
            circuit_context: circuitContext || null,
            model: model || null,
        }, { timeout: 90000 }); // 90s — model may need time to load
        return response.data;
    } catch (error: unknown) {
        console.error('Chat error:', error);
        // Return a graceful offline response instead of throwing
        return {
            response: '',
            model: 'unknown',
            available: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
};

/**
 * Stream a message to the local AI model via Ollama using Server-Sent Events.
 * Calls onToken for each token received, and onDone when the stream ends.
 *
 * @param message        The user's message.
 * @param history        Previous conversation turns.
 * @param onToken        Callback called for each token chunk received.
 * @param onDone         Callback called when streaming is complete with the full response.
 * @param onError        Callback called on error.
 * @param circuitContext Optional current circuit state for context-aware responses.
 * @param model          Optional model override.
 */
/**
 * Build a circuit from a natural language description using the AI model.
 * Returns a CircuitGrid ready to be loaded into the debugger via setCircuit().
 */
export const buildCircuitFromChat = async (
    description: string,
    model?: string,
): Promise<CircuitGrid> => {
    try {
        const response = await axios.post(`${API_URL}/chat/build-circuit`, {
            description,
            model: model || null,
        }, { timeout: 60000 });
        return response.data;
    } catch (error: unknown) {
        return {
            grid: {},
            params: {},
            num_qubits: 2,
            description,
            error: error instanceof Error ? error.message : 'Network error',
            available: false,
        };
    }
};

export const streamChatMessage = async (
    message: string,
    history: ChatMessagePayload[],
    onToken: (token: string) => void,
    onDone: (fullResponse: string, model: string, circuit?: CircuitGrid | null, requestedModel?: string) => void,
    onError: (error: string) => void,
    circuitContext?: ChatCircuitContext,
    model?: string,
): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history,
                circuit_context: circuitContext || null,
                model: model || null,
            }),
            signal: AbortSignal.timeout(120000),
        });

        if (!response.ok || !response.body) {
            onError(`Backend error: ${response.status}`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let usedModel = 'qwen2.5:1.5b';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(trimmed.slice(6));
                    if (data.error) {
                        onError(data.error);
                        return;
                    }
                    if (data.token && !data.done) {
                        fullResponse += data.token;
                        onToken(data.token);
                    }
                    if (data.done) {
                        if (data.model) usedModel = data.model;
                        onDone(fullResponse, usedModel, data.circuit || null, data.requested_model);
                        return;
                    }
                } catch {
                    // skip malformed lines
                }
            }
        }
        // Stream ended without done event
        onDone(fullResponse, usedModel);
    } catch (error: unknown) {
        onError(error instanceof Error ? error.message : 'Stream error');
    }
};

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

/**
 * Fetches runtime feature flags from the backend.
 * ENABLE_AI is injected by docker-compose.ai.yml; defaults to false.
 */
export const fetchConfig = async (): Promise<{ ai_enabled: boolean }> => {
    try {
        const response = await axios.get<{ ai_enabled: boolean }>(`${API_URL}/config`);
        return response.data;
    } catch {
        return { ai_enabled: false };
    }
};
