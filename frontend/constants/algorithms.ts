export interface QaoaPreset {
  label: string;
  desc: string;
  n: number;
  matrix: number[][];
  linear: number[];
}

export const QAOA_PRESETS: Record<string, QaoaPreset> = {
  maxcut_triangle: {
    label: 'MaxCut — Triangle (3q)',
    desc: 'H = Σ -ZZ  on triangle edges',
    n: 3,
    matrix: [[0, -1, -1], [0, 0, -1], [0, 0, 0]],
    linear: [0, 0, 0]
  },
  maxcut_k4: {
    label: 'MaxCut — K₄ (4q)',
    desc: 'H = Σ -ZZ  on all 6 edges',
    n: 4,
    matrix: [[0, -1, -1, -1], [0, 0, -1, -1], [0, 0, 0, -1], [0, 0, 0, 0]],
    linear: [0, 0, 0, 0]
  },
  ising_chain: {
    label: 'Ising Chain (4q)',
    desc: 'H = Σ -ZZ  nearest-neighbour',
    n: 4,
    matrix: [[0, -1, -1, -1], [0, 0, -1, -1], [0, 0, 0, -1], [0, 0, 0, 0]],
    linear: [0, 0, 0, 0]
  },
  mvc_triangle: {
    label: 'Vertex Cover — △ (3q)',
    desc: 'H = ¾(ZZ+Z+Z) − Z per edge & vertex',
    n: 3,
    matrix: [[0, 0.75, 0.75], [0, 0, 0.75], [0, 0, 0]],
    linear: [0.5, 0.5, 0.5]
  },
  mvc_path4: {
    label: 'Vertex Cover — Path (4q)',
    desc: 'Path 0-1-2-3',
    n: 4,
    matrix: [[0, 0.75, 0, 0], [0, 0, 0.75, 0], [0, 0, 0, 0.75], [0, 0, 0, 0]],
    linear: [-0.25, 0.5, 0.5, -0.25]
  },
  maxcut_ring5: {
    label: 'MaxCut — Ring (5q)',
    desc: 'H = Σ -ZZ on 5-ring',
    n: 5,
    matrix: [[0, -1, 0, 0, -1], [0, 0, -1, 0, 0], [0, 0, 0, -1, 0], [0, 0, 0, 0, -1], [0, 0, 0, 0, 0]],
    linear: [0, 0, 0, 0, 0]
  },
  custom_qaoa: {
    label: 'Custom',
    desc: 'Define J_{ij} & h_i',
    n: 0,
    matrix: [],
    linear: []
  },
};

export const VQE_PRESETS: Record<string, { label: string; desc: string; n: number; bases: string[]; scales: number[] }> = {
  zz_2q: { label: '−Z⊗Z (2q)', desc: 'Simplest 2-qubit Ising', n: 2, bases: ['ZZ'], scales: [-1.0] },
  zz_zi_2q: { label: '−Z⊗Z − Z⊗I (2q)', desc: 'ZZ + single-Z field', n: 2, bases: ['ZZ', 'ZI'], scales: [-1, -1] },
  heisenberg_2q: { label: 'Heisenberg XX+YY+ZZ (2q)', desc: 'Full isotropic', n: 2, bases: ['XX', 'YY', 'ZZ'], scales: [1, 1, 1] },
  ising_3q: { label: 'Ising Chain (3q)', desc: '−ZZI − IZZ', n: 3, bases: ['ZZI', 'IZZ'], scales: [-1, -1] },
  transverse_ising_3q: {
    label: 'Transverse-field Ising (3q)',
    desc: '−ZZI − IZZ + 0.5 X fields',
    n: 3,
    bases: ['ZZI', 'IZZ', 'XII', 'IXI', 'IIX'],
    scales: [-1, -1, 0.5, 0.5, 0.5]
  },
  custom_vqe: { label: 'Custom', desc: 'Bases & scales', n: 0, bases: [], scales: [] },
};

export interface VqeMaxcutPreset {
  label: string;
  desc: string;
  n: number;
  adj: number[][];
  invert: boolean;
}

export const VQE_MAXCUT_PRESETS: Record<string, VqeMaxcutPreset> = {
  book_4v: {
    label: 'Example (4v)',
    desc: 'Similarity matrix → inverted (1−A) for MaxCut',
    n: 4,
    adj: [[1, 0, 0, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 1, 0, 1]],
    invert: true
  },
  triangle_3v: {
    label: 'Triangle (3v)',
    desc: 'All-to-all 3-vertex graph',
    n: 3,
    adj: [[0, 1, 1], [1, 0, 1], [1, 1, 0]],
    invert: false
  },
  path_4v: {
    label: 'Path (4v)',
    desc: 'Linear chain 0-1-2-3',
    n: 4,
    adj: [[0, 1, 0, 0], [1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0]],
    invert: false
  },
  k4_complete: {
    label: 'Complete K₄',
    desc: 'All 6 edges',
    n: 4,
    adj: [[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]],
    invert: false
  },
  custom_maxcut: { label: 'Custom', desc: 'Enter adjacency matrix', n: 0, adj: [], invert: false },
};

export const WALK_PRESETS: Record<string, { label: string; desc: string; topology: string; n: number }> = {
  cycle_4: { label: 'Cycle (4 vertices)', desc: 'Ring graph — periodic boundary', topology: 'cycle', n: 4 },
  cycle_8: { label: 'Cycle (8 vertices)', desc: 'Larger ring — shows spreading', topology: 'cycle', n: 8 },
  path_4: { label: 'Path (4 vertices)', desc: 'Linear chain — reflecting ends', topology: 'path', n: 4 },
  path_8: { label: 'Path (8 vertices)', desc: 'Longer chain — boundary effects', topology: 'path', n: 8 },
  complete_4: { label: 'Complete K₄', desc: 'All-to-all connections', topology: 'complete', n: 4 },
  star_5: { label: 'Star (5 vertices)', desc: 'Central hub + 4 leaves', topology: 'star', n: 5 },
  grid_4: { label: 'Grid (4 vertices)', desc: '2×2 square lattice', topology: 'grid', n: 4 },
  custom_walk: { label: 'Custom', desc: 'Custom adjacency matrix', topology: 'custom', n: 0 },
};

export const CODE_TABS = [
  { key: 'qiskit', label: 'Qiskit' },
  { key: 'pennylane', label: 'PennyLane' },
  { key: 'cirq', label: 'Cirq' },
  { key: 'qsharp', label: 'Q#' },
  { key: 'qasm', label: 'QASM' },
];

export const VERTEX_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#D946EF', '#FB923C', '#22D3EE', '#A3E635', '#F472B6'
];
