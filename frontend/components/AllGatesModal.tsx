"use client";

import React from 'react';
import { createPortal } from 'react-dom';

interface AllGatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const allGates = [
  {
    category: "Basic Gates",
    gates: [
      {
        symbol: "H",
        name: "Hadamard",
        description: "Creates an equal superposition between |0⟩ and |1⟩. Transforms the computational basis into the Hadamard basis.",
        formula: "H|0⟩ = (|0⟩ + |1⟩)/√2",
        usage: "Fundamental for creating superposition and initialising quantum algorithms.",
      },
      {
        symbol: "X",
        name: "Pauli-X (NOT)",
        description: "Quantum NOT gate. Flips the qubit state: |0⟩ ↔ |1⟩.",
        formula: "X|0⟩ = |1⟩, X|1⟩ = |0⟩",
        usage: "Equivalent to the classical NOT gate. Used to flip qubit states.",
      },
      {
        symbol: "Y",
        name: "Pauli-Y",
        description: "180° rotation around the Y-axis of the Bloch sphere.",
        formula: "Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩",
        usage: "Flips the state and adds a complex phase.",
      },
      {
        symbol: "Z",
        name: "Pauli-Z",
        description: "Flips the phase of the |1⟩ state. Does not affect |0⟩.",
        formula: "Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩",
        usage: "180° rotation around the Z-axis. Important for phase correction.",
      },
    ],
  },
  {
    category: "Phase Gates",
    gates: [
      {
        symbol: "S",
        name: "S Gate (√Z)",
        description: "Phase gate of π/2. Square root of the Z gate.",
        formula: "S|1⟩ = i|1⟩",
        usage: "Adds a 90° phase to the |1⟩ state. Used in phase-based algorithms.",
      },
      {
        symbol: "T",
        name: "T Gate (⁴√Z)",
        description: "Phase gate of π/4. Fourth root of the Z gate.",
        formula: "T|1⟩ = e^(iπ/4)|1⟩",
        usage: "Fundamental for universal quantum computing with the {H, T, CNOT} gate set.",
      },
    ],
  },
  {
    category: "Parametric Rotations",
    gates: [
      {
        symbol: "RX",
        name: "X Rotation",
        description: "Parametric rotation around the X-axis of the Bloch sphere.",
        formula: "RX(θ) = cos(θ/2)I - i·sin(θ/2)X",
        usage: "Allows arbitrary rotations on the X-axis. Angle θ is configurable.",
      },
      {
        symbol: "RY",
        name: "Y Rotation",
        description: "Parametric rotation around the Y-axis of the Bloch sphere.",
        formula: "RY(θ) = cos(θ/2)I - i·sin(θ/2)Y",
        usage: "Allows arbitrary rotations on the Y-axis. Angle θ is configurable.",
      },
      {
        symbol: "RZ",
        name: "Z Rotation",
        description: "Parametric rotation around the Z-axis of the Bloch sphere.",
        formula: "RZ(θ) = e^(-iθ/2)|0⟩⟨0| + e^(iθ/2)|1⟩⟨1|",
        usage: "Allows arbitrary rotations on the Z-axis. Angle θ is configurable.",
      },
    ],
  },
  {
    category: "Controlled Gates",
    gates: [
      {
        symbol: "CX",
        name: "CNOT (Controlled-X)",
        description: "Controlled-NOT gate. Applies X to the target qubit when the control is in |1⟩.",
        formula: "CX|c,t⟩ → |c, c⊕t⟩",
        usage: "Creates entanglement. Fundamental for quantum algorithms and reversible computing.",
      },
      {
        symbol: "CY",
        name: "Controlled-Y",
        description: "Controlled-Y gate. Applies Y to the target qubit when the control is in |1⟩.",
        formula: "CY|c,t⟩ → |c, Y(t)⟩ if c=1",
        usage: "Controlled phase and bit flip operation.",
      },
      {
        symbol: "CZ",
        name: "Controlled-Z",
        description: "Controlled-Z gate. Applies Z to the target qubit when the control is in |1⟩.",
        formula: "CZ|c,t⟩ → (-1)^(c∧t)|c,t⟩",
        usage: "Creates conditional phase shifts. Symmetric in both qubits.",
      },
      {
        symbol: "CH",
        name: "Controlled-H",
        description: "Controlled-Hadamard gate. Applies H to the target qubit when the control is in |1⟩.",
        formula: "CH|c,t⟩ → |c, H(t)⟩ if c=1",
        usage: "Controlled superposition creation.",
      },
      {
        symbol: "CCX",
        name: "Toffoli (CCNOT)",
        description: "Double-controlled NOT. Applies X to the target when both controls are in |1⟩.",
        formula: "CCX|c1,c2,t⟩ → |c1,c2, t⊕(c1∧c2)⟩",
        usage: "Universal reversible gate. Can simulate any classical circuit.",
      },
      {
        symbol: "CSWAP",
        name: "Fredkin (CSWAP)",
        description: "Controlled-SWAP. Swaps two target qubits when the control is in |1⟩.",
        formula: "CSWAP|c,a,b⟩ → |c,b,a⟩ if c=1",
        usage: "Controlled swap operation. Useful for quantum routing.",
      },
    ],
  },
  {
    category: "Controlled Rotations",
    gates: [
      {
        symbol: "CRX",
        name: "Controlled-RX",
        description: "Controlled rotation around X-axis. Applies RX(θ) to target when control is |1⟩.",
        formula: "CRX(θ)|c,t⟩ → |c, RX(θ)t⟩ if c=1",
        usage: "Conditional arbitrary X-axis rotation. Angle θ is configurable.",
      },
      {
        symbol: "CRY",
        name: "Controlled-RY",
        description: "Controlled rotation around Y-axis. Applies RY(θ) to target when control is |1⟩.",
        formula: "CRY(θ)|c,t⟩ → |c, RY(θ)t⟩ if c=1",
        usage: "Conditional arbitrary Y-axis rotation. Angle θ is configurable.",
      },
      {
        symbol: "CRZ",
        name: "Controlled-RZ",
        description: "Controlled rotation around Z-axis. Applies RZ(θ) to target when control is |1⟩.",
        formula: "CRZ(θ)|c,t⟩ → |c, RZ(θ)t⟩ if c=1",
        usage: "Conditional arbitrary Z-axis rotation. Angle θ is configurable.",
      },
      {
        symbol: "CP",
        name: "Controlled-Phase",
        description: "Controlled phase rotation. Adds phase e^(iθ) to |11⟩ state.",
        formula: "CP(θ)|c,t⟩ → e^(iθ·c·t)|c,t⟩",
        usage: "Conditional phase shift between two qubits. Also known as CPHASE.",
      },
    ],
  },
  {
    category: "Multi-Qubit Gates",
    gates: [
      {
        symbol: "SWAP",
        name: "SWAP",
        description: "Exchanges the states of two qubits.",
        formula: "SWAP|a⟩|b⟩ → |b⟩|a⟩",
        usage: "Fundamental for quantum routing and information movement.",
      },
    ],
  },
  {
    category: "Measurement",
    gates: [
      {
        symbol: "M",
        name: "Measurement",
        description: "Collapses the quantum state to |0⟩ or |1⟩ with probabilities |α|² and |β|².",
        formula: "P(|0⟩) = |α|², P(|1⟩) = |β|² for |ψ⟩ = α|0⟩ + β|1⟩",
        usage: "Destroys superposition and returns a classical bit. Irreversible.",
      },
    ],
  },
];

export default function AllGatesModal({ isOpen, onClose }: AllGatesModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.75)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onClick={onClose}
      >
        <div
          style={{
            maxWidth: 896,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 12,
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--border-1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-1)',
            }}
          >
            <div>
              <h2
                style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}
              >
                Quantum Gate Reference
              </h2>
              <p
                style={{ fontSize: 13, marginTop: 4, color: 'var(--text-2)', margin: '4px 0 0' }}
              >
                Complete guide to all available gates
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--bg-3)',
                border: 'none',
                color: 'var(--text-1)',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {allGates.map((category, idx) => (
              <div key={idx}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--amber)',
                    margin: '0 0 12px',
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border-1)',
                  }}
                >
                  {category.category}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {category.gates.map((gate, gateIdx) => (
                    <div
                      key={gateIdx}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        {/* Symbol */}
                        <div
                          style={{
                            flexShrink: 0,
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 18,
                            backgroundColor: 'var(--bg-3)',
                            color: 'var(--amber)',
                            border: '2px solid var(--amber)',
                          }}
                        >
                          {gate.symbol}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-1)' }}
                          >
                            {gate.name}
                          </div>
                          <div
                            style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-2)' }}
                          >
                            {gate.description}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontFamily: 'monospace',
                              padding: '6px 8px',
                              borderRadius: 5,
                              marginBottom: 8,
                              backgroundColor: 'var(--bg-3)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {gate.formula}
                          </div>
                          <div
                            style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-3)' }}
                          >
                            {gate.usage}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              padding: '12px 24px',
              borderTop: '1px solid var(--border-1)',
              backgroundColor: 'var(--bg-1)',
            }}
          >
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                backgroundColor: 'var(--amber)',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
