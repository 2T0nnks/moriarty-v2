'use client';
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Wand2, X, AlertCircle, Check } from 'lucide-react';

interface MakeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGate: (name: string, matrix: number[][], qubits: number) => void;
}

type MatrixSize = '2x2' | '4x4';

const TEMPLATES: Record<string, { size: MatrixSize; matrix: string[][] }> = {
  'Identity': {
    size: '2x2',
    matrix: [['1', '0'], ['0', '1']],
  },
  'Phase(π/6)': {
    size: '2x2',
    matrix: [['1', '0'], ['0', 'e^(iπ/6)']],
  },
  'SX (√X)': {
    size: '2x2',
    matrix: [['(1+i)/2', '(1-i)/2'], ['(1-i)/2', '(1+i)/2']],
  },
  'iSWAP': {
    size: '4x4',
    matrix: [
      ['1', '0', '0', '0'],
      ['0', '0', 'i', '0'],
      ['0', 'i', '0', '0'],
      ['0', '0', '0', '1'],
    ],
  },
};

/** Parse a complex number string like "1+2i", "e^(iπ/6)", "(1+i)/2" etc. */
function parseComplex(s: string): [number, number] | null {
  s = s.trim();
  if (!s) return [0, 0];

  // Handle e^(iθ) format
  const expMatch = s.match(/^e\^\(i\s*([^)]+)\)$/);
  if (expMatch) {
    const angle = evalAngle(expMatch[1]);
    if (angle === null) return null;
    return [Math.cos(angle), Math.sin(angle)];
  }

  // Handle (a+bi)/c format
  const divMatch = s.match(/^\(([^)]+)\)\s*\/\s*(\d+\.?\d*)$/);
  if (divMatch) {
    const inner = parseComplex(divMatch[1]);
    const divisor = parseFloat(divMatch[2]);
    if (!inner || isNaN(divisor) || divisor === 0) return null;
    return [inner[0] / divisor, inner[1] / divisor];
  }

  // Handle pure imaginary "i", "-i", "2i"
  if (/^(-?\d*\.?\d*)?i$/.test(s)) {
    const coef = s.replace('i', '');
    const val = coef === '' || coef === '+' ? 1 : coef === '-' ? -1 : parseFloat(coef);
    return isNaN(val) ? null : [0, val];
  }

  // Handle pure real
  if (/^-?\d+\.?\d*$/.test(s)) {
    const val = parseFloat(s);
    return isNaN(val) ? null : [val, 0];
  }

  // Handle a+bi or a-bi
  const match = s.match(/^(-?\d*\.?\d*)\s*([+-])\s*(\d*\.?\d*)?i$/);
  if (match) {
    const real = parseFloat(match[1] || '0');
    const sign = match[2] === '-' ? -1 : 1;
    const imagCoef = match[3] === '' || match[3] === undefined ? 1 : parseFloat(match[3]);
    if (isNaN(real) || isNaN(imagCoef)) return null;
    return [real, sign * imagCoef];
  }

  // Try as simple zero
  if (s === '0') return [0, 0];

  return null;
}

function evalAngle(s: string): number | null {
  s = s.trim();
  // Handle π
  const piStr = s.replace(/[πpi]/gi, `${Math.PI}`);
  try {
    // Simple eval for safe math expressions
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${piStr})`)() as number;
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch {
    return null;
  }
}

function isUnitary(matrix: [number, number][][]): { valid: boolean; error?: string } {
  const n = matrix.length;

  // Check square
  for (const row of matrix) {
    if (row.length !== n) return { valid: false, error: 'Matrix must be square' };
  }

  // Compute U† U and check identity
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // (U† U)_{ij} = Σ_k conj(U_{ki}) * U_{kj}
      let realSum = 0;
      let imagSum = 0;
      for (let k = 0; k < n; k++) {
        const [ar, ai] = matrix[k][i]; // conjugate of column i
        const [br, bi] = matrix[k][j]; // column j
        // conj(a) * b = (ar - ai*i) * (br + bi*i)
        realSum += ar * br + ai * bi;
        imagSum += ar * bi - ai * br;
      }
      const expected = i === j ? 1 : 0;
      if (Math.abs(realSum - expected) > 1e-6 || Math.abs(imagSum) > 1e-6) {
        return {
          valid: false,
          error: `Not unitary: (U†U)[${i}][${j}] = ${realSum.toFixed(4)} + ${imagSum.toFixed(4)}i (expected ${expected})`,
        };
      }
    }
  }

  return { valid: true };
}

export default function MakeGateModal({ isOpen, onClose, onCreateGate }: MakeGateModalProps) {
  const [size, setSize] = useState<MatrixSize>('2x2');
  const [gateName, setGateName] = useState('U');
  const [cells, setCells] = useState<string[][]>([
    ['1', '0'],
    ['0', '1'],
  ]);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  const n = size === '2x2' ? 2 : 4;

  const handleSizeChange = useCallback((newSize: MatrixSize) => {
    setSize(newSize);
    setValidated(false);
    setError(null);
    const dim = newSize === '2x2' ? 2 : 4;
    const newCells = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => (i === j ? '1' : '0'))
    );
    setCells(newCells);
  }, []);

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    setCells(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
    setValidated(false);
    setError(null);
  }, []);

  const loadTemplate = useCallback((name: string) => {
    const tpl = TEMPLATES[name];
    if (!tpl) return;
    setSize(tpl.size);
    setCells(tpl.matrix.map(r => [...r]));
    setValidated(false);
    setError(null);
  }, []);

  const handleValidate = useCallback(() => {
    // Parse all cells
    const parsed: [number, number][][] = [];
    for (let i = 0; i < n; i++) {
      const row: [number, number][] = [];
      for (let j = 0; j < n; j++) {
        const c = parseComplex(cells[i][j]);
        if (c === null) {
          setError(`Invalid entry at [${i}][${j}]: "${cells[i][j]}"`);
          setValidated(false);
          return;
        }
        row.push(c);
      }
      parsed.push(row);
    }

    const result = isUnitary(parsed);
    if (!result.valid) {
      setError(result.error || 'Matrix is not unitary');
      setValidated(false);
    } else {
      setError(null);
      setValidated(true);
    }
  }, [cells, n]);

  const handleCreate = useCallback(() => {
    if (!validated) {
      handleValidate();
      return;
    }

    // Parse matrix to flat format: [[real, imag], ...]
    const flatMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const c = parseComplex(cells[i][j]);
        if (!c) return;
        flatMatrix.push([c[0], c[1]]);
      }
    }

    onCreateGate(gateName || 'U', flatMatrix, size === '2x2' ? 1 : 2);
    onClose();
  }, [validated, cells, n, gateName, size, handleValidate, onCreateGate, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="m-modal-backdrop"
        onClick={onClose}
        style={{ animation: 'mFadeIn 150ms both' }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 101,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          pointerEvents: 'none',
        }}
      >
        <div
          className="m-modal"
          style={{
            width: size === '4x4' ? 720 : 520,
            maxWidth: '100%',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="m-modal-hdr">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wand2 size={16} style={{ color: 'var(--amber)' }} />
              <span className="m-modal-title">Make Custom Gate</span>
            </div>
            <button
              className="m-btn m-btn-ghost m-btn-icon"
              onClick={onClose}
              style={{ width: 28, height: 28 }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="m-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Gate name & size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="m-label" style={{ marginBottom: 6 }}>Gate Name</div>
                <input
                  className="m-input"
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  placeholder="U"
                  maxLength={8}
                />
              </div>
              <div>
                <div className="m-label" style={{ marginBottom: 6 }}>Qubit Count</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={`m-btn m-btn-sm ${size === '2x2' ? 'm-btn-amber' : 'm-btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleSizeChange('2x2')}
                  >
                    1 Qubit (2×2)
                  </button>
                  <button
                    className={`m-btn m-btn-sm ${size === '4x4' ? 'm-btn-amber' : 'm-btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleSizeChange('4x4')}
                  >
                    2 Qubits (4×4)
                  </button>
                </div>
              </div>
            </div>

            {/* Templates */}
            <div>
              <div className="m-label" style={{ marginBottom: 6 }}>Templates</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.keys(TEMPLATES).map(name => (
                  <button
                    key={name}
                    className="m-btn m-btn-ghost m-btn-sm"
                    onClick={() => loadTemplate(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix input */}
            <div>
              <div className="m-label" style={{ marginBottom: 6 }}>
                Unitary Matrix ({size})
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${n}, 1fr)`,
                  gap: 4,
                  padding: 12,
                  background: 'var(--bg-3)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-1)',
                }}
              >
                {Array.from({ length: n }, (_, i) =>
                  Array.from({ length: n }, (_, j) => (
                    <input
                      key={`${i}-${j}`}
                      className="m-input"
                      style={{
                        textAlign: 'center',
                        fontFamily: 'var(--font-code)',
                        fontSize: 12,
                        padding: '6px 4px',
                      }}
                      value={cells[i]?.[j] ?? '0'}
                      onChange={(e) => handleCellChange(i, j, e.target.value)}
                      placeholder="0"
                    />
                  ))
                )}
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
                Supports: real numbers, i, a+bi, e^(iπ/n), (1+i)/2
              </p>
            </div>

            {/* Validation result */}
            {error && (
              <div
                className="m-card"
                style={{
                  borderColor: 'var(--crimson-border)',
                  background: 'var(--crimson-dim)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={14} style={{ color: 'var(--crimson)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--crimson)' }}>{error}</span>
              </div>
            )}

            {validated && !error && (
              <div
                className="m-card"
                style={{
                  borderColor: 'var(--emerald-border)',
                  background: 'var(--emerald-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check size={14} style={{ color: 'var(--emerald)' }} />
                <span style={{ fontSize: 11, color: 'var(--emerald)' }}>
                  Matrix is unitary ✓ — ready to create gate
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-1)',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}
          >
            <button className="m-btn m-btn-outline" onClick={handleValidate}>
              Validate
            </button>
            <button
              className="m-btn m-btn-amber"
              onClick={handleCreate}
              disabled={!validated}
            >
              <Wand2 size={12} />
              Create Gate
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
