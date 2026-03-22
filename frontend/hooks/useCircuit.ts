import { useState, useCallback } from 'react';

export interface CircuitStep {
  qubits: number[];
  gate: string;
  params?: number[];
  id: string; // Unique ID for valid React keys
}

type CircuitGrid = Record<string, string>; // cellId -> gateName
type GateParams = Record<string, number[]>; // cellId -> params

export interface GateLogEntry {
  id: string;           // unique id for React key
  action: 'add' | 'remove' | 'load' | 'clear';
  gate: string;         // gate name or description (e.g. "Bell state")
  cell?: string;        // cellId e.g. "q0-s1"
  qubit?: number;
  step?: number;
  timestamp: Date;
}

interface CircuitState {
  grid: CircuitGrid;
  params: GateParams;
  numQubits: number;
  numSteps: number;
  history: { grid: CircuitGrid; params: GateParams; numQubits: number; numSteps: number }[];
  historyIndex: number;
  gateLog: GateLogEntry[];
}

const DEFAULT_QUBITS = 3;
const DEFAULT_STEPS = 10;

let _logIdCounter = 0;
const newLogId = () => `log-${Date.now()}-${_logIdCounter++}`;

function parseCellId(cellId: string): { qubit: number; step: number } {
  const [qPart, sPart] = cellId.split('-');
  return {
    qubit: parseInt(qPart.substring(1)),
    step: parseInt(sPart.substring(1)),
  };
}

export const useCircuit = () => {
  const [state, setState] = useState<CircuitState>({
    grid: {},
    params: {},
    numQubits: DEFAULT_QUBITS,
    numSteps: DEFAULT_STEPS,
    history: [{ grid: {}, params: {}, numQubits: DEFAULT_QUBITS, numSteps: DEFAULT_STEPS }],
    historyIndex: 0,
    gateLog: [],
  });

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const entry = prev.history[newIndex];
        return {
          ...prev,
          grid: entry.grid,
          params: entry.params,
          numQubits: entry.numQubits,
          numSteps: entry.numSteps,
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const entry = prev.history[newIndex];
        return {
          ...prev,
          grid: entry.grid,
          params: entry.params,
          numQubits: entry.numQubits,
          numSteps: entry.numSteps,
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const addGate = useCallback((cellId: string, gateName: string) => {
    setState((prev) => {
        const newGrid = { ...prev.grid, [cellId]: gateName };
        let newParams = { ...prev.params };

        const [qPart, sPart] = cellId.split('-');
        const qubitIdx = parseInt(qPart.substring(1));
        const stepIdx = parseInt(sPart.substring(1));

        let newNumQubits = prev.numQubits;
        let newNumSteps = prev.numSteps;

        if (qubitIdx >= prev.numQubits - 1) {
            newNumQubits = qubitIdx + 2;
        }
        if (stepIdx >= prev.numSteps - 1) {
            newNumSteps = stepIdx + 2;
        }

        if (['RX', 'RY', 'RZ', 'CRX', 'CRY', 'CRZ'].includes(gateName)) {
            newParams[cellId] = [Math.PI / 2];
        } else {
            delete newParams[cellId];
        }

        if (prev.grid[cellId] === gateName && 
            JSON.stringify(prev.params[cellId]) === JSON.stringify(newParams[cellId]) &&
            prev.numQubits === newNumQubits &&
            prev.numSteps === newNumSteps
           ) {
             return prev;
        }

        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        const historyEntry = { grid: newGrid, params: newParams, numQubits: newNumQubits, numSteps: newNumSteps };
        newHistory.push(historyEntry);

        const logEntry: GateLogEntry = {
          id: newLogId(),
          action: 'add',
          gate: gateName,
          cell: cellId,
          qubit: qubitIdx,
          step: stepIdx,
          timestamp: new Date(),
        };
        
        return {
            grid: newGrid,
            params: newParams,
            numQubits: newNumQubits,
            numSteps: newNumSteps,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            gateLog: [logEntry, ...prev.gateLog].slice(0, 100),
        };
    });
  }, []);

  const removeGate = useCallback((cellId: string) => {
    setState((prev) => {
        const removedGate = prev.grid[cellId] || '?';
        const { qubit, step } = parseCellId(cellId);

        const newGrid = { ...prev.grid };
        delete newGrid[cellId];
        
        const newParams = { ...prev.params };
        delete newParams[cellId];

        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push({ grid: newGrid, params: newParams, numQubits: prev.numQubits, numSteps: prev.numSteps });

        const logEntry: GateLogEntry = {
          id: newLogId(),
          action: 'remove',
          gate: removedGate,
          cell: cellId,
          qubit,
          step,
          timestamp: new Date(),
        };

        return {
            ...prev,
            grid: newGrid,
            params: newParams,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            gateLog: [logEntry, ...prev.gateLog].slice(0, 100),
        };
    });
  }, []);

  const updateGateParams = useCallback((cellId: string, params: number[]) => {
      setState(prev => {
          const newParams = { ...prev.params, [cellId]: params };
          
          const newHistory = prev.history.slice(0, prev.historyIndex + 1);
          newHistory.push({ grid: prev.grid, params: newParams, numQubits: prev.numQubits, numSteps: prev.numSteps });

          return {
              ...prev,
              params: newParams,
              history: newHistory,
              historyIndex: newHistory.length - 1
          };
      });
  }, []);

  const setCircuit = useCallback((newGrid: CircuitGrid, newParams: GateParams = {}, description?: string) => {
      let maxQ = DEFAULT_QUBITS - 1;
      let maxS = DEFAULT_STEPS - 1;

      Object.keys(newGrid).forEach(key => {
          const [qPart, sPart] = key.split('-');
          const q = parseInt(qPart.substring(1));
          const s = parseInt(sPart.substring(1));
          if (q > maxQ) maxQ = q;
          if (s > maxS) maxS = s;
      });

      const newNumQubits = maxQ + 2;
      const newNumSteps = maxS + 2;
      const gateCount = Object.keys(newGrid).length;

      setState(prev => {
          const newHistory = prev.history.slice(0, prev.historyIndex + 1);
          newHistory.push({ grid: newGrid, params: newParams, numQubits: newNumQubits, numSteps: newNumSteps });

          const logEntry: GateLogEntry = {
            id: newLogId(),
            action: 'load',
            gate: description || `Circuit (${gateCount} gates)`,
            timestamp: new Date(),
          };

          return {
              grid: newGrid,
              params: newParams,
              numQubits: newNumQubits,
              numSteps: newNumSteps,
              history: newHistory,
              historyIndex: newHistory.length - 1,
              gateLog: [logEntry, ...prev.gateLog].slice(0, 100),
          };
      });
  }, []);

  const clearCircuit = useCallback(() => {
      setState(prev => {
          const newHistory = prev.history.slice(0, prev.historyIndex + 1);
          const emptyGrid: CircuitGrid = {};
          const emptyParams: GateParams = {};
          newHistory.push({ grid: emptyGrid, params: emptyParams, numQubits: DEFAULT_QUBITS, numSteps: DEFAULT_STEPS });

          const logEntry: GateLogEntry = {
            id: newLogId(),
            action: 'clear',
            gate: 'All gates cleared',
            timestamp: new Date(),
          };

          return {
              grid: emptyGrid,
              params: emptyParams,
              numQubits: DEFAULT_QUBITS,
              numSteps: DEFAULT_STEPS,
              history: newHistory,
              historyIndex: newHistory.length - 1,
              gateLog: [logEntry, ...prev.gateLog].slice(0, 100),
          };
      });
  }, []);

  const clearGateLog = useCallback(() => {
      setState(prev => ({ ...prev, gateLog: [] }));
  }, []);

  return {
    circuit: state.grid,
    gateParams: state.params,
    numQubits: state.numQubits,
    numSteps: state.numSteps,
    gateLog: state.gateLog,
    addGate,
    removeGate,
    updateGateParams,
    undo,
    redo,
    setCircuit,
    clearCircuit,
    clearGateLog,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
  };
};
