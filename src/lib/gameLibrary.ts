export interface GameEntry {
  id: string;
  name: string;
  console: "nes" | "snes" | "gba";
  romUrl: string;
  coverUrl: string;
}

export const nesGames: GameEntry[] = [
  { id: "alien3", name: "Alien 3", console: "nes", romUrl: "/roms/nes/Alien_3_(USA).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Alien%203%20(USA).png" },
  { id: "asterix", name: "Asterix", console: "nes", romUrl: "/roms/nes/Asterix_(E).nes", coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/fb/Asterix_NES.jpg" },
  { id: "contra", name: "Contra", console: "nes", romUrl: "/roms/nes/Contra_(USA).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Contra%20(USA).png" },
  { id: "darkman", name: "Darkman", console: "nes", romUrl: "/roms/nes/Darkman_(USA).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Darkman%20(USA).png" },
  { id: "godzilla", name: "Godzilla", console: "nes", romUrl: "/roms/nes/Godzilla_-_Monster_of_Monsters!_(USA).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Godzilla%20-%20Monster%20of%20Monsters!%20(USA).png" },
  { id: "metalstorm", name: "Metal Storm", console: "nes", romUrl: "/roms/nes/Gravity_Armor_Metal_Storm_(Tr).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Metal%20Storm%20(USA).png" },
  { id: "kof99", name: "King of Fighters 99", console: "nes", romUrl: "/roms/nes/King_of_Fighters_99.nes", coverUrl: "https://static.wikia.nocookie.net/snk/images/d/d9/Kof99_arcade_flyer.jpg/revision/latest?cb=20191026044732&path-prefix=es" },
  { id: "kirby", name: "Kirby's Adventure", console: "nes", romUrl: "/roms/nes/Kirby's_Adventure_(USA)_(Rev_1).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Kirby's%20Adventure%20(USA).png" },
  { id: "metalmech", name: "MetalMech", console: "nes", romUrl: "/roms/nes/MetalMech_-_Man_%26_Machine_(USA).nes", coverUrl: "https://storage.googleapis.com/images.pricecharting.com/ea411bb41a16933763e22b5fd5050abc816a7c3404a36d854554804c40000213/1600.jpg" },
  { id: "metroid", name: "Metroid", console: "nes", romUrl: "/roms/nes/Metroid_(U).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Metroid%20(USA).png" },
  { id: "sonic3d", name: "Sonic 3D Blast 5", console: "nes", romUrl: "/roms/nes/Sonic_3D_Blast_5_%5B!%5D.nes", coverUrl: "https://upload.wikimedia.org/wikipedia/en/3/36/Sonic3D.jpg" },
  { id: "spiderman", name: "Spider-Man", console: "nes", romUrl: "/roms/nes/Spider-Man_-_Return_of_the_Sinister_Six_(USA).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Spider-Man%20-%20Return%20of%20the%20Sinister%20Six%20(USA).png" },
  { id: "mario3", name: "Super Mario Bros. 3", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros._3_(USA)_(Rev_1).nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Super%20Mario%20Bros.%203%20(USA).png" },
  { id: "mario2", name: "Super Mario Bros. 2", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros_2_(E)_%5Bh1%5D.nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Super%20Mario%20Bros.%202%20(USA).png" },
  { id: "mario3alt", name: "Super Mario Bros. 3 (Alt)", console: "nes", romUrl: "/roms/nes/Super_Mario_Bros_3_(U)_(PRG_1)_%5Bh1%5D.nes", coverUrl: "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Super%20Mario%20Bros.%203%20(USA).png" },
];

export const snesGames: GameEntry[] = [
  { id: "chrono", name: "Chrono Trigger", console: "snes", romUrl: "/roms/snes/Chrono_Trigger_(USA).sfc", coverUrl: "/roms/covers/snes/chrono_trigger.jpg" },
  { id: "contra3", name: "Contra III", console: "snes", romUrl: "/roms/snes/Contra_III_(USA).sfc", coverUrl: "/roms/covers/snes/contra_iii.png" },
  { id: "dkc3", name: "Donkey Kong Country 3", console: "snes", romUrl: "/roms/snes/Donkey_Kong_Country_3_(EUR).sfc", coverUrl: "/roms/covers/snes/donkey_kong.png" },
  { id: "doom", name: "Doom", console: "snes", romUrl: "/roms/snes/Doom_(USA).sfc", coverUrl: "/roms/covers/snes/doom.png" },
  { id: "fzero", name: "F-Zero", console: "snes", romUrl: "/roms/snes/F-Zero_(EUR).sfc", coverUrl: "/roms/covers/snes/fzero.jpg" },
  { id: "ki", name: "Killer Instinct", console: "snes", romUrl: "/roms/snes/Killer_Instinct_(EUR).sfc", coverUrl: "/roms/covers/snes/killer_instinct.png" },
  { id: "kirbyss", name: "Kirby Super Star", console: "snes", romUrl: "/roms/snes/Kirby_Super_Star_(USA).sfc", coverUrl: "/roms/covers/snes/kirby.png" },
  { id: "zelda", name: "Zelda: A Link to the Past", console: "snes", romUrl: "/roms/snes/Legend_of_Zelda%2C_The_-_A_Link_to_the_Past_(U)_%5B!%5D.smc", coverUrl: "/roms/covers/snes/zelda.jpg" },
  { id: "mmx3", name: "Megaman X3", console: "snes", romUrl: "/roms/snes/Megaman_X3_(USA).sfc", coverUrl: "/roms/covers/snes/megaman_x3.png" },
  { id: "sonic4", name: "Sonic the Hedgehog 4", console: "snes", romUrl: "/roms/snes/Sonic_the_Hedgehog_4_(World)_(Unl).sfc", coverUrl: "/roms/covers/snes/sonic.png" },
  { id: "smw", name: "Super Mario World", console: "snes", romUrl: "/roms/snes/Super_Mario_World_(EUR).sfc", coverUrl: "/roms/covers/snes/super_mario_world.png" },
  { id: "smetroid", name: "Super Metroid", console: "snes", romUrl: "/roms/snes/Super_Metroid_(JU)_%5B!%5D.smc", coverUrl: "/roms/covers/snes/super_metroid.png" },
];

export const gbaGames: GameEntry[] = [
  { id: "gba-metroid-fusion", name: "Metroid Fusion", console: "gba", romUrl: "/roms/gba/Metroid%20Fusion%20(USA).gba", coverUrl: "/roms/covers/gba/metroid%20fusion.jpeg" },
  { id: "gba-crash", name: "Crash Bandicoot: Huge Adventure", console: "gba", romUrl: "/roms/gba/Crash%20Bandicoot%20-%20The%20Huge%20Adventure%20(USA).gba", coverUrl: "/roms/covers/gba/crash%20bandicoot.jpeg" },
  { id: "gba-metal-slug", name: "Metal Slug Advance", console: "gba", romUrl: "/roms/gba/1840%20-%20Metal%20Slug%20Advance%20(E)(TRSI).gba", coverUrl: "/roms/covers/gba/metal%20slug.jpg" },
  { id: "gba-nfs", name: "Need for Speed: Most Wanted", console: "gba", romUrl: "/roms/gba/Need%20for%20Speed%20-%20Most%20Wanted%20(USA%2C%20Europe)%20(En%2CFr%2CDe%2CIt).gba", coverUrl: "/roms/covers/gba/NFS%20most%20wanted.jpeg" },
];

export const allGames = [...nesGames, ...snesGames, ...gbaGames];