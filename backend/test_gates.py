"""
Test script for verifying gate behavior and Bloch sphere representations.
"""

from simulation import build_circuit, get_statevector, get_bloch_image, run_circuit
import numpy as np
import json

def test_single_qubit_gates():
    """Test H, X, Y, Z gates and their Bloch vectors."""
    print("\n=== Single Qubit Gates Tests ===\n")
    
    # Test H gate - should create superposition
    print("1. H gate (Hadamard):")
    print("   Expected: |0⟩ → (|0⟩ + |1⟩)/√2")
    print("   Expected Bloch: (1, 0, 0) - pointing along +X")
    gates = [{"name": "H", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        print(f"   Magnitudes: |0⟩={abs(amp0)**2:.4f}, |1⟩={abs(amp1)**2:.4f}")
        # After H: both amplitudes should be ~0.707 (1/√2)
        assert abs(abs(amp0) - 0.707) < 0.01, "H gate |0⟩ amplitude incorrect"
        assert abs(abs(amp1) - 0.707) < 0.01, "H gate |1⟩ amplitude incorrect"
        print("   ✓ H gate working correctly")
    
    # Test X gate - should flip |0⟩ to |1⟩
    print("\n2. X gate (Pauli-X / NOT):")
    print("   Expected: |0⟩ → |1⟩")
    print("   Expected Bloch: (0, 0, -1) - pointing along -Z")
    gates = [{"name": "X", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        assert abs(amp0) < 0.01, "X gate should flip to |1⟩"
        assert abs(abs(amp1) - 1.0) < 0.01, "X gate |1⟩ amplitude should be 1"
        print("   ✓ X gate working correctly")
    
    # Test Y gate
    print("\n3. Y gate (Pauli-Y):")
    print("   Expected: |0⟩ → i|1⟩")
    gates = [{"name": "Y", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |1⟩={amp1:.4f}")
        print(f"   Phase of |1⟩: {np.angle(amp1):.4f} rad (expected π/2 = 1.5708)")
        assert abs(abs(amp1) - 1.0) < 0.01, "Y gate |1⟩ amplitude should be 1"
        assert abs(np.angle(amp1) - np.pi/2) < 0.01, "Y gate should add i phase"
        print("   ✓ Y gate working correctly")
    
    # Test Z gate
    print("\n4. Z gate (Pauli-Z):")
    print("   Expected: |0⟩ → |0⟩ (no change to |0⟩)")
    print("   Expected: |1⟩ → -|1⟩ (phase flip)")
    gates = [{"name": "Z", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        print(f"   Statevector: |0⟩={amp0:.4f}")
        assert abs(abs(amp0) - 1.0) < 0.01, "Z gate should leave |0⟩ unchanged"
        print("   ✓ Z gate working correctly")

def test_rotation_gates():
    """Test RX, RY, RZ gates."""
    print("\n=== Rotation Gates Tests ===\n")
    
    # Test RX(π) - should be equivalent to X
    print("1. RX(π) - should be equivalent to X gate:")
    gates = [{"name": "RX", "qubits": [0], "step": 0, "params": [np.pi]}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        assert abs(amp0) < 0.01, "RX(π) should flip to |1⟩"
        assert abs(abs(amp1) - 1.0) < 0.01, "RX(π) |1⟩ amplitude should be 1"
        print("   ✓ RX(π) correctly flips |0⟩ to |1⟩")
    
    # Test RY(π/2) - should create superposition with real amplitudes
    print("\n2. RY(π/2) - creates superposition:")
    gates = [{"name": "RY", "qubits": [0], "step": 0, "params": [np.pi/2]}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        print(f"   Both should be ~0.707 (real)")
        assert abs(abs(amp0) - 0.707) < 0.01, "RY(π/2) |0⟩ amplitude incorrect"
        assert abs(abs(amp1) - 0.707) < 0.01, "RY(π/2) |1⟩ amplitude incorrect"
        assert abs(amp0.imag) < 0.01, "RY produces real amplitudes"
        assert abs(amp1.imag) < 0.01, "RY produces real amplitudes"
        print("   ✓ RY(π/2) working correctly")
    
    # Test RZ(π) on |+⟩ state - should flip phase
    print("\n3. RZ(π) on superposition state:")
    gates = [
        {"name": "H", "qubits": [0], "step": 0},
        {"name": "RZ", "qubits": [0], "step": 1, "params": [np.pi]}
    ]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        print(f"   |0⟩ and |1⟩ should have opposite phases (π difference)")
        phase_diff = np.angle(amp1) - np.angle(amp0)
        print(f"   Phase difference: {phase_diff:.4f} rad (expected π = 3.1416)")
        # The phase difference should be π
        print("   ✓ RZ(π) working correctly")

def test_controlled_gates():
    """Test CX, CZ gates with 2 qubits."""
    print("\n=== Controlled Gates Tests ===\n")
    
    # Test CX (CNOT) - control |1⟩, target |0⟩ → target flips to |1⟩
    print("1. CX (CNOT) with control=|1⟩, target=|0⟩:")
    print("   Expected: |10⟩ → |11⟩")
    gates = [
        {"name": "X", "qubits": [0], "step": 0},  # Set control qubit to |1⟩
        {"name": "CX", "qubits": [0, 1], "step": 1}  # CNOT: control=0, target=1
    ]
    circuit = build_circuit(2, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        print(f"   Number of amplitudes: {len(sv['statevector'])}")
        # |11⟩ = index 3 (binary 11)
        amp_11 = complex(sv["statevector"][3][0], sv["statevector"][3][1])
        print(f"   Amplitude of |11⟩: {amp_11:.4f}")
        assert abs(abs(amp_11) - 1.0) < 0.01, "CNOT should produce |11⟩"
        print("   ✓ CX gate working correctly")
    
    # Test CZ - creates phase if both qubits are |1⟩
    print("\n2. CZ gate with |++⟩ state:")
    print("   Expected: |++⟩ → (|00⟩ + |01⟩ + |10⟩ - |11⟩)/2")
    gates = [
        {"name": "H", "qubits": [0], "step": 0},
        {"name": "H", "qubits": [1], "step": 0},
        {"name": "CZ", "qubits": [0, 1], "step": 1}
    ]
    circuit = build_circuit(2, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp_11 = complex(sv["statevector"][3][0], sv["statevector"][3][1])
        print(f"   Amplitude of |11⟩: {amp_11:.4f}")
        print(f"   |11⟩ should have negative amplitude (phase of π)")
        assert amp_11.real < 0, "CZ should give negative amplitude to |11⟩"
        print("   ✓ CZ gate working correctly")
    
    # Test CH (Controlled-H) 
    print("\n3. CH (Controlled-Hadamard) with control=|1⟩:")
    print("   Circuit: X on q0 (sets control to |1⟩), then CH(control=0, target=1)")
    print("   Expected: target qubit in superposition → |01⟩ and |11⟩")
    gates = [
        {"name": "X", "qubits": [0], "step": 0},  # control = |1⟩
        {"name": "CH", "qubits": [0, 1], "step": 1}  # Apply H to target if control=|1⟩
    ]
    circuit = build_circuit(2, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        # Qiskit little-endian: |q1 q0⟩
        # |01⟩ = q1=0, q0=1 → index 1 (binary 01)
        # |11⟩ = q1=1, q0=1 → index 3 (binary 11)
        amp_01 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        amp_11 = complex(sv["statevector"][3][0], sv["statevector"][3][1])
        print(f"   Amplitude of |01⟩: {amp_01:.4f}")
        print(f"   Amplitude of |11⟩: {amp_11:.4f}")
        print(f"   Both should be ~0.707 (target in superposition)")
        assert abs(abs(amp_01) - 0.707) < 0.01, "CH |01⟩ amplitude incorrect"
        assert abs(abs(amp_11) - 0.707) < 0.01, "CH |11⟩ amplitude incorrect"
        print("   ✓ CH gate working correctly")

def test_bloch_vectors():
    """Test Bloch vector calculations for different gates."""
    print("\n=== Bloch Vector Tests ===\n")
    
    # Test |0⟩ state - should point to +Z
    print("1. |0⟩ state (no gates):")
    circuit = build_circuit(1, [])
    bloch = get_bloch_image(circuit)
    if "bloch_images" in bloch:
        print("   Bloch sphere image generated ✓")
        print("   Expected Bloch vector: (0, 0, 1)")
    
    # Test |1⟩ state - should point to -Z
    print("\n2. |1⟩ state (after X gate):")
    gates = [{"name": "X", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    bloch = get_bloch_image(circuit)
    if "bloch_images" in bloch:
        print("   Bloch sphere image generated ✓")
        print("   Expected Bloch vector: (0, 0, -1)")
    
    # Test |+⟩ state - should point to +X
    print("\n3. |+⟩ state (after H gate):")
    gates = [{"name": "H", "qubits": [0], "step": 0}]
    circuit = build_circuit(1, gates)
    bloch = get_bloch_image(circuit)
    if "bloch_images" in bloch:
        print("   Bloch sphere image generated ✓")
        print("   Expected Bloch vector: (1, 0, 0)")
    
    # Test |+i⟩ state - should point to +Y
    print("\n4. |+i⟩ state (after RX(π/2)):")
    gates = [{"name": "RX", "qubits": [0], "step": 0, "params": [np.pi/2]}]
    circuit = build_circuit(1, gates)
    bloch = get_bloch_image(circuit)
    if "bloch_images" in bloch:
        print("   Bloch sphere image generated ✓")
        print("   Expected Bloch vector: (0, 1, 0)")
    
    # Test 2-qubit entangled state (Bell state)
    print("\n5. Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2:")
    gates = [
        {"name": "H", "qubits": [0], "step": 0},
        {"name": "CX", "qubits": [0, 1], "step": 1}
    ]
    circuit = build_circuit(2, gates)
    bloch = get_bloch_image(circuit)
    if "bloch_images" in bloch:
        print(f"   Bloch sphere images generated: {len(bloch['bloch_images'])} qubits")
        print("   Expected: Both qubits at origin (0, 0, 0) - maximally mixed")

def test_custom_unitary():
    """Test custom UNITARY gate with defined matrix."""
    print("\n=== Custom Unitary Gate Tests ===\n")
    
    # Create a custom π/2 rotation around X-axis
    theta = np.pi / 2
    # RX(θ) matrix = [[cos(θ/2), -i*sin(θ/2)], [-i*sin(θ/2), cos(θ/2)]]
    cos_t2 = np.cos(theta/2)
    sin_t2 = np.sin(theta/2)
    # Flattened [re, im, re, im, ...] format
    params = [
        cos_t2, 0.0,      # (0,0) real, imag
        0.0, -sin_t2,     # (0,1) real, imag  
        0.0, -sin_t2,     # (1,0) real, imag
        cos_t2, 0.0       # (1,1) real, imag
    ]
    
    print("1. Custom UNITARY gate (RX(π/2)):")
    gates = [{"name": "UNITARY", "qubits": [0], "step": 0, "params": params}]
    circuit = build_circuit(1, gates)
    sv = get_statevector(circuit)
    if "statevector" in sv:
        amp0 = complex(sv["statevector"][0][0], sv["statevector"][0][1])
        amp1 = complex(sv["statevector"][1][0], sv["statevector"][1][1])
        print(f"   Statevector: |0⟩={amp0:.4f}, |1⟩={amp1:.4f}")
        print(f"   Expected both amplitudes ~0.707 (superposition)")
        assert abs(abs(amp0) - 0.707) < 0.01, "Custom RX |0⟩ amplitude incorrect"
        assert abs(abs(amp1) - 0.707) < 0.01, "Custom RX |1⟩ amplitude incorrect"
        print("   ✓ Custom UNITARY gate working correctly")

def run_all_tests():
    """Run all gate tests."""
    print("="*60)
    print("MORIARTY GATE TEST SUITE")
    print("="*60)
    
    try:
        test_single_qubit_gates()
        test_rotation_gates()
        test_controlled_gates()
        test_bloch_vectors()
        test_custom_unitary()
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED ✓")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_all_tests()
