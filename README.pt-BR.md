# Moriarty — Depurador de Circuitos Quânticos

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Design, simulação e análise de precisão de circuitos quânticos. Uma plataforma web moderna para projetar, simular, otimizar e depurar circuitos quânticos — com um Assistente de IA opcional, algoritmos variacionais (VQE, QAOA) e múltiplas opções de exportação.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20+%20Qiskit-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-Ollama%20(opcional)-ee9595?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-b8c1ec?style=flat-square)](https://docs.docker.com/compose/)

---

## ✨ Funcionalidades

- **Construtor de Circuitos Intuitivo:** Arraste e solte portas lógicas da paleta para o circuito.
- **Esfera de Bloch em Tempo Real:** Visualize instantaneamente o estado de cada qubit enquanto constrói.
- **Simulação de Circuitos:** Execute simulações e veja as probabilidades de estado em um gráfico de barras claro.
- **Assistente de IA:** Obtenha ajuda, faça perguntas e gere circuitos com linguagem natural (requer modo AI).
- **Seleção de Modelos:** Escolha entre uma variedade de modelos de IA (GPT, Claude, Llama) para o assistente.
- **Algoritmos Variacionais:** Configure e execute experimentos VQE e QAOA.
- **Otimizador de Circuitos:** Otimize automaticamente seu circuito para melhor desempenho.
- **Múltiplas Opções de Exportação:** Exporte seu circuito para QASM, Qiskit, PL, Cirq e Q#.
- **Tema Escuro:** Um tema escuro bonito e confortável para os olhos com detalhes em âmbar.

---

## 🐳 Executando com Docker

Docker é a forma recomendada de executar o Moriarty. Certifique-se de ter o [Docker](https://docs.docker.com/get-docker/) e o [Docker Compose](https://docs.docker.com/compose/install/) instalados.

Consulte o guia de pré-requisitos para o seu sistema:
[Linux](./docs/install/prerequisites/LINUX.md) · [macOS](./docs/install/prerequisites/MACOS.md) · [Windows](./docs/install/prerequisites/WINDOWS.md)

### Sem IA (padrão)

```bash
docker-compose up --build
```

### Com IA — apenas CPU

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

### Com IA — GPU NVIDIA

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
```

### Com IA — GPU AMD (ROCm, apenas Linux, RDNA2+)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
```

### Com IA — Vulkan (AMD/Intel/GPUs mais antigas, Linux)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
```

Após iniciar, a aplicação estará disponível em **[http://localhost:3000](http://localhost:3000)**.

---

## 🚀 Executando Localmente (Desenvolvimento)

Para executar o projeto localmente sem Docker, você precisa do Node.js, pnpm e Python 3.11+.

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

## 📂 Estrutura do Repositório

```
/moriarty
├── app/              # Next.js App Router: layout, páginas, globals.css
├── components/       # Componentes React (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Hooks React personalizados (useCircuit)
├── utils/            # Funções utilitárias (api.ts, export.ts)
├── public/           # Arquivos estáticos (favicon, imagens)
├── backend/          # Backend FastAPI + Qiskit
│   ├── algorithms/   # Implementações VQE, QAOA, Quantum Walk
│   ├── main.py       # Entrypoint da API
│   ├── simulation.py # Simulação de circuitos (Qiskit Aer)
│   ├── optimization.py  # Otimização de circuitos (transpiler Qiskit)
│   ├── chat.py       # Assistente de IA (Ollama streaming)
│   ├── models.py     # Modelos Pydantic de request/response
│   ├── requirements.txt
│   └── Dockerfile
├── docs/             # Documentação e guias de instalação
├── scripts/          # Scripts de conveniência para Linux e Windows
│   ├── linux/        # setup.sh, start.sh, stop.sh, update.sh
│   └── windows/      # setup.ps1, start.bat, stop.bat, update.bat
├── docker-compose.yml         # Base: frontend + backend
├── docker-compose.ai.yml      # Override: adiciona Ollama (CPU)
├── docker-compose.nvidia.yml  # Override: GPU NVIDIA
├── docker-compose.amd.yml     # Override: GPU AMD (ROCm)
├── docker-compose.vulkan.yml  # Override: Vulkan (AMD/Intel)
├── Dockerfile        # Build de produção do frontend (multi-stage)
├── .env.example      # Template de variáveis de ambiente
└── README.md         # Este arquivo
```
