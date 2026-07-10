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

(define-non-fungible-token nft-collection)

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
    (asserts! (map-get? votes { proposal-id: proposal-id, voter: tx-sender })
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

(define-public (create-pool (token-x (trait-reference sip-010)) (token-y (trait-reference sip-010)))
  (let ((id (+ (var-get pool-count) u1)))
    (var-set pool-count id)
    (map-set pools id {
      token-x: (contract-of token-x),
      token-y: (contract-of token-y),
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
    (try! (ft-transfer? my-token amount tx-sender (as-contract tx-sender)))
    (map-set stakes tx-sender {
      amount: amount,
      since: block-height,
      rewards: u0
    })
    (var-set total-staked (+ (var-get total-staked) amount))
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
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
