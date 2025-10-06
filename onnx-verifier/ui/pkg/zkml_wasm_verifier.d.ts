/* tslint:disable */
/* eslint-disable */
/**
 * Initialize panic hook for better error messages in WASM
 */
export function init(): void;
/**
 * Utility: Compute SHA3-256 hash of data
 */
export function hash_data(data: Uint8Array): string;
/**
 * Utility: Get current timestamp
 */
export function get_timestamp(): bigint;
export class ProofData {
  free(): void;
  [Symbol.dispose](): void;
  constructor(model_hash: string, proof_hash: string, input_hash: string, output_hash: string, timestamp: bigint, verified: boolean);
  readonly model_hash: string;
  readonly proof_hash: string;
  readonly verified: boolean;
}
/**
 * WASM Verifier - validates cryptographic proofs client-side
 */
export class WasmVerifier {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Create new verifier with model hash
   */
  constructor(model_hash: string);
  /**
   * Verify proof cryptographically
   *
   * This performs:
   * 1. Model binding check (proof must be for THIS model)
   * 2. I/O integrity check (hashes must match)
   * 3. Proof validity check (verified flag from JOLT generation)
   * 4. Timestamp freshness check
   */
  verify(proof_data: ProofData, input_bytes: Uint8Array, output_bytes: Uint8Array): boolean;
  /**
   * Verify proof from JSON string
   */
  verify_json(proof_json: string, input_bytes: Uint8Array, output_bytes: Uint8Array): boolean;
  /**
   * Get verifier info
   */
  info(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init: () => void;
  readonly __wbg_proofdata_free: (a: number, b: number) => void;
  readonly proofdata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: bigint, j: number) => number;
  readonly proofdata_model_hash: (a: number) => [number, number];
  readonly proofdata_proof_hash: (a: number) => [number, number];
  readonly proofdata_verified: (a: number) => number;
  readonly __wbg_wasmverifier_free: (a: number, b: number) => void;
  readonly wasmverifier_new: (a: number, b: number) => number;
  readonly wasmverifier_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly wasmverifier_verify_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
  readonly wasmverifier_info: (a: number) => [number, number];
  readonly hash_data: (a: number, b: number) => [number, number];
  readonly get_timestamp: () => bigint;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
