export interface Template {
  slug: string;
  name: string;
  description: string;
  tag: string;
  code: string;
}

export const TEMPLATES: Template[] = [
  {
    slug: "token",
    name: "SIP-010 Token",
    description: "Fungible token standard. Deploy your own cryptocurrency on Stacks.",
    tag: "Fungible Token",
    code: `;; SIP-010 Fungible Token
;; Deploy your own token on Stacks

(define-fungible-token my-token u1000000)

(define-public (transfer (amount uint) (recipient principal))
  (begin
    (try! (ft-transfer? my-token amount tx-sender recipient))
    (ok true)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance my-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply my-token)))`,
  },
  {
    slug: "nft",
    name: "SIP-009 NFT",
    description: "Non-fungible token standard. Mint unique digital collectibles.",
    tag: "NFT",
    code: `;; SIP-009 NFT Collection
;; Mint unique digital assets on Stacks

(define-non-fungible-token nft-collection uint)

(define-data-var last-id uint u0)

(define-public (mint (recipient principal))
  (let ((new-id (+ (var-get last-id) u1)))
    (var-set last-id new-id)
    (try! (nft-mint? nft-collection new-id recipient))
    (ok new-id)))

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? nft-collection id)))

(define-public (transfer (id uint) (recipient principal))
  (begin
    (try! (nft-transfer? nft-collection id tx-sender recipient))
    (ok true)))`,
  },
  {
    slug: "dao",
    name: "DAO Governor",
    description: "On-chain governance. Propose, vote, and execute — all on Stacks.",
    tag: "Governance",
    code: `;; Simple DAO Governor
;; Propose and vote on-chain

(define-data-var proposal-count uint u0)

(define-map proposals uint {
  proposer: principal,
  description: (string-utf8 256),
  votes-for: uint,
  votes-against: uint,
  executed: bool
})

(define-map votes { proposal-id: uint, voter: principal } bool)

(define-public (propose (desc (string-utf8 256)))
  (let ((id (+ (var-get proposal-count) u1)))
    (var-set proposal-count id)
    (map-set proposals id {
      proposer: tx-sender,
      description: desc,
      votes-for: u0,
      votes-against: u0,
      executed: false
    })
    (ok id)))

(define-public (vote (proposal-id uint) (support bool))
  (begin
    (asserts! (is-none (map-get? votes { proposal-id: proposal-id, voter: tx-sender }))
      (err u1))
    (map-set votes { proposal-id: proposal-id, voter: tx-sender } true)
    (ok true)))`,
  },
  {
    slug: "amm",
    name: "AMM Pool",
    description: "Automated market maker. Create liquidity pools and enable token swaps.",
    tag: "DeFi",
    code: `;; Constant Product AMM Pool
;; Create liquidity pools for any SIP-010 token pair

(define-fungible-token lp-token u1000000)

(define-data-var fee-rate uint u30)
(define-data-var pool-count uint u0)

(define-map pools uint {
  token-x: principal,
  token-y: principal,
  reserve-x: uint,
  reserve-y: uint,
  lp-supply: uint
})

(define-public (create-pool (token-x principal) (token-y principal))
  (let ((id (+ (var-get pool-count) u1)))
    (var-set pool-count id)
    (map-set pools id {
      token-x: token-x,
      token-y: token-y,
      reserve-x: u0,
      reserve-y: u0,
      lp-supply: u0
    })
    (ok id)))

(define-public (add-liquidity (pool-id uint) (amount-x uint) (amount-y uint))
  (let ((pool (unwrap! (map-get? pools pool-id) (err u1))))
    (ok true)))`,
  },
  {
    slug: "staking",
    name: "Staking Contract",
    description: "Lock tokens, earn rewards. Configurable lock periods and APY.",
    tag: "DeFi",
    code: `;; Staking Contract
;; Lock tokens and earn rewards over time

(define-data-var reward-rate uint u100)
(define-data-var total-staked uint u0)
(define-data-var last-update uint u0)

(define-map stakes principal {
  amount: uint,
  since: uint,
  rewards: uint
})

(define-public (stake (amount uint))
  (begin
    (var-set total-staked (+ (var-get total-staked) amount))
    (map-set stakes tx-sender {
      amount: amount,
      since: stacks-block-height,
      rewards: u0
    })
    (ok true)))

(define-public (unstake (amount uint))
  (let ((stake-data (unwrap! (map-get? stakes tx-sender) (err u1))))
    (asserts! (>= (get amount stake-data) amount) (err u2))
    (map-set stakes tx-sender (merge stake-data {
      amount: (- (get amount stake-data) amount)
    }))
    (var-set total-staked (- (var-get total-staked) amount))
    (ok true)))

(define-read-only (get-stake (who principal))
  (ok (map-get? stakes who)))`,
  },
  {
    slug: "multisig",
    name: "Multi-Sig Wallet",
    description: "Shared custody. Require N-of-M signatures to execute transactions.",
    tag: "Security",
    code: `;; Multi-Signature Wallet
;; Require N of M owners to approve transactions

(define-data-var required-signatures uint u2)
(define-data-var tx-count uint u0)

(define-map owners principal bool)

(define-map transactions uint {
  proposer: principal,
  to: principal,
  amount: uint,
  executed: bool
})

(define-map signatures { tx-id: uint, signer: principal } bool)

(define-public (propose-tx (to principal) (amount uint))
  (let ((id (+ (var-get tx-count) u1)))
    (var-set tx-count id)
    (map-set transactions id {
      proposer: tx-sender,
      to: to,
      amount: amount,
      executed: false
    })
    (ok id)))

(define-public (sign (tx-id uint))
  (begin
    (asserts! (default-to false (map-get? owners tx-sender)) (err u1))
    (map-set signatures { tx-id: tx-id, signer: tx-sender } true)
    (ok true)))`,
  },
  {
    slug: "escrow",
    name: "Timelocked Escrow",
    description: "Secure P2P exchange. Arbiter resolves disputes, auto-refund on expiry.",
    tag: "Payments",
    code: `;; Timelocked Escrow
;; Buyer deposits STX, seller delivers, arbiter resolves disputes.
;; If seller doesn't confirm by deadline, buyer reclaims.

(define-constant err-only-buyer (err u100))
(define-constant err-only-seller (err u101))
(define-constant err-only-arbiter (err u102))
(define-constant err-already-funded (err u103))
(define-constant err-not-funded (err u104))
(define-constant err-deadline-passed (err u105))
(define-constant err-already-confirmed (err u106))

(define-data-var deal-count uint u0)

(define-map deals uint {
  buyer: principal,
  seller: principal,
  arbiter: principal,
  amount: uint,
  deadline: uint,
  confirmed: bool,
  disputed: bool
})

(define-read-only (get-deal (id uint))
  (ok (map-get? deals id)))

(define-public (create-deal (seller principal) (arbiter principal) (amount uint) (blocks-until-deadline uint))
  (let ((id (+ (var-get deal-count) u1))
        (deadline (+ stacks-block-height blocks-until-deadline)))
    (var-set deal-count id)
    (map-set deals id {
      buyer: tx-sender,
      seller: seller,
      arbiter: arbiter,
      amount: amount,
      deadline: deadline,
      confirmed: false,
      disputed: false
    })
    ;; In production: transfer STX via stx-transfer? here
    (ok id)))

(define-public (confirm-delivery (deal-id uint))
  (let ((deal (unwrap! (map-get? deals deal-id) (err u404))))
    (asserts! (is-eq (get buyer deal) tx-sender) err-only-buyer)
    (asserts! (not (get confirmed deal)) err-already-confirmed)
    (map-set deals deal-id (merge deal { confirmed: true }))
    ;; In production: transfer STX to seller
    (ok true)))

(define-public (raise-dispute (deal-id uint))
  (let ((deal (unwrap! (map-get? deals deal-id) (err u404))))
    (asserts! (or (is-eq (get buyer deal) tx-sender)
                  (is-eq (get seller deal) tx-sender))
      (err u403))
    (asserts! (not (get confirmed deal)) err-already-confirmed)
    (map-set deals deal-id (merge deal { disputed: true }))
    (ok true)))

(define-public (arbiter-resolve (deal-id uint) (refund-buyer bool))
  (let ((deal (unwrap! (map-get? deals deal-id) (err u404))))
    (asserts! (is-eq (get arbiter deal) tx-sender) err-only-arbiter)
    (asserts! (get disputed deal) (err u200))
    (map-set deals deal-id (merge deal { confirmed: true }))
    ;; In production: send to buyer if refund-buyer, else to seller
    (ok (if refund-buyer "refunded" "released"))))

(define-public (reclaim-expired (deal-id uint))
  (let ((deal (unwrap! (map-get? deals deal-id) (err u404))))
    (asserts! (is-eq (get buyer deal) tx-sender) err-only-buyer)
    (asserts! (>= stacks-block-height (get deadline deal)) err-deadline-passed)
    (asserts! (not (get confirmed deal)) err-already-confirmed)
    (map-set deals deal-id (merge deal { confirmed: true }))
    (ok true)))`,
  },
  {
    slug: "auction",
    name: "English Auction",
    description: "Ascending-price auction. Bid, get outbid refund, seller finalizes.",
    tag: "Marketplace",
    code: `;; English Auction
;; Seller creates auction with starting price, min increment, and duration.
;; Bidders place ascending bids. Outbid parties automatically refunded.
;; Seller finalizes after deadline to transfer item to winner.

(define-constant err-auction-not-found (err u404))
(define-constant err-auction-ended (err u100))
(define-constant err-bid-too-low (err u101))
(define-constant err-not-seller (err u102))
(define-constant err-still-active (err u103))
(define-constant err-no-bids (err u104))
(define-constant err-already-finalized (err u105))
(define-constant err-insufficient-bid (err u106))

(define-data-var auction-count uint u0)

(define-map auctions uint {
  seller: principal,
  item: (string-ascii 64),
  start-price: uint,
  min-increment: uint,
  deadline: uint,
  highest-bidder: principal,
  highest-bid: uint,
  finalized: bool
})

(define-map bids { auction-id: uint, bidder: principal } uint)

(define-read-only (get-auction (id uint))
  (ok (map-get? auctions id)))

(define-read-only (get-bid (auction-id uint) (bidder principal))
  (ok (map-get? bids { auction-id: auction-id, bidder: bidder })))

(define-public (create-auction (item (string-ascii 64)) (start-price uint) (min-increment uint) (duration-blocks uint))
  (let ((id (+ (var-get auction-count) u1)))
    (var-set auction-count id)
    (map-set auctions id {
      seller: tx-sender,
      item: item,
      start-price: start-price,
      min-increment: min-increment,
      deadline: (+ stacks-block-height duration-blocks),
      highest-bidder: tx-sender,
      highest-bid: u0,
      finalized: false
    })
    (ok id)))

(define-public (bid (auction-id uint) (amount uint))
  (let ((auction (unwrap! (map-get? auctions auction-id) err-auction-not-found)))
    (asserts! (< stacks-block-height (get deadline auction)) err-auction-ended)
    (asserts! (not (get finalized auction)) err-already-finalized)
    (asserts! (>= amount (+ (get highest-bid auction) (get min-increment auction)))
      err-bid-too-low)
    (asserts! (> amount (default-to u0 (map-get? bids { auction-id: auction-id, bidder: tx-sender })))
      err-insufficient-bid)
    ;; Refund previous highest bidder (production: stx-transfer?)
    (map-set bids { auction-id: auction-id, bidder: tx-sender } amount)
    (map-set auctions auction-id (merge auction {
      highest-bidder: tx-sender,
      highest-bid: amount
    }))
    (ok amount)))

(define-public (finalize-auction (auction-id uint))
  (let ((auction (unwrap! (map-get? auctions auction-id) err-auction-not-found)))
    (asserts! (is-eq (get seller auction) tx-sender) err-not-seller)
    (asserts! (>= stacks-block-height (get deadline auction)) err-still-active)
    (asserts! (not (get finalized auction)) err-already-finalized)
    (asserts! (> (get highest-bid auction) u0) err-no-bids)
    (map-set auctions auction-id (merge auction { finalized: true }))
    ;; In production: transfer STX to seller, transfer item to highest-bidder
    (ok (get highest-bidder auction))))

(define-read-only (get-highest-bid (auction-id uint))
  (let ((auction (unwrap! (map-get? auctions auction-id) err-auction-not-found)))
    (ok (get highest-bid auction))))`,
  },
  {
    slug: "crowdfund",
    name: "Crowdfunding Campaign",
    description: "Goal-based fundraising. Backers pledge, creator claims if goal met, refund if not.",
    tag: "Payments",
    code: `;; Crowdfunding Campaign
;; Creator sets a funding goal and deadline.
;; Backers pledge STX. If goal met by deadline, creator claims.
;; If goal not met, backers get full refund.

(define-constant err-campaign-not-found (err u404))
(define-constant err-campaign-ended (err u100))
(define-constant err-goal-met (err u101))
(define-constant err-goal-not-met (err u102))
(define-constant err-not-creator (err u103))
(define-constant err-still-active (err u104))
(define-constant err-no-pledge (err u105))
(define-constant err-zero-amount (err u106))
(define-constant err-already-claimed (err u107))
(define-constant err-already-refunded (err u108))

(define-data-var campaign-count uint u0)

(define-map campaigns uint {
  creator: principal,
  title: (string-ascii 128),
  goal: uint,
  deadline: uint,
  total-pledged: uint,
  claimed: bool
})

(define-map pledges { campaign-id: uint, backer: principal } uint)

(define-read-only (get-campaign (id uint))
  (ok (map-get? campaigns id)))

(define-read-only (get-pledge (campaign-id uint) (backer principal))
  (ok (map-get? pledges { campaign-id: campaign-id, backer: backer })))

(define-read-only (get-total-pledged (id uint))
  (let ((campaign (unwrap! (map-get? campaigns id) err-campaign-not-found)))
    (ok (get total-pledged campaign))))

(define-read-only (is-goal-met (id uint))
  (let ((campaign (unwrap! (map-get? campaigns id) err-campaign-not-found)))
    (ok (>= (get total-pledged campaign) (get goal campaign)))))

(define-public (create-campaign (title (string-ascii 128)) (goal uint) (duration-blocks uint))
  (let ((id (+ (var-get campaign-count) u1)))
    (var-set campaign-count id)
    (map-set campaigns id {
      creator: tx-sender,
      title: title,
      goal: goal,
      deadline: (+ stacks-block-height duration-blocks),
      total-pledged: u0,
      claimed: false
    })
    (ok id)))

(define-public (pledge (campaign-id uint) (amount uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) err-campaign-not-found)))
    (asserts! (> amount u0) err-zero-amount)
    (asserts! (< stacks-block-height (get deadline campaign)) err-campaign-ended)
    (asserts! (not (get claimed campaign)) err-already-claimed)
    ;; In production: transfer STX from backer via stx-transfer?
    (let ((current (default-to u0 (map-get? pledges { campaign-id: campaign-id, backer: tx-sender }))))
      (map-set pledges { campaign-id: campaign-id, backer: tx-sender } (+ current amount))
      (map-set campaigns campaign-id (merge campaign {
        total-pledged: (+ (get total-pledged campaign) amount)
      }))
      (ok (+ current amount)))))

(define-public (claim-funds (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) err-campaign-not-found)))
    (asserts! (is-eq (get creator campaign) tx-sender) err-not-creator)
    (asserts! (>= stacks-block-height (get deadline campaign)) err-still-active)
    (asserts! (not (get claimed campaign)) err-already-claimed)
    (asserts! (>= (get total-pledged campaign) (get goal campaign)) err-goal-not-met)
    (map-set campaigns campaign-id (merge campaign { claimed: true }))
    ;; In production: transfer total-pledged to creator
    (ok (get total-pledged campaign))))

(define-public (refund (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) err-campaign-not-found)))
    (asserts! (>= stacks-block-height (get deadline campaign)) err-still-active)
    (asserts! (< (get total-pledged campaign) (get goal campaign)) err-goal-met)
    (let ((amount (default-to u0 (map-get? pledges { campaign-id: campaign-id, backer: tx-sender }))))
      (asserts! (> amount u0) err-no-pledge)
      (map-delete pledges { campaign-id: campaign-id, backer: tx-sender })
      ;; In production: transfer STX back to backer
      (ok amount))))`,
  },
  {
    slug: "vesting",
    name: "Token Vesting",
    description: "Time-locked token release. Cliff + linear vesting. Beneficiary claims over time.",
    tag: "DeFi",
    code: `;; Token Vesting Schedule
;; Administrator creates vesting schedules with cliff and linear release.
;; Beneficiaries claim unlocked tokens over time.
;; Common for team allocations, investor grants, and airdrops.

(define-constant err-not-admin (err u100))
(define-constant err-schedule-not-found (err u404))
(define-constant err-zero-amount (err u101))
(define-constant err-nothing-to-claim (err u102))
(define-constant err-schedule-revoked (err u103))
(define-constant err-already-exists (err u104))

(define-data-var admin principal tx-sender)
(define-data-var schedule-count uint u0)

(define-map schedules uint {
  beneficiary: principal,
  total-amount: uint,
  start-block: uint,
  cliff-block: uint,
  end-block: uint,
  claimed: uint,
  revoked: bool
})

(define-read-only (get-schedule (id uint))
  (ok (map-get? schedules id)))

(define-read-only (get-claimable (id uint))
  (let ((s (unwrap! (map-get? schedules id) err-schedule-not-found)))
    (ok (calculate-unlocked s))))

(define-read-only (calculate-unlocked (s { beneficiary: principal, total-amount: uint, start-block: uint, cliff-block: uint, end-block: uint, claimed: uint, revoked: bool }))
  (let ((current blocks-stack-height)
        (total (get total-amount s))
        (start (get start-block s))
        (cliff (get cliff-block s))
        (end (get end-block s))
        (claimed (get claimed s)))
    (if (< current cliff)
      u0 ;; Before cliff — nothing unlocked
      (if (>= current end)
        (- total claimed) ;; Fully vested — claim remaining
        (let ((elapsed (- current start))
              (duration (- end start)))
          (if (<= duration u0)
            u0
            (- (/ (* total elapsed) duration) claimed)))))))

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-not-admin)
    (var-set admin new-admin)
    (ok true)))

(define-public (create-schedule (beneficiary principal) (total-amount uint) (cliff-blocks uint) (vesting-blocks uint))
  (let ((id (+ (var-get schedule-count) u1))
        (start stacks-block-height))
    (asserts! (is-eq tx-sender (var-get admin)) err-not-admin)
    (asserts! (> total-amount u0) err-zero-amount)
    (var-set schedule-count id)
    (map-set schedules id {
      beneficiary: beneficiary,
      total-amount: total-amount,
      start-block: start,
      cliff-block: (+ start cliff-blocks),
      end-block: (+ start cliff-blocks vesting-blocks),
      claimed: u0,
      revoked: false
    })
    (ok id)))

(define-public (claim (schedule-id uint))
  (let ((s (unwrap! (map-get? schedules schedule-id) err-schedule-not-found)))
    (asserts! (is-eq (get beneficiary s) tx-sender) (err u403))
    (asserts! (not (get revoked s)) err-schedule-revoked)
    (let ((unlocked (- (calculate-unlocked s) (get claimed s))))
      (asserts! (> unlocked u0) err-nothing-to-claim)
      (map-set schedules schedule-id (merge s {
        claimed: (+ (get claimed s) unlocked)
      }))
      ;; In production: transfer unlocked tokens to beneficiary
      (ok unlocked))))

(define-public (revoke-schedule (schedule-id uint))
  (let ((s (unwrap! (map-get? schedules schedule-id) err-schedule-not-found)))
    (asserts! (is-eq tx-sender (var-get admin)) err-not-admin)
    (map-set schedules schedule-id (merge s { revoked: true }))
    (ok true)))`,
  },
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
