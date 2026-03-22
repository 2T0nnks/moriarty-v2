'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface GateProps {
  id: string;
  name: string;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const GATE_DESCRIPTIONS: Record<string, string> = {
  H: 'Hadamard: Creates equal superposition',
  X: 'Pauli-X: Bit flip (NOT gate)',
  Y: 'Pauli-Y: Bit + phase flip',
  Z: 'Pauli-Z: Phase flip',
  S: 'S Gate: √Z (π/2 phase)',
  T: 'T Gate: ⁴√Z (π/4 phase)',
  RX: 'RX: X-axis rotation',
  RY: 'RY: Y-axis rotation',
  RZ: 'RZ: Z-axis rotation',
  '•': 'Control: Pair with a target gate on another wire',
  '⊕': 'Target: Pair with • to create CNOT / Toffoli',
  SWAP: 'SWAP: Place on two wires',
  M: 'Measurement: Collapses state to classical bit',
};

export const Gate: React.FC<GateProps> = ({ id, name, className, onClick, isSelected }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id,
    data: { name },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-gate={name}
      title={GATE_DESCRIPTIONS[name] || `${name} Gate`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`m-gate${isSelected ? ' selected' : ''} ${className || ''}`}
      style={{
        // Quando arrastando: fica invisível e SEM transform (o DragOverlay cuida do ghost)
        // Isso evita que o gate "saia" do overflow:hidden da sidebar
        opacity: isDragging ? 0 : 1,
        transform: isDragging ? 'none' : undefined,
        transition: isDragging ? 'none' : undefined,
      }}
    >
      {name}
    </div>
  );
};
