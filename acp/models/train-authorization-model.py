#!/usr/bin/env python3
"""
Train ONNX Authorization Model for Agent Payment Decisions

This model learns to authorize/deny transactions based on:
- Budget remaining
- Merchant trust score
- Transaction amount
- Category allowance
- Transaction velocity

Model Architecture:
Input (5) → Dense(16) → ReLU → Dense(8) → ReLU → Dense(2) → Sigmoid
Outputs: [authorized: bool, confidence: float]
"""

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import os

# Check if ONNX export is available
try:
    import torch.onnx
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    print("⚠️  torch.onnx not available, will save PyTorch model only")


class AuthorizationDataset(Dataset):
    """Generate synthetic training data for authorization model"""

    def __init__(self, num_samples=10000):
        self.num_samples = num_samples
        self.data = []
        self.labels = []

        print(f"Generating {num_samples} training samples...")

        for _ in range(num_samples):
            # Generate random transaction scenario
            budget_remaining = np.random.uniform(0, 1000)
            merchant_trust = np.random.uniform(0, 1)
            amount = np.random.uniform(1, 500)
            category_score = np.random.choice([0.0, 1.0])  # Binary: allowed or not
            velocity = np.random.randint(0, 20)  # Transactions today

            # Decision logic (rules-based for training)
            authorized = (
                budget_remaining >= amount and  # Has budget
                amount <= budget_remaining * 0.7 and  # Not spending too much
                merchant_trust >= 0.3 and  # Minimum trust
                velocity < 15 and  # Not too many transactions
                (category_score > 0.5 or merchant_trust > 0.8)  # Category allowed OR high trust
            )

            # Add some noise (5% error rate)
            if np.random.random() < 0.05:
                authorized = not authorized

            # Confidence based on how clear the decision is
            confidence = 0.95 if (
                (authorized and merchant_trust > 0.8) or
                (not authorized and budget_remaining < amount)
            ) else 0.75

            # Add variance to confidence
            confidence += np.random.uniform(-0.1, 0.1)
            confidence = np.clip(confidence, 0.5, 0.99)

            self.data.append([
                budget_remaining / 1000.0,  # Normalize
                merchant_trust,
                amount / 500.0,  # Normalize
                category_score,
                velocity / 20.0  # Normalize
            ])

            self.labels.append([
                1.0 if authorized else 0.0,
                confidence
            ])

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return (
            torch.tensor(self.data[idx], dtype=torch.float32),
            torch.tensor(self.labels[idx], dtype=torch.float32)
        )


class AuthorizationModel(nn.Module):
    """Neural network for authorization decisions"""

    def __init__(self):
        super(AuthorizationModel, self).__init__()

        self.network = nn.Sequential(
            nn.Linear(5, 16),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(8, 2),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)


def train_model(num_epochs=50, batch_size=64, learning_rate=0.001):
    """Train the authorization model"""

    print("\n🧠 Training Authorization Model")
    print("=" * 50)

    # Create dataset
    dataset = AuthorizationDataset(num_samples=10000)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    # Create model
    model = AuthorizationModel()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    # Training loop
    best_val_loss = float('inf')

    for epoch in range(num_epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for inputs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

            # Calculate accuracy (for authorized decisions)
            predicted = (outputs[:, 0] > 0.5).float()
            actual = (labels[:, 0] > 0.5).float()
            train_correct += (predicted == actual).sum().item()
            train_total += labels.size(0)

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, labels in val_loader:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()

                predicted = (outputs[:, 0] > 0.5).float()
                actual = (labels[:, 0] > 0.5).float()
                val_correct += (predicted == actual).sum().item()
                val_total += labels.size(0)

        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        train_acc = 100 * train_correct / train_total
        val_acc = 100 * val_correct / val_total

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{num_epochs}")
            print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
            print(f"  Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%")

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), 'models/authorization_model.pth')

    print(f"\n✅ Training complete! Best val loss: {best_val_loss:.4f}")

    return model


def export_to_onnx(model, output_path='models/authorization_model.onnx'):
    """Export trained model to ONNX format"""

    if not ONNX_AVAILABLE:
        print("❌ Cannot export to ONNX: torch.onnx not available")
        return False

    print(f"\n📦 Exporting model to ONNX: {output_path}")

    model.eval()

    # Create dummy input
    dummy_input = torch.randn(1, 5)

    try:
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

        print(f"✅ Model exported successfully to {output_path}")

        # Verify export
        import onnx
        onnx_model = onnx.load(output_path)
        onnx.checker.check_model(onnx_model)
        print("✅ ONNX model verified")

        return True

    except Exception as e:
        print(f"❌ ONNX export failed: {e}")
        return False


def test_model(model):
    """Test the model with sample scenarios"""

    print("\n🧪 Testing Model with Sample Scenarios")
    print("=" * 50)

    model.eval()

    test_cases = [
        {
            'name': 'Normal purchase (should authorize)',
            'inputs': [500/1000, 0.9, 45/500, 1.0, 2/20],  # Good merchant, enough budget
        },
        {
            'name': 'Exceeds budget (should deny)',
            'inputs': [50/1000, 0.8, 100/500, 1.0, 3/20],  # Amount > budget
        },
        {
            'name': 'Untrusted merchant (should deny)',
            'inputs': [500/1000, 0.2, 50/500, 0.0, 5/20],  # Low trust, disallowed category
        },
        {
            'name': 'High velocity (should deny)',
            'inputs': [500/1000, 0.9, 30/500, 1.0, 18/20],  # Too many transactions
        },
        {
            'name': 'Trusted merchant, large amount (should authorize)',
            'inputs': [1000/1000, 0.95, 300/500, 1.0, 1/20],  # High trust, good budget
        }
    ]

    with torch.no_grad():
        for test in test_cases:
            inputs = torch.tensor([test['inputs']], dtype=torch.float32)
            outputs = model(inputs)

            authorized = outputs[0][0].item() > 0.5
            confidence = outputs[0][1].item()

            print(f"\n{test['name']}")
            print(f"  Decision: {'✅ AUTHORIZED' if authorized else '❌ DENIED'}")
            print(f"  Confidence: {confidence:.2%}")


if __name__ == '__main__':
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)

    # Train model
    model = train_model(num_epochs=50, batch_size=64, learning_rate=0.001)

    # Test model
    test_model(model)

    # Export to ONNX
    export_to_onnx(model, 'models/authorization_model.onnx')

    print("\n✨ Model training complete!")
    print("\nNext steps:")
    print("  1. Start proof service: npm run proof-service")
    print("  2. Test inference: curl http://localhost:9001/test-inference")
    print("  3. Generate proofs: curl http://localhost:9001/prove-authorization")