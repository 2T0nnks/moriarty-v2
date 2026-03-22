'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Download, CheckCircle, Loader2, AlertCircle, Cpu, X, Trash2 } from 'lucide-react';
import { API_URL } from '../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  apiBase?: string;
}

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG: Record<string, { bg: string; color: string; label: string }> = {
  'lightweight':      { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', label: 'Lightweight' },
  'recommended':      { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Recommended' },
  'best-reasoning':   { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', label: 'Best Reasoning' },
  'code-specialist':  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Code Specialist' },
};

// ─── Component ────────────────────────────────────────────────────────────────

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
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── Fetch models ─────────────────────────────────────────────────────────

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/chat/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch {
      // Ollama offline — silently ignore
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Pull model ────────────────────────────────────────────────────────────

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
      if (!res.ok || !res.body) { setPullError(`Server error ${res.status}`); setPulling(null); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const chunk: PullProgress = JSON.parse(line.slice(6));
            setPullProgress(chunk);
            if (chunk.error) { setPullError(chunk.error); setPulling(null); return; }
            if (chunk.done) { setPulling(null); setPullProgress(null); await fetchModels(); onModelChange(modelId); return; }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      setPullError(err instanceof Error ? err.message : 'Download failed');
      setPulling(null);
    }
  }, [base, fetchModels, onModelChange]);

  // ── Delete model ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setDeleting(modelId);
    try {
      const res = await fetch(`${base}/chat/models/${encodeURIComponent(modelId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setDeleteError(body.detail || `Error ${res.status}`);
      } else {
        if (modelId === selectedModel) onModelChange('qwen2.5:1.5b');
        await fetchModels();
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, [base, fetchModels, selectedModel, onModelChange]);

  const currentModel = models.find(m => m.id === selectedModel);
  const displayName = currentModel?.name ?? selectedModel;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={wrapRef} style={{ position: 'relative', zIndex: 200 }}>

      {/* ── Trigger ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Select AI model"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 5,
          color: '#555',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        <Cpu size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
        <ChevronDown
          size={11}
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 44,
            bottom: 0,
            width: 300,
            background: '#111',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 300,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>Select Model</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              <X size={14} />
            </button>
          </div>

          {/* Pull progress */}
          {pulling && pullProgress && (
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(245,158,11,0.05)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pullProgress.status}
                </span>
                <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                  {pullProgress.percent > 0 ? `${pullProgress.percent.toFixed(1)}%` : '…'}
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pullProgress.percent}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #60a5fa)',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              {pullProgress.total > 0 && (
                <div style={{ fontSize: 9, color: '#444', marginTop: 4, fontFamily: 'monospace' }}>
                  {(pullProgress.completed / 1e9).toFixed(2)} / {(pullProgress.total / 1e9).toFixed(2)} GB
                </div>
              )}
            </div>
          )}

          {/* Pull error */}
          {pullError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={12} style={{ color: '#f87171', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#f87171', flex: 1 }}>{pullError}</span>
              <button
                onClick={() => setPullError(null)}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={12} style={{ color: '#f87171', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#f87171', flex: 1 }}>Remove failed: {deleteError}</span>
              <button
                onClick={() => setDeleteError(null)}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Model list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', color: '#444' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Loading models…</span>
              </div>
            ) : models.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#555', margin: 0 }}>Could not reach Ollama.</p>
                <p style={{ fontSize: 11, color: '#3a3a3a', margin: '4px 0 0' }}>Make sure the container is running.</p>
              </div>
            ) : (
              models.map((model, idx) => {
                const isSelected = model.id === selectedModel;
                const isPulling = pulling === model.id;
                const isDeleting = deleting === model.id;
                const tag = TAG[model.tag] ?? TAG['recommended'];

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
                      padding: '12px 16px',
                      cursor: model.installed && !isPulling ? 'pointer' : 'default',
                      background: isSelected ? 'rgba(245,158,11,0.07)' : 'transparent',
                      borderBottom: idx < models.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && model.installed && !isPulling)
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Left */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name + badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#f59e0b' : '#ddd' }}>
                            {model.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 20,
                              background: tag.bg,
                              color: tag.color,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                            }}
                          >
                            {tag.label}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 20,
                                background: 'rgba(245,158,11,0.15)',
                                color: '#f59e0b',
                                textTransform: 'uppercase',
                                letterSpacing: 0.4,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 11, color: '#555', margin: '0 0 5px', lineHeight: 1.4 }}>
                          {model.description}
                        </p>

                        {/* Meta */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ fontSize: 10, color: '#3a3a3a' }}>
                            <span style={{ color: '#4a4a4a' }}>{model.creator}</span>
                          </span>
                          <span style={{ fontSize: 10, color: '#3a3a3a' }}>~{model.size_gb} GB</span>
                          <span style={{ fontSize: 10, color: '#3a3a3a' }}>{model.ram_gb} GB RAM</span>
                        </div>
                      </div>

                      {/* Right: action */}
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isDeleting ? (
                          <Loader2 size={14} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} />
                        ) : model.installed ? (
                          <>
                            <CheckCircle size={14} style={{ color: '#22c55e' }} />
                            <button
                              onClick={e => handleDelete(model.id, e)}
                              title={`Remove ${model.name}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '3px 6px',
                                borderRadius: 4,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                color: '#f87171',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        ) : isPulling ? (
                          <Loader2 size={14} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <button
                            onClick={e => handlePull(model.id, e)}
                            title={`Download ${model.name} (~${model.size_gb} GB)`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 10px',
                              borderRadius: 5,
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.25)',
                              color: '#f59e0b',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
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

          {/* Footer */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: 10,
              color: '#333',
              flexShrink: 0,
            }}
          >
            Models run locally via Ollama. Click <strong style={{ color: '#444' }}>Install</strong> to download.
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ModelSelector;
