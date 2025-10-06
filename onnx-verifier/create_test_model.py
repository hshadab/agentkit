#!/usr/bin/env python3
"""Create a simple ONNX model compatible with onnxruntime-node"""

import torch
import torch.nn as nn
import torch.onnx

# Simple neural network for testing
class SimpleModel(nn.Module):
    def __init__(self):
        super(SimpleModel, self).__init__()
        self.fc1 = nn.Linear(5, 8)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(8, 2)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)
        x = self.softmax(x)
        return x

# Create model
model = SimpleModel()
model.eval()

# Example input
dummy_input = torch.randn(1, 5)

# Export to ONNX with IR version 7 (compatible with onnxruntime-node)
torch.onnx.export(
    model,
    dummy_input,
    "test_model_compatible.onnx",
    export_params=True,
    opset_version=11,  # Use opset 11 for better compatibility
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)

print("✅ Created test_model_compatible.onnx")
print("   Model: 5 inputs → 8 hidden → 2 outputs")
print("   Opset version: 11")
print("   Test input: [0.5, 0.3, 0.8, 0.2, 0.6]")
