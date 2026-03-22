"use client";

import { useState } from "react";

interface GateInfoProps {
  selectedGate: string | null;
  onShowAllGates: () => void;
}

const gateDescriptions: Record<string, { name: string; description: string; formula?: string }> = {
  H: {
    name: "Hadamard (H)",
    description: "Creates equal superposition between |0⟩ and |1⟩. Transforms computational basis into Hadamard basis.",
    formula: "H|0⟩ = (|0⟩ + |1⟩)/√2",
  },
  X: {
    name: "Pauli-X",
    description: "Quantum NOT gate. Flips qubit state: |0⟩ ↔ |1⟩. Equivalent to classical NOT.",
    formula: "X|0⟩ = |1⟩, X|1⟩ = |0⟩",
  },
  Y: {
    name: "Pauli-Y",
    description: "180° rotation around Y-axis of Bloch sphere. Flips state and adds phase.",
    formula: "Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩",
  },
  Z: {
    name: "Pauli-Z",
    description: "Flips phase of |1⟩ state. Does not affect |0⟩. 180° rotation around Z-axis.",
    formula: "Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩",
  },
  S: {
    name: "S Gate (√Z)",
    description: "Phase gate π/2. Square root of Z gate. Adds 90° phase to |1⟩ state.",
    formula: "S|1⟩ = i|1⟩",
  },
  T: {
    name: "T Gate (⁴√Z)",
    description: "Phase gate π/4. Fourth root of Z gate. Fundamental for universal quantum computing.",
    formula: "T|1⟩ = e^(iπ/4)|1⟩",
  },
  RX: {
    name: "X Rotation (RX)",
    description: "Parametrized rotation around X-axis of Bloch sphere. Configurable angle θ.",
    formula: "RX(θ) = cos(θ/2)I - i·sin(θ/2)X",
  },
  RY: {
    name: "Y Rotation (RY)",
    description: "Parametrized rotation around Y-axis of Bloch sphere. Configurable angle θ.",
    formula: "RY(θ) = cos(θ/2)I - i·sin(θ/2)Y",
  },
  RZ: {
    name: "Z Rotation (RZ)",
    description: "Parametrized rotation around Z-axis of Bloch sphere. Configurable angle θ.",
    formula: "RZ(θ) = e^(-iθ/2)|0⟩⟨0| + e^(iθ/2)|1⟩⟨1|",
  },
  "•": {
    name: "Control (•)",
    description: "Control qubit for controlled gates. Activates operation only when in |1⟩ state.",
    formula: "CNOT: |control⟩|target⟩ → |control⟩|control ⊕ target⟩",
  },
  "⊕": {
    name: "Target (⊕)",
    description: "Target qubit for controlled gates. Undergoes operation when control is in |1⟩.",
  },
  SWAP: {
    name: "SWAP",
    description: "Swaps states of two qubits. |a⟩|b⟩ → |b⟩|a⟩. Fundamental for quantum routing.",
    formula: "SWAP|01⟩ = |10⟩",
  },
  M: {
    name: "Measurement (M)",
    description: "Collapses quantum state to |0⟩ or |1⟩. Destroys superposition and returns classical bit.",
    formula: "P(|0⟩) = |α|², P(|1⟩) = |β|²",
  },
};

export default function GateInfo({ selectedGate, onShowAllGates }: GateInfoProps) {
  const gateInfo = selectedGate ? gateDescriptions[selectedGate] : null;

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{
        backgroundColor: "var(--bg-3)",
        borderColor: "var(--border-1)",
      }}
    >
      {/* Header with info icon */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-3)" }}
        >
          {gateInfo ? "Selected Gate" : "Gate Information"}
        </div>
        <button
          onClick={onShowAllGates}
          className="p-1 rounded hover:opacity-80 transition-opacity"
          style={{ color: "var(--amber)" }}
          title="View all gates"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>

      {/* Gate information */}
      {gateInfo ? (
        <div>
          <div
            className="font-bold text-sm mb-1"
            style={{ color: "var(--text-1)" }}
          >
            {gateInfo.name}
          </div>
          <div
            className="text-xs mb-2"
            style={{ color: "var(--text-2)" }}
          >
            {gateInfo.description}
          </div>
          {gateInfo.formula && (
            <div
              className="text-xs font-mono p-2 rounded"
              style={{
                backgroundColor: "var(--bg-2)",
                color: "var(--text-2)",
              }}
            >
              {gateInfo.formula}
            </div>
          )}
        </div>
      ) : (
        <div
          className="text-xs text-center py-2"
          style={{ color: "var(--text-3)" }}
        >
          Click on a gate to view details
        </div>
      )}
    </div>
  );
}
