#!/usr/bin/env python3
"""
Create a simple ONNX authorization model for agent spending decisions
Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
Outputs: [authorized (0/1), confidence (0-1)]
"""

import numpy as np
import torch
import torch.nn as nn
import os

class AuthorizationModel(nn.Module):
    """
    Simple neural network for authorization decisions
    5 inputs -> 16 hidden -> 8 hidden -> 2 outputs
    """
    def __init__(self):
        super(AuthorizationModel, self).__init__()
        self.fc1 = nn.Linear(5, 16)
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, 2)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)
        # Output 0: authorized (sigmoid for 0-1)
        # Output 1: confidence (sigmoid for 0-1)
        return self.sigmoid(x)

# Create model
model = AuthorizationModel()

# Initialize with reasonable weights for authorization logic
# Layer 1: extract features
with torch.no_grad():
    # Budget check neuron
    model.fc1.weight[0] = torch.tensor([0.5, 0.0, -0.5, 0.0, 0.0])  # budget - amount
    model.fc1.bias[0] = 0.0

    # Trust check neuron
    model.fc1.weight[1] = torch.tensor([0.0, 1.0, 0.0, 0.0, 0.0])  # merchant_trust
    model.fc1.bias[1] = -0.5  # bias towards needing >0.5 trust

    # Amount risk neuron
    model.fc1.weight[2] = torch.tensor([0.0, 0.0, -0.3, 0.0, 0.0])  # inverse of amount
    model.fc1.bias[2] = 0.5

    # Category check neuron
    model.fc1.weight[3] = torch.tensor([0.0, 0.0, 0.0, 1.0, 0.0])  # category_score
    model.fc1.bias[3] = 0.0

    # Velocity check neuron
    model.fc1.weight[4] = torch.tensor([0.0, 0.0, 0.0, 0.0, -0.2])  # inverse velocity
    model.fc1.bias[4] = 0.5

    # Initialize remaining weights randomly but small
    for i in range(5, 16):
        model.fc1.weight[i] = torch.randn(5) * 0.1
        model.fc1.bias[i] = torch.randn(1) * 0.1

    # Layer 2: combine features
    model.fc2.weight.data = torch.randn(8, 16) * 0.1
    model.fc2.bias.data = torch.randn(8) * 0.1

    # Layer 3: final decision (8 inputs -> 2 outputs)
    # Neuron 0: authorization decision
    model.fc3.weight[0] = torch.cat([torch.tensor([0.8, 0.8, 0.5, 0.8, 0.5]), torch.randn(3) * 0.05])
    model.fc3.bias[0] = -2.0  # bias towards denial unless all checks pass

    # Neuron 1: confidence
    model.fc3.weight[1] = torch.cat([torch.tensor([0.5, 0.5, 0.3, 0.5, 0.3]), torch.randn(3) * 0.05])
    model.fc3.bias[1] = 0.0

# Set to evaluation mode
model.eval()

# Create dummy input for tracing
dummy_input = torch.randn(1, 5)

# Export to ONNX
output_dir = "/home/hshadab/agentkit/acp/models"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "authorization_model.onnx")

torch.onnx.export(
    model,
    dummy_input,
    output_path,
    export_params=True,
    opset_version=11,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)

print(f"✅ Authorization model created: {output_path}")
print(f"   Architecture: 5 inputs -> 16 -> 8 -> 2 outputs")
print(f"   Input: [budget_remaining, merchant_trust, amount, category_score, velocity]")
print(f"   Output: [authorized (0-1), confidence (0-1)]")
print(f"\nTest the model:")

# Test with a valid transaction
test_input = torch.tensor([[500.0, 0.8, 45.0, 1.0, 0.0]])  # Good transaction
with torch.no_grad():
    output = model(test_input)
    print(f"  Good transaction: authorized={output[0,0]:.3f}, confidence={output[0,1]:.3f}")

# Test with invalid transaction
test_input = torch.tensor([[50.0, 0.3, 300.0, 0.5, 20.0]])  # Bad transaction
with torch.no_grad():
    output = model(test_input)
    print(f"  Bad transaction: authorized={output[0,0]:.3f}, confidence={output[0,1]:.3f}")
