# Moriarty — Depurador de Circuitos Cuánticos

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Diseño, simulación y análisis de precisión de circuitos cuánticos. Una plataforma web moderna para diseñar, simular, optimizar y depurar circuitos cuánticos — con un Asistente de IA opcional, algoritmos variacionales (VQE, QAOA) y múltiples opciones de exportación.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20+%20Qiskit-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-Ollama%20(opcional)-ee9595?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-b8c1ec?style=flat-square)](https://docs.docker.com/compose/)

---

## ✨ Características

- **Constructor de Circuitos Intuitivo:** Arrastra y suelta compuertas desde la paleta al circuito.
- **Esfera de Bloch en Tiempo Real:** Visualiza instantáneamente el estado de cada cúbit mientras construyes.
- **Simulación de Circuitos:** Ejecuta simulaciones y ve las probabilidades de estado en un gráfico de barras claro.
- **Asistente de IA:** Obtén ayuda, haz preguntas y genera circuitos con lenguaje natural (requiere modo IA).
- **Selección de Modelos:** Elige entre una variedad de modelos de IA (GPT, Claude, Llama) para el asistente.
- **Algoritmos Variacionales:** Configura y ejecuta experimentos VQE y QAOA.
- **Optimizador de Circuitos:** Optimiza automáticamente tu circuito para un mejor rendimiento.
- **Múltiples Opciones de Exportación:** Exporta tu circuito a QASM, Qiskit, PL, Cirq y Q#.
- **Tema Oscuro:** Un tema oscuro hermoso y cómodo para la vista con detalles en ámbar.

---

## 🐳 Ejecutando con Docker

Docker es la forma recomendada de ejecutar Moriarty. Asegúrate de tener [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/) instalados.

Consulta la guía de prerequisitos para tu sistema:
[Linux](./docs/install/prerequisites/LINUX.md) · [macOS](./docs/install/prerequisites/MACOS.md) · [Windows](./docs/install/prerequisites/WINDOWS.md)

### Sin IA (predeterminado)

```bash
docker-compose up --build
```

### Con IA — solo CPU

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

### Con IA — GPU NVIDIA

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
```

### Con IA — GPU AMD (ROCm, solo Linux, RDNA2+)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
```

### Con IA — Vulkan (AMD/Intel/GPUs antiguas, Linux)

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
```

Una vez iniciado, la aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

---

## 🚀 Ejecutando Localmente (Desarrollo)

Para ejecutar el proyecto localmente sin Docker, necesitas Node.js, pnpm y Python 3.11+.

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

## 📂 Estructura del Repositorio

```
/moriarty
├── app/              # Next.js App Router: layout, páginas, globals.css
├── components/       # Componentes de React (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Hooks de React personalizados (useCircuit)
├── utils/            # Funciones de utilidad (api.ts, export.ts)
├── public/           # Activos estáticos (favicon, imágenes)
├── backend/          # Backend FastAPI + Qiskit
│   ├── algorithms/   # Implementaciones VQE, QAOA, Quantum Walk
│   ├── main.py       # Punto de entrada de la API
│   ├── simulation.py # Simulación de circuitos (Qiskit Aer)
│   ├── optimization.py  # Optimización de circuitos (transpiler Qiskit)
│   ├── chat.py       # Asistente de IA (Ollama streaming)
│   ├── models.py     # Modelos Pydantic de request/response
│   ├── requirements.txt
│   └── Dockerfile
├── docs/             # Documentación y guías de instalación
├── scripts/          # Scripts de conveniencia para Linux y Windows
│   ├── linux/        # setup.sh, start.sh, stop.sh, update.sh
│   └── windows/      # setup.ps1, start.bat, stop.bat, update.bat
├── docker-compose.yml         # Base: frontend + backend
├── docker-compose.ai.yml      # Override: añade Ollama (CPU)
├── docker-compose.nvidia.yml  # Override: GPU NVIDIA
├── docker-compose.amd.yml     # Override: GPU AMD (ROCm)
├── docker-compose.vulkan.yml  # Override: Vulkan (AMD/Intel)
├── Dockerfile        # Build de producción del frontend (multi-stage)
├── .env.example      # Plantilla de variables de entorno
└── README.md         # Este archivo
```
