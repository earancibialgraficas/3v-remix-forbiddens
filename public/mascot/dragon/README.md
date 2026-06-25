# Dragon Mascot Asset Notes

Source folder reviewed:
`C:\Users\Orphen\Desktop\foro\mascotas\mascota dragon`

## Active Curated Set

The launcher prototype uses only selected PNG frames copied into this folder with ASCII-safe names.
These frames cover the Word plan MVP:

- idle: `idle_01.png` to `idle_05.png`
- blink: `blink_01.png` to `blink_04.png`
- walk: `walk_right_01.png` to `walk_right_05.png`
- talk: `talk_01.png` to `talk_05.png`
- happy/save/play/reset: `happy_01.png` to `happy_04.png`
- sad/pause/error: `sad_01.png`, `sad_02.png`
- judge/settings/load: `judge_01.png`
- laugh/click/troll: `laugh_01.png` to `laugh_03.png`
- tongue/mute: `tongue_01.png` to `tongue_03.png`
- fart rare pack: `fart_01.png` to `fart_05.png`
- sleep: `sleep_01.png`, `sleep_02.png`

## Excluded For Now

The original `14_dedo_medio` pack is intentionally not used in code. The files are technically valid PNGs, but the generated pose does not match the intended action: the gesture appears as a large hand/overlay in front of the dragon face instead of the dragon naturally making the gesture.

Some other source images also contain AI-generation artifacts such as extra limbs or poses that do not match their file names. The prototype avoids those frames instead of showing malformed poses to users.

`middle_finger_candidate.png` is a generated replacement candidate with transparent corners. It is not wired into the active animation config yet because its style needs approval or a better matching redraw.

## Replacement Rule

When corrected frames are available, keep this folder's public filenames stable and replace/add frames through the config in:

`src/mascot/dragonMascotConfig.ts`

Do not overwrite the original source folder. Keep the source assets as references and only promote curated frames into this public folder.
