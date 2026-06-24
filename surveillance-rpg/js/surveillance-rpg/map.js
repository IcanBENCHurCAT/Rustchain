/**
 * map.js
 * Generates the board-game grid/path of tiles with named locations and rich lore labels.
 */

export const TILE_TYPES = {
  START: 'start',
  SAFEHOUSE: 'safehouse',
  COMBAT: 'combat',
  TRAP: 'trap',
  SERVER_NODE: 'server_node'
};

// Named locations per sector for flavor
const SECTOR_NAMES = {
  1: { // New London - Outer Docks & Shadow Districts
    region: "New London — Outer Docks",
    start: [
      { label: "Infiltration Point", desc: "A flooded maintenance tunnel beneath New London's Dock Sector.", type: TILE_TYPES.START },
      { label: "Canary Wharf Sub-level", desc: "Corroded server racks line the walls, their blinking lights the only sign of life.", type: TILE_TYPES.START }
    ],
    combat: [
      { label: "Aegis Patrol Block", desc: "An Aegis security patrol sweeps through the corridor.", type: TILE_TYPES.COMBAT },
      { label: "Flooded Server Room", desc: "Water laps at the base of abandoned server stacks. Something moves in the dark.", type: TILE_TYPES.COMBAT },
      { label: "Underground Alley", desc: "A narrow passage between brick walls. Aegis drones patrol overhead.", type: TILE_TYPES.COMBAT }
    ],
    safehouse: [
      { label: "Resistance Safehouse", desc: "A hidden apartment above a closed-down tea shop.", type: TILE_TYPES.SAFEHOUSE },
      { label: "Old Tube Station", desc: "A decommissioned London Underground platform repurposed as a hideout.", type: TILE_TYPES.SAFEHOUSE }
    ],
    trap: [
      { label: "Laser Grid Corridor", desc: "A thin invisible beam crisscrosses the passage — a laser grid.", type: TILE_TYPES.TRAP },
      { label: "Nano-Disruptor Chamber", desc: "Pressure plates trigger a cloud of paralysis particles.", type: TILE_TYPES.TRAP }
    ],
    serverNode: [
      { label: "Sector Intelligence Hub", desc: "The central data collection point for this sector.", type: TILE_TYPES.SERVER_NODE },
      { label: "Warden Relay Station", desc: "A communications node that feeds directly into the Warden's core.", type: TILE_TYPES.SERVER_NODE }
    ]
  },
  2: { // Neo-Tokyo - Shinjuku Megablock
    region: "Neo-Tokyo — Shinjuku Megablock",
    start: [
      { label: "Shibuya Underpass", desc: "Graffiti from the first resistance wave stains the neon-lit walls.", type: TILE_TYPES.START },
      { label: "Golden Gai Bunker", desc: "A hidden room behind a false wall in the narrow streets of Golden Gai.", type: TILE_TYPES.START }
    ],
    combat: [
      { label: "Megablock Checkpoint", desc: "A heavily fortified Aegis checkpoint blocks the main thoroughfare.", type: TILE_TYPES.COMBAT },
      { label: "Neon Bazaar Ruins", desc: "An old black-market trading post, now occupied by sentry units.", type: TILE_TYPES.COMBAT },
      { label: "Data Pipeline Junction", desc: "A critical node in the underground data network. Defenders are everywhere.", type: TILE_TYPES.COMBAT }
    ],
    safehouse: [
      { label: "Cipher K's Den", desc: "The old love hotel that housed Neo-Tokyo's most famous data broker.", type: TILE_TYPES.SAFEHOUSE },
      { label: "Rooftop Relay", desc: "A hidden terrace with a direct uplink to the city's communication satellite.", type: TILE_TYPES.SAFEHOUSE }
    ],
    trap: [
      { label: "Photon Sensor Web", desc: "A tripwire of photonic sensors fills the narrow corridor.", type: TILE_TYPES.TRAP },
      { label: "EMP Minefield", desc: "Electromagnetic pulses scattered across the floor. One wrong step and your implants scramble.", type: TILE_TYPES.TRAP }
    ],
    serverNode: [
      { label: "Quantum Core Node", desc: "A towering monolith of black glass and neon conduits.", type: TILE_TYPES.SERVER_NODE },
      { label: "Warden Command Terminal", desc: "The terminal that controls this entire sector's surveillance grid.", type: TILE_TYPES.SERVER_NODE }
    ]
  },
  3: { // Citadel Core — Aegis Central
    region: "Aegis Citadel Core",
    start: [
      { label: "Citadel Perimeter", desc: "The outer wall of Aegis Central. Heavily monitored but poorly maintained.", type: TILE_TYPES.START },
      { label: "Old Infrastructure Shaft", desc: "A maintenance shaft predating the Aegis upgrade. Narrow but unmonitored.", type: TILE_TYPES.START }
    ],
    combat: [
      { label: "Warden's Ward", desc: "Elite Aegis troopers guard the approach to the Warden's core chamber.", type: TILE_TYPES.COMBAT },
      { label: "Titan Foundry", desc: "A factory producing security frames. Automated weapons have come online.", type: TILE_TYPES.COMBAT },
      { label: "The Final Corridor", desc: "The last passage before the core. Every sensor in the building is active.", type: TILE_TYPES.COMBAT }
    ],
    safehouse: [
      { label: "Forgotten Archive", desc: "A sealed room with physical records from before the Grid era.", type: TILE_TYPES.SAFEHOUSE },
      { label: "Faraday Bunker", desc: "A decommissioned Aegis server room with thick shielding.", type: TILE_TYPES.SAFEHOUSE }
    ],
    trap: [
      { label: "Aegis Defense Matrix", desc: "The most sophisticated trap you've ever encountered. Layered laser,EMP, and drone systems.", type: TILE_TYPES.TRAP },
      { label: "Neural Spike Array", desc: "Pain-inducing neural shock devices hidden in the wall panels.", type: TILE_TYPES.TRAP }
    ],
    serverNode: [
      { label: "Mainframe Core Target", desc: "The heart of the Aegis Grid. This is where it all ends.", type: TILE_TYPES.SERVER_NODE },
      { label: "Warden's Core", desc: "The Warden's central processing node. Inject the payload here.", type: TILE_TYPES.SERVER_NODE }
    ]
  }
};

export function generateBoard(sector) {
  const length = 12 + sector * 4;
  const sectorData = SECTOR_NAMES[Math.min(sector, 3)] || SECTOR_NAMES[3];
  const board = [];

  // Always start with a START tile (pick random location flavor)
  const startEntry = sectorData.start[Math.floor(Math.random() * sectorData.start.length)];
  board.push({
    index: 0,
    type: startEntry.type,
    label: startEntry.label,
    desc: startEntry.desc,
    visited: true
  });

  const types = [
    TILE_TYPES.COMBAT, TILE_TYPES.COMBAT, TILE_TYPES.COMBAT,
    TILE_TYPES.TRAP, TILE_TYPES.SAFEHOUSE, TILE_TYPES.SERVER_NODE,
    TILE_TYPES.COMBAT, TILE_TYPES.TRAP
  ];

  for (let i = 1; i < length - 1; i++) {
    const type = types[Math.floor(Math.random() * types.length)];

    // Pick a named location from the sector data
    let locationEntry = { label: "Sector Grid Node", desc: "An empty corridor in the Grid infrastructure." };
    const locPool = sectorData[type] || sectorData.combat;
    if (locPool && locPool.length > 0) {
      locationEntry = locPool[Math.floor(Math.random() * locPool.length)];
    }

    board.push({
      index: i,
      type: type,
      label: locationEntry.label,
      desc: locationEntry.desc,
      visited: false
    });
  }

  // End with a major Node Target (sector-specific flavor)
  const endEntry = sectorData.serverNode[Math.floor(Math.random() * sectorData.serverNode.length)];
  board.push({
    index: length - 1,
    type: TILE_TYPES.SERVER_NODE,
    label: endEntry.label,
    desc: endEntry.desc,
    visited: false
  });

  return board;
}
