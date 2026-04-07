export interface GameEntry {
  id: string;
  name: string;
  console: "nes" | "snes" | "gba";
  romUrl: string;
  coverUrl: string;
}

export const nesGames: GameEntry[] = [
  { id: "alien3", name: "Alien 3", console: "nes", romUrl: "/roms/nes/Alien_3_(USA).nes", coverUrl: "/roms/covers/alien3.jpg" },
  { id: "asterix", name: "Asterix", console: "nes", romUrl: "/roms/nes/Asterix_(E).nes", coverUrl: "/roms/covers/asterix.jpg" },
  { id: "contra", name: "Contra", console: "nes", romUrl: "/roms/nes/Contra_(USA).nes", coverUrl: "/roms/covers/contra.jpg" },
  { id: "darkman", name: "Darkman", console: "nes", romUrl: "/roms/nes/Darkman_(USA).nes", coverUrl: "/roms/covers/darkman.jpg" },
  { id: "godzilla", name: "Godzilla", console: "nes", romUrl: "/roms/nes/Godzilla_-_Monster_of_Monsters!_(USA).nes", coverUrl: "/roms/covers/godzilla.jpg" },
  { id: "metalstorm", name: "Metal Storm", console: "nes", romUrl: "/roms/nes/Gravity_Armor_Metal_Storm_(Tr).nes", coverUrl: "/roms/covers/metalstorm.jpg" },
  { id: "kof99", name: "King of Fighters 99", console: "nes", romUrl: "/roms/nes/King_of_Fighters_99.nes", coverUrl: "/roms/covers/kof99.jpg" },
  { id: "kirby", name: "Kirby's Adventure", console: "nes", romUrl: "/roms/nes/Kirby's_Adventure_(USA)_(Rev_1).nes", coverUrl: "/roms/covers/kirby.jpg" },
  { id: "metalmech", name: "MetalMech", console: "nes", romUrl: "/roms/nes/MetalMech_-_Man_&_Machine_(USA).nes", coverUrl: "/roms/covers/metalmech.jpg" },
  { id: "metroid", name: "Metroid", console: "nes", romUrl: "/roms/nes/Metroid_(U).nes", coverUrl: "/roms/covers/metroid.jpg" },
  { id: "sonic3d", name: "Sonic 3D Blast 5", console: "nes", romUrl: "/roms/nes/Sonic_3D_Blast_5_[!].nes", coverUrl: "/roms/covers/sonic3d.jpg" },
  { id: "spiderman", name: "Spider-Man", console: "nes", romUrl: "/roms/nes/Spider-Man_-_Return_of_the_Sinister_Six_(USA).nes", coverUrl: "/roms/covers/spiderman.jpg" },
  { id: "mario3", name: "Super Mario Bros. 3", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros._3_(USA)_(Rev_1).nes", coverUrl: "/roms/covers/mario3.jpg" },
  { id: "mario2", name: "Super Mario Bros. 2", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros_2_(E)_[h1].nes", coverUrl: "/roms/covers/mario2.jpg" },
  { id: "mario3alt", name: "Super Mario Bros. 3 (Alt)", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros_3_(U)_(PRG_1)_[h1].nes", coverUrl: "/roms/covers/mario3.jpg" },
];

export const snesGames: GameEntry[] = [
  { id: "chrono", name: "Chrono Trigger", console: "snes", romUrl: "/roms/snes/Chrono_Trigger_(USA).sfc", coverUrl: "/roms/covers/snes/contra.jpg" },
  { id: "contra3", name: "Contra III", console: "snes", romUrl: "/roms/snes/Contra_III_(USA).sfc", coverUrl: "/roms/covers/snes/contra.jpg" },
  { id: "dkc3", name: "Donkey Kong Country 3", console: "snes", romUrl: "/roms/snes/Donkey_Kong_Country_3_(EUR).sfc", coverUrl: "/roms/covers/snes/kirby.jpg" },
  { id: "doom", name: "Doom", console: "snes", romUrl: "/roms/snes/Doom_(USA).sfc", coverUrl: "/roms/covers/snes/alien3.jpg" },
  { id: "fzero", name: "F-Zero", console: "snes", romUrl: "/roms/snes/F-Zero_(EUR).sfc", coverUrl: "/roms/covers/snes/sonic3d.jpg" },
  { id: "ki", name: "Killer Instinct", console: "snes", romUrl: "/roms/snes/Killer_Instinct_(EUR).sfc", coverUrl: "/roms/covers/snes/kof99.jpg" },
  { id: "kirbyss", name: "Kirby Super Star", console: "snes", romUrl: "/roms/snes/Kirby_Super_Star_(USA).sfc", coverUrl: "/roms/covers/snes/kirby.jpg" },
  { id: "zelda", name: "Zelda: A Link to the Past", console: "snes", romUrl: "/roms/snes/Legend_of_Zelda,_The_-_A_Link_to_the_Past_(U)_[!].smc", coverUrl: "/roms/covers/snes/metroid.jpg" },
  { id: "mmx3", name: "Megaman X3", console: "snes", romUrl: "/roms/snes/Megaman_X3_(USA).sfc", coverUrl: "/roms/covers/snes/spiderman.jpg" },
  { id: "sonic4", name: "Sonic the Hedgehog 4", console: "snes", romUrl: "/roms/snes/Sonic_the_Hedgehog_4_(World)_(Unl).sfc", coverUrl: "/roms/covers/snes/sonic3d.jpg" },
  { id: "smw", name: "Super Mario World", console: "snes", romUrl: "/roms/snes/Super_Mario_World_(EUR).sfc", coverUrl: "/roms/covers/snes/mario3.jpg" },
  { id: "smetroid", name: "Super Metroid", console: "snes", romUrl: "/roms/snes/Super_Metroid_(JU)_[!].smc", coverUrl: "/roms/covers/snes/metroid.jpg" },
];

export const gbaGames: GameEntry[] = [
  { id: "gba-metroid-fusion", name: "Metroid Fusion", console: "gba", romUrl: "/roms/gba/Metroid%20Fusion%20(USA).gba", coverUrl: "/roms/covers/gba/metroid%20fusion.jpeg" },
  { id: "gba-crash", name: "Crash Bandicoot: Huge Adventure", console: "gba", romUrl: "/roms/gba/Crash%20Bandicoot%20-%20The%20Huge%20Adventure%20(USA).gba", coverUrl: "/roms/covers/gba/crash%20bandicoot.jpeg" },
  { id: "gba-metal-slug", name: "Metal Slug Advance", console: "gba", romUrl: "/roms/gba/1840%20-%20Metal%20Slug%20Advance%20(E)(TRSI).gba", coverUrl: "/roms/covers/gba/metal%20slug.jpg" },
  { id: "gba-nfs", name: "Need for Speed: Most Wanted", console: "gba", romUrl: "/roms/gba/Need%20for%20Speed%20-%20Most%20Wanted%20(USA%2C%20Europe)%20(En%2CFr%2CDe%2CIt).gba", coverUrl: "/roms/covers/gba/NFS%20most%20wanted.jpeg" },
];

export const allGames = [...nesGames, ...snesGames, ...gbaGames];
