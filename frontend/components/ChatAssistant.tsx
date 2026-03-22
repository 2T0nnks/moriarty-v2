'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, Bot, Trash2, AlertCircle, Cpu, Zap, Search,
  ChevronDown, WifiOff, RotateCcw, Atom,
} from 'lucide-react';
import { streamChatMessage, checkChatStatus, CircuitGrid } from '../utils/api';
import { ModelSelector } from './ModelSelector';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
  streaming?: boolean;
  circuit?: CircuitGrid | null;
}

interface ChatAssistantProps {
  isOpen?: boolean;
  onToggle?: () => void;
  circuitContext?: {
    gates: Array<{ name: string; qubits: number[]; step: number; params?: Record<string, number> }>;
    num_qubits: number;
    error?: string | null;
    result?: { counts?: Record<string, number>; statevector?: number[][] } | null;
    warnings?: string[];
  };
  onLoadCircuit?: (
    grid: Record<string, string>,
    params: Record<string, number[]>,
    numQubits: number,
    description?: string,
  ) => void;
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

function Markdown({ text, streaming }: { text: string; streaming?: boolean }) {
  // Strip circuit blocks — they render as a button
  const clean = text.replace(/```circuit[\s\S]*?```/g, '').trim();

  // Split on fenced code blocks and inline code
  const segments = clean.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)' }}>
      {segments.map((seg, i) => {
        // Fenced code block
        if (seg.startsWith('```') && seg.endsWith('```')) {
          const body = seg.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre
              key={i}
              style={{
                margin: '8px 0',
                padding: '10px 12px',
                borderRadius: 6,
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#d4b896',
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
            >
              {body.trim()}
            </pre>
          );
        }
        // Inline code
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return (
            <code
              key={i}
              style={{
                padding: '1px 5px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.07)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 12,
                color: '#d4b896',
              }}
            >
              {seg.slice(1, -1)}
            </code>
          );
        }
        // Normal text — handle bold and line breaks
        return (
          <span key={i}>
            {seg.split('\n').map((line, j, arr) => {
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <span key={j}>
                  {parts.map((p, k) =>
                    p.startsWith('**') && p.endsWith('**')
                      ? <strong key={k} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>
                      : <span key={k}>{p}</span>
                  )}
                  {j < arr.length - 1 && <br />}
                </span>
              );
            })}
          </span>
        );
      })}
      {streaming && (
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 14,
            marginLeft: 2,
            verticalAlign: 'middle',
            background: 'var(--amber)',
            borderRadius: 2,
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--amber)',
            opacity: 0.5,
            animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Quick prompts ───────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: 'Bell state', full: 'Create a Bell state circuit' },
  { label: 'GHZ state', full: 'Build a 3-qubit GHZ state' },
  { label: 'Analyse circuit', full: 'Analyse the current circuit' },
  { label: 'Entanglement', full: 'Explain quantum entanglement' },
  { label: "Grover's", full: "Create a Grover's search circuit" },
  { label: 'Teleportation', full: 'Show me a quantum teleportation circuit' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatAssistant({
  circuitContext,
  onLoadCircuit,
  isOpen: isOpenProp,
  onToggle,
}: ChatAssistantProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const setIsOpen = (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(isOpen) : v;
    if (onToggle && next !== isOpen) onToggle();
    setIsOpenInternal(next);
  };

  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingIdRef = useRef<string | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Status polling
  useEffect(() => {
    if (!isOpen) return;
    const check = () => {
      setIsCheckingStatus(true);
      checkChatStatus()
        .then(s => setOllamaStatus(s))
        .catch(() => setOllamaStatus({ available: false, models: [] }))
        .finally(() => setIsCheckingStatus(false));
    };
    if (ollamaStatus === null) check();
    const id = setInterval(() => { if (!ollamaStatus?.available) check(); }, 10000);
    return () => clearInterval(id);
  }, [isOpen, ollamaStatus]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  // Load circuit into debugger
  const handleLoadCircuit = useCallback((msgId: string, circuit: CircuitGrid) => {
    if (!onLoadCircuit) return;
    setLoadingCircuitId(msgId);
    try {
      onLoadCircuit(circuit.grid, circuit.params || {}, circuit.num_qubits, circuit.description);
      setTimeout(() => setLoadingCircuitId(null), 1500);
    } catch {
      setLoadingCircuitId(null);
    }
  }, [onLoadCircuit]);

  // Send message
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const history = messages
      .filter(m => m.role !== 'assistant' || !m.error)
      .map(m => ({ role: m.role, content: m.content }));

    const streamId = `a-${Date.now()}`;
    streamingIdRef.current = streamId;

    setMessages(prev => [...prev, {
      id: streamId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
      circuit: null,
    }]);

    await streamChatMessage(
      trimmed,
      history,
      (token) => {
        setMessages(prev =>
          prev.map(m => m.id === streamId ? { ...m, content: m.content + token } : m)
        );
      },
      (full, model, circuit, requestedModel) => {
        const note = (requestedModel && requestedModel !== model)
          ? `> **Note:** \`${requestedModel}\` not installed — using \`${model}\` instead.\n\n`
          : '';
        setMessages(prev =>
          prev.map(m => m.id === streamId
            ? { ...m, content: note + full, streaming: false, circuit: circuit || null }
            : m
          )
        );
        setOllamaStatus({ available: true, models: [model] });
        if (requestedModel && requestedModel !== model) setSelectedModel(model);
        setIsLoading(false);
        streamingIdRef.current = null;
      },
      (err) => {
        const offline =
          err.toLowerCase().includes('ollama') ||
          err.toLowerCase().includes('connect') ||
          err.toLowerCase().includes('econnrefused');
        setMessages(prev =>
          prev.map(m => m.id === streamId
            ? {
                ...m,
                content: offline
                  ? `**AI offline.** The Ollama container is not responding.\n\nWait 30–60 s and try again — the indicator turns green when ready.\n\n\`\`\`bash\ndocker-compose logs ollama\n\`\`\``
                  : `**Error:** ${err}`,
                streaming: false,
                error: true,
              }
            : m
          )
        );
        setOllamaStatus({ available: false, models: [] });
        setIsLoading(false);
        streamingIdRef.current = null;
      },
      circuitContext,
      selectedModel,
    );
  }, [messages, isLoading, circuitContext, selectedModel]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clearChat = () => setMessages([]);

  const analyseCircuit = () => {
    const has = (circuitContext?.gates?.length ?? 0) > 0;
    send(has
      ? 'Analyse the current circuit: describe what it does, identify errors, and suggest improvements.'
      : 'The circuit is empty. Suggest a simple circuit to start with.'
    );
  };

  // Derived state
  const online = ollamaStatus?.available ?? false;
  const checking = isCheckingStatus;
  const hasMessages = messages.length > 0;
  const hasUserMsg = messages.some(m => m.role === 'user');

  const dotColor = checking ? '#6b7280' : online ? '#22c55e' : '#ef4444';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toggle button (uncontrolled mode only) */}
      {isOpenProp === undefined && (
        <button
          onClick={() => setIsOpen(p => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 6,
            background: isOpen ? 'var(--amber)' : 'rgba(245,158,11,0.18)',
            color: isOpen ? '#000' : 'var(--amber)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            position: 'relative',
          }}
        >
          <Atom size={14} />
          <span>AI Chat</span>
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
              border: '2px solid var(--bg-1)',
            }}
          />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 360,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            background: '#141414',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '-12px 0 40px rgba(0,0,0,0.6)',
            fontFamily: 'inherit',
          }}
        >

          {/* ── Top bar ──────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              height: 44,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: '#1a1a1a',
              flexShrink: 0,
            }}
          >
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: dotColor,
                  flexShrink: 0,
                  boxShadow: online ? `0 0 6px ${dotColor}` : 'none',
                  transition: 'background 0.3s',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e5e5', letterSpacing: 0.2 }}>
                Quantum AI
              </span>
              <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
                {selectedModel}
              </span>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={(id) => {
                  setSelectedModel(id);
                  setOllamaStatus(prev => prev ? { ...prev, models: [id] } : prev);
                }}
              />
              <IconBtn title="Analyse circuit" onClick={analyseCircuit} disabled={isLoading}>
                <Search size={14} />
              </IconBtn>
              <IconBtn title="Clear chat" onClick={clearChat} disabled={isLoading}>
                <Trash2 size={14} />
              </IconBtn>
            </div>
          </div>

          {/* ── Circuit context strip ─────────────────────────────────── */}
          {(circuitContext?.gates?.length ?? 0) > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                fontSize: 11,
                color: circuitContext!.error ? '#f87171' : '#f59e0b',
                background: circuitContext!.error
                  ? 'rgba(239,68,68,0.07)'
                  : 'rgba(245,158,11,0.07)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}
            >
              {circuitContext!.error ? <AlertCircle size={11} /> : <Cpu size={11} />}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {circuitContext!.error
                  ? `Error: ${circuitContext!.error.slice(0, 60)}`
                  : `${circuitContext!.num_qubits} qubits · ${circuitContext!.gates.length} gates`}
              </span>
              {circuitContext!.result?.counts && (
                <span style={{ color: '#6b7280', flexShrink: 0 }}>
                  {Object.keys(circuitContext!.result.counts).length} states
                </span>
              )}
            </div>
          )}

          {/* ── Messages ─────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {/* Empty state */}
            {!hasMessages && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 24px',
                  gap: 12,
                  color: '#444',
                  textAlign: 'center',
                }}
              >
                <Bot size={32} style={{ color: '#333' }} />
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#555', margin: 0 }}>
                  Ask me to create circuits, explain concepts, or analyse your current setup.
                </p>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                onLoadCircuit={onLoadCircuit ? handleLoadCircuit : undefined}
                loadingCircuitId={loadingCircuitId}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Quick prompts ─────────────────────────────────────────── */}
          {!hasUserMsg && (
            <div
              style={{
                padding: '0 12px 10px',
                flexShrink: 0,
                borderTop: hasMessages ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              {hasMessages && (
                <p style={{ fontSize: 11, color: '#444', margin: '8px 0 6px' }}>Suggestions</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_PROMPTS.map(({ label, full }) => (
                  <button
                    key={label}
                    onClick={() => send(full)}
                    disabled={isLoading}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      color: '#888',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#d4b896';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(245,158,11,0.4)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#888';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input area ────────────────────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              padding: '10px 12px 12px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: '#1a1a1a',
            }}
          >
            {/* Offline banner */}
            {ollamaStatus !== null && !online && !checking && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                <WifiOff size={11} />
                <span style={{ flex: 1 }}>AI offline — retrying every 10 s</span>
                <button
                  onClick={() => setOllamaStatus(null)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                  title="Retry now"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            )}

            {/* Input box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0f0f0f',
                overflow: 'hidden',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  checking ? 'Checking status…'
                  : !online ? 'Waiting for Ollama…'
                  : 'Ask anything…'
                }
                disabled={isLoading}
                rows={1}
                style={{
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '10px 12px 4px',
                  fontSize: 13,
                  color: '#e5e5e5',
                  lineHeight: 1.5,
                  maxHeight: 120,
                  fontFamily: 'inherit',
                  caretColor: '#f59e0b',
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />

              {/* Bottom bar of input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px 6px',
                }}
              >
                <span style={{ fontSize: 10, color: '#3a3a3a' }}>
                  ↵ send · ⇧↵ newline
                </span>
                <button
                  onClick={() => send(input)}
                  disabled={isLoading || !input.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: isLoading || !input.trim()
                      ? 'rgba(255,255,255,0.05)'
                      : '#f59e0b',
                    border: 'none',
                    cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                    color: isLoading || !input.trim() ? '#444' : '#000',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {isLoading
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Message row ─────────────────────────────────────────────────────────────

function MessageRow({
  msg,
  onLoadCircuit,
  loadingCircuitId,
}: {
  msg: ChatMessage;
  onLoadCircuit?: (id: string, circuit: CircuitGrid) => void;
  loadingCircuitId: string | null;
}) {
  const isUser = msg.role === 'user';

  return (
    <div
      style={{
        padding: '6px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Role label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: isUser ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.25)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {isUser ? 'You' : 'Quantum AI'}
      </span>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '88%',
          padding: isUser ? '8px 12px' : '10px 14px',
          borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
          background: isUser
            ? 'rgba(245,158,11,0.14)'
            : msg.error
              ? 'rgba(239,68,68,0.08)'
              : 'rgba(255,255,255,0.04)',
          border: isUser
            ? '1px solid rgba(245,158,11,0.25)'
            : msg.error
              ? '1px solid rgba(239,68,68,0.2)'
              : '1px solid rgba(255,255,255,0.07)',
          wordBreak: 'break-word',
        }}
      >
        {msg.content === '' && msg.streaming
          ? <ThinkingDots />
          : <Markdown text={msg.content} streaming={msg.streaming} />}
      </div>

      {/* Load circuit button */}
      {msg.circuit && onLoadCircuit && !msg.streaming && (
        <button
          onClick={() => onLoadCircuit(msg.id, msg.circuit!)}
          disabled={loadingCircuitId === msg.id}
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: loadingCircuitId === msg.id ? 'default' : 'pointer',
            background: loadingCircuitId === msg.id
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(245,158,11,0.1)',
            color: loadingCircuitId === msg.id ? '#22c55e' : '#f59e0b',
            border: `1px solid ${loadingCircuitId === msg.id ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            maxWidth: '88%',
            width: '100%',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {loadingCircuitId === msg.id
            ? <><span>✓</span><span>Loaded into debugger</span></>
            : <><Zap size={12} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Load: {msg.circuit.description}</span></>}
        </button>
      )}

      {/* Timestamp */}
      <span
        style={{
          fontSize: 10,
          color: '#333',
          marginTop: 3,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ─── Icon button helper ───────────────────────────────────────────────────────

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        background: 'transparent',
        border: 'none',
        color: '#555',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.color = '#aaa';
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#555';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export default ChatAssistant;
