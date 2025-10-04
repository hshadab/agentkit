/**
 * ONNX Model Validation Service
 * Multi-layer validation to prevent unprovable models
 */

const ort = require('onnxruntime-node');
const crypto = require('crypto');

// Model validation limits
const MODEL_LIMITS = {
  maxFileSize: 50 * 1024 * 1024,        // 50 MB
  maxParameters: 10_000_000,             // 10M params
  maxLocalInferenceMs: 5000,             // 5 seconds
  maxEstimatedProofMs: 300000,           // 5 minutes
  maxInputs: 10,
  maxOutputs: 10,
  proofTimeMultiplier: 200               // JOLT is ~200x slower than local
};

/**
 * Step 1: Basic file validation
 */
function validateFileUpload(file) {
  // Check file extension
  if (!file.originalname || !file.originalname.endsWith('.onnx')) {
    return {
      valid: false,
      error: 'File must have .onnx extension'
    };
  }

  // Check file size
  if (file.size > MODEL_LIMITS.maxFileSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxMB = (MODEL_LIMITS.maxFileSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Model too large (${sizeMB} MB > ${maxMB} MB limit)`
    };
  }

  return { valid: true };
}

/**
 * Step 2: ONNX structure validation
 */
async function validateOnnxStructure(modelBuffer) {
  try {
    console.log('  🔍 Loading ONNX model...');

    // Attempt to load model
    const session = await ort.InferenceSession.create(modelBuffer);

    // Get model metadata
    const inputs = session.inputNames;
    const outputs = session.outputNames;

    console.log(`  ✅ Model loaded: ${inputs.length} inputs, ${outputs.length} outputs`);

    // Validate input/output counts
    if (inputs.length > MODEL_LIMITS.maxInputs) {
      return {
        valid: false,
        error: `Too many inputs (${inputs.length} > ${MODEL_LIMITS.maxInputs} limit)`
      };
    }

    if (outputs.length > MODEL_LIMITS.maxOutputs) {
      return {
        valid: false,
        error: `Too many outputs (${outputs.length} > ${MODEL_LIMITS.maxOutputs} limit)`
      };
    }

    // Estimate model complexity (parameter count from file size)
    const modelSize = modelBuffer.length;
    const estimatedParams = Math.floor(modelSize / 4); // Assuming float32

    console.log(`  📊 Estimated parameters: ${(estimatedParams / 1000000).toFixed(2)}M`);

    if (estimatedParams > MODEL_LIMITS.maxParameters) {
      return {
        valid: false,
        error: `Model too complex (${(estimatedParams/1000000).toFixed(1)}M > ${(MODEL_LIMITS.maxParameters/1000000).toFixed(0)}M parameters)`
      };
    }

    return {
      valid: true,
      session,
      metadata: {
        inputs,
        outputs,
        estimatedParams,
        modelSizeMB: (modelSize / (1024 * 1024)).toFixed(2)
      }
    };

  } catch (error) {
    console.error(`  ❌ ONNX load error: ${error.message}`);
    return {
      valid: false,
      error: `Invalid ONNX model: ${error.message}`
    };
  }
}

/**
 * Step 3: Inference speed test
 * Critical for estimating JOLT proof time
 */
async function testInferenceSpeed(session, testInputs) {
  try {
    console.log('  ⚡ Testing inference speed...');

    if (!testInputs || testInputs.length === 0) {
      return {
        valid: false,
        error: 'No test inputs provided for speed test'
      };
    }

    const inputName = session.inputNames[0];
    const firstTestInput = testInputs[0];

    // Convert test input to tensor
    let inputTensor;
    if (Array.isArray(firstTestInput)) {
      // Array input
      const flatArray = Array.isArray(firstTestInput[0])
        ? firstTestInput.flat()  // 2D array
        : firstTestInput;         // 1D array

      inputTensor = new ort.Tensor(
        'float32',
        new Float32Array(flatArray),
        [1, flatArray.length]
      );
    } else if (typeof firstTestInput === 'object') {
      // Object with values
      const values = Object.values(firstTestInput);
      inputTensor = new ort.Tensor(
        'float32',
        new Float32Array(values),
        [1, values.length]
      );
    } else {
      return {
        valid: false,
        error: 'Invalid test input format'
      };
    }

    // Run inference and measure time
    const start = Date.now();
    const results = await session.run({ [inputName]: inputTensor });
    const duration = Date.now() - start;

    console.log(`  ✅ Local inference: ${duration}ms`);

    // Check if local inference is too slow
    if (duration > MODEL_LIMITS.maxLocalInferenceMs) {
      return {
        valid: false,
        error: `Inference too slow (${duration}ms > ${MODEL_LIMITS.maxLocalInferenceMs}ms). JOLT would timeout.`
      };
    }

    // Estimate JOLT proof time (JOLT is ~200x slower)
    const estimatedProofMs = duration * MODEL_LIMITS.proofTimeMultiplier;

    console.log(`  📈 Estimated proof time: ~${Math.round(estimatedProofMs/1000)}s`);

    if (estimatedProofMs > MODEL_LIMITS.maxEstimatedProofMs) {
      return {
        valid: false,
        error: `Estimated proof time too long (~${Math.round(estimatedProofMs/1000)}s > ${MODEL_LIMITS.maxEstimatedProofMs/1000}s)`
      };
    }

    // Get output for validation
    const output = results[session.outputNames[0]];

    return {
      valid: true,
      localInferenceMs: duration,
      estimatedProofMs,
      outputShape: output.dims,
      outputData: Array.from(output.data).slice(0, 10) // First 10 values
    };

  } catch (error) {
    console.error(`  ❌ Inference test failed: ${error.message}`);
    return {
      valid: false,
      error: `Inference test failed: ${error.message}`
    };
  }
}

/**
 * Complete validation pipeline
 */
async function validateModel(file, testInputs) {
  console.log('\n🔍 Validating ONNX Model');
  console.log('========================');

  const results = {
    fileValidation: null,
    structureValidation: null,
    speedTest: null,
    modelHash: null,
    overall: { valid: false }
  };

  // Step 1: File validation
  console.log('\n📄 Step 1: File Validation');
  results.fileValidation = validateFileUpload(file);
  if (!results.fileValidation.valid) {
    results.overall = results.fileValidation;
    return results;
  }
  console.log(`  ✅ File valid: ${file.originalname} (${(file.size / 1024).toFixed(0)} KB)`);

  // Calculate model hash
  results.modelHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  console.log(`  🔐 Model Hash: ${results.modelHash.substring(0, 16)}...`);

  // Step 2: ONNX structure validation
  console.log('\n🏗️  Step 2: ONNX Structure Validation');
  results.structureValidation = await validateOnnxStructure(file.buffer);
  if (!results.structureValidation.valid) {
    results.overall = results.structureValidation;
    return results;
  }

  // Step 3: Inference speed test
  console.log('\n⚡ Step 3: Inference Speed Test');
  results.speedTest = await testInferenceSpeed(
    results.structureValidation.session,
    testInputs
  );
  if (!results.speedTest.valid) {
    results.overall = results.speedTest;
    return results;
  }

  // All validations passed!
  console.log('\n✅ All Validations Passed!');
  console.log('==========================');
  console.log(`Model: ${file.originalname}`);
  console.log(`Hash: ${results.modelHash}`);
  console.log(`Size: ${results.structureValidation.metadata.modelSizeMB} MB`);
  console.log(`Parameters: ~${(results.structureValidation.metadata.estimatedParams / 1000000).toFixed(2)}M`);
  console.log(`Inference: ${results.speedTest.localInferenceMs}ms`);
  console.log(`Est. Proof Time: ~${Math.round(results.speedTest.estimatedProofMs / 1000)}s`);

  results.overall = {
    valid: true,
    modelHash: results.modelHash,
    session: results.structureValidation.session,
    metadata: results.structureValidation.metadata,
    performance: {
      localInferenceMs: results.speedTest.localInferenceMs,
      estimatedProofSec: Math.round(results.speedTest.estimatedProofMs / 1000)
    }
  };

  return results;
}

module.exports = {
  validateModel,
  MODEL_LIMITS
};
