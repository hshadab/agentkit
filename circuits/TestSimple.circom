pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template TestSimple() {
    signal input proofType;
    signal output isValid;
    
    // Test if proofType is 1, 2, or 3
    component eq1 = IsEqual();
    eq1.in[0] <== proofType;
    eq1.in[1] <== 1;
    
    component eq2 = IsEqual();
    eq2.in[0] <== proofType;
    eq2.in[1] <== 2;
    
    component eq3 = IsEqual();
    eq3.in[0] <== proofType;
    eq3.in[1] <== 3;
    
    signal sum <== eq1.out + eq2.out + eq3.out;
    
    // Should be exactly 1
    component check = IsEqual();
    check.in[0] <== sum;
    check.in[1] <== 1;
    
    isValid <== check.out;
}

component main = TestSimple();