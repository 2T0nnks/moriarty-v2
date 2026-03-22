'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Trash2, AlertCircle, Cpu, Zap, Search } from 'lucide-react';
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
  circuit?: CircuitGrid | null;  // circuit payload attached to this message
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
// Helper: format markdown-like text (bold, code blocks, inline code, circuit blocks)
// ---------------------------------------------------------------------------

function FormattedMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  // Hide raw ```circuit blocks from the rendered text (they are shown as a button instead)
  const cleanContent = content.replace(/```circuit[\s\S]*?```/g, '');

  const parts = cleanContent.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <div className="text-base leading-relaxed space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre
              key={i}
              className="p-2.5 rounded text-sm overflow-x-auto font-mono my-2"
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
              className="px-1.5 py-0.5 rounded font-mono text-sm"
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
                      ? <strong key={k}>{bp.slice(2, -2)}</strong>
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
          className="inline-block w-1.5 h-3 ml-0.5 align-middle animate-pulse"
          style={{ background: 'var(--amber)', borderRadius: '1px' }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested prompts
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  "Create a Bell state circuit",
  "Build a 3-qubit GHZ state",
  "Analyse the current circuit",
  "What is quantum entanglement?",
  "Create a Grover's search circuit",
  "Show me a quantum teleportation circuit",
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatAssistant({ circuitContext, onLoadCircuit, isOpen: isOpenProp, onToggle }: ChatAssistantProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  // Support both controlled (isOpenProp + onToggle) and uncontrolled modes
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
      content: "Hello! I'm your Quantum Computing Assistant.\n\nI can help you:\n- **Create circuits** — just ask me to build a Bell state, GHZ, Grover, etc.\n- **Analyse your circuit** — ask me to explain, debug, or check for errors\n- **Explain concepts** — gates, algorithms, results\n- **Generate code** — Qiskit, PennyLane, Cirq, Q#\n\nTry: *\"Create a Bell state circuit\"* or *\"Analyse the current circuit\"*",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Poll status every 10s while offline so the dot turns green automatically
  // when the Ollama container finishes starting
  useEffect(() => {
    if (!isOpen) return;

    const check = () => {
      setIsCheckingStatus(true);
      checkChatStatus()
        .then(s => setOllamaStatus(s))
        .catch(() => setOllamaStatus({ available: false, models: [] }))
        .finally(() => setIsCheckingStatus(false));
    };

    // First check immediately
    if (ollamaStatus === null) check();

    // Keep polling while offline
    const interval = setInterval(() => {
      if (!ollamaStatus?.available) check();
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, ollamaStatus]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Load circuit from a message into the debugger
  // -------------------------------------------------------------------------
  const handleLoadCircuit = useCallback((msgId: string, circuit: CircuitGrid) => {
    if (!onLoadCircuit) return;
    setLoadingCircuitId(msgId);
    try {
      onLoadCircuit(circuit.grid, circuit.params || {}, circuit.num_qubits, circuit.description);
      // Brief visual feedback then clear
      setTimeout(() => setLoadingCircuitId(null), 1500);
    } catch {
      setLoadingCircuitId(null);
    }
  }, [onLoadCircuit]);

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

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
        // If the backend fell back to a different model, prepend a notice
        const fallbackNotice = (requestedModel && requestedModel !== model)
          ? `> **Note:** Model \`${requestedModel}\` is not installed. Using \`${model}\` instead. Install it via the model selector.\n\n`
          : '';
        setMessages(prev =>
          prev.map(m => m.id === streamMsgId
            ? { ...m, content: fallbackNotice + fullResponse, streaming: false, circuit: circuit || null }
            : m
          )
        );
        setOllamaStatus({ available: true, models: [model] });
        // Update selectedModel to reflect actual model used
        if (requestedModel && requestedModel !== model) {
          setSelectedModel(model);
        }
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
                  ? `**AI Assistant not available**\n\nThe Ollama service is not responding.\n\n**If you are using Docker:**\nThe Ollama container may still be starting. Wait 30–60 seconds and try again — the status dot will turn green automatically when it is ready.\n\nYou can also check the container logs:\n\`\`\`bash\ndocker-compose logs ollama\n\`\`\`\n\n**If you are running natively:**\n\`\`\`bash\nollama serve\n\`\`\`\n\n**Error:** ${error}`
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
      content: "Chat cleared. Ask me to create a circuit or analyse the current one!",
      timestamp: new Date(),
    }]);
  };

  // Quick-action: analyse current circuit
  const analyseCircuit = () => {
    const hasGates = circuitContext && circuitContext.gates && circuitContext.gates.length > 0;
    if (hasGates) {
      sendMessage("Please analyse the current circuit: describe what it does, identify any errors or issues, and suggest improvements.");
    } else {
      sendMessage("The circuit is empty. Can you suggest a simple circuit to start with?");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Toggle button — only shown in uncontrolled mode (no isOpenProp) */}
      {isOpenProp === undefined && <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded font-semibold transition-all text-xs text-white relative"
        style={{ background: isOpen ? 'var(--amber)' : 'color-mix(in srgb, var(--amber) 80%, transparent)' }}
        title="AI Quantum Assistant"
      >
        <MessageSquare size={16} />
        <span className="hidden sm:inline">AI Chat</span>
        <span
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black"
          style={{
            background: isCheckingStatus ? 'var(--text-3)'
              : ollamaStatus?.available ? '#22c55e'
              : ollamaStatus === null ? 'var(--text-3)'
              : '#ef4444',
          }}
          title={ollamaStatus?.available ? 'AI Online' : 'AI Offline'}
        />
      </button>}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2
xl"
          style={{ width: '380px', background: 'var(--bg-2)', borderLeft: '1px solid var(--border-1)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-1)', background: 'var(--bg-3)' }}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} style={{ color: 'var(--amber)' }} />
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  Quantum AI Assistant
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {isCheckingStatus ? 'Checking status…'
                    : ollamaStatus?.available ? `Online · ${ollamaStatus.models[0] || 'qwen2.5:1.5b'}`
                    : 'Offline — retrying every 10s…'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Model selector */}
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={(id) => {
                  setSelectedModel(id);
                  setOllamaStatus(prev => prev ? { ...prev, models: [id] } : prev);
                }}
              />
              {/* Analyse circuit button */}
              <button
                onClick={analyseCircuit}
                disabled={isLoading}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-3)' }}
                title="Analyse current circuit"
              >
                <Search size={18} />
              </button>
              <button
                onClick={clearChat}
                disabled={isLoading}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-3)' }}
                title="Clear chat"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-3)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Circuit context badge */}
          {circuitContext && circuitContext.gates && circuitContext.gates.length > 0 && (
            <div
              className="px-3 py-2 text-sm flex items-center gap-1.5 border-b"
              style={{
                background: circuitContext.error
                  ? 'color-mix(in srgb, #ef4444 15%, transparent)'
                  : 'color-mix(in srgb, var(--amber) 10%, transparent)',
                borderColor: 'var(--border-1)',
                color: circuitContext.error ? '#ef4444' : 'var(--amber)',
              }}
            >
              {circuitContext.error
                ? <AlertCircle size={15} />
                : <Cpu size={15} />}
              <span>
                {circuitContext.error
                  ? `Circuit error: ${circuitContext.error.slice(0, 60)}`
                  : `Circuit: ${circuitContext.num_qubits} qubits · ${circuitContext.gates.length} gates`}
              </span>
              {circuitContext.result?.counts && (
                <span className="ml-auto opacity-70">
                  {Object.keys(circuitContext.result.counts).length} states
                </span>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: msg.role === 'user'
                      ? 'color-mix(in srgb, var(--amber) 40%, var(--bg-3))'
                      : msg.error
                        ? '#ef4444'
                        : 'var(--bg-3)',
                    border: '1px solid var(--border-1)',
                  }}
                >
                  {msg.role === 'user'
                    ? <User size={16} className="text-white" />
                    : msg.error
                      ? <AlertCircle size={16} className="text-white" />
                      : <Bot size={16} style={{ color: 'var(--amber)' }} />}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  <div
                    className="rounded-lg px-3 py-2 max-w-full"
                    style={{
                      background: msg.role === 'user'
                        ? 'color-mix(in srgb, var(--amber) 22%, var(--bg-3))'
                        : msg.error
                          ? 'color-mix(in srgb, #ef4444 15%, var(--bg-3))'
                          : 'var(--bg-3)',
                      color: msg.role === 'user' ? 'var(--text-1)' : 'var(--text-1)',
                      border: msg.role === 'user'
                        ? '1px solid color-mix(in srgb, var(--amber) 40%, transparent)'
                        : '1px solid var(--border-1)',
                    }}
                  >
                    {msg.content === '' && msg.streaming ? (
                      <div className="flex items-center gap-1.5 text-base" style={{ color: 'var(--text-3)' }}>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <FormattedMessage content={msg.content} streaming={msg.streaming} />
                    )}
                  </div>

                  {/* Load Circuit button — shown when message has a circuit payload */}
                  {msg.circuit && onLoadCircuit && !msg.streaming && (
                    <button
                      onClick={() => handleLoadCircuit(msg.id, msg.circuit!)}
                      disabled={loadingCircuitId === msg.id}
                      className="mt-2 flex items-center gap-1.5 px-3 py-2.5 rounded text-base font-semibold w-full justify-center transition-all"
                      style={{
                        background: loadingCircuitId === msg.id
                          ? '#22c55e'
                          : 'color-mix(in srgb, var(--amber) 20%, transparent)',
                        color: loadingCircuitId === msg.id ? 'white' : 'var(--amber)',
                        border: '1px solid var(--amber)',
                      }}
                    >
                      {loadingCircuitId === msg.id ? (
                        <>
                          <span>✓</span>
                          <span>Circuit Loaded!</span>
                        </>
                      ) : (
                        <>
                          <Zap size={16} />
                          <span>Load into Debugger — {msg.circuit.description}</span>
                        </>
                      )}
                    </button>
                  )}

                  <p className="text-xs mt-1 px-1" style={{ color: 'var(--text-3)' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts (shown when no user messages yet) */}
          {messages.filter(m => m.role === 'user').length === 0 && (
            <div className="px-3 pb-2">
              <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>Quick actions:</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className="text-sm px-3 py-2 rounded border transition-colors"
                    style={{
                      background: 'var(--bg-3)',
                      borderColor: 'var(--border-1)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div
            className="p-3 border-t"
            style={{ borderColor: 'var(--border-1)', background: 'var(--bg-3)' }}
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !ollamaStatus?.available
                    ? isCheckingStatus ? 'Checking Ollama status…' : 'AI offline — waiting for Ollama to start…'
                    : 'Ask me to create a circuit or explain a concept...'
                }
                disabled={isLoading}
                rows={3}
                className="flex-1 resize-none rounded px-3 py-2.5 text-base outline-none transition-colors"
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                  color: 'var(--text-1)',
                  maxHeight: '80px',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded transition-all flex-shrink-0"
                style={{
                  background: isLoading || !input.trim()
                    ? 'var(--bg-2)'
                    : 'var(--amber)',
                  color: isLoading || !input.trim() ? 'var(--text-3)' : 'white',
                  border: '1px solid var(--border-1)',
                }}
              >
                {isLoading
                  ? <Loader2 size={20} className="animate-spin" />
                  : <Send size={20} />}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatAssistant;
