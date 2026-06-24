/**
 * vector-art.js
 * Contains retro 8-bit pixel rendering routines using canvas grid projection.
 * This yields crisp pixel-art silhouettes with ZERO external assets or sprite-sheet loading bugs!
 */

export const Colors = {
  bg: '#080a0f',
  grid: '#151d2a',
  glowBlue: '#00f3ff',
  glowRed: '#ff0055',
  glowOrange: '#ffaa00',
  glowGreen: '#39ff14',
  glowPurple: '#b026ff',
  hudText: '#00e1d9',
  panel: 'rgba(13, 25, 41, 0.85)',
  panelBorder: '#203a5c',
  white: '#ffffff',
  grey: '#6b7c96',
  skin: '#ffdbac',
  darkMetal: '#1e293b',
  cyberBlue: '#0055aa'
};

/**
 * Draws a pixel grid sprite representation.
 * data is an array of strings representing rows of pixel color keys.
 * scale is the size of each pixel block.
 */
function drawPixelSprite(ctx, x, y, data, colorMap, scale = 2.5) {
  const height = data.length;
  const width = data[0].length;
  const startX = x - (width * scale) / 2;
  const startY = y - (height * scale) / 2;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const char = data[r][c];
      if (char !== ' ' && colorMap[char]) {
        ctx.fillStyle = colorMap[char];
        ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
      }
    }
  }
}

/**
 * 1. PLAYER PIXEL SPRITES
 */

// Gunner
export function drawGunner(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.008) > 0 ? 1 : 0;
  const swing = state === 'walk' && Math.sin(time * 0.015) > 0 ? 1 : 0;

  const sprite = [
    "  ████  ",
    " ██████ ",
    "██BBBB██",
    "  ████  ",
    " ░████░ ",
    " ░░██░░ ",
    " ░░██░░ ",
    "  ████  ",
    "  █  █  ",
    "  █  █  "
  ];

  // Adjust legs during walk cycle
  if (swing) {
    sprite[8] = " █    █ ";
    sprite[9] = " █    █ ";
  }

  const map = {
    '█': Colors.darkMetal,
    'B': Colors.glowBlue,
    '░': Colors.grey
  };

  drawPixelSprite(ctx, x, y + bob * 2, sprite, map, 3.5);
}

// Muscleman
export function drawMuscleman(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.005) > 0 ? 1 : 0;
  const swing = state === 'walk' && Math.sin(time * 0.012) > 0 ? 1 : 0;

  const sprite = [
    "   ████   ",
    "  ██████  ",
    " ██OOOO██ ",
    "██████████",
    "██████████",
    " ████████ ",
    "  ██████  ",
    "  ██  ██  ",
    "  ██  ██  ",
    "  ██  ██  "
  ];

  if (swing) {
    sprite[8] = " ██    ██ ";
    sprite[9] = "██      ██";
  }

  const map = {
    '█': '#334155',
    'O': Colors.glowOrange
  };

  drawPixelSprite(ctx, x, y + bob * 2, sprite, map, 3.8);
}

// Operative (Streetrunner)
export function drawOperative(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.01) > 0 ? 1 : 0;
  const swing = state === 'walk' && Math.sin(time * 0.02) > 0 ? 1 : 0;

  const sprite = [
    "  GGGG  ",
    " GGGGGG ",
    "GGSSSSGG",
    "  GGGG  ",
    "  ████  ",
    " █GGGG█ ",
    " █GGGG█ ",
    "  GGGG  ",
    "  █  █  ",
    "  █  █  "
  ];

  if (swing) {
    sprite[8] = " █    █ ";
    sprite[9] = " █    █ ";
  }

  const map = {
    'G': Colors.glowGreen,
    'S': Colors.skin,
    '█': '#0f172a'
  };

  drawPixelSprite(ctx, x, y + bob * 2, sprite, map, 3.5);
}

// Duelist
export function drawDuelist(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.012) > 0 ? 1 : 0;
  const swing = state === 'walk' && Math.sin(time * 0.022) > 0 ? 1 : 0;

  const sprite = [
    "  ████    ",
    " ██████   ",
    "██RRRR██  ",
    "  ████    ",
    "  ████  R ",
    "  ████  R ",
    "  ████  R ",
    "  ████  R ",
    "  █  █    ",
    "  █  █    "
  ];

  if (swing) {
    sprite[8] = " █    █   ";
    sprite[9] = " █    █   ";
  }

  const map = {
    '█': '#1e1b4b',
    'R': Colors.glowRed
  };

  drawPixelSprite(ctx, x, y + bob * 2, sprite, map, 3.5);
}

// Hacker
export function drawHacker(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.007) > 0 ? 1 : 0;
  const hover = Math.sin(time * 0.005) * 4;

  const sprite = [
    "  PPPP  ",
    " PPPPPP ",
    "PPSSSSPP",
    "  PPPP  ",
    "  ████  ",
    " ██████ ",
    " ██████ ",
    "  ████  ",
    "   PP   ",
    "   P    "
  ];

  const map = {
    'P': Colors.glowPurple,
    'S': Colors.skin,
    '█': '#0b0f19'
  };

  drawPixelSprite(ctx, x, y + hover, sprite, map, 3.5);
}

/**
 * 2. ENEMY PIXEL SPRITES
 */

// Quad-Rotor Drone
export function drawQuadRotor(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.01) * 4;
  const prop = Math.sin(time * 0.05) > 0 ? 1 : 0;

  const sprite = [
    "P      P",
    " R████R ",
    " ██RR██ ",
    "  ████  ",
    " R████R ",
    "P      P"
  ];

  if (prop) {
    sprite[0] = " P    P ";
    sprite[5] = " P    P ";
  }

  const map = {
    '█': '#1e293b',
    'R': Colors.glowRed,
    'P': Colors.grey
  };

  drawPixelSprite(ctx, x, y + bob, sprite, map, 4.0);
}

// Dog Mech
export function drawDogMech(ctx, x, y, size, state, time) {
  const bob = Math.sin(time * 0.008) > 0 ? 1 : 0;
  const swing = state === 'walk' && Math.sin(time * 0.015) > 0 ? 1 : 0;

  const sprite = [
    "  ███       ",
    " ██R██      ",
    "██████████  ",
    "████████████",
    " ██████████ ",
    "  █ █  █ █  ",
    "  █ █  █ █  "
  ];

  if (swing) {
    sprite[5] = "  █    █ █  ";
    sprite[6] = " █      █   ";
  }

  const map = {
    '█': '#0f172a',
    'R': Colors.glowRed
  };

  drawPixelSprite(ctx, x, y + bob * 2, sprite, map, 3.8);
}

// Fixed camera
export function drawSecurityCamera(ctx, x, y, size, state, time) {
  const swivel = Math.sin(time * 0.003) > 0 ? 1 : 0;

  const sprite = [
    "████████",
    "  ████  ",
    "  ████  ",
    " ██████ ",
    "████RR██",
    " ██████ "
  ];

  if (swivel) {
    sprite[4] = "████  RR";
  }

  const map = {
    '█': '#334155',
    'R': Colors.glowRed
  };

  drawPixelSprite(ctx, x, y, sprite, map, 4.0);
}

/**
 * 3. TILE DECORATIONS
 */
export function drawSafehouseIcon(ctx, x, y, size) {
  const sprite = [
    "  GGGG  ",
    " GGGGGG ",
    "GGGGGGGG",
    "GGGGGGGG",
    " GGGGGG ",
    "  GGGG  "
  ];
  const map = { 'G': Colors.glowGreen };
  drawPixelSprite(ctx, x, y, sprite, map, 3.0);
}

export function drawTrapIcon(ctx, x, y, size) {
  const sprite = [
    "   RR   ",
    "  RRRR  ",
    " RRRRRR ",
    "RRRRRRRR",
    "   RR   ",
    "   RR   "
  ];
  const map = { 'R': Colors.glowRed };
  drawPixelSprite(ctx, x, y, sprite, map, 3.0);
}

export function drawServerNodeIcon(ctx, x, y, size, time) {
  const hover = Math.sin(time * 0.005) * 2;
  const sprite = [
    "PPPPPPPP",
    "PP    PP",
    "PPPPPPPP",
    "PP    PP",
    "PPPPPPPP"
  ];
  const map = { 'P': Colors.glowPurple };
  drawPixelSprite(ctx, x, y + hover, sprite, map, 3.5);
}
