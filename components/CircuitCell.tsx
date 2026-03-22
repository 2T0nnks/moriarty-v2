'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { Gate } from './Gate';

interface CircuitCellProps {
  id: string;
  gate?: string | null;
  params?: number[];
  onRemove?: () => void;
  onUpdateParams?: (params: number[]) => void;
  onAdd?: () => void;
}

const ROTATION_GATES = ['RX', 'RY', 'RZ', 'CRX', 'CRY', 'CRZ'];

export const CircuitCell: React.FC<CircuitCellProps> = ({
  id, gate, params, onRemove, onUpdateParams, onAdd,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('0');
  const [editUnit, setEditUnit] = useState<'rad' | 'pi'>('pi');
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById(`editor-portal-${id}`);
      if (
        isEditing &&
        cellRef.current && !cellRef.current.contains(e.target as Node) &&
        portal && !portal.contains(e.target as Node)
      ) setIsEditing(false);
    };
    if (isEditing) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isEditing, id]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gate) onRemove?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gate && ROTATION_GATES.includes(gate) && onUpdateParams && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX + rect.width / 2,
      });
      const currentRad = params?.[0] ?? Math.PI / 2;
      const piMult = currentRad / Math.PI;
      if (Math.abs(piMult - Math.round(piMult * 100) / 100) < 0.001) {
        setEditUnit('pi');
        setEditValue(piMult.toFixed(2).replace(/\.00$/, ''));
      } else {
        setEditUnit('rad');
        setEditValue(currentRad.toFixed(2));
      }
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && onUpdateParams) {
      onUpdateParams([editUnit === 'pi' ? num * Math.PI : num]);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') { e.stopPropagation(); setIsEditing(false); }
  };

  return (
    <>
      <div
        ref={(node) => { setNodeRef(node); (cellRef as any).current = node; }}
        className={`m-cell${isOver ? ' drop-over' : ''}`}
        onClick={!gate && onAdd ? onAdd : undefined}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        title={
          gate && ROTATION_GATES.includes(gate)
            ? 'Double-click to edit angle · Right-click to remove'
            : gate
            ? 'Right-click to remove'
            : onAdd
            ? 'Click to place · Drag a gate here'
            : undefined
        }
      >
        {gate ? (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Gate
              id={`placed-${id}`}
              name={gate}
            />
            {params && ROTATION_GATES.includes(gate) && !isEditing && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -13,
                  fontSize: 9,
                  fontFamily: 'var(--font-code)',
                  color: 'var(--amber)',
                  background: 'var(--bg-0)',
                  padding: '0 3px',
                  borderRadius: 3,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                {(params[0] / Math.PI).toFixed(2).replace('.00', '')}π
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isOver ? 'var(--amber)' : 'var(--border-1)',
              transition: 'background var(--t-fast)',
            }}
          />
        )}
      </div>

      {isEditing && typeof document !== 'undefined' && createPortal(
        <div
          id={`editor-portal-${id}`}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--bg-3)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--r-lg)',
            padding: 12,
            minWidth: 150,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-2)',
              borderRadius: 'var(--r-sm)',
              padding: 2,
              gap: 2,
            }}
          >
            {(['rad', 'pi'] as const).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setEditUnit(u)}
                style={{
                  flex: 1,
                  padding: '3px 0',
                  borderRadius: 'var(--r-xs)',
                  fontSize: 10,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all var(--t-fast)',
                  background: editUnit === u ? 'var(--amber)' : 'transparent',
                  color: editUnit === u ? '#0e1016' : 'var(--text-3)',
                }}
              >
                {u === 'pi' ? 'π' : 'rad'}
              </button>
            ))}
          </div>

          <input
            autoFocus
            type="number"
            step="0.1"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="m-input"
            style={{ textAlign: 'center', fontFamily: 'var(--font-code)' }}
            placeholder="Angle…"
          />

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="m-btn m-btn-outline m-btn-sm"
              style={{ flex: 1 }}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              className="m-btn m-btn-emerald m-btn-sm"
              style={{ flex: 1 }}
              onClick={handleSave}
            >
              Set
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
