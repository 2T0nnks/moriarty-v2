'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  Undo2, Redo2, Trash2, Plus, Minus, ChevronLeft, ChevronRight,
  Zap, BookOpen, Bot, Download, Copy, Check,
  BarChart2, Cpu, GitBranch, Terminal, Save, Upload,
  ChevronDown, ChevronUp, Layers, Activity, AlertCircle,
  Loader2, X, PanelRightClose, PanelRightOpen, Wand2,
} from 'lucide-react';
import { CircuitCell } from './CircuitCell';
import { Gate } from './Gate';
import AlgorithmModal from './AlgorithmModal';
import AllGatesModal from './AllGatesModal';
import MakeGateModal from './MakeGateModal';
import { ExecutionResults } from './ExecutionResults';
import { ChatAssistant } from './ChatAssistant';
import { useCircuit } from '../hooks/useCircuit';
import {
  executeCircuit, optimizeCircuit, exportToLatex, exportToImage,
  exportToBloch, fetchConfig, QuantumGate, ExecutionResult, OptimizationResult,
} from '../utils/api';
import {
  generateQiskitCode, generateOpenQASM, generatePennyLaneCode,
  generateCirqCode, generateQSharpCode,
} from '../utils/export';

// ─── Gate definitions ────────────────────────────────────────────────────────
const GATE_GROUPS = [
  {
    label: 'Single Qubit',
    gates: ['H', 'X', 'Y', 'Z', 'S', 'T'],
  },
  {
    label: 'Rotation',
    gates: ['RX', 'RY', 'RZ'],
  },
  {
    label: 'Multi-Qubit',
    gates: ['SWAP'],
  },
  {
    label: 'Controlled',
    gates: ['CX', 'CY', 'CZ', 'CH'],
  },
  {
    label: 'Advanced',
    gates: ['CCX', 'CSWAP', 'CRX', 'CRY', 'CRZ', 'CP'],
  },
  {
    label: 'Measure',
    gates: ['M'],
  },
];

const GATE_DESCRIPTIONS: Record<string, string> = {
  H: 'Hadamard — superposition', X: 'Pauli-X — bit flip',
  Y: 'Pauli-Y — bit+phase flip', Z: 'Pauli-Z — phase flip',
  S: 'S — √Z (π/2 phase)', T: 'T — ⁴√Z (π/4 phase)',
  RX: 'RX — X-axis rotation', RY: 'RY — Y-axis rotation',
  RZ: 'RZ — Z-axis rotation', SWAP: 'SWAP two qubits',
  M: 'Measurement',
  CX: 'Controlled-X (CNOT)', CY: 'Controlled-Y',
  CZ: 'Controlled-Z', CH: 'Controlled-Hadamard',
  CCX: 'Toffoli (double-controlled X)', CSWAP: 'Fredkin (controlled SWAP)',
  CRX: 'Controlled RX(θ)', CRY: 'Controlled RY(θ)',
  CRZ: 'Controlled RZ(θ)', CP: 'Controlled Phase(θ)',
  UNITARY: 'Custom unitary gate',
};

// ─── Export formats ───────────────────────────────────────────────────────────
type ExportFmt = 'qasm' | 'qiskit' | 'pennylane' | 'cirq' | 'qsharp' | 'latex';
type BottomTab = 'results' | 'optimize' | 'export' | 'log';
type RightTab  = 'bloch';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseCellId(id: string) {
  const [q, s] = id.split('-');
  return { qubit: parseInt(q.substring(1)), step: parseInt(s.substring(1)) };
}

function buildGateList(
  grid: Record<string, string>,
  params: Record<string, number[]>,
  numQubits: number,
): QuantumGate[] {
  return Object.entries(grid).map(([cellId, name]) => {
    const { qubit, step } = parseCellId(cellId);
    return { name, qubits: [qubit], step, params: params[cellId] };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MoriartyShell() {
  const {
    circuit, gateParams, numQubits, numSteps, gateLog,
    addGate, removeGate, updateGateParams, undo, redo,
    setCircuit, clearCircuit, clearGateLog,
    canUndo, canRedo,
  } = useCircuit();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('results');
  const [bottomOpen, setBottomOpen] = useState(false);
  const [rightTab] = useState<RightTab>('bloch');
  const [chatOpen, setChatOpen] = useState(false);
  const [isAlgoOpen, setIsAlgoOpen] = useState(false);
  const [isAllGatesOpen, setIsAllGatesOpen] = useState(false);
  const [isMakeGateOpen, setIsMakeGateOpen] = useState(false);

  // ── Custom gates state ────────────────────────────────────────────────────
  const [customGates, setCustomGates] = useState<Record<string, number[]>>({});

  // ── Execution state ───────────────────────────────────────────────────────
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // ── Bloch state ───────────────────────────────────────────────────────────────────────
  const [blochImages, setBlochImages] = useState<string[]>([]);
  const [isBlochLoading, setIsBlochLoading] = useState(false);

  // ── Live Bloch Sphere — atualiza automaticamente quando o circuito muda ──────────────────────
  useEffect(() => {
    if (Object.keys(circuit).length === 0) {
      setBlochImages([]);
      return;
    }
    setIsBlochLoading(true);
    const timer = setTimeout(async () => {
      try {
        const gates = buildGateList(circuit, gateParams, numQubits);
        const data = await exportToBloch(gates, numQubits);
        if ((data as any).bloch_images) {
          setBlochImages((data as any).bloch_images);
        } else if ((data as any).image_base64) {
          setBlochImages([(data as any).image_base64]);
        }
      } catch {
        // silently ignore
      } finally {
        setIsBlochLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [circuit, gateParams, numQubits, numSteps]);

  // ── Optimize state ────────────────────────────────────────────────────────────
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  // ── Export state ──────────────────────────────────────────────────────────
  const [exportFmt, setExportFmt] = useState<ExportFmt>('qasm');
  const [exportCode, setExportCode] = useState('');
  const [copied, setCopied] = useState(false);

  // ── AI state ─────────────────────────────────────────────────────────────
  const [aiEnabled, setAiEnabled] = useState(false);

  // ── Fetch config on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchConfig().then(cfg => setAiEnabled(cfg.ai_enabled)).catch(() => setAiEnabled(false));
  }, []);

  // ── Gate counts ───────────────────────────────────────────────────────────
  const gateCount = Object.keys(circuit).length;
  const depth = numSteps;

  // ── Build gate list helper ────────────────────────────────────────────────
  const getGates = useCallback(
    () => buildGateList(circuit, gateParams, numQubits),
    [circuit, gateParams, numQubits],
  );

  // ── DnD sensors (require 8px movement before activating drag) ─────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── DnD handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveGate(String(e.active.data.current?.name ?? e.active.id));
    // Libera overflow da sidebar durante o drag para o ghost não ser cortado
    const sidebar = document.querySelector<HTMLElement>('.m-sidebar');
    const fill = document.querySelector<HTMLElement>('.m-fill.m-scroll');
    if (sidebar) sidebar.style.overflow = 'visible';
    if (fill) fill.style.overflow = 'visible';
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveGate(null);
    // Restaura overflow da sidebar
    const sidebar = document.querySelector<HTMLElement>('.m-sidebar');
    const fill = document.querySelector<HTMLElement>('.m-fill.m-scroll');
    if (sidebar) sidebar.style.overflow = '';
    if (fill) fill.style.overflow = '';
    const { over, active } = e;
    if (!over) return;
    const gateName = String(active.data.current?.name ?? active.id);
    const cellId = String(over.id);
    if (circuit[cellId]) return;
    
    // Check if this is a custom gate and add its params
    if (customGates[gateName]) {
      addGate(cellId, 'UNITARY');
      // Need to update params for this cell after adding
      setTimeout(() => updateGateParams(cellId, customGates[gateName]), 0);
    } else {
      addGate(cellId, gateName);
    }
  }, [circuit, addGate, customGates, updateGateParams]);

  // ── Cell click (click-to-place) ───────────────────────────────────────────
  const handleCellClick = useCallback((cellId: string) => {
    if (!selectedGate) return;
    if (circuit[cellId]) return;
    
    // Check if this is a custom gate and add its params
    if (customGates[selectedGate]) {
      addGate(cellId, 'UNITARY');
      // Need to update params for this cell after adding
      setTimeout(() => updateGateParams(cellId, customGates[selectedGate]), 0);
    } else {
      addGate(cellId, selectedGate);
    }
  }, [selectedGate, circuit, addGate, customGates, updateGateParams]);

  // ── Run ───────────────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (gateCount === 0) return;
    setIsRunning(true);
    setExecError(null);
    setBottomTab('results');
    setBottomOpen(true);
    try {
      const result = await executeCircuit(getGates(), numQubits);
      setExecResult(result);
    } catch (err: any) {
      setExecError(err?.response?.data?.detail || err.message || 'Execution failed');
    } finally {
      setIsRunning(false);
    }
  }, [getGates, numQubits, gateCount]);

  // ── Optimize ───────────────────────────────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (gateCount === 0) return;
    setIsOptimizing(true);
    setOptError(null);
    setBottomTab('optimize');
    setBottomOpen(true);
    try {
      const result = await optimizeCircuit(getGates(), numQubits);
      setOptResult(result);
    } catch (err: any) {
      setOptError(err?.response?.data?.detail || err.message || 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [getGates, numQubits, gateCount]);

  // ── Export ────────────────────────────────────────────────────────────────
  const generateExport = useCallback((fmt: ExportFmt) => {
    const gates = getGates();
    switch (fmt) {
      case 'qasm':      return generateOpenQASM(gates, numQubits);
      case 'qiskit':    return generateQiskitCode(gates, numQubits);
      case 'pennylane': return generatePennyLaneCode(gates, numQubits);
      case 'cirq':      return generateCirqCode(gates, numQubits);
      case 'qsharp':    return generateQSharpCode(gates, numQubits);
      case 'latex':     return '% Loading LaTeX...';
      default:          return '';
    }
  }, [getGates, numQubits]);

  const handleExportTab = useCallback(async (fmt: ExportFmt) => {
    setExportFmt(fmt);
    setBottomTab('export');
    setBottomOpen(true);
    if (fmt === 'latex') {
      try {
        const res = await exportToLatex(getGates(), numQubits);
        setExportCode(res.latex || '');
      } catch { setExportCode('% Error generating LaTeX'); }
    } else {
      setExportCode(generateExport(fmt));
    }
  }, [generateExport, getGates, numQubits]);

  useEffect(() => {
    if (bottomTab === 'export') setExportCode(generateExport(exportFmt));
  }, [bottomTab, exportFmt, generateExport]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [exportCode]);

  // ── Save / Load ───────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const data = JSON.stringify({ circuit, gateParams, numQubits, numSteps }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'moriarty-circuit.json'; a.click();
    URL.revokeObjectURL(url);
  }, [circuit, gateParams, numQubits, numSteps]);

  const fileRef = useRef<HTMLInputElement>(null);
  const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setCircuit(data.circuit || {}, data.gateParams || {}, 'Loaded circuit');
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setCircuit]);

  // ── Chat circuit load ─────────────────────────────────────────────────────
  const handleChatLoad = useCallback((
    grid: Record<string, string>,
    params: Record<string, number[]>,
    nq: number,
    desc?: string,
  ) => {
    setCircuit(grid, params, desc);
  }, [setCircuit]);

  // ── Circuit context for chat ──────────────────────────────────────────────
  const circuitContext = {
    gates: getGates().map((g, idx) => ({
      name: g.name, qubits: g.qubits, step: idx,
      params: g.params ? Object.fromEntries(g.params.map((v, i) => [`p${i}`, v])) : undefined,
    })),
    num_qubits: numQubits,
    error: execError,
    result: execResult ? {
      counts: execResult.counts,
      statevector: execResult.statevector,
    } : null,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="moriarty-app">

        {/* ══════════════════════════════════════════════════════════════
            TOPBAR
            ══════════════════════════════════════════════════════════════ */}
        <header className="m-topbar">
          {/* Logo */}
          <div className="m-logo">
            <div className="m-logo-mark">M</div>
            <div className="m-logo-text">
              <span className="m-logo-name">Moriarty</span>
              <span className="m-logo-sub">Quantum Debugger</span>
            </div>
          </div>

          <div className="m-sep" />

          {/* Circuit actions */}
          <div className="m-topbar-actions">
            <button
              className="m-btn m-btn-ghost m-btn-icon"
              data-tip="Undo"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 size={14} />
            </button>
            <button
              className="m-btn m-btn-ghost m-btn-icon"
              data-tip="Redo"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 size={14} />
            </button>

            <div className="m-sep" />

            <button
              className="m-btn m-btn-ghost m-btn-icon"
              data-tip="Add qubit"
              onClick={() => addGate(`q${numQubits}-s0`, 'H')}
            >
              <Plus size={14} />
            </button>

            <div className="m-sep" />

            <button
              className="m-btn m-btn-ghost"
              data-tip="Load algorithms"
              onClick={() => setIsAlgoOpen(true)}
            >
              <BookOpen size={13} />
              <span>Algorithms</span>
            </button>

            <button
              className="m-btn m-btn-ghost"
              data-tip="Make custom gate"
              onClick={() => setIsMakeGateOpen(true)}
            >
              <Wand2 size={13} />
              <span>Make Gate</span>
            </button>

            <button
              className="m-btn m-btn-ghost"
              data-tip="Export circuit"
              onClick={() => { setBottomTab('export'); setBottomOpen(true); }}
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            <div className="m-sep" />

            {/* Export quick buttons */}
            {(['QASM', 'Qiskit', 'PL', 'Cirq', 'Q#'] as const).map((label, i) => {
              const fmts: ExportFmt[] = ['qasm', 'qiskit', 'pennylane', 'cirq', 'qsharp'];
              return (
                <button
                  key={label}
                  className="m-btn m-btn-ghost m-btn-sm"
                  onClick={() => handleExportTab(fmts[i])}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="m-topbar-right">
            {/* Gate count badge */}
            <span className="m-badge m-badge-amber" style={{ marginRight: 4 }}>
              {gateCount} gates
            </span>

            <button
              className="m-btn m-btn-ghost m-btn-icon"
              data-tip="Save circuit"
              onClick={handleSave}
            >
              <Save size={14} />
            </button>

            <label className="m-btn m-btn-ghost m-btn-icon" data-tip="Load circuit" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <input ref={fileRef} type="file" accept=".json" style={{ display: 'none', position: 'absolute', width: 0, height: 0, opacity: 0 }} onChange={handleLoad} />
            </label>

            <div className="m-sep" />

            {aiEnabled && (
              <button
                className={`m-btn m-btn-icon ${chatOpen ? 'm-btn-violet' : 'm-btn-ghost'}`}
                data-tip="AI Assistant"
                onClick={() => setChatOpen(v => !v)}
              >
                <Bot size={14} />
              </button>
            )}

            <button
              className="m-btn m-btn-ghost m-btn-icon"
              data-tip={panelCollapsed ? 'Show panel' : 'Hide panel'}
              onClick={() => setPanelCollapsed(v => !v)}
            >
              {panelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            BODY
            ══════════════════════════════════════════════════════════════ */}
        <div className="m-body">

          {/* ── Sidebar ── */}
          <aside className={`m-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
            {/* Sidebar header */}
            <div
              className="m-row"
              style={{
                padding: '10px 10px 6px',
                borderBottom: '1px solid var(--border-1)',
                flexShrink: 0,
              }}
            >
              {!sidebarCollapsed && (
                <span className="m-label" style={{ flex: 1 }}>Gates</span>
              )}
              <button
                className="m-btn m-btn-ghost m-btn-icon"
                style={{ marginLeft: 'auto' }}
                onClick={() => setSidebarCollapsed(v => !v)}
                data-tip={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </div>

            {/* Gate groups */}
            <div className="m-fill m-scroll" style={{ padding: sidebarCollapsed ? '8px 6px' : '8px' }}>
              {GATE_GROUPS.map(group => (
                <div key={group.label} style={{ marginBottom: 12 }}>
                  {!sidebarCollapsed && (
                    <div className="m-label" style={{ padding: '4px 4px 6px' }}>
                      {group.label}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: sidebarCollapsed ? '1fr' : 'repeat(3, 1fr)',
                      gap: 4,
                    }}
                  >
                    {group.gates.map(name => (
                      <div
                        key={name}
                        data-tip={GATE_DESCRIPTIONS[name]}
                        style={{ display: 'flex', justifyContent: 'center' }}
                      >
                        <Gate
                          id={`palette-${name}`}
                          name={name}
                          isSelected={selectedGate === name}
                          onClick={() => setSelectedGate(prev => prev === name ? null : name)}
                          className={`m-gate${selectedGate === name ? ' selected' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {!sidebarCollapsed && (
                <button
                  className="m-btn m-btn-outline"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => setIsAllGatesOpen(true)}
                >
                  <Layers size={12} />
                  All Gates
                </button>
              )}

              {/* Custom Gates Section */}
              {!sidebarCollapsed && Object.keys(customGates).length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <div className="m-label" style={{ padding: '4px 4px 6px' }}>
                    Custom
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 4,
                    }}
                  >
                    {Object.keys(customGates).map(name => (
                      <div
                        key={name}
                        data-tip={`Custom ${name} gate`}
                        style={{ display: 'flex', justifyContent: 'center' }}
                      >
                        <Gate
                          id={`palette-${name}`}
                          name={name}
                          isSelected={selectedGate === name}
                          onClick={() => setSelectedGate(prev => prev === name ? null : name)}
                          className={`m-gate${selectedGate === name ? ' selected' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Make Gate Button */}
              {!sidebarCollapsed && (
                <button
                  className="m-btn m-btn-outline"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => setIsMakeGateOpen(true)}
                >
                  <Wand2 size={12} />
                  Make Gate
                </button>
              )}
            </div>

            {/* Selected gate info */}
            {!sidebarCollapsed && selectedGate && (
              <div
                style={{
                  padding: '10px 12px',
                  borderTop: '1px solid var(--border-1)',
                  flexShrink: 0,
                  background: 'var(--bg-3)',
                }}
              >
                <div className="m-row" style={{ marginBottom: 4 }}>
                  <span className="m-badge m-badge-amber">{selectedGate}</span>
                  <button
                    className="m-btn m-btn-ghost m-btn-icon"
                    style={{ marginLeft: 'auto', width: 20, height: 20 }}
                    onClick={() => setSelectedGate(null)}
                  >
                    <X size={11} />
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {GATE_DESCRIPTIONS[selectedGate]}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                  Click a cell or drag to place
                </p>
              </div>
            )}

            {/* Qubit controls */}
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: '8px 10px',
                  borderTop: '1px solid var(--border-1)',
                  flexShrink: 0,
                }}
              >
                <div className="m-label" style={{ marginBottom: 6 }}>Qubits</div>
                <div className="m-row">
                  <button
                    className="m-btn m-btn-outline m-btn-icon"
                    onClick={() => {
                      if (numQubits > 1) {
                        const newGrid = { ...circuit };
                        Object.keys(newGrid).forEach(k => {
                          if (k.startsWith(`q${numQubits - 1}-`)) delete newGrid[k];
                        });
                        setCircuit(newGrid, gateParams, 'Remove qubit');
                      }
                    }}
                    disabled={numQubits <= 1}
                  >
                    <Minus size={12} />
                  </button>
                  <span
                    className="mono"
                    style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}
                  >
                    {numQubits}
                  </span>
                  <button
                    className="m-btn m-btn-outline m-btn-icon"
                    onClick={() => {
                      const newGrid = { ...circuit };
                      setCircuit(newGrid, gateParams, 'Add qubit');
                    }}
                    disabled={numQubits >= 10}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* ── Canvas ── */}
          <main className="m-canvas">
            {/* Canvas toolbar — accordion tabs */}
            <div className="m-canvas-toolbar">
              {(
                [
                  { id: 'results'  as BottomTab, icon: <BarChart2 size={12} />, label: 'Results' },
                  { id: 'optimize' as BottomTab, icon: <Zap size={12} />,       label: 'Optimize' },
                  { id: 'export'   as BottomTab, icon: <Download size={12} />,  label: 'Export' },
                  { id: 'log'      as BottomTab, icon: <Terminal size={12} />,  label: 'Log' },
                ]
              ).map(tab => (
                <button
                  key={tab.id}
                  className={`m-btn m-btn-ghost m-btn-sm${bottomTab === tab.id && bottomOpen ? ' active' : ''}`}
                  onClick={() => {
                    if (bottomTab === tab.id) {
                      setBottomOpen(v => !v);
                    } else {
                      setBottomTab(tab.id);
                      setBottomOpen(true);
                      if (tab.id === 'optimize' && gateCount > 0) handleOptimize();
                    }
                  }}
                >
                  {tab.id === 'optimize' && isOptimizing
                    ? <Loader2 size={12} className="m-spin" />
                    : tab.icon}
                  {tab.label}
                  {tab.id === 'log' && gateLog.length > 0 && (
                    <span className="m-badge m-badge-amber" style={{ padding: '1px 5px', fontSize: 9 }}>
                      {gateLog.length}
                    </span>
                  )}
                  {bottomTab === tab.id
                    ? <ChevronDown size={10} style={{ marginLeft: 2, transform: bottomOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                    : null}
                </button>
              ))}

              <div style={{ flex: 1 }} />

              <button
                className="m-btn m-btn-crimson m-btn-sm"
                onClick={clearCircuit}
                disabled={gateCount === 0}
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>

            {/* Accordion panel */}
            {bottomOpen && (
              <div className="m-bottom-panel m-fade-in">

                {/* Results */}
                {bottomTab === 'results' && (
                  <div className="m-fade-in" style={{ padding: 14 }}>
                    {execResult && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <div className="m-card">
                          <div className="m-stat-val">{gateCount}</div>
                          <div className="m-stat-lbl">Gates</div>
                        </div>
                        <div className="m-card">
                          <div className="m-stat-val">{numQubits}</div>
                          <div className="m-stat-lbl">Qubits</div>
                        </div>
                      </div>
                    )}
                    <ExecutionResults result={execResult} error={execError} isRunning={isRunning} />
                    {!execResult && !isRunning && !execError && (
                      <div className="m-empty">
                        <div className="m-empty-icon"><BarChart2 size={18} /></div>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          Add gates to see simulation results
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimize */}
                {bottomTab === 'optimize' && (
                  <div className="m-fade-in" style={{ padding: 14 }}>
                    {isOptimizing && (
                      <div className="m-empty">
                        <Loader2 size={22} className="m-spin" style={{ color: 'var(--amber)' }} />
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Optimizing circuit…</p>
                      </div>
                    )}
                    {optError && (
                      <div className="m-card" style={{ borderColor: 'var(--crimson-border)', background: 'var(--crimson-dim)' }}>
                        <div className="m-row" style={{ marginBottom: 6 }}>
                          <AlertCircle size={13} style={{ color: 'var(--crimson)' }} />
                          <span style={{ fontSize: 12, color: 'var(--crimson)' }}>Error</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{optError}</p>
                      </div>
                    )}
                    {!isOptimizing && !optError && !optResult && (
                      <div className="m-empty">
                        <div className="m-empty-icon"><Zap size={18} /></div>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          Click <strong style={{ color: 'var(--amber)' }}>Optimize</strong> to reduce gate count
                        </p>
                      </div>
                    )}
                    {optResult && !isOptimizing && (
                      <div className="m-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                          <div className="m-card">
                            <div className="m-stat-val">{optResult.original_depth}</div>
                            <div className="m-stat-lbl">Original Depth</div>
                          </div>
                          <div className="m-card">
                            <div className="m-stat-val" style={{ color: 'var(--emerald)' }}>{optResult.optimized_depth}</div>
                            <div className="m-stat-lbl">Optimized Depth</div>
                          </div>
                        </div>
                        {optResult.improvement_msg && (
                          <div className="m-card" style={{ marginBottom: 10 }}>
                            <div className="m-label" style={{ marginBottom: 8 }}>Summary</div>
                            <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{optResult.improvement_msg}</p>
                          </div>
                        )}
                        {optResult.optimized_qasm && (
                          <div>
                            <div className="m-label" style={{ marginBottom: 6 }}>Optimized QASM</div>
                            <pre className="m-code">{optResult.optimized_qasm}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Export */}
                {bottomTab === 'export' && (
                  <div className="m-fade-in" style={{ padding: 14 }}>
                    <div className="m-label" style={{ marginBottom: 8 }}>Format</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 14 }}>
                      {(
                        [
                          { id: 'qasm', label: 'QASM' },
                          { id: 'qiskit', label: 'Qiskit' },
                          { id: 'pennylane', label: 'PennyLane' },
                          { id: 'cirq', label: 'Cirq' },
                          { id: 'qsharp', label: 'Q#' },
                          { id: 'latex', label: 'LaTeX' },
                        ] as { id: ExportFmt; label: string }[]
                      ).map(f => (
                        <button
                          key={f.id}
                          className={`m-btn m-btn-sm ${exportFmt === f.id ? 'm-btn-amber' : 'm-btn-outline'}`}
                          onClick={() => handleExportTab(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="m-row" style={{ marginBottom: 6 }}>
                      <span className="m-label">{exportFmt.toUpperCase()}</span>
                      <button className="m-btn m-btn-ghost m-btn-sm" style={{ marginLeft: 'auto' }} onClick={handleCopy}>
                        {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                    </div>
                    <pre className="m-code" style={{ maxHeight: 220 }}>
                      {exportCode || generateExport(exportFmt)}
                    </pre>
                  </div>
                )}

                {/* Log */}
                {bottomTab === 'log' && (
                  <div className="m-fade-in" style={{ padding: 14 }}>
                    <div className="m-row" style={{ marginBottom: 10 }}>
                      <span className="m-label">Gate History</span>
                      <button className="m-btn m-btn-ghost m-btn-sm" style={{ marginLeft: 'auto' }} onClick={clearGateLog} disabled={gateLog.length === 0}>
                        <Trash2 size={11} /> Clear
                      </button>
                    </div>
                    {gateLog.length === 0 ? (
                      <div className="m-empty">
                        <div className="m-empty-icon"><Terminal size={16} /></div>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>No actions yet</p>
                      </div>
                    ) : (
                      <div className="m-col" style={{ gap: 2, maxHeight: 200, overflowY: 'auto' }}>
                        {gateLog.map(entry => (
                          <div
                            key={entry.id}
                            className={`m-log-line ${
                              entry.action === 'add' ? 'ok' :
                              entry.action === 'remove' ? 'err' :
                              entry.action === 'clear' ? 'warn' : 'info'
                            }`}
                          >
                            <span className="m-log-prompt">›</span>
                            <span style={{ flex: 1 }}>
                              {entry.action === 'add' && `+ ${entry.gate} → q${entry.qubit} s${entry.step}`}
                              {entry.action === 'remove' && `− ${entry.gate} from q${entry.qubit} s${entry.step}`}
                              {entry.action === 'clear' && 'Circuit cleared'}
                              {entry.action === 'load' && `Loaded: ${entry.gate}`}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>
                              {entry.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Circuit grid */}
            <div className="m-circuit-area">
              {gateCount === 0 && (
                <div
                  className="m-empty m-fade-in"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="m-empty-icon">
                    <GitBranch size={20} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                    Empty circuit
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 200 }}>
                    Drag gates from the sidebar or click to select then click a cell
                  </p>
                </div>
              )}

              <div className="m-circuit">
                {Array.from({ length: numQubits }, (_, qi) => (
                  <div key={qi} className="m-wire-row">
                    {/* Wire label */}
                    <div className="m-wire-label">
                      <span className="m-wire-label-text">q[{qi}]</span>
                    </div>

                    {/* Wire line */}
                    <div className="m-wire-line" />

                    {/* Cells */}
                    <div className="m-wire-cells">
                      {Array.from({ length: numSteps }, (_, si) => {
                        const cellId = `q${qi}-s${si}`;
                        return (
                          <CircuitCell
                            key={cellId}
                            id={cellId}
                            gate={circuit[cellId] || null}
                            params={gateParams[cellId]}
                            onRemove={() => removeGate(cellId)}
                            onUpdateParams={(p) => updateGateParams(cellId, p)}
                            onAdd={() => handleCellClick(cellId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* ── Right panel — Bloch Spheres only ── */}
          {!panelCollapsed && (
            <aside className="m-panel m-fade-in">
              {/* Header */}
              <div className="m-tabs">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', flex: 1 }}>
                  <Activity size={12} style={{ color: 'var(--amber)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bloch Spheres</span>
                  {isBlochLoading && <Loader2 size={11} className="m-spin" style={{ color: 'var(--amber)', marginLeft: 4 }} />}
                </div>
              </div>

              {/* Bloch content */}
              <div className="m-fill m-scroll" style={{ padding: 14 }}>
                {isBlochLoading && (
                  <div className="m-empty">
                    <Loader2 size={22} className="m-spin" style={{ color: 'var(--amber)' }} />
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Generating Bloch spheres…</p>
                  </div>
                )}
                {!isBlochLoading && blochImages.length === 0 && (
                  <div className="m-empty">
                    <div className="m-empty-icon"><Activity size={18} /></div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Add gates to see the Bloch Sphere</p>
                  </div>
                )}
                {blochImages.map((img, i) => (
                  <div key={i} className="m-card m-fade-in" style={{ marginBottom: 10 }}>
                    <div className="m-label" style={{ marginBottom: 8 }}>Qubit {i}</div>
                    <img
                      src={`data:image/png;base64,${img}`}
                      alt={`Bloch q${i}`}
                      style={{ width: '100%', borderRadius: 'var(--r-md)' }}
                    />
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ── Chat ── */}
      {aiEnabled && (
        <ChatAssistant
          isOpen={chatOpen}
          onToggle={() => setChatOpen(v => !v)}
          circuitContext={circuitContext}
          onLoadCircuit={handleChatLoad}
        />
      )}

      {/* ── Modals ── */}
      <AlgorithmModal
        isOpen={isAlgoOpen}
        onClose={() => setIsAlgoOpen(false)}
        circuit={getGates()}
        numQubits={numQubits}
      />

      <AllGatesModal
        isOpen={isAllGatesOpen}
        onClose={() => setIsAllGatesOpen(false)}
      />

      <MakeGateModal
        isOpen={isMakeGateOpen}
        onClose={() => setIsMakeGateOpen(false)}
        onCreateGate={(name, matrix, qubitsAmount) => {
          // Add the custom gate to the custom gates state
          // This makes it appear in the Custom section of the sidebar
          const uniqueName = customGates[name] ? `${name}_${Date.now()}` : name;
          setCustomGates(prev => ({ ...prev, [uniqueName]: matrix.flat() }));
          // Also add the gate description
          GATE_DESCRIPTIONS[uniqueName] = `Custom ${qubitsAmount}-qubit unitary gate`;
        }}
      />

      {/* ── Drag overlay ── */}
      <DragOverlay dropAnimation={null}>
        {activeGate && (
          <div
            className="m-gate selected"
            style={{ pointerEvents: 'none', opacity: 0.85 }}
          >
            {activeGate}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
