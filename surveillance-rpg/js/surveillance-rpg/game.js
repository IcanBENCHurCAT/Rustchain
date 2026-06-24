/**
 * game.js
 * Core game state: ability system, leveling, dice-based board movement,
 * narrative popups, combat, and save/load.
 *
 * Features:
 *  - Interactive narrative popups with choices per location type
 *  - XP/level system with persistent progression
 *  - Enhanced ability system with full effect resolution
 *  - Persistent save for totalLevel, totalRuns, totalCreditsEarned
 */

import { CLASSES, ENEMIES, UPGRADES, PERMANENT_UPGRADES, getEnemyForSector, LORE } from './entities.js';
import { generateBoard, TILE_TYPES } from './map.js';

/**
 * XP thresholds for each level (cumulative XP needed to reach next level).
 * Level 1->2: 100 XP, 2->3: 250, 3->4: 500, 4->5: 1000
 */
const XP_THRESHOLDS = [100, 250, 500, 1000];

export class GameEngine {
  constructor() {
    this.board = [];
    this.player = null;
    this.activeTileIndex = 0;
    this.gameState = 'class_select';
    this.combatState = null;
    this.draftChoices = [];
    this.battleLog = [];
    this.narrativePopup = null;   // { title, text, type, choices, choiceResult }
    this.turn = 0;                 // Current turn counter (combat & board)
    this.time = 0;
    this.lastRoll = 0;
    this.isRolling = false;
    this.difficulty = 1;          // Increments after each full run
    this.safehouseOverlayVisible = false;
    this._tookDamageThisTurn = false;

    // ── Persistent Progression (localStorage-backed) ──
    this.credits = parseInt(localStorage.getItem('aegis_credits') || '0');
    this.permanentUpgrades = JSON.parse(localStorage.getItem('aegis_perm_upgrades') || '[]');
    this.unlockedClasses = JSON.parse(localStorage.getItem('aegis_unlocked_classes') || '["gunner", "muscleman"]');
    this.totalLevel = parseInt(localStorage.getItem('aegis_totalLevel') || '0');
    this.totalRuns = parseInt(localStorage.getItem('aegis_totalRuns') || '0');
    this.totalCreditsEarned = parseInt(localStorage.getItem('aegis_totalCredits') || '0');

    this.activeSector = 1;
  }

  // ─── INIT PLAYER ─────────────────────────────────────────────────────────
  /**
   * Initialize a new player with the given class. Sets up XP/level tracking.
   */
  initPlayer(classKey) {
    const proto = CLASSES[classKey];
    if (!proto) return false;

    this.player = {
      classKey,
      name: proto.name,
      hp: proto.hpMax,
      hpMax: proto.hpMax,
      power: proto.power,
      speed: proto.speed,
      evade: proto.evade || 0,
      // XP/Level system
      level: 1,
      xp: 0,
      xpToNext: 100,
      totalLevel: this.totalLevel || 1,
      totalRuns: this.totalRuns,
      totalCreditsEarned: this.totalCreditsEarned,
      trapAvoidBonus: 0,
      trapAvoidTurns: 0,
      credits: 0,
      upgrades: [],
      color: proto.color,
      // Combat stat modifiers
      critBonus: 0,
      shockBonus: 0,
      regenHP: 0,
      trapAvoid: 0,
      combatShield: 0,
      critMult: 1.5,
      // Temporary buffs (combat)
      shieldValue: 0,
      dodgeChance: 0,
      critBuffTurns: 0,
      stealthTurns: 0,
      defenseDownTurns: 0,
      powerDownTurns: 0,
      stunTurns: 0,
      venomTurns: 0,
      venomDmg: 0,
      deflectActive: false,
      counterDmg: { min: 0, max: 0 },
      // Tile-level buffs
      _trapAvoidTurns: 0,
      _safePassage: false,
      _safePassageTurns: 0,
      _detectionActive: false,
      _attractsElite: false
    };

    // Apply permanent upgrades from persistent storage
    this.permanentUpgrades.forEach(upg => {
      const protoUpg = PERMANENT_UPGRADES.find(u => u.id === upg);
      if (protoUpg) protoUpg.effect(this.player);
    });

    this.board = generateBoard(this.activeSector);
    this.activeTileIndex = 0;
    this.gameState = 'board';
    return true;
  }

  // ─── XP / LEVEL SYSTEM ───────────────────────────────────────────────────
  /**
   * Calculate XP threshold needed to reach the next level.
   * Level 1->2: 100, 2->3: 250, 3->4: 500, 4->5: 1000, then exponential.
   */
  calculateXPThreshold(level) {
    const idx = level - 1; // 0-indexed
    if (idx < XP_THRESHOLDS.length) {
      return XP_THRESHOLDS[idx];
    }
    // Beyond level 5: exponential scaling
    return Math.floor(XP_THRESHOLDS[XP_THRESHOLDS.length - 1] * Math.pow(2, idx - (XP_THRESHOLDS.length - 1)));
  }

  /**
   * Calculate XP awarded for defeating an enemy.
   * Returns the enemy's xpReward (set by getEnemyForSector in entities.js).
   */
  calculateXP(enemy) {
    return enemy ? (enemy.xpReward || 50) : 0;
  }

  /**
   * Level up the player. Recalculates all stats from the class template.
   * +10% HP, +2 power, +1 speed, +3 evade per level.
   */
  levelUp() {
    if (!this.player) return;

    this.player.level++;
    const spec = CLASSES[this.player.classKey];
    this.player.hpMax = Math.floor(spec.hpMax * (1 + (this.player.level - 1) * 0.10));
    this.player.power = spec.power + (this.player.level - 1) * 2;
    this.player.speed = spec.speed + (this.player.level - 1);
    this.player.evade = spec.evade + (this.player.level - 1) * 3;
    this.player.hp = this.player.hpMax;
    this.player.xpToNext = this.calculateXPThreshold(this.player.level);

    // Track in totalLevel progression
    if (this.player.level > this.totalLevel) {
      this.totalLevel = this.player.level;
    }

    this.battleLog.push(`\n★ LEVEL UP! Now Level ${this.player.level}!`);
    this.battleLog.push(`  HP:${this.player.hpMax} | Power:${this.player.power} | Speed:${this.player.speed} | Evade:${this.player.evade} | XP req: ${this.player.xpToNext}`);
  }

  /**
   * Check if the player can unlock a specific class.
   * Returns { can: boolean, reason: string }
   */
  canUnlockClass(classKey) {
    if (this.unlockedClasses.includes(classKey)) return { can: true, reason: 'Already unlocked' };
    const cls = CLASSES[classKey];
    if (!cls) return { can: false, reason: 'Unknown class' };
    if (this.totalLevel < cls.unlockLevel) {
      return { can: false, reason: `Requires Total Level ${cls.unlockLevel} (you have ${this.totalLevel})` };
    }
    if (this.credits < cls.unlockCost) {
      return { can: false, reason: `Requires ${cls.unlockCost} credits (have ${this.credits})` };
    }
    return { can: true, reason: '' };
  }

  /**
   * Unlock a class for future runs. Deducts credits and saves.
   */
  unlockClass(classKey, cost) {
    if (this.credits >= cost && !this.unlockedClasses.includes(classKey)) {
      const cls = CLASSES[classKey];
      if (cls && cls.unlockLevel <= this.totalLevel) {
        this.credits -= cost;
        this.unlockedClasses.push(classKey);
        this.player.credits = this.credits;
        this.savePersistent();
        return true;
      }
    }
    return false;
  }

  /**
   * Add XP and trigger level-ups if needed.
   */
  addXP(amount) {
    if (!this.player) return;
    this.player.xp += amount;

    // Check for level-ups (may trigger multiple)
    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.levelUp();
    }
  }

  // ─── DICE ROLL & MOVE ────────────────────────────────────────────────────
  rollDice() {
    if (this.isRolling || this.gameState !== 'board') return false;
    this.isRolling = true;
    this.lastRoll = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      this.isRolling = false;
      this.movePlayer(this.lastRoll);
    }, 600);
    return true;
  }

  movePlayer(steps) {
    const newIndex = Math.min(this.activeTileIndex + steps, this.board.length - 1);
    if (newIndex === this.activeTileIndex) {
      this.isRolling = false;
      this.addLog("Rolled but cannot move past the end of the sector.");
      return;
    }

    this.activeTileIndex = newIndex;
    const landedTile = this.board[this.activeTileIndex];
    landedTile.visited = true;

    setTimeout(() => {
      this.handleTileLanding(landedTile);
    }, 500);
  }

  // ─── TILE HANDLING WITH NARRATIVE POPUPS ─────────────────────────────────
  /**
   * Handle landing on a tile. Shows narrative popup with choices when applicable.
   */
  handleTileLanding(tile) {
    // Always pick a lore description for the location
    const locationEntry = this.pickRandom(LORE.locations[tile.type] || LORE.locations.combat);

    // Check for active narrative choices for this tile type
    const choices = LORE.narrativeChoices[tile.type];
    let hasChoices = false;

    // Process narrative choices if available and the popup isn't already set
    if (choices && choices.length > 0 && !this.narrativePopup) {
      this.narrativePopup = {
        title: tile.label,
        text: locationEntry,
        type: tile.type,
        choices: choices
      };
      hasChoices = true;
    }

    switch (tile.type) {
      case TILE_TYPES.START:
        this.showNarrativePopup();
        this.gameState = 'board';
        break;
      case TILE_TYPES.COMBAT:
        setTimeout(() => { this.startCombat(); }, 800);
        break;
      case TILE_TYPES.TRAP:
        setTimeout(() => { this.triggerTrap(); }, 800);
        break;
      case TILE_TYPES.SAFEHOUSE:
        // If narrative choices exist, show the popup; otherwise fall back to safehouse flow
        if (hasChoices && !this.safehouseOverlayVisible) {
          this.showNarrativePopup();
          this.gameState = 'board';
        } else {
          setTimeout(() => { this.gameState = 'safehouse'; this.showNarrativePopup(); }, 800);
        }
        break;
      case TILE_TYPES.SERVER_NODE:
        if (hasChoices) {
          this.showNarrativePopup();
          this.gameState = 'board';
        } else {
          setTimeout(() => { this.startUpgradeDraft(); this.showNarrativePopup(); }, 800);
        }
        break;
      default:
        this.showNarrativePopup();
        this.checkVictory();
    }
  }

  /**
   * Handle narrative choice selection by the player.
   * @param {number} choiceIndex - Index into narrativePopup.choices
   */
  selectNarrativeChoice(choiceIndex) {
    if (!this.narrativePopup || !this.narrativePopup.choices) return;
    const choice = this.narrativePopup.choices[choiceIndex];
    if (!choice) return;

    // Handle upgrade choice specially (triggers upgrade draft)
    if (choice.action === 'upgrade') {
      this.startUpgradeDraft();
      this.dismissNarrative();
      return;
    }

    // Execute the choice's result function
    let resultText = choice.result(this.player, this.activeSector);

    this.battleLog.push(resultText);
    this.addLog(resultText);

    // For safehouse options, set game state
    if (this.narrativePopup.type === 'safehouse') {
      this.gameState = 'board';
    } else if (this.narrativePopup.type === 'trap') {
      if (this.player.hp <= 0) {
        this.endRun(false);
        return;
      }
      this.gameState = 'board';
    } else if (this.narrativePopup.type === 'serverNode') {
      this.gameState = 'board';
    } else if (this.narrativePopup.type === 'combat' || this.narrativePopup.type === 'start') {
      this.gameState = 'board';
    }

    this.dismissNarrative();
    this.checkVictory();
  }

  showNarrativePopup() {
    this.narrativePopup = this.narrativePopup || null;
  }

  dismissNarrative() {
    this.narrativePopup = null;
  }

  // ─── TRAP HANDLING ───────────────────────────────────────────────────────
  triggerTrap() {
    // Check for safe passage buff
    if (this.player._safePassage) {
      this.player._safePassageTurns--;
      if (this.player._safePassageTurns <= 0) {
        this.player._safePassage = false;
      }
      this.battleLog = ["Aegis sensor sweep triggered!", "Your reprogrammed neural signature passes as trusted infrastructure. Trap bypassed!"];
      this.addLog("Trap avoided via safe passage buff.");
      this.gameState = 'board';
      this.checkVictory();
      return;
    }

    // Check trap avoid chance
    if (Math.random() < this.player.trapAvoid) {
      this.battleLog = ["Aegis sensor sweep triggered!", "Your stealth mods phase through the laser grid. Completely avoided!"];
      this.addLog("Trap avoided via evasion.");
      this.gameState = 'board';
      this.checkVictory();
      return;
    }

    const dodgeChance = this.player.classKey === 'operative' ? 0.45 : 0.20;
    const isDodged = Math.random() < dodgeChance;

    if (isDodged) {
      this.battleLog = ["Aegis sensor sweep triggered!", "Your reflexes kick in — you dodge the trap at the last microsecond!"];
      this.addLog("Trap dodged with a close call.");
    } else {
      const dmg = 12 + Math.floor(Math.random() * 15) + (this.activeSector * 3);
      this.applyDamage(this.player, dmg, "security shock");
      this.battleLog = ["Aegis sensor sweep triggered!", `Laser grid locks on. You took ${dmg} security shock damage.`];
      this.addLog(`Trap hit for ${dmg} damage!`);
      if (this.player.hp <= 0) {
        this.endRun(false);
        return;
      }
    }
    this.gameState = 'board';
    this.checkVictory();
  }

  // ─── COMBAT ──────────────────────────────────────────────────────────────
  startCombat() {
    const enemyData = getEnemyForSector(this.activeSector, this.difficulty);

    // Elite patrol modifier if detection is active
    let isElite = this.player._detectionActive || this.player._attractsElite;
    if (isElite) {
      enemyData.power = Math.floor(enemyData.power * 1.3);
      enemyData.hp = Math.floor(enemyData.hp * 1.5);
      enemyData.hpMax = enemyData.hp;
      enemyData.xpReward = Math.floor(enemyData.xpReward * 1.5);
      enemyData.creditReward = Math.floor(enemyData.creditReward * 1.5);
    }

    this.combatState = {
      enemy: {
        key: enemyData.key,
        name: enemyData.name,
        hp: enemyData.hp,
        hpMax: enemyData.hpMax,
        power: enemyData.power,
        speed: enemyData.speed,
        type: enemyData.type,
        xpReward: enemyData.xpReward,
        creditReward: enemyData.creditReward,
        // Combat effect state
        stunTurns: 0,
        venomTurns: 0,
        venomDmg: 0,
        debuffPowerAmount: 0,
        debuffPowerTurns: 0,
        wardenCounter: false
      },
      turn: 0,
      winner: null
    };

    // Apply combat shields from upgrades
    if (this.player.combatShield > 0) {
      this.player.shieldValue = this.player.combatShield;
    }

    this.battleLog = [`⚠ ENGAGING: ${enemyData.name}!`];
    this.addLog(`Combat started vs ${enemyData.name} (Sector ${this.activeSector})${isElite ? ' [ELITE]' : ''}`);
    this.gameState = 'combat';
  }

  // ─── ABILITY SYSTEM ──────────────────────────────────────────────────────
  /**
   * Get the list of available abilities with current cooldown and usability state.
   */
  getAvailableAbilities() {
    const cls = CLASSES[this.player.classKey];
    if (!cls || !cls.abilities) return [];

    return cls.abilities.map(ab => {
      const cooldownLeft = (this.player._cooldowns && this.player._cooldowns[ab.id]) || 0;
      const canUseHP = !ab.cost || this.player.hp > ab.cost;
      const canUse = cooldownLeft <= 0 && canUseHP;
      return {
        ...ab,
        cooldownLeft,
        canUse
      };
    });
  }

  /**
   * Execute a player ability by index. Handles validation, effect application,
   * cooldown management, and enemy turn.
   * Returns the result object with combat details for UI display.
   */
  useAbility(abilityIndex) {
    if (this.gameState !== 'combat' || !this.combatState) return false;

    const abilities = CLASSES[this.player.classKey].abilities;
    const ability = abilities[abilityIndex];
    if (!ability) return false;

    // ── Validate cooldown ──
    const cooldownLeft = (this.player._cooldowns && this.player._cooldowns[ability.id]) || 0;
    if (cooldownLeft > 0) {
      this.battleLog.push(`${ability.name} is on cooldown (${cooldownLeft} turns remaining).`);
      this.addLog(`${ability.name} — cooldown active (${cooldownLeft}t).`);
      return false;
    }

    // ── Validate HP cost ──
    if (ability.cost && this.player.hp <= ability.cost) {
      this.battleLog.push(`${ability.name} requires ${ability.cost} HP but you only have ${this.player.hp}.`);
      return false;
    }

    // ── Set cooldown and pay cost ──
    if (!this.player._cooldowns) this.player._cooldowns = {};
    if (ability.maxCooldown > 0) {
      this.player._cooldowns[ability.id] = ability.maxCooldown;
    }
    if (ability.cost) {
      this.player.hp -= ability.cost;
      this.battleLog.push(`  HP cost: -${ability.cost}`);
    }

    // ── Execute ability ──
    this.battleLog.push(`▶ ${this.player.name} uses ${ability.name}!`);
    this.addLog(`${this.player.name} → ${ability.name}`);

    if (ability.type === 'attack') {
      this.executeAttackAbility(ability);
    } else if (ability.type === 'buff') {
      this.executeBuffAbility(ability);
    } else if (ability.type === 'heal') {
      this.executeHealAbility(ability);
    }

    // ── Check immediate deaths ──
    if (this.combatState.enemy.hp <= 0) { this.endCombat(true); return true; }
    if (this.player.hp <= 0) { this.endCombat(false); return true; }

    // ── Process player DoT and regen (from prior turns) ──
    if (this.player.venomTurns > 0) {
      this.player.hp -= this.player.venomDmg;
      this.battleLog.push(`  Venom deals ${this.player.venomDmg} damage (tick ${this.player.venomTurns}).`);
      this.player.venomTurns--;
      if (this.player.hp <= 0) { this.endCombat(false); return true; }
    }
    if (this.player.regenHP > 0) {
      this.player.hp = Math.min(this.player.hpMax, this.player.hp + this.player.regenHP);
      this.battleLog.push(`  Repair Nanites restore ${this.player.regenHP} HP.`);
    }

    // ── Now process enemy turn ──
    this.enemyTurn();
    return true;
  }

  /**
   * Execute an attack-type ability: calculate damage, apply crits, strikes,
   * stuns, debuffs, DoTs, and counter-attacks.
   */
  executeAttackAbility(ability) {
    let totalDmg = 0;
    const strikes = ability.strikes || 1;
    const enemy = this.combatState.enemy;

    for (let i = 0; i < strikes; i++) {
      let dmg = ability.minPower + Math.floor(Math.random() * (ability.maxPower - ability.minPower + 1));

      // ── Crit check ──
      const critChance = 0.10 + (this.player.critBonus || 0) + (ability.critBonus || 0) + (this.player.critBuffTurns > 0 ? 0.15 : 0);
      const isCrit = Math.random() < critChance;
      if (isCrit) {
        dmg = Math.floor(dmg * (this.player.critMult || 1.5));
      }

      // ── Shock bonus ──
      dmg += this.player.shockBonus || 0;

      // ── Zero to One bonus: +10 if not taking damage this turn ──
      if (ability.id === 'zerotoone' && !this._tookDamageThisTurn) {
        dmg += 10;
      }

      // ── Stun enemy ──
      if (ability.stun) {
        enemy.stunTurns = ability.stun;
        this.battleLog.push(`  ${enemy.name} is stunned for ${ability.stun} turn(s)!`);
      }

      // ── Debuff: reduce enemy stats ──
      if (ability.debuff) {
        if (ability.debuff.stat === 'power') {
          enemy.debuffPowerAmount = Math.max(0, (enemy.debuffPowerAmount || 0) + ability.debuff.amount);
          enemy.debuffPowerTurns = ability.debuff.duration;
        } else {
          enemy[ability.debuff.stat] = Math.max(1, (enemy[ability.debuff.stat] || 0) - ability.debuff.amount);
        }
        this.battleLog.push(`  ${ability.debuff.stat} reduced by ${ability.debuff.amount} for ${ability.debuff.duration} turns.`);
      }

      // ── Ignore defense modifier ──
      if (ability.ignoreDefense) {
        dmg = Math.floor(dmg * (1 + ability.ignoreDefense * 0.3));
      }

      totalDmg += dmg;

      if (strikes > 1) {
        this.battleLog.push(`  Strike ${i+1}/${strikes}: ${dmg} damage${isCrit ? ' [CRIT!]' : ''}`);
      }
    }

    // Apply total damage to enemy
    enemy.hp = Math.max(0, enemy.hp - totalDmg);
    if (strikes <= 1) {
      this.battleLog.push(`  ${totalDmg} damage to ${enemy.name}${totalDmg >= (enemy.power || 1) * 1.3 ? ' [CRIT!]' : ''}.`);
    } else {
      this.battleLog.push(`  Total: ${totalDmg} damage over ${strikes} strikes.`);
    }

    // ── Assassinate: one-shot if enemy below 30% HP ──
    if (ability.id === 'assassinate' && enemy.hp <= enemy.hpMax * 0.3 && enemy.hp > 0) {
      enemy.hp = 0;
      this.battleLog.push(`  Assassinate executes! Enemy below 30% HP — eliminated instantly!`);
    }

    // ── Apply venom DoT to enemy ──
    if (ability.dot) {
      enemy.venomTurns = ability.dot.duration;
      enemy.venomDmg = ability.dot.amount;
      this.battleLog.push(`  Venom applied: ${ability.dot.amount} dmg/turn for ${ability.dot.duration} turns.`);
    }

    // ── Counter-attack from deflect ──
    if (this.player.deflectActive && this.player.counterDmg.max > 0) {
      const counterDmg = this.player.counterDmg.min + Math.floor(Math.random() * (this.player.counterDmg.max - this.player.counterDmg.min + 1));
      enemy.hp = Math.max(0, enemy.hp - counterDmg);
      this.battleLog.push(`  Deflect counter-attacks for ${counterDmg} additional damage!`);
      this.player.deflectActive = false;
    }

    // ── Boss special: Warden counter-attack ──
    if (enemy.type === 'warden' && enemy.wardenCounter) {
      const counterDmg = 10 + Math.floor(Math.random() * 10);
      this.battleLog.push(`  Warden's counter-strike deals ${counterDmg} damage!`);
      this.applyDamage(this.player, counterDmg, "warden counter");
      enemy.wardenCounter = false;
    }

    // ── Post-attack: apply enemy DoT tick if active ──
    this.processEnemyDoT(enemy);
  }

  /**
   * Execute a buff-type ability: set various status effects on the player.
   */
  executeBuffAbility(ability) {
    if (ability.effect === 'crit_up') {
      this.player.critBuffTurns = ability.duration;
      this.battleLog.push(`  Critical strike chance boosted for ${ability.duration} turns!`);
    } else if (ability.effect === 'defense_up') {
      this.player.defenseDownTurns = ability.duration;
      this.battleLog.push(`  Incoming damage reduced by 40% for ${ability.duration} turns!`);
    } else if (ability.effect === 'stealth_up') {
      this.player.stealthTurns = ability.duration;
      this.battleLog.push(`  Stealth active! All attacks dodged for ${ability.duration} turns.`);
    } else if (ability.effect === 'dodge_up') {
      this.player.dodgeChance = 70;
      this.battleLog.push(`  Evasion boosted to 70% for ${ability.duration} turns!`);
    } else if (ability.effect === 'deflect') {
      this.player.deflectActive = true;
      this.player.counterDmg = { min: ability.counterMin || 8, max: ability.counterMax || 12 };
      this.battleLog.push(`  Deflect mode active! 70% damage reduction for ${ability.duration} turns.`);
    }
  }

  /**
   * Execute a heal-type ability: restore HP, generate shields, steal credits.
   */
  executeHealAbility(ability) {
    let healed = ability.healMin + Math.floor(Math.random() * (ability.healMax - ability.healMin + 1));
    this.player.hp = Math.min(this.player.hpMax, this.player.hp + healed);
    this.battleLog.push(`  Restored ${healed} HP.`);

    if (ability.shield) {
      this.player.shieldValue += ability.shield;
      this.battleLog.push(`  Shield generated: absorbs ${ability.shield} damage.`);
    }

    if (ability.creditSteal) {
      const stolen = ability.creditSteal;
      this.player.credits += stolen;
      this.credits = this.player.credits;
      this.battleLog.push(`  Stole ${stolen} credits from enemy terminal.`);
    }
  }

  /**
   * Tick down all player-side effect timers at turn start.
   */
  tickDownPlayerEffects() {
    this.turn++;

    // Cooldowns
    if (this.player._cooldowns) {
      for (const key in this.player._cooldowns) {
        if (this.player._cooldowns[key] > 0) {
          this.player._cooldowns[key]--;
        }
      }
    }

    // Crit buff countdown
    if (this.player.critBuffTurns > 0) this.player.critBuffTurns--;

    // Stealth / evasion countdown
    if (this.player.stealthTurns > 0) this.player.stealthTurns--;
    if (this.player.dodgeChance > 0 && this.turn > 0) {
      this.player.dodgeChance = 0;
    }

    // Defense reduction (armor buff countdown)
    if (this.player.defenseDownTurns > 0) {
      this.player.defenseDownTurns--;
    }

    // Venom (player DoT from enemy)
    if (this.player.venomTurns > 0) {
      this.player.venomTurns--;
    }

    // Track if player took damage this turn (for Zero to One ability)
    this._tookDamageThisTurn = false;
  }

  /**
   * Process the enemy's turn: attack, handle evasion, apply effects.
   */
  enemyTurn() {
    if (!this.combatState || this.gameState !== 'combat') return;

    const enemy = this.combatState.enemy;

    // ── Stun check ──
    if (enemy.stunTurns > 0) {
      this.battleLog.push(`  ${enemy.name} is stunned and cannot act!`);
      enemy.stunTurns--;
      this.processEnemyDoT(enemy);
      this.gameState = 'combat';
      return;
    }

    // ── Check evasion / stealth ──
    if (this.player.stealthTurns > 0) {
      this.battleLog.push(`  ${enemy.name} attacks but you're cloaked in stealth! Miss.`);
      this.processEnemyDoT(enemy);
      this.gameState = 'combat';
      return;
    }

    if (Math.random() * 100 < this.player.dodgeChance) {
      this.battleLog.push(`  ${enemy.name} attacks but you dodge with enhanced reflexes!`);
      this.processEnemyDoT(enemy);
      this.gameState = 'combat';
      return;
    }

    // ── Calculate enemy damage (apply power debuffs) ──
    let effectivePower = Math.max(1, enemy.power || 1);
    if (enemy.debuffPowerTurns > 0) {
      effectivePower = Math.max(1, (effectivePower || 1) - (enemy.debuffPowerAmount || 0));
      enemy.debuffPowerTurns--;
      this.battleLog.push(`  [Enemy power reduced by ${enemy.debuffPowerAmount} from System Override.]`);
    }

    let enemyDmg = effectivePower + Math.floor(Math.random() * 4) - 1;

    // Warden special: adds bonus damage
    if (enemy.type === 'warden') {
      enemyDmg += 5;
      enemy.wardenCounter = true;
    }

    // Apply defense reduction
    if (this.player.defenseDownTurns > 0) {
      enemyDmg = Math.floor(enemyDmg * 0.6);
      this.battleLog.push(`  Carbon Armor absorbs incoming damage.`);
    }

    // Apply shield first
    if (this.player.shieldValue > 0) {
      const absorbed = Math.min(enemyDmg, this.player.shieldValue);
      enemyDmg -= absorbed;
      this.player.shieldValue -= absorbed;
      if (absorbed > 0) {
        this.battleLog.push(`  Shield absorbs ${absorbed} damage!`);
      }
    }

    // Apply remaining damage
    if (enemyDmg > 0) {
      this.applyDamage(this.player, enemyDmg, enemy.name);
      this.battleLog.push(`  ${enemy.name} strikes for ${enemyDmg} damage.`);
      this._tookDamageThisTurn = true;
    }

    // Process enemy DoT
    this.processEnemyDoT(enemy);

    // ── Check game states ──
    if (this.player.hp <= 0) { this.endCombat(false); return; }
    if (enemy.hp <= 0) { this.endCombat(true); return; }

    this.gameState = 'combat';
  }

  /**
   * Process damage-over-time ticks on the enemy.
   */
  processEnemyDoT(enemy) {
    if (enemy.venomTurns > 0) {
      enemy.hp -= enemy.venomDmg;
      this.battleLog.push(`  Venom tick: ${enemy.venomDmg} damage to ${enemy.name}.`);
      enemy.venomTurns--;
    }
  }

  /**
   * Apply damage to a target, respecting shields.
   */
  applyDamage(target, amount, source) {
    if (target.shieldValue > 0) {
      const absorbed = Math.min(amount, target.shieldValue);
      target.shieldValue -= absorbed;
      amount -= absorbed;
    }
    target.hp = Math.max(0, target.hp - amount);
  }

  // ─── END COMBAT ─────────────────────────────────────────────────────────
  endCombat(playerWon) {
    if (playerWon) {
      const enemy = this.combatState.enemy;
      this.battleLog.push(`✦ ${enemy.name} destroyed!`);
      this.battleLog.push(`  +${enemy.xpReward} XP  |  +${enemy.creditReward} credits`);

      // Grant XP and credits
      this.addXP(enemy.xpReward);
      this.player.credits += enemy.creditReward;
      this.credits = this.player.credits;
      this.totalCreditsEarned += enemy.creditReward;

      this.gameState = 'board';

      // Check if reached end of board
      if (this.activeTileIndex >= this.board.length - 1) { | head -200
        setTimeout(() => this.checkVictory(), 1000);
      }
    } else {
      this.battleLog.push(`✘ ${this.player.name} was destroyed.`);
      this.totalRuns++;
      this.totalLevel = Math.max(this.totalLevel, this.player.level);
      this.gameState = 'game_over';
    }
    this.savePersistent();
  }

  // ─── UPGRADE DRAFT SYSTEM ────────────────────────────────────────────────
  startUpgradeDraft() {
    // Pick 3 random upgrades (no duplicates)
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5);
    this.draftChoices = shuffled.slice(0, 3);
    this.gameState = 'upgrade_draft';
  }

  selectUpgrade(upgrade) {
    if (this.gameState !== 'upgrade_draft') return false;

    // Apply upgrade effect
    upgrade.effect(this.player);
    if (!this.player.upgrades) this.player.upgrades = [];
    this.player.upgrades.push(upgrade.id);

    this.battleLog.push(`✦ Acquired: ${upgrade.name} — ${upgrade.desc}`);
    this.addLog(`Upgrade acquired: ${upgrade.name}`);

    this.gameState = 'board';
    return true;
  }

  // ─── SAFEHOUSE SYSTEM ────────────────────────────────────────────────────
  triggerSafehouseOption(option) {
    if (this.gameState !== 'safehouse') return false;

    if (option === 'heal') {
      const healAmt = 40 + Math.floor(Math.random() * 21);
      this.player.hp = Math.min(this.player.hpMax, this.player.hp + healAmt);
      this.battleLog.push(`✦ Executing system diagnostics. Restored ${healAmt} HP.`);
      this.addLog(`Safehouse: Restored ${healAmt} HP.`);
      this.gameState = 'board';
    } else {
      this.startUpgradeDraft();
      return true;
    }
    return true;
  }

  // ─── PERMANENT UPGRADES SHOP ────────────────────────────────────────────
  buyPermanentUpgrade(upgradeId, cost) {
    if (this.credits < cost) return false;
    if (this.permanentUpgrades.includes(upgradeId)) return false;

    const upgrade = PERMANENT_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    // Apply to current player if exists
    if (this.player) {
      upgrade.effect(this.player);
    }

    this.credits -= cost;
    this.permanentUpgrades.push(upgradeId);
    this.savePersistent();
    return true;
  }

  // ─── CLASS UNLOCK SHOP ───────────────────────────────────────────────────
  /**
   * Check if a class can be unlocked.
   */
  canUnlockClass(classKey) {
    if (this.unlockedClasses.includes(classKey)) return { can: true, reason: '' };
    const cls = CLASSES[classKey];
    if (!cls) return { can: false, reason: 'Unknown class' };
    if (this.totalLevel < cls.unlockLevel) {
      return { can: false, reason: `Requires Total Level ${cls.unlockLevel}` };
    }
    if (this.credits < cls.unlockCost) {
      return { can: false, reason: `Requires ${cls.unlockCost} credits (have ${this.credits})` };
    }
    return { can: true, reason: '' };
  }

  /**
   * Unlock a class for future runs.
   */
  unlockClass(classKey, cost) {
    if (this.credits >= cost && !this.unlockedClasses.includes(classKey)) {
      const cls = CLASSES[classKey];
      if (cls && cls.unlockLevel <= this.totalLevel) {
        this.credits -= cost;
        this.unlockedClasses.push(classKey);
        this.player.credits = this.credits;
        this.savePersistent();
        return true;
      }
    }
    return false;
  }

  // ─── VICTORY / GAME OVER ─────────────────────────────────────────────────
  checkVictory() {
    if (this.activeTileIndex >= this.board.length - 1) {
      this.endRun(true);
    }
  }

  endRun(won) {
    if (won) {
      const reward = this.activeSector * 250;
      this.credits += reward;
      this.battleLog.push(`✦ Core Injected! Earned ${reward} credits.`);
      this.totalRunsCompleted = (this.totalRunsCompleted || 0) + 1;
      this.totalLevel = this.player ? Math.max(this.totalLevel, this.player.level) : this.totalLevel;
      if (this.activeSector < 3) {
        this.activeSector++;
        this.gameState = 'victory';
      } else {
        this.gameState = 'victory';
      }
    } else {
      const compensation = Math.max(50, this.activeTileIndex * 20);
      this.credits += compensation;
      this.battleLog.push(`✘ Consciousness Purged. Recovered ${compensation} credits.`);
      this.totalRuns++;
      this.totalLevel = this.player ? Math.max(this.totalLevel, this.player.level) : this.totalLevel;
      this.difficulty++;
      this.gameState = 'game_over';
    }

    this.savePersistent();
  }

  // ─── SAVE / LOAD ─────────────────────────────────────────────────────────
  savePersistent() {
    localStorage.setItem('aegis_credits', this.credits.toString());
    localStorage.setItem('aegis_perm_upgrades', JSON.stringify(this.permanentUpgrades));
    localStorage.setItem('aegis_unlocked_classes', JSON.stringify(this.unlockedClasses));
    localStorage.setItem('aegis_totalLevel', this.totalLevel.toString());
    localStorage.setItem('aegis_totalRuns', this.totalRuns.toString());
    localStorage.setItem('aegis_totalCredits', this.totalCreditsEarned.toString());
  }

  loadPersistent() {
    this.credits = parseInt(localStorage.getItem('aegis_credits') || '0');
    this.permanentUpgrades = JSON.parse(localStorage.getItem('aegis_perm_upgrades') || '[]');
    this.unlockedClasses = JSON.parse(localStorage.getItem('aegis_unlocked_classes') || '["gunner", "muscleman"]');
    this.totalLevel = parseInt(localStorage.getItem('aegis_totalLevel') || '0');
    this.totalRuns = parseInt(localStorage.getItem('aegis_totalRuns') || '0');
    this.totalCreditsEarned = parseInt(localStorage.getItem('aegis_totalCredits') || '0');
  }

  saveGameState() {
    const state = {
      credits: this.credits,
      perm: this.permanentUpgrades,
      classes: this.unlockedClasses,
      sector: this.activeSector,
      totalLevel: this.totalLevel,
      totalRuns: this.totalRuns,
      totalCredits: this.totalCreditsEarned
    };
    localStorage.setItem('aegis_save_state', JSON.stringify(state));
  }

  loadGameState() {
    const saved = localStorage.getItem('aegis_save_state');
    if (saved) {
      const state = JSON.parse(saved);
      this.credits = state.credits;
      this.permanentUpgrades = state.perm;
      this.unlockedClasses = state.classes;
      this.activeSector = state.sector;
      this.totalLevel = state.totalLevel;
      this.totalRuns = state.totalRuns;
      this.totalCreditsEarned = state.totalCredits || 0;
      this.loadPersistent();
      return true;
    }
    return false;
  }

  // ─── UTILS ───────────────────────────────────────────────────────────────
  addLog(text) {
    this.battleLog.push(text);
  }

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
GAMEJS_PART2 | head -200
