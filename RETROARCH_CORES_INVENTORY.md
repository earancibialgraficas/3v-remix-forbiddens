# 📋 Inventario Completo de Cores RetroArch / EmulatorJS

**Fecha de generación:** 2026-06-06  
**Fuentes:** 
- `src/pages/EmulatorPage.tsx` (cores configurados en web)
- `src/pages/BibliotecaPage.tsx` (mapeo de cores)
- `public/emulatorjs-data/emulator.min.js` (configuración de EmulatorJS)

---

## 🎮 Cores Principales Configurados en FORBIDDENS

### 1. **NES (Nintendo Entertainment System)**
- **Core Principal:** `fceumm`
- **Alternativa:** nestopia
- **Extensiones:** .nes, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 130

### 2. **SNES (Super Nintendo)**
- **Core Principal:** `snes9x`
- **Alternativa:** bsnes
- **Extensiones:** .smc, .sfc, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 136

### 3. **N64 (Nintendo 64)**
- **Core Principal:** `mupen64plus_next`
- **Alternativa:** parallel_n64
- **Extensiones:** .n64, .z64, .v64 (sin .zip)
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 143
- **Nota:** Requiere membresía LITE

### 4. **GBA (Game Boy Advance)**
- **Core Principal:** `mgba`
- **Extensiones:** .gba, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 149

### 5. **GBC (Game Boy Color)**
- **Core Principal:** `gambatte`
- **Extensiones:** .gbc, .gb, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 155

### 6. **Genesis / Mega Drive**
- **Core Principal:** `genesis_plus_gx`
- **Alternativas:** genesis_plus_gx_wide, picodrive
- **Extensiones:** .md, .smd, .gen, .bin, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 161

### 7. **PS1 (PlayStation 1)**
- **Core Principal:** `pcsx_rearmed`
- **Alternativa:** mednafen_psx_hw
- **Extensiones:** .iso, .bin, .cue, .chd (sin .zip)
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 168
- **Nota:** Requiere membresía LITE

### 8. **Arcade (FBNeo)**
- **Core Principal:** `fbneo`
- **Alternativas:** fbalpha2012_cps1, fbalpha2012_cps2, same_cdi
- **Extensiones:** .7z
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 175
- **Nota:** Requiere membresía LITE

### 9. **DS (Nintendo DS)**
- **Core Principal:** `desmume2015`
- **Alternativas:** melonds, desmume
- **Extensiones:** .nds, .zip
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 182
- **Nota:** Disponible para todos los usuarios

### 10. **PSP (PlayStation Portable)**
- **Core Principal:** `ppsspp`
- **Extensiones:** .iso, .cso, .pbp, .chd
- **Ubicación:** `src/pages/EmulatorPage.tsx` línea 189
- **Nota:** Solo en FORBIDDENS Launcher (nativo)

### 11. **PS2 (PlayStation 2)**
- **Core Principal:** PCSX2 (nativo)
- **Extensiones:** .iso, .cso, .chd, .isz, .bin, .elf
- **Nota:** Solo en FORBIDDENS Launcher (nativo)

---

## 🔧 Lista Completa de Todos los Cores (EmulatorJS)

Configurados en `public/emulatorjs-data/emulator.min.js`:

### Por Sistema:

| Sistema | ID | Cores Disponibles |
|---------|-------|-------------------|
| Atari 5200 | atari5200 | `a5200` |
| Atari 2600 | atari2600 | `stella2014` |
| Atari 7800 | atari7800 | `prosystem` |
| Virtual Boy | vb | `beetle_vb` |
| Nintendo DS | nds | `melonds`, `desmume`, `desmume2015` |
| Nintendo 3DS | 3ds | `azahar` |
| Arcade | arcade | `fbneo`, `fbalpha2012_cps1`, `fbalpha2012_cps2`, `same_cdi` |
| NES | nes | `fceumm`, `nestopia` |
| SNES | snes | `snes9x`, `bsnes` |
| Game Boy | gb | `gambatte` |
| Coleco Vision | coleco | `gearcoleco` |
| Sega Master System | segaMS | `smsplus`, `genesis_plus_gx`, `genesis_plus_gx_wide`, `picodrive` |
| Sega Genesis/MD | segaMD | `genesis_plus_gx`, `genesis_plus_gx_wide`, `picodrive` |
| Sega Game Gear | segaGG | `genesis_plus_gx`, `genesis_plus_gx_wide` |
| Sega CD | segaCD | `genesis_plus_gx`, `genesis_plus_gx_wide`, `picodrive` |
| Sega 32X | sega32x | `picodrive` |
| Sega (General) | sega | `genesis_plus_gx`, `genesis_plus_gx_wide`, `picodrive` |
| Sega Saturn | segaSaturn | `yabause` |
| Lynx | lynx | `handy` |
| MAME | mame | `mame2003_plus`, `mame2003` |
| Neo Geo Pocket | ngp | `mednafen_ngp` |
| PC Engine | pce | `mednafen_pce` |
| PC-FX | pcfx | `mednafen_pcfx` |
| PlayStation | psx | `pcsx_rearmed`, `mednafen_psx_hw` |
| Wonderswan | ws | `mednafen_wswan` |
| Game Boy Advance | gba | `mgba` |
| Nintendo 64 | n64 | `mupen64plus_next`, `parallel_n64` |
| 3DO | 3do | `opera` |
| PlayStation Portable | psp | `ppsspp` |
| Amiga | amiga | `puae` |
| Commodore 64 | c64 | `vice_x64sc` |
| Commodore 128 | c128 | `vice_x128` |
| PET | pet | `vice_xpet` |
| Plus/4 | plus4 | `vice_xplus4` |
| Vic-20 | vic20 | `vice_xvic` |
| DOS | dos | `dosbox_pure` |
| Intellivision | intv | `freeintv` |
| Atari Jaguar | jaguar | `virtualjaguar` |

---

## 📊 Resumen de Cores Únicos

### Total: 47 cores mencionados

**Cores Libretro (EmulatorJS):**
1. `a5200` - Atari 5200
2. `azahar` - Nintendo 3DS
3. `beetle_vb` - Virtual Boy
4. `bsnes` - SNES
5. `desmume` - DS
6. `desmume2015` - DS
7. `dosbox_pure` - DOS
8. `fbalpha2012_cps1` - Arcade
9. `fbalpha2012_cps2` - Arcade
10. `fbneo` - Arcade
11. `fceumm` - NES
12. `freeintv` - Intellivision
13. `gambatte` - Game Boy
14. `gearcoleco` - Coleco Vision
15. `genesis_plus_gx` - Sega
16. `genesis_plus_gx_wide` - Sega
17. `handy` - Lynx
18. `mame2003` - MAME
19. `mame2003_plus` - MAME
20. `mednafen_ngp` - Neo Geo Pocket
21. `mednafen_pce` - PC Engine
22. `mednafen_pcfx` - PC-FX
23. `mednafen_psx_hw` - PlayStation
24. `mednafen_wswan` - Wonderswan
25. `melonds` - DS
26. `mgba` - Game Boy Advance
27. `mupen64plus_next` - Nintendo 64
28. `nestopia` - NES
29. `opera` - 3DO
30. `parallel_n64` - Nintendo 64
31. `pcsx_rearmed` - PlayStation
32. `picodrive` - Sega
33. `ppsspp` - PlayStation Portable
34. `prosystem` - Atari 7800
35. `puae` - Amiga
36. `same_cdi` - Arcade
37. `smes9x` - SNES
38. `smsplus` - Sega Master System
39. `stella2014` - Atari 2600
40. `vice_x128` - Commodore 128
41. `vice_x64sc` - Commodore 64
42. `vice_xpet` - PET
43. `vice_xplus4` - Plus/4
44. `vice_xvic` - Vic-20
45. `virtualjaguar` - Atari Jaguar
46. `yabause` - Sega Saturn

**Cores Nativos:**
47. `PCSX2` - PlayStation 2 (solo Launcher)

---

## 🎯 Cores Especiales / Notas

### Cores con Múltiples Alternativas:
- **Sega Genesis:** 3 cores disponibles (genesis_plus_gx, genesis_plus_gx_wide, picodrive)
- **PlayStation:** 2 cores (pcsx_rearmed, mednafen_psx_hw)
- **NES:** 2 cores (fceumm, nestopia)
- **SNES:** 2 cores (snes9x, bsnes)
- **N64:** 2 cores (mupen64plus_next, parallel_n64)
- **DS:** 3 cores (desmume2015, melonds, desmume)
- **MAME:** 2 cores (mame2003_plus, mame2003)
- **Arcade:** 4 cores (fbneo, fbalpha2012_cps1, fbalpha2012_cps2, same_cdi)

### Cores Bajo Restricción (Membresía LITE):
- N64 (`mupen64plus_next`)
- PS1 (`pcsx_rearmed`)
- Arcade (`fbneo`)

### Cores Solo Launcher Nativo:
- PSP (`ppsspp`)
- PS2 (`PCSX2`)

### Variantes de Cores:
- `genesis_plus_gx` y `genesis_plus_gx_wide` - Versiones regular y widescreen

---

## 📁 Ubicación en el Codebase

### Archivos Clave:

1. **[src/pages/EmulatorPage.tsx](src/pages/EmulatorPage.tsx#L128)** - Línea 128
   - Array `systems` con configuración principal de 11 consolas

2. **[src/pages/BibliotecaPage.tsx](src/pages/BibliotecaPage.tsx#L558)** - Línea 558
   - Función `getCoreForConsole()` - mapeo consola → core

3. **[public/emulatorjs-data/emulator.min.js](public/emulatorjs-data/emulator.min.js)** - Línea 1
   - Objeto `u` con configuración completa de todos los cores por sistema
   - Minificado, contiene 40+ sistemas con múltiples cores cada uno

---

## 🔍 Búsqueda de Cores en el Codebase

Patrones encontrados:
- `consoleCore` - Variable que almacena el core a usar
- `core:` - Propiedad en configuración de sistemas
- `getCoreForConsole()` - Función para obtener core por consola
- `.core` - Acceso a propiedad core de sistema

---

**Generado automáticamente - Actualizado al: 2026-06-06**
