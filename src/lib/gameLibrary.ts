const GITHUB_RAW = "https://raw.githubusercontent.com/earancibialgraficas/final-portfolio-replicator/main/public";

export interface GameEntry {
  id: string;
  name: string;
  console: "nes" | "snes";
  romUrl: string;
  coverUrl: string;
}

export const nesGames: GameEntry[] = [
  { id: "alien3", name: "Alien 3", console: "nes", romUrl: `${GITHUB_RAW}/roms/Alien_3_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/alien3.jpg` },
  { id: "asterix", name: "Asterix", console: "nes", romUrl: `${GITHUB_RAW}/roms/Asterix_(E).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/asterix.jpg` },
  { id: "contra", name: "Contra", console: "nes", romUrl: `${GITHUB_RAW}/roms/Contra_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/contra.jpg` },
  { id: "darkman", name: "Darkman", console: "nes", romUrl: `${GITHUB_RAW}/roms/Darkman_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/darkman.jpg` },
  { id: "godzilla", name: "Godzilla", console: "nes", romUrl: `${GITHUB_RAW}/roms/Godzilla_-_Monster_of_Monsters!_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/godzilla.jpg` },
  { id: "metalstorm", name: "Metal Storm", console: "nes", romUrl: `${GITHUB_RAW}/roms/Gravity_Armor_Metal_Storm_(Tr).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/metalstorm.jpg` },
  { id: "kof99", name: "King of Fighters 99", console: "nes", romUrl: `${GITHUB_RAW}/roms/King_of_Fighters_99.nes`, coverUrl: `${GITHUB_RAW}/roms/covers/kof99.jpg` },
  { id: "kirby", name: "Kirby's Adventure", console: "nes", romUrl: `${GITHUB_RAW}/roms/Kirby's_Adventure_(USA)_(Rev_1).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/kirby.jpg` },
  { id: "metalmech", name: "MetalMech", console: "nes", romUrl: `${GITHUB_RAW}/roms/MetalMech_-_Man_%26_Machine_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/metalmech.jpg` },
  { id: "metroid", name: "Metroid", console: "nes", romUrl: `${GITHUB_RAW}/roms/Metroid_(U).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/metroid.jpg` },
  { id: "sonic3d", name: "Sonic 3D Blast 5", console: "nes", romUrl: `${GITHUB_RAW}/roms/Sonic_3D_Blast_5_%5B!%5D.nes`, coverUrl: `${GITHUB_RAW}/roms/covers/sonic3d.jpg` },
  { id: "spiderman", name: "Spider-Man", console: "nes", romUrl: `${GITHUB_RAW}/roms/Spider-Man_-_Return_of_the_Sinister_Six_(USA).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/spiderman.jpg` },
  { id: "mario3", name: "Super Mario Bros. 3", console: "nes", romUrl: `${GITHUB_RAW}/roms/Super_Mario_Bros._3_(USA)_(Rev_1).nes`, coverUrl: `${GITHUB_RAW}/roms/covers/mario3.jpg` },
  { id: "mario2", name: "Super Mario Bros. 2", console: "nes", romUrl: `${GITHUB_RAW}/roms/Super_Mario_Bros_2_(E)_%5Bh1%5D.nes`, coverUrl: `${GITHUB_RAW}/roms/covers/mario2.jpg` },
];

export const snesGames: GameEntry[] = [
  { id: "chrono", name: "Chrono Trigger", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Chrono_Trigger_(USA).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/contra.jpg` },
  { id: "contra3", name: "Contra III", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Contra_III_(USA).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/contra.jpg` },
  { id: "dkc3", name: "Donkey Kong Country 3", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Donkey_Kong_Country_3_(EUR).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/kirby.jpg` },
  { id: "doom", name: "Doom", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Doom_(USA).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/alien3.jpg` },
  { id: "fzero", name: "F-Zero", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/F-Zero_(EUR).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/sonic3d.jpg` },
  { id: "ki", name: "Killer Instinct", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Killer_Instinct_(EUR).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/kof99.jpg` },
  { id: "kirbyss", name: "Kirby Super Star", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Kirby_Super_Star_(USA).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/kirby.jpg` },
  { id: "zelda", name: "Zelda: A Link to the Past", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Legend_of_Zelda%2C_The_-_A_Link_to_the_Past_(U)_%5B!%5D.smc`, coverUrl: `${GITHUB_RAW}/roms/covers/metroid.jpg` },
  { id: "mmx3", name: "Megaman X3", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Megaman_X3_(USA).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/spiderman.jpg` },
  { id: "sonic4", name: "Sonic the Hedgehog 4", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Sonic_the_Hedgehog_4_(World)_(Unl).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/sonic3d.jpg` },
  { id: "smw", name: "Super Mario World", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Super_Mario_World_(EUR).sfc`, coverUrl: `${GITHUB_RAW}/roms/covers/mario3.jpg` },
  { id: "smetroid", name: "Super Metroid", console: "snes", romUrl: `${GITHUB_RAW}/roms/snes/Super_Metroid_(JU)_%5B!%5D.smc`, coverUrl: `${GITHUB_RAW}/roms/covers/metroid.jpg` },
];

export const allGames = [...nesGames, ...snesGames];
