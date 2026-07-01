(********************************************************************
 * Trust Gate Protocol — TLA+ Specification
 * 
 * Formal model of the Cross-Chain Bridge Trust Gate Protocol.
 * 
 * This module defines the protocol state machine, transitions,
 * and safety invariants for cross-chain asset transfers.
 * 
 * Author: Formal Verification Subagent
 * Date: 2025
 ********************************************************************)

---------------------------------------------------------------
-- MODULE TrustGate
-- Author: Formal Verification Subagent
-- Date: 2025
-- Description: TLA+ model of the Cross-Chain Bridge Trust Gate

---------------------------------------------------------------
-- CONSTANT ChainType, TokenType, AddressType, ValidatorType
-- PARAMETER nValidations  -- number of validators (used in model)
---------------------------------------------------------------

(*
 * Trust Gate Protocol — TLA+ Model
 * 
 * This specification models a cross-chain bridge protocol with:
 *   - Lock events on source chains
 *   - Attestation from validators
 *   - Mint events on destination chains
 *   - Challenge windows
 *   - Finalization
 * 
 * Safety invariants checked:
 *   SP1: No double-spending (uniqueness of bridge events)
 *   SP2: Authorization (mint requires sufficient attestations)
 *   SP3: Conservation of value (supply tracking)
 *   SP4: No reentry (finalization requires challenge window)
 *)

------------------------------------------
-- Data types (using NATURAL, STRING for flexibility)
------------------------------------------
(* Chains are identified by natural numbers
   Events are identified by nonces
   Validators are identified by natural numbers *)

------------------------------------------
-- State Variables
------------------------------------------
(*
 * bridgeState: event -> { "LOCKED", "CONFIRMED", "FINALIZED", "RELEASED", "CHALLENGED" }
 *     Maps each bridge event to its current state.
 * 
 * attestations: set of [ event : NATURAL, validator : NATURAL ]
 *     Set of (event, validator) pairs representing attestations.
 * 
 * lockEvents: set of [ source : NATURAL, dest : NATURAL, nonce : NATURAL, 
 *                       amount : NATURAL, token : STRING, address : STRING, 
 *                       timestamp : NATURAL ]
 *     Set of lock events that have occurred.
 * 
 * mintEvents: set of [ source : NATURAL, dest : NATURAL, nonce : NATURAL,
 *                       amount : NATURAL, token : STRING, address : STRING,
 *                       timestamp : NATURAL, attestationCount : NATURAL ]
 *     Set of mint events that have been triggered.
 * 
 * challengeEvents: set of [ event : NATURAL, challenger : NATURAL, 
 *                            timestamp : NATURAL ]
 *     Set of challenge events.
 * 
 * validatorState: validator -> {"ACTIVE", "SLASHED"}
 *     Current state of each validator.
 * 
 * totalSupply: NATURAL
 *     Total token supply (constant for this model).
 * 
 * lockedAmount: NATURAL
 *     Total amount locked but not yet released.
 * 
 * bridgedAmount: NATURAL
 *     Total amount minted on destination chains.
 * 
 * finalizedAmount: NATURAL
 *     Total amount that has passed the challenge window.
 * 
 * lastLockNonce: [ chain : NATURAL ] -> NATURAL
 *     Last nonce used on each chain.
 *)

------------------------------------------
-- Constants
------------------------------------------
(* Chains, tokens, addresses, validators are handled via params *)

------------------------------------------
-- Initialization
------------------------------------------
Init == 
  /\ bridgeState = [ e \in Events |-> "LOCKED" ]
  /\ attestations = {}
  /\ lockEvents = {}
  /\ mintEvents = {}
  /\ challengeEvents = {}
  /\ validatorState = [ v \in Validators |-> "ACTIVE" ]
  /\ totalSupply = initialSupply
  /\ lockedAmount = 0
  /\ bridgedAmount = 0
  /\ finalizedAmount = 0
  /\ lastLockNonce = [ c \in Chains |-> 0 ]

------------------------------------------
-- Next State Relation (simplified)
------------------------------------------
(* 
 * Action: Lock
 * A user initiates a lock on the source chain.
 *)
ActionLock(eventNonce, sourceChain, destChain, amount, token, address, timestamp) ==
  LET newEvent == [ event |-> eventNonce,
                    source |-> sourceChain,
                    dest |-> destChain,
                    amount |-> amount,
                    token |-> token,
                    address |-> address,
                    timestamp |-> timestamp ] IN
  /\ lockEvents' = lockEvents \cup { newEvent }
  /\ bridgeState' [ newEvent ] = "LOCKED"
  /\ lockedAmount' = lockedAmount + amount
  /\ lastLockNonce' [sourceChain] = lastLockNonce[sourceChain] + 1

(*
 * Action: Attest
 * An active validator attests to a lock event.
 *)
ActionAttest(eventNonce, validatorId) ==
  LET att == [ event |-> eventNonce, validator |-> validatorId ] IN
  /\ \/ \e \in Events : bridgeState[e] = "LOCKED" /\ att.event = e.event
     \/ \e \in Events : bridgeState[e] = "CHALLENGED"
  /\ validatorState[validatorId] = "ACTIVE"
  /\ attestations' = attestations \cup { att }

(*
 * Action: Mint
 * When sufficient attestations exist, trigger mint on destination chain.
 *)
ActionMint(eventNonce, destinationChain) ==
  LET eventAttestations == { v : NATURAL | 
                              [ e |-> eventNonce, validator |-> v ] \in attestations } IN
  LET attCount == Card(eventAttestations) IN
  /\ bridgeState[eventNonce] = "LOCKED"
  /\ attCount >= quorumThreshold
  /\ mintEvents' = mintEvents \cup {
       [ source |-> (lockEventFor[eventNonce].source),
         dest |-> destinationChain,
         nonce |-> eventNonce,
         amount |-> (lockEventFor[eventNonce].amount),
         token |-> (lockEventFor[eventNonce].token),
         address |-> (lockEventFor[eventNonce].address),
         timestamp |-> (lockEventFor[eventNonce].timestamp),
         attestationCount |-> attCount ]
     }
  /\ bridgeState'[eventNonce] = "CONFIRMED"
  /\ bridgedAmount' = bridgedAmount + (lockEventFor[eventNonce].amount)

(*
 * Action: Challenge
 * A challenger submits a challenge against a confirmed transition.
 *)
ActionChallenge(eventNonce, challengerId, timestamp) ==
  /\ bridgeState[eventNonce] = "CONFIRMED"
  /\ challengeEvents' = challengeEvents \cup {
       [ event |-> eventNonce, challenger |-> challengerId, timestamp |-> timestamp ]
     }
  /\ bridgeState'[eventNonce] = "CHALLENGED"

(*
 * Action: Finalize
 * After challenge window, a transition is finalized.
 *)
ActionFinalize(eventNonce, timestamp) ==
  LET lockEvent == lockEventFor[eventNonce] IN
  LET challengeWindowElapsed == 
        (timestamp - lockEvent.timestamp) >= challengeWindowDuration IN
  /\ bridgeState[eventNonce] \in {"CONFIRMED", "CHALLENGED"}
  /\ challengeWindowElapsed
  /\ \c \in challengeEvents : c.event # eventNonce
  /\ bridgeState'[eventNonce] = "FINALIZED"
  /\ finalizedAmount' = finalizedAmount + lockEvent.amount

(*
 * Action: Release
 * After finalization, the original tokens are released.
 *)
ActionRelease(eventNonce, timestamp) ==
  /\ bridgeState[eventNonce] = "FINALIZED"
  /\ bridgeState'[eventNonce] = "RELEASED"
  /\ lockedAmount' = lockedAmount - (lockEventFor[eventNonce].amount)
  /\ finalizedAmount' = finalizedAmount - (lockEventFor[eventNonce].amount)

(*
 * Action: Slash
 * A validator is slashed for misbehavior.
 *)
ActionSlash(validatorId) ==
  /\ validatorState[validatorId] = "ACTIVE"
  /\ validatorState'[validatorId] = "SLASHED"

(*
 * Action: Tick
 * Time advances; used for challenge window tracking.
 *)
ActionTick ==
  /\ \e \in Events : 
       /\ bridgeState[e] = "CONFIRMED"
       /\ (now - eventTimestamp[e]) >= challengeWindowDuration
       => \/ \c \in challengeEvents : c.event # e 
          => /\ bridgeState'[e] = "FINALIZED"
             /\ finalizedAmount' = finalizedAmount + eventAmount[e]
          /\ bridgeState'[e] = "CHALLENGED"

(*
 * The next-state relation is the disjunction of all actions.
 *)
Next == 
  \/ \e \in Events, s \in Chains, d \in Chains, a \in NATURAL, t \in TokenType, 
       addr \in AddressType, ts \in NATURAL :
         /\ \l \in lockEvents : l.event # e
         \/ ActionLock(e, s, d, a, t, addr, ts)
  \/ \e \in Events, v \in Validators :
         \/ ActionAttest(e, v)
  \/ \e \in Events, d \in Chains :
         \/ ActionMint(e, d)
  \/ \e \in Events, c \in AddressType, ts \in NATURAL :
         \/ ActionChallenge(e, c, ts)
  \/ \e \in Events, ts \in NATURAL :
         \/ ActionFinalize(e, ts)
  \/ \e \in Events :
         \/ ActionRelease(e, now)
  \/ \v \in Validators :
         \/ ActionSlash(v)
  \/ ActionTick

(*
 * Enablement conditions
 *)
EnActionLock == \e \in Events : \l \in lockEvents : l.event # e
EnActionAttest == \e \in Events : bridgeState[e] \in {"LOCKED", "CHALLENGED"}
EnActionMint == \e \in Events : 
                  bridgeState[e] = "LOCKED" 
                  /\ Card({v : NATURAL | [e2 |-> e, validator |-> v] \in attestations}) >= quorumThreshold
EnActionChallenge == \e \in Events : bridgeState[e] = "CONFIRMED"
EnActionFinalize == \e \in Events : bridgeState[e] \in {"CONFIRMED", "CHALLENGED"}
                                   /\ (now - eventTimestamp[e]) >= challengeWindowDuration
                                   /\ \c \in challengeEvents : c.event # e
EnActionRelease == \e \in Events : bridgeState[e] = "FINALIZED"

------------------------------------------
-- Fairness (strong fairness on each action class)
------------------------------------------
WF_vars(Next) == 
  \A a \in Actions : SF_vars(a)

------------------------------------------
-- Helper Definitions
------------------------------------------
Events == 
  { e.nonce : NATURAL | e \in lockEvents }

lockEventFor[event] ==
  [ l \in lockEvents : l.event = event ]!

eventTimestamp[event] ==
  lockEventFor[event].timestamp

eventAmount[event] ==
  lockEventFor[event].amount

------------------------------------------
-- Safety Invariants
------------------------------------------

(* SP1: No double-spending — each lock event maps to at most one mint *)
SP1_NoDoubleSpend ==
  \forall e1, e2 \in Events :
    /\ bridgeState[e1] \in {"CONFIRMED", "FINALIZED", "RELEASED"}
    /\ bridgeState[e2] \in {"CONFIRMED", "FINALIZED", "RELEASED"}
    => e1 = e2

(* SP2: Authorization — mint requires sufficient attestations *)
SP2_Authorization ==
  \forall e \in Events :
    bridgeState[e] = "CONFIRMED" => 
      Card({v : NATURAL | [e2 |-> e, validator |-> v] \in attestations}) >= quorumThreshold

(* SP3: Conservation of value — supply is conserved *)
SP3_Conservation ==
  /\ totalSupply >= lockedAmount + bridgedAmount + finalizedAmount
  /\ lockedAmount >= 0
  /\ bridgedAmount >= 0
  /\ finalizedAmount >= 0

(* SP4: No reentry — finalization requires challenge window *)
SP4_NoReentry ==
  \forall e \in Events :
    bridgeState[e] = "FINALIZED" => 
      \forall ts < eventTimestamp[e] + challengeWindowDuration :
        bridgeState' [e] # "FINALIZED"

------------------------------------------
-- Property: All state transitions are well-defined
------------------------------------------
WellDefined ==
  /\ \e \in Events : bridgeState[e] \in {"LOCKED", "CONFIRMED", "CHALLENGED", "FINALIZED", "RELEASED"}
  /\ \v \in Validators : validatorState[v] \in {"ACTIVE", "SLASHED"}

------------------------------------------
-- Spec: Initial condition & Next relation & Fairness
------------------------------------------
Spec == Init /\ [][Next]_vars /\ WF_vars(Next)

THEOREM Spec => []SP1_NoDoubleSpend
THEOREM Spec => []SP2_Authorization
THEOREM Spec => []SP3_Conservation
THEOREM Spec => []SP4_NoReentry

]
