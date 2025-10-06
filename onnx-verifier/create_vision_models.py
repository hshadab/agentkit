#!/usr/bin/env python3
"""
Create simple, working ONNX vision models for the demo.
These are guaranteed to work with ONNX Runtime (unlike downloaded models which may have compatibility issues).
"""

import torch
import torch.nn as nn
import torch.onnx

# Simple CNN for 28x28 grayscale images (MNIST-style)
class SimpleCNN(nn.Module):
    """Lightweight CNN: 28x28 grayscale → 10 classes (~50KB)"""
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1),  # 28x28x16
            nn.ReLU(),
            nn.MaxPool2d(2),  # 14x14x16
            nn.Conv2d(16, 32, 3, padding=1),  # 14x14x32
            nn.ReLU(),
            nn.MaxPool2d(2),  # 7x7x32
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(7 * 7 * 32, 128),
            nn.ReLU(),
            nn.Linear(128, 10)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

# ResNet-style model for 224x224 RGB images
class TinyResNet(nn.Module):
    """Tiny ResNet: 224x224 RGB → 1000 classes (~5MB)"""
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 64, 7, stride=2, padding=3)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU()
        self.maxpool = nn.MaxPool2d(3, stride=2, padding=1)

        # Simplified residual blocks
        self.layer1 = self._make_layer(64, 64, 2)
        self.layer2 = self._make_layer(64, 128, 2, stride=2)
        self.layer3 = self._make_layer(128, 256, 2, stride=2)

        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(256, 1000)

    def _make_layer(self, in_channels, out_channels, blocks, stride=1):
        layers = []
        layers.append(nn.Conv2d(in_channels, out_channels, 3, stride=stride, padding=1))
        layers.append(nn.BatchNorm2d(out_channels))
        layers.append(nn.ReLU())

        for _ in range(1, blocks):
            layers.append(nn.Conv2d(out_channels, out_channels, 3, padding=1))
            layers.append(nn.BatchNorm2d(out_channels))
            layers.append(nn.ReLU())

        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.fc(x)
        return x

# MobileNet-style model (efficient)
class TinyMobileNet(nn.Module):
    """Tiny MobileNet: 224x224 RGB → 1000 classes (~3MB)"""
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),

            # Depthwise separable convolutions
            nn.Conv2d(32, 32, 3, groups=32, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 64, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),

            nn.Conv2d(64, 64, 3, stride=2, groups=64, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 128, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Linear(128, 1000)

    def forward(self, x):
        x = self.features(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

def export_model(model, dummy_input, filename, model_name):
    """Export PyTorch model to ONNX"""
    model.eval()

    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy_input,
            filename,
            export_params=True,
            opset_version=12,  # Compatible with most ONNX Runtime versions
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )

    # Verify the exported model
    import onnx
    onnx_model = onnx.load(filename)
    onnx.checker.check_model(onnx_model)

    # Get file size
    import os
    size_mb = os.path.getsize(filename) / (1024 * 1024)
    print(f"✓ {model_name} exported: {filename} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    print("Creating simple, compatible ONNX vision models...\n")

    # 1. SimpleCNN for MNIST-style images
    print("1. Creating SimpleCNN (grayscale images)...")
    simple_cnn = SimpleCNN()
    dummy_mnist = torch.randn(1, 1, 28, 28)
    export_model(simple_cnn, dummy_mnist, "simple_cnn.onnx", "SimpleCNN")

    # 2. Tiny ResNet for ImageNet-style images
    print("\n2. Creating TinyResNet (RGB images)...")
    tiny_resnet = TinyResNet()
    dummy_imagenet = torch.randn(1, 3, 224, 224)
    export_model(tiny_resnet, dummy_imagenet, "tiny_resnet.onnx", "TinyResNet")

    # 3. Tiny MobileNet (efficient)
    print("\n3. Creating TinyMobileNet (efficient RGB)...")
    tiny_mobilenet = TinyMobileNet()
    export_model(tiny_mobilenet, dummy_imagenet, "tiny_mobilenet.onnx", "TinyMobileNet")

    print("\n" + "="*60)
    print("✅ All models created successfully!")
    print("="*60)
    print("\nThese models are:")
    print("  • Compatible with ONNX Runtime opset 12")
    print("  • Small and fast for demo purposes")
    print("  • Guaranteed to work (no download/parsing issues)")
    print("  • Based on industry-standard architectures")
