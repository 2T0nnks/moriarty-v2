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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 5,
          background: 'transparent',
          border: 'none',
          color: '#555',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'monospace',
          transition: 'color 0.15s',
          whiteSpace: 'nowrap',
        }}
        title="Select AI model"
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
      >
        <Cpu size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
        <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-80 overflow-hidden"
          style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={13} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>AI Model</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2 }}
            >
              <X size={13} />
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
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', gap: 8, color: '#555' }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Loading models…</span>
              </div>
            ) : models.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 11, color: '#555' }}>
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
                    style={{
                      padding: '10px 14px',
                      cursor: model.installed && !isPulling ? 'pointer' : 'default',
                      background: isSelected ? 'rgba(245,158,11,0.08)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (model.installed && !isPulling && !isSelected)
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      {/* Left */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#f59e0b' : '#ddd' }}>
                            {model.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 10,
                              fontWeight: 600,
                              background: tag.bg,
                              color: tag.text,
                            }}
                          >
                            {tag.label}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, marginTop: 2, color: '#555', lineHeight: 1.4 }}>
                          {model.description}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          <span style={{ fontSize: 9, color: '#444' }}>by <strong style={{ color: '#555' }}>{model.creator}</strong></span>
                          <span style={{ fontSize: 9, color: '#444' }}>~{model.size_gb} GB</span>
                          <span style={{ fontSize: 9, color: '#444' }}>{model.ram_gb} GB RAM</span>
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {isDeleting ? (
                          <Loader2 size={13} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} />
                        ) : model.installed ? (
                          <>
                            <CheckCircle size={13} style={{ color: '#22c55e' }} />
                            <button
                              onClick={e => handleDelete(model.id, e)}
                              style={{
                                padding: '3px 6px',
                                borderRadius: 4,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title={`Remove ${model.name}`}
                            >
                              <Trash2 size={10} />
                            </button>
                          </>
                        ) : isPulling ? (
                          <Loader2 size={13} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <button
                            onClick={e => handlePull(model.id, e)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 8px',
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'rgba(245,158,11,0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245,158,11,0.25)',
                              cursor: 'pointer',
                            }}
                            title={`Download ${model.name} (~${model.size_gb} GB)`}
                          >
                            <Download size={10} />
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
            style={{
              padding: '8px 14px',
              fontSize: 9,
              color: '#3a3a3a',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              lineHeight: 1.5,
            }}
          >
            Models run locally via Ollama. Click <strong style={{ color: '#4a4a4a' }}>Install</strong> to download.
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
