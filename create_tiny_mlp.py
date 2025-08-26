#!/usr/bin/env python3
"""
Create ultra-minimal MLP for fast zkML proof generation
Key: Keep polynomial degrees small, avoid complex ops
"""

import torch
import torch.nn as nn
import numpy as np

class TinyMLP(nn.Module):
    """
    Tiny MLP for agent authorization
    Input: [agent_type, amount_norm, operation, risk] (4 features)
    Output: [deny_score, allow_score] (2 classes)
    """
    def __init__(self):
        super().__init__()
        # Ultra-small layers to minimize polynomial degree
        self.fc1 = nn.Linear(4, 4, bias=True)   # 4x4 = 16 weights + 4 bias = 20 params
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(4, 2, bias=True)   # 4x2 = 8 weights + 2 bias = 10 params
        # Total: only 30 parameters!
        
        # Initialize with simple weights for predictable behavior
        with torch.no_grad():
            # First layer: simple feature extraction
            self.fc1.weight.data = torch.tensor([
                [1.0, 0.5, 0.0, -0.5],  # Focus on agent_type
                [0.0, 1.0, 0.0, -1.0],  # Focus on amount
                [0.5, 0.0, 1.0, 0.0],   # Focus on operation
                [0.0, -0.5, 0.0, 1.0]   # Focus on risk
            ])
            self.fc1.bias.data = torch.tensor([0.1, -0.1, 0.0, -0.2])
            
            # Second layer: decision making
            self.fc2.weight.data = torch.tensor([
                [-1.0, -1.0, -0.5, -1.0],  # Deny score
                [1.0, 0.5, 0.5, 0.5]       # Allow score
            ])
            self.fc2.bias.data = torch.tensor([-0.5, 0.5])
    
    def forward(self, x):
        x = self.relu(self.fc1(x))
        return self.fc2(x)  # Return logits, not softmax (simpler for zkML)

def quantize_model(model):
    """Quantize weights to int8 for smaller lookup tables"""
    with torch.no_grad():
        # Scale and quantize to int8 range
        for param in model.parameters():
            # Scale to [-127, 127] and round
            scaled = (param * 32).round().clamp(-127, 127)
            param.data = scaled / 32  # Scale back but now quantized

def test_model():
    """Test the model with sample inputs"""
    model = TinyMLP().eval()
    
    print("Testing Tiny MLP for zkML")
    print("=" * 60)
    
    # Test cases: [agent_type, amount_norm, operation, risk]
    test_cases = [
        ([3.0, 0.1, 1.0, 0.1], "High-privilege agent, low amount, low risk"),
        ([1.0, 0.9, 1.0, 0.8], "Low-privilege agent, high amount, high risk"),
        ([2.0, 0.3, 1.0, 0.3], "Medium agent, medium amount, medium risk"),
    ]
    
    for inputs, description in test_cases:
        x = torch.tensor([inputs])
        with torch.no_grad():
            logits = model(x)
            decision = torch.argmax(logits, dim=1).item()
            scores = torch.softmax(logits, dim=1).numpy()[0]
        
        print(f"\nInput: {inputs}")
        print(f"Description: {description}")
        print(f"Logits: {logits.numpy()[0]}")
        print(f"Scores: Deny={scores[0]:.3f}, Allow={scores[1]:.3f}")
        print(f"Decision: {'ALLOW' if decision == 1 else 'DENY'}")
    
    return model

def export_to_onnx(model, filename="tiny_mlp.onnx"):
    """Export model to ONNX format for JOLT-Atlas"""
    model.eval()
    
    # Example input - normalized values in range [0, 1]
    dummy_input = torch.tensor([[2.0, 0.3, 1.0, 0.2]])  # [agent_type, amount, op, risk]
    
    # Export with specific settings for JOLT compatibility
    torch.onnx.export(
        model,
        dummy_input,
        filename,
        input_names=["agent_features"],
        output_names=["decision_logits"],
        opset_version=13,  # JOLT-Atlas compatible version
        do_constant_folding=True,
        export_params=True,
        dynamic_axes=None  # Fixed size for simpler proving
    )
    
    print(f"\n✅ Exported to {filename}")
    print(f"   Input shape: [1, 4]")
    print(f"   Output shape: [1, 2]")
    print(f"   Total parameters: 30")
    print(f"   Estimated proof time: 10-30 seconds")
    
    return filename

def main():
    print("Creating Tiny MLP for Fast zkML Proofs")
    print("=" * 70)
    print()
    
    # Create and test model
    model = test_model()
    
    # Optional: Quantize for even smaller proofs
    print("\nQuantizing model to int8...")
    quantize_model(model)
    
    # Export to ONNX
    onnx_file = export_to_onnx(model, "/home/hshadab/agentkit/jolt-atlas/zkml-jolt-core/models/tiny_mlp.onnx")
    
    print("\n" + "=" * 70)
    print("Next Steps:")
    print("1. Load this ONNX model in JOLT-Atlas")
    print("2. Run proof generation (should complete in 10-30s)")
    print("3. Verify the proof cryptographically")
    print()
    print("This model is small enough that JOLT-Atlas should be able to")
    print("generate REAL cryptographic proofs in reasonable time!")

if __name__ == "__main__":
    main()