import React from 'react';
import { VQE_PRESETS, VQE_MAXCUT_PRESETS } from '../../constants/algorithms';

interface VQEConfigProps {
  mode: 'hamiltonian' | 'maxcut';
  preset: string;
  maxcutPreset: string;
  qubits: number;
  basesStr: string;
  scalesStr: string;
  ansatzDepth: number;
  shots: number;
  vqeAdjStr: string;
  vqeInvert: boolean;
  onModeChange: (mode: 'hamiltonian' | 'maxcut') => void;
  onPresetChange: (preset: string) => void;
  onMaxcutPresetChange: (preset: string) => void;
  onQubitsChange: (n: number) => void;
  onBasesChange: (s: string) => void;
  onScalesChange: (s: string) => void;
  onAnsatzDepthChange: (n: number) => void;
  onShotsChange: (n: number) => void;
  onVqeAdjChange: (s: string) => void;
  onVqeInvertChange: (v: boolean) => void;
}

const inputCls = "w-full rounded-lg p-2 text-sm focus:outline-none transition-colors";
const inputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-1)', color: 'var(--text-1)' };
const labelCls = "block text-[10px] font-medium uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: 'var(--text-3)' };

export function VQEConfig({
  mode, preset, maxcutPreset, qubits, basesStr, scalesStr, ansatzDepth, shots,
  vqeAdjStr, vqeInvert,
  onModeChange, onPresetChange, onMaxcutPresetChange, onQubitsChange,
  onBasesChange, onScalesChange, onAnsatzDepthChange, onShotsChange,
  onVqeAdjChange, onVqeInvertChange
}: VQEConfigProps) {
  return (
    <>
      <div>
        <label className={labelCls} style={labelStyle}>Mode</label>
        <div className="flex rounded-lg p-1" style={{ background: 'var(--bg-input)' }}>
          <button
            onClick={() => onModeChange('hamiltonian')}
            className="flex-1 py-1.5 text-[11px] rounded-md transition-colors font-medium"
            style={{ background: mode === 'hamiltonian' ? 'var(--blue)' : 'transparent', color: mode === 'hamiltonian' ? 'white' : 'var(--text-3)' }}
          >
            Hamiltonian
          </button>
          <button
            onClick={() => onModeChange('maxcut')}
            className="flex-1 py-1.5 text-[11px] rounded-md transition-colors font-medium"
            style={{ background: mode === 'maxcut' ? 'var(--blue)' : 'transparent', color: mode === 'maxcut' ? 'white' : 'var(--text-3)' }}
          >
            MaxCut Graph
          </button>
        </div>
      </div>

      {mode === 'hamiltonian' ? (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Problem Preset</label>
            <select
              value={preset}
              onChange={e => onPresetChange(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {Object.entries(VQE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {preset !== 'custom_vqe' && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{VQE_PRESETS[preset as keyof typeof VQE_PRESETS]?.desc}</p>
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
              Bases <span style={{ color: 'var(--text-3)' }}>(Pauli)</span>
            </label>
            <textarea
              value={basesStr}
              onChange={e => onBasesChange(e.target.value)}
              className={`${inputCls} h-14 text-xs font-mono resize-none`}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>
              Scales <span style={{ color: 'var(--text-3)' }}>(coeffs)</span>
            </label>
            <textarea
              value={scalesStr}
              onChange={e => onScalesChange(e.target.value)}
              className={`${inputCls} h-14 text-xs font-mono resize-none`}
              style={inputStyle}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Graph Preset</label>
            <select
              value={maxcutPreset}
              onChange={e => onMaxcutPresetChange(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {Object.entries(VQE_MAXCUT_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {maxcutPreset !== 'custom_maxcut' && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{VQE_MAXCUT_PRESETS[maxcutPreset as keyof typeof VQE_MAXCUT_PRESETS]?.desc}</p>
            )}
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Vertices (Qubits)</label>
            <input
              type="number"
              value={qubits}
              onChange={e => { onQubitsChange(+e.target.value || 4); }}
              className={inputCls}
              style={inputStyle}
              min={2}
              max={10}
            />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Adjacency Matrix</label>
            <textarea
              value={vqeAdjStr}
              onChange={e => onVqeAdjChange(e.target.value)}
              className={`${inputCls} h-20 text-xs font-mono resize-none`}
              style={inputStyle}
              placeholder='[[1,0,0,0],[0,1,0,1],[0,0,1,0],[0,1,0,1]]'
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={vqeInvert}
              onChange={e => onVqeInvertChange(e.target.checked)}
              id="vqe-invert"
              className="accent-blue-500"
            />
            <label htmlFor="vqe-invert" className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Invert adjacency (use distance matrix 1−A)
            </label>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} style={labelStyle}>Ansatz Depth</label>
          <input
            type="number"
            value={ansatzDepth}
            onChange={e => onAnsatzDepthChange(+e.target.value || 1)}
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
