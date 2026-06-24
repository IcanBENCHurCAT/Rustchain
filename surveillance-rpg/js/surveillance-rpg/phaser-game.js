/**
 * phaser-game.js
 * Phaser 3 scenes: BootScene (assets), BoardScene (map visualization),
 * CombatScene (full interactive ability-based combat).
 */

import { CLASSES, ENEMIES } from './entities.js';
import { Colors } from './vector-art.js';

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

    this.scene.start('BoardScene');
  }
}

// ─── BOARD SCENE ────────────────────────────────────────────────────────────

// Tile type display names and colors
const TILE_DISPLAY = {
  start:       { name: 'START',     color: 0x00f3ff },
  combat:      { name: 'COMBAT',    color: 0xff0055 },
  safehouse:   { name: 'SAFEHOUSE', color: 0x39ff14 },
  trap:        { name: 'TRAP',      color: 0xffaa00 },
  server_node: { name: 'NODE',      color: 0xb026ff }
};

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
  }

  init(data) {
    this.engine = data.engine;
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

    // ── HEALTH BARS (Phaser-based) ──
    this.playerHPBar = this.createHPBar(100, 300, 140, 12, playerCol);
    this.enemyHPBar = this.createHPBar(560, 300, 140, 12, 0xff0055);

    // ── TURN COUNTER ──
    this.turnText = this.add.text(400, 370, 'TURN 1', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#00f3ff'
    }).setOrigin(0.5);

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

    // ── ABILITY BUTTONS (interactive) ──
    this.abilityButtons = [];
    this.createAbilityButtons();

    // ── BATTLE LOG (on-screen) ──
    this.createBattleLog();

    // ── ENTRY ANIMATION ──
    this.tweens.add({ targets: this.playerVisual, x: 170, duration: 600, ease: 'Bounce' });
    this.tweens.add({ targets: this.enemyVisual, x: 630, duration: 600, ease: 'Bounce' });

    // ── SYNC CHECK ──
    this.combatTimer = this.time.addEvent({
      delay: 300,
      callback: () => this.syncCombatState(),
      loop: true
    });

    // ── CLICK HANDLER ──
    this.input.on('pointerdown', (pointer) => {
      for (const btn of this.abilityButtons) {
        if (pointer.x >= btn.x && pointer.x <= btn.x + btn.w &&
            pointer.y >= btn.y && pointer.y <= btn.y + btn.h) {
          if (btn.engine && btn.engine.gameState === 'combat') {
            btn.engine.useAbility(btn.index);
            this.rebuildAbilityButtons();
            this.syncCombatState();
            return;
          }
        }
      }
    });
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

    const btnW = 155;
    const btnH = 52;
    const gap = 8;
    const cols = 3;
    const startX = 400 - ((cols * btnW + (cols - 1) * gap) / 2);
    const startY = 260;

    abilities.forEach((ability, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);

      // Button background
      const g = this.add.graphics();

      this.abilityButtons.push({
        g, x, y, w: btnW, h: btnH, index: i, ability, engine: this.engine,
        remove: () => { g.clear(); g.destroy(); }
      });
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

      // Color based on state
      let bgColor, borderColor, textColor, glowColor;
      if (isOnCooldown) {
        bgColor = 'rgba(20, 20, 30, 0.5)';
        borderColor = 'rgba(60, 60, 80, 0.5)';
        textColor = '#4a5568';
        glowColor = 'rgba(40, 40, 50, 0.3)';
      } else if (!canUse) {
        bgColor = 'rgba(30, 25, 20, 0.5)';
        borderColor = 'rgba(100, 70, 40, 0.5)';
        textColor = '#a08060';
        glowColor = 'rgba(80, 60, 30, 0.2)';
      } else {
        bgColor = `rgba(0, 243, 255, 0.08)`;
        borderColor = 'rgba(0, 243, 255, 0.5)';
        textColor = '#00f3ff';
        glowColor = 'rgba(0, 243, 255, 0.25)';
      }

      // Glow
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(glowColor), 0.3);
      btn.g.fillRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 4);

      // Background
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor), 0.9);
      btn.g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 3);

      // Border
      btn.g.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(borderColor), 1);
      btn.g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 3);

      // Ability name
      const nameText = isOnCooldown ? `${ab.name} (${availAb.cooldownLeft})` : ab.name;
      btn.g.fillStyle(Phaser.Display.Color.HexStringToColor(textColor), 1);
      btn.g.fillRoundRect(btn.x + 5, btn.y + 4, btn.w - 10, 18, 2);

      // Draw name manually
      const nameObj = this.add.text(btn.x + 8, btn.y + 6, nameText, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        color: textColor,
        fontStyle: 'bold'
      });
      nameObj.setOrigin(0, 0);
      this.abilityButtons[i]._nameObj = nameObj;

      // Ability desc
      const descText = ab.desc.length > 42 ? ab.desc.substring(0, 40) + '…' : ab.desc;
      const descObj = this.add.text(btn.x + 8, btn.y + 28, descText, {
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '8px',
        color: isOnCooldown ? '#3a4558' : '#6b8a9e',
        wordWrap: { width: btn.w - 16 }
      });
      descObj.setOrigin(0, 0);
      this.abilityButtons[i]._descObj = descObj;

      // Type icon
      const typeColors = { attack: '#ff0055', buff: '#b026ff', heal: '#39ff14' };
      const typeIcon = ab.type === 'attack' ? '⚔' : ab.type === 'buff' ? '🛡' : '💚';
      const typeObj = this.add.text(btn.x + btn.w - 18, btn.y + 8, typeIcon, {
        fontSize: '14px'
      });
      typeObj.setColor(typeColors[ab.type] || '#ffffff');
      this.abilityButtons[i]._typeObj = typeObj;
    });
  }

  createBattleLog() {
    // Battle log box
    this.logGraphics = this.add.graphics();
    this.logGraphics.fillStyle(0x080c14, 0.85);
    this.logGraphics.fillRoundedRect(20, 20, 360, 80, 4);
    this.logGraphics.lineStyle(1, 0x1a293d, 0.6);
    this.logGraphics.strokeRoundedRect(20, 20, 360, 80, 4);

    // Title
    this.logTitle = this.add.text(25, 23, 'COMBAT LOG', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '9px',
      color: '#00f3ff'
    });

    // Log content area
    this.logContent = this.add.text(25, 38, '', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '9px',
      color: '#7d96b4',
      wordWrap: { width: 350 }
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
      this.shakeAmount = 8;
      this.enemyParticles.emitParticleAt(this.enemyVisual.x, this.enemyVisual.y, 12);
      this.tweens.add({
        targets: this.enemyVisual,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 60,
        yoyo: true,
        ease: 'Power2'
      });
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
    }

    // Rebuild ability buttons (cooldown updates)
    if (this.abilityButtons.length > 0) {
      this.rebuildAbilityButtons();
    }

    // Update battle log
    if (this.engine.battleLog && this.logContent) {
      const recent = this.engine.battleLog.slice(-6);
      this.logContent.setText(recent.map(l => l.startsWith('  ') ? l : '▸ ' + l).join('\n'));
      this.logContent.setPosition(25, 38);
    }

    this.lastPlayerHP = this.engine.player.hp;
    this.lastEnemyHP = this.engine.combatState.enemy.hp;
  }

  update(time, delta) {
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
  }
}
