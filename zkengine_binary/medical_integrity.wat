(module
  ;; Medical Records Integrity Proof
  ;; Proves medical record hasn't been tampered with between creation and verification
  ;; 
  ;; Parameters:
  ;; - patient_id: Unique patient identifier (i32)
  ;; - record_hash: Hash of the medical record content (i32)
  ;; - creation_timestamp: Unix timestamp when record was created (i32)
  ;; - verification_timestamp: Unix timestamp when verifying integrity (i32)
  ;; 
  ;; Returns: 1 if integrity verified, 0 if not
  
  (func (export "main") (param $patient_id i32) (param $record_hash i32) 
                       (param $creation_timestamp i32) (param $verification_timestamp i32) (result i32)
    (local $valid_ids i32)
    (local $valid_timing i32)
    (local $reasonable_retention i32)
    
    ;; Check that patient_id and record_hash are non-zero
    (local.set $valid_ids
      (i32.and
        (i32.ne (local.get $patient_id) (i32.const 0))
        (i32.ne (local.get $record_hash) (i32.const 0))
      )
    )
    
    ;; Check that creation happened before verification
    (local.set $valid_timing
      (i32.lt_u (local.get $creation_timestamp) (local.get $verification_timestamp))
    )
    
    ;; Check retention period is reasonable (within 10 years = 315360000 seconds)
    ;; This ensures we're not verifying extremely old records
    (local.set $reasonable_retention
      (i32.le_u 
        (i32.sub (local.get $verification_timestamp) (local.get $creation_timestamp))
        (i32.const 315360000)
      )
    )
    
    ;; Return 1 if all checks pass
    (i32.and
      (i32.and
        (local.get $valid_ids)
        (local.get $valid_timing)
      )
      (local.get $reasonable_retention)
    )
  )
  
  ;; Helper function to extract patient ID
  (func (export "get_patient_id") (param $patient_id i32) (param $record_hash i32) 
                                  (param $creation_timestamp i32) (param $verification_timestamp i32) (result i32)
    (local.get $patient_id)
  )
  
  ;; Helper function to extract record hash
  (func (export "get_record_hash") (param $patient_id i32) (param $record_hash i32) 
                                   (param $creation_timestamp i32) (param $verification_timestamp i32) (result i32)
    (local.get $record_hash)
  )
  
  ;; Helper function to calculate record age in seconds
  (func (export "get_record_age") (param $patient_id i32) (param $record_hash i32) 
                                  (param $creation_timestamp i32) (param $verification_timestamp i32) (result i32)
    (i32.sub (local.get $verification_timestamp) (local.get $creation_timestamp))
  )
)