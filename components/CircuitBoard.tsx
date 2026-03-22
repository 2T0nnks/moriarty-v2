"use client";
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { CircuitCell } from './CircuitCell';
import { GatePalette } from './GatePalette';
import AlgorithmModal from './AlgorithmModal';
import { useCircuit } from '../hooks/useCircuit';
import {
  RotateCcw, RotateCw, Trash2, Play, Loader2, Zap,
  Code, FileText, Image as ImageIcon, FileCode, Save, Upload,
  Menu, X, ChevronDown, ChevronUp, History, Plus, Minus,
  Cpu, FlaskConical, Download, MessageSquare,
} from 'lucide-react';
import { ExecutionResults } from './ExecutionResults';
import {
  executeCircuit, optimizeCircuit, exportToLatex, exportToImage,
  exportToBloch, fetchConfig, QuantumGate, ExecutionResult, OptimizationResult,
} from '../utils/api';
import {
  generateQiskitCode, generateOpenQASM, generatePennyLaneCode,
  generateCirqCode, generateQSharpCode,
} from '../utils/export';
import { ChatAssistant } from './ChatAssistant';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = 'qiskit' | 'qasm' | 'latex' | 'pennylane' | 'cirq' | 'qsharp';
type RightTab = 'results' | 'bloch' | 'optimize';

// ─── Main component ───────────────────────────────────────────────────────────

export const CircuitBoard: React.FC = () => {
  const {
    circuit, gateParams, numQubits, numSteps, gateLog,
    addGate, removeGate, updateGateParams,
    undo, redo, setCircuit, clearCircuit, clearGateLog,
    canUndo, canRedo,
  } = useCircuit();

  // Simulation state
  const [isRunning, setIsRunning]     = useState(false);
  const [result, setResult]           = useState<ExecutionResult | null>(null);
  const [optResult, setOptResult]     = useState<OptimizationResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  // UI state
  const [activeGate, setActiveGate]           = useState<string | null>(null);
  const [selectedGate, setSelectedGate]       = useState<string | null>(null);
  const [showCode, setShowCode]               = useState<ExportFormat | null>(null);
  const [latexCode, setLatexCode]             = useState('');
  const [rightTab, setRightTab]               = useState<RightTab>('results');
  const [showGateLog, setShowGateLog]         = useState(false);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [chatOpen, setChatOpen]               = useState(false);
  const [aiEnabled, setAiEnabled]             = useState(false);
  const [isAlgorithmModalOpen, setIsAlgorithmModalOpen] = useState(false);

  // Bloch sphere
  const [blochImages, setBlochImages]         = useState<string[]>([]);
  const [isBlochLoading, setIsBlochLoading]   = useState(false);

  // Fetch AI config
  useEffect(() => {
    fetchConfig().then(cfg => setAiEnabled(cfg.ai_enabled));
  }, []);

  // Live Bloch sphere
  useEffect(() => {
    const fetchBloch = async () => {
      setIsBlochLoading(true);
      try {
        const gates = getGatesFromGrid();
        const data = await exportToBloch(gates, numQubits) as any;
        if (data.bloch_images)   setBlochImages(data.bloch_images);
        else if (data.image_base64) setBlochImages([data.image_base64]);
      } catch {
        // silent
      } finally {
        setIsBlochLoading(false);
      }
    };
    const t = setTimeout(fetchBloch, 500);
    return () => clearTimeout(t);
  }, [circuit, gateParams, numQubits, numSteps]);

  // ── Gate grid helpers ──────────────────────────────────────────────────────

  const PARAMETERISED = new Set(['RX', 'RY', 'RZ']);
  const CONTROLLED_NAME: Record<string, string> = {
    '⊕': 'CNOT', 'X': 'CX', 'Y': 'CY', 'Z': 'CZ',
    'H': 'CH', 'RX': 'CRX', 'RY': 'CRY', 'RZ': 'CRZ',
  };

  const getGatesFromGrid = (): QuantumGate[] => {
    const gates: QuantumGate[] = [];
    for (let step = 0; step < numSteps; step++) {
      const controls: number[] = [];
      const targets: { name: string; qubit: number; params?: number[] }[] = [];
      const swaps: number[] = [];

      for (let qubit = 0; qubit < numQubits; qubit++) {
        const id = `q${qubit}-s${step}`;
        const g = circuit[id];
        const p = gateParams[id];
        if (!g) continue;
        if (g === '•')    controls.push(qubit);
        else if (g === 'SWAP') swaps.push(qubit);
        else targets.push({ name: g, qubit, params: p || undefined });
      }

      if (controls.length > 0) {
        if (controls.length === 1 && swaps.length === 2) {
          gates.push({ name: 'CSWAP', qubits: [controls[0], swaps[0], swaps[1]] });
        } else if (controls.length >= 2) {
          const tgt = targets.find(t => t.name === '⊕' || t.name === 'X');
          if (tgt) {
            gates.push({ name: 'CCX', qubits: [...controls.slice(0, 2), tgt.qubit] });
            targets.splice(targets.indexOf(tgt), 1);
          }
        } else {
          const ctrl = controls[0];
          const ti = targets.findIndex(t => CONTROLLED_NAME[t.name]);
          if (ti !== -1) {
            const tgt = targets[ti];
            const entry: QuantumGate = { name: CONTROLLED_NAME[tgt.name], qubits: [ctrl, tgt.qubit] };
            if (tgt.params) entry.params = tgt.params;
            gates.push(entry);
            targets.splice(ti, 1);
          }
        }
      } else if (swaps.length === 2) {
        gates.push({ name: 'SWAP', qubits: [swaps[0], swaps[1]] });
      }

      for (const g of targets) {
        if (g.name === 'M') {
          gates.push({ name: 'M', qubits: [g.qubit] });
        } else if (PARAMETERISED.has(g.name)) {
          gates.push({ name: g.name, qubits: [g.qubit], params: g.params || [Math.PI / 2] });
        } else {
          gates.push({ name: g.name, qubits: [g.qubit] });
        }
      }
    }
    return gates;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setOptResult(null);
    setRightTab('results');
    try {
      const gates = getGatesFromGrid();
      const data = await executeCircuit(gates, numQubits);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleOptimize = async () => {
    setIsRunning(true);
    setError(null);
    setOptResult(null);
    setRightTab('optimize');
    try {
      const gates = getGatesFromGrid();
      const data = await optimizeCircuit(gates, numQubits);
      setOptResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = async (fmt: ExportFormat) => {
    const gates = getGatesFromGrid();
    let content = '';
    if (fmt === 'qiskit')    content = generateQiskitCode(gates, numQubits);
    else if (fmt === 'qasm') content = generateOpenQASM(gates, numQubits);
    else if (fmt === 'pennylane') content = generatePennyLaneCode(gates, numQubits);
    else if (fmt === 'cirq')     content = generateCirqCode(gates, numQubits);
    else if (fmt === 'qsharp')   content = generateQSharpCode(gates, numQubits);
    else if (fmt === 'latex') {
      try {
        const data = await exportToLatex(gates, numQubits) as any;
        content = data.latex_code || '';
      } catch { content = '% Error generating LaTeX'; }
    }
    setLatexCode(content);
    setShowCode(fmt);
  };

  const handleDownloadImage = async () => {
    try {
      const gates = getGatesFromGrid();
      const data = await exportToImage(gates, numQubits) as any;
      if (data.image_base64) {
        const a = document.createElement('a');
        a.href = `data:image/png;base64,${data.image_base64}`;
        a.download = 'circuit.png';
        a.click();
      }
    } catch { /* silent */ }
  };

  const saveCircuit = () => {
    const blob = new Blob([JSON.stringify({ circuit, gateParams, numQubits, numSteps }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'circuit.json';
    a.click();
  };

  const loadCircuit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.circuit) setCircuit(data.circuit, data.gateParams || {}, 'Loaded circuit');
      } catch { /* silent */ }
    };
    reader.readAsText(file);
  };

  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDragStart = (e: DragStartEvent) => {
    setActiveGate((e.active.data.current?.name as string) || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveGate(null);
    const { active, over } = e;
    if (over && active.data.current) {
      addGate(over.id as string, active.data.current.name as string);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DndContext id="dnd-context" onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* ── TOP BAR ── */}
      <header className="topbar">
        {/* Logo + title */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSidebarOpen(v => !v)}
          title="Toggle sidebar"
        >
          <Menu size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {/* Quantum icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, var(--cyan) 0%, var(--violet) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
              boxShadow: 'var(--cyan-glow)',
            }}
          >
            Q
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              background: 'linear-gradient(90deg, var(--cyan) 0%, var(--violet-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.01em',
            }}
          >
            Quantum Circuit Debugger
          </span>
          <span className="badge badge-cyan" style={{ marginLeft: 4 }}>v2</span>
        </div>

        {/* Qubit / step controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>QUBITS</span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => {}}
            style={{ padding: '2px 5px' }}
            title="Remove qubit"
          >
            <Minus size={10} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 16, textAlign: 'center' }}>
            {numQubits}
          </span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ padding: '2px 5px' }}
            title="Add qubit"
          >
            <Plus size={10} />
          </button>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            style={{ opacity: canUndo ? 1 : 0.3 }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            style={{ opacity: canRedo ? 1 : 0.3 }}
          >
            <RotateCw size={15} />
          </button>
        </div>

        {/* Clear */}
        <button
          className="btn btn-danger btn-sm"
          onClick={() => {
            if (window.confirm('Clear the entire circuit?')) {
              clearCircuit();
              setError(null);
              setResult(null);
              setOptResult(null);
            }
          }}
          title="Clear circuit"
        >
          <Trash2 size={13} />
          Clear
        </button>

        {/* Export group */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: '3px 6px',
            borderRadius: 7,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
          }}
        >
          {([
            { fmt: 'qasm',      label: 'QASM',  icon: <FileCode size={13} /> },
            { fmt: 'qiskit',    label: 'Qiskit', icon: <Code size={13} /> },
            { fmt: 'latex',     label: 'LaTeX',  icon: <FileText size={13} /> },
            { fmt: 'pennylane', label: 'PL',     icon: null },
            { fmt: 'cirq',      label: 'Cirq',   icon: null },
            { fmt: 'qsharp',    label: 'Q#',     icon: null },
          ] as { fmt: ExportFormat; label: string; icon: React.ReactNode }[]).map(({ fmt, label, icon }) => (
            <button
              key={fmt}
              className="btn btn-ghost btn-sm"
              onClick={() => handleExport(fmt)}
              title={`Export ${label}`}
              style={{ padding: '3px 7px', gap: 3, fontSize: 10 }}
            >
              {icon}
              {label}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border-secondary)', margin: '2px 4px' }} />
          <button className="btn btn-ghost btn-icon" onClick={handleDownloadImage} title="Download PNG">
            <ImageIcon size={13} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={saveCircuit} title="Save JSON">
            <Save size={13} />
          </button>
          <label className="btn btn-ghost btn-icon" title="Load JSON" style={{ cursor: 'pointer' }}>
            <Upload size={13} />
            <input type="file" onChange={loadCircuit} accept=".json" style={{ display: 'none' }} />
          </label>
        </div>

        {/* Gate history */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setShowGateLog(v => !v)}
          title="Gate history"
          style={{
            position: 'relative',
            color: showGateLog ? 'var(--cyan)' : undefined,
            background: showGateLog ? 'var(--cyan-dim)' : undefined,
          }}
        >
          <History size={15} />
          {gateLog.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 2, right: 2,
                width: 14, height: 14,
                borderRadius: '50%',
                background: 'var(--cyan)',
                color: '#000',
                fontSize: 8,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {gateLog.length > 9 ? '9+' : gateLog.length}
            </span>
          )}
        </button>

        {/* Algorithms */}
        <button
          className="btn btn-violet"
          onClick={() => setIsAlgorithmModalOpen(true)}
        >
          <FlaskConical size={14} />
          Algorithms
        </button>

        {/* Run */}
        <button
          className="btn btn-primary"
          onClick={handleRun}
          disabled={isRunning}
          style={{ minWidth: 80 }}
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isRunning ? 'Running' : 'Run'}
        </button>

        {/* AI Chat */}
        {aiEnabled && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setChatOpen(v => !v)}
            title="AI Assistant"
            style={{
              color: chatOpen ? 'var(--violet-light)' : undefined,
              background: chatOpen ? 'var(--violet-dim)' : undefined,
            }}
          >
            <MessageSquare size={15} />
          </button>
        )}
      </header>

      {/* ── WORKSPACE ── */}
      <div className="workspace">

        {/* Gate palette sidebar */}
        {sidebarOpen && (
          <GatePalette
            onGateSelect={setSelectedGate}
            selectedGate={selectedGate}
          />
        )}

        {/* ── CENTER CANVAS ── */}
        <div className="canvas-area">

          {/* Gate history strip */}
          {showGateLog && (
            <div
              style={{
                flexShrink: 0,
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                padding: '8px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={13} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Gate History
                  </span>
                  <span className="badge badge-cyan">{gateLog.length}</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearGateLog}
                  style={{ fontSize: 10 }}
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {gateLog.length === 0 ? (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No actions yet.
                  </span>
                ) : (
                  gateLog.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{
                        color: entry.action === 'add' ? 'var(--emerald)'
                          : entry.action === 'remove' ? 'var(--rose)'
                          : 'var(--cyan)',
                      }}>
                        {entry.action === 'add' ? '+' : entry.action === 'remove' ? '−' : '⬇'}
                      </span>
                      <strong>{entry.gate}</strong>
                      {entry.cell && (
                        <span style={{ color: 'var(--text-muted)' }}>@ {entry.cell}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Circuit grid area */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
            }}
            className="scrollbar-thin"
          >
            {/* Circuit container */}
            <div
              style={{
                display: 'inline-block',
                minWidth: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: '24px 20px',
              }}
            >
              {/* Qubit rows */}
              {Array.from({ length: numQubits }).map((_, qi) => (
                <div
                  key={`q${qi}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: qi < numQubits - 1 ? 16 : 0,
                    position: 'relative',
                  }}
                >
                  {/* Qubit label */}
                  <div
                    style={{
                      width: 52,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 5,
                        padding: '2px 6px',
                      }}
                    >
                      q[{qi}]
                    </span>
                  </div>

                  {/* Wire + cells */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      flex: 1,
                    }}
                  >
                    {/* Wire line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 1,
                        background: `linear-gradient(90deg, transparent 0%, var(--wire-color) 3%, var(--wire-color) 97%, transparent 100%)`,
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Cells */}
                    {Array.from({ length: numSteps }).map((_, si) => {
                      const cellId = `q${qi}-s${si}`;
                      const gateName = circuit[cellId];
                      return (
                        <div
                          key={cellId}
                          style={{ position: 'relative', zIndex: 1, marginRight: 4 }}
                        >
                          <CircuitCell
                            id={cellId}
                            gate={gateName || null}
                            params={gateParams[cellId]}
                            onRemove={() => removeGate(cellId)}
                            onUpdateParams={(p) => updateGateParams(cellId, p)}
                            onAdd={selectedGate ? () => addGate(cellId, selectedGate) : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Code export panel */}
            {showCode && (
              <div
                style={{
                  marginTop: 16,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
                className="animate-fade-in"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Code size={14} style={{ color: 'var(--cyan)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {showCode.toUpperCase()} Export
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(latexCode);
                      }}
                      style={{ fontSize: 10 }}
                    >
                      Copy
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setShowCode(null)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'var(--cyan)',
                    background: 'var(--bg-code)',
                    overflowX: 'auto',
                    maxHeight: 300,
                    lineHeight: 1.6,
                  }}
                  className="scrollbar-thin"
                >
                  {latexCode}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          {/* Tab bar */}
          <div className="tab-bar">
            {([
              { id: 'results',  label: 'Results' },
              { id: 'bloch',    label: 'Bloch' },
              { id: 'optimize', label: 'Optimize' },
            ] as { id: RightTab; label: string }[]).map(t => (
              <button
                key={t.id}
                className={`tab${rightTab === t.id ? ' active' : ''}`}
                onClick={() => setRightTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Results tab */}
            {rightTab === 'results' && (
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }} className="scrollbar-thin animate-fade-in">
                {/* Run button shortcut */}
                <button
                  className="btn btn-primary"
                  onClick={handleRun}
                  disabled={isRunning}
                  style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
                >
                  {isRunning
                    ? <><Loader2 size={14} className="animate-spin" /> Running…</>
                    : <><Play size={14} /> Run Simulation</>
                  }
                </button>
                <ExecutionResults result={result} error={error} isRunning={isRunning} />
              </div>
            )}

            {/* Bloch tab */}
            {rightTab === 'bloch' && (
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }} className="scrollbar-thin animate-fade-in">
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 8,
                    padding: 12,
                    position: 'relative',
                    minHeight: 200,
                  }}
                >
                  {isBlochLoading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: 'var(--bg-overlay)',
                        borderRadius: 8,
                        zIndex: 10,
                      }}
                    >
                      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--cyan)' }} />
                      <span style={{ fontSize: 11, color: 'var(--cyan)' }}>Updating…</span>
                    </div>
                  )}

                  {blochImages.length > 0 ? (
                    blochImages.map((img, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-muted)',
                            marginBottom: 4,
                          }}
                        >
                          Qubit {i}
                        </div>
                        <img
                          src={`data:image/png;base64,${img}`}
                          alt={`Bloch sphere qubit ${i}`}
                          style={{ width: '100%', borderRadius: 6 }}
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minHeight: 160,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          border: '2px dashed var(--border-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.5,
                        }}
                      >
                        <Zap size={20} />
                      </div>
                      <span style={{ fontSize: 11, textAlign: 'center' }}>
                        Build a circuit to see<br />Bloch sphere visualization
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Updates automatically as you modify the circuit.
                  Double-click rotation gates to edit angles.
                </div>
              </div>
            )}

            {/* Optimize tab */}
            {rightTab === 'optimize' && (
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }} className="scrollbar-thin animate-fade-in">
                <button
                  className="btn btn-violet"
                  onClick={handleOptimize}
                  disabled={isRunning}
                  style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
                >
                  {isRunning
                    ? <><Loader2 size={14} className="animate-spin" /> Optimizing…</>
                    : <><Cpu size={14} /> Optimize Circuit</>
                  }
                </button>

                {optResult && (
                  <div className="animate-fade-in">
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Original Depth', value: optResult.original_depth },
                        { label: 'Optimized Depth', value: optResult.optimized_depth },
                        { label: 'Original Gates', value: Object.values(optResult.original_ops).reduce((a, b) => a + b, 0) },
                        { label: 'Optimized Gates', value: Object.values(optResult.optimized_ops).reduce((a, b) => a + b, 0) },
                      ].map(s => (
                        <div key={s.label} className="stat-card">
                          <div className="stat-label">{s.label}</div>
                          <div className="stat-value" style={{ fontSize: 16 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* OpenQASM output */}
                    {optResult.optimized_qasm && (
                      <div
                        style={{
                          background: 'var(--bg-code)',
                          border: '1px solid var(--border-secondary)',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--border-secondary)',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          OpenQASM Output
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: 12,
                            fontSize: 10,
                            fontFamily: 'monospace',
                            color: 'var(--cyan)',
                            overflowX: 'auto',
                            maxHeight: 200,
                            lineHeight: 1.5,
                          }}
                          className="scrollbar-thin"
                        >
                          {optResult.optimized_qasm}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {!optResult && !isRunning && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minHeight: 160,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Cpu size={32} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 11, textAlign: 'center' }}>
                      Run optimization to see<br />depth and gate count metrics
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ALGORITHM MODAL ── */}
      <AlgorithmModal
        isOpen={isAlgorithmModalOpen}
        onClose={() => setIsAlgorithmModalOpen(false)}
        circuit={getGatesFromGrid()}
        numQubits={numQubits}
      />

      {/* ── AI CHAT ── */}
      {aiEnabled && chatOpen && (
        <ChatAssistant
          circuitContext={{
            gates: getGatesFromGrid() as any,
            num_qubits: numQubits,
            error,
            result,
          }}
          onLoadCircuit={(grid, params, _nq, description) => setCircuit(grid, params, description)}
        />
      )}

      {/* ── DRAG OVERLAY ── */}
      <DragOverlay dropAnimation={null}>
        {activeGate && (
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '2px solid var(--cyan)',
              background: 'var(--bg-elevated)',
              color: 'var(--cyan)',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: 'var(--cyan-glow)',
              pointerEvents: 'none',
            }}
          >
            {activeGate}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
