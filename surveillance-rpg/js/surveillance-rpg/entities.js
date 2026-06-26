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
      { title: "Patch Upgrades", desc: "Choose 1 free upgrade from shop", effect: "freeUpgrade" },
      { title: "Scan for Stash", desc: "Hunt down a hidden supply cache. Credits or loot.", effect: "search", creditMin: 20, creditMax: 60, loot: true },
      { title: "Hack Terminal", desc: "Access resistance comms. Unlock lore and intel.", effect: "intel", turns: 2, amount: 0.10 }
    ],
    trap: [
      { title: "Disarm Carefully", desc: "Risk time: success = 0 dmg, failure = 50% dmg", effect: "disarm" },
      { title: "Power Through", desc: "Full damage but maintain momentum", effect: "tank" },
      { title: "Study the Pattern", desc: "Learn trap. +30% trap avoidance for next 3 tiles", effect: "learn", turns: 3, amount: 0.30 },
      { title: "Disable System", desc: "Hack the trap circuitry. Takes 1 turn. -20% damage if detected.", effect: "disable", damageReduction: 0.20, turns: 2 }
    ],
    serverNode: [
      { title: "Inject Logic Bomb", desc: "Destroy node. Sector safer but attracts elite patrols", effect: "destroy" },
      { title: "Decrypt Data", desc: "Gain intel credits but risk detection", effect: "decrypt", creditBonus: 50 },
      { title: "Reprogram Node", desc: "Turn node against Aegis. Temporary safe passage", effect: "reprogram", turns: 5 },
      { title: "Study Architecture", desc: "Analyze Warden's code. +15% XP for next 2 combats.", effect: "study", turns: 2, xpBonus: 0.15 },
      { title: "Sabotage Grid", desc: "Weaken Aegis defenses. +10% crit for next combat.", effect: "sabotage", turns: 1, critBonus: 0.10 }
    ],
    combat: [
      { title: "Fight", desc: "Engage the enemy with everything you have", effect: "fight" },
      { title: "Ambush Strike", desc: "Surprise attack. +50% first strike damage", effect: "ambush", bonusDmg: 0.50 },
      { title: "Feint & Retreat", desc: "Strike once then withdraw. Take 30% reduced damage", effect: "feint", reducedDmg: 0.30 },
      { title: "Analyze Weakness", desc: "Study enemy pattern. +20% evasion for next turn.", effect: "analyze", turns: 1, evasionBonus: 0.20 }
    ],
    start: [
      { title: "Review Mission Briefing", desc: "Access Free Signal bulletins for mission intel", effect: "lore" },
      { title: "Check Gear", desc: "Inspect weapons and neural implants for upgrades", effect: "checkGear" },
      { title: "Meditate", desc: "Quiet your mind. +10% crit chance for next combat", effect: "focus", turns: 1, amount: 0.10 },
      { title: "Scout Route", desc: "Preview the sector map. +10% trap avoidance for first 5 tiles.", effect: "scout", turns: 5, amount: 0.10 }
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
      { id: "overcharge_rail", name: "Overcharge Rail", desc: "Overcharge your railgun. Deals 30-40 damage but costs 15 HP.", type: "attack", minPower: 30, maxPower: 40, cooldown: 0, maxCooldown: 5, cost: 15 },
      { id: "smart_ammo", name: "Smart Ammo", desc: "Piercing round that reduces enemy DEF by 20% for 3 turns. Deals 16-24 damage. [Flavor: Micro-guided munitions that home in on armor weak points.]", type: "attack", minPower: 16, maxPower: 24, cooldown: 0, maxCooldown: 3, cost: 0, armorPierce: 0.20, armorPierceTurns: 3 },
      { id: "shield_penetrator", name: "Shield Penetrator", desc: "Concentrated beam that ignores 50% enemy DEF. Deals 20-30 damage. [Flavor: Aegis-grade focused energy beam designed to cut through shield plating.]", type: "attack", minPower: 20, maxPower: 30, cooldown: 2, maxCooldown: 3, cost: 0, ignoreDefense: 0.50 },
      { id: "barrage", name: "Barrage", desc: "Sweeps gunfire across all enemies for 6-10 damage each. 2-turn cooldown. [Flavor: The Gattling gun roars to life, shredding everything in its path.]", type: "attack", minPower: 6, maxPower: 10, cooldown: 2, maxCooldown: 3, cost: 0, multiTarget: true }
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
      { id: "seismic_stomp", name: "Seismic Stomp", desc: "Ground-shattering slam for 28-38 damage. Also stuns enemy for 1 turn.", type: "attack", minPower: 28, maxPower: 38, cooldown: 0, maxCooldown: 5, cost: 0 },
      { id: "power_slam", name: "Power Slam", desc: "Ground-slam AoE that deals 18-28 damage and stuns all enemies for 1 turn. [Flavor: The ground shakes as the Juggernaut slams fists into the earth, sending shockwaves through every enemy.]", type: "attack", minPower: 18, maxPower: 28, cooldown: 3, maxCooldown: 4, cost: 0, multiTarget: true, stun: 1 },
      { id: "war_cry", name: "War Cry", desc: "Fearsome shout that buffs party ATK by 25% for 3 turns. [Flavor: A primal roar that echoes through the Grid — allies feel their strength surge as the Warden's machines hesitate.]", type: "buff", effect: "war_cry", duration: 3, cooldown: 4, maxCooldown: 5, cost: 0 },
      { id: "shield_wall", name: "Shield Wall", desc: "Raises a barrier that blocks the next incoming attack (up to 30 damage) and gains Shield buff. 2-turn cooldown. [Flavor: Reinforced plating extends from the shoulders, forming an impenetrable wall of carbon-alloy.]", type: "buff", effect: "shield_wall", duration: 1, cooldown: 2, maxCooldown: 3, cost: 0, shield: 30 }
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
      { id: "assassinate", name: "Assassinate", desc: "Ultimate strike. Deals 35-45 damage. If enemy is below 30% HP, this always kills.", type: "attack", minPower: 35, maxPower: 45, cooldown: 0, maxCooldown: 6, cost: 0 },
      { id: "chain_assassin", name: "Chain Assassin", desc: "Strike two targets. Primary hit for 12-18 damage, secondary hit for 50% (6-9 damage). [Flavor: A blade-throw that arcs between enemies — the operative's trained eye tracks the weapon's path through the darkness.]", type: "attack", minPower: 12, maxPower: 18, cooldown: 2, maxCooldown: 3, cost: 0, multiTarget: true, doubleHit: 0.50 },
      { id: "cloak", name: "Cloak", desc: "Become immune to targeting for 1 turn. Next attack guaranteed crit. [Flavor: Nanite cloak wraps around the operative, bending light and defeating all sensor arrays.]", type: "buff", effect: "cloak", duration: 1, cooldown: 3, maxCooldown: 4, cost: 0 },
      { id: "lethal_precision", name: "Lethal Precision", desc: "Guaranteed critical strike that ignores all enemy DEF. Deals 24-34 damage. [Flavor: One shot. One kill. The operative doesn't miss — because they never fire a shot they might miss.]", type: "attack", minPower: 24, maxPower: 34, cooldown: 3, maxCooldown: 4, cost: 0, ignoreDefense: 1.0, critOnly: true }
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
      { id: "final_form", name: "Final Form: Shattered Mirror", desc: "Legendary technique. 4 strikes for 10-18 each (40-72 total). Costs 20 HP to wield.", type: "attack", minPower: 10, maxPower: 18, strikes: 4, cooldown: 0, maxCooldown: 6, cost: 20 },
      { id: "flow_state", name: "Flow State", desc: "Enter combat trance. ATK +50% for 2 turns, DEF -20%. [Flavor: Time slows. The duelist's blade moves faster than thought — a dance of light and steel that only the initiated can see.]", type: "buff", effect: "flow_state", duration: 2, cooldown: 4, maxCooldown: 5, cost: 0 },
      { id: "iron_stance", name: "Iron Stance", desc: "Plant feet and brace. Block the next 2 attacks (up to 15 each) and counter-attack each for 50% damage. 3-turn cooldown. [Flavor: The duelist assumes the Iron Stance — immovable, unyielding. An ancient form perfected over centuries of blade-dueling.]", type: "buff", effect: "iron_stance", duration: 2, cooldown: 3, maxCooldown: 4, cost: 0, counterMin: 8, counterMax: 15 },
      { id: "blade_storm", name: "Blade Storm", desc: "A spinning whirlwind of energy blade that hits all enemies for 10-16 slashing damage. 2-turn cooldown. [Flavor: The plasma blade becomes a halo of death — the duelist spins, and every direction is a killing zone.]", type: "attack", minPower: 10, maxPower: 16, cooldown: 2, maxCooldown: 3, cost: 0, multiTarget: true }
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
      { id: "ghost_protocol", name: "Ghost Protocol", desc: "Become invisible. Dodge all attacks for 3 turns. Next attack deals double damage.", type: "buff", effect: "stealth_up", duration: 3, cooldown: 4, maxCooldown: 6, cost: 0 },
      { id: "memory_wipe", name: "Memory Wipe", desc: "Erases all enemy buffs and debuffs, then deals 14-22 damage. [Flavor: A targeted neural dump that overwrites the enemy's combat protocols — their own systems turn against them.]", type: "attack", minPower: 14, maxPower: 22, cooldown: 3, maxCooldown: 4, cost: 0, stripBuffs: true },
      { id: "code_injection", name: "Code Injection", desc: "Injects malicious code dealing 8 damage over 3 turns (DoT). Also deals 10-16 immediate damage. [Flavor: Digital malware injected directly into the enemy's core — the corruption festers, eating from the inside.]", type: "attack", minPower: 10, maxPower: 16, cooldown: 2, maxCooldown: 3, cost: 0, dot: { amount: 8, duration: 3 }},
      { id: "ai_disruption", name: "AI Disruption", desc: "Stuns enemy for 1 turn and removes 1 buff from them. Deals 12-18 damage. [Flavor: A cascade failure in the enemy's AI — logic loops eat their processing, leaving them frozen and vulnerable.]", type: "attack", minPower: 12, maxPower: 18, cooldown: 3, maxCooldown: 4, cost: 0, stun: 1, stripBuffs: true }
    ]
  }
};

// ─── WARDEN BOSS DEFINITION ──────────────────────────────────────────────────
/**
 * Sector 3 Final Boss: THE WARDEN
 * 3-phase fight with escalating abilities. Uses the same combat system
 * (abilities, defense, evasion, HP bars) as regular enemies.
 * Boss has unique abilities tracked via isBoss flag and phase system.
 *
 * HP: 3000 | Power: 45 | Defense: 30 | Evasion: 8 | Speed: 20
 * XP Reward: 600 | Credit Reward: 2000
 * Unique abilities (sector lockdown, data purge, surveillance nexus) not
 * available to any regular enemy.
 */
export const WARDEN_BOSS = {
  key: 'warden_boss',
  name: 'The Warden',
  nameForLowLevel: 'Warden Avatar',
  level: 'boss',
  hpMax: 3000,
  hp: 3000,
  power: 45,
  defense: 30,
  evasion: 8,
  speed: 20,
  xpReward: 600,
  creditReward: 2000,
  type: 'warden',
  isBoss: true,
  // Phase HP thresholds (percentages of hpMax)
  phases: {
    phase1: { minPct: 61,  maxPct: 100, label: 'SURVEILLANCE MODE' },  // HP > 60%
    phase2: { minPct: 31,  maxPct: 60,  label: 'AGGRESSIVE MODE' },   // HP 30-60%
    phase3: { minPct: 0,   maxPct: 30,  label: 'DESPERATE MODE' }     // HP < 30%
  },
  // Unique boss traits not available to regular enemies
  bossTraits: {
    phaseTransitionEffect: true,
    finalBlowChoice: true,
    achievementFlag: 'warden_slain',
    uniqueAbilities: ['sector_lockdown', 'data_purge', 'surveillance_nexus', 'omniscience', 'grid_reboot'],
    noMercyPhase3: true,
    autoPhaseSync: true
  },
  // Narrative flavor text per phase
  phaseText: {
    enter: [
      'THE WARDEN AWAKENS — surveillance systems come online.',
      'THE WARDEN shifts to aggressive protocols — weapons locked.',
      'THE WARDEN\'s core destabilizes — desperation overrides all safeguards.'
    ],
    phase2: [
      ' ⚡ THE WARDEN\'s surveillance protocols are replaced by direct assault systems.',
      ' ⚡ THE WARDEN deploys its Titan security frame — aggression mode engaged.',
      ' ⚡ THE WARDEN\'s neural dampeners activate — no more warnings.'
    ],
    phase3: [
      ' 💀 THE WARDEN\'s core destabilizes — it will not survive this.',
      ' 💀 THE WARDEN initiates self-destruct — everything or nothing.',
      ' 💀 THE WARDEN overrides all safety protocols — total system lock.'
    ]
  }
};

/**
 * WARDEN Boss ability tables by phase.
 * Each phase defines a pool of abilities with period-based activation.
 * The boss cycles through them: an ability fires every N turns (its period).
 * Multi-ability combos occur when periods align (e.g., period 2 and period 3
 * both fire on turn 6).
 *
 * Phase 1 (HP > 60%) — Surveillance:
 *   Drone Swarm      : every 2 turns  — 25-40 dmg  (🤖)
 *   Neural Dampen    : every 3 turns  — steal 15 credits OR 20 dmg  (🧠)
 *   Patrol Call      : every 5 turns  — +8 power for 3 turns  (📡)
 *   Surveillance Nexus: every 4 turns — unique boss-only, 15-25 dmg and debuff player evade -10  (👁️)
 *
 * Phase 2 (HP 30-60%) — Aggressive:
 *   Titan Deployment : every 3 turns  — 35-55 dmg + stun 1 turn  (🛡️)
 *   EMP Burst        : every 2 turns  — 20-35 dmg + player skip next turn  (⚡)
 *   Data Purge       : every 4 turns  — unique boss-only, 25-40 dmg + destroy player buff  (🗑️)
 *   Area Scan        : every 5 turns  — +12 power for 2 turns  (📡)
 *
 * Phase 3 (HP < 30%) — Desperate:
 *   Area Denial      : every turn     — 3-hit strike for 30-45 each  (💥)
 *   Power Spike      : every 3 turns  — +15 power for 3 turns  (🔥)
 *   Sector Lockdown  : every 4 turns  — unique boss-only, 40-60 dmg + stun 2 turns  (🔒)
 *   Omniscience      : every 5 turns  — unique boss-only, next 2 attacks guaranteed crit  (👁️‍🗨️)
 *   Grid Reboot      : every 6 turns  — unique boss-only, heals 300 HP  (♻️)
 */
export const WARDEN_ABILITIES = {
  1: [
    {
      id: 'drone_swarm',
      name: 'Drone Swarm',
      damageMin: 25,
      damageMax: 40,
      period: 2,
      emoji: '🤖',
      desc: 'A swarm of Aegis micro-drones descends, each laced with nano-shrapnel.'
    },
    {
      id: 'neural_dampen',
      name: 'Neural Dampen',
      damageMin: 15,
      damageMax: 20,
      period: 3,
      emoji: '🧠',
      creditSteal: 15,
      desc: 'A neural pulse hits your implant — credits stolen or neural feedback dealt.'
    },
    {
      id: 'patrol_call',
      name: 'Patrol Call',
      buffPower: 8,
      buffDuration: 3,
      period: 5,
      emoji: '📡',
      desc: 'THE WARDEN summons nearby patrol units, boosting its combat power.'
    },
    {
      id: 'surveillance_nexus',
      name: 'Surveillance Nexus',
      damageMin: 15,
      damageMax: 25,
      period: 4,
      emoji: '👁️',
      debuffEvade: 10,
      debuffDuration: 2,
      desc: 'THE WARDEN taps into every camera and sensor in the sector, focusing all its eyes on you.',
      isBossOnly: true,
      category: 'surveillance'
    }
  ],
  2: [
    {
      id: 'titan_deployment',
      name: 'Titan Deployment',
      damageMin: 35,
      damageMax: 55,
      period: 3,
      emoji: '🛡️',
      stun: 1,
      desc: 'A Titan Security Frame crashes through the walls — twelve feet of carbon-alloy rage.'
    },
    {
      id: 'emp_burst',
      name: 'EMP Burst',
      damageMin: 20,
      damageMax: 35,
      period: 2,
      emoji: '⚡',
      skipTurn: 1,
      desc: 'An electromagnetic pulse wrecks your gear and stuns your systems.'
    },
    {
      id: 'data_purge',
      name: 'Data Purge',
      damageMin: 25,
      damageMax: 40,
      period: 4,
      emoji: '🗑️',
      destroyBuff: true,
      desc: 'THE WARDEN purges your system modifications — buffs are stripped.',
      isBossOnly: true,
      category: 'offense'
    },
    {
      id: 'area_scan',
      name: 'Area Scan',
      buffPower: 12,
      buffDuration: 2,
      period: 5,
      emoji: '📡',
      desc: 'THE WARDEN maps the entire sector — its attack power surges with intel.'
    }
  ],
  3: [
    {
      id: 'area_denial',
      name: 'Area Denial',
      damageMin: 30,
      damageMax: 45,
      period: 1,
      emoji: '💥',
      multiHit: 3,
      desc: 'THE WARDEN detonates every explosive charge in the sector — a barrage of fire.'
    },
    {
      id: 'power_spike',
      name: 'Power Spike',
      buffPower: 15,
      buffDuration: 3,
      period: 3,
      emoji: '🔥',
      desc: 'THE WARDEN channels raw power through its core — devastating strikes ahead.'
    },
    {
      id: 'sector_lockdown',
      name: 'Sector Lockdown',
      damageMin: 40,
      damageMax: 60,
      period: 4,
      emoji: '🔒',
      stun: 2,
      desc: 'Every exit seals — THE WARDEN locks the sector and delivers a crushing blow.',
      isBossOnly: true,
      category: 'offense'
    },
    {
      id: 'omniscience',
      name: 'Omniscience',
      buffNextAttacks: 2,
      guaranteedCrit: true,
      period: 5,
      emoji: '👁️‍🗨️',
      desc: 'THE WARDEN sees every possible future — the next 2 attacks will not miss.',
      isBossOnly: true,
      category: 'surveillance'
    },
    {
      id: 'grid_reboot',
      name: 'Grid Reboot',
      healAmount: 300,
      period: 6,
      emoji: '♻️',
      desc: 'THE WARDEN initiates a full system reboot — its damaged systems begin healing.',
      isBossOnly: true,
      category: 'defense'
    }
  ]
};

/**
 * Boss-only ability IDs — these appear exclusively in the WARDEN boss
 * and are never granted to regular enemies, player classes, or minions.
 */
export const WARDEN_BOSS_ONLY_ABILITIES = [
  'surveillance_nexus',  // Phase 1 — debuffs player evade
  'data_purge',          // Phase 2 — strips player buffs
  'sector_lockdown',     // Phase 3 — high damage + long stun
  'omniscience',         // Phase 3 — guaranteed crit on next attacks
  'grid_reboot'          // Phase 3 — heals 300 HP
];

/**
 * Get the active boss ability table for the given phase.
 * @param {number} phase - Boss phase (1, 2, or 3)
 * @returns {Array} Array of ability definitions for the given phase
 */
export function getWardenAbilitiesByPhase(phase) {
  return WARDEN_ABILITIES[phase] || WARDEN_ABILITIES[1];
}

/**
 * Select an ability for the WARDEN based on current phase and turn.
 * Uses turn-based cycling: ability triggers every N turns (its period).
 * Returns an array of triggered abilities so the boss can combo multiple.
 * @param {Object} wardenState - { wardenPhase, wardenTurn }
 * @returns {Array} Array of triggered ability definitions
 */
export function getWardenAbility(wardenState) {
  const abilities = WARDEN_ABILITIES[wardenState.wardenPhase] || WARDEN_ABILITIES[1];
  const turn = wardenState.wardenTurn;
  const triggered = abilities.filter(ab => (turn % ab.period) === 0);
  return triggered;
}

/**
 * WARDEN Avatar — miniboss encountered in Sector 3 before the final fight.
 * Weaker version with reduced stats. Serves as a tutorial for boss mechanics.
 */
export const WARDEN_AVATAR = {
  key: 'warden_avatar',
  name: 'WARDEN AVATAR',
  hpMax: 150,
  hp: 150,
  power: 20,
  defense: 4,
  evasion: 5,
  speed: 14,
  xpReward: 150,
  creditReward: 100,
  type: 'warden',
  isBoss: false,
  avatarAbilities: {
    droneSwarm:      { damageMin: 6,  damageMax: 10, period: 3 },
    neuralDampen:    { damageMin: 5,  damageMax: 8,  period: 5, creditSteal: 3 },
    wardenCounter:   true
  }
};

// ─── ENEMIES (with tier scaling) ─────────────────────────────────────────────

export const ENEMIES = {};

/**
 * Return the appropriate enemy for a given sector and tile context.
 * The final tile of Sector 3 always spawns THE WARDEN boss.
 * All other tiles use the standard enemy pool.
 */
export function getEnemyForSector(sector, difficulty, isFinalTile = false) {
  // Sector 3 final tile: THE WARDEN boss
  if (sector === 3 && isFinalTile) {
    return { ...WARDEN_BOSS };
  }

  const tiers = {
    1: [
      { key: "drone",     name: "Aegis Quad-Drone",        hp: 45,  power: 7,  speed: 13, type: "drone",     xpReward: 50,  creditReward: 25,     flavor: "Standard patrol drone with laser targeting. The red lens locks on with mechanical indifference." },
      { key: "camera",    name: "Fixed Laser Camera",      hp: 35,  power: 9,  speed: 8,  type: "camera",    xpReward: 40,  creditReward: 20,     flavor: "Mounted security camera turned hostile. Lasers trace predictable arcs across the corridor." },
      { key: "sentry",    name: "Aegis Sentry Bot",        hp: 55,  power: 8,  speed: 6,  type: "sentry",    xpReward: 55,  creditReward: 30,     flavor: "Stationary combat bot with mounted railgun. Its treads grind as it reorients." },
      { key: "drone_swarm", name: "Aegis Drone Swarm",     hp: 60,  power: 6,  speed: 20, type: "drone",     xpReward: 65,  creditReward: 35,     flavor: "A cluster of micro-drones buzzing like metallic insects. Individually weak, together they shred." },
      { key: "enforcer",  name: "Neural Enforcer",         hp: 85,  power: 10, speed: 9,  type: "enforcer",  xpReward: 75,  creditReward: 40,     flavor: "A hulking enforcer frame with neural dampener claws. It moves with deliberate menace." },
      { key: "jammer",    name: "Signal Jammer Bot",       hp: 40,  power: 8,  speed: 12, type: "jammer",    xpReward: 60,  creditReward: 30,     flavor: "A floating jammer unit that disrupts all electronic systems. Its signal field makes targets sluggish." }
    ],
    2: [
      { key: "dog",       name: "Apex K9 Sentry",          hp: 80,  power: 13, speed: 16, type: "dog",       xpReward: 70,  creditReward: 40,     flavor: "Bio-engineered K9 with optical targeting. Its sensors read your neural signature." },
      { key: "drone",     name: "Aegis Quad-Drone Mk.II",  hp: 60,  power: 10, speed: 15, type: "drone",     xpReward: 65,  creditReward: 35,     flavor: "Upgraded quad-drone with enhanced targeting. The Mk.II version doesn't miss." },
      { key: "sentry",    name: "Heavy Sentry Tank",       hp: 100, power: 11, speed: 5,  type: "sentry",    xpReward: 75,  creditReward: 45,     flavor: "A heavily armored sentry with a rotary cannon. Slow but devastating when it fires." },
      { key: "shadow_runner", name: "Shadow Runner",       hp: 75,  power: 14, speed: 22, type: "rogue",     xpReward: 85,  creditReward: 50,     flavor: "A rogue human operative — a defector from Aegis security. Moves with inhuman agility." },
      { key: "combat_mech", name: "Aegis Combat Mech",     hp: 150, power: 15, speed: 7,  type: "mech",      xpReward: 100, creditReward: 65,     flavor: "A towering combat mech with reinforced armor and devastating AoE attacks." },
      { key: "data_wraith", name: "Data Wraith",           hp: 65,  power: 12, speed: 18, type: "wraith",    xpReward: 90,  creditReward: 55,     flavor: "A semi-corporeal data entity — a ghost in the machine that deals corruption damage." }
    ],
    3: [
      { key: "dog",       name: "Apex K9 Sentry (Elite)",  hp: 120, power: 17, speed: 18, type: "dog",       xpReward: 100, creditReward: 60,     flavor: "An elite K9 with Warden-class sensors. It tracks through walls." },
      { key: "warden",    name: "Warden Avatar",           hp: 150, power: 20, speed: 10, type: "warden",    xpReward: 150, creditReward: 100,    flavor: "A fragment of the Warden consciousness given physical form." },
      { key: "sentry",    name: "Titan Security Frame",    hp: 140, power: 18, speed: 7,  type: "sentry",  xpReward: 120, creditReward: 80,     flavor: "The Warden's ultimate weapon — twelve feet of carbon-alloy fury." },
      { key: "warden_drone", name: "Warden Drone (Elite)",  hp: 110, power: 16, speed: 17, type: "drone",    xpReward: 110, creditReward: 70,     flavor: "A Warden-class drone with phased weaponry. Its attacks cycle through spectral forms." },
      { key: "aegis_sentinel", name: "Aegis Sentinel",     hp: 200, power: 14, speed: 6,  type: "sentinel",  xpReward: 120, creditReward: 80,     flavor: "A massive shield-bearing guardian. Its aura protects nearby enemies from direct damage." },
      { key: "quantum_guard", name: "Quantum Guard",       hp: 130, power: 15, speed: 20, type: "quantum", xpReward: 130, creditReward: 90,     flavor: "A temporal guardian that phases between dimensions. Attacks sometimes arrive from the future." }
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
// Includes base upgrades + sector-specific bonuses + cross-class synergy

export const UPGRADES = [
  // Base upgrades
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
  { id: "credits_b",    name: "Credit Cache Injector",        desc: "Instant +50 credits",                         effect: (p) => { p.credits = (p.credits || 0) + 50; }},
  // Sector 1: Drowned Sector — infiltration & stealth
  { id: "sonar_hack",   name: "Sonar Infiltration Kit",       desc: "S1: +20% trap avoidance, detect traps early", effect: (p) => { p.trapAvoid = (p.trapAvoid || 0) + 0.20; p.trapDetect = true; }},
  { id: "underwater_gear",name: "Deep-Sea Exosuit",          desc: "S1: +40 HP, immune to flood damage",          effect: (p) => { p.hpMax += 40; p.hp += 40; p.floodImmune = true; }},
  { id: "ghost_signal", name: "Ghost Signal Jammer",        desc: "S1: 15% chance to avoid patrols",             effect: (p) => { p.patrolAvoid = (p.patrolAvoid || 0) + 0.15; }},
  // Sector 2: Neon Megablock — urban combat
  { id: "rooftop_dash", name: "Rooftop Dash Protocol",       desc: "S2: +10 Speed, bonus vs human enemies",       effect: (p) => { p.speed += 10; p.humanBonus = (p.humanBonus || 0) + 0.20; }},
  { id: "neon_camouflage",name: "Neon Camo Suit",           desc: "S2: 20% dodge from ranged attacks",           effect: (p) => { p.rangedDodge = (p.rangedDodge || 0) + 0.20; }},
  { id: "megablock_hack",name: "Megablock Terminal",         desc: "S2: +25% credit from nodes",                  effect: (p) => { p.nodeCreditBonus = (p.nodeCreditBonus || 0) + 0.25; }},
  // Sector 3: Warden Core — deep infiltration
  { id: "warden_bypass",name: "Warden Bypass Module",        desc: "S3: +30% evasion vs Warden-type",             effect: (p) => { p.wardenEvasion = (p.wardenEvasion || 0) + 0.30; }},
  { id: "core_shield",  name: "Core Shield Amplifier",       desc: "S3: +50 shield at combat start",              effect: (p) => { p.combatShield = (p.combatShield || 0) + 50; }},
  { id: "quantum_punch",name: "Quantum Strike Mod",         desc: "S3: 10% chance for double damage",            effect: (p) => { p.doubleDmgChance = (p.doubleDmgChance || 0) + 0.10; }},
  // Cross-class synergy bonuses
  { id: "combo_fire",   name: "Fire & Anvil Combo",          desc: "Gunner+Muscle: +30% shield, +15% ATK",        effect: (p) => { p.combatShield = (p.combatShield || 0) + 30; p.power += 15; }},
  { id: "combo_ghost",  name: "Ghost Hack Combo",            desc: "Operative+Hacker: +40% evade, stun immunity", effect: (p) => { p.evade += 40; p.stunImmune = (p.stunImmune || 0) + 1.0; }},
  { id: "combo_blade",  name: "Shield Blade Combo",          desc: "Duelist+Juggernaut: +30% deflect, +20 HP",    effect: (p) => { p.deflectBonus = (p.deflectBonus || 0) + 0.30; p.hpMax += 20; }},
  { id: "combo_all",    name: "Alliance Protocol",           desc: "All classes: +20% all stats",                 effect: (p) => { p.power += 20; p.speed += 10; p.evade += 10; p.hpMax += 80; }},
  // Endgame prestige (available after first completion)
  { id: "prestige_tech",name: "Prestige Tech Drop",         desc: "Post-clear: +50 HP, +10 all stats",           effect: (p) => { p.hpMax += 50; p.hp += 50; p.power += 10; p.speed += 5; p.evade += 5; }},
  { id: "legend_loot",  name: "Legend's Cache",              desc: "10+ runs: +1000 credits, +25% XP",            effect: (p) => { p.credits += 1000; p.xpBonus = (p.xpBonus || 0) + 0.25; }}
];

// ─── PERMANENT UPGRADES ──────────────────────────────────────────────────────
// Includes base upgrades + cross-class synergy + sector-specific + endgame prestige

export const PERMANENT_UPGRADES = [
  // Base upgrades
  { id: "nano_armor",   name: "Nano-Alloy Armor",        desc: "+30 Max HP permanently",              cost: 150,  effect: (p) => { p.hpMax += 30; p.hp += 30; }},
  { id: "stim_boost",   name: "Stim Injectors",          desc: "+5 Speed permanently",                cost: 200,  effect: (p) => { p.speed += 5; }},
  { id: "weapon_tuning", name: "Weapon Tuning",          desc: "+8 Attack Power permanently",         cost: 250,  effect: (p) => { p.power += 8; }},
  { id: "neural_link",  name: "Neural Link Overdrive",   desc: "+10% Crit chance permanently",        cost: 300,  effect: (p) => { p.critBonus = (p.critBonus || 0) + 0.10; }},
  { id: "evade_chip",   name: "Evasion Matrix Chip",     desc: "+5% Evade permanently",               cost: 275,  effect: (p) => { p.evade += 5; }},
  // Sector 1: Drowned Sector — infiltration bonuses
  { id: "drowned_path",  name: "Drowned Sector Path",     desc: "+15% evasion in Sectors 1-2",           cost: 350,  effect: (p) => { p.evade += 15; }},
  { id: "flood_crawl",   name: "Flood Crawl Protocol",    desc: "Trap damage reduced by 25% permanently", cost: 400,  effect: (p) => { p.trapAvoid = (p.trapAvoid || 0) + 0.15; }},
  { id: "drowned_gear",  name: "Drowned Gear Cache",      desc: "+100 starting credits each run",       cost: 250,  effect: (p) => { p.startupCredits = (p.startupCredits || 0) + 100; }},
  // Sector 2: Neon Megablock — urban combat bonuses
  { id: "neon_stride",   name: "Neon Stride",             desc: "+10% dodge chance permanently",         cost: 450,  effect: (p) => { p.dodgeChance = (p.dodgeChance || 0) + 10; }},
  { id: "rooftop_ops",   name: "Rooftop Ops",             desc: "+20% first strike damage permanently",  cost: 500,  effect: (p) => { p.firstStrikeBonus = (p.firstStrikeBonus || 0) + 0.20; }},
  { id: "megablock_know",name: "Megablock Intel",         desc: "+15% XP gain permanently",              cost: 550,  effect: (p) => { p.xpBonus = (p.xpBonus || 0) + 0.15; }},
  // Sector 3: Warden Core — deep infiltration bonuses
  { id: "core_access",   name: "Core Access Key",         desc: "+20% crit damage permanently",          cost: 600,  effect: (p) => { p.critMult = (p.critMult || 1.5) + 0.20; }},
  { id: "warden_hack",   name: "Warden Exploit",          desc: "+10% damage vs Warden-type enemies",    cost: 700,  effect: (p) => { p.wardenBonus = (p.wardenBonus || 0) + 0.10; }},
  { id: "ghost_code",    name: "Ghost Code Fragment",     desc: "10% chance to survive lethal hit at 1 HP", cost: 650, effect: (p) => { p.ghostSurvive = (p.ghostSurvive || 0) + 0.10; }},
  // Cross-class synergy bonuses
  { id: "gunner_muscle", name: "Fire & Anvil",            desc: "Gunner+Muscle: +20% shield, +10% ATK", cost: 500,  effect: (p) => { p.combatShield += 20; p.power += 10; }},
  { id: "operative_hack",name: "Ghost Hack",              desc: "Operative+Hacker: +30% evade, -50% stun", cost: 550, effect: (p) => { p.evade += 30; p.stunResist = (p.stunResist || 0) + 0.50; }},
  { id: "duelist_muscle",name: "Shield Blade",            desc: "Duelist+Juggernaut: +25% deflect",      cost: 600,  effect: (p) => { p.deflectBonus = (p.deflectBonus || 0) + 0.25; }},
  { id: "triad_bonus",   name: "Trinity Protocol",        desc: "3+ classes used: +15% all stats",       cost: 800,  effect: (p) => { p.power += 10; p.speed += 5; p.evade += 5; p.hpMax += 50; }},
  // Endgame prestige upgrades
  { id: "warden_gift",   name: "Warden's Gift",           desc: "Sector 3 clear: +25% all stats",        cost: 1000, effect: (p) => { p.power += 25; p.speed += 15; p.evade += 15; p.hpMax += 100; }},
  { id: "grid_master",   name: "Grid Master",             desc: "All sectors cleared: 500 credits/run",  cost: 1200, effect: (p) => { p.gridMaster = (p.gridMaster || 0) + 500; }},
  { id: "ghost_legend",  name: "Ghost Legend",            desc: "10+ runs: +50 Max HP, +10 evasion",     cost: 800,  effect: (p) => { p.hpMax += 50; p.hp += 50; p.evade += 10; }},
  { id: "aegis_overlord",name: "Aegis Overlord",          desc: "Ultimate: +40 ATK, +30 evasion",        cost: 1500, effect: (p) => { p.power += 40; p.evade += 30; p.hpMax += 150; p.hp += 150; }},
  { id: "chronos_seed",  name: "Chronos Seed",            desc: "Time-bending: regenerate 15 HP/turn",   cost: 900,  effect: (p) => { p.regenHP = (p.regenHP || 0) + 15; }}
];
