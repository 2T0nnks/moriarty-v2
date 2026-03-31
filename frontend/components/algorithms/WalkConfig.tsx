import React from 'react';
import { WALK_PRESETS } from '../constants/algorithms';

interface WalkConfigProps {
  preset: string;
  topology: string;
  vertices: number;
  initial: number;
  steps: number;
  dt: number;
  shots: number;
  matrixStr: string;
  onPresetChange: (preset: string) => void;
  onTopologyChange: (t: string) => void;
  onVerticesChange: (n: number) => void;
  onInitialChange: (n: number) => void;
  onStepsChange: (n: number) => void;
  onDtChange: (v: number) => void;
  onShotsChange: (n: number) => void;
  onMatrixChange: (s: string) => void;
}

const inputCls = "w-full rounded-lg p-2 text-sm focus:outline-none transition-colors";
const inputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-1)', color: 'var(--text-1)' };
const labelCls = "block text-[10px] font-medium uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: 'var(--text-3)' };

export function WalkConfig({
  preset, topology, vertices, initial, steps, dt, shots, matrixStr,
  onPresetChange, onTopologyChange, onVerticesChange, onInitialChange,
  onStepsChange, onDtChange, onShotsChange, onMatrixChange
}: WalkConfigProps) {
  return (
    <>
      <div>
        <label className={labelCls} style={labelStyle}>Graph Topology</label>
        <select
          value={preset}
          onChange={e => onPresetChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          {Object.entries(WALK_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {preset !== 'custom_walk' && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{WALK_PRESETS[preset as keyof typeof WALK_PRESETS]?.desc}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} style={labelStyle}>Vertices</label>
          <input
            type="number"
            value={vertices}
            onChange={e => { onVerticesChange(+e.target.value || 4); }}
            className={inputCls}
            style={inputStyle}
            min={2}
            max={16}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Start Vertex</label>
          <input
            type="number"
            value={initial}
            onChange={e => onInitialChange(+e.target.value || 0)}
            className={inputCls}
            style={inputStyle}
            min={0}
            max={vertices - 1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} style={labelStyle}>Time Steps</label>
          <input
            type="number"
            value={steps}
            onChange={e => onStepsChange(+e.target.value || 10)}
            className={inputCls}
            style={inputStyle}
            min={1}
            max={50}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Δt</label>
          <input
            type="number"
            value={dt}
            onChange={e => onDtChange(+e.target.value || 0.5)}
            className={inputCls}
            style={inputStyle}
            min={0.1}
            max={2}
            step={0.1}
          />
        </div>
      </div>

      {preset === 'custom_walk' && (
        <div>
          <label className={labelCls} style={labelStyle}>
            Adjacency Matrix <span style={{ color: 'var(--text-3)' }}>(optional JSON)</span>
          </label>
          <textarea
            value={matrixStr}
            onChange={e => onMatrixChange(e.target.value)}
            className={`${inputCls} h-16 text-xs font-mono resize-none`}
            style={inputStyle}
            placeholder='[[0,1,0],[1,0,1],[0,1,0]]'
          />
        </div>
      )}

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
    </>
  );
}
