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
    category: "Multi-Qubit Gates",
    gates: [
      {
        symbol: "• + ⊕",
        name: "CNOT (Controlled-NOT)",
        description: "Controlled gate. Applies X to the target qubit when the control is in |1⟩.",
        formula: "CNOT|control⟩|target⟩ → |control⟩|control ⊕ target⟩",
        usage: "Creates entanglement. Fundamental for quantum algorithms.",
      },
      {
        symbol: "SWAP",
        name: "SWAP",
        description: "Exchanges the states of two qubits.",
        formula: "SWAP|a⟩|b⟩ → |b⟩|a⟩",
        usage: "Fundamental for quantum routing and information movement.",
      },
      {
        symbol: "• + • + ⊕",
        name: "Toffoli (CCNOT)",
        description: "Two-qubit controlled gate. Applies X to the target when both controls are in |1⟩.",
        formula: "Toffoli|c1⟩|c2⟩|t⟩ → |c1⟩|c2⟩|t ⊕ (c1 ∧ c2)⟩",
        usage: "Universal reversible gate. Can simulate any classical circuit.",
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
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
          style={{
            backgroundColor: "var(--bg-1)",
            border: "1px solid var(--border-1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
            style={{
              backgroundColor: "var(--bg-1)",
              borderColor: "var(--border-1)",
            }}
          >
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--text-1)" }}
              >
                Quantum Gate Reference
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-2)" }}
              >
                Complete guide to all available gates
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "var(--bg-3)",
                color: "var(--text-1)",
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {allGates.map((category, idx) => (
              <div key={idx}>
                <h3
                  className="text-lg font-bold mb-3 pb-2 border-b"
                  style={{
                    color: "var(--amber)",
                    borderColor: "var(--border-1)",
                  }}
                >
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.gates.map((gate, gateIdx) => (
                    <div
                      key={gateIdx}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: "var(--bg-2)",
                        border: "1px solid var(--border-1)",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Symbol */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                          style={{
                            backgroundColor: "var(--bg-3)",
                            color: "var(--amber)",
                            border: "2px solid var(--amber)",
                          }}
                        >
                          {gate.symbol}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div
                            className="font-bold text-base mb-1"
                            style={{ color: "var(--text-1)" }}
                          >
                            {gate.name}
                          </div>
                          <div
                            className="text-sm mb-2"
                            style={{ color: "var(--text-2)" }}
                          >
                            {gate.description}
                          </div>
                          <div
                            className="text-xs font-mono p-2 rounded mb-2"
                            style={{
                              backgroundColor: "var(--bg-3)",
                              color: "var(--text-2)",
                            }}
                          >
                            {gate.formula}
                          </div>
                          <div
                            className="text-xs italic"
                            style={{ color: "var(--text-3)" }}
                          >
                            💡 {gate.usage}
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
            className="sticky bottom-0 px-6 py-4 border-t"
            style={{
              backgroundColor: "var(--bg-1)",
              borderColor: "var(--border-1)",
            }}
          >
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-lg font-medium transition-all duration-200"
              style={{
                backgroundColor: "var(--amber)",
                color: "var(--text-inverse)",
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
