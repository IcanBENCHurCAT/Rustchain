/**
 * phaser-game.js
 * Phaser 3 scenes: BootScene (assets), BoardScene (map visualization),
 * CombatScene (full interactive ability-based combat).
 */

import { CLASSES, ENEMIES } from './entities.js';
import { Colors } from './vector-art.js';
import { playSFX, playMusic, stopMusic, setVolume, initAudio } from './sound.js';
import { BossUI } from './BossUI.js';
import { VFXManager } from './VFXManager.js';
import { SettingsScene } from './settings.js';

// ─── BOOT SCENE ──────────────────────────────────────────────────────────────

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('menu_bg', './cyber_menu_bg.png');
    this.load.image('harbor_bg', './cyber_harbor_bg.png');

    // Load transparent character spritesheets (2x2 grid of 512x512 frames)
    this.load.spritesheet('gunner_sheet', 'assets/gunner_sheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('muscleman_sheet', 'assets/muscleman_sheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('operative_sheet', 'assets/streetrunner_sheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('duelist_sheet', 'assets/duelist_sheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('hacker_sheet', 'assets/hacker_sheet.png', { frameWidth: 512, frameHeight: 512 });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Cyan particle dot
    g.fillStyle(0x00f3ff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('cyan_dot', 8, 8);

    // Red particle dot
    g.clear();
    g.fillStyle(0xff0055, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('red_dot', 8, 8);

    // Green particle dot
    g.clear();
    g.fillStyle(0x39ff14, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('green_dot', 8, 8);

    // Purple particle dot
    g.clear();
    g.fillStyle(0xb026ff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('purple_dot', 8, 8);

    // Orange particle dot
    g.clear();
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('orange_dot', 8, 8);

    // Yellow particle dot (for crits)
    g.clear();
    g.fillStyle(0xffff00, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('yellow_dot', 8, 8);

    // Create walk animations for all 5 specs
    const anims = [
      { key: 'operative_walk', sheet: 'operative_sheet' },
      { key: 'gunner_walk', sheet: 'gunner_sheet' },
      { key: 'muscleman_walk', sheet: 'muscleman_sheet' },
      { key: 'duelist_walk', sheet: 'duelist_sheet' },
      { key: 'hacker_walk', sheet: 'hacker_sheet' }
    ];
    anims.forEach(a => {
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers(a.sheet, { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    });

    // ── Safe area support for notched devices ──
    this.game.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    this.scene.start('BoardScene');
  }

  onResize(gameSize) {
    // Recalculate safe areas based on viewport
    if (this.scene.scene.get('BoardScene')) {
      this.scene.scene.get('BoardScene').onResize(gameSize);
    }
  }
}

// ─── BOARD SCENE ────────────────────────────────────────────────────────────

// Tile type display names and colors (mutable — updated by colorblind palette)
const TILE_DISPLAY = {
  start:       { name: 'START',     color: 0x00f3ff },
  combat:      { name: 'COMBAT',    color: 0xff0055 },
  safehouse:   { name: 'SAFEHOUSE', color: 0x39ff14 },
  trap:        { name: 'TRAP',      color: 0xffaa00 },
  server_node: { name: 'NODE',      color: 0xb026ff }
};

/**
 * Apply a colorblind palette to TILE_DISPLAY colors.
 * Called when colorblind mode changes.
 */
export function applyColorblindPalette(palette) {
  if (!palette) {
    TILE_DISPLAY.combat.color = 0xff0055;
    TILE_DISPLAY.safehouse.color = 0x39ff14;
    TILE_DISPLAY.server_node.color = 0xb026ff;
    TILE_DISPLAY.start.color = 0x00f3ff;
    return;
  }
  TILE_DISPLAY.combat.color = palette.combat || 0xffaa00;
  TILE_DISPLAY.safehouse.color = palette.safe || 0x39ff14;
  TILE_DISPLAY.server_node.color = palette.serverNode || 0xb026ff;
  TILE_DISPLAY.start.color = palette.start || 0x00f3ff;
}

// Get the last known palette (for colorblind mode changes)
let _lastColorblindPalette = null;

export function setLastColorblindPalette(palette) {
  _lastColorblindPalette = palette;
}

// Priority weight for connection coloring (higher = more dominant)
const TILE_PRIORITY = { start: 0, safehouse: 2, server_node: 3, combat: 4, trap: 5 };

// Tile icon draw functions (draw procedurally with Phaser.Graphics)
function drawTileIcon(g, type, x, y, size) {
  const half = size / 2;
  g.lineStyle(2, TILE_DISPLAY[type]?.color || 0x00f3ff, 1);
  switch(type) {
    case 'start': {
      // Blue arrow pointing right
      g.lineStyle(2.5, 0x00f3ff, 1);
      g.beginPath();
      g.moveTo(x - half, y - half);
      g.lineTo(x + half * 0.6, y);
      g.lineTo(x - half, y + half);
      g.moveTo(x + half * 0.3, y - half * 0.5);
      g.lineTo(x + half, y);
      g.lineTo(x + half * 0.3, y + half * 0.5);
      g.strokePath();
      break;
    }
    case 'combat': {
      // Red cross / weapon icon
      g.lineStyle(2.5, 0xff0055, 1);
      g.beginPath();
      g.moveTo(x - half, y - half); g.lineTo(x + half, y + half);
      g.moveTo(x + half, y - half); g.lineTo(x - half, y + half);
      g.moveTo(x - half * 0.5, y - half * 0.9); g.lineTo(x - half * 0.5, y + half * 0.9);
      g.moveTo(x + half * 0.5, y - half * 0.9); g.lineTo(x + half * 0.5, y + half * 0.9);
      g.strokePath();
      break;
    }
    case 'safehouse': {
      // Green shield shape
      g.beginPath();
      g.moveTo(x, y - half);
      g.lineTo(x + half * 0.8, y - half * 0.3);
      g.lineTo(x + half * 0.8, y + half * 0.2);
      g.quadraticCurveTo(x, y + half * 0.9, x - half * 0.8, y + half * 0.2);
      g.lineTo(x - half * 0.8, y - half * 0.3);
      g.closePath();
      g.strokePath();
      // Small door line
      g.lineStyle(2, 0x39ff14, 1);
      g.beginPath();
      g.moveTo(x, y - half * 0.2); g.lineTo(x, y + half * 0.3);
      g.strokePath();
      break;
    }
    case 'trap': {
      // Orange exclamation mark
      g.lineStyle(2.5, 0xffaa00, 1);
      g.beginPath();
      g.moveTo(x, y - half); g.lineTo(x, y + half * 0.5);
      g.strokePath();
      g.fillStyle(0xffaa00, 1);
      g.fillCircle(x, y + half * 0.7, 2.5);
      break;
    }
    case 'server_node': {
      // Purple chip icon
      const s = half * 0.6;
      g.strokeRect(x - s, y - s, s * 2, s * 2);
      // Pins
      g.lineStyle(2, 0xb026ff, 1);
      for (let i = -1; i <= 1; i += 2) {
        g.beginPath(); g.moveTo(x + i * s * 0.5, y - s); g.lineTo(x + i * s * 0.5, y - s * 1.4); g.strokePath();
        g.beginPath(); g.moveTo(x + i * s * 0.5, y + s); g.lineTo(x + i * s * 0.5, y + s * 1.4); g.strokePath();
      }
      for (let i = -1; i <= 1; i += 2) {
        g.beginPath(); g.moveTo(x - s, y + i * s * 0.5); g.lineTo(x - s * 1.4, y + i * s * 0.5); g.strokePath();
        g.beginPath(); g.moveTo(x + s, y + i * s * 0.5); g.lineTo(x + s * 1.4, y + i * s * 0.5); g.strokePath();
      }
      break;
    }
    default: {
      g.strokeCircle(x, y, half);
    }
  }
}

export class BoardScene extends Phaser.Scene {
  constructor() {
    super('BoardScene');
    this.engine = null;
    this.tileIcons = [];     // Phaser.Text for type labels
    this.tileLabels = [];    // Phaser.Text for tile labels
    this.tooltipContainer = null;
    this.tooltipText = null;
    this.progressBar = null;
    this.progressFill = null;
    this.progressText = null;
    this.pulseTween = null;
    this.portalTween = null;
  }

  init(data) {
    this.engine = data.engine;
  }

  create() {
    this.cameras.main.setBackgroundColor('#03060a');

    // Parallax backdrop
    const bg = this.add.image(400, 200, 'harbor_bg');
    bg.setDisplaySize(800, 400);
    bg.setAlpha(0.2);

    // Grid overlay
    const grid = this.add.grid(400, 200, 800, 400, 40, 40, 0x151d2a, 0.25, 0x1a2535, 0.25);

    // Node graphics
    this.nodeGraphics = this.add.graphics();
    this.rebuildBoardVisuals();

    // ── SECTOR PROGRESS BAR (top of screen) ──
    this.createProgressBar();

    // ── HOVER TOOLTIP ──
    this.createTooltip();

    // ── SETTINGS GEAR BUTTON ──
    createSettingsButton(this, 760, 20, 'BoardScene');

    // Player token
    if (this.engine && this.engine.player) {
      const startPos = this.getNodeCoords(this.engine.activeTileIndex);
      const classKey = this.engine.player.classKey;

      // Render animated character sprite
      this.playerSprite = this.add.sprite(startPos.x, startPos.y - 8, `${classKey}_sheet`);
      this.playerSprite.setDisplaySize(48, 48);
      this.playerSprite.play(`${classKey}_walk`);

      // Floating animation
      this.tweens.add({
        targets: this.playerSprite,
        y: startPos.y - 13,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // ── Safe area / resize handling for mobile ──
    this.game.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    // State sync timer
    this.time.addEvent({
      delay: 200,
      callback: () => this.checkEngineState(),
      loop: true
    });

    // Title text
    const title = this.add.text(400, 25, 'AEGIS THREAT PROTOCOL', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#00f3ff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.6);

    // Setup scrolling for long boards
    this.setupScrolling();

    // ── Listen for colorblind palette changes from DOM panel ──
    this.game.events.on('aegis_colorblind_change', (palette) => {
      applyColorblindPalette(palette);
      this.rebuildBoardVisuals();
    }, this);
  }

  // ─── PROGRESS BAR ─────────────────────────────────────────────────────────
  createProgressBar() {
    const barX = 20, barY = 8, barW = 760, barH = 22;

    // Background
    this.progressBar = this.add.graphics();
    this.progressBar.fillStyle(0x0a0f18, 1);
    this.progressBar.fillRoundedRect(barX, barY, barW, barH, 4);
    this.progressBar.lineStyle(1, 0x1a293d, 0.8);
    this.progressBar.strokeRoundedRect(barX, barY, barW, barH, 4);

    // Fill
    this.progressFill = this.add.graphics();

    // Text
    this.progressText = this.add.text(barX + 10, barY + 3, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '10px',
      color: '#00f3ff'
    });

    this.updateProgressBar();
  }

  updateProgressBar() {
    if (!this.engine || !this.engine.board) return;
    const board = this.engine.board;
    const visited = board.filter(t => t.visited).length;
    const total = board.length;
    const pct = total > 0 ? visited / total : 0;

    // Clear and redraw fill
    this.progressFill.clear();
    this.progressFill.fillStyle(0x00f3ff, 0.6);
    this.progressFill.fillRoundedRect(21, 9, 758 * pct, 20, 4);

    // Update text
    const sector = this.engine.activeSector || 1;
    this.progressText.setText(`Sector ${Math.min(sector, 3)}/3 — ${visited}/${total} tiles`);
  }

  // ─── TOOLTIP ──────────────────────────────────────────────────────────────
  createTooltip() {
    this.tooltipContainer = this.add.graphics();
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '9px',
      color: '#e0e8f0',
      wordWrap: { width: 220 },
      backgroundColor: '#0a0f18'
    }).setPadding(6).setAlpha(0);

    // Hide tooltip container
    this.tooltipContainer.setAlpha(0);

    // Input handler for hover
    this.input.on('gameobjectover', (pointer, gameObject) => {
      if (gameObject.getData && gameObject.getData('tileIndex') !== undefined) {
        const idx = gameObject.getData('tileIndex');
        const tile = this.engine?.board?.[idx];
        if (tile) {
          const display = TILE_DISPLAY[tile.type] || TILE_DISPLAY.start;
          const lines = [
            `▸ ${display.name}`,
            tile.label || '',
            '',
            tile.desc || ''
          ];
          this.tooltipText.setText(lines.join('\n'));
          this.tooltipText.setPosition(pointer.x + 15, pointer.y - 10);
          this.tooltipContainer.clear();
          this.tooltipContainer.fillStyle(0x000000, 0.85);
          this.tooltipContainer.fillRoundedRect(
            pointer.x + 10, pointer.y - 15,
            230, this.tooltipText.height + 20,
            6
          );
          this.tooltipContainer.lineStyle(1, display.color, 0.6);
          this.tooltipContainer.strokeRoundedRect(
            pointer.x + 10, pointer.y - 15,
            230, this.tooltipText.height + 20,
            6
          );
          this.tooltipContainer.setAlpha(1);
          this.tooltipText.setAlpha(1);
        }
      }
    });

    this.input.on('gameobjectout', () => {
      this.tooltipContainer.setAlpha(0);
      this.tooltipText.setAlpha(0);
    });
  }

  getNodeCoords(index) {
    const startX = 60;
    const spacingX = 90;
    const rowY = [100, 195, 290];
    const row = index % 3;
    const col = Math.floor(index / 3);
    return { x: startX + col * spacingX + (row * 10), y: rowY[row] };
  }

  rebuildBoardVisuals() {
    this.nodeGraphics.clear();
    if (!this.engine || !this.engine.board) return;

    // Clear old icons/labels
    this.tileIcons.forEach(t => { if (t.destroy) t.destroy(); });
    this.tileLabels.forEach(t => { if (t.destroy) t.destroy(); });
    this.tileIcons = [];
    this.tileLabels = [];

    const totalNodes = this.engine.board.length;

    // ── DRAW CONNECTIONS with type-based coloring ──
    for (let i = 0; i < totalNodes - 1; i++) {
      const from = this.getNodeCoords(i);
      const to = this.getNodeCoords(i + 1);
      const tileA = this.engine.board[i];
      const tileB = this.engine.board[i + 1];
      // Use the higher-priority tile's color for the connection
      const priorityA = TILE_PRIORITY[tileA.type] || 0;
      const priorityB = TILE_PRIORITY[tileB.type] || 0;
      const dominantType = priorityB > priorityA ? tileB.type : tileA.type;
      const col = (TILE_DISPLAY[dominantType]?.color || 0x152538);
      const brightness = (tileA.visited && tileB.visited) ? 1.0 : 0.5;
      this.nodeGraphics.lineStyle(2.5, col, 0.9 * brightness);
      this.nodeGraphics.lineBetween(from.x, from.y, to.x, to.y);
    }

    // ── DRAW NODES WITH ICONS & LABELS ──
    for (let i = 0; i < totalNodes; i++) {
      const pos = this.getNodeCoords(i);
      const tile = this.engine.board[i];
      const isVisited = tile.visited;
      const isCurrent = i === this.engine.activeTileIndex;
      const isEndTile = i === totalNodes - 1;
      const display = TILE_DISPLAY[tile.type] || TILE_DISPLAY.start;

      // Node circle
      this.nodeGraphics.fillStyle(isVisited ? 0x0f1c2d : 0x050a10, 1);
      this.nodeGraphics.lineStyle(2.5, isVisited ? display.color : 0x1b2d44, 1);
      this.nodeGraphics.fillCircle(pos.x, pos.y, 18);
      this.nodeGraphics.strokeCircle(pos.x, pos.y, 18);

      // ── Draw procedural icon inside tile ──
      drawTileIcon(this.nodeGraphics, tile.type, pos.x, pos.y, 24);

      // ── Type color indicator dot (inner) ──
      this.nodeGraphics.fillStyle(display.color, 0.5);
      this.nodeGraphics.fillCircle(pos.x, pos.y, 3);

      // ── Current tile: pulsing highlight ──
      if (isCurrent) {
        this.nodeGraphics.lineStyle(3, display.color, 1);
        this.nodeGraphics.strokeCircle(pos.x, pos.y, 24);
        this.nodeGraphics.fillStyle(display.color, 0.12);
        this.nodeGraphics.fillCircle(pos.x, pos.y, 24);

        // Pulse ring around current tile
        if (this.pulseTween) this.pulseTween.remove();
        const pulseObj = { radius: 24, alpha: 1 };
        this.pulseRing = this.nodeGraphics;
        this.pulseTween = this.tweens.add({
          targets: pulseObj,
          radius: 32,
          alpha: 0,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            this.pulseRing.lineStyle(2, display.color, pulseObj.alpha * 0.6);
            this.pulseRing.strokeCircle(pos.x, pos.y, pulseObj.radius);
          }
        });
      }

      // ── End tile: portal glow ──
      if (isEndTile) {
        this.nodeGraphics.lineStyle(3, 0x00f3ff, 1);
        this.nodeGraphics.strokeCircle(pos.x, pos.y, 22);
        this.nodeGraphics.fillStyle(0x00f3ff, 0.1);
        this.nodeGraphics.fillCircle(pos.x, pos.y, 22);

        // Portal shimmer
        if (this.portalTween) this.portalTween.remove();
        this.portalTween = this.tweens.add({
          targets: { scale: 1.0 },
          scale: 2.0,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: 400,
          onUpdate: () => {
            const r = 18 * this.portalTween?.target?.scale;
            if (r && r > 18) {
              this.nodeGraphics.lineStyle(2, 0x00f3ff, 0.3);
              this.nodeGraphics.strokeCircle(pos.x, pos.y, r);
            }
          }
        });
      }

      // ── Tile type label (above the tile) ──
      const label = this.add.text(pos.x, pos.y - 30, display.name, {
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '8px',
        color: '#' + display.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.tileIcons.push(label);

      // ── Tile name label (below the tile, truncated) ──
      if (tile.label) {
        const shortLabel = tile.label.length > 14 ? tile.label.substring(0, 12) + '..' : tile.label;
        const tileLabel = this.add.text(pos.x, pos.y + 34, shortLabel, {
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '7px',
          color: isVisited ? '#5a7a94' : '#2a3a50',
          wordWrap: { width: 80 }
        }).setOrigin(0.5);
        this.tileLabels.push(tileLabel);
      }

      // ── Invisible hitbox for hover tooltips ──
      const hitbox = this.add.graphics();
      hitbox.fillStyle(0x000000, 0);
      hitbox.fillCircle(pos.x, pos.y, 30);
      hitbox.setData('tileIndex', i);
      hitbox.setInteractive({ useHandCursor: true });
      this.tileIcons.push(hitbox); // keep ref to destroy later
    }

    // ── Update progress bar ──
    this.updateProgressBar();
  }

  // ─── SCROLLING ────────────────────────────────────────────────────────────
  setupScrolling() {
    // Track board bounds
    if (!this.engine?.board) return;
    const coords = this.engine.board.map((_, i) => this.getNodeCoords(i));
    const maxX = Math.max(...coords.map(c => c.x));
    const minX = Math.min(...coords.map(c => c.x));
    const scrollWidth = maxX - minX + 200;

    if (scrollWidth > 800) {
      // Enable horizontal scrolling via arrow keys
      this.cursors = this.input.keyboard.createCursorKeys();
      this.scrollSpeed = 3;
    }
  }

  update(time, delta) {
    // Arrow-key scrolling for long boards
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.cameras.main.scrollX -= this.scrollSpeed;
      }
      if (this.cursors.right.isDown) {
        this.cameras.main.scrollX += this.scrollSpeed;
      }
    }
  }

  updatePlayerPosition() {
    if (!this.playerSprite || !this.engine) return;
    const dest = this.getNodeCoords(this.engine.activeTileIndex);

    this.tweens.add({
      targets: this.playerSprite,
      x: dest.x,
      y: dest.y,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.rebuildBoardVisuals();
      }
    });
  }

  checkEngineState() {
    if (!this.engine) return;

    // Track position
    const destCoords = this.getNodeCoords(this.engine.activeTileIndex);
    if (this.playerSprite && (Math.abs(this.playerSprite.x - destCoords.x) > 3 || Math.abs(this.playerSprite.y - destCoords.y) > 3)) {
      this.updatePlayerPosition();
    }

    // Refresh progress bar periodically
    this.updateProgressBar();

    // State transitions
    if (this.engine.gameState === 'combat') {
      this.scene.start('CombatScene', { engine: this.engine });
    }
  }

  // ── Safe area / resize handler for mobile ──
  onResize(gameSize) {
    // Adjust node positions to fit new canvas size
    this.rebuildBoardVisuals();
    if (this.playerSprite) {
      this.updatePlayerPosition();
    }
  }
}

// ─── DAMAGE NUMBER CLASS ──────────────────────────────────────────────────
// Floating damage numbers that appear at position, float up, and fade out.
// Colors: white/gray normal, gold/red crit, green/white dodge, cyan heals.

class DamageNumber extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, config) {
    super(scene, x, y, text, config || {});
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);

    const defaults = {
      fontSize: '14px',
      fontFamily: 'Orbitron, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      duration: 1200,
      yOffset: 60,
      ease: 'Cubic.Out'
    };
    const merged = { ...defaults, ...config };

    this.duration = merged.duration;
    this.yOffset = merged.yOffset;
    this.startY = y;
    this.ease = merged.ease;

    // Apply font settings
    this.setFontFamily(merged.fontFamily);
    this.setFontSize(merged.fontSize);
    this.setFontStyle(merged.fontStyle);
    this.setColor(merged.color);
    this.setStroke(merged.stroke, merged.strokeThickness);
  }

  // Show the floating number with animation
  show() {
    // Start from slightly below position
    this.setPosition(this.x, this.startY);
    this.setAlpha(1);

    // Float up and fade out
    this.tweens.add({
      targets: this,
      y: this.startY - this.yOffset,
      alpha: 0,
      duration: this.duration,
      ease: this.ease,
      onComplete: () => {
        this.destroy();
      }
    });

    return this;
  }

  // Static factory for convenience
  static create(scene, x, y, text, config) {
    return new DamageNumber(scene, x, y, text, config).show();
  }
}

// ─── SETTINGS GEAR BUTTON HELPER ─────────────────────────────────────────────
/**
 * Create a gear icon button that opens the settings scene.
 */
function createSettingsButton(scene, x, y, fromScene) {
  const g = scene.add.graphics();
  g.lineStyle(2, 0x00f3ff, 0.6);
  g.strokeCircle(x, y, 12);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const x1 = x + Math.cos(angle) * 10;
    const y1 = y + Math.sin(angle) * 10;
    const x2 = x + Math.cos(angle) * 14;
    const y2 = y + Math.sin(angle) * 14;
    g.lineBetween(x1, y1, x2, y2);
  }
  g.fillStyle(0x00f3ff, 0.6);
  g.fillCircle(x, y, 3);
  g.setInteractive({ cursor: 'pointer' });
  g.on('pointerover', () => { g.lineStyle(2, 0x00f3ff, 1); });
  g.on('pointerout', () => { g.lineStyle(2, 0x00f3ff, 0.6); });
  g.on('pointerdown', () => {
    scene.tweens.add({
      targets: g, scaleX: 0.85, scaleY: 0.85, duration: 50, yoyo: true,
      onComplete: () => { scene.scene.stop('SettingsScene'); scene.scene.launch('SettingsScene', { fromScene: fromScene }); }
    });
  });
  return { g, scene, fromScene };
}

// ─── COMBAT SCENE (FULL INTERACTIVE ABILITY SYSTEM) ─────────────────────────

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('CombatScene');
    this.engine = null;
    this.abilityButtons = [];
    this.combatTimer = null;
    this.shakeAmount = 0;
    this.lastPlayerHP = 0;
    this.lastEnemyHP = 0;
    this.floatingTexts = [];

    // Visual effect state
    this._flashOverlay = null;
    this._phaseLabel = null;
    this._phaseTween = null;
    this._enemyStatusIndicators = [];
    this._slashArc = null;
    this._projectile = null;
    this._enemyDeathTween = null;
    this._enemyDied = false;

    // ── VFX SYSTEM ──
    this.vfx = null;
    this._vfxQueue = [];
    this._lastClassKey = null;
    this._lastAbilityId = null;
    this._lastAbilityType = null;

    // ── ENHANCED UI SYSTEM ──
    // Cooldown ring graphics (drawn each frame)
    this._cooldownOverlays = new Map();

    // Combo chain display
    this._comboPanelGraphics = null;
    this._comboText = null;

    // Action queue (next abilities on cooldown)
    this._actionQueueGraphics = null;
    this._actionQueueText = null;

    // Ability history log (scrollable)
    this._historyPanelGraphics = null;
    this._historyText = null;
    this._historyPanelText = null;
    this._historyScrollPos = 0;

    // Player status effect indicators
    this._playerStatusTypes = new Set();
    this._playerStatusGraphics = null;
    this._playerStatusText = null;

    // Keyboard shortcut tracking
    this._keybindMap = {};          // key -> ability index
    this._keyDownEvents = [];       // pending keydown events
    this._pressedKeys = {};         // currently held keys

    // Tooltip state
    this._tooltipBg = null;
    this._tooltipText = null;
    this._tooltipVisible = false;
    this._hoveredBtnIdx = -1;
    this._hoverGlow = null;

    // Button hover state tracking
    this._btnHoverState = new Map();  // idx -> {hovered, alphaTween}

    // Ability icons (pre-rendered textures)
    this._iconTex = { attack: null, buff: null, heal: null };

    // Button glow effect
    this._btnGlowGraphics = null;
  }

  init(data) {
    this.engine = data.engine;
    this.bossUI = null;
    this._bossUIInitialized = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#05070b');
    this.shakeAmount = 0;

    // ── SCREEN BORDERS ──
    const border = this.add.graphics();
    border.lineStyle(2, 0xff0055, 0.3);
    border.strokeRect(5, 5, 790, 390);

    // Grid line
    border.lineStyle(1, 0x1d2736, 0.5);
    border.lineBetween(400, 0, 400, 400);

    // ── SETTINGS GEAR BUTTON ──
    createSettingsButton(this, 760, 20, 'CombatScene');

    // ── PLAYER VISUAL ──
    const classKey = this.engine.player.classKey;
    const playerCol = Phaser.Display.Color.HexStringToColor(this.engine.player.color).color;
    this.playerVisual = this.add.sprite(170, 160, `${classKey}_sheet`);
    this.playerVisual.setDisplaySize(120, 120);
    this.playerVisual.setAlpha(0.95);
    this.playerVisual.play(`${classKey}_walk`);

    // Player name tag
    this.add.text(170, 210, this.engine.player.name.toUpperCase(), {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: this.engine.player.color
    }).setOrigin(0.5);

    // ── ENEMY VISUAL ──
    this.enemyVisual = this.add.circle(630, 160, 35, 0xff0055);
    this.enemyVisual.setStrokeStyle(2, 0xff0055, 0.5);
    this.enemyVisual.setAlpha(0.9);

    // Enemy name tag
    this.enemyNameText = this.add.text(630, 210, this.engine.combatState.enemy.name.toUpperCase(), {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#ff0055'
    }).setOrigin(0.5);

    // ── BOSS UI ──
    if (this.engine.combatState.isBoss) {
      this.bossUI = new BossUI(this);
      this.bossUI.start(this.engine.combatState, this.engine);
      this._bossUIInitialized = true;
    }

    // ── HEALTH BARS (Phaser-based) ──
    this.playerHPBar = this.createHPBar(100, 300, 140, 12, playerCol);
    // Apply difficulty scaling to enemy if not already done
    if (!this.engine.combatState._difficultyApplied) {
      this.engine._scaleEnemyForDifficulty(this.engine.combatState.enemy);
      this.engine.combatState._difficultyApplied = true;
    }

    this.enemyHPBar = this.createHPBar(560, 300, 140, 12, 0xff0055);

    // ── TURN COUNTER ──
    this.turnText = this.add.text(400, 370, 'TURN 1', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#00f3ff'
    }).setOrigin(0.5);

    // ── ENHANCED UI PANELS ──
    this.createAbilityIcons();
    this.createComboDisplay();
    this.createActionQueueDisplay();
    this.createAbilityHistoryPanel();
    this.createPlayerStatusDisplay();
    this.createCooldownOverlay();
    this.createTooltipSystem();
    this.createHoverGlow();
    this.createKeyboardShortcuts();

    // ── PARTICLES ──
    this.playerParticles = this.add.particles(0, 0, 'cyan_dot', {
      speed: 200,
      scale: { start: 1.2, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      emitting: false
    });

    this.enemyParticles = this.add.particles(0, 0, 'red_dot', {
      speed: 200,
      scale: { start: 1.2, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      emitting: false
    });

    this.specialParticles = this.add.particles(0, 0, 'purple_dot', {
      speed: 150,
      scale: { start: 1.0, end: 0 },
      blendMode: 'ADD',
      lifespan: 600,
      emitting: false
    });

    // ── VFX particle textures (yellow for crit kills, green for venom) ──
    this._ensureParticleTexture('yellow_dot', 0xffd700);
    this._ensureParticleTexture('green_dot', 0x39ff14);

    // ── ABILITY BUTTONS (interactive) ──
    this.abilityButtons = [];
    this._btnHovered = new Map();
    this._tooltipVisible = false;
    this._flashButtonFlash = false;
    this._iconTex = {};
    this._keybindMap = {};
    this.createAbilityButtons();
    this._setupButtonHover();

    // ── BATTLE LOG (on-screen) ──
    this.createBattleLog();

    // ── ENHANCED UI PANELS ──
    this.createAbilityIcons();
    this.createComboDisplay();
    this.createActionQueueDisplay();
    this.createAbilityHistoryPanel();
    this.createPlayerStatusDisplay();
    this.createCooldownOverlay();
    this.createTooltipSystem();
    this.createHoverGlow();
    this.createKeyboardShortcuts();

    // ── AUDIO: combat entrance SFX ──
    try {
      // Try to unlock audio on user gesture if on iOS/mobile
      if (!this._audioInitChecked) {
        this._audioInitChecked = true;
        try { initAudio(); } catch(e) {}
      }
      playSFX('ui_click'); // combat entrance chime
    } catch(e) {}

    // ── ENTRY ANIMATION ──
    this.tweens.add({ targets: this.playerVisual, x: 170, duration: 600, ease: 'Bounce' });
    this.tweens.add({ targets: this.enemyVisual, x: 630, duration: 600, ease: 'Bounce' });

    // ── VFX MANAGER ──
    this.vfx = new VFXManager(this);

    // ── SYNC CHECK ──
    this.combatTimer = this.time.addEvent({
      delay: 300,
      callback: () => this.syncCombatState(),
      loop: true
    });

    // ── CLICK HANDLER (works for mouse + touch) ──
    this.input.on('pointerdown', (pointer) => {
      for (const btn of this.abilityButtons) {
        if (pointer.x >= btn.x && pointer.x <= btn.x + btn.w &&
            pointer.y >= btn.y && pointer.y <= btn.y + btn.h) {
          // Touch/click visual feedback: brief alpha pulse
          const origAlpha = btn.g.alpha;
          this.tweens.add({
            targets: btn.g,
            alpha: 1,
            duration: 60,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => { btn.g.alpha = origAlpha; }
          });
          if (btn.engine && btn.engine.gameState === 'combat') {
            btn.engine.useAbility(btn.index);
            this.rebuildAbilityButtons();
            this.syncCombatState();

            // ── Queue VFX for the ability just used ──
            const abilityData = CLASSES[btn.engine.player.classKey]?.abilities?.[btn.index];
            if (abilityData) {
              this.queueAbilityVFX(btn.engine.player.classKey, abilityData, btn.engine.combatState.enemy);
            }
            return;
          }
        }
      }
    });

    // ── Resize handler for mobile ──
    this.game.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    // ── Listen for colorblind palette changes from DOM panel ──
    this.game.events.on('aegis_colorblind_change', (palette) => {
      if (this.enemyVisual) {
        if (palette) {
          this.enemyVisual.setFillStyle(palette.boss || 0xff0055);
        } else {
          this.enemyVisual.setFillStyle(0xff0055);
        }
      }
      if (this.bossUI) {
        this.bossUI.recolorForColorblind(palette);
      }
    }, this);
  }

  onResize(gameSize) {
    // Recalculate element positions for new dimensions
    if (this.abilityButtons.length > 0) {
      this.rebuildAbilityButtons();
    }
  }

  // Alias for HTML-side resize handler compatibility
  _onResize() {
    this.onResize();
  }

  createHPBar(x, y, w, h, color) {
    const bg = this.add.graphics();
    bg.fillStyle(0x111e2f, 1);
    bg.fillRect(x, y, w, h);
    bg.lineStyle(1, 0x2a3a50, 1);
    bg.strokeRect(x, y, w, h);

    const fill = this.add.graphics();
    fill.fillStyle(color, 0.8);
    fill.fillRect(x, y, w, h);

    return { bg, fill, x, y, w, h, color };
  }

  updateHPBar(hpBar, currentHP, maxHP) {
    const pct = Math.max(0, currentHP / maxHP);
    hpBar.fill.clear();
    hpBar.fill.fillStyle(hpBar.color, 0.8);
    hpBar.fill.fillRect(hpBar.x, hpBar.y, hpBar.w * pct, hpBar.h);
  }

  createAbilityButtons() {
    // Clear existing
    for (const btn of this.abilityButtons) {
      if (btn.remove) btn.remove();
    }
    this.abilityButtons = [];

    if (!this.engine || !this.engine.player) return;

    const abilities = CLASSES[this.engine.player.classKey]?.abilities || [];
    if (abilities.length === 0) return;

    // ── 2-column × N-row layout for ALL abilities ──
    const btnW = 175;
    const btnH = 55;
    const gap = 6;
    const cols = 2;
    const rows = Math.ceil(abilities.length / cols);
    const totalBtnW = cols * btnW + (cols - 1) * gap;
    const totalBtnH = rows * btnH + (rows - 1) * gap;
    const startX = 35;
    const startY = 360 - totalBtnH;

    abilities.forEach((ability, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);

      // Button background graphics
      const g = this.add.graphics();

      this.abilityButtons.push({
        g, x, y, w: btnW, h: btnH, index: i, ability, engine: this.engine,
        remove: () => { g.clear(); g.destroy(); }
      });

      // ── Keyboard shortcut (number keys 1-8) ──
      const key = String(i + 1);
      this._keybindMap[key] = i;
    });

    this.rebuildAbilityButtons();
  }

  rebuildAbilityButtons() {
    if (!this.engine) return;

    const abilities = CLASSES[this.engine.player.classKey]?.abilities || [];
    const availableAbilities = this.engine.getAvailableAbilities();

    this.abilityButtons.forEach((btn, i) => {
      btn.g.clear();

      if (i >= abilities.length) return;

      const ab = abilities[i];
      const availAb = availableAbilities[i];
      const isOnCooldown = availAb && availAb.cooldownLeft > 0;
      const canUse = availAb && availAb.canUse;

      // ── Color based on state ──
      let bgColor, borderColor, textColor, glowColor;
      if (isOnCooldown) {
        bgColor = 'rgba(18, 18, 28, 0.6)';
        borderColor = 'rgba(50, 50, 70, 0.6)';
        textColor = '#556677';
        glowColor = null;
      } else if (!canUse) {
        bgColor = 'rgba(30, 20, 15, 0.6)';
        borderColor = 'rgba(80, 50, 30, 0.5)';
        textColor = '#886655';
        glowColor = null;
      } else {
        bgColor = `rgba(0, 243, 255, 0.06)`;
        borderColor = 'rgba(0, 243, 255, 0.45)';
        textColor = '#00f3ff';
        glowColor = 'rgba(0, 243, 255, 0.2)';
      }

      // ── Background with rounded corners ──
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor), 1);
      btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);

      // ── Border ──
      btn.g.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(borderColor), 1);
      btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 4);

      // ── Ability TYPE ICON (procedural vector) ──
      this._drawAbilityIcon(btn.g, ab.type, btn.x + 8, btn.y + 7, 16);

      // ── Keyboard shortcut number ──
      const shortcutColor = isOnCooldown ? '#445566' : '#00f3ff';
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(shortcutColor), 0.8);
      btn.g.fillRoundedRect(btn.x + btn.w - 14, btn.y + 2, 10, 12, 2);
      const keyObj = this.add.text(btn.x + btn.w - 9, btn.y + 3, String(i + 1), {
        fontFamily: 'Orbitron, monospace',
        fontSize: '8px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      keyObj.setOrigin(0.5, 0.5);
      keyObj.setAlpha(isOnCooldown ? 0.4 : 0.9);
      this.abilityButtons[i]._keyObj = keyObj;

      // ── Ability NAME ──
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(textColor), 1);
      btn.g.fillRect(btn.x + 28, btn.y + 4, btn.w - 42, 16);
      const nameObj = this.add.text(btn.x + 30, btn.y + 5, ab.name, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '10px',
        color: textColor,
        fontStyle: 'bold'
      });
      nameObj.setOrigin(0, 0);
      this.abilityButtons[i]._nameObj = nameObj;

      // ── Ability DESCRIPTION (truncated) ──
      const descDisplay = ab.desc.length > 38 ? ab.desc.substring(0, 36) + '…' : ab.desc;
      const descObj = this.add.text(btn.x + 30, btn.y + 22, descDisplay, {
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '7.5px',
        color: isOnCooldown ? '#3a4a5a' : '#5a7a90',
        wordWrap: { width: btn.w - 34 }
      });
      descObj.setOrigin(0, 0);
      this.abilityButtons[i]._descObj = descObj;

      // ── HP COST indicator ──
      if (ab.cost > 0) {
        const costText = this.add.text(btn.x + 30, btn.y + 40, `⚡ ${ab.cost} HP`, {
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '7px',
          color: '#ff6644'
        });
        costText.setOrigin(0, 0);
        costText.setAlpha(isOnCooldown ? 0.3 : (ab.cost > this.engine.player.hp ? 0.5 : 0.7));
        this.abilityButtons[i]._costObj = costText;
      }

      // ── COOLDOWN RING (circular progress) ──
      if (isOnCooldown && availAb.cooldownLeft > 0) {
        this._drawCooldownRing(i, btn, availAb.cooldownLeft, ab.maxCooldown);
      } else {
        // Remove old cooldown overlay
        if (this.abilityButtons[i]) {
          this.abilityButtons[i]._cooldownOverlay?.destroy();
          this.abilityButtons[i]._cooldownOverlay = null;
          this.abilityButtons[i]._cooldownText?.destroy();
          this.abilityButtons[i]._cooldownText = null;
        }
      }
    });
  }

  // ── DRAW PROCEDURAL ABILITY TYPE ICON ──
  /**
   * Draw a small vector icon on the ability button based on ability type.
   */
  _drawAbilityIcon(g, type, x, y, size) {
    const half = size / 2;

    if (type === 'attack') {
      // Sword slash icon
      g.lineStyle(2, 0xff4466, 0.9);
      g.beginPath();
      g.moveTo(x - half + 2, y + half - 2);
      g.lineTo(x + half - 2, y - half + 2);
      g.moveTo(x - half + 2, y - half + 2);
      g.lineTo(x + half - 2, y + half - 2);
      g.strokePath();
      // Crossguard
      g.lineStyle(1.5, 0xff4466, 0.7);
      g.beginPath();
      g.moveTo(x - 4, y);
      g.lineTo(x + 4, y);
      g.strokePath();
    } else if (type === 'buff') {
      // Shield icon
      g.lineStyle(2, 0xaa44ff, 0.9);
      g.beginPath();
      g.moveTo(x, y - half + 2);
      g.lineTo(x + half - 2, y - half * 0.4);
      g.lineTo(x + half - 2, y + half * 0.3);
      g.quadraticCurveTo(x, y + half - 2, x - half + 2, y + half * 0.3);
      g.lineTo(x - half + 2, y - half * 0.4);
      g.closePath();
      g.strokePath();
      // Inner diamond
      g.lineStyle(1, 0xaa44ff, 0.4);
      g.beginPath();
      g.moveTo(x, y - 3);
      g.lineTo(x + 2, y);
      g.lineTo(x, y + 3);
      g.lineTo(x - 2, y);
      g.closePath();
      g.strokePath();
    } else if (type === 'heal') {
      // Medical cross icon
      g.lineStyle(2, 0x33dd55, 0.9);
      g.beginPath();
      g.moveTo(x - half, y);
      g.lineTo(x + half, y);
      g.strokePath();
      g.beginPath();
      g.moveTo(x, y - half);
      g.lineTo(x, y + half);
      g.strokePath();
      g.lineStyle(1, 0x33dd55, 0.3);
      g.strokeCircle(x, y, half + 2);
    }
  }

  // ── DRAW COOLDOWN RING (circular progress) ──
  /**
   * Draw a circular cooldown ring overlay on the ability button.
   */
  _drawCooldownRing(idx, btn, cooldownLeft, maxCooldown) {
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    const radius = Math.min(btn.w, btn.h) * 0.42;

    // Create overlay graphics
    const overlay = this.add.graphics();

    // Cooldown progress (0 = full, 1 = empty)
    const progress = cooldownLeft / maxCooldown;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress * Math.PI * 2);

    // Dark background ring
    overlay.lineStyle(3, 0x1a1a2e, 0.5);
    overlay.beginPath();
    overlay.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    overlay.strokePath();

    // Active cooldown arc with color based on progress
    let arcColor = 0x00f3ff;
    if (progress > 0.7) arcColor = 0xff2244;
    else if (progress > 0.4) arcColor = 0xffaa00;

    overlay.lineStyle(3, arcColor, 0.9);
    overlay.beginPath();
    overlay.arc(cx, cy, radius + 4, startAngle, endAngle);
    overlay.strokePath();

    // Cooldown number in center
    const cooldownNum = this.add.text(cx, cy, `${cooldownLeft}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5).setAlpha(0.9);

    // Store references for cleanup
    if (this.abilityButtons[idx]) {
      this.abilityButtons[idx]._cooldownOverlay = overlay;
      this.abilityButtons[idx]._cooldownText = cooldownNum;
    }
  }

  createBattleLog() {
    // Battle log box (compact)
    this.logGraphics = this.add.graphics();
    this.logGraphics.fillStyle(0x080c14, 0.85);
    this.logGraphics.fillRoundedRect(410, 12, 380, 110, 4);
    this.logGraphics.lineStyle(1, 0x1a293d, 0.6);
    this.logGraphics.strokeRoundedRect(410, 12, 380, 110, 4);

    // Title
    this.logTitle = this.add.text(415, 15, 'COMBAT LOG', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '9px',
      color: '#00f3ff'
    });

    // Log content area
    this.logContent = this.add.text(415, 30, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '8px',
      color: '#7d96b4',
      wordWrap: { width: 370 }
    });

    // Update from engine logs
    if (this.engine && this.engine.battleLog) {
      const recent = this.engine.battleLog.slice(-6);
      this.logContent.setText(recent.map(l => l.startsWith('  ') ? l : '▸ ' + l).join('\n'));
    }
  }

  syncCombatState() {
    if (!this.engine || this.engine.gameState !== 'combat') {
      this.combatTimer?.destroy();
      this.scene.start('BoardScene', { engine: this.engine });
      return;
    }

    // Update turn counter
    this.turnText.setText(`TURN ${this.engine.turn || 0}`);

    // Update HP bars
    if (this.lastPlayerHP !== this.engine.player.hp || this.lastPlayerHP === 0) {
      this.updateHPBar(this.playerHPBar, this.engine.player.hp, this.engine.player.hpMax);
    }
    if (this.lastEnemyHP !== this.engine.combatState.enemy.hp || this.lastEnemyHP === 0) {
      this.updateHPBar(this.enemyHPBar, this.engine.combatState.enemy.hp, this.engine.combatState.enemy.hpMax);
    }

    // Visual feedback for damage
    if (this.engine.combatState.enemy.hp < this.lastEnemyHP) {
      const dmgDealt = this.lastEnemyHP - this.engine.combatState.enemy.hp;
      const enemyPos = VFXManager.getEnemyPosition(this);

      // ── Check for crits from battle log ──
      const recentLog = this.engine.battleLog.slice(-3).join('\n');
      const isCrit = recentLog.includes('CRIT') || recentLog.includes('critical');

      // Damage number with type
      const dmgType = isCrit ? 'crit' : 'normal';
      this.vfx.showDamageNumber(this, enemyPos.x, enemyPos.y - 30, dmgDealt, dmgType);

      // Hit flash on enemy
      if (isCrit) {
        this.vfx.showHitFlash(this.enemyVisual, 100, true); // red for crit
        // Crit: extra screen shake
        this.cameras.main.shake(120, 0.004);
      } else {
        this.vfx.showHitFlash(this.enemyVisual, 80, false);
      }

      // ── VFX: show ability attack animation ──
      if (this._lastAbilityId && this._lastClassKey) {
        this.processPendingVFX();
      }

      // ── SFX: enemy takes damage ──
      try { playSFX('enemy_hit'); } catch(e) {}
    }

    // Check for enemy death / explosion
    if (this.lastEnemyHP > 0 && this.engine.combatState.enemy.hp <= 0 && !this._enemyDied) {
      this._enemyDied = true;
      const enemyPos = VFXManager.getEnemyPosition(this);

      // ── Check if it was a crit kill ──
      const deathLog = this.engine.battleLog.slice(-5).join('\n');
      const isCritKill = deathLog.includes('CRIT') || deathLog.includes('critical') ||
                         deathLog.includes('Assassinate') || deathLog.includes('instantly');

      // Death explosion
      this.vfx.showDeathExplosion(enemyPos.x, enemyPos.y, isCritKill);

      // Death flash
      this.enemyVisual.setTint(0xffffff);
      this.tweens.add({
        targets: this.enemyVisual,
        alpha: 0,
        duration: 500,
        delay: 200
      });

      // Extra screen shake for crit kills
      if (isCritKill) {
        this.cameras.main.shake(300, 0.006);
      }
    }

    // Reset enemy death flag when combat ends or new combat starts
    if (this.engine.combatState.enemy.hp > 0) {
      this._enemyDied = false;
    }

    if (this.engine.player.hp < this.lastPlayerHP) {
      this.shakeAmount = 10;
      this.playerParticles.emitParticleAt(this.playerVisual.x, this.playerVisual.y, 12);
      this.tweens.add({
        targets: this.playerVisual,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 60,
        yoyo: true,
        ease: 'Power2'
      });
      // ── SFX: player takes damage ──
      try { playSFX('damage_taken'); } catch(e) {}
    }

    // Rebuild ability buttons (cooldown updates)
    if (this.abilityButtons.length > 0) {
      this.rebuildAbilityButtons();
    }

    // ── ENHANCED UI: update panels each frame ──
    this._updateEnhancedUI();

    // Update battle log
    if (this.engine.battleLog && this.logContent) {
      const recent = this.engine.battleLog.slice(-6);
      this.logContent.setText(recent.map(l => l.startsWith('  ') ? l : '▸ ' + l).join('\n'));
      this.logContent.setPosition(25, 38);
    }

    // ── BOSS UI: phase transitions and defeat ──
    if (this.bossUI) {
      this.bossUI.checkPhaseTransition(this.engine);
      this.bossUI.syncHP(this.engine);
      this.bossUI.updateHUD();

      // Check for boss defeat with rewards
      if (this.engine.combatState.wardenDefeated && !this._bossDefeatHandled) {
        const enemy = this.engine.combatState.enemy;
        const sector = this.engine.activeSector || 3;
        const choice = this.engine.combatState.logicBombChosen;

        // Determine lore and achievement based on choice
        let lore = null;
        let achievement = 'warden_slain';
        if (choice === 'alpha') {
          lore = "The Ghost Route's Secret";
          achievement = 'warden_slain';
        } else if (choice === 'beta') {
          lore = "Warden's Doubt";
          achievement = 'warden_slain';
        } else if (choice === 'gamma') {
          lore = "Sacrifice Play";
          achievement = 'sacrifice_play';
        } else {
          lore = "Warden Slayer";
          achievement = 'warden_slain';
        }

        const rewards = {
          credits: enemy.creditReward || 100,
          xp: enemy.xpReward || 50,
          sector,
          lore,
          achievement
        };
        this.bossUI.showDefeatScreen(rewards);
        this._bossDefeatHandled = true;
      }
      // Reset the flag if a new combat starts
      if (!this.engine.combatState.isBoss) {
        this._bossDefeatHandled = false;
      }
    }

    this.lastPlayerHP = this.engine.player.hp;
    this.lastEnemyHP = this.engine.combatState.enemy.hp;

    // ── Status effect indicators ──
    this.updateStatusIndicators();
  }

  // ─── VFX QUEUE / PROCESSING ───────────────────────────────────────────────

  /**
   * Queue an ability VFX to be processed on the next frame.
   */
  queueAbilityVFX(classKey, ability, enemy) {
    this._lastClassKey = classKey;
    this._lastAbilityId = ability.id;
    this._lastAbilityType = ability.type;
    this._vfxQueue.push({ classKey, ability, enemy, queuedAt: this.time.now });
  }

  /**
   * Process queued VFX. Should be called in update() or after useAbility().
   */
  processPendingVFX() {
    // Process the most recent queue entry
    const entry = this._vfxQueue.pop();
    if (!entry) return;

    const { classKey, ability, enemy } = entry;
    const playerPos = VFXManager.getPlayerPosition(this);
    const enemyPos = VFXManager.getEnemyPosition(this);

    if (ability.type === 'attack') {
      // Show attack animation based on class/ability
      this.vfx.dispatchAbilityAnimation(
        this, ability.id, playerPos.x, playerPos.y,
        enemyPos.x, enemyPos.y,
        this.enemyParticles,
        classKey
      );
    }

    this._lastClassKey = null;
    this._lastAbilityId = null;
    this._lastAbilityType = null;
  }

  // ─── STATUS EFFECT INDICATORS ─────────────────────────────────────────────

  /**
   * Scan enemy state and show appropriate status effect indicators.
   */
  updateStatusIndicators() {
    const enemy = this.engine.combatState.enemy;
    if (!enemy) return;

    // Track what indicators are currently showing
    this._currentStatusTypes = this._currentStatusTypes || new Set();

    // Remove indicators for effects that are no longer active
    const activeTypes = new Set();

    if (enemy.venomTurns > 0 && enemy.venomDmg > 0) {
      activeTypes.add('venom');
      if (!this._currentStatusTypes.has('venom')) {
        this.vfx.showStatusIndicator(this, this.enemyVisual, 'venom');
        this._currentStatusTypes.add('venom');
      }
    }

    if (enemy.shieldValue > 0 || (enemy.deflectActive && this.engine.player)) {
      activeTypes.add('shield');
      if (!this._currentStatusTypes.has('shield')) {
        this.vfx.showStatusIndicator(this, this.enemyVisual, 'shield');
        this._currentStatusTypes.add('shield');
      }
    }

    if (enemy.stunTurns > 0) {
      activeTypes.add('stun');
      if (!this._currentStatusTypes.has('stun')) {
        this.vfx.showStatusIndicator(this, this.enemyVisual, 'stun');
        this._currentStatusTypes.add('stun');
      }
    }

    // Clear removed indicators
    for (const type of this._currentStatusTypes) {
      if (!activeTypes.has(type)) {
        this.vfx.clearStatusIndicator(this.enemyVisual, type);
        this._currentStatusTypes.delete(type);
      }
    }
  }

  // ─── CLEANUP VFX ON COMBAT END ───────────────────────────────────────────

  /**
   * Clean up all VFX when combat ends.
   */
  cleanupVFX() {
    if (this.vfx) {
      this.vfx.clearAllStatusIndicators();
    }
    this._vfxQueue = [];
    this._currentStatusTypes = new Set();
    this._enemyDied = false;
  }

  /**
   * Ensure a particle texture exists (create it if not already loaded).
   */
  _ensureParticleTexture(key, color) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
  }

  update(time, delta) {
    // Process queued VFX
    this.processPendingVFX();

    // Screen shake
    if (this.shakeAmount > 0) {
      this.cameras.main.shake(this.shakeAmount, 0.003);
      this.shakeAmount = 0;
    }

    // Idle animations
    if (this.playerVisual) {
      this.playerVisual.setY(160 + Math.sin(time * 0.003) * 3);
    }
    if (this.enemyVisual) {
      this.enemyVisual.setY(160 + Math.sin(time * 0.004 + 1) * 3);
    }

    // ── BOSS UI: update boss visual overlay each frame ──
    if (this.bossUI && this.engine.combatState.isBoss) {
      this.bossUI.animations.updateBossVisual(
        this.engine.combatState.wardenPhase,
        1,
        this.bossUI.state.getBossScale()
      );
    }

    // ── ENHANCED UI: panel updates ──
    this._updateEnhancedUI();
  }

  // ── Mobile Responsive: recalculate positions on resize ──
  _onResize() {
    const scale = this.scale;
    const w = scale.canvas.width;
    const h = scale.canvas.height;

    // Scale factor relative to 800x400 base
    const sx = w / 800;
    const sy = h / 400;
    const s = Math.min(sx, sy);

    // Recalculate positions proportionally
    if (this.playerVisual) {
      this.playerVisual.x = 170 * sx;
      this.playerVisual.y = 160 * sy;
      this.playerVisual.setDisplaySize(120 * s, 120 * s);
    }

    if (this.enemyVisual) {
      this.enemyVisual.x = 630 * sx;
      this.enemyVisual.y = 160 * sy;
    }

    if (this.enemyNameText) {
      this.enemyNameText.x = 630 * sx;
      this.enemyNameText.y = 210 * sy;
    }

    // HP bars
    if (this.playerHPBar) {
      this.playerHPBar.x = 100 * sx;
      this.playerHPBar.y = 300 * sy;
      this.playerHPBar.w = 140 * sx;
    }
    if (this.enemyHPBar) {
      this.enemyHPBar.x = 560 * sx;
      this.enemyHPBar.y = 300 * sy;
      this.enemyHPBar.w = 140 * sx;
    }

    // Turn counter
    if (this.turnText) {
      this.turnText.x = 400 * sx;
      this.turnText.y = 370 * sy;
      this.turnText.setScale(s);
    }

    // Battle log
    if (this.logGraphics) {
      this.logGraphics.clear();
      this.logGraphics.fillStyle(0x080c14, 0.85);
      this.logGraphics.fillRoundedRect(20 * sx, 20 * sy, 360 * sx, 80 * sy, 4);
      this.logGraphics.lineStyle(1, 0x1a293d, 0.6);
      this.logGraphics.strokeRoundedRect(20 * sx, 20 * sy, 360 * sx, 80 * sy, 4);
    }
    if (this.logTitle) {
      this.logTitle.x = 25 * sx;
      this.logTitle.y = 23 * sy;
      this.logTitle.setScale(s);
    }
    if (this.logContent) {
      this.logContent.x = 25 * sx;
      this.logContent.y = 38 * sy;
      this.logContent.wordWrap.width = 350 * sx;
      this.logContent.setScale(s);
    }

    // Rebuild ability buttons at new scale
    this.createAbilityButtons();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ENHANCED UI PANELS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Pre-render ability type icons as Phaser textures for reuse.
   */
  createAbilityIcons() {
    ['attack', 'buff', 'heal'].forEach(type => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const size = 24;
      g.clear();

      // Draw on a 24x24 canvas
      const cx = size / 2, cy = size / 2, half = size / 2 - 2;

      if (type === 'attack') {
        g.lineStyle(2, 0xff4466, 1);
        g.beginPath();
        g.moveTo(cx - half + 2, cy + half - 2);
        g.lineTo(cx + half - 2, cy - half + 2);
        g.moveTo(cx - half + 2, cy - half + 2);
        g.lineTo(cx + half - 2, cy + half - 2);
        g.strokePath();
      } else if (type === 'buff') {
        g.lineStyle(2, 0xaa44ff, 1);
        g.beginPath();
        g.moveTo(cx, cy - half + 2);
        g.lineTo(cx + half - 2, cy - half * 0.4);
        g.lineTo(cx + half - 2, cy + half * 0.3);
        g.quadraticCurveTo(cx, cy + half - 2, cx - half + 2, cy + half * 0.3);
        g.lineTo(cx - half + 2, cy - half * 0.4);
        g.closePath();
        g.strokePath();
      } else {
        g.lineStyle(2, 0x33dd55, 1);
        g.beginPath();
        g.moveTo(cx - half, cy);
        g.lineTo(cx + half, cy);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx, cy - half);
        g.lineTo(cx, cy + half);
        g.strokePath();
      }

      const texKey = `ability_icon_${type}`;
      g.generateTexture(texKey, size, size);
      this._iconTex[type] = texKey;
    });
  }

  /**
   * Combo chain display panel (top-right area).
   * Shows recommended ability sequences and synergies.
   */
  createComboDisplay() {
    this._comboPanelGraphics = this.add.graphics();
    this._comboPanelGraphics.fillStyle(0x080c14, 0.8);
    this._comboPanelGraphics.fillRoundedRect(580, 12, 210, 22, 3);
    this._comboPanelGraphics.lineStyle(1, 0x334455, 0.5);
    this._comboPanelGraphics.strokeRoundedRect(580, 12, 210, 22, 3);

    this._comboText = this.add.text(585, 14, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '9px',
      color: '#ffaa00'
    });

    this._updateComboDisplay();
  }

  /**
   * Update the combo display with current synergy suggestions.
   */
  _updateComboDisplay() {
    if (!this.engine || !this.engine.player) {
      if (this._comboText) this._comboText.setText('');
      return;
    }

    const abilities = CLASSES[this.engine.player.classKey]?.abilities || [];
    const availableAbilities = this.engine.getAvailableAbilities();
    let comboText = '';

    // Class-specific combo suggestions
    if (this.engine.player.classKey === 'gunner') {
      const targeting = availableAbilities[1];
      const overcharge = availableAbilities[4];
      if (targeting && targeting.cooldownLeft === 0) {
        comboText = '→ Targeting + Overcharge = +25% DMG';
      } else if (overcharge && overcharge.cooldownLeft === 0) {
        comboText = '→ Overcharge + Scan = crit buff';
      } else {
        comboText = '→ Scan before big attacks';
      }
    } else if (this.engine.player.classKey === 'muscleman') {
      const shieldWall = availableAbilities[7];
      if (shieldWall && shieldWall.cooldownLeft === 0) {
        comboText = '→ Shield Wall → Seismic Stomp';
      } else {
        comboText = '→ War Cry before big hits';
      }
    } else if (this.engine.player.classKey === 'operative') {
      const smoke = availableAbilities[1];
      if (smoke && smoke.cooldownLeft === 0) {
        comboText = '→ Smoke → Phase Strike = +50% DMG';
      } else {
        comboText = '→ Cloak → Assassinate';
      }
    } else if (this.engine.player.classKey === 'duelist') {
      const deflect = availableAbilities[1];
      if (deflect && deflect.cooldownLeft === 0) {
        comboText = '→ Deflect → counter-attack';
      } else {
        comboText = '→ Blade Dance → Final Form';
      }
    } else if (this.engine.player.classKey === 'hacker') {
      const emp = availableAbilities[1];
      if (emp && emp.cooldownLeft === 0) {
        comboText = '→ EMP → Code Injection';
      } else {
        comboText = '→ Ghost + System Override';
      }
    }

    if (this._comboText) {
      this._comboText.setText(comboText);
    }
  }

  /**
   * Action queue display — shows abilities on cooldown with when they'll be ready.
   */
  createActionQueueDisplay() {
    // Background panel
    this._actionQueueGraphics = this.add.graphics();
    this._actionQueueGraphics.fillStyle(0x080c14, 0.75);
    this._actionQueueGraphics.fillRoundedRect(580, 38, 210, 45, 3);
    this._actionQueueGraphics.lineStyle(1, 0x223344, 0.4);
    this._actionQueueGraphics.strokeRoundedRect(580, 38, 210, 45, 3);

    // Title
    this._actionQueueTitle = this.add.text(585, 40, 'ACTION QUEUE:', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '7px',
      color: '#556677'
    });

    // Content
    this._actionQueueText = this.add.text(585, 52, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '7.5px',
      color: '#6688aa',
      wordWrap: { width: 200 }
    });

    this._updateActionQueue();
  }

  /**
   * Update the action queue display with current cooldown state.
   */
  _updateActionQueue() {
    if (!this.engine) return;

    const abilities = CLASSES[this.engine.player.classKey]?.abilities || [];
    const availableAbilities = this.engine.getAvailableAbilities();

    const queued = [];
    availableAbilities.forEach((ab, i) => {
      if (ab.cooldownLeft > 0 && i < abilities.length) {
        queued.push(`${i + 1}. ${abilities[i].name} (${ab.cooldownLeft})`);
      }
    });

    const text = queued.length > 0
      ? queued.join('  •  ')
      : 'All abilities ready!';

    if (this._actionQueueText) {
      this._actionQueueText.setText(text);
    }
  }

  /**
   * Scrollable ability history panel — shows last 20 actions.
   */
  createAbilityHistoryPanel() {
    // Background
    this._historyPanelGraphics = this.add.graphics();
    this._historyPanelGraphics.fillStyle(0x080c14, 0.8);
    this._historyPanelGraphics.fillRoundedRect(410, 125, 380, 120, 4);
    this._historyPanelGraphics.lineStyle(1, 0x1a293d, 0.5);
    this._historyPanelGraphics.strokeRoundedRect(410, 125, 380, 120, 4);

    // Title
    this._historyTitle = this.add.text(415, 127, 'ACTION HISTORY', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '8px',
      color: '#00f3ff'
    });

    // Scrollable history text
    this._historyText = this.add.text(415, 140, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '7.5px',
      color: '#5a7a90',
      wordWrap: { width: 370 },
      align: 'left'
    });

    this._updateHistoryPanel();
  }

  /**
   * Update the ability history panel from the engine's battle log.
   */
  _updateHistoryPanel() {
    if (!this.engine || !this.engine.battleLog) return;

    const log = this.engine.battleLog;
    const recent = log.slice(-20);

    // Color-code actions
    const formatted = recent.map(line => {
      if (line.includes('CRIT') || line.includes('critical')) return '\x1b[31m' + line + '\x1b[0m';
      if (line.includes('defend') || line.includes('shield')) return '\x1b[34m' + line + '\x1b[0m';
      if (line.includes('heal') || line.includes('regen')) return '\x1b[32m' + line + '\x1b[0m';
      return line;
    });

    const display = formatted.map(l => '▸ ' + l).join('\n');
    if (this._historyText) {
      this._historyText.setText(display);
    }
  }

  /**
   * Player status effect display (top-left corner).
   * Shows active buffs/debuffs on the player.
   */
  createPlayerStatusDisplay() {
    this._playerStatusGraphics = this.add.graphics();
    this._playerStatusText = this.add.text(420, 12, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '7px',
      color: '#55aacc'
    });

    this._updatePlayerStatus();
  }

  /**
   * Update the player status effect display.
   */
  _updatePlayerStatus() {
    if (!this.engine || !this.engine.player) return;

    const p = this.engine.player;
    const statuses = [];

    if (p.stealthTurns > 0) statuses.push(`🟢 stealth(${p.stealthTurns})`);
    if (p.deflectActive) statuses.push(`🛡 deflect`);
    if (p.counterDmg.min > 0) statuses.push(`⚔ counter(${p.counterDmg.min}-${p.counterDmg.max})`);
    if (p.critBuffTurns > 0) statuses.push(`⭐ crit(${p.critBuffTurns})`);
    if (p.shieldValue > 0) statuses.push(`🔰 shield(${p.shieldValue})`);
    if (p.dodgeChance > 0) statuses.push(`💨 dodge(${p.dodgeChance}%)`);
    if (p.venomTurns > 0) statuses.push(`☠ venom(${p.venomTurns})`);
    if (p.stunTurns > 0) statuses.push(`💫 stun(${p.stunTurns})`);

    const text = statuses.length > 0 ? statuses.join('  │  ') : '';
    if (this._playerStatusText) {
      this._playerStatusText.setText(text);
    }
  }

  /**
   * Cooldown overlay background panel — subtle border glow.
   */
  createCooldownOverlay() {
    // This is drawn per-button in _drawCooldownRing
    // No separate background needed
  }

  /**
   * Tooltip system — shows full ability description on hover.
   */
  createTooltipSystem() {
    this._tooltipBg = this.add.graphics();
    this._tooltipBg.setVisible(false);

    this._tooltipText = this.add.text(0, 0, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '8px',
      color: '#ccddee',
      wordWrap: { width: 200 },
      backgroundColor: '#0a0e14'
    }).setVisible(false);
  }

  /**
   * Create hover glow effect for ability buttons.
   */
  createHoverGlow() {
    this._btnGlowGraphics = this.add.graphics();
    this._btnGlowGraphics.setVisible(false);
  }

  /**
   * Set up keyboard shortcuts — number keys 1-8 map to abilities.
   */
  createKeyboardShortcuts() {
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key;
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        if (this._keybindMap[key] !== undefined && idx < this.abilityButtons.length) {
          event.preventDefault();
          this._activateAbility(idx);
        }
      }
    });
  }

  /**
   * Handle ability activation from keyboard or click.
   */
  _activateAbility(idx) {
    if (!this.engine || this.engine.gameState !== 'combat') return;
    if (!this.abilityButtons[idx]) return;

    const btn = this.abilityButtons[idx];
    if (!btn.ability) return;

    // Check cooldown
    const availAb = this.engine.getAvailableAbilities()[idx];
    if (availAb && availAb.cooldownLeft > 0) return;

    // Check HP cost
    if (btn.ability.cost > this.engine.player.hp) return;

    // Trigger the ability
    this.engine.useAbility(this.engine.player, btn.ability);

    // Visual feedback
    this._flashButton(idx);
    this._flashButtonFlash = true;
    this.tweens.add({
      targets: btn.g,
      alpha: 1,
      duration: 50,
      yoyo: true,
      onComplete: () => { this._flashButtonFlash = false; }
    });
  }

  /**
   * Visual flash when an ability is activated.
   */
  _flashButton(idx) {
    const btn = this.abilityButtons[idx];
    if (!btn || !btn.g) return;

    // Bright flash
    const flashGfx = this.add.graphics();
    flashGfx.fillStyle(0x00f3ff, 0.3);
    flashGfx.fillRoundedRect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 5);

    // Fade out
    this.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 200,
      delay: 50,
      onComplete: () => { flashGfx.destroy(); }
    });
  }

  /**
   * Set up hover detection on ability buttons.
   */
  _setupButtonHover() {
    this.abilityButtons.forEach((btn, i) => {
      if (!btn.g) return;

      btn.g.setInteractive({ useHandCursor: true });

      btn.g.on('pointerover', () => {
        this._btnHovered.set(i, true);
        this._showTooltip(i);
        this._showHoverGlow(i);
      });

      btn.g.on('pointerout', () => {
        this._btnHovered.set(i, false);
        this._hideTooltip();
        this._hideHoverGlow();
      });

      btn.g.on('pointerdown', (pointer) => {
        pointer.event.preventDefault();
        this._activateAbility(i);
      });
    });
  }

  /**
   * Show tooltip with full ability description.
   */
  _showTooltip(idx) {
    const btn = this.abilityButtons[idx];
    if (!btn || !btn.ability) return;

    const ab = btn.ability;
    const availAb = this.engine.getAvailableAbilities()[idx];

    let lines = [
      `⬡ ${ab.name}`,
      `  ${ab.desc}`,
      `  Type: ${ab.type.toUpperCase()}`,
    ];

    if (ab.cooldown > 0 || (availAb && availAb.maxCooldown > 0)) {
      lines.push(`  Cooldown: ${availAb ? availAb.cooldownLeft : (ab.cooldown || 0)}/${ab.maxCooldown || ab.cooldown}`);
    }

    if (ab.cost > 0) {
      lines.push(`  Cost: ${ab.cost} HP`);
    }

    if (ab.healMin || ab.healMax) {
      lines.push(`  Heal: ${ab.healMin || 0}-${ab.healMax || 0}`);
    }

    const text = lines.join('\n');
    const width = 220;
    const height = Math.max(40, Math.ceil(lines.length * 12) + 16);

    // Background
    this._tooltipBg.clear();
    this._tooltipBg.fillStyle(0x0a0e14, 0.95);
    this._tooltipBg.fillRoundedRect(-4, -4, width + 8, height + 8, 4);
    this._tooltipBg.lineStyle(1, 0x00f3ff, 0.4);
    this._tooltipBg.strokeRoundedRect(-4, -4, width + 8, height + 8, 4);
    this._tooltipBg.setVisible(true);

    // Text
    this._tooltipText.setText(text);
    this._tooltipText.setOrigin(0, 0);
    this._tooltipText.setVisible(true);
    this._tooltipVisible = true;

    // Position below the button
    if (btn.g) {
      const worldPos = btn.g.getWorldPosition();
      this._tooltipBg.setPosition(worldPos.x, worldPos.y + btn.h + 5);
      this._tooltipText.setPosition(worldPos.x + 3, worldPos.y + btn.h + 8);
    }
  }

  /**
   * Hide tooltip.
   */
  _hideTooltip() {
    if (this._tooltipBg) {
      this._tooltipBg.clear();
      this._tooltipBg.setVisible(false);
    }
    if (this._tooltipText) {
      this._tooltipText.setVisible(false);
    }
    this._tooltipVisible = false;
  }

  /**
   * Show hover glow on an ability button.
   */
  _showHoverGlow(idx) {
    if (!this._btnGlowGraphics) return;
    this._btnGlowGraphics.setVisible(true);
    const btn = this.abilityButtons[idx];
    if (!btn) return;

    this._btnGlowGraphics.clear();
    this._btnGlowGraphics.lineStyle(2, 0x00f3ff, 0.6);
    this._btnGlowGraphics.strokeRoundedRect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 5);

    // Add glow effect with gradient
    this._btnGlowGraphics.lineStyle(1, 0x00f3ff, 0.2);
    this._btnGlowGraphics.strokeRoundedRect(btn.x - 5, btn.y - 5, btn.w + 10, btn.h + 10, 6);
  }

  /**
   * Hide hover glow.
   */
  _hideHoverGlow() {
    if (this._btnGlowGraphics) {
      this._btnGlowGraphics.clear();
      this._btnGlowGraphics.setVisible(false);
    }
  }

  /**
   * Update all enhanced UI panels each frame.
   */
  _updateEnhancedUI() {
    // Update combo display
    this._updateComboDisplay();

    // Update action queue
    this._updateActionQueue();

    // Update history panel
    this._updateHistoryPanel();

    // Update player status
    this._updatePlayerStatus();
  }

  /**
   * Clean up all enhanced UI elements.
   */
  _cleanupEnhancedUI() {
    [this._comboPanelGraphics, this._actionQueueGraphics, this._historyPanelGraphics,
     this._playerStatusGraphics, this._btnGlowGraphics, this._tooltipBg,
     this._comboText, this._actionQueueTitle, this._actionQueueText,
     this._historyTitle, this._historyText, this._playerStatusText,
     this._tooltipText].forEach(obj => {
      if (obj) {
        if (obj.destroy) obj.destroy();
        else if (obj.clear) obj.clear();
      }
    });
    this._btnHovered.clear();
    this._keybindMap = {};
  }

  shutdown() {
    // Clean up VFX when leaving combat
    this.cleanupVFX();
    // Clean up enhanced UI
    this._cleanupEnhancedUI();
  }
}

