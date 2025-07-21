(module
  ;; AI Prediction Commitment Proof
  ;; Proves a prediction was committed before knowing the outcome
  ;; 
  ;; Parameters:
  ;; - prompt_hash: Hash of the AI prompt (i32)
  ;; - response_hash: Hash of the AI response (i32)
  ;; - commitment_timestamp: Unix timestamp when committed (i32)
  ;; - reveal_timestamp: Unix timestamp when revealed (i32)
  ;; 
  ;; Returns: 1 if valid commitment (committed before reveal), 0 if not
  
  (func (export "main") (param $prompt_hash i32) (param $response_hash i32) 
                       (param $commitment_timestamp i32) (param $reveal_timestamp i32) (result i32)
    (local $valid_hashes i32)
    (local $valid_timing i32)
    (local $reasonable_timeframe i32)
    
    ;; Check that both hashes are non-zero and different
    (local.set $valid_hashes
      (i32.and
        (i32.and
          (i32.ne (local.get $prompt_hash) (i32.const 0))
          (i32.ne (local.get $response_hash) (i32.const 0))
        )
        (i32.ne (local.get $prompt_hash) (local.get $response_hash))
      )
    )
    
    ;; Check that commitment happened before reveal
    (local.set $valid_timing
      (i32.lt_u (local.get $commitment_timestamp) (local.get $reveal_timestamp))
    )
    
    ;; Check that timeframe is reasonable (within 30 days = 2592000 seconds)
    ;; This prevents ancient commitments from being revealed
    (local.set $reasonable_timeframe
      (i32.le_u 
        (i32.sub (local.get $reveal_timestamp) (local.get $commitment_timestamp))
        (i32.const 2592000)
      )
    )
    
    ;; Return 1 if all checks pass
    (i32.and
      (i32.and
        (local.get $valid_hashes)
        (local.get $valid_timing)
      )
      (local.get $reasonable_timeframe)
    )
  )
  
  ;; Helper function to extract prompt hash
  (func (export "get_prompt_hash") (param $prompt_hash i32) (param $response_hash i32) 
                                  (param $commitment_timestamp i32) (param $reveal_timestamp i32) (result i32)
    (local.get $prompt_hash)
  )
  
  ;; Helper function to extract response hash
  (func (export "get_response_hash") (param $prompt_hash i32) (param $response_hash i32) 
                                    (param $commitment_timestamp i32) (param $reveal_timestamp i32) (result i32)
    (local.get $response_hash)
  )
  
  ;; Helper function to extract time difference
  (func (export "get_time_diff") (param $prompt_hash i32) (param $response_hash i32) 
                                (param $commitment_timestamp i32) (param $reveal_timestamp i32) (result i32)
    (i32.sub (local.get $reveal_timestamp) (local.get $commitment_timestamp))
  )
)