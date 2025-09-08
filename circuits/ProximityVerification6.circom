pragma circom 2.1.0;

// Proximity verification with exactly 6 public signals
// Public inputs: [deviceIdHash, x, y, distanceSquared, timestamp, nonce]
// No outputs; the 6 inputs serve as the public signals verified on-chain

template ProximityInputs6() {
    // Public inputs
    signal input deviceIdHash;
    signal input x;
    signal input y;
    signal input distanceSquared;
    signal input timestamp;
    signal input nonce;

    // Constants for proximity center
    var centerX = 5000;
    var centerY = 5000;

    // Compute distance squared to center and enforce equality
    signal dx;
    signal dy;
    signal dx2;
    signal dy2;
    signal computedDistanceSquared;

    dx <== x - centerX;
    dy <== y - centerY;
    dx2 <== dx * dx;
    dy2 <== dy * dy;
    computedDistanceSquared <== dx2 + dy2;

    // Enforce provided distanceSquared matches computed
    distanceSquared === computedDistanceSquared;

    // Optional sanity constraints
    // Force timestamp, nonce to be used (prevent trivializing)
    signal tCheck <== timestamp * 1;
    signal nCheck <== nonce * 1;
    tCheck * 1 === tCheck;
    nCheck * 1 === nCheck;
}

// Declare the 6 public signals explicitly
component main { public [deviceIdHash, x, y, distanceSquared, timestamp, nonce] } = ProximityInputs6();

