# Moriarty — Depurador de Circuitos Cuánticos

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Diseño, simulación y análisis de precisión de circuitos cuánticos. Una plataforma web moderna para diseñar, simular, optimizar y depurar circuitos cuánticos — con un Asistente de IA opcional, algoritmos variacionales (VQE, QAOA) y múltiples opciones de exportación.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Quantum](https://img.shields.io/badge/Quantum-Qiskit%20(via%20API)-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-GPT/Claude/Llama%20(via%20API)-ee9595?style=flat-square)](https://openai.com/)

---

## ✨ Características

- **Constructor de Circuitos Intuitivo:** Arrastra y suelta compuertas desde la paleta al circuito.
- **Esfera de Bloch en Tiempo Real:** Visualiza instantáneamente el estado de cada cúbit mientras construyes.
- **Simulación de Circuitos:** Ejecuta simulaciones y ve las probabilidades de estado en un gráfico de barras claro.
- **Asistente de IA:** Obtén ayuda, haz preguntas y genera circuitos con lenguaje natural.
- **Selección de Modelos:** Elige entre una variedad de modelos de IA (GPT, Claude, Llama) para el asistente.
- **Algoritmos Variacionales:** Configura y ejecuta experimentos VQE y QAOA.
- **Optimizador de Circuitos:** Optimiza automáticamente tu circuito para un mejor rendimiento.
- **Múltiples Opciones de Exportación:** Exporta tu circuito a QASM, Qiskit, PL, Cirq y Q#.
- **Tema Oscuro:** Un tema oscuro hermoso y cómodo para la vista con detalles en ámbar.
- **Favicon Personalizado:** Un favicon único y transparente de un átomo cuántico.

---

## 🚀 Empezando

Este proyecto es un frontend de Next.js que se conecta a una API de backend separada para simulación cuántica y funciones de IA. Para ejecutarlo localmente, necesitas tener Node.js y pnpm instalados.

### Paso 1: Clona el Repositorio

```bash
git clone https://github.com/2T0nnks/moriarty.git
cd moriarty
```

### Paso 2: Instala las Dependencias

```bash
pnpm install
```

### Paso 3: Configura el Entorno

Crea un archivo `.env.local` en la raíz del proyecto y agrega las siguientes variables de entorno:

```env
NEXT_PUBLIC_API_URL=http://tu-api-de-backend
```

### Paso 4: Ejecuta el Servidor de Desarrollo

```bash
pnpm dev
```

Una vez iniciado, la aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

---

## 📂 Estructura del Repositorio

```
/moriarty
├── app/              # Next.js App Router: layout, páginas, globals.css
├── components/       # Componentes de React (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Hooks de React personalizados (useCircuit)
├── utils/            # Funciones de utilidad (api.ts, export.ts)
├── public/           # Activos estáticos (favicon, imágenes)
├── .gitignore        # Archivos a ignorar en git
├── next.config.ts    # Configuración de Next.js
├── package.json      # Dependencias del proyecto
├── pnpm-lock.yaml    # Lockfile para pnpm
├── tsconfig.json     # Configuración de TypeScript
└── README.md         # Este archivo
```
