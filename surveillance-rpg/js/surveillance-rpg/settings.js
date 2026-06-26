/**
 * settings.js - Settings, Options & Accessibility Menu
 *
 * Phaser 3 scene providing:
 *  - Sound toggle/mute, music volume, SFX volume sliders
 *  - Text speed (fast/normal/slow)
 *  - Colorblind mode (off/protanopia/deuteranopia/tritanopia)
 *  - Difficulty selector (easy/medium/hard/insane)
 *  - Data management: export stats JSON, reset data
 *  - Key bindings display
 *  - Credits/about screen
 *
 * All settings persist to localStorage under key `aegis_settings`.
 */

import { toggleMute } from './sound.js';
import { getRunHistory, getUnlockedAchievements, getBestStats, getAllAchievementsWithState, ACHIEVEMENTS } from './gameover.js';

// ─── DIFFICULTY PRESETS ──────────────────────────────────────────────────────

export const DIFFICULTY_PRESETS = {
  easy:   { label: 'Easy',   mult: 0.8, desc: '-20% enemy stats' },
  medium: { label: 'Medium', mult: 1.0, desc: 'Default difficulty' },
  hard:   { label: 'Hard',   mult: 1.3, desc: '+30% enemy stats' },
  insane: { label: 'Insane', mult: 1.6, desc: '+60% enemy stats' }
};

// ─── DEFAULT SETTINGS ─────────────────────────────────────────────────────────

const DEFAULTS = {
  masterVolume: 0.7, musicVolume: 0.5, sfxVolume: 0.8,
  isMuted: false, textSpeed: 'normal', colorblind: 'off', difficulty: 'medium',
  keyBindings: { rollDice: 'Space', ability1: '1', ability2: '2',
    ability3: '3', ability4: '4', nextSector: 'Enter', closeSettings: 'Escape' }
};

/**
 * Colorblind palettes - overrides tile/status indicator colors.
 */
export const COLORBLIND_PALETTES = {
  off:        { trap:0xff0055, safe:0x39ff14, combat:0xffaa00, serverNode:0xb026ff, safehouse:0x00f3ff, start:0xffffff, boss:0xff0055, player:0x00f3ff },
  protanopia: { trap:0xcc5500, safe:0x39ff14, combat:0xffdd44, serverNode:0xb026ff, safehouse:0x00f3ff, start:0xffffff, boss:0xcc5500, player:0x00f3ff },
  deuteranopia:{ trap:0xff0055, safe:0x33aaff, combat:0xffaa00, serverNode:0xb026ff, safehouse:0x00f3ff, start:0xffffff, boss:0xff0055, player:0x00f3ff },
  tritanopia: { trap:0xff0055, safe:0x39ff14, combat:0xffaa00, serverNode:0xff55aa, safehouse:0x00cc44, start:0xffffff, boss:0xff0055, player:0x00cc44 }
};

// Text speed: ms per character (lower = faster)
const TEXT_SPEED_MS = { fast: 5, normal: 20, slow: 50 };

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let _settings = _loadSettings();

function _loadSettings() {
  try {
    const s = localStorage.getItem('aegis_settings');
    if (s) return { ...DEFAULTS, ...JSON.parse(s) };
  } catch(e) {}
  return { ...DEFAULTS };
}

function _saveSettings() {
  try { localStorage.setItem('aegis_settings', JSON.stringify(_settings)); } catch(e) {}
}

export function getColorblindPalette(mode) {
  if (mode === 'off' || !COLORBLIND_PALETTES[mode]) return null;
  return COLORBLIND_PALETTES[mode];
}

export function getColorblindActive() {
  return _settings.colorblind && _settings.colorblind !== 'off'
    ? COLORBLIND_PALETTES[_settings.colorblind] : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export all game stats as a JSON file download.
 */
export function exportStatsJSON(engine) {
  const runs = getRunHistory();
  const achs = getUnlockedAchievements();
  const best = getBestStats() || {};
  const allAch = getAllAchievementsWithState(null, engine?.totalRuns || 0);

  const data = {
    exportedAt: new Date().toISOString(),
    game: 'Aegis Threat Protocol', version: '1.0',
    settings: _settings,
    persistent: {
      totalRuns: engine?.totalRuns || 0, totalLevel: engine?.totalLevel || 0,
      totalCreditsEarned: engine?.totalCreditsEarned || 0, credits: engine?.credits || 0,
      unlockedClasses: engine?.unlockedClasses || [],
      permanentUpgrades: engine?.permanentUpgrades || [],
      unlockedSectors: engine?.unlockedSectors || [],
      difficulty: engine?.difficulty || 1,
      ngpCount: engine?.ngpCount || 0, totalNGP: engine?.totalNGP || 0
    },
    achievements: allAch, unlockedAchievements: achs,
    achievementsUnlocked: achs.length, achievementsTotal: ACHIEVEMENTS.length,
    bestRun: { bestSectors: best.bestSectors || 0, longestRun: best.longestDuration || '0s',
      mostCredits: best.mostCredits || 0, mostEnemies: best.mostEnemies || 0 },
    runHistory: runs, totalRunsInHistory: runs.length
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aegis_stats_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reset all game data in localStorage.
 */
export function resetAllData() {
  ['aegis_credits','aegis_perm_upgrades','aegis_unlocked_classes','aegis_totalLevel',
   'aegis_totalRuns','aegis_totalCredits','aegis_achievements','aegis_runHistory',
   'aegis_bestStats','aegis_unlockedSectors','aegis_settings'
  ].forEach(k => localStorage.removeItem(k));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS SCENE
// ═══════════════════════════════════════════════════════════════════════════════

let gameEngineRef = null;

export function setGameEngineRef(engine) { gameEngineRef = engine; }
export function getSettings() { return _settings; }

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create(data) {
    _settings = _loadSettings();

    // Full-screen overlay
    const bg = this.add.rectangle(400, 300, 800, 600, 0x050811, 0.97);
    bg.setInteractive();
    bg.on('pointerdown', () => this.closeSettings());

    // Border
    this.add.graphics().lineStyle(2, 0x00f3ff, 0.25).strokeRoundedRect(15, 15, 770, 570, 8);

    this.add.text(400, 55, 'SETTINGS & OPTIONS', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#00f3ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Section dividers
    this._drawDivider(90, 'AUDIO');
    this._drawDivider(175, 'GAMEPLAY');
    this._drawDivider(265, 'ACCESSIBILITY');
    this._drawDivider(350, 'DATA MANAGEMENT');
    this._drawDivider(420, 'KEY BINDINGS');

    // ── 1. SOUND ──
    this._createToggle(100, 100, 'Master Mute', _settings.isMuted, (v) => {
      _settings.isMuted = v; _saveSettings();
      try { toggleMute(v); } catch(e) {}
    });

    this._createSlider(100, 135, 'Music', _settings.musicVolume, (v) => {
      _settings.musicVolume = Math.round(v * 100) / 100; _saveSettings();
      try { this.game.events.emit('aegis_music_volume', v); } catch(e) {}
      this._musicValText.setText(Math.round(v * 100) + '%');
    });

    this._createSlider(400, 135, 'SFX', _settings.sfxVolume, (v) => {
      _settings.sfxVolume = Math.round(v * 100) / 100; _saveSettings();
      try { this.game.events.emit('aegis_sfx_volume', v); } catch(e) {}
      this._sfxValText.setText(Math.round(v * 100) + '%');
    });

    // ── 2. GAMEPLAY ──
    this._createDropdown(100, 190, 'Text Speed', _settings.textSpeed,
      ['fast', 'normal', 'slow'], (v) => {
        _settings.textSpeed = v; _saveSettings();
        this._tsBtnText = v.toUpperCase();
        try { this.game.events.emit('aegis_text_speed', v); } catch(e) {}
      }
    );

    this._createDropdown(400, 190, 'Difficulty', _settings.difficulty,
      ['easy', 'medium', 'hard', 'insane'], (v) => {
        _settings.difficulty = v; _saveSettings();
        this._dfBtnText = v.toUpperCase();
        this._dfDescText.setText(DIFFICULTY_PRESETS[v].desc + ' (applies on new run)');
      }
    );
    this._dfDescText = this.add.text(400, 208,
      DIFFICULTY_PRESETS[_settings.difficulty].desc + ' (applies on new run)', {
      fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: '#7d96b4'
    }).setOrigin(0, 0);

    // ── 3. ACCESSIBILITY: Colorblind ──
    this._createDropdown(100, 280, 'Colorblind Mode', _settings.colorblind,
      ['off', 'protanopia', 'deuteranopia', 'tritanopia'], (v) => {
        _settings.colorblind = v; _saveSettings();
        this._cbBtnText = v.toUpperCase();
        this._cbDescText.setText(v === 'off' ? 'Standard color palette' : `Active: ${v} palette`);
        this._applyPalette(v);
        this._updateSwatches(v);
      }
    );

    this._cbDescText = this.add.text(100, 298,
      _settings.colorblind === 'off' ? 'Standard color palette' : `Active: ${_settings.colorblind} palette`,
      { fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: '#7d96b4' }
    ).setOrigin(0, 0);

    this._previewSwatches = [];
    this._updateSwatches(_settings.colorblind);

    // ── 4. DATA ──
    this._createButton(100, 360, 'EXPORT STATS (JSON)', () => {
      exportStatsJSON(gameEngineRef);
      this._dataStatus.setText('Exported! Check downloads.');
      setTimeout(() => { this._dataStatus.setText(this._dataStatusText()); }, 3000);
    });

    this._createButton(400, 360, 'RESET ALL DATA', () => {
      this._confirmReset();
    });

    this._dataStatus = this.add.text(100, 395, this._dataStatusText(), {
      fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: '#7d96b4'
    }).setOrigin(0, 0);

    // ── 5. KEY BINDINGS ──
    this.add.text(100, 430, 'Keyboard Shortcuts:', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: '#7d96b4', fontStyle: 'bold'
    });

    const kb = _settings.keyBindings || {};
    const binds = [
      { l: 'Roll Dice', k: kb.rollDice || 'Space' }, { l: 'Ability 1', k: kb.ability1 || '1' },
      { l: 'Ability 2', k: kb.ability2 || '2' }, { l: 'Ability 3', k: kb.ability3 || '3' },
      { l: 'Ability 4', k: kb.ability4 || '4' }, { l: 'Next Sector', k: kb.nextSector || 'Enter' },
      { l: 'Close', k: kb.closeSettings || 'Esc' }
    ];

    binds.forEach((b, i) => {
      const c = i < 4 ? 0 : 1, r = i < 4 ? 0 : 1;
      const x = 100 + c * 300, y = 450 + r * 18;
      this.add.text(x, y, b.l + ':', { fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#e2f1ff' });
      this.add.text(x + 110, y, b.k, { fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#00f3ff' });
    });

    // ── CREDITS ──
    const cy = 490;
    this.add.text(100, cy, 'AEGIS THREAT PROTOCOL', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00f3ff', fontStyle: 'bold'
    });
    this.add.text(100, cy + 18, 'Earth-2142 Node-Infiltration Roguelike RPG', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#7d96b4'
    });
    this.add.text(100, cy + 34, 'Infiltrate the Aegis Surveillance Grid across Neo-Tokyo and New London.', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#7d96b4'
    });
    this.add.text(100, cy + 50, 'Built with Phaser 3, Web Audio API, and determination.', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#7d96b4'
    });
    this.add.text(400, cy + 50, 'Press Escape or click outside to close.', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#00f3ff'
    });

    // Close button
    this._createButton(720, 35, 'X CLOSE', () => this.closeSettings());

    // Escape key
    this.input.keyboard.on('keydown-ESC', () => this.closeSettings());
  }

  // ─── UI HELPERS ───

  _drawDivider(y, label) {
    this.add.graphics().lineStyle(1, 0x00f3ff, 0.12).lineBetween(60, y, 740, y);
    this.add.text(70, y - 9, label, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: '#7d96b4', fontStyle: 'bold'
    });
  }

  _createToggle(x, y, label, initial, onChange) {
    const g = this.add.graphics();
    const knob = this.add.graphics();
    const hit = this.add.rectangle(x + 22, y + 11, 64, 22, 0, 0).setInteractive();
    let cur = initial;

    const draw = (on) => {
      g.clear();
      g.fillStyle(on ? 0x00f3ff : 0x1a293d, 1).fillRoundedRect(x, y, 44, 22, 11);
      knob.clear();
      knob.fillStyle(0xffffff, 1).fillCircle(on ? x + 40 : x + 4, y + 11, 8);
    };
    draw(cur);

    hit.on('pointerdown', () => {
      cur = !cur;
      onChange(cur);
      draw(cur);
    });

    this.add.text(x + 50, y + 1, label, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#e2f1ff'
    });
  }

  _createSlider(x, y, label, initial, onChange) {
    const w = 200, h = 8;
    const track = this.add.graphics();
    track.fillStyle(0x1a293d, 1).fillRoundedRect(x, y, w, h, h / 2);

    const fill = this.add.graphics();
    const initW = initial * w;
    fill.fillStyle(0x00f3ff, 0.5).fillRoundedRect(x, y, initW, h, h / 2);

    const knob = this.add.graphics();
    knob.fillStyle(0x00f3ff, 1).fillCircle(x + initW, y + h / 2, 6);

    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, 18, 0, 0).setInteractive();
    const valText = this.add.text(x + w + 12, y + 1, Math.round(initial * 100) + '%', {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#00f3ff'
    });

    this.add.text(x, y - 14, label, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#e2f1ff'
    });

    let dragging = false;
    hit.on('pointerdown', () => { dragging = true; });
    hit.on('pointerup', () => { dragging = false; });
    hit.on('pointerout', () => { dragging = false; });

    this.input.on('pointermove', (p) => {
      if (!dragging) return;
      const cx = Phaser.Math.Clamp(p.x - x, 0, w) / w;
      const px = cx * w;
      fill.clear();
      fill.fillStyle(0x00f3ff, 0.5).fillRoundedRect(x, y, px, h, h / 2);
      knob.clear();
      knob.fillStyle(0x00f3ff, 1).fillCircle(x + px, y + h / 2, 6);
      valText.setText(Math.round(cx * 100) + '%');
      onChange(cx);
    });

    if (label === 'Music') this._musicValText = valText;
    if (label === 'SFX') this._sfxValText = valText;
  }

  _createDropdown(x, y, label, current, options, onChange) {
    const bw = 150, bh = 26;

    this.add.text(x, y - 16, label, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#e2f1ff'
    });

    const btn = this._drawBtn(x, y, bw, bh, current);
    const hit = this.add.rectangle(x + bw / 2, y + bh / 2, bw, bh, 0, 0).setInteractive();
    let open = false;
    let optGrp = null;
    let closeFn = null;

    hit.on('pointerdown', () => {
      if (open) { open = false; this._closeOpts(); return; }
      open = true;
      optGrp = this.add.group();
      const panel = this.add.graphics();
      panel.fillStyle(0x0a1626, 0.98).fillRoundedRect(x - 2, y + bh, bw + 4, options.length * 26 + 4, 4);
      panel.lineStyle(1, 0x00f3ff, 0.3).strokeRoundedRect(x - 2, y + bh, bw + 4, options.length * 26 + 4, 4);
      optGrp.add(panel);

      options.forEach((opt, i) => {
        const oy = y + bh + 2 + i * 26;
        const active = opt === current;
        if (active) {
          const bg2 = this.add.graphics();
          bg2.fillStyle(0x00f3ff, 0.1).fillRoundedRect(x, oy, bw, 24, 3);
          bg2.lineStyle(1, 0x00f3ff, 0.3).strokeRoundedRect(x, oy, bw, 24, 3);
          optGrp.add(bg2);
        }
        optGrp.add(this.add.text(x + 8, oy + 2, `${active ? '▶ ' : ''}${opt.toUpperCase()}`, {
          fontFamily: 'Share Tech Mono', fontSize: '12px',
          color: active ? '#00f3ff' : '#7d96b4'
        }));

        const ohit = this.add.rectangle(x + bw / 2, oy + 12, bw, 24, 0, 0).setInteractive();
        ohit.on('pointerdown', () => {
          if (opt !== current) {
            onChange(opt);
            this._drawBtn(x, y, bw, bh, opt);
          }
          open = false; this._closeOpts();
        });
        optGrp.add(ohit);
      });

      closeFn = this.input.on('pointerdown', (p) => {
        if (!(p.x >= x - 2 && p.x <= x + bw + 4 && p.y >= y + bh && p.y <= y + bh + options.length * 26 + 4)) {
          open = false; this._closeOpts();
        }
      });
    });

    this._optCloseFn = closeFn;
  }

  _drawBtn(x, y, w, h, val) {
    const g = this.add.graphics();
    g.fillStyle(0x0a1626, 0.9).fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x00f3ff, 0.4).strokeRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x00f3ff, 0.8)
      .lineBetween(x + w - 12, y + 10, x + w - 6, y + 15)
      .lineBetween(x + w - 6, y + 15, x + w, y + 10);
    this.add.text(x + 8, y + 2, val.toUpperCase(), {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#00f3ff'
    });
  }

  _closeOpts() {
    if (this._optCloseFn) { this._optCloseFn.destroy(); this._optCloseFn = null; }
  }

  _createButton(x, y, label, onClick) {
    const bw = 190, bh = 28;
    const g = this.add.graphics();
    const drawBtn = (hov) => {
      g.clear();
      g.fillStyle(hov ? 0x00f3ff : 0x0a1626, hov ? 0.25 : 0.9).fillRoundedRect(x, y, bw, bh, 4);
      g.lineStyle(1, 0x00f3ff, hov ? 0.8 : 0.4).strokeRoundedRect(x, y, bw, bh, 4);
    };
    drawBtn(false);
    this.add.text(x + bw / 2, y + 1, label, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#e2f1ff', align: 'center'
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x + bw / 2, y + bh / 2, bw, bh, 0, 0).setInteractive();
    hit.on('pointerdown', onClick);
    hit.on('pointerover', () => drawBtn(true));
    hit.on('pointerout', () => drawBtn(false));
  }

  // ─── SETTINGS ACTIONS ───

  _applyPalette(mode) {
    if (mode === 'off') {
      window._aegisColorblindPalette = null;
      // Notify BoardScene via event
      this.game.events.emit('aegis_colorblind_change', null);
      return;
    }
    const palette = COLORBLIND_PALETTES[mode];
    if (!palette) return;
    window._aegisColorblindPalette = palette;
    // Notify BoardScene via event
    this.game.events.emit('aegis_colorblind_change', palette);
  }

  _updateSwatches(mode) {
    if (this._previewSwatches) {
      this._previewSwatches.forEach(s => { if (s.destroy) s.destroy(); });
      this._previewSwatches = [];
    }
    if (mode === 'off') return;
    const pal = COLORBLIND_PALETTES[mode];
    if (!pal) return;
    const items = [
      { l: 'Trap', c: pal.trap, x: 130 },
      { l: 'Safe', c: pal.safe, x: 220 },
      { l: 'Combat', c: pal.combat, x: 310 },
      { l: 'Boss', c: pal.boss, x: 400 }
    ];
    items.forEach(item => {
      this._previewSwatches.push(this.add.rectangle(item.x + 30, 335, 50, 20, item.c));
      this.add.text(item.x + 30, 355, item.l, {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#7d96b4'
      }).setOrigin(0.5);
    });
  }

  _dataStatusText() {
    try {
      const r = JSON.parse(localStorage.getItem('aegis_runHistory') || '[]');
      const a = JSON.parse(localStorage.getItem('aegis_achievements') || '[]');
      const c = localStorage.getItem('aegis_credits') || '0';
      return `${r.length} runs saved · ${a.length} achievements unlocked · ${c}c in bank`;
    } catch { return 'No data saved'; }
  }

  _confirmReset() {
    // Use Phaser's alert dialog if possible, otherwise plain confirm
    if (typeof confirm === 'function') {
      if (confirm('Reset ALL game data? This cannot be undone.')) {
        resetAllData();
        this._dataStatus.setText('All data reset!');
        setTimeout(() => { this._dataStatus.setText(this._dataStatusText()); }, 3000);
      }
    }
  }

  closeSettings() {
    this.scene.stop('SettingsScene');
  }
}
