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

import { CLASSES, ENEMIES, UPGRADES, PERMANENT_UPGRADES, getEnemyForSector, LORE, WARDEN_BOSS, WARDEN_ABILITIES, WARDEN_AVATAR } from './entities.js';
import { generateBoard, TILE_TYPES } from './map.js';
import { playSFX, playMusic, stopMusic, resolveSFXForAbility } from './sound.js';
import { getSettings } from './settings.js';

const DIFFICULTY_MULTIPLIERS = { easy: 0.8, medium: 1.0, hard: 1.3, insane: 1.6 };

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
    // Read difficulty from settings
    this._difficultyMultiplier = 1.0;
    this._loadDifficulty();
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

    // Visual-effect tracking (exposed to Phaser scene)
    this._lastAbilityType = null;       // 'attack'|'buff'|'heal'
    this._lastAbilityId = null;
    this._lastAbilityIndex = null;
  }


  /**
   * Load difficulty multiplier from settings.
   */
  _loadDifficulty() {
    try {
      const s = getSettings();
      if (s && s.difficulty) {
        this._difficultyMultiplier = DIFFICULTY_MULTIPLIERS[s.difficulty] || 1.0;
      }
    } catch(e) {}
  }

  /**
   * Apply difficulty multiplier to enemy stats at combat start.
   */
  _scaleEnemyForDifficulty(enemy) {
    if (this._difficultyMultiplier === 1.0) return;
    enemy.hpMax = Math.floor(enemy.hpMax * this._difficultyMultiplier);
    enemy.hp = enemy.hpMax;
    enemy.power = Math.floor(enemy.power * this._difficultyMultiplier);
    enemy.speed = Math.max(1, Math.floor(enemy.speed * (1 + (this._difficultyMultiplier - 1) * 0.3)));
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
    // ── Initial sector music ──
    try {
      const sectorTracks = { 1: 'industrial_dark', 2: 'synthwave_glitch', 3: 'intense_orchestral' };
      playMusic(sectorTracks[this.activeSector] || 'industrial_dark');
    } catch(e) {}
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
    // ── SFX: level up ──
    try { playSFX('level_up'); } catch(e) {}
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

    // ── SFX: XP/credit pickup ──
    try { playSFX('credit_pickup'); } catch(e) {}
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
        // Sector 3 boss: THE WARDEN fights at the final server node (last tile)
        if (this.activeSector === 3 && this.activeTileIndex === this.board.length - 1) {
          this._pendingWardenBoss = true;  // Flag for startCombat to spawn WARDEN
          setTimeout(() => { this.startCombat(); }, 800);
          break;
        }
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

    // Execute the choice's result function or effect handler
    let resultText;
    if (choice.result) {
      resultText = choice.result(this.player, this.activeSector);
    } else if (choice.effect) {
      resultText = this.handleEffectChoice(choice);
    } else {
      resultText = `You chose: ${choice.title || 'nothing specific'}.`;
    }

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
    } else if (this.narrativePopup.type === 'logicBombChoice') {
      // Logic bomb choice - handled by the choice.result() function
      // The result calls endCombat(true) which triggers resolution
      this.dismissNarrative();
      return; // Don't set gameState here - logicBombChoice handles it
    } else if (this.narrativePopup.type === 'combat' || this.narrativePopup.type === 'start') {
      this.gameState = 'board';
    }

    this.dismissNarrative();
    this.checkVictory();
  }

  // ─── EFFECT HANDLERS ──────────────────────────────────────────────────────
  /**
   * Handle effect-based narrative choices. Called by selectNarrativeChoice
   * when choice.effect is set (rather than choice.result).
   * Returns the result text string.
   */
  handleEffectChoice(choice) {
    const p = this.player;
    const sector = this.activeSector;
    switch (choice.effect) {
      case 'heal': {
        const amt = choice.healMin + Math.floor(Math.random() * (choice.healMax - choice.healMin + 1));
        p.hp = Math.min(p.hpMax, p.hp + amt);
        return `You rest and recover, healing ${amt} HP.`;
      }
      case 'credits': {
        const amt = choice.creditMin + Math.floor(Math.random() * (choice.creditMax - choice.creditMin + 1));
        p.credits += amt;
        this.credits = p.credits;
        return `You scavenge encrypted credits: +${amt}c.`;
      }
      case 'trapBonus':
      case 'learn':
      case 'scout': {
        p.trapAvoid = (p.trapAvoid || 0) + (choice.amount || 0);
        p._trapAvoidTurns = choice.turns || 3;
        return `You study the area and gain ${(choice.amount || 0) * 100}% trap avoidance for ${choice.turns || 3} tiles.`;
      }
      case 'disable': {
        p.trapAvoid = (p.trapAvoid || 0) + (choice.damageReduction || 0.20);
        p._trapAvoidTurns = choice.turns || 2;
        return `You hack the trap circuitry. Next traps deal 20% less damage for ${choice.turns || 2} tiles.`;
      }
      case 'intel': {
        p.critBonus = (p.critBonus || 0) + (choice.amount || 0.10);
        p._intelTurns = choice.turns || 2;
        return `You access resistance comms. Intel improves your combat awareness.`;
      }
      case 'search': {
        const credits = choice.creditMin + Math.floor(Math.random() * (choice.creditMax - choice.creditMin + 1));
        p.credits += credits;
        this.credits = p.credits;
        const loot = choice.loot && Math.random() < 0.3;
        let text = `You find a hidden stash: +${credits}c.`;
        if (loot) {
          p.hp = Math.min(p.hpMax, p.hp + 30);
          text += ' Also find a med-kit: +30 HP.';
        }
        return text;
      }
      case 'reprogram': {
        p._safePassage = true;
        p._safePassageTurns = choice.turns || 5;
        return `You reprogram the node. It recognizes your neural signature — safe passage for ${choice.turns || 5} tiles!`; }
      case 'destroy': {
        // Trigger an elite combat
        const bonusCredits = 30 + Math.floor(Math.random() * 40);
        p.credits += bonusCredits;
        this.credits = p.credits;
        this.player._attractsElite = true;
        this.player._attractsEliteTurns = 3;
        return `Logic bomb deployed! Node destroyed. +${bonusCredits}c. But the explosion draws elite patrols — stay sharp for ${choice.turns || 3} tiles.`;
      }
      case 'study': {
        p.xpBonus = (p.xpBonus || 0) + (choice.xpBonus || 0.15);
        p._studyTurns = choice.turns || 2;
        return `You analyze the Warden's code. +${(choice.xpBonus || 0.15) * 100}% XP gain for ${choice.turns || 2} combats.`;
      }
      case 'sabotage': {
        p.critBonus = (p.critBonus || 0) + (choice.critBonus || 0.10);
        p._sabotageTurns = choice.turns || 1;
        return `You sabotage Aegis grid defenses. +${(choice.critBonus || 0.10) * 100}% crit chance for next combat.`;
      }
      case 'ambush': {
        p.firstStrikeBonus = (p.firstStrikeBonus || 0) + (choice.bonusDmg || 0.50);
        p._ambushTurns = 1;
        return `You set up an ambush position. First strike will deal ${(choice.bonusDmg || 0.50) * 100}% bonus damage.`;
      }
      case 'feint': {
        p.defenseDownTurns = choice.turns || 1;
        p._feintTurns = 1;
        return `You feint and retreat. You'll take ${((1 - (choice.reducedDmg || 0.30)) * 100).toFixed(0)}% damage from counter-attacks.`;
      }
      case 'analyze': {
        p.evade = (p.evade || 0) + Math.floor((choice.evasionBonus || 0.20) * 100);
        p._analyzeTurns = choice.turns || 1;
        return `You study the enemy's attack pattern. +${Math.floor((choice.evasionBonus || 0.20) * 100)} evasion for ${choice.turns || 1} turns.`;
      }
      case 'focus': {
        p.critBuffTurns = choice.turns || 1;
        return `You clear your mind. +${(choice.amount || 0.10) * 100}% crit chance for next combat.`;
      }
      case 'checkGear':
        return 'You inspect your weapons and neural implants. Everything is in working order.';
      case 'lore':
        return 'You review the latest Free Signal bulletins. Interesting intel on Aegis operations...';
      case 'fight':
        return 'You grip your weapon and prepare for combat.';
      case 'tank': {
        const dmg = 8 + Math.floor(Math.random() * 10) + (sector * 2);
        p.hp = Math.max(1, p.hp - dmg);
        return `You power through the hazard. Took ${dmg} damage but maintained momentum.`;
      }
      case 'disarm': {
        if (Math.random() < 0.6) {
          return 'You carefully disarm the trap. No damage taken.';
        } else {
          const dmg = Math.floor((8 + Math.floor(Math.random() * 12) + (sector * 2)) * 0.5);
          p.hp = Math.max(1, p.hp - dmg);
          return `Disarm attempt failed! Took ${dmg} damage (50% reduced).`;
        }
      }
      case 'decrypt': {
        const amt = (choice.creditBonus || 50) + Math.floor(Math.random() * 30);
        p.credits += amt;
        this.credits = p.credits;
        if (Math.random() < 0.25) {
          const dmg = 10 + Math.floor(Math.random() * 10);
          p.hp = Math.max(1, p.hp - dmg);
          return `Decryption successful: +${amt}c. But detection alarms triggered! Took ${dmg} damage.`;
        }
        return `Decryption successful: +${amt}c. Clean exit.`;
      }
      default:
        return `You chose: ${choice.title || 'nothing specific'}.`; }
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
      let dmg = 12 + Math.floor(Math.random() * 15) + (this.activeSector * 3);
      // Apply difficulty scaling to trap damage
      if (this._difficultyMultiplier && this._difficultyMultiplier !== 1.0) {
        dmg = Math.floor(dmg * this._difficultyMultiplier);
      }
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
    let enemyData;
    // Sector 3 boss: spawn WARDEN directly at final tile
    if (this._pendingWardenBoss) {
      enemyData = { ...WARDEN_BOSS };
      this._pendingWardenBoss = false;  // Consume the flag
    } else {
      // Check if this is the final tile of sector 3 (boss should have been handled above)
      // Otherwise use standard enemy generation
      const isFinalTile = (this.activeSector === 3 && this.activeTileIndex >= this.board.length - 1);
      enemyData = getEnemyForSector(this.activeSector, this.difficulty, isFinalTile);
    }

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

    // ── WARDEN BOSS TRACKING ──
    const isBoss = enemyData.isBoss;
    this.combatState.isBoss = isBoss;
    if (isBoss) {
      this.combatState.wardenPhase = 1;     // Phase 1: Surveillance (100-60% HP)
      this.combatState.wardenTurn = 0;      // Turn counter for ability cycling
      this.combatState.wardenGuaranteedCrits = 0; // Phase 3 Omniscience: guaranteed crits remaining
      this.combatState.wardenGridRebootUsed = false; // Phase 3: grid_reboot used flag
      this.combatState.logicBombTriggered = false;   // Logic bomb choice shown at ≤10% HP
      this.combatState.logicBombChosen = null;       // 'alpha'|'beta'|'gamma'
      this.combatState.wardenDefeated = false;
      this.combatState.bossAbilitiesDisabled = false; // Beta logic bomb effect
      this.commitBossText(`THE WARDEN AWAKENS — Phase 1`);
      this.battleLog.push('  "You have reached the core. This is where your journey ends."');
    } else if (enemyData.type === 'warden') {
      // Warden Avatar (miniboss): track turn for avatar abilities
      enemyData.avatarTurn = 0;
      enemyData.avatarAbilities = WARDEN_AVATAR.avatarAbilities;
      this.battleLog.push('  A Warden Avatar guards the node — a fragment of the main consciousness.');
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

    // Track ability for visual effects in Phaser scene
    this._lastAbilityType = ability.type;
    this._lastAbilityId = ability.id;
    this._lastAbilityIndex = abilityIndex;

    if (ability.type === 'attack') {
      this.executeAttackAbility(ability);
    } else if (ability.type === 'buff') {
      this.executeBuffAbility(ability);
    } else if (ability.type === 'heal') {
      this.executeHealAbility(ability);
    }

    // ── SFX: non-attack abilities ──
    if (ability.type !== 'attack') {
      try {
        const sfxName = resolveSFXForAbility(ability, false, this.combatState.isBoss, false);
        if (sfxName) playSFX(sfxName);
        else playSFX('ability_used');
      } catch(e) {}
    }

    // Logic Bomb Choice - trigger at <=10% HP (before boss dies)
    if (this.combatState.isBoss &&
        !this.combatState.logicBombTriggered &&
        this.combatState.enemy.hp > 0 &&
        this.combatState.enemy.hp <= this.combatState.enemy.hpMax * 0.10) {
      this.combatState.logicBombTriggered = true;
      this.narrativePopup = {
        title: '\u2605 FINAL CHOICE - Logic Bomb Protocol',
        text: `The Warden is critically damaged - ${this.combatState.enemy.hp} / ${this.combatState.enemy.hpMax} HP. A moment of vulnerability opens in its defense matrix. Choose your final payload with extreme precision.`,
        type: 'logicBombChoice',
        choices: [
          { label: '\u26a1 Logic Bomb: Alpha', desc: 'Overload decision matrix | 40-80 DMG | leaves backdoor', result: () => this.logicBombChoice('alpha') },
          { label: '\U0001f512 Logic Bomb: Beta', desc: 'Corrupt perception matrix | 50-70 DMG | disables all boss abilities', result: () => this.logicBombChoice('beta') },
          { label: '\u2620\uFE0F Logic Bomb: Gamma', desc: 'Distributed DoS attack | 30-60 DMG | -30% max HP permanently', result: () => this.logicBombChoice('gamma') }
        ]
      };
      this.showNarrativePopup();
      this.battleLog.push('\\n  \u26a0 CRITICAL - Final choice required!');
      return false;
    }

    // ── Check immediate deaths ──Check immediate deaths ──
    // WARDEN boss: show final blow choice instead of auto-win
    if (this.combatState.enemy.hp <= 0 && this.combatState.isBoss) {
      this.combatState.wardenDefeated = true;
      this.narrativePopup = {
        title: '★ BOSS DEFEATED!',
        text: `✦ ${this.combatState.enemy.name} has been brought to its knees! ` +
              `The core node flickers, its systems failing. You have a moment to act.`,
        type: 'wardenFinalBlow',
        choices: [
          { label: '★ Inject Logic Bomb', result: () => this.resolveFinalBlow(0) },
          { label: '★ Reprogram Node',    result: () => this.resolveFinalBlow(1) }
        ]
      };
      this.showNarrativePopup();
      this.battleLog.push(`✦ ${this.combatState.enemy.name} destroyed!`);
      return false;  // Don't resolve combat normally
    }
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
    let _isCrit = false; // track crit for SFX

    for (let i = 0; i < strikes; i++) {
      let dmg = ability.minPower + Math.floor(Math.random() * (ability.maxPower - ability.minPower + 1));

      // ── Crit check ──
      const critChance = 0.10 + (this.player.critBonus || 0) + (ability.critBonus || 0) + (this.player.critBuffTurns > 0 ? 0.15 : 0);
      const isCrit = Math.random() < critChance;
      if (isCrit) _isCrit = true;
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

    // ── SFX: attack ──
    try {
      const sfxName = resolveSFXForAbility(ability, _isCrit, this.combatState.isBoss, false);
      playSFX(sfxName || 'gun_attack');
      if (_isCrit) playSFX('critical_hit');
    } catch(e) {}
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

  // ─── WARDEN BOSS METHODS ────────────────────────────────────────────────
  /**
   * Resolve the WARDEN boss final blow narrative choice.
   * Must be triggered by player ability selection (Logic Bomb or Reprogram Node).
   * @param {number} choiceIndex - 0 = Logic Bomb, 1 = Reprogram Node
   */
  /**
   * Execute the chosen Logic Bomb: massive damage + special effects.
   * @param {string} type - alpha | beta | gamma
   */
  logicBombChoice(type) {
    this.combatState.logicBombChosen = type;
    const enemy = this.combatState.enemy;
    if (type === 'alpha') {
      const dmg = 40 + Math.floor(Math.random() * 41);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      this.battleLog.push('\n  ⚡ LOGIC BOMB: ALPHA');
      this.battleLog.push('    Decision matrix overloaded - ' + dmg + ' damage to Warden core!');
      this.battleLog.push('    Backdoor planted - Warden consciousness partially preserved.');
      try {
        const lf = JSON.parse(localStorage.getItem('aegis_lore') || '[]');
        if (!lf.includes('ghost_backdoor')) { lf.push('ghost_backdoor'); localStorage.setItem('aegis_lore', JSON.stringify(lf)); this.battleLog.push('    ★ Lore Unlocked: "The Ghost Route\'s Secret"'); }
      } catch(e) {}
    } else if (type === 'beta') {
      const dmg = 50 + Math.floor(Math.random() * 21);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      this.combatState.bossAbilitiesDisabled = true;
      this.battleLog.push('\n  🔒 LOGIC BOMB: BETA');
      this.battleLog.push('    Perception matrix corrupted - ' + dmg + ' damage to Warden core!');
      this.battleLog.push('    All Warden abilities disabled for the remainder of the fight.');
      this.battleLog.push('    The Warden stumbles, confused by contradictory inputs.');
      try {
        const lf = JSON.parse(localStorage.getItem('aegis_lore') || '[]');
        if (!lf.includes('warden_doubt')) { lf.push('warden_doubt'); localStorage.setItem('aegis_lore', JSON.stringify(lf)); this.battleLog.push('    ★ Lore Unlocked: "Warden\'s Doubt"'); }
      } catch(e) {}
    } else if (type === 'gamma') {
      const dmg = 30 + Math.floor(Math.random() * 31);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      const hpPenalty = Math.floor(this.player.hpMax * 0.3);
      this.player.hpMax -= hpPenalty;
      this.player.hp = Math.min(this.player.hp, this.player.hpMax);
      this.battleLog.push('\n  ☠️ LOGIC BOMB: GAMMA');
      this.battleLog.push('    DDoS flood across ' + dmg + ' Grid nodes - ' + dmg + ' damage to Warden!');
      this.battleLog.push('    Overload backlash - permanent HP reduction: -' + hpPenalty + ' max HP.');
      try {
        const ac = JSON.parse(localStorage.getItem('aegis_achievements') || '[]');
        if (!ac.includes('sacrifice_play')) { ac.push('sacrifice_play'); localStorage.setItem('aegis_achievements', JSON.stringify(ac)); this.battleLog.push('    ★ Achievement Unlocked: "Sacrifice Play"'); }
      } catch(e) {}
    }
    this.battleLog.push('  +' + enemy.hpMax + ' critical damage applied - sector clearance initiated!');
    // After logic bomb, trigger sector completion flow
    this.combatState.wardenDefeated = true;
    this.endCombat(true);
  }

  resolveFinalBlow(choiceIndex) {
    if (!this.combatState || !this.combatState.isBoss || !this.combatState.wardenDefeated) return false;
    const enemy = this.combatState.enemy;

    // ── Achievement tracking via localStorage ──
    try {
      // Track that Warden has been defeated
      const achievements = JSON.parse(localStorage.getItem('aegis_achievements') || '[]');
      if (!achievements.includes('warden_slain')) {
        achievements.push('warden_slain');
        localStorage.setItem('aegis_achievements', JSON.stringify(achievements));
        this.battleLog.push('\n★ Achievement Unlocked: "Warden Slayer" — Defeated THE WARDEN!');
      }
      if (!achievements.includes('warden_down')) {
        achievements.push('warden_down');
        localStorage.setItem('aegis_achievements', JSON.stringify(achievements));
      }
      // Track sectors cleared
      const sectors = JSON.parse(localStorage.getItem('aegis_sectors_clear') || '[]');
      if (!sectors.includes(3)) {
        sectors.push(3);
        localStorage.setItem('aegis_sectors_clear', JSON.stringify(sectors));
      }
    } catch(e) {}

    if (choiceIndex === 0) {
      // Logic Bomb: destroy the node, sector completion, bonus credits
      const bonusCredits = 200;
      enemy.creditReward += bonusCredits;
      this.battleLog.push('\n★ LOGIC BOMB DETONATED!');
      this.battleLog.push('  The Warden\'s core implodes — the Aegis Grid shudders across Sector ' + this.activeSector);
      this.battleLog.push('  +' + bonusCredits + ' bonus credits (Logic Bomb payload)');
      this.totalCreditsEarned += bonusCredits;
      try { localStorage.setItem('aegis_watcher_won', 'true'); } catch(e) {}
    } else {
      // Reprogram Node: different ending, bonus credits, lore unlock
      const bonusCredits = 300;
      enemy.creditReward += bonusCredits;
      this.battleLog.push('\n★ NODE REPROGRAMMED!');
      this.battleLog.push('  The Warden\'s consciousness fragments — you glimpse its origin:');
      this.battleLog.push('  "Born from a thousand neural feeds... it believed it was helping..."');
      this.battleLog.push('  Aegis\'s true purpose revealed — not protection, but total control.');
      this.battleLog.push('  +' + bonusCredits + ' bonus credits (Reprogramming payload)');
      this.totalCreditsEarned += bonusCredits;
      try {
        localStorage.setItem('aegis_warden_lore', 'true');
        const loreFlags = JSON.parse(localStorage.getItem('aegis_lore') || '[]');
        if (!loreFlags.includes('warden_origin')) {
          loreFlags.push('warden_origin');
          localStorage.setItem('aegis_lore', JSON.stringify(loreFlags));
          this.battleLog.push('  ★ Lore Fragment Unlocked: "The Warden\'s Origin"');
        }
      } catch(e) {}
    }

    this.battleLog.push('  +' + enemy.xpReward + ' XP  |  +' + enemy.creditReward + ' credits');
    this.addXP(enemy.xpReward);
    this.player.credits += enemy.creditReward;
    this.credits = this.player.credits;
    this.totalCreditsEarned += enemy.creditReward;
    this.battleLog.push('✦ Core Injected! Sector ' + this.activeSector + ' cleared.');


    // ── Sector Completion ──
    this.battleLog.push('\n  ★ SECTOR COMPLETE — ' + (this.combatState.enemy.name || 'The Warden') + ' neutralized!');
    this.player.credits += 500;
    this.credits = this.player.credits;
    this.totalCreditsEarned += 500;
    this.battleLog.push('  +500 credits (sector bonus)');
    try {
      const unlocked = JSON.parse(localStorage.getItem('aegis_unlockedSectors') || '[]');
      if (!unlocked.includes(this.activeSector)) { unlocked.push(this.activeSector); localStorage.setItem('aegis_unlockedSectors', JSON.stringify(unlocked)); }
      const ac = JSON.parse(localStorage.getItem('aegis_achievements') || '[]');
      if (!ac.includes('warden_down')) { ac.push('warden_down'); localStorage.setItem('aegis_achievements', JSON.stringify(ac)); this.battleLog.push('  ★ Achievement Unlocked: "Warden Down"'); }
    } catch(e) {}
    // Check if this was the final sector
    if (this.activeSector >= 3) {
      this.gameState = 'victory';
    } else {
      this.activeSector++;
      this.gameState = 'victory';
    }
    this.savePersistent();
    return true;
  }

  /**
   * Check WARDEN boss phase transition based on HP threshold.
   * Phase 1: 100-60% HP (surveillance)  → Phase 2 at ≤60%
   * Phase 2: 59-30% HP (aggressive)     → Phase 3 at ≤30%
   * Phase 3: 29-0% HP (desperate)
   * Triggers screen shake and visual effects on phase change.
   */
  updateBossPhase() {
    if (!this.combatState || !this.combatState.isBoss) return;
    const enemy = this.combatState.enemy;
    const hpPct = (enemy.hp / enemy.hpMax) * 100;
    const currentPhase = this.combatState.wardenPhase;
    let newPhase = 1;
    if (hpPct <= 60) newPhase = 2;
    if (hpPct <= 30) newPhase = 3;
    if (newPhase !== currentPhase) {
      this.combatState.wardenPhase = newPhase;
      const labels = ['', '', '⚔ PHASE 2 — THE WARDEN GOES AGGRESSIVE ⚔', '💀 PHASE 3 — THE WARDEN DESPERATE 💀'];
      const messages = {
        2: [
          '  ⚡ THE WARDEN\'s systems shift — surveillance mode abandoned.',
          '  "You think you\'re winning? I\'ll crush you myself."',
          '  Titan Deployment and EMP Burst now active.'
        ],
        3: [
          '  💀 THE WARDEN\'s core destabilizes — all caution discarded.',
          '  "If I cannot control you, I will unmake you."',
          '  Area Denial and Power Spike active. This is the end.'
        ]
      };
      this.commitBossText('⚡ PHASE CHANGE: ' + labels[newPhase]);
      messages[newPhase].forEach(msg => this.battleLog.push(msg));

      // Screen shake effect (sent to Phaser scene via engine flag)
      this._bossPhaseShake = 15;
    }
  }

  /**
   * Log a WARDEN boss phase text to the battle log.
   */
  commitBossText(text) {
    this.battleLog.push('\n' + text);
  }

  /**
   * Execute WARDEN boss abilities for the current turn.
   * Uses the period-based schedule from WARDEN_ABILITIES.
   * Supports multi-ability combos when periods align.
   * @param {Object} enemy - The boss enemy object
   * @param {number} phase - Current boss phase (1, 2, or 3)
   * @param {number} turn - Current Warden turn counter
   */
  executeBossAbilities(enemy, phase, turn) {
    const abilities = WARDEN_ABILITIES[phase] || WARDEN_ABILITIES[1];
    const triggered = abilities.filter(ab => (turn % ab.period) === 0);

    if (triggered.length === 0) {
      return; // No abilities fire this turn
    }

    // Execute each triggered ability
    for (const ability of triggered) {
      this.battleLog.push(`  ${ability.emoji || '⚡'} ${ability.name} activated!`);

      if (ability.damageMin !== undefined) {
        let totalDmg = 0;
        const hits = ability.multiHit || 1;
        for (let h = 0; h < hits; h++) {
          const hitDmg = this._randomDmg(ability.damageMin, ability.damageMax);
          totalDmg += hitDmg;
          if (hits > 1) {
            this.battleLog.push(`    Hit ${h + 1}/${hits}: ${hitDmg} damage`);
          }
        }
        this.applyDamage(this.player, totalDmg, ability.name);
        this.battleLog.push(`    Total: ${totalDmg} damage${hits > 1 ? ' (' + hits + ' hits)' : ''}`);
      }

      // Stun effect (Titan Deployment)
      if (ability.stun) {
        this.player.stunTurns = ability.stun;
        this.battleLog.push('    Enemy stunned for ' + ability.stun + ' turn(s)!');
      }

      // Credit steal effect (Neural Dampen)
      if (ability.creditSteal) {
        if (this.player.credits >= ability.creditSteal) {
          this.player.credits -= ability.creditSteal;
          this.credits = this.player.credits;
          this.battleLog.push('    Stole ' + ability.creditSteal + ' credits from terminal.');
        } else {
          const fallbackDmg = ability.damageMin !== undefined ? 10 : 5;
          this.applyDamage(this.player, fallbackDmg, 'Neural Feedback');
          this.battleLog.push('    Insufficient credits — neural feedback deals ' + fallbackDmg + ' damage.');
        }
      }

      // Power buff effect (Patrol Call, Power Spike)
      if (ability.buffPower) {
        enemy.power += ability.buffPower;
        enemy.debuffPowerTurns = ability.buffDuration || 3;
        this.battleLog.push('    Warden power increased by ' + ability.buffPower + ' for ' + ability.buffDuration + ' turns!');
      }

      // ── Phase 3: Grid Reboot — heal boss HP ──
      if (ability.healAmount && !this.combatState.wardenGridRebootUsed) {
        const healed = Math.min(ability.healAmount, enemy.hpMax - enemy.hp);
        enemy.hp += healed;
        this.battleLog.push('    THE WARDEN reboots damaged systems — restored ' + healed + ' HP.');
        this.combatState.wardenGridRebootUsed = true;
      }

      // ── Phase 3: Debuff Evade (Surveillance Nexus / generic) ──
      if (ability.debuffEvade) {
        this.player.evade = Math.max(0, (this.player.evade || 0) - ability.debuffEvade);
        this.battleLog.push('    ' + ability.name + ' reduces evade by ' + ability.debuffEvade + ' for ' + (ability.debuffDuration || 2) + ' turns.');
      }

      // ── Phase 3: Omniscience — set guaranteed crit counter ──
      if (ability.guaranteedCrit) {
        this.combatState.wardenGuaranteedCrits = ability.buffNextAttacks || 2;
        this.battleLog.push('    THE WARDEN perceives all futures — next ' + (ability.buffNextAttacks || 2) + ' player attacks will be guaranteed criticals!');
      }
    }
  }

  /**
   * Execute WARDEN Avatar (miniboss) abilities for the current turn.
   * Weaker than the main boss but still uses surveillance mechanics.
   */
  executeAvatarAbilities(enemy, turn) {
    if (!enemy.avatarAbilities) return;
    const ab = enemy.avatarAbilities;

    // Drone Swarm (miniboss version): every 3 turns
    if (turn % 3 === 0 && ab.droneSwarm) {
      const dmg = this._randomDmg(ab.droneSwarm.damageMin, ab.droneSwarm.damageMax);
      this.applyDamage(this.player, dmg, 'Drone Swarm');
      this.battleLog.push('  🤖 Drone Swarm: ' + dmg + ' damage!');
    }

    // Neural Dampen (miniboss version): every 5 turns
    if (turn % 5 === 0 && ab.neuralDampen) {
      const stolen = ab.neuralDampen.creditSteal || 3;
      if (this.player.credits >= stolen) {
        this.player.credits -= stolen;
        this.credits = this.player.credits;
        this.battleLog.push('  🧠 Neural Dampen: stole ' + stolen + ' credits.');
      } else {
        const d = this._randomDmg(ab.neuralDampen.damageMin, ab.neuralDampen.damageMax);
        this.applyDamage(this.player, d, 'Neural Dampen');
        this.battleLog.push('  🧠 Neural Dampen: ' + d + ' damage — no credits to steal.');
      }
    }
  }

  // ─── HELPER: Random damage in range ─────────────────────────────────────
  _randomDmg(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
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
      // ── SFX: dodge ──
      try { playSFX('dodge'); } catch(e) {}
      this.processEnemyDoT(enemy);
      this.gameState = 'combat';
      return;
    }

    // ── WARDEN BOSS ABILITIES (phase-based, period-driven) ──
    if (enemy.type === 'warden' && enemy.wardenTurn !== undefined) {
      this.combatState.wardenTurn++;
      this.updateBossPhase();
      const phase = this.combatState.wardenPhase;
      const wt = this.combatState.wardenTurn;

      // Execute boss abilities for this turn using period-based schedule
      // from WARDEN_ABILITIES. Multi-ability combos fire when periods align.
      this.executeBossAbilities(enemy, phase, wt);
    }

    // ── Calculate enemy regular damage (apply power debuffs) ──
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
      // ── SFX: player takes damage ──
      try { playSFX('enemy_damaged'); } catch(e) {}
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
    // Guard: WARDEN boss must be resolved through final blow choice
    if (playerWon && this.combatState && this.combatState.isBoss && !this.combatState.wardenDefeated) {
      return false;
    }

    if (playerWon) {
      const enemy = this.combatState.enemy;
      this.battleLog.push(`✦ ${enemy.name} destroyed!`);
      this.battleLog.push(`  +${enemy.xpReward} XP  |  +${enemy.creditReward} credits`);

      // Grant XP and credits
      this.addXP(enemy.xpReward);
      this.player.credits += enemy.creditReward;
      this.credits = this.player.credits;
      this.totalCreditsEarned += enemy.creditReward;

      // ── SFX: combat victory ──
      try { playSFX('victory'); } catch(e) {}

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
      // ── SFX: game over ──
      try { playSFX('game_over'); } catch(e) {}
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

  // ─── NEXT SECTOR / BOARD SCREEN ──────────────────────────────────────
  startNextSector() {
    if (this.activeSector >= 3) {
      // All sectors complete - show victory
      this.gameState = 'victory';
      // Stop music on final victory
      try { stopMusic(); } catch(e) {}
      return;
    }
    // Reset for next sector
    this.combatState = null;
    this.combatState = { isBoss: false, wardenPhase: 1, wardenTurn: 0 };
    this.battleLog = [];
    this.gameState = 'board';
    window.showBoardScreen && window.showBoardScreen();
    // ── Music: sector-appropriate track ──
    try {
      stopMusic();
      const sectorTracks = { 1: 'industrial_dark', 2: 'synthwave_glitch', 3: 'intense_orchestral' };
      playMusic(sectorTracks[this.activeSector] || 'industrial_dark');
    } catch(e) {}
  }

  showBoardScreen() {
    this.gameState = 'board';
    const boardScreen = document.getElementById('boardScreen');
    if (boardScreen) {
      boardScreen.classList.add('active');
      boardScreen.style.display = 'flex';
    }
    // Hide combat UI
    const abilityPanel = document.getElementById('ability-panel');
    if (abilityPanel) abilityPanel.classList.remove('visible');
  }
}
