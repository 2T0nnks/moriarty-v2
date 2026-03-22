# Moriarty — Quantum Circuit Debugger

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Precision quantum circuit design, simulation and analysis. A modern web platform for designing, simulating, optimizing, and debugging quantum circuits — with an optional AI Assistant, variational algorithms (VQE, QAOA), and multiple export options.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Quantum](https://img.shields.io/badge/Quantum-Qiskit%20(via%20API)-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-GPT/Claude/Llama%20(via%20API)-ee9595?style=flat-square)](https://openai.com/)

---

## ✨ Features

- **Intuitive Circuit Builder:** Drag-and-drop gates from the palette to the circuit board.
- **Real-time Bloch Sphere:** Instantly visualize the state of each qubit as you build.
- **Circuit Simulation:** Run simulations and see the state probabilities in a clear bar chart.
- **AI Assistant:** Get help, ask questions, and generate circuits with natural language.
- **Model Selection:** Choose from a variety of AI models (GPT, Claude, Llama) for the assistant.
- **Variational Algorithms:** Configure and run VQE and QAOA experiments.
- **Circuit Optimizer:** Automatically optimize your circuit for better performance.
- **Multiple Export Options:** Export your circuit to QASM, Qiskit, PL, Cirq, and Q#.
- **Dark Theme:** A beautiful, eye-friendly dark theme with amber accents.
- **Custom Favicon:** A unique, transparent quantum atom favicon.

---

## 🚀 Getting Started

This project is a Next.js frontend that connects to a separate backend API for quantum simulation and AI features. To run it locally, you need to have Node.js and pnpm installed.

### Step 1: Clone the Repository

```bash
git clone https://github.com/2T0nnks/moriarty.git
cd moriarty
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment

Create a `.env.local` file in the root of the project and add the following environment variables:

```env
NEXT_PUBLIC_API_URL=http://your-backend-api-url
```

### Step 4: Run the Development Server

```bash
pnpm dev
```

Once started, the application will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 📂 Repository Structure

```
/moriarty
├── app/              # Next.js App Router: layout, pages, globals.css
├── components/       # React components (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Custom React hooks (useCircuit)
├── utils/            # Utility functions (api.ts, export.ts)
├── public/           # Static assets (favicon, images)
├── .gitignore        # Files to ignore in git
├── next.config.ts    # Next.js configuration
├── package.json      # Project dependencies
├── pnpm-lock.yaml    # Lockfile for pnpm
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```
