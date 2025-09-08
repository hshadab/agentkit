#!/usr/bin/env bash
set -euo pipefail

# Build a 6-signal proximity verifier from circuits/ProximityVerification6.circom
# Requires: circom v2, snarkjs, and ptau at circuits/pot12_final.ptau

ROOT_DIR="$(cd "$(dirname "$0")"/../.. && pwd)"
CIRCUITS_DIR="$ROOT_DIR/circuits"

echo "[1/5] Compiling Circom -> R1CS/WASM"
cd "$CIRCUITS_DIR"
circom ProximityVerification6.circom --r1cs --wasm -o .

echo "[2/5] Groth16 setup"
SNARKJS="$ROOT_DIR/node_modules/.bin/snarkjs"
PTAU="$CIRCUITS_DIR/pot12_final.ptau"
if [ ! -f "$PTAU" ]; then
  echo "PTAU not found at $PTAU" 1>&2
  exit 1
fi

$SNARKJS groth16 setup ProximityVerification6.r1cs "$PTAU" proximity6_0000.zkey

echo "[3/5] Contribute to zkey"
$SNARKJS zkey contribute proximity6_0000.zkey proximity6_final.zkey -e="agentkit" -v --name="agentkit"

echo "[4/5] Export Solidity verifier"
$SNARKJS zkey export solidityverifier proximity6_final.zkey "$ROOT_DIR/contracts/ProximityGroth16Verifier6.sol"

echo "[5/5] Export verification key"
$SNARKJS zkey export verificationkey proximity6_final.zkey proximity6_vk.json

echo "Done. Artifacts:"
echo "  - circuits/ProximityVerification6.r1cs"
echo "  - circuits/ProximityVerification6.wasm"
echo "  - circuits/proximity6_final.zkey"
echo "  - contracts/ProximityGroth16Verifier6.sol"

