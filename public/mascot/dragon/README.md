# Black Dragon 3D Mascot

Source folder:

```txt
C:\Users\Orphen\Desktop\foro\mascotas\Black-Dragon-NEW-27.03.2017\Black Dragon NEW
```

The old 2D PNG-frame dragon prototype was removed from this public folder. The `dragon_noxito` shop item now uses this 3D black dragon in the launcher companion.

## Active Files

```txt
base.png
dragon_black_model.glb
textures/
```

- `dragon_black_model.glb`: exported from `Dragon_Baked_Actions_fbx_7.4_binary.fbx`.
- `base.png`: generated Blender preview for shop/inventory.
- `textures/`: copied from the source model package.

## Included Animations

The GLB currently contains these baked clips:

```txt
Armature|Armature|Fly_New
Armature|Armature|Idel_New
Armature|Armature|Run_New
Armature|Armature|Walk_New
FORBIDDENS_Lie_Down
FORBIDDENS_Sleep_Loop
FORBIDDENS_Wake_Up
```

The companion maps these clips to launcher events in:

```txt
src/components/DragonMascot.tsx
```

The shared event/dialogue types remain in:

```txt
src/mascot/dragonMascotConfig.ts
```

## Export Script

The reproducible export script is:

```txt
scripts/export-black-dragon-mascot.py
```

Run it with Blender:

```powershell
A:\blender.exe -b --python scripts\export-black-dragon-mascot.py
```

This regenerates:

```txt
public/mascot/dragon/dragon_black_model.glb
public/mascot/dragon/base.png
```
