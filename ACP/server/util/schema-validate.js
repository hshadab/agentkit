import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

function loadSchema(file) {
  try {
    const p = path.resolve(process.cwd(), file);
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Optional validators; if schema files are missing, validators are no-ops
const delegateBundle = loadSchema('deployments/schema.delegate_payment_schema.json')
  || loadSchema('ACP/spec/schema-cache/schema.delegate_payment_schema.json')
  || null;

const checkoutBundle = loadSchema('deployments/schema.agentic_checkout.json')
  || loadSchema('ACP/spec/schema-cache/schema.agentic_checkout.json')
  || null;

let validateDelegate = null;
let validateCheckoutCreate = null;

if (delegateBundle && delegateBundle.$defs?.DelegatePaymentRequest) {
  validateDelegate = ajv.compile({
    $id: 'DelegatePaymentRequest',
    ...delegateBundle.$defs.DelegatePaymentRequest,
  });
}

if (checkoutBundle && checkoutBundle.$defs?.CheckoutSessionCreateRequest) {
  validateCheckoutCreate = ajv.compile({
    $id: 'CheckoutSessionCreateRequest',
    ...checkoutBundle.$defs.CheckoutSessionCreateRequest,
  });
}

export function validateOrNull(validator, data) {
  if (!validator) return { ok: true };
  const ok = validator(data);
  return ok ? { ok: true } : { ok: false, errors: validator.errors };
}

export { validateDelegate, validateCheckoutCreate };

