# Moriarty — Depurador de Circuitos Cuánticos

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Diseño, simulación y análisis de precisión de circuitos cuánticos. Una plataforma web moderna para diseñar, simular, optimizar y depurar circuitos cuánticos — con un Asistente de IA opcional, algoritmos variacionales (VQE, QAOA) y múltiples opciones de exportación.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20+%20Qiskit-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-Ollama%20(opcional)-ee9595?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-b8c1ec?style=flat-square)](https://docs.docker.com/compose/)

---

## 🚀 Instalación (Docker - Recomendado)

Docker es el método estándar y recomendado. Garantiza un entorno consistente y aislado, evitando conflictos de dependencias.

**Prerrequisitos:** Docker y Docker Compose deben estar instalados y en funcionamiento. Si aún no los has configurado, sigue la guía paso a paso para tu plataforma:

| Plataforma | Guía de Prerrequisitos |
|---|---|
| **Windows** | [docs/install/prerequisites/WINDOWS.md](./docs/install/prerequisites/WINDOWS.md) |
| **Linux** | [docs/install/prerequisites/LINUX.md](./docs/install/prerequisites/LINUX.md) |
| **macOS** | [docs/install/prerequisites/MACOS.md](./docs/install/prerequisites/MACOS.md) |

### Paso 1: Clona el Repositorio

```bash
git clone https://github.com/2T0nnks/moriarty.git
cd moriarty
```

### Paso 2: Elige tu Configuración

#### Opción 1: Estándar (Sin Asistente de IA)

Ejecuta la aplicación principal (constructor de circuitos, simulador, algoritmos) sin las funciones de IA. El botón del Asistente de IA no aparecerá en la interfaz.

```bash
docker-compose up --build
```

#### Opción 2: Con Asistente de IA (CPU)

Añade el Asistente de IA, impulsado por un LLM local (Ollama). El modelo se descargará automáticamente en la primera ejecución (~3 GB).

```bash
docker-compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

#### Opción 3: Con Asistente de IA (Aceleración por GPU)

Para respuestas de IA significativamente más rápidas, usa tu GPU. Esto requiere configuración adicional.

1.  **Sigue la [Guía de Configuración de GPU](docs/install/gpu/README.md)** para preparar tu sistema.
2.  Usa el comando apropiado para el fabricante de tu GPU:
    -   **NVIDIA (CUDA):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
        ```
    -   **AMD (ROCm - Solo Linux):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
        ```
    -   **AMD/Intel (Vulkan - Solo Linux):**
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
        ```

Una vez iniciada, la aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

---

## ✨ Funcionalidades

- **Constructor de Circuitos Intuitivo:** Arrastra y suelta puertas lógicas de la paleta al circuito.
- **Esfera de Bloch en Tiempo Real:** Visualiza instantáneamente el estado de cada qubit mientras construyes.
- **Simulación de Circuitos:** Ejecuta simulaciones y ve las probabilidades de estado en un gráfico de barras claro.
- **Asistente de IA:** Obtén ayuda, haz preguntas y genera circuitos con lenguaje natural (requiere modo IA).
- **Selección de Modelos:** Elige entre una variedad de modelos de IA (GPT, Claude, Llama) para el asistente.
- **Algoritmos Variacionales:** Configura y ejecuta experimentos VQE y QAOA.
- **Optimizador de Circuitos:** Optimiza automáticamente tu circuito para un mejor rendimiento.
- **Múltiples Opciones de Exportación:** Exporta tu circuito a QASM, Qiskit, PL, Cirq y Q#.
- **Tema Oscuro:** Un tema oscuro elegante y cómodo para la vista con detalles en ámbar.

---

## 📂 Estructura del Repositorio

```
/moriarty
├── frontend/         # Next.js App Router: layout, páginas, componentes, etc.
├── backend/          # Backend FastAPI + Qiskit
├── docs/             # Documentación y guías de instalación
├── scripts/          # Scripts de conveniencia para Linux y Windows
├── docker-compose.yml         # Base: frontend + backend
├── docker-compose.ai.yml      # Override: añade Ollama (CPU)
├── docker-compose.nvidia.yml  # Override: GPU NVIDIA
├── docker-compose.amd.yml     # Override: GPU AMD (ROCm)
├── docker-compose.vulkan.yml  # Override: Vulkan (AMD/Intel)
├── .env.example      # Plantilla de variables de entorno
└── README.md         # Este archivo
```
