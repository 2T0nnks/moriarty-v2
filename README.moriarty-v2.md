# Moriarty V2 - Quantum Circuit Debugger

Esta é uma versão refatorada e melhorada do Moriarty Quantum Circuit Debugger.

## Melhorias Implementadas

### Quick Wins
- **ESLint** configurado com plugin `unused-imports` para detectar código morto
- **Prettier** configurado com suporte a Tailwind CSS
- **Source maps** habilitados no Docker para debug mais fácil

### Fase 1: Limpeza
- `CircuitBoard.tsx` removido (arquivado em `.archived/`)
- Estrutura de diretórios organizada

### Fase 2: Refatoração
Novos hooks extraídos em `frontend/hooks/circuit/`:
- `useBlochSphere` - gerenciamento da visualização da esfera de Bloch
- `useAIConfig` - carregamento de configuração de IA
- `useCircuitExecution` - execução de circuitos com loading states
- `useExportCode` - geração de código exportável
- `useClipboard` - gerenciamento de clipboard

## Estrutura do Projeto

```
frontend/
├── components/          # Componentes React
├── hooks/              # Hooks customizados
│   └── circuit/        # Hooks específicos de circuito
├── utils/              # Utilitários (api, export)
├── app/                # Páginas Next.js
└── public/             # Assets estáticos

backend/
├── algorithms/         # Algoritmos quânticos
├── simulation.py       # Simulação de circuitos
├── main.py            # API FastAPI
└── models.py          # Modelos Pydantic
```

## Scripts Disponíveis

```bash
# Frontend
pnpm lint          # Rodar ESLint
pnpm lint:fix      # Corrigir problemas do ESLint
pnpm format        # Formatar com Prettier
pnpm format:check  # Verificar formatação

# Backend
python test_gates.py  # Testar gates
```

## Docker

```bash
docker-compose up -d  # Iniciar todos os serviços
```

## Diferenças da V1 para V2

1. **Código mais limpo**: removido arquivo morto CircuitBoard.tsx
2. **Hooks reutilizáveis**: lógica extraída em hooks customizados
3. **Melhor DX**: ESLint e Prettier configurados
4. **Debug facilitado**: source maps no Docker
5. **Estrutura organizada**: diretórios bem definidos

## Próximos Passos

- [ ] Componentizar AlgorithmModal (70KB -> dividir em partes)
- [ ] Adicionar testes unitários
- [ ] Melhorar tipagem TypeScript
- [ ] Adicionar mais animações de UI
- [ ] Implementar feature de URL shareable

---

Fork do projeto original: https://github.com/2T0nnks/moriarty
