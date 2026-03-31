import React from 'react';
import { QAOA_PRESETS } from '../../constants/algorithms';

interface QAOAConfigProps {
  preset: string;
  qubits: number;
  matrixStr: string;
  linearStr: string;
  pLayers: number;
  shots: number;
  onPresetChange: (preset: string) => void;
  onQubitsChange: (n: number) => void;
  onMatrixChange: (s: string) => void;
  onLinearChange: (s: string) => void;
  onPLayersChange: (n: number) => void;
  onShotsChange: (n: number) => void;
}

const inputCls = "w-full rounded-lg p-2 text-sm focus:outline-none transition-colors";
const inputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-1)', color: 'var(--text-1)' };
const labelCls = "block text-[10px] font-medium uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: 'var(--text-3)' };

export function QAOAConfig({
  preset, qubits, matrixStr, linearStr, pLayers, shots,
  onPresetChange, onQubitsChange, onMatrixChange, onLinearChange, onPLayersChange, onShotsChange
}: QAOAConfigProps) {
  const hasLinear = (() => {
    try { return JSON.parse(linearStr).some((v: number) => v !== 0); } catch { return false; }
  })();

  return (
    <>
      <div>
        <label className={labelCls} style={labelStyle}>Problem Preset</label>
        <select
          value={preset}
          onChange={e => onPresetChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          {Object.entries(QAOA_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {preset !== 'custom_qaoa' && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{QAOA_PRESETS[preset as keyof typeof QAOA_PRESETS]?.desc}</p>
        )}
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Qubits</label>
        <input
          type="number"
          value={qubits}
          onChange={e => onQubitsChange(+e.target.value || 2)}
          className={inputCls}
          style={inputStyle}
          min={2}
          max={10}
        />
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>
          J<sub>ij</sub> Matrix <span style={{ color: 'var(--text-3)' }}>(ZZ)</span>
        </label>
        <textarea
          value={matrixStr}
          onChange={e => onMatrixChange(e.target.value)}
          className={`${inputCls} h-16 text-xs font-mono resize-none`}
          style={inputStyle}
        />
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>
          h<sub>i</sub> Linear <span style={{ color: 'var(--text-3)' }}>(Z)</span>
        </label>
        <textarea
          value={linearStr}
          onChange={e => onLinearChange(e.target.value)}
          className={`${inputCls} h-10 text-xs font-mono resize-none`}
          style={inputStyle}
        />
        {hasLinear && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--accent-yellow)' }}>⚡ General Ising / MVC mode</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} style={labelStyle}>Layers (p)</label>
          <input
            type="number"
            value={pLayers}
            onChange={e => onPLayersChange(+e.target.value || 1)}
            className={inputCls}
            style={inputStyle}
            min={1}
            max={10}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Shots</label>
          <input
            type="number"
            value={shots}
            onChange={e => onShotsChange(+e.target.value || 1024)}
            className={inputCls}
            style={inputStyle}
            min={1}
          />
        </div>
      </div>
    </>
  );
}
