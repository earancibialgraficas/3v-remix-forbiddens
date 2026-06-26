import bpy
from pathlib import Path

fbx = Path("tmp/alien_fbx/Test_Alien-Animal-Blender_2.81.fbx").resolve()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.fbx(filepath=str(fbx), use_anim=True)

print("=== FBX OBJECTS ===")
for obj in bpy.context.scene.objects:
    mods = [f"{modifier.name}:{modifier.type}" for modifier in obj.modifiers]
    print(f"{obj.name} | type={obj.type} | mods={mods}")

print("=== FBX ACTIONS ===")
for action in bpy.data.actions:
    frame_range = getattr(action, "frame_range", (0, 0))
    print(f"{action.name} frames={frame_range[0]}-{frame_range[1]}")
