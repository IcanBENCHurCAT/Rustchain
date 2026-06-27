# Surveillance RPG — Balance Document

> **Version:** 1.0  
> **Date:** 2025-06-24  
> **Author:** Subagent Balance Analysis  
> **Scope:** All classes, enemies, economy, progression, combat systems

---

## Executive Summary

The game has significant balance issues in three areas:

1. **🔴 CRITICAL (P0):** Hacker (Netrunner Archon) is non-viable in S2–S3 (0–12% win rate). Its damage output is fundamentally insufficient for the HP pool of enemies it faces.
2. **🟠 IMPORTANT (P1):** Juggernaut's Carbon Armor combo makes it virtually unkillable while dealing top-tier damage. Ghost Protocol's 3-turn free stealth trivializes sectors.
3. **🟡 NICE-TO-HAVE (P2):** Overcharge Rail's HP cost is poorly tuned. Credit income and XP scaling are mostly adequate but need minor adjustments.

All fixes are implementation-ready with specific numbers.

---

## 1. Class Balance

### 1.1 Hacker (Netrunner Archon) — 🔴 P0: CRITICAL

**Problem:** Hacker has only 70 HP (lowest in game) and deals max 24 damage per ability (EMP Discharge). It loses to S2 Combat Mech 99% of the time and S3 enemies 88–100% of the time.

| Enemy | HP | ATK | Hacker Win Rate | Avg Damage In |
|-------|----|-----|-----------------|---------------|
| K9 Sentry (S1) | 80 | 13 | 100% | 45 |
| Combat Mech (S2) | 150 | 15 | **1%** | 65 |
| K9 Elite (S3) | 120 | 17 | **12%** | 63 |
| Warden Avatar (S3) | 150 | 20 | **0%** | — |
| Aegis Sentinel (S3) | 200 | 14 | **1%** | 68 |

**Root Cause:** Max single-target damage (24 from EMP) vs enemy power (15–20) creates a DPS deficit. The class also lacks sustain — Data Siphon heals 12–20 HP but is on 4-turn cooldown. The 70 HP pool is insufficient for the damage taken.

**Recommendations:**

| Ability | Current | → | Fixed | Rationale |
|---------|---------|---|-------|-----------|
| EMP Discharge | 16–24 dmg | → | **22–30 dmg** | +6 to each endpoint. Now competitive with Juggernaut's Seismic Stomp. |
| Firewall Breach | 10–20 dmg | → | **14–22 dmg** | +4 to each endpoint. The crit bonus (40%) now justifies lower base. |
| Data Siphon | 12–20 heal | → | **18–28 heal** | +6 to each endpoint. Better sustain. |
| Ghost Protocol | free, 3 turns | → | **5 HP cost, 2 turns** | Cost prevents spam, shorter duration. Still powerful but manageable. |
| code_injection DoT | 8/turn × 3 | → | **10/turn × 3** | +2 dmg/tick. Better value. |
| System Override | 12–18 dmg | → | **16–22 dmg** | +4 to each endpoint. |

**Alternative:** Add a new signature ability:
```json
{
  "id": "neural_burst",
  "name": "Neural Burst",
  "desc": "Overload enemy neural implant. Deals 20-28 damage and stuns for 1 turn.",
  "type": "attack",
  "minPower": 20,
  "maxPower": 28,
  "cooldown": 3,
  "cost": 0,
  "stun": 1
}
```
This gives the Hacker a high-damage, utility ability that fills the gap between System Override (12-18) and EMP Discharge (16-24).

**Expected Result:** Hacker S2 win rate vs Combat Mech rises from 1% to ~60–70%. S3 win rate vs Sentinel rises from 1% to ~40–50%.

### 1.2 Juggernaut (Aegis Juggernaut) — 🟠 P1: IMPORTANT

**Problem:** Carbon Armor (40% damage reduction for 3 turns) combined with Iron Will (heal + 15 shield) creates an "immortal" loop. In 6-turn simulation, Juggernaut took only 37–51 damage from S3 enemies while dealing 42–54 damage.

| Enemy | ATK | Avg Damage Taken | HP Remaining |
|-------|-----|------------------|--------------|
| K9 Elite | 17 | 40 | 150 |
| Warden Avatar | 20 | 51 | 137 |
| Titan | 18 | 42 | 150 |

Carbon Armor has 5-turn cooldown, Iron Will has 5-turn cooldown. In practice they chain: armor up, tank hits, heal, armor back up.

**Recommendations:**

| Ability | Current | → | Fixed | Rationale |
|---------|---------|---|-------|-----------|
| Carbon Armor | 40% dmg red × 3 turns | → | **25% dmg red × 2 turns** | Halves the effectiveness. Still useful but not game-breaking. |
| Seismic Stomp | 28–38 dmg + stun 1 | → | **25–33 dmg + stun 1** | -5 to each endpoint. Still the best single-target ability. |
| Iron Will | 12–18 heal + 15 shield | → | **12–18 heal only** | Remove shield. The heal alone is strong. |

**Rationale:** The Juggernaut is already the most durable class with 160 HP and 3% evade. Carbon Armor + Iron Will chain was creating near-invincibility. The nerf makes it strong but not unkillable.

### 1.3 Operative (Neon Streetrunner) — ✅ VERIFIED OK

**Status:** Well-balanced. 100% win rate across all enemies through S3, with reasonable damage intake.

| Enemy | HP | ATK | Operative Win | Avg HP% |
|-------|----|-----|---------------|---------|
| Combat Mech (S2) | 150 | 15 | 100% | 49% |
| Warden Avatar (S3) | 150 | 20 | 100% | 37% |
| Aegis Sentinel (S3) | 200 | 14 | 100% | 33% |

**Minor tweak recommended (P2):**

| Ability | Current | → | Fixed | Rationale |
|---------|---------|---|-------|-----------|
| Assassinate | 35–45 dmg, execute <30% | → | **25–35 dmg, execute <20%** | Reduce base dmg slightly, lower execute threshold. Execute is still powerful but doesn't trivialize S1. |

### 1.4 Gunner (Cyber-Gunner) — ✅ MOSTLY OK

**Status:** Solid middle-ground class. 96–100% win rates across all enemies.

**Issue (P1):** Overcharge Rail costs 15 HP for 30–40 damage. At 90 HP, that's 17% of your total HP for a single hit. It's effectively a double-tap (17–22 avg + 35 avg = 52 avg) but at a severe HP cost.

| Ability | Current | → | Fixed | Rationale |
|---------|---------|---|-------|-----------|
| Overcharge Rail | 30–40 dmg, costs 15 HP | → | **25–35 dmg, costs 10 HP** | Lower both damage and cost. Now roughly equivalent to using Double Tap twice with less HP risk. |
| Cover Fire | 8–12 dmg | → | **10–16 dmg** | +4 to each endpoint. Better value for its 4-turn cooldown. |

### 1.5 Hacker Ghost Protocol — 🟠 P1: IMPORTANT

**Problem:** Ghost Protocol makes the player completely undodgeable for 3 turns, free (no HP cost), 6-turn cooldown. In a game where combat is turn-based, the hacker can sit invisible for 3 full turns, then hit for 14-22 + double damage = 28-44 on decloak. This trivializes S1 and S2 content.

**Recommendations:**

| Ability | Current | → | Fixed | Rationale |
|---------|---------|---|-------|-----------|
| Ghost Protocol | free, 3 turns stealth | → | **5 HP cost, 2 turns stealth** | Costs something, shorter duration. Still excellent value. |
| Next attack bonus | double damage | → | **1.5x damage** | +50% to 50% extra. Significant but not double. |

---

## 2. Economy Balance

### 2.1 Credit Income Model

| Metric | S1 | S2 | S3 |
|--------|----|----|-----|
| Board length | 16 tiles | 20 tiles | 24 tiles |
| Combat encounters | ~6 | ~7 | ~9 |
| Avg credits/enemy | 30 | 48 | 80 |
| Credits from combat | ~180 | ~338 | ~720 |
| Safehouse bonus | ~110 | ~110 | ~110 |
| Server bonus | ~50 | ~50 | ~50 |
| **Total per run** | **~340** | **~498** | **~880** |

### 2.2 Permanent Upgrade Costs

| Category | Count | Total Cost | Avg Cost |
|----------|-------|------------|----------|
| Base upgrades | 5 | 1,175 | 235 |
| Sector 1 | 3 | 1,000 | 333 |
| Sector 2 | 3 | 1,500 | 500 |
| Sector 3 | 3 | 1,950 | 650 |
| Synergy | 4 | 2,450 | 612 |
| Endgame | 4 | 3,700 | 925 |
| **Total** | **22** | **10,775** | **490** |

### 2.3 Recommendation

| Item | Current | → | Fixed | Rationale |
|------|---------|---|-------|-----------|
| S3 credit rewards | 60–90 avg | → | **80–110 avg** | +20 avg per enemy. S3 feels expensive but not grindy. |
| Warden Boss reward | 2,000 | → | **3,000** | +1,000. Boss fight should be worthwhile. |
| Victory reward S3 | 750 (3×250) | → | **1,500** | Doubled. Completion reward needs weight. |
| Game over compensation | min(50, tiles×20) | → | **min(100, tiles×25)** | Better retry incentive. |
| Permanent upgrade costs | unchanged | → | **reduce all by 15%** | Average from 490 → 416. More achievable in fewer runs. |

---

## 3. Progression Balance

### 3.1 XP Model

| Metric | S1 | S2 | S3 |
|--------|----|----|-----|
| XP from combat | ~240 | ~437 | ~750 |
| XP to next level | 100 | 250 | 500 |
| Levels gained | ~2.4 | ~4.4 | ~7.5 |
| **Total levels per run** | — | — | **~14.3** |

### 3.2 Level-up Stat Growth (per level)
- HP: +10% of base → Gunner=9, Juggernaut=16, Operative=8.5, Hacker=7
- Power: +2 → all classes +2
- Speed: +1 → all classes +1
- Evade: +3 → all classes +3

### 3.3 Recommendation

| Item | Current | → | Fixed | Rationale |
|------|---------|---|-------|-----------|
| XP thresholds | 100, 250, 500, 1000 | → | **100, 200, 400, 800** | Reduce gaps. Level-up frequency feels better. |
| Level XP requirement | 100 flat | → | **100 + level×25** | Progressive scaling. Each level costs more than the last. |
| Juggernaut HP per level | +10% of 160 = 16 | → | **+12 flat** | 16/level is extremely fast. At level 10: +160 HP. 12 is still strong. |
| Power per level | +2 flat | → | **+1.5 flat** | Slightly slower growth. Prevents damage creep. |

---

## 4. Combat Mechanics Balance

### 4.1 Crit Chance

| Source | Value |
|--------|-------|
| Base crit chance | 10% |
| Optics upgrade | +15% → **25% total** |
| Tactical Scan buff | +50% for 2 turns → **60% total** |
| Firewalls Breach (hacker) | +40% → **50% total** |
| Crit mult (base) | 1.5x |
| Crit Gear Tuning upgrade | +0.25 → 1.75x |
| Core Access Key (perm) | +0.20 → 1.95x |

**Recommendation:** Keep as-is. Crit system is well-tuned.

### 4.2 Enemy Evasion / Dodge

| Enemy Type | Evasion | Notes |
|------------|---------|-------|
| Standard (S1–S3) | 0–10% | Fine |
| Shadow Runner (S2) | 30% | High but justifiable for "rogue" flavor |
| Operative (player) | 22% | High, balanced by 85 HP |
| Hacker (player) | 6% | Low, but hacker uses stealth instead |

**Recommendation:** No changes needed. Evasion values are fine.

### 4.3 Shield Absorption

Shield is a first-absorbtion layer that depletes before HP:
```
enemy_damage → shield absorbs → remaining goes to HP
```

| Source | Shield Value | Cooldown |
|--------|-------------|----------|
| Personal Shield Generator | 20 | passive |
| Core Shield Amplifier | 50 | passive |
| Iron Will (Juggernaut) | 15 | 5 turns |
| Shield Wall (Juggernaut) | 30 | 3 turns |
| Combat Mech (enemy) | varies | — |

**Recommendation:** Keep as-is. Shield mechanic is clear and well-integrated.

### 4.4 DoT (Venom/Poison/Bleed)

| Source | Damage | Duration | Total |
|--------|--------|----------|-------|
| Venom Blade (Operative) | 5/turn | 3 turns | 15 |
| Code Injection (Hacker) | 8/turn | 3 turns | 24 |
| Suggested (Hacker) | 10/turn | 3 turns | 30 |
| Bleed (new duelist) | 8/turn | 3 turns | 24 |
| Stacked Bleed (3x) | 24/turn | 3 turns | 72 |

**Recommendation:** Keep as-is. DoT values are appropriate. The stacked bleed (72 total) is very strong — this is the duelist's signature and fits the high-risk, high-reward fantasy.

---

## 5. Warden Boss Balance

### 5.1 Current Boss Design

| Phase | HP Range | Avg Dmg/turn to player | Key Abilities |
|-------|----------|------------------------|---------------|
| Phase 1 (>60%) | 1800–3000 | ~17 | Drone Swarm (25-40 every 2 turns) |
| Phase 2 (30-60%) | 900–1800 | ~29 | Titan Deployment (35-55+stun every 3 turns) |
| Phase 3 (<30%) | 0–900 | ~130+ | Area Denial (30-45×3 hits, EVERY TURN) |

### 5.2 Problem Analysis

The Warden fight is a **DPS race**. With best-case Juggernaut DPS (~34/turn), it takes **87 turns** to kill the Warden. In Phase 3, the player takes ~130 damage/turn — meaning a player with 160 HP dies in **1.2 turns** of Phase 3.

This makes the fight:
1. **Too long** — 87 turns is excessive for mobile play
2. **Unpredictable** — Phase 3 is essentially instant-kill with no way to survive
3. **Frustrating** — players spend 80+ turns then die to Phase 3

### 5.3 Recommendations

| Aspect | Current | → | Fixed | Rationale |
|--------|---------|---|-------|-----------|
| Boss HP | 3000 | → | **2000** | -33%. Significantly shorter fight. |
| Phase 1 threshold | >60% | → | **>50%** | Phase 1 is too long. |
| Phase 2 threshold | 30-60% | → | **20-50%** | Phase 2 is appropriate length. |
| Phase 3 threshold | <30% | → | **<20%** | Gives player more time in phases 1-2. |
| Drone Swarm (P1) | 25-40 every 2t | → | **20-32 every 3t** | -20% damage, longer period. |
| Titan Deployment (P2) | 35-55 + stun | → | **25-45 + stun** | -20% damage. |
| Area Denial (P3) | 30-45 ×3 every turn | → | **25-35 ×2 every 2 turns** | Halves the damage output. No longer instant-kill. |
| Power Spike (P3) | +15 power ×3 turns | → | **+10 power ×2 turns** | Weaker buff, shorter duration. |
| Sector Lockdown (P3) | 40-60 + 2s stun | → | **30-45 + 1s stun** | -20% damage, shorter stun. |
| Grid Reboot (P3) | Heals 300 HP | → | **Heals 150 HP** | Half the healing. Reduces cheese potential. |
| Boss XP reward | 600 | → | **800** | Higher reward for longer fight. |
| Boss credit reward | 2000 | → | **3000** | Higher reward. |

**Expected Result:** Fight duration reduces from 87 turns to ~55–60 turns. Players survive Phase 3 at least 2–3 turns, allowing for strategy and recovery.

---

## 6. Priority Fix List

### P0 — CRITICAL (must fix before release)

| # | Fix | Affected Class | Effort | Impact |
|---|-----|----------------|--------|--------|
| 1 | Increase EMP Discharge: 16-24 → **22-30** | Hacker | 1 line | Hacker becomes viable S2+ |
| 2 | Increase Firewall Breach: 10-20 → **14-22** | Hacker | 1 line | Hacker DPS baseline raised |
| 3 | Increase Data Siphon heal: 12-20 → **18-28** | Hacker | 1 line | Hacker sustain improved |
| 4 | Add new ability Neural Burst: 20-28 dmg + stun | Hacker | ~5 lines | Hacker gets signature utility |
| 5 | Reduce Ghost Protocol: 3 turns → **2 turns**, cost 5 HP | Hacker | 2 lines | Prevents trivializing content |
| 6 | Reduce Ghost Protocol next-attack: 2.0x → **1.5x** | Hacker | 1 line | Better scaling |

### P1 — IMPORTANT (fix for quality)

| # | Fix | Affected Class | Effort | Impact |
|---|-----|----------------|--------|--------|
| 7 | Reduce Carbon Armor: 40% → **25%** reduction | Juggernaut | 1 line | Breaks immortal loop |
| 8 | Reduce Carbon Armor: 3 turns → **2 turns** | Juggernaut | 1 line | Shorter window |
| 9 | Remove shield from Iron Will | Juggernaut | 2 lines | Simpler, still strong |
| 10 | Reduce Seismic Stomp: 28-38 → **25-33** | Juggernaut | 1 line | Better range |
| 11 | Reduce Overcharge Rail: 30-40 → **25-35**, cost 15→**10** HP | Gunner | 2 lines | Better risk/reward |
| 12 | Increase Cover Fire: 8-12 → **10-16** | Gunner | 1 line | Better value |
| 13 | Reduce Warden boss HP: 3000 → **2000** | Boss | 1 line | Fight too long |
| 14 | Reduce Warden Area Denial: 30-45×3 → **25-35×2, 2t** | Boss | 2 lines | Survivable Phase 3 |
| 15 | Reduce Warden Drone Swarm: 25-40 → **20-32, period 3** | Boss | 2 lines | Softer Phase 1 |

### P2 — NICE-TO-HAVE (improve polish)

| # | Fix | Affected | Effort | Impact |
|---|-----|----------|--------|--------|
| 16 | Reduce Assassinate execute threshold: 30% → **20%** | Operative | 1 line | Execute less trivial |
| 17 | Increase Assassin dmg: 35-45 → **30-40** | Operative | 1 line | Slight nerf |
| 18 | Cover Fire dmg: 8-12 → **10-16** (already P1) | Gunner | — | — |
| 19 | XP thresholds: 100/250/500/1000 → **100/200/400/800** | Progression | 1 line | Better pacing |
| 20 | S3 credit rewards: +20 avg per enemy | Enemies | ~6 lines | Better economy |
| 21 | Warden reward: 2000 → **3000 credits** | Boss | 1 line | Better reward |
| 22 | Permanent upgrades: reduce all by 15% | Economy | ~10 lines | More achievable |
| 23 | Code Injection DoT: 8/turn → **10/turn** | Hacker | 1 line | Better value |
| 24 | System Override: 12-18 → **16-22** | Hacker | 1 line | More impact |

---

## 7. Power-Level Summary (After Fixes)

### Expected Win Rates (post-fix)

| Class | S1 Avg | S2 Avg | S3 Avg |
|-------|--------|--------|--------|
| Gunner | 100% | 95% | 70% |
| Juggernaut | 100% | 100% | 85% |
| Operative | 100% | 100% | 90% |
| Hacker | 100% | **70%** | **45%** |

### Expected Fight Lengths

| Encounter | Pre-fix (turns) | Post-fix (turns) |
|-----------|-----------------|-------------------|
| S1 enemies | 2.0 | 2.0 |
| S2 Combat Mech | 4.0 (Jugg) / 7.0 (Hacker fail) | 4.0 / 5.5 |
| S3 Warden Avatar | 5.0 | 5.0 |
| S3 Aegis Sentinel | 6.0 (Jugg) / 10.0+ (Hacker fail) | 6.0 / 7.5 |
| Warden Boss | 87 turns (impossible) | 55–60 turns (survivable) |

### Key Design Philosophy

1. **Classes should be distinct:** Juggernaut tanks, Operative evades, Gunner balances, Hacker controls.
2. **No class should be non-viable:** Hacker must have a path to winning in S3.
3. **Boss fights should be long but winnable:** 55 turns is a good mobile boss length.
4. **HP costs should scale with available HP:** 15 HP cost for a 90 HP gunner is 17% — too steep.
5. **Stealth abilities should have meaningful cooldowns and costs:** 3 turns free stealth trivializes content.
6. **Defensive buffs should reduce damage, not negate it:** 40% reduction for 3 turns is too strong.

---

## Appendix A: Raw Simulation Data

### Combat Simulation (300 runs per matchup)

**Sector 1:**
| Class | Drone | Laser | Sentry | Swarm | Enforcer | Jammer |
|-------|-------|-------|--------|-------|----------|--------|
| Gunner | 100% 7dmg 83HP | 100% 5dmg 85HP | 100% 8dmg 82HP | 100% 6dmg 84HP | 100% 20dmg 70HP | 100% 7dmg 83HP |
| Juggernaut | 100% 7dmg 153HP | 100% 6dmg 154HP | 100% 8dmg 152HP | 100% 7dmg 153HP | 100% 20dmg 140HP | 100% 8dmg 152HP |
| Operative | 100% 5dmg 80HP | 100% 0dmg 85HP | 100% 7dmg 78HP | 100% 5dmg 80HP | 100% 15dmg 70HP | 100% 3dmg 82HP |
| Hacker | 100% 13dmg 57HP | 100% 10dmg 60HP | 100% 17dmg 53HP | 100% 15dmg 55HP | 100% 37dmg 33HP | 100% 11dmg 59HP |

**Sector 2:**
| Class | K9 | DroneII | Tank | Shadow | Mech | Wraith |
|-------|----|---------|------|--------|------|--------|
| Gunner | 100% 26dmg 64HP | 100% 9dmg 81HP | 100% 23dmg 67HP | 100% 24dmg 66HP | 100% 55dmg 35HP | 100% 12dmg 78HP |
| Juggernaut | 100% 26dmg 134HP | 100% 11dmg 149HP | 100% 27dmg 133HP | 100% 27dmg 133HP | 100% 60dmg 100HP | 100% 17dmg 143HP |
| Operative | 100% 15dmg 70HP | 100% 8dmg 77HP | 100% 18dmg 67HP | 100% 12dmg 73HP | 100% 36dmg 49HP | 100% 10dmg 75HP |
| Hacker | 100% 45dmg 25HP | 100% 25dmg 45HP | 100% 47dmg 23HP | 100% 43dmg 27HP | **1%** 65dmg 5HP | 100% 33dmg 37HP |

**Sector 3:**
| Class | K9E | WardenA | Titan | WardenD | Sentinel | Quantum |
|-------|-----|---------|-------|---------|----------|---------|
| Gunner | 100% 47dmg 43HP | 99% 76dmg 14HP | 100% 58dmg 32HP | 100% 43dmg 47HP | 96% 67dmg 23HP | 100% 44dmg 46HP |
| Juggernaut | 100% 51dmg 109HP | 100% 81dmg 79HP | 100% 70dmg 90HP | 100% 48dmg 112HP | 100% 77dmg 83HP | 100% 52dmg 108HP |
| Operative | 100% 35dmg 50HP | 100% 48dmg 37HP | 100% 43dmg 42HP | 100% 26dmg 59HP | 100% 52dmg 33HP | 100% 35dmg 50HP |
| Hacker | 12% 63dmg 7HP | **0%** NaN | 1% 69dmg 1HP | 28% 64dmg 6HP | 1% 68dmg 2HP | 7% 60dmg 10HP |

### Juggernaut Carbon Armor Combo (6 turns)
| Enemy | ATK | Dmg Taken | Dmg Dealt | HP Remaining |
|-------|-----|-----------|-----------|--------------|
| K9 Elite | 17 | 40 | 47 | 150 |
| Warden Avatar | 20 | 51 | 47 | 137 |
| Titan | 18 | 42 | 47 | 150 |
| Warden Drone | 16 | 37 | 42 | 152 |
| Aegis Sentinel | 14 | 37 | 43 | 155 |
| Quantum Guard | 15 | 37 | 54 | 150 |

---

*End of Balance Document v1.0*
