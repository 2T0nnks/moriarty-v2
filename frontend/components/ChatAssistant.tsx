'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, Trash2, AlertCircle, Cpu, Zap, Search, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { streamChatMessage, checkChatStatus, CircuitGrid } from '../utils/api';
import { ModelSelector } from './ModelSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
  onLoadCircuit?: (grid: Record<string, string>, params: Record<string, number[]>, numQubits: number, description?: string) => void;
}

// ---------------------------------------------------------------------------
// Helper: format markdown-like text
// ---------------------------------------------------------------------------

function FormattedMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  const cleanContent = content.replace(/```circuit[\s\S]*?```/g, '');
  const parts = cleanContent.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <div className="text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre
              key={i}
              className="p-3 rounded-lg text-xs overflow-x-auto font-mono my-2"
              style={{ background: 'var(--bg-0)', color: 'var(--amber)', border: '1px solid var(--border-1)' }}
            >
              {code.trim()}
            </pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded font-mono text-xs"
              style={{ background: 'var(--bg-0)', color: 'var(--amber)' }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        const lines = part.split('\n');
        return (
          <span key={i}>
            {lines.map((line, j) => {
              const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <span key={j}>
                  {boldParts.map((bp, k) =>
                    bp.startsWith('**') && bp.endsWith('**')
                      ? <strong key={k} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{bp.slice(2, -2)}</strong>
                      : <span key={k}>{bp}</span>
                  )}
                  {j < lines.length - 1 && <br />}
                </span>
              );
            })}
          </span>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse rounded-sm"
          style={{ background: 'var(--amber)' }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested prompts
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  { label: 'Bell state', prompt: 'Create a Bell state circuit' },
  { label: 'GHZ state', prompt: 'Build a 3-qubit GHZ state' },
  { label: 'Analyse circuit', prompt: 'Analyse the current circuit' },
  { label: 'Entanglement', prompt: 'What is quantum entanglement?' },
  { label: "Grover's", prompt: "Create a Grover's search circuit" },
  { label: 'Teleportation', prompt: 'Show me a quantum teleportation circuit' },
];

// ---------------------------------------------------------------------------
// Typing dots animation
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: 'var(--amber)',
            opacity: 0.7,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatAssistant({ circuitContext, onLoadCircuit, isOpen: isOpenProp, onToggle }: ChatAssistantProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const setIsOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(isOpen) : v;
    if (onToggle && next !== isOpen) { onToggle(); }
    setIsOpenInternal(next);
  };

  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your **Quantum Computing Assistant**.\n\nI can **create circuits**, **analyse** your current setup, **explain concepts**, and **generate code** for Qiskit, PennyLane, Cirq, and Q#.\n\nTry: *\"Create a Bell state circuit\"* or *\"Analyse the current circuit\"*",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

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
    const interval = setInterval(() => {
      if (!ollamaStatus?.available) check();
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, ollamaStatus]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

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

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setShowSuggestions(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages
      .filter(m => m.role !== 'system' && m.id !== 'welcome')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const streamMsgId = `assistant-${Date.now()}`;
    streamingMsgIdRef.current = streamMsgId;

    setMessages(prev => [...prev, {
      id: streamMsgId,
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
          prev.map(m => m.id === streamMsgId ? { ...m, content: m.content + token } : m)
        );
      },
      (fullResponse, model, circuit, requestedModel) => {
        const fallbackNotice = (requestedModel && requestedModel !== model)
          ? `> **Note:** Model \`${requestedModel}\` is not installed. Using \`${model}\` instead.\n\n`
          : '';
        setMessages(prev =>
          prev.map(m => m.id === streamMsgId
            ? { ...m, content: fallbackNotice + fullResponse, streaming: false, circuit: circuit || null }
            : m
          )
        );
        setOllamaStatus({ available: true, models: [model] });
        if (requestedModel && requestedModel !== model) setSelectedModel(model);
        setIsLoading(false);
        streamingMsgIdRef.current = null;
      },
      (error) => {
        const isOffline =
          error.toLowerCase().includes('ollama') ||
          error.toLowerCase().includes('connect') ||
          error.toLowerCase().includes('econnrefused');
        setMessages(prev =>
          prev.map(m => m.id === streamMsgId
            ? {
                ...m,
                content: isOffline
                  ? `**AI Assistant unavailable**\n\nThe Ollama service is not responding. Wait 30–60 seconds for the container to start — the status indicator will turn green automatically.\n\n\`\`\`bash\ndocker-compose logs ollama\n\`\`\``
                  : `**Error:** ${error}`,
                streaming: false,
                error: true,
              }
            : m
          )
        );
        setOllamaStatus({ available: false, models: [] });
        setIsLoading(false);
        streamingMsgIdRef.current = null;
      },
      circuitContext,
      selectedModel,
    );
  }, [messages, isLoading, circuitContext, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared. How can I help you with quantum computing?",
      timestamp: new Date(),
    }]);
    setShowSuggestions(true);
  };

  const analyseCircuit = () => {
    const hasGates = circuitContext?.gates?.length ?? 0 > 0;
    sendMessage(hasGates
      ? "Please analyse the current circuit: describe what it does, identify any errors or issues, and suggest improvements."
      : "The circuit is empty. Can you suggest a simple circuit to start with?"
    );
  };

  const hasUserMessages = messages.some(m => m.role === 'user');

  // ---------------------------------------------------------------------------
  // Status indicator
  // ---------------------------------------------------------------------------

  const statusColor = isCheckingStatus
    ? 'var(--text-3)'
    : ollamaStatus?.available
      ? '#22c55e'
      : ollamaStatus === null
        ? 'var(--text-3)'
        : '#ef4444';

  const statusLabel = isCheckingStatus
    ? 'Checking…'
    : ollamaStatus?.available
      ? 'Online'
      : 'Offline';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Toggle button — only in uncontrolled mode */}
      {isOpenProp === undefined && (
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all text-xs text-white relative"
          style={{ background: isOpen ? 'var(--amber)' : 'color-mix(in srgb, var(--amber) 80%, transparent)' }}
          title="AI Quantum Assistant"
        >
          <Bot size={14} />
          <span className="hidden sm:inline">AI Chat</span>
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: statusColor, borderColor: 'var(--bg-1)' }}
          />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100%',
            width: '360px',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            background: 'var(--bg-1)',
            borderLeft: '1px solid var(--border-1)',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3"
            style={{
              background: 'var(--bg-2)',
              borderBottom: '1px solid var(--border-1)',
            }}
          >
            {/* Left: avatar + title + status */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'color-mix(in srgb, var(--amber) 20%, var(--bg-3))' }}
              >
                <Bot size={16} style={{ color: 'var(--amber)' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    Quantum AI
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                      color: statusColor,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                    {statusLabel}
                  </span>
                </div>
                <span className="text-xs truncate block" style={{ color: 'var(--text-3)' }}>
                  {selectedModel}
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={(id) => {
                  setSelectedModel(id);
                  setOllamaStatus(prev => prev ? { ...prev, models: [id] } : prev);
                }}
              />
              <button
                onClick={analyseCircuit}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--text-3)', background: 'var(--bg-3)' }}
                title="Analyse current circuit"
              >
                <Search size={14} />
              </button>
              <button
                onClick={clearChat}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--text-3)', background: 'var(--bg-3)' }}
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* ── Circuit context badge ──────────────────────────────────────── */}
          {circuitContext?.gates?.length ? (
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs"
              style={{
                background: circuitContext.error
                  ? 'color-mix(in srgb, #ef4444 12%, var(--bg-2))'
                  : 'color-mix(in srgb, var(--amber) 8%, var(--bg-2))',
                borderBottom: '1px solid var(--border-1)',
                color: circuitContext.error ? '#ef4444' : 'var(--amber)',
              }}
            >
              {circuitContext.error ? <AlertCircle size={12} /> : <Cpu size={12} />}
              <span className="truncate">
                {circuitContext.error
                  ? `Error: ${circuitContext.error.slice(0, 50)}`
                  : `${circuitContext.num_qubits} qubits · ${circuitContext.gates.length} gates`}
              </span>
              {circuitContext.result?.counts && (
                <span className="ml-auto opacity-60 flex-shrink-0">
                  {Object.keys(circuitContext.result.counts).length} states
                </span>
              )}
            </div>
          ) : null}

          {/* ── Messages ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '12px 12px 0' }}>
            <div className="space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: msg.role === 'user'
                        ? 'var(--amber)'
                        : msg.error
                          ? 'color-mix(in srgb, #ef4444 30%, var(--bg-3))'
                          : 'color-mix(in srgb, var(--amber) 15%, var(--bg-3))',
                    }}
                  >
                    {msg.role === 'user'
                      ? <User size={13} color="white" />
                      : msg.error
                        ? <AlertCircle size={13} color="#ef4444" />
                        : <Bot size={13} style={{ color: 'var(--amber)' }} />}
                  </div>

                  {/* Bubble */}
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className="rounded-xl px-3 py-2.5 inline-block max-w-full"
                      style={{
                        background: msg.role === 'user'
                          ? 'var(--amber)'
                          : msg.error
                            ? 'color-mix(in srgb, #ef4444 10%, var(--bg-2))'
                            : 'var(--bg-2)',
                        color: msg.role === 'user' ? '#000' : 'var(--text-1)',
                        border: msg.role === 'user'
                          ? 'none'
                          : msg.error
                            ? '1px solid color-mix(in srgb, #ef4444 30%, transparent)'
                            : '1px solid var(--border-1)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content === '' && msg.streaming ? (
                        <TypingDots />
                      ) : (
                        <FormattedMessage content={msg.content} streaming={msg.streaming} />
                      )}
                    </div>

                    {/* Load Circuit button */}
                    {msg.circuit && onLoadCircuit && !msg.streaming && (
                      <button
                        onClick={() => handleLoadCircuit(msg.id, msg.circuit!)}
                        disabled={loadingCircuitId === msg.id}
                        className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold w-full justify-center transition-all"
                        style={{
                          background: loadingCircuitId === msg.id
                            ? '#22c55e'
                            : 'color-mix(in srgb, var(--amber) 15%, var(--bg-2))',
                          color: loadingCircuitId === msg.id ? 'white' : 'var(--amber)',
                          border: `1px solid ${loadingCircuitId === msg.id ? '#22c55e' : 'var(--amber)'}`,
                        }}
                      >
                        {loadingCircuitId === msg.id ? (
                          <><span>✓</span><span>Loaded!</span></>
                        ) : (
                          <><Zap size={12} /><span className="truncate">Load: {msg.circuit.description}</span></>
                        )}
                      </button>
                    )}

                    <span className="text-xs mt-1 block px-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          </div>

          {/* ── Suggested prompts ─────────────────────────────────────────── */}
          {showSuggestions && !hasUserMessages && (
            <div className="flex-shrink-0 px-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                  Quick actions
                </span>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-xs"
                  style={{ color: 'var(--text-3)', opacity: 0.5 }}
                >
                  <ChevronDown size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTED_PROMPTS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className="text-xs px-2.5 py-2 rounded-lg text-left transition-all hover:opacity-80 truncate"
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border-1)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input area ────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 p-3"
            style={{
              background: 'var(--bg-2)',
              borderTop: '1px solid var(--border-1)',
            }}
          >
            {/* Offline warning */}
            {ollamaStatus !== null && !ollamaStatus.available && !isCheckingStatus && (
              <div
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-2"
                style={{
                  background: 'color-mix(in srgb, #ef4444 10%, var(--bg-3))',
                  border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)',
                  color: '#ef4444',
                }}
              >
                <WifiOff size={12} />
                <span>AI offline — retrying every 10s</span>
              </div>
            )}

            <div
              className="flex items-end gap-2 rounded-xl p-2"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--border-1)',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isCheckingStatus
                    ? 'Checking status…'
                    : !ollamaStatus?.available
                      ? 'Waiting for Ollama…'
                      : 'Ask me anything…'
                }
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm py-1 px-1"
                style={{
                  color: 'var(--text-1)',
                  maxHeight: '96px',
                  minHeight: '24px',
                  lineHeight: '1.5',
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                style={{
                  background: isLoading || !input.trim()
                    ? 'var(--bg-3)'
                    : 'var(--amber)',
                  color: isLoading || !input.trim() ? 'var(--text-3)' : '#000',
                }}
              >
                {isLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />}
              </button>
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatAssistant;
