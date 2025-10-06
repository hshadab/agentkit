#!/bin/bash

# Download popular industry-standard ONNX models
# These are publicly available and widely used

set -e

echo "📥 Downloading popular ONNX models..."
echo

# Create models directory
mkdir -p popular_models

cd popular_models

# 1. ResNet-50 (Image Classification) - ~98MB
echo "1️⃣  ResNet-50 (Image Classification - 98MB)"
if [ ! -f "resnet50-v2-7.onnx" ]; then
    wget -q --show-progress https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet50-v2-7.onnx
    echo "   ✅ Downloaded resnet50-v2-7.onnx"
else
    echo "   ⏭️  Already exists"
fi
echo

# 2. SqueezeNet (Lightweight Image Classification) - ~5MB
echo "2️⃣  SqueezeNet (Lightweight Image Classification - 5MB)"
if [ ! -f "squeezenet1.1-7.onnx" ]; then
    wget -q --show-progress https://github.com/onnx/models/raw/main/validated/vision/classification/squeezenet/model/squeezenet1.1-7.onnx
    echo "   ✅ Downloaded squeezenet1.1-7.onnx"
else
    echo "   ⏭️  Already exists"
fi
echo

# 3. EfficientNet-Lite4 (Efficient Image Classification) - ~49MB
echo "3️⃣  EfficientNet-Lite4 (Efficient Image - 49MB)"
if [ ! -f "efficientnet-lite4-11.onnx" ]; then
    wget -q --show-progress https://github.com/onnx/models/raw/main/validated/vision/classification/efficientnet-lite4/model/efficientnet-lite4-11.onnx
    echo "   ✅ Downloaded efficientnet-lite4-11.onnx"
else
    echo "   ⏭️  Already exists"
fi
echo

# 4. BERT-base (Text Classification/NLP) - Note: Large, may need quantized version
echo "4️⃣  Creating quantized DistilBERT for sentiment analysis..."
python3 -c "
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch

    # Load small sentiment model
    model_name = 'distilbert-base-uncased-finetuned-sst-2-english'
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Export to ONNX
    dummy_input = tokenizer('This is a test', return_tensors='pt')
    torch.onnx.export(
        model,
        (dummy_input['input_ids'], dummy_input['attention_mask']),
        'distilbert-sentiment.onnx',
        input_names=['input_ids', 'attention_mask'],
        output_names=['logits'],
        dynamic_axes={'input_ids': {0: 'batch', 1: 'sequence'},
                      'attention_mask': {0: 'batch', 1: 'sequence'}}
    )
    print('   ✅ Created distilbert-sentiment.onnx')
except ImportError:
    print('   ⏭️  Skipping (transformers not installed)')
" || echo "   ⏭️  Skipping DistilBERT (dependencies missing)"
echo

# 5. Create sample fraud detection model (XGBoost-style)
echo "5️⃣  Creating sample XGBoost fraud detection model..."
python3 -c "
import numpy as np
try:
    from sklearn.ensemble import GradientBoostingClassifier
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    # Create sample fraud detection model
    np.random.seed(42)
    X_train = np.random.rand(1000, 10).astype(np.float32)
    y_train = (X_train[:, 0] + X_train[:, 1] > 1.0).astype(int)

    model = GradientBoostingClassifier(n_estimators=50, max_depth=3)
    model.fit(X_train, y_train)

    # Convert to ONNX
    initial_type = [('float_input', FloatTensorType([None, 10]))]
    onx = convert_sklearn(model, initial_types=initial_type)

    with open('xgboost_fraud_detection.onnx', 'wb') as f:
        f.write(onx.SerializeToString())
    print('   ✅ Created xgboost_fraud_detection.onnx')
except ImportError:
    print('   ⏭️  Skipping (scikit-learn/skl2onnx not installed)')
" || echo "   ⏭️  Skipping XGBoost model (dependencies missing)"
echo

# Summary
echo "📊 Summary:"
ls -lh *.onnx 2>/dev/null | awk '{print "   " $9 " - " $5}' || echo "   No models downloaded (check dependencies)"
echo
echo "💡 Usage:"
echo "   - Copy desired models to parent directory"
echo "   - Reference in UI dropdown"
echo "   - Test with appropriate input dimensions"
echo
echo "📚 Model Details:"
echo "   ResNet-50:     1000-class ImageNet classification (224x224x3 RGB)"
echo "   SqueezeNet:    1000-class ImageNet (lightweight, 227x227x3)"
echo "   EfficientNet:  1000-class ImageNet (optimized, 224x224x3)"
echo "   DistilBERT:    Binary sentiment classification (text)"
echo "   XGBoost Fraud: 10-feature fraud detection (tabular)"
