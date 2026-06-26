import bpy

print("=== OBJECTS ===")
for obj in bpy.context.scene.objects:
    mods = [f"{modifier.name}:{modifier.type}" for modifier in obj.modifiers]
    print(f"{obj.name} | type={obj.type} | hidden={obj.hide_viewport} | mods={mods}")

print("=== ARMATURES ===")
for obj in bpy.context.scene.objects:
    if obj.type == "ARMATURE":
        print(f"{obj.name} bones={len(obj.data.bones)}")

print("=== ACTIONS ===")
for action in bpy.data.actions:
    print(f"{action.name} frames={action.frame_range[0]}-{action.frame_range[1]} curves={len(action.fcurves)}")
