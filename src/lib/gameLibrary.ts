export interface GameEntry {
  id: string;
  name: string;
  console: "nes" | "snes" | "gba" | "n64";
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
  { id: "zombies", name: "Zombies Ate My Neighbors", console: "snes", romUrl: "/roms/snes/Zombies_Ate_My_Neighbors_USA.sfc", coverUrl: "https://upload.wikimedia.org/wikipedia/en/7/75/Zombies_Ate_My_Neighbors_box.jpg" },
  { id: "sailormoon", name: "Bishoujo Senshi Sailor Moon R", console: "snes", romUrl: "/roms/snes/Bishoujo_Senshi_Sailor_Moon_R_Japan_patched.sfc", coverUrl: "https://m.media-amazon.com/images/M/MV5BNGNjYWRlODctYmM2OS00MDY3LTgwYjItMjNiNTBjYzQxMjEyXkEyXkFqcGc@._V1_.jpg" },
];

const GBA_THUMB = "https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy%20Advance/Named_Boxarts";
const N64_THUMB = "https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%2064/Named_Boxarts";

export const gbaGames: GameEntry[] = [
  { id: "gba-metroid-fusion", name: "Metroid Fusion", console: "gba", romUrl: "/roms/gba/Metroid%20Fusion%20(USA).gba", coverUrl: `${GBA_THUMB}/Metroid%20Fusion%20(USA).png` },
  { id: "gba-crash", name: "Crash Bandicoot: Huge Adventure", console: "gba", romUrl: "/roms/gba/Crash%20Bandicoot%20-%20The%20Huge%20Adventure%20(USA).gba", coverUrl: `${GBA_THUMB}/Crash%20Bandicoot%20-%20The%20Huge%20Adventure%20(USA).png` },
  { id: "gba-metal-slug", name: "Metal Slug Advance", console: "gba", romUrl: "/roms/gba/1840%20-%20Metal%20Slug%20Advance%20(E)(TRSI).gba", coverUrl: `${GBA_THUMB}/Metal%20Slug%20Advance%20(USA).png` },
  { id: "gba-nfs", name: "Need for Speed: Most Wanted", console: "gba", romUrl: "/roms/gba/Need%20for%20Speed%20-%20Most%20Wanted%20(USA%2C%20Europe)%20(En%2CFr%2CDe%2CIt).gba", coverUrl: "https://cl2.buscafs.com/www.levelup.com/public/uploads/images/49029/49029_256x257.jpg" },
  { id: "gba-mario-luigi", name: "Mario & Luigi: Superstar Saga", console: "gba", romUrl: "/roms/gba/1246%20-%20Mario%20And%20Luigi%20Superstar%20Saga%20(E)(Menace).gba", coverUrl: "https://static.wikia.nocookie.net/mario/images/3/3e/Superstarsagacover.PNG/revision/latest?cb=20100206151930&path-prefix=es" },
  { id: "gba-castlevania-aria", name: "Castlevania: Aria of Sorrow", console: "gba", romUrl: "/roms/gba/Castlevania-%20Aria%20of%20Sorrow%20-%2075759.zip", coverUrl: `${GBA_THUMB}/Castlevania%20-%20Aria%20of%20Sorrow%20(USA).png` },
  { id: "gba-ff-dawn", name: "Final Fantasy I & II: Dawn of Souls", console: "gba", romUrl: "/roms/gba/Final%20Fantasy%20I%20%26%20II%20-%20Dawn%20of%20Souls%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).gba", coverUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVNMqzxry-f4N6DUqyAps5y3hqqE8Q_YrvMQ&s" },
  { id: "gba-kirby-mirror", name: "Kirby & The Amazing Mirror", console: "gba", romUrl: "/roms/gba/Kirby%20%26%20The%20Amazing%20Mirror%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).gba", coverUrl: "https://upload.wikimedia.org/wikipedia/en/0/0b/Kirby_%26_the_Amazing_Mirror.jpg" },
  { id: "gba-kirby-nightmare", name: "Kirby: Nightmare in Dream Land", console: "gba", romUrl: "/roms/gba/Kirby%20-%20Nightmare%20in%20Dream%20Land%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).gba", coverUrl: `${GBA_THUMB}/Kirby%20-%20Nightmare%20in%20Dream%20Land%20(USA).png` },
  { id: "gba-klonoa", name: "Klonoa: Empire of Dreams", console: "gba", romUrl: "/roms/gba/Klonoa%20-%20Empire%20of%20Dreams%20(Europe).gba", coverUrl: `${GBA_THUMB}/Klonoa%20-%20Empire%20of%20Dreams%20(USA).png` },
  { id: "gba-mother3", name: "Mother 3 (English)", console: "gba", romUrl: "/roms/gba/Mother%203%20(Japan)%20%5BT-En%20by%20Chewy%20%26%20Jeffman%20%26%20Tomato%20v1.3a%5D%20%5BHQ%20audio%20mix%20by%20MusicTheorist%5D.gba", coverUrl: `${GBA_THUMB}/Mother%203%20(Japan).png` },
  { id: "gba-pokemon-esmeralda", name: "Pokémon Edición Esmeralda", console: "gba", romUrl: "/roms/gba/Pokemon%20-%20Edicion%20Esmeralda%20(Spain).gba", coverUrl: `${GBA_THUMB}/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png` },
  { id: "gba-pokemon-rojofuego", name: "Pokémon Rojo Fuego", console: "gba", romUrl: "/roms/gba/Pokemon%20-%20Edicion%20Rojo%20Fuego%20(Spain).gba", coverUrl: `${GBA_THUMB}/Pokemon%20-%20FireRed%20Version%20(USA).png` },
  { id: "gba-sonic-advance3", name: "Sonic Advance 3", console: "gba", romUrl: "/roms/gba/Sonic%20Advance%203%20(USA)%20(En%2CJa%2CFr%2CDe%2CEs%2CIt).gba", coverUrl: "https://static.wikia.nocookie.net/sonic/images/c/cd/Sonic_Advance_3_Coverart.png/revision/latest?cb=20111025044837&path-prefix=es" },
  { id: "gba-zelda-minish", name: "Zelda: The Minish Cap", console: "gba", romUrl: "/roms/gba/The%20Legend%20of%20Zelda-%20The%20Minish%20Cap%20-%2079577.zip", coverUrl: `${GBA_THUMB}/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png` },
];

export const n64Games: GameEntry[] = [
  { id: "n64-mario64", name: "Super Mario 64", console: "n64", romUrl: "/roms/n64/Super%20Mario%2064%20(USA).z64", coverUrl: `${N64_THUMB}/Super%20Mario%2064%20(USA).png` },
  { id: "n64-zelda-oot", name: "Zelda: Ocarina of Time", console: "n64", romUrl: "/roms/n64/Legend%20of%20Zelda%2C%20The%20-%20Ocarina%20of%20Time%20(U)%20(V1.2)%20%5B!%5D.z64", coverUrl: `${N64_THUMB}/Legend%20of%20Zelda%2C%20The%20-%20Ocarina%20of%20Time%20(USA).png` },
  { id: "n64-mariokart", name: "Mario Kart 64", console: "n64", romUrl: "/roms/n64/Mario%20Kart%2064%20(USA).z64", coverUrl: `${N64_THUMB}/Mario%20Kart%2064%20(USA).png` },
  { id: "n64-smash", name: "Super Smash Bros.", console: "n64", romUrl: "/roms/n64/Super%20Smash%20Bros.%20(USA).z64", coverUrl: `${N64_THUMB}/Super%20Smash%20Bros.%20(USA).png` },
  { id: "n64-banjo", name: "Banjo-Kazooie", console: "n64", romUrl: "/roms/n64/Banjo-Kazooie%20(USA)%20(Rev%201).z64", coverUrl: `${N64_THUMB}/Banjo-Kazooie%20(USA).png` },
  { id: "n64-conker", name: "Conker's Bad Fur Day", console: "n64", romUrl: "/roms/n64/Conker's%20Bad%20Fur%20Day%20(USA).z64", coverUrl: `${N64_THUMB}/Conker's%20Bad%20Fur%20Day%20(USA).png` },
  { id: "n64-fzerox", name: "F-Zero X", console: "n64", romUrl: "/roms/n64/F-Zero%20X%20(USA).z64", coverUrl: `${N64_THUMB}/F-Zero%20X%20(USA).png` },
  { id: "n64-kirby64", name: "Kirby 64: The Crystal Shards", console: "n64", romUrl: "/roms/n64/Kirby%2064%20-%20The%20Crystal%20Shards%20(USA).z64", coverUrl: `${N64_THUMB}/Kirby%2064%20-%20The%20Crystal%20Shards%20(USA).png` },
  { id: "n64-papermario", name: "Paper Mario", console: "n64", romUrl: "/roms/n64/Paper%20Mario%20(USA).z64", coverUrl: `${N64_THUMB}/Paper%20Mario%20(USA).png` },
  { id: "n64-pokestadium", name: "Pokémon Stadium", console: "n64", romUrl: "/roms/n64/Pokemon%20Stadium%20(USA)%20(Rev%202).z64", coverUrl: `${N64_THUMB}/Pokemon%20Stadium%20(USA).png` },
];

export const allGames = [...nesGames, ...snesGames, ...gbaGames, ...n64Games];