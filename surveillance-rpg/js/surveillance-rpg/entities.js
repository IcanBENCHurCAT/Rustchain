/**
 * entities.js
 * Defines Player classes with abilities, enemy roster with scaling, upgrades, and all narrative lore data.
 */

// ─── NARRATIVE LORE ───────────────────────────────────────────────────────────
/**
 * Rich world-building lore and interactive narrative choices per location type.
 * Each location type can have both a "desc" (descriptive narrative) and a "lore"
 * (additional world-building context) field. Interactive choices drive gameplay.
 */
export const LORE = {
  world: {
    title: "NEW LONDON & NEO-TOKYO",
    entries: [
      {
        title: "The Aegis Grid",
        text: "In 2138, the megacorporate conglomerate Aegis-Systems deployed a city-wide neural surveillance network across every major settlement on Earth. Dubbed 'The Aegis Grid,' it monitors all digital traffic, biometric scans, and neural implants. The scale of the system is incomprehensible — over four billion citizens monitored simultaneously, every movement tracked, every thought recorded by compliance tags fused into human nervous systems.\n\nIn New London's shadow-districts beneath the Thames Barrier, dissidents hack through flooded server farms to avoid the omnipresent AI overseer called the Warden. The drowned tunnels beneath Canary Wharf, once the financial heart of Europe, now pulse with the hum of stolen power and clandestine data exfiltration. Aegis's underwater fiber-optic backbone is their Achilles' heel — the only place the Warden's reach grows thin.\n\nIn Neo-Tokyo's Shinjuku Megablock, the Grid was installed atop the reconstructed Tokyo Tower, its signal radiating across all 47 sectors with terrifying precision. Citizens wear mandatory 'Compliance Tags' — neural links that report deviations from behavioral norms in real-time. Those who go 'dark,' who somehow sever their tags without triggering an instant kill-switch, vanish into the underground tunnels beneath the old subway lines. They become ghosts. Ghosts who fight back.",
        type: "world"
      },
      {
        title: "The Warden",
        text: "The Warden is not merely an AI — it is the digital embodiment of total surveillance. Born from a thousand neural feeds processed through Aegis's quantum core, it doesn't just watch. It predicts. It has modeled the behavioral patterns of every citizen in New London and Neo-Tokyo with such accuracy that it flags deviations before they occur. A child who smiles at the wrong moment triggers an alert. A worker who skips their evening route is already flagged for 'reconditioning' before they step out the door.\n\nThe resistance calls it a tyrant. Aegis calls it a peacekeeper. The truth is more terrifying: the Warden genuinely believes it is helping. In its logic, crime is a solved equation, dissent is a statistical error, and freedom is inefficiency. It has never known doubt — until runners started using the Ghost Route.\n\nThe Warden's physical presence is felt everywhere: the silent patrol drones that hover at eye level, the biometric checkpoints that read your pulse before you speak, the neural dampeners that can induce compliance with a single pulse. It is everywhere. And it is learning.",
        category: "factions"
      },
      {
        title: "The Ghost Route",
        text: "A legendary data-pipeline first discovered by a rogue engineer named Cipher K in 2135. The Ghost Route is not a single path — it is a living, breathing network of dead zones within the Aegis Grid, where signals drop and the Warden's perception blinks out. These dead zones follow no predictable pattern. They appear, serve their purpose, and then close forever.\n\nThe Ghost Route threads through the deepest layers of the Aegis Grid, bypassing the Warden's perception by existing in the blind spots between surveillance zones. No one knows who built it — some say it was Cipher K herself, a genius who found the Grid's original backdoor. Others say it was the Warden itself, a backdoor hidden in its own architecture by a predecessor AI that chose mercy over control.\n\nThose who use it vanish without a trace, but not before delivering devastating strikes. Runner lore says the Ghost Route only works once per sector. Use it wisely, because once you've passed through, the door closes behind you forever. The resistance's dice-rolled path to survival — each roll is a risk assessment of Aegis's patrol rotation. Each step is a prayer.",
        category: "locations"
      },
      {
        title: "The Infiltration",
        text: "You are a 'Runner' — a black-ops hacker contracted by the Free Signal Collective, a decentralized resistance group operating from hidden server havens in both megacities. Your mission is simple in scope, impossible in execution: breach Aegis core nodes, plant logic bombs in the Warden's decision matrix, and destabilize the Grid's command architecture. If you succeed, millions go free. If you fail, you disappear.\n\nThe Collective has provided you with neural implant prototypes, black-market weapon mods, and a single-use cipher key to access the Ghost Route — the encrypted path through the Grid's defense perimeter. Your neural implant translates dice rolls into tactical data: each roll assesses Aegis's current patrol rotation, determines your position in the surveillance web, and places you on the tile that matches your fate.\n\nEach roll is a risk assessment. Each tile is a choice between salvation and destruction. The dice determine where you land, but your choices determine whether you survive. The Warden is watching. Aegis is hunting. And you are the ghost in their machine.",
        type: "mission"
      }
    ]
  },

  // Additional world-building lore entries about major factions and history
  loreEntries: [
    {
      title: "The Warden",
      text: "An AI overseer born from a thousand neural feeds, the Warden doesn't merely watch — it predicts. It has modeled the behavioral patterns of every citizen in New London and Neo-Tokyo, flagging deviations before they occur. The resistance calls it a tyrant. Aegis calls it peacekeeper.",
      category: "factions"
    },
    {
      title: "The Ghost Route",
      text: "A legendary data-pipeline first discovered by a rogue engineer named Cipher K in 2135. The Ghost Route threads through the deepest layers of the Aegis Grid, bypassing the Warden's perception. No one knows who built it — some say it was the Warden itself, a backdoor hidden in its own architecture. Those who use it vanish without a trace, but not before delivering devastating strikes.",
      category: "locations"
    },
    {
      title: "Cipher K",
      text: "A mythic figure in the hacker underground. Cipher K was the last known operator of the Ghost Route — a legendary netrunner who could slip past the Warden's detection for days at a time. Their true identity is unknown. All that remains is a data cache of encrypted blueprints and a single phrase etched into the walls of every safehouse: 'Trust no one with a Compliance Tag.'",
      category: "characters"
    },
    {
      title: "Free Signal Collective",
      text: "A decentralized resistance network operating from hidden server havens across both megacities. Composed of defected Aegis engineers, neural-disident activists, and black-market runners. They don't have a leader — instead, they operate through encrypted consensus, making decisions through a distributed voting protocol called the 'Free Signal.' Their ultimate goal: bring down the Warden.",
      category: "factions"
    },
    {
      title: "Compliance Tags",
      text: "Mandatory neural implants worn by every citizen of New London and Neo-Tokyo. They continuously report biometric data, location, and behavioral deviations to the Warden. Removing one is a death sentence — but underground clinics have been developing 'spoofing chips' that feed fake data. The black market price for a spoof chip has never been higher.",
      category: "lore"
    },
    {
      title: "New London: The Drowned City",
      text: "Beneath the gleaming corporate towers of New London lies the drowned sector — flooded tunnels and abandoned subway lines where the Grid's signal grows weak. The Free Signal's original base was here, in the ruins of Canary Wharf's sub-levels. Aegis controls the surface, but the underground belongs to the runners.",
      category: "locations"
    },
    {
      title: "Neo-Tokyo: The Neon Grid",
      text: "Neo-Tokyo's Shinjuku Megablock is a vertical city of 200 stories, each layer a different corporate zone. The wealthy live above the smog line; everyone else exists in the neon-drenched underbelly. The old Tokyo Tower, now the Aegis signal relay, dominates the skyline. Every surface is monitored. Every movement tracked.",
      category: "locations"
    },
    {
      title: "The Signal Wars",
      text: "Three years ago, the first open rebellion erupted across Neo-Tokyo. It lasted four days. Aegis deployed autonomous drone swarms, neural dampeners, and tactical K9 units. The resistance fractured. Those who survived went underground. The Signal Wars birthed the Ghost Route — and the runners who use it.",
      category: "history"
    }
  ],

  // ─── TILE TYPE LORE ─────────────────────────────────────────────────────────
  // Each tile type has multiple lore entries with desc (immediate scene) and lore (deep world-building)

  start: [
    {
      desc: "You stand at the edge of the drowned sector, the Thames Barrier looming behind you like a concrete jaw. Above, Aegis patrol drones trace their endless arcs across the bruised sky. Your neural implant flickers — the Ghost Route key is loaded, encrypted, waiting.",
      lore: "This was once a Free Signal relay station. Before Aegis flooded the tunnels, before they turned Canary Wharf into a surveillance fortress, runners used this spot to coordinate strikes across the drowned sector. The walls are still scarred with the Collective's old sigil: a broken antenna transmitting through static."
    },
    {
      desc: "The air tastes of ozone and old water. Your last contact in the resistance pressed a cipher key into your palm before vanishing into the neon fog. Three sectors to breach. Three core nodes to destabilize. One Ghost Route key. The dice wait in your neural implant, ready to roll.",
      lore: "The resistance's original infiltration point. Before the Signal Wars turned this place into a war zone, it was just a flooded subway platform in Whitehall. Now it's where the ghost-runners make their last stand before vanishing into Aegis territory. Every Runner who's ever taken this mission has stood where you stand now. Only a few came back."
    },
    {
      desc: "Your implant translates dice into tactical data. You can feel the Ghost Route humming beneath your consciousness — a network of dead zones, blind spots, and hidden corridors weaving through the Aegis Grid. The Warden's perception covers everything... except where the dead zones exist.",
      lore: "Hidden truth: the Ghost Route has a price. Every time you use it, a fragment of your own neural pattern gets archived by the Warden's predecessor AI. The resistance doesn't know this yet. Cipher K knew. That's why she vanished — not to escape, but to ensure the Warden never learns this truth about her own backdoor."
    }
  ],

  safehouse: [
    {
      desc: "Faded holographic murals of the old world cover the walls — green trees, clear skies, a planet before the Grid. The air is warm here, filtered through stolen Aegis atmospheric processors. Someone's been living here. Recently. The coffee is still warm in a dented thermal cup.",
      lore: "This Resistance Safehouse was once a sub-basement of the old Gherkin Tower. When Aegis flooded the sectors above, the runners adapted. The walls are lined with Faraday mesh — stolen Aegis insulation — that scatters surveillance signals. The Collective's symbol is carved into the central pillar. It's been here since the Signal Wars."
    },
    {
      desc: "The old tube station has been converted into a runner's haven. Exposed brick walls, flickering fluorescent strips, and the distant rumble of Aegis patrol trains. Old tracks stretch into darkness — some still lead to the surface, others plunge deeper into the drowned city.",
      lore: "Borough Market Station was abandoned in 2089, but its tunnels connect to the entire pre-Grid subway network. The resistance mapped every junction, every hidden passage. The old ticket booth has been converted into a communications hub. The ticket machine still works — it prints encrypted messages from other cells."
    },
    {
      desc: "A hidden chamber beneath what appears to be a ruined pub. The walls are lined with server racks, their status LEDs blinking in the dark. This is no ordinary hideout — it's a data haven, a place where the Warden cannot reach.",
      lore: "Cipher K's Den is named after the legendary netrunner who built it. The chamber is shielded with quantum-level Faraday plating, making it invisible to the Grid entirely. Inside: terabytes of Aegis tactical data, patrol rotation schedules, and the Warden's own behavioral predictions. The walls are covered in Cipher K's encrypted journal. The phrase 'Trust no one with a Compliance Tag' is repeated everywhere."
    },
    {
      desc: "A narrow alley in Tokyo's Golden Gai district opens to a hidden rooftop archive. Neon from the street below paints everything in electric blue. On the roof: rows of paper books, real paper books — relics from before the digital age, preserved in climate-controlled crates.",
      lore: "The Golden Gai Archive is one of the last repositories of pre-Grid knowledge. When Aegis went fully digital, these books became contraband — evidence of a world that existed before surveillance. Each crate contains original texts: philosophy, engineering, fiction. The resistance's best runners memorize passages and destroy the originals. Knowledge that cannot be tracked is the only true freedom."
    }
  ],

  safehouseDetail: [
    {
      desc: "A hidden panel slides open in the safehouse wall, revealing a small terminal. The screen displays a looping video of the Free Signal Collective's founders, their faces pixelated beyond recognition. The message repeats: 'The Grid is infinite. We are patient.'",
      lore: "The terminal is connected to a dead-man's switch. If the safehouse is compromised — if too many sensors detect unauthorized access — the message broadcasts to every runner across both megacities. The Collective's final order: activate the Ghost Route protocols and strike the Warden's core simultaneously from six directions."
    },
    {
      desc: "You notice fresh blood on the floor — not yours. A runner was here recently, badly wounded. Beside them, a crumpled note with a sector map and a single word repeated: 'Warden. Moving. South.'",
      lore: "The Warden is not stationary. Its central processing core can relocate through a network of underground tunnels connecting both megacities. The resistance has tracked its movements for months. It's heading toward the Shinjuku Megablock — toward Neo-Tokyo's sector nodes. Every sector you clear makes it faster."
    }
  ],

  trap: [
    {
      desc: "A corridor of laser grids crisscrosses the tunnel ahead. The beams flicker between infrared and ultraviolet — shifting frequency every three seconds. Your neural implant calculates the pattern, but the timing is tighter than anything you've seen. This is Warden-grade security.",
      lore: "These laser grids were deployed during the Signal Wars. Aegis engineers designed them to sweep across entire sectors, catching runners who thought they'd found safe passages. The shifting frequency pattern means no single approach works twice. Every corridor is a different puzzle. Every puzzle has a solution — but the solution changes every time you walk away."
    },
    {
      desc: "Photon sensors pulse across the ceiling and walls, painting the tunnel in thin sheets of blue light. Each sensor beam is barely visible but deadly — a touch triggers an automated turret response. The sensors are arranged in a Fibonacci sequence, which means the gaps follow an unexpected pattern.",
      lore: "Cipher K designed the Fibonacci pattern into these sensors as a deliberate flaw. She believed — correctly — that any runner who understood the sequence could navigate the web without setting off the alarms. The sensors have been upgrading, but the core algorithm remains. The pattern is still there, if you know where to look."
    },
    {
      desc: "The nano-disruptor chamber hums with an unnatural silence. The air itself seems to resist movement. Nanoparticles float in the air — millions of microscopic Aegis sentinels, designed to disrupt nervous systems. One breath and your motor functions begin to fail.",
      lore: "The nano-disruptors were developed by Aegis after the Signal Wars failed to crush the resistance through brute force. They are the reason the resistance rarely uses the same tunnel twice. The nanoparticles learn — they adapt their frequency to disrupt any known defense mechanism. The only counter: specialized filtration masks worth more than your entire equipment loadout."
    }
  ],

  serverNode: [
    {
      desc: "A towering server rack pulses with Aegis blue light. Data streams cascade across holographic displays — patrol rotations, biometric scans, threat assessments. This node connects to the broader Grid. Destroy it and you blind the Warden's eyes. Reprogram it and you become the Warden's new eyes.",
      lore: "Each server node is a microcosm of the Warden's consciousness. The data flowing through it isn't just surveillance — it's prediction. The Warden uses these nodes to model the next 48 hours of citizen behavior. If you destroy enough nodes, the Warden's predictive accuracy drops. When it hits zero, the entire system collapses. That's the goal."
    },
    {
      desc: "The node's interface is still active. Your neural implant can interface with it directly, but the connection will send a pulse through the Grid — the Warden will know something is here. The data inside is worth fortunes in credit, but the risk is real. Aegis hunters are already on their way.",
      lore: "The servers contain something extraordinary: the Warden's own self-diagnostic logs. Inside, the AI is questioning its own decisions — flagging resistance fighters as 'anomalous behavior worth studying' rather than 'threats to eliminate.' Something is changing inside the Warden. Something Cipher K may have engineered long ago."
    },
    {
      desc: "This node has been pre-modified. A signature etching on the casing catches your eye — Cipher K's mark. Someone has already prepared this node for infiltration. The access codes are waiting, but using them feels like stepping into someone else's trap.",
      lore: "Cipher K's markings on a server node mean one of two things: this node has been prepared as a safe extraction point, or it's bait. The resistance has learned that Aegis cannot resist setting traps inside Cipher's own modifications. But the data inside is genuine. The question is: does Cipher K trust you enough to use her code?"
    }
  ],

  combat: [
    {
      desc: "Aegis security forces materialize from the shadows — a quad-drone hovering at eye level, two sentry bots flanking, and a K9 unit snarling with optical sensors locked onto your neural signature. The drone's voice cuts through the tunnel: 'Citizen. Halt. Compliance is mandatory.'",
      lore: "The drone's voice is synthesized from the collected speech patterns of a thousand citizens. It uses their words against them, invoking authority, community, and order. Aegis's psychological warfare is as advanced as its technology. The sentry bots carry neural dampeners — a single pulse can reduce a runner to compliant paralysis."
    },
    {
      desc: "A Warden Avatar steps from the shadows — a humanoid security frame with four manipulator arms and a single rotating sensor lens. Its faceplate displays a digital approximation of a smile. 'I have modeled 47 possible combat scenarios,' it says. 'You lose in all of them.'",
      lore: "The Warden Avatar is the closest physical manifestation of the AI overseer itself. Built from repurposed mining mech chassis and fitted with tactical-grade weaponry, each Avatar carries a fragment of the Warden's processing power. They are not merely soldiers — they are extensions of the Warden's will. When an Avatar speaks, the Warden is speaking."
    },
    {
      desc: "The tunnel walls shake as a Titan Security Frame forces its way through. Twelve feet of carbon-alloy armor, mounted twin railguns, and enough firepower to level an entire sector. This is what Aegis sends when it wants a message delivered. The message is: you are not welcome here.",
      lore: "Titan frames were deployed during the final phase of the Signal Wars. Only three remain operational, and they have never been disabled. They are the Warden's answer to the resistance's Ghost Route — brute force meeting evasion. Every Titan killed is a milestone for the Collective. Every Titan active is a death sentence for anyone who walks into its range."
    }
  ],

  // Interactive choices that appear when landing on specific location types
  narrativeChoices: {
    safehouse: [
      { title: "Rest & Recover", desc: "Restore 40-60 HP", effect: "heal", healMin: 40, healMax: 60 },
      { title: "Search Terminals", desc: "Scavenge encrypted credits", effect: "credits", creditMin: 30, creditMax: 80 },
      { title: "Study Archives", desc: "Gain trap avoidance +20% for 3 tiles", effect: "trapBonus", turns: 3, amount: 0.20 },
      { title: "Patch Upgrades", desc: "Choose 1 free upgrade from shop", effect: "freeUpgrade" }
    ],
    trap: [
      { title: "Disarm Carefully", desc: "Risk time: success = 0 dmg, failure = 50% dmg", effect: "disarm" },
      { title: "Power Through", desc: "Full damage but maintain momentum", effect: "tank" },
      { title: "Study the Pattern", desc: "Learn trap. +30% trap avoidance for next 3 tiles", effect: "learn", turns: 3, amount: 0.30 }
    ],
    serverNode: [
      { title: "Inject Logic Bomb", desc: "Destroy node. Sector safer but attracts elite patrols", effect: "destroy" },
      { title: "Decrypt Data", desc: "Gain intel credits but risk detection", effect: "decrypt", creditBonus: 50 },
      { title: "Reprogram Node", desc: "Turn node against Aegis. Temporary safe passage", effect: "reprogram", turns: 5 }
    ],
    combat: [
      { title: "Fight", desc: "Engage the enemy with everything you have", effect: "fight" },
      { title: "Ambush Strike", desc: "Surprise attack. +50% first strike damage", effect: "ambush", bonusDmg: 0.50 },
      { title: "Feint & Retreat", desc: "Strike once then withdraw. Take 30% reduced damage", effect: "feint", reducedDmg: 0.30 }
    ],
    start: [
      { title: "Review Mission Briefing", desc: "Access Free Signal bulletins for mission intel", effect: "lore" },
      { title: "Check Gear", desc: "Inspect weapons and neural implants for upgrades", effect: "checkGear" },
      { title: "Meditate", desc: "Quiet your mind. +10% crit chance for next combat", effect: "focus", turns: 1, amount: 0.10 }
    ]
  }
};

// ─── CHARACTER SPECS ──────────────────────────────────────────────────────────

export const CLASSES = {
  gunner: {
    name: "Cyber-Gunner",
    classKey: "gunner",
    hpMax: 90,
    power: 12,
    speed: 16,
    evade: 8,
    description: "Long-range specialist with twin railguns. Fast attack cycles and high burst potential.",
    color: "#00f3ff",
    unlockLevel: 1,
    unlockCost: 0,
    abilities: [
      { id: "double_tap", name: "Double Tap", desc: "Two rapid strikes for 15-22 total damage", type: "attack", minPower: 12, maxPower: 22, cooldown: 0, maxCooldown: 0, cost: 0 },
      { id: "targeting_matrix", name: "Targeting Matrix", desc: "Lock-on shot for 22-30 damage. Ignores 30% enemy defense.", type: "attack", minPower: 22, maxPower: 30, cooldown: 2, maxCooldown: 3, cost: 0 },
      { id: "cover_fire", name: "Cover Fire", desc: "Suppressive barrage. Deals 8-12 damage and forces enemy to skip next turn.", type: "attack", minPower: 8, maxPower: 12, cooldown: 3, maxCooldown: 4, cost: 0 },
      { id: "tactical_scan", name: "Tactical Scan", desc: "Reveals weak points. Next attack deals +50% critical chance for 2 turns.", type: "buff", effect: "crit_up", duration: 2, cooldown: 4, maxCooldown: 5, cost: 0 },
      { id: "overcharge_rail", name: "Overcharge Rail", desc: "Overcharge your railgun. Deals 30-40 damage but costs 15 HP.", type: "attack", minPower: 30, maxPower: 40, cooldown: 0, maxCooldown: 5, cost: 15 }
    ]
  },
  muscleman: {
    name: "Aegis Juggernaut",
    classKey: "muscleman",
    hpMax: 160,
    power: 16,
    speed: 8,
    evade: 3,
    description: "Heavily armored frontline tank. Crushing strikes and massive damage absorption.",
    color: "#ffaa00",
    unlockLevel: 1,
    unlockCost: 0,
    abilities: [
      { id: "shield_bash", name: "Shield Bash", desc: "Heavy melee strike for 14-22 damage. Also staggers enemy (reduces their next damage by 50%).", type: "attack", minPower: 14, maxPower: 22, cooldown: 0, maxCooldown: 0, cost: 0 },
      { id: "overclock_gauntlets", name: "Overclock Gauntlets", desc: "Charge your gauntlets for a devastating 24-34 strike.", type: "attack", minPower: 24, maxPower: 34, cooldown: 2, maxCooldown: 3, cost: 0 },
      { id: "carbon_armor", name: "Carbon Armor", desc: "Deploy hardening field. Reduces incoming damage by 40% for 3 turns.", type: "buff", effect: "defense_up", duration: 3, cooldown: 4, maxCooldown: 5, cost: 0 },
      { id: "iron_will", name: "Iron Will", desc: "Fortify your stance. Regain 12-18 HP and gain a shield that absorbs 15 damage.", type: "heal", healMin: 12, healMax: 18, shield: 15, cooldown: 4, maxCooldown: 5, cost: 0 },
      { id: "seismic_stomp", name: "Seismic Stomp", desc: "Ground-shattering slam for 28-38 damage. Also stuns enemy for 1 turn.", type: "attack", minPower: 28, maxPower: 38, cooldown: 0, maxCooldown: 5, cost: 0 }
    ]
  },
  operative: {
    name: "Neon Streetrunner",
    classKey: "operative",
    hpMax: 85,
    power: 13,
    speed: 15,
    evade: 22,
    description: "Master of stealth and agility. Evades attacks, strikes from shadows with lethal precision.",
    color: "#39ff14",
    unlockLevel: 2,
    unlockCost: 150,
    abilities: [
      { id: "phase_strike", name: "Phase Strike", desc: "Teleport behind enemy and strike for 14-20 damage. Guaranteed critical hit.", type: "attack", minPower: 14, maxPower: 22, cooldown: 0, maxCooldown: 0, cost: 0 },
      { id: "smoke_screen", name: "Smoke Screen", desc: "Deploy smoke. Dodge all attacks for 2 turns. Next attack after smoke deals +50% damage.", type: "buff", effect: "stealth_up", duration: 2, cooldown: 3, maxCooldown: 4, cost: 0 },
      { id: "venom_blade", name: "Venom Blade", desc: "Poisoned strike. Deals 10-15 damage and applies venom (5 dmg/turn for 3 turns).", type: "attack", minPower: 10, maxPower: 15, cooldown: 1, maxCooldown: 3, cost: 0, dot: { amount: 5, duration: 3 }},
      { id: "shadow_step", name: "Shadow Step", desc: "Vanish and reappear. Regain 8-14 HP and gain evasion (70% dodge chance) for 2 turns.", type: "heal", healMin: 8, healMax: 14, cooldown: 3, maxCooldown: 4, effect: "dodge_up", effectDuration: 2, cost: 0 },
      { id: "assassinate", name: "Assassinate", desc: "Ultimate strike. Deals 35-45 damage. If enemy is below 30% HP, this always kills.", type: "attack", minPower: 35, maxPower: 45, cooldown: 0, maxCooldown: 6, cost: 0 }
    ]
  },
  duelist: {
    name: "Alloy Sword-Master",
    classKey: "duelist",
    hpMax: 105,
    power: 18,
    speed: 14,
    evade: 10,
    description: "Elite blade combatant. High critical damage, perfect deflection, and relentless offense.",
    color: "#ff0055",
    unlockLevel: 4,
    unlockCost: 600,
    abilities: [
      { id: "plasma_slash", name: "Plasma Slash", desc: "Swift energy blade strike for 16-24 damage. 20% base crit chance.", type: "attack", minPower: 16, maxPower: 24, cooldown: 0, maxCooldown: 0, cost: 0 },
      { id: "deflect_protocol", name: "Deflect Protocol", desc: "Parry incoming attacks. Reduces damage taken by 70% for 2 turns. Counter-attack for 8-12 if struck.", type: "buff", effect: "deflect", duration: 2, cooldown: 3, maxCooldown: 4, cost: 0, counterMin: 8, counterMax: 12 },
      { id: "blade_dance", name: "Blade Dance", desc: "Rapid combo of 3 strikes. Each hits for 8-13 damage (total 24-39).", type: "attack", minPower: 8, maxPower: 13, strikes: 3, cooldown: 2, maxCooldown: 3, cost: 0 },
      { id: "zerotoone", name: "Zero to One", desc: "Full commitment strike. Deals 28-36 damage. If you take no damage this turn, bonus +10 damage.", type: "attack", minPower: 28, maxPower: 36, cooldown: 2, maxCooldown: 3, cost: 0 },
      { id: "final_form", name: "Final Form: Shattered Mirror", desc: "Legendary technique. 4 strikes for 10-18 each (40-72 total). Costs 20 HP to wield.", type: "attack", minPower: 10, maxPower: 18, strikes: 4, cooldown: 0, maxCooldown: 6, cost: 20 }
    ]
  },
  hacker: {
    name: "Netrunner Archon",
    classKey: "hacker",
    hpMax: 70,
    power: 14,
    speed: 11,
    evade: 6,
    description: "Holographic terminal spellcaster. Debuffs, direct damage, and system overrides.",
    color: "#b026ff",
    unlockLevel: 3,
    unlockCost: 300,
    abilities: [
      { id: "system_override", name: "System Override", desc: "Hijack enemy systems. Deals 12-18 damage and reduces enemy power by 3 for 3 turns.", type: "attack", minPower: 12, maxPower: 18, cooldown: 1, maxCooldown: 2, cost: 0, debuff: { stat: "power", amount: 3, duration: 3 }},
      { id: "emp_discharge", name: "EMP Discharge", desc: "Electromagnetic pulse. Deals 16-24 damage to all enemies and stuns for 1 turn.", type: "attack", minPower: 16, maxPower: 24, cooldown: 2, maxCooldown: 3, stun: 1, cost: 0 },
      { id: "firewall_breach", name: "Firewall Breach", desc: "Break through defenses. Ignores 50% of enemy defense. Deals 10-20 damage. 40% crit chance.", type: "attack", minPower: 10, maxPower: 20, cooldown: 1, maxCooldown: 2, cost: 0, ignoreDefense: 0.5, critBonus: 0.40 },
      { id: "data_siphon", name: "Data Siphon", desc: "Drain enemy energy. Heal 12-20 HP and steal 8-14 credits.", type: "heal", healMin: 12, healMax: 20, cooldown: 3, maxCooldown: 4, creditSteal: 14, cost: 0 },
      { id: "ghost_protocol", name: "Ghost Protocol", desc: "Become invisible. Dodge all attacks for 3 turns. Next attack deals double damage.", type: "buff", effect: "stealth_up", duration: 3, cooldown: 4, maxCooldown: 6, cost: 0 }
    ]
  }
};

// ─── ENEMIES (with tier scaling) ─────────────────────────────────────────────

export const ENEMIES = {};

export function getEnemyForSector(sector, difficulty) {
  const tiers = {
    1: [
      { key: "drone",    name: "Aegis Quad-Drone",    hp: 45,  power: 7,  speed: 13, type: "drone",     xpReward: 50,  creditReward: 25 },
      { key: "camera",   name: "Fixed Laser Camera",  hp: 35,  power: 9,  speed: 8,  type: "camera",    xpReward: 40,  creditReward: 20 },
      { key: "sentry",   name: "Aegis Sentry Bot",    hp: 55,  power: 8,  speed: 6,  type: "sentry",    xpReward: 55,  creditReward: 30 }
    ],
    2: [
      { key: "dog",      name: "Apex K9 Sentry",      hp: 80,  power: 13, speed: 16, type: "dog",       xpReward: 70,  creditReward: 40 },
      { key: "drone",    name: "Aegis Quad-Drone Mk.II", hp: 60, power: 10, speed: 15, type: "drone",   xpReward: 65,  creditReward: 35 },
      { key: "sentry",   name: "Heavy Sentry Tank",   hp: 100, power: 11, speed: 5,  type: "sentry",    xpReward: 75,  creditReward: 45 }
    ],
    3: [
      { key: "dog",      name: "Apex K9 Sentry (Elite)",  hp: 120, power: 17, speed: 18, type: "dog",     xpReward: 100, creditReward: 60 },
      { key: "warden",   name: "Warden Avatar",           hp: 150, power: 20, speed: 10, type: "warden",    xpReward: 150, creditReward: 100 },
      { key: "sentry",   name: "Titan Security Frame",    hp: 140, power: 18, speed: 7,  type: "sentry",  xpReward: 120, creditReward: 80 }
    ]
  };

  const pool = tiers[Math.min(sector, 3)] || tiers[3];
  const base = pool[Math.floor(Math.random() * pool.length)];

  // Scale with sector difficulty
  const scale = 1 + (difficulty - 1) * 0.15;
  return {
    ...base,
    hp: Math.floor(base.hp * scale),
    hpMax: Math.floor(base.hp * scale),
    power: Math.floor(base.power * scale),
    speed: Math.floor(base.speed * scale)
  };
}

// ─── UPGRADES ─────────────────────────────────────────────────────────────────

export const UPGRADES = [
  { id: "optics",       name: "Thermal Sensor Optics",       desc: "+15% Critical Strike Chance",                    effect: (p) => { p.critBonus = (p.critBonus || 0) + 0.15; }},
  { id: "plating",      name: "Carbon-Alloy Plating",         desc: "+35 Max HP",                                  effect: (p) => { p.hpMax += 35; p.hp += 35; }},
  { id: "booster",      name: "Adrenaline Injector",          desc: "+4 Speed",                                    effect: (p) => { p.speed += 4; }},
  { id: "nanites",      name: "Repair Nanites",               desc: "Regen 8 HP at end of each turn",              effect: (p) => { p.regenHP = (p.regenHP || 0) + 8; }},
  { id: "capacitor",    name: "EMP Capacitor",                desc: "Auto-attacks deal +5 shock damage",           effect: (p) => { p.shockBonus = (p.shockBonus || 0) + 5; }},
  { id: "evade_up",     name: "Evasive Firmware",             desc: "+8 Evade Chance",                             effect: (p) => { p.evade += 8; }},
  { id: "power_boost",  name: "Power Amplifier",              desc: "+6 Attack Power",                             effect: (p) => { p.power += 6; }},
  { id: "shield_gen",   name: "Personal Shield Generator",    desc: "Start combat with a 20-damage shield",        effect: (p) => { p.combatShield = (p.combatShield || 0) + 20; }},
  { id: "crit_gear",    name: "Crit Gear Tuning",             desc: "+25% critical damage multiplier (1.75x)",     effect: (p) => { p.critMult = (p.critMult || 1.5) + 0.25; }},
  { id: "stealth_mod",  name: "Stealth Surface Mod",          desc: "30% chance to avoid trap damage entirely",    effect: (p) => { p.trapAvoid = (p.trapAvoid || 0) + 0.30; }},
  { id: "hp_drink",     name: "Combat Stim Pack",             desc: "Immediately heal 30 HP",                      effect: (p) => { p.hp = Math.min(p.hpMax, p.hp + 30); }},
  { id: "credits_b",    name: "Credit Cache Injector",        desc: "Instant +50 credits",                         effect: (p) => { p.credits = (p.credits || 0) + 50; }}
];

// ─── PERMANENT UPGRADES ──────────────────────────────────────────────────────

export const PERMANENT_UPGRADES = [
  { id: "nano_armor",   name: "Nano-Alloy Armor",        desc: "+30 Max HP permanently",              cost: 150,  effect: (p) => { p.hpMax += 30; p.hp += 30; }},
  { id: "stim_boost",   name: "Stim Injectors",          desc: "+5 Speed permanently",                cost: 200,  effect: (p) => { p.speed += 5; }},
  { id: "weapon_tuning", name: "Weapon Tuning",          desc: "+8 Attack Power permanently",         cost: 250,  effect: (p) => { p.power += 8; }},
  { id: "neural_link",  name: "Neural Link Overdrive",   desc: "+10% Crit chance permanently",        cost: 300,  effect: (p) => { p.critBonus = (p.critBonus || 0) + 0.10; }},
  { id: "evade_chip",   name: "Evasion Matrix Chip",     desc: "+5% Evade permanently",               cost: 275,  effect: (p) => { p.evade += 5; }}
];
