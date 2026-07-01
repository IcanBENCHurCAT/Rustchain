# Cross-Chain Bridge Trust Gate Protocol — Formal Specification

**Version:** 1.0.0
**Status:** Draft — Subject to formal verification
**Repository:** agora-protocols (phantom repo — specification created from bounty description)

---

## 1. Overview

The **Cross-Chain Bridge Trust Gate Protocol** is a security layer that mediates
asset transfers between independently-operating blockchains. It operates as a
trusted gatekeeper that validates cross-chain events before allowing corresponding
state transitions on the destination chain.

The protocol enforces five core invariants:

1. **No Double-Spending:** A token locked on Chain A cannot be minted more than
   once on Chain B.
2. **Atomicity:** Either the lock-and-mint sequence completes fully, or no state
   changes occur.
3. **Authorization:** Only authorized bridge operators may trigger cross-chain
   transitions.
4. **Finality:** Once a transition is confirmed, it cannot be reverted except via
   explicitly-defined emergency slashing conditions.
5. **Conservation of Value:** Total supply across all chains is preserved
   (lock + mint = burn + release).

---

## 2. Protocol Architecture

### 2.1 Chain Roles

| Role | Description |
|------|-------------|
| **Source Chain** | Chain where the original asset exists |
| **Destination Chain** | Chain where the bridged asset is minted |
| **Trust Gate** | The mediator protocol that validates transitions |
| **Bridge Operator** | Authorized entity that can propose/confirm transitions |
| **Validator Set** | Distributed validators that attest to source-chain events |

### 2.2 State Machine

```
                    ┌─────────┐
     lock()        │         │   mint()
   ┌──────────────►│  LOCKED ├───────────────┐
   │                └─────────┘               │
   │                                          ▼
   │                              ┌───────────┐
   │                              │  CONFIRMED│
   │                              └─────┬─────┘
   │                                    │ release() / burn()
   │                                    ▼
   │                              ┌───────────┐
   │                              │  FINALIZED│
   │                              └───────────┘
   │                                    │
   │   slashing / emergency            │
   │   release ─────────────────────────┘
   ▼
 ┌───────────┐
 │  RELEASED │
 └───────────┘
```

### 2.3 Transaction Lifecycle

1. **LOCK** — User locks tokens in escrow on source chain. Trust Gate records
   `LockEvent(user, amount, token, nonce)`.
2. **ATTEST** — Validator set observes the lock and produces attestations.
3. **MINT** — Trust Gate verifies attestations, then triggers mint on
   destination chain. State becomes `CONFIRMED`.
4. **FINALIZE** — After a challenge window (e.g., 7 epochs), transition
   becomes immutable.
5. **BURN/RELEASE** — User burns bridged tokens on destination chain and
   releases original tokens on source chain.

---

## 3. Cryptographic Primitives

### 3.1 Event Hashing
```
event_hash = SHA-256(source_chain_id || destination_chain_id || user_address || 
                      amount || token_address || nonce || timestamp)
```

### 3.2 Attestation Threshold
- Let N = number of validators
- Required attestations: ⌈(2/3)N⌉ + 1 (supermajority)
- Each attestation: `Signature(private_key_i, event_hash)`
- BLS signature aggregation for efficiency

### 3.3 Challenge Window
- Duration: T_challenge epochs
- Any party may challenge a confirmed transition within this window
- Challenge requires bonding a fraction (e.g., 5%) of the transferred value

---

## 4. Formal Properties

### 4.1 Safety Properties

**SP1 (Uniqueness):** Every non-null lock event on a source chain maps to
at most one mint event on any destination chain.

**SP2 (Authorization):** A mint event may only be triggered if the Trust Gate
has verified ⌈(2/3)N⌉ + 1 attestations for the corresponding lock event.

**SP3 (Conservation):** For any valid sequence of transitions, the total token
supply across all chains is conserved:

```
Σ(initial_supply) = Σ(current_locked) + Σ(current_bridged) + Σ(current_burned)
```

**SP4 (No Reentry):** A transition cannot be finalized until its challenge
window has elapsed and no valid challenge was submitted.

### 4.2 Liveness Properties

**LP1 (Progress):** If a valid lock event occurs and ⌈(2/3)N⌉ + 1 validators
attest within the attestation window, then a mint will eventually be triggered.

**LP2 (Liveness of Validators):** More than ⌈N/3⌉ validators remain active and
honest at all times (slashing removes misbehaving validators).

**LP3 (Timeliness):** Every finalized transition is finalized within
bounded time (challenge window + finalization delay).

---

## 5. Failure Modes

### 5.1 Byzantine Validators
- Up to ⌊(N-1)/3⌋ validators may collude to create false attestations.
- The 2/3+1 threshold ensures any false attestation set will be detected if
  the honest minority submits evidence.

### 5.2 Network Partitions
- During a partition, the Trust Gate cannot reach consensus.
- Mitigation: multi-hop validation across independent validator subsets.

### 5.3 Slashing Conditions
A validator is slashed and removed if:
- Two attestations for conflicting events share a key.
- An attestation is submitted for a non-existent lock event.
- A validator withholds attestation for > T_withhold epochs.

### 5.4 Oracle Failure
If the source-chain oracle fails:
- The Trust Gate cannot verify new lock events.
- Existing confirmed transitions remain valid.
- New transitions are blocked until oracle recovers.

---\n
## 6. Trust Model

| Component | Trust Assumption |
|-----------|-----------------|
| Validators | Honest ≥ 2/3 of total stake |
| Source Chain Oracle | Honest and available |
| Destination Chain | Accepts Trust Gate signatures |
| Challenge Mechanism | Participants are incentivized to challenge |
| Governance | 2/3+1 supermajority can upgrade protocol parameters |

---

## 7. Compliance with Formal Verification Standards

This specification targets verification using:
- **TLA+**: For state-machine modeling and invariant checking
- **Coq**: For mathematical proof of safety properties
- **QuickCheck/PropCheck**: For property-based testing of invariants

Verification scope:
1. State-machine transitions satisfy SP1–SP4
2. Validator attestation threshold satisfies Byzantine fault tolerance
3. Challenge window enforcement satisfies SP4
