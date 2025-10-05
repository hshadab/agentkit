import numpy as np
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Create sample fraud detection training data
# Features: [amount, merchant_risk, account_age, txn_per_day, hour]
X_train = np.array([
    # Legitimate transactions
    [50.0, 0.2, 500.0, 3.0, 14.0],
    [25.0, 0.1, 800.0, 1.0, 10.0],
    [75.0, 0.3, 600.0, 5.0, 12.0],
    [100.0, 0.2, 400.0, 4.0, 15.0],
    [30.0, 0.1, 900.0, 2.0, 11.0],
    [45.0, 0.2, 700.0, 3.0, 13.0],
    [60.0, 0.3, 500.0, 4.0, 16.0],
    [80.0, 0.2, 600.0, 3.0, 14.0],

    # Fraudulent transactions
    [450.0, 0.8, 5.0, 45.0, 3.0],
    [500.0, 0.9, 10.0, 50.0, 2.0],
    [300.0, 0.7, 30.0, 25.0, 4.0],
    [400.0, 0.8, 20.0, 30.0, 1.0],
    [350.0, 0.9, 15.0, 40.0, 5.0],
    [480.0, 0.8, 8.0, 48.0, 2.0],
    [420.0, 0.7, 25.0, 35.0, 3.0],
    [380.0, 0.9, 12.0, 42.0, 4.0],
])

# Labels: 0 = legitimate, 1 = fraud
y_train = np.array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1])

# Train fraud detection model
print("Training fraud detection model...")
model = RandomForestClassifier(n_estimators=10, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# Export to ONNX
print("Exporting to ONNX format...")
initial_type = [('float_input', FloatTensorType([None, 5]))]
onnx_model = convert_sklearn(model, initial_types=initial_type)

# Save
output_file = "fraud_model.onnx"
with open(output_file, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"✓ Successfully saved {output_file}")
print(f"  Model size: {len(onnx_model.SerializeToString()) / 1024:.2f} KB")
print(f"\nYou can now upload this model to the zkML ONNX Verifier UI!")
print(f"Test it with the pre-built scenarios in the UI.")
