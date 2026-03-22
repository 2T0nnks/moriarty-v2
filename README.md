# Moriarty — Quantum Circuit Debugger

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Precision quantum circuit design, simulation and analysis. A modern web platform for designing, simulating, optimizing, and debugging quantum circuits — with an optional AI Assistant, variational algorithms (VQE, QAOA), and multiple export options.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20+%20Qiskit-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-Ollama%20(optional)-ee9595?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-b8c1ec?style=flat-square)](https://docs.docker.com/compose/)

---

## ✨ Features

- **Intuitive Circuit Builder:** Drag-and-drop gates from the palette to the circuit board.
- **Real-time Bloch Sphere:** Instantly visualize the state of each qubit as you build.
- **Circuit Simulation:** Run simulations and see the state probabilities in a clear bar chart.
- **AI Assistant:** Get help, ask questions, and generate circuits with natural language (requires AI mode).
- **Model Selection:** Choose from a variety of AI models (GPT, Claude, Llama) for the assistant.
- **Variational Algorithms:** Configure and run VQE and QAOA experiments.
- **Circuit Optimizer:** Automatically optimize your circuit for better performance.
- **Multiple Export Options:** Export your circuit to QASM, Qiskit, PL, Cirq, and Q#.
- **Dark Theme:** A beautiful, eye-friendly dark theme with amber accents.

---

## 🐳 Running with Docker

Docker is the recommended way to run Moriarty. Make sure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

See the prerequisites guide for your OS:
[Linux](./docs/install/prerequisites/LINUX.md) · [macOS](./docs/install/prerequisites/MACOS.md) · [Windows](./docs/install/prerequisites/WINDOWS.md)

### Without AI (default)

```bash
docker-compose up --build
```

### With AI — CPU only

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

### With AI — NVIDIA GPU

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
```

### With AI — AMD GPU (ROCm, Linux only, RDNA2+)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
```

### With AI — Vulkan (AMD/Intel/older GPUs, Linux)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
```

Once started, the application will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 🚀 Running Locally (Development)

To run the project locally without Docker, you need Node.js, pnpm, and Python 3.11+.

### Frontend

```bash
pnpm install
pnpm dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📂 Repository Structure

```
/moriarty
├── app/              # Next.js App Router: layout, pages, globals.css
├── components/       # React components (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Custom React hooks (useCircuit)
├── utils/            # Utility functions (api.ts, export.ts)
├── public/           # Static assets (favicon, images)
├── backend/          # FastAPI + Qiskit backend
│   ├── algorithms/   # VQE, QAOA, Quantum Walk implementations
│   ├── main.py       # API entrypoint
│   ├── simulation.py # Circuit simulation (Qiskit Aer)
│   ├── optimization.py  # Circuit optimization (Qiskit transpiler)
│   ├── chat.py       # AI Assistant (Ollama streaming)
│   ├── models.py     # Pydantic request/response models
│   ├── requirements.txt
│   └── Dockerfile
├── docs/             # Documentation and install guides
├── scripts/          # Convenience scripts for Linux and Windows
│   ├── linux/        # setup.sh, start.sh, stop.sh, update.sh
│   └── windows/      # setup.ps1, start.bat, stop.bat, update.bat
├── docker-compose.yml         # Base: frontend + backend
├── docker-compose.ai.yml      # Override: adds Ollama (CPU)
├── docker-compose.nvidia.yml  # Override: NVIDIA GPU
├── docker-compose.amd.yml     # Override: AMD GPU (ROCm)
├── docker-compose.vulkan.yml  # Override: Vulkan (AMD/Intel)
├── Dockerfile        # Frontend production build (multi-stage)
├── .env.example      # Environment variable template
└── README.md         # This file
```
