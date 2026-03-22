'use client';
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, Info } from 'lucide-react';
import AllGatesModal from './AllGatesModal';

// ─── Gate definitions ────────────────────────────────────────────────────────

const GATE_SECTIONS: {
  label: string;
  color: string;
  cssClass: string;
  gates: string[];
}[] = [
  {
    label: 'Basic',
    color: 'var(--gate-basic)',
    cssClass: 'gate-basic',
    gates: ['H', 'X', 'Y', 'Z', 'S', 'T'],
  },
  {
    label: 'Rotation',
    color: 'var(--gate-rotation)',
    cssClass: 'gate-rotation',
    gates: ['RX', 'RY', 'RZ'],
  },
  {
    label: 'Multi-Qubit',
    color: 'var(--gate-multi)',
    cssClass: 'gate-multi',
    gates: ['•', '⊕', 'SWAP'],
  },
  {
    label: 'Utility',
    color: 'var(--gate-utility)',
    cssClass: 'gate-utility',
    gates: ['M'],
  },
];

// ─── Draggable gate chip ──────────────────────────────────────────────────────

interface GateChipProps {
  name: string;
  cssClass: string;
  isSelected: boolean;
  onClick: () => void;
}

const GateChip: React.FC<GateChipProps> = ({ name, cssClass, isSelected, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${name}`,
    data: { name },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`gate-chip ${cssClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={name}
    >
      {name}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface GatePaletteProps {
  mobileOpen?: boolean;
  onGateSelect?: (gate: string | null) => void;
  selectedGate?: string | null;
}

export const GatePalette: React.FC<GatePaletteProps> = ({
  mobileOpen,
  onGateSelect,
  selectedGate: externalSelected,
}) => {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [showAllGates, setShowAllGates] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selected = externalSelected !== undefined ? externalSelected : internalSelected;

  const handleGateClick = (name: string) => {
    const next = selected === name ? null : name;
    setInternalSelected(next);
    onGateSelect?.(next);
  };

  const toggleSection = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <aside
        className={`sidebar${mobileOpen === false ? ' max-md:-translate-x-full' : ''}`}
        style={{
          // mobile: fixed overlay
          position: typeof mobileOpen !== 'undefined' ? undefined : 'relative',
        }}
      >
        {/* Header */}
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dot" />
            Gates
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => setShowAllGates(true)}
            title="All gates reference"
            style={{ padding: '3px 6px', fontSize: 10 }}
          >
            <Info size={12} />
          </button>
        </div>

        {/* Click-to-place hint */}
        {selected && (
          <div
            style={{
              margin: '8px 12px 0',
              padding: '6px 10px',
              borderRadius: 7,
              fontSize: 10,
              fontWeight: 600,
              background: 'var(--cyan-dim)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: 'var(--cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 8 }}>●</span>
            Click cell to place <strong>{selected}</strong>
          </div>
        )}

        {/* Gate sections */}
        <div className="panel-body" style={{ paddingTop: 8 }}>
          {GATE_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 12 }}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 0 6px',
                  color: section.color,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: section.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${section.color}`,
                    }}
                  />
                  {section.label}
                </span>
                <ChevronRight
                  size={12}
                  style={{
                    transform: collapsed[section.label] ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.15s ease',
                    color: 'var(--text-muted)',
                  }}
                />
              </button>

              {/* Gate chips grid */}
              {!collapsed[section.label] && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 40px)',
                    gap: 6,
                  }}
                >
                  {section.gates.map(gate => (
                    <GateChip
                      key={gate}
                      name={gate}
                      cssClass={section.cssClass}
                      isSelected={selected === gate}
                      onClick={() => handleGateClick(gate)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Usage hint */}
          <div
            style={{
              marginTop: 8,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 10,
              lineHeight: 1.6,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Controlled gates
            </div>
            <div>
              Place <code style={{ color: 'var(--cyan)', fontFamily: 'monospace' }}>•</code> on
              control wire(s) and target gate on same step.
            </div>
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
              • + ⊕ → CNOT &nbsp;|&nbsp; •• + ⊕ → Toffoli
            </div>
          </div>
        </div>
      </aside>

      {showAllGates && <AllGatesModal isOpen={showAllGates} onClose={() => setShowAllGates(false)} />}
    </>
  );
};
