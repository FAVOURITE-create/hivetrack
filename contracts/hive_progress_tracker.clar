;; HiveTrack DAO Progress Tracker
;; A decentralized tool for transparent community progress tracking on the Stacks blockchain

;; Error Codes
(define-constant ERR_UNAUTHORIZED u401)      ;; Unauthorized access attempt
(define-constant ERR_MEMBER_NOT_FOUND u402)  ;; Member does not exist
(define-constant ERR_MEMBER_ALREADY_EXISTS u403)  ;; Member already registered
(define-constant ERR_INVALID_PROGRESS_ENTRY u404)  ;; Invalid progress entry

;; Contract Owner
(define-data-var contract-owner principal tx-sender)

;; DAO Members Map
;; Tracks registered members with their details
(define-map dao-members 
  principal 
  {
    is-active: bool,
    joined-at: uint,
    member-type: (string-ascii 20)  ;; Added member type (e.g., contributor, core)
  }
)

;; Progress Entry Map
;; Tracks progress entries with comprehensive details
(define-map progress-entries 
  uint 
  {
    contributor: principal,
    description: (string-utf8 500),
    category: (string-ascii 50),
    timestamp: uint,
    proof-link: (optional (string-utf8 255)),
    tags: (list 5 (string-ascii 20))  ;; Added tags for better categorization
  }
)

;; Progress Counter
(define-data-var total-progress-entries uint u0)

;; Authorization Check: Ensures only contract owner can perform admin actions
(define-private (is-contract-owner (sender principal))
  (is-eq sender (var-get contract-owner))
)

;; Register a new DAO member with optional member type
(define-public (register-member (member-type (string-ascii 20)))
  (let 
    (
      (sender tx-sender)
    )
    ;; Validate member type
    (asserts! (or 
      (is-eq member-type "contributor")
      (is-eq member-type "core")
    ) (err ERR_INVALID_PROGRESS_ENTRY))

    ;; Ensure only contract owner can register
    (asserts! (is-contract-owner sender) (err ERR_UNAUTHORIZED))
    
    ;; Check if member already exists
    (asserts! (is-none (map-get? dao-members sender)) (err ERR_MEMBER_ALREADY_EXISTS))
    
    ;; Register new member
    (map-set dao-members 
      sender 
      {
        is-active: true, 
        joined-at: block-height,
        member-type: member-type
      }
    )
    (ok true)
  )
)

;; Enhanced member check with type
(define-read-only (is-member-of-type (user principal) (expected-type (string-ascii 20)))
  (match (map-get? dao-members user)
    member (and 
      (get is-active member) 
      (is-eq (get member-type member) expected-type)
    )
    false
  )
)

;; Check if a principal is a registered active DAO member
(define-read-only (is-member (user principal))
  (match (map-get? dao-members user)
    member (get is-active member)
    false
  )
)

;; Log progress entry with additional validation
(define-public (log-progress 
  (description (string-utf8 500)) 
  (category (string-ascii 50))
  (proof-link (optional (string-utf8 255)))
  (tags (list 5 (string-ascii 20)))
)
  (let 
    (
      (sender tx-sender)
      (entry-id (var-get total-progress-entries))
    )
    ;; Validate that sender is a registered active member
    (asserts! (is-member sender) (err ERR_UNAUTHORIZED))
    
    ;; Validate description and category
    (asserts! (and 
      (> (len description) u0) 
      (<= (len description) u500)
    ) (err ERR_INVALID_PROGRESS_ENTRY))
    
    (asserts! (and 
      (> (len category) u0) 
      (<= (len category) u50)
    ) (err ERR_INVALID_PROGRESS_ENTRY))
    
    ;; Validate tags
    (asserts! (<= (len tags) u5) (err ERR_INVALID_PROGRESS_ENTRY))
    
    ;; Optional: Validate proof link if provided
    (match proof-link 
      link (asserts! (<= (len link) u255) (err ERR_INVALID_PROGRESS_ENTRY))
      true
    )
    
    ;; Create progress entry
    (map-set progress-entries 
      entry-id 
      {
        contributor: sender,
        description: description,
        category: category,
        timestamp: block-height,
        proof-link: proof-link,
        tags: tags
      }
    )
    
    ;; Increment total progress entries
    (var-set total-progress-entries (+ entry-id u1))
    
    (ok entry-id)
  )
)

;; Retrieve a specific progress entry
(define-read-only (get-progress-entry (entry-id uint))
  (map-get? progress-entries entry-id)
)

;; Get total number of progress entries
(define-read-only (get-total-progress-entries)
  (var-get total-progress-entries)
)

;; Validate URL or link structure (basic validation)
(define-private (is-valid-link (link (string-utf8 255)))
  (and 
    (> (len link) u10)  ;; Minimum length for a URL
    (or 
      (is-eq (get-at link u0 u0 u7) u"https://")
      (is-eq (get-at link u0 u0 u6) u"http://")
    )
  )
)

;; Transfer contract ownership (only current owner can do this)
(define-public (transfer-ownership (new-owner principal))
  (begin
    ;; Validate that new owner is a valid principal and not the current owner
    (asserts! (is-contract-owner tx-sender) (err ERR_UNAUTHORIZED))
    (asserts! (not (is-eq tx-sender new-owner)) (err ERR_UNAUTHORIZED))
    
    ;; Set new contract owner
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Optional: Deactivate a member (only contract owner)
(define-public (deactivate-member (member principal))
  (begin
    (asserts! (is-contract-owner tx-sender) (err ERR_UNAUTHORIZED))
    (asserts! (is-member member) (err ERR_MEMBER_NOT_FOUND))
    
    (map-set dao-members 
      member 
      (merge 
        (unwrap! (map-get? dao-members member) (err ERR_MEMBER_NOT_FOUND))
        { is-active: false }
      )
    )
    (ok true)
  )
)

;; Optional: Add link validation when logging progress
(define-public (log-progress-with-validation 
  (description (string-utf8 500)) 
  (category (string-ascii 50))
  (proof-link (optional (string-utf8 255)))
  (tags (list 5 (string-ascii 20)))
)
  (let 
    (
      (sender tx-sender)
      (entry-id (var-get total-progress-entries))
    )
    ;; Validate that sender is a registered active member
    (asserts! (is-member sender) (err ERR_UNAUTHORIZED))
    
    ;; Validate description and category
    (asserts! (and 
      (> (len description) u0) 
      (<= (len description) u500)
    ) (err ERR_INVALID_PROGRESS_ENTRY))
    
    (asserts! (and 
      (> (len category) u0) 
      (<= (len category) u50)
    ) (err ERR_INVALID_PROGRESS_ENTRY))
    
    ;; Validate tags
    (asserts! (<= (len tags) u5) (err ERR_INVALID_PROGRESS_ENTRY))
    
    ;; Optional: Validate proof link if provided
    (match proof-link 
      link (and
        (asserts! (<= (len link) u255) (err ERR_INVALID_PROGRESS_ENTRY))
        (asserts! (is-valid-link link) (err ERR_INVALID_PROGRESS_ENTRY))
      )
      true
    )
    
    ;; Create progress entry
    (map-set progress-entries 
      entry-id 
      {
        contributor: sender,
        description: description,
        category: category,
        timestamp: block-height,
        proof-link: proof-link,
        tags: tags
      }
    )
    
    ;; Increment total progress entries
    (var-set total-progress-entries (+ entry-id u1))
    
    (ok entry-id)
  )
)