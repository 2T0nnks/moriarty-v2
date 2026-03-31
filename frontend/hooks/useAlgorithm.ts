import { useState, useCallback } from 'react';
import { runQAOA, runVQE, runQuantumWalk, QAOAResponse, VQEResponse, QuantumWalkResponse } from '../utils/api';

export type AlgorithmType = 'QAOA' | 'VQE' | 'Walk';

export interface UseAlgorithmReturn {
  algorithm: AlgorithmType;
  setAlgorithm: (a: AlgorithmType) => void;
  isLoading: boolean;
  error: string | null;
  qaoaResult: QAOAResponse | null;
  vqeResult: VQEResponse | null;
  walkResult: QuantumWalkResponse | null;
  runAlgorithm: (params: AlgorithmParams) => Promise<void>;
  clearResults: () => void;
}

export interface AlgorithmParams {
  // QAOA params
  qaoaQubits?: number;
  matrixStr?: string;
  linearStr?: string;
  pLayers?: number;
  // VQE params
  vqeMode?: 'hamiltonian' | 'maxcut';
  vqeQubits?: number;
  basesStr?: string;
  scalesStr?: string;
  ansatzDepth?: number;
  vqeAdjStr?: string;
  vqeInvert?: boolean;
  // Walk params
  walkTopology?: string;
  walkVertices?: number;
  walkInitial?: number;
  walkSteps?: number;
  walkDt?: number;
  walkMatrixStr?: string;
  // Common
  maxIter?: number;
  optimizer?: string;
  shots?: number;
}

export function useAlgorithm(): UseAlgorithmReturn {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('QAOA');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaoaResult, setQaoaResult] = useState<QAOAResponse | null>(null);
  const [vqeResult, setVqeResult] = useState<VQEResponse | null>(null);
  const [walkResult, setWalkResult] = useState<QuantumWalkResponse | null>(null);

  const clearResults = useCallback(() => {
    setQaoaResult(null);
    setVqeResult(null);
    setWalkResult(null);
    setError(null);
  }, []);

  const runAlgorithm = useCallback(async (params: AlgorithmParams) => {
    setIsLoading(true);
    setError(null);
    clearResults();

    try {
      if (algorithm === 'QAOA') {
        let matrix: number[][], linear: number[];
        try { matrix = JSON.parse(params.matrixStr || '[]'); } catch { setError('Invalid matrix JSON.'); setIsLoading(false); return; }
        try { linear = JSON.parse(params.linearStr || '[]'); } catch { linear = new Array(params.qaoaQubits || 2).fill(0); }
        setQaoaResult(await runQAOA(
          params.qaoaQubits || 2,
          matrix,
          params.pLayers || 1,
          params.maxIter || 100,
          params.optimizer || 'COBYLA',
          params.shots || 1024,
          linear
        ));
      } else if (algorithm === 'VQE') {
        if (params.vqeMode === 'maxcut') {
          let adjMatrix: number[][];
          try { adjMatrix = JSON.parse(params.vqeAdjStr || '[]'); } catch { setError('Invalid adjacency matrix JSON.'); setIsLoading(false); return; }
          setVqeResult(await runVQE(
            params.vqeQubits || 2,
            [], [],
            params.ansatzDepth || 1,
            params.maxIter || 100,
            params.optimizer || 'COBYLA',
            params.shots || 1024,
            adjMatrix,
            'maxcut',
            params.vqeInvert
          ));
        } else {
          let bases: string[], scales: number[];
          try { bases = JSON.parse(params.basesStr || '[]'); scales = JSON.parse(params.scalesStr || '[]'); }
          catch { setError('Invalid bases/scales.'); setIsLoading(false); return; }
          if (!bases.length) { setError('Provide at least one Hamiltonian basis string.'); setIsLoading(false); return; }
          if (bases.length !== scales.length) { setError('Bases and scales must be same length.'); setIsLoading(false); return; }
          setVqeResult(await runVQE(
            params.vqeQubits || 2,
            bases, scales,
            params.ansatzDepth || 1,
            params.maxIter || 100,
            params.optimizer || 'COBYLA',
            params.shots || 1024
          ));
        }
      } else {
        let adjMatrix: number[][] | undefined;
        if (params.walkMatrixStr?.trim()) {
          try { adjMatrix = JSON.parse(params.walkMatrixStr); } catch { setError('Invalid adjacency matrix.'); setIsLoading(false); return; }
        }
        const data = await runQuantumWalk(
          params.walkTopology || 'cycle',
          params.walkVertices || 4,
          params.walkInitial || 0,
          params.walkSteps || 10,
          params.walkDt || 0.5,
          params.shots || 1024,
          adjMatrix
        );
        setWalkResult(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [algorithm, clearResults]);

  return {
    algorithm,
    setAlgorithm,
    isLoading,
    error,
    qaoaResult,
    vqeResult,
    walkResult,
    runAlgorithm,
    clearResults,
  };
}
