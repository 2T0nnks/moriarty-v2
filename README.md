# Moriarty v2 — Quantum Circuit Debugger

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Quantum circuit design, simulation and analysis. A modern web platform for designing, simulating, optimizing, and debugging quantum circuits — with an **optional AI Assistant** powered by Ollama, variational algorithms (VQE, QAOA), and multiple export options.
>
> **Note:** This is the full-featured version with optional AI capabilities. For a lightweight version without AI/Ollama dependencies, see [moriarty-no-ia](https://github.com/2T0nnks/moriarty-no-ia).

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20+%20Qiskit-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-Ollama%20(optional)-ee9595?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-b8c1ec?style=flat-square)](https://docs.docker.com/compose/)

---

## 🚀 Installation (Docker - Recommended)

Docker is the standard and recommended method. It guarantees a consistent, isolated environment and avoids dependency conflicts.

**Prerequisites:** Docker and Docker Compose must be installed and running. If you haven't set them up yet, follow the step-by-step guide for your platform:

| Platform | Prerequisites Guide |
|---|---|
| **Windows** | [docs/install/prerequisites/WINDOWS.md](./docs/install/prerequisites/WINDOWS.md) |
| **Linux** | [docs/install/prerequisites/LINUX.md](./docs/install/prerequisites/LINUX.md) |
| **macOS** | [docs/install/prerequisites/MACOS.md](./docs/install/prerequisites/MACOS.md) |

### Step 1: Clone the Repository

```bash
git clone https://github.com/2T0nnks/moriarty-v2.git
cd moriarty-v2
```

### Step 2: Choose Your Setup

#### Option 1: Standard (No AI Assistant)

This runs the core application (circuit builder, simulator, algorithms) without the AI features. The AI Assistant button will not appear in the UI.

```bash
docker-compose up --build
```

#### Option 2: With AI Assistant (CPU)

This adds the AI Assistant, powered by a local LLM (Ollama). The model will be downloaded automatically on the first run (~3 GB).

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

#### Option 3: With AI Assistant (GPU Acceleration)

For significantly faster AI responses, use your GPU. This requires additional setup.

1.  **Follow the [GPU Setup Guide](docs/install/gpu/README.md)** to configure your system.
2.  Use the appropriate command for your GPU vendor:
    -   **NVIDIA (CUDA):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
        ```
    -   **AMD (ROCm - Linux Only):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
        ```
    -   **AMD/Intel (Vulkan - Linux Only):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
        ```

Once started, the application will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## ✨ Features

- **Intuitive Circuit Builder:** Drag-and-drop gates from the palette to the circuit board.
- **Real-time Bloch Sphere:** Instantly visualize the state of each qubit as you build.
- **Circuit Simulation:** Run simulations and see the state probabilities in a clear bar chart.
- **AI Assistant:** Get help, ask questions, and generate circuits with natural language (requires AI mode).
- **Model Selection:** Choose from a variety of open-source models (Qwen, DeepSeek) for the assistant.
- **Variational Algorithms:** Configure and run VQE and QAOA experiments.
- **Circuit Optimizer:** Automatically optimize your circuit for better performance.
- **Custom Gates:** Define and reuse your own composite gates through the Make Gate builder.
- **Multiple Export Options:** Export your circuit to QASM, Qiskit, PennyLane, Cirq, Q#, and LaTeX.
- **Dark Theme:** A beautiful, eye-friendly dark theme with amber accents.

---

## Screenshot

![Circuit builder](./docs/screenshots/builder.png)

*Circuit builder with the gate palette, per-qubit Bloch spheres and live Qiskit export.*

---

## Architecture

![Architecture](./docs/architecture.png)

Moriarty v2 runs as three independent services orchestrated by Docker Compose:

| Service | Stack | Responsibility |
|---|---|---|
| **frontend** | Next.js 16 (App Router), TypeScript | Drag-and-drop circuit builder, Bloch spheres, probability charts, algorithm configuration |
| **backend** | FastAPI, Qiskit, Qiskit Aer | Circuit construction from JSON descriptions, simulation, statevector extraction, optimization, VQE/QAOA, multi-format export |
| **ollama** *(optional)* | Ollama | Natural-language assistant running **locally** - no circuit data leaves the machine |

**Layer contract.** The frontend never handles Qiskit objects. Circuits travel as ordered lists of gate descriptions (`{ name, qubits, params }`), and the backend is solely responsible for translating them into a `QuantumCircuit`. Quantum logic stays in one place, and the simulation engine can be swapped without touching the interface.

**Supported gates.** Single-qubit: H, X, Y, Z, S, T, RX, RY, RZ. Two-qubit: CNOT/CX, CY, CZ, CH, SWAP, CRX, CRY, CRZ, CP. Three-qubit: CCX (Toffoli), CSWAP (Fredkin). Measurement: M. Composite gates can be defined at runtime via Make Gate.

**Private by default.** The AI assistant is opt-in and runs in a local container. No third-party API is called on any execution path - a deliberate choice so the tool can be used where the circuit under analysis is sensitive.

---
## 📂 Repository Structure

```
/moriarty-v2
├── frontend/         # Next.js App Router: layout, pages, components, etc.
├── backend/          # FastAPI + Qiskit backend (includes AI chat support)
├── docs/             # Documentation and install guides
├── scripts/          # Convenience scripts for Linux and Windows
├── docker-compose.yml         # Base: frontend + backend
├── docker-compose.ai.yml      # Override: adds Ollama (CPU)
├── docker-compose.nvidia.yml  # Override: NVIDIA GPU
├── docker-compose.amd.yml     # Override: AMD GPU (ROCm)
├── docker-compose.vulkan.yml  # Override: Vulkan (AMD/Intel)
├── .env.example      # Environment variable template
└── README.md         # This file
```
