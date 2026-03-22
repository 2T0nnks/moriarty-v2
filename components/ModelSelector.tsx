'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Download, CheckCircle, Loader2, AlertCircle, Cpu, X, Trash2 } from 'lucide-react';
import { API_URL } from '../utils/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  creator: string;
  size_gb: number;
  ram_gb: number;
  description: string;
  tag: 'lightweight' | 'recommended' | 'best-reasoning' | 'code-specialist';
  installed: boolean;
}

interface PullProgress {
  status: string;
  completed: number;
  total: number;
  percent: number;
  done: boolean;
  error?: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiBase?: string; // optional override; defaults to API_URL from api.ts
}

// ---------------------------------------------------------------------------
// Tag badge colours
// ---------------------------------------------------------------------------

const TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  lightweight:      { bg: 'color-mix(in srgb, #22c55e 15%, transparent)', text: '#22c55e', label: 'Lightweight' },
  recommended:      { bg: 'color-mix(in srgb, #3b82f6 15%, transparent)', text: '#3b82f6', label: 'Recommended' },
  'best-reasoning': { bg: 'color-mix(in srgb, #a855f7 15%, transparent)', text: '#a855f7', label: 'Best Reasoning' },
  'code-specialist':{ bg: 'color-mix(in srgb, #f59e0b 15%, transparent)', text: '#f59e0b', label: 'Code Specialist' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  apiBase,
}) => {
  const base = apiBase || API_URL;
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch model list ──────────────────────────────────────────────────────
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${base}/chat/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch {
      // Ollama may not be running — silently ignore
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Pull (download) a model ───────────────────────────────────────────────
  const handlePull = useCallback(async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPulling(modelId);
    setPullProgress({ status: 'Connecting…', completed: 0, total: 0, percent: 0, done: false });
    setPullError(null);

    try {
      const res = await fetch(`${base}/chat/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      });

      if (!res.ok || !res.body) {
        setPullError(`Server error ${res.status}`);
        setPulling(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const chunk: PullProgress = JSON.parse(line.slice(6));
            setPullProgress(chunk);

            if (chunk.error) {
              setPullError(chunk.error);
              setPulling(null);
              return;
            }

            if (chunk.done) {
              setPulling(null);
              setPullProgress(null);
              // Refresh model list to update installed status
              await fetchModels();
              // Auto-select the newly installed model
              onModelChange(modelId);
              return;
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      setPullError(err instanceof Error ? err.message : 'Download failed');
      setPulling(null);
    }
  }, [base, fetchModels, onModelChange]);

  // ── Delete (remove) a model ─────────────────────────────────────────────
  const handleDelete = useCallback(async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setDeleting(modelId);
    try {
      const res = await fetch(`${base}/chat/models/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setDeleteError(body.detail || `Error ${res.status}`);
      } else {
        // If the deleted model was selected, reset to default
        if (modelId === selectedModel) onModelChange('qwen2.5:1.5b');
        await fetchModels();
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, [base, fetchModels, selectedModel, onModelChange]);

  // ── Current model info ────────────────────────────────────────────────────
  const currentModel = models.find(m => m.id === selectedModel);
  const displayName = currentModel?.name ?? selectedModel;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={dropdownRef} className="relative" style={{ zIndex: 50 }}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors hover:opacity-80"
        style={{
          background: 'var(--bg-3)',
          color: 'var(--text-2)',
          border: '1px solid var(--border-1)',
        }}
        title="Select AI model"
      >
        <Cpu size={15} style={{ color: 'var(--amber)' }} />
        <span className="hidden sm:inline max-w-[140px] truncate">{displayName}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-80 rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-1)' }}
          >
            <div className="flex items-center gap-2">
              <Cpu size={14} style={{ color: 'var(--amber)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                AI Model
              </span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={14} style={{ color: 'var(--text-3)' }} />
            </button>
          </div>

          {/* Pull progress bar */}
          {pulling && pullProgress && (
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--bg-3)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono truncate max-w-[180px]" style={{ color: 'var(--amber)' }}>
                  {pullProgress.status}
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                  {pullProgress.percent > 0 ? `${pullProgress.percent.toFixed(1)}%` : '…'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pullProgress.percent}%`,
                    background: 'linear-gradient(90deg, var(--amber), var(--blue))',
                  }}
                />
              </div>
              {pullProgress.total > 0 && (
                <div className="text-[9px] mt-1" style={{ color: 'var(--text-3)' }}>
                  {(pullProgress.completed / 1e9).toFixed(2)} / {(pullProgress.total / 1e9).toFixed(2)} GB
                </div>
              )}
            </div>
          )}

          {/* Pull error */}
          {pullError && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--crimson) 10%, var(--bg-3))', borderBottom: '1px solid var(--border-1)' }}>
              <AlertCircle size={12} style={{ color: 'var(--crimson)', flexShrink: 0 }} />
              <span className="text-[10px]" style={{ color: 'var(--crimson)' }}>{pullError}</span>
              <button onClick={() => setPullError(null)} className="ml-auto">
                <X size={10} style={{ color: 'var(--crimson)' }} />
              </button>
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--crimson) 10%, var(--bg-3))', borderBottom: '1px solid var(--border-1)' }}>
              <AlertCircle size={12} style={{ color: 'var(--crimson)', flexShrink: 0 }} />
              <span className="text-[10px]" style={{ color: 'var(--crimson)' }}>Remove failed: {deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="ml-auto">
                <X size={10} style={{ color: 'var(--crimson)' }} />
              </button>
            </div>
          )}

          {/* Model list */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Loading models…</span>
              </div>
            ) : models.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                Could not reach Ollama. Make sure it is running.
              </div>
            ) : (
              models.map(model => {
                const isSelected = model.id === selectedModel;
                const isPulling = pulling === model.id;
                const isDeleting = deleting === model.id;
                const tag = TAG_STYLES[model.tag] ?? TAG_STYLES.recommended;

                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      if (model.installed && !isPulling) {
                        onModelChange(model.id);
                        setIsOpen(false);
                      }
                    }}
                    className="px-4 py-3 transition-colors"
                    style={{
                      cursor: model.installed && !isPulling ? 'pointer' : 'default',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--amber) 10%, var(--bg-2))'
                        : undefined,
                      borderBottom: '1px solid var(--border-2)',
                    }}
                    onMouseEnter={e => {
                      if (model.installed && !isPulling && !isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-4)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = '';
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: name + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: isSelected ? 'var(--amber)' : 'var(--text-1)' }}>
                            {model.name}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: tag.bg, color: tag.text }}
                          >
                            {tag.label}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--amber) 20%, transparent)', color: 'var(--amber)' }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                          {model.description}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                            by <strong>{model.creator}</strong>
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                            ~{model.size_gb} GB download
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                            {model.ram_gb} GB RAM
                          </span>
                        </div>
                      </div>

                      {/* Right: status / action */}
                      <div className="flex-none flex items-center gap-1.5">
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: '#ef4444' }} />
                        ) : model.installed ? (
                          <>
                            <CheckCircle size={14} style={{ color: 'var(--emerald)' }} />
                            <button
                              onClick={e => handleDelete(model.id, e)}
                              className="p-1 rounded transition-colors hover:opacity-80"
                              style={{
                                color: '#ef4444',
                                background: 'color-mix(in srgb, #ef4444 12%, var(--bg-3))',
                                border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)',
                              }}
                              title={`Remove ${model.name} from disk`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        ) : isPulling ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--amber)' }} />
                        ) : (
                          <button
                            onClick={e => handlePull(model.id, e)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors hover:opacity-80"
                            style={{
                              background: 'color-mix(in srgb, var(--amber) 15%, var(--bg-3))',
                              color: 'var(--amber)',
                              border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
                            }}
                            title={`Download ${model.name} (~${model.size_gb} GB)`}
                          >
                            <Download size={11} />
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div
            className="px-4 py-2 text-[9px] leading-relaxed"
            style={{ borderTop: '1px solid var(--border-1)', color: 'var(--text-3)', background: 'var(--bg-3)' }}
          >
            Models run locally via Ollama. Click <strong>Install</strong> to download. Larger models require more RAM but generate better circuits.
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
