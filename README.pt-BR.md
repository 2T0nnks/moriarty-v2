# Moriarty — Depurador de Circuitos Quânticos

**Language / Idioma / Idioma:** [English](./README.md) · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

> Design, simulação e análise de precisão de circuitos quânticos. Uma plataforma web moderna para projetar, simular, otimizar e depurar circuitos quânticos — com um Assistente de IA opcional, algoritmos variacionais (VQE, QAOA) e múltiplas opções de exportação.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-b8c1ec?style=flat-square)](https://nextjs.org/)
[![Quantum](https://img.shields.io/badge/Quantum-Qiskit%20(via%20API)-d4939d?style=flat-square)](https://qiskit.org/)
[![AI](https://img.shields.io/badge/AI%20Model-GPT/Claude/Llama%20(via%20API)-ee9595?style=flat-square)](https://openai.com/)

---

## ✨ Funcionalidades

- **Construtor de Circuitos Intuitivo:** Arraste e solte portas lógicas da paleta para o circuito.
- **Esfera de Bloch em Tempo Real:** Visualize instantaneamente o estado de cada qubit enquanto constrói.
- **Simulação de Circuitos:** Execute simulações e veja as probabilidades de estado em um gráfico de barras claro.
- **Assistente de IA:** Obtenha ajuda, faça perguntas e gere circuitos com linguagem natural.
- **Seleção de Modelos:** Escolha entre uma variedade de modelos de IA (GPT, Claude, Llama) para o assistente.
- **Algoritmos Variacionais:** Configure e execute experimentos VQE e QAOA.
- **Otimizador de Circuitos:** Otimize automaticamente seu circuito para melhor desempenho.
- **Múltiplas Opções de Exportação:** Exporte seu circuito para QASM, Qiskit, PL, Cirq e Q#.
- **Tema Escuro:** Um tema escuro bonito e confortável para os olhos com detalhes em âmbar.
- **Favicon Personalizado:** Um favicon único e transparente de um átomo quântico.

---

## 🚀 Começando

Este projeto é um frontend Next.js que se conecta a uma API de backend separada para simulação quântica e recursos de IA. Para executá-lo localmente, você precisa ter o Node.js e o pnpm instalados.

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/2T0nnks/moriarty.git
cd moriarty
```

### Passo 2: Instale as Dependências

```bash
pnpm install
```

### Passo 3: Configure o Ambiente

Crie um arquivo `.env.local` na raiz do projeto e adicione as seguintes variáveis de ambiente:

```env
NEXT_PUBLIC_API_URL=http://sua-api-de-backend
```

### Passo 4: Execute o Servidor de Desenvolvimento

```bash
pnpm dev
```

Após iniciar, a aplicação estará disponível em **[http://localhost:3000](http://localhost:3000)**.

---

## 📂 Estrutura do Repositório

```
/moriarty
├── app/              # Next.js App Router: layout, páginas, globals.css
├── components/       # Componentes React (MoriartyShell, ChatAssistant, etc.)
├── hooks/            # Hooks React personalizados (useCircuit)
├── utils/            # Funções utilitárias (api.ts, export.ts)
├── public/           # Arquivos estáticos (favicon, imagens)
├── .gitignore        # Arquivos a serem ignorados no git
├── next.config.ts    # Configuração do Next.js
├── package.json      # Dependências do projeto
├── pnpm-lock.yaml    # Lockfile para o pnpm
├── tsconfig.json     # Configuração do TypeScript
└── README.md         # Este arquivo
```
