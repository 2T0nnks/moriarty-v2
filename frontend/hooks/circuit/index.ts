import { useState, useCallback, useEffect, useRef } from 'react';
import { exportToBloch, fetchConfig } from '../../utils/api';
import type { QuantumGate, ExecutionResult } from '../../utils/api';

interface UseBlochSphereOptions {
  debounceMs?: number;
}

export function useBlochSphere(
  gates: QuantumGate[],
  numQubits: number,
  options: UseBlochSphereOptions = {}
) {
  const { debounceMs = 500 } = options;
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gates.length === 0) {
      setImages([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await exportToBloch(gates, numQubits);
        if ((data as any).bloch_images) {
          setImages((data as any).bloch_images);
        } else if ((data as any).image_base64) {
          setImages([(data as any).image_base64]);
        }
      } catch (err) {
        setError('Failed to generate Bloch sphere visualization');
        console.error('Bloch sphere error:', err);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [gates, numQubits, debounceMs]);

  return { images, isLoading, error };
}

export function useAIConfig() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const config = await fetchConfig();
        if (mounted) {
          setEnabled(config.ai_enabled);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load AI configuration');
          setEnabled(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return { enabled, isLoading, error };
}

interface UseCircuitExecutionResult {
  result: ExecutionResult | null;
  error: string | null;
  isRunning: boolean;
  run: () => Promise<void>;
  reset: () => void;
}

export function useCircuitExecution(
  gates: QuantumGate[],
  numQubits: number,
  onSuccess?: (result: ExecutionResult) => void,
  onError?: (error: string) => void
): UseCircuitExecutionResult {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async () => {
    if (gates.length === 0) return;

    setIsRunning(true);
    setError(null);

    try {
      const { executeCircuit } = await import('../../utils/api');
      const data = await executeCircuit(gates, numQubits);
      setResult(data);
      onSuccess?.(data);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Execution failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsRunning(false);
    }
  }, [gates, numQubits, onSuccess, onError]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, error, isRunning, run, reset };
}

export function useExportCode(
  gates: QuantumGate[],
  numQubits: number,
  format: 'qasm' | 'qiskit' | 'pennylane' | 'cirq' | 'qsharp'
) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const generate = async () => {
      setIsLoading(true);
      try {
        const {
          generateOpenQASM,
          generateQiskitCode,
          generatePennyLaneCode,
          generateCirqCode,
          generateQSharpCode,
        } = await import('../../utils/export');

        switch (format) {
          case 'qasm':
            setCode(generateOpenQASM(gates, numQubits));
            break;
          case 'qiskit':
            setCode(generateQiskitCode(gates, numQubits));
            break;
          case 'pennylane':
            setCode(generatePennyLaneCode(gates, numQubits));
            break;
          case 'cirq':
            setCode(generateCirqCode(gates, numQubits));
            break;
          case 'qsharp':
            setCode(generateQSharpCode(gates, numQubits));
            break;
        }
      } finally {
        setIsLoading(false);
      }
    };

    generate();
  }, [gates, numQubits, format]);

  return { code, isLoading };
}

export function useClipboard(timeout = 1800) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout]
  );

  return { copied, copy };
}
