import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_animal_rigged.glb").resolve()
armature = bpy.data.objects.get("Rig-Alien-Animal")
source_names = ["Alien-Animal_PostProcessing", "Eyes-Alien-Animal"]

if not armature:
    raise RuntimeError("Rig-Alien-Animal not found")

bpy.ops.object.mode_set(mode="OBJECT") if bpy.ops.object.mode_set.poll() else None

new_objects = [armature]
for source_name in source_names:
    source = bpy.data.objects.get(source_name)
    if not source:
        continue
    duplicate = source.copy()
    duplicate.data = source.data.copy()
    duplicate.animation_data_clear()
    duplicate.name = f"Export_{source_name}"
    duplicate.data.name = f"Export_{source.data.name}"
    bpy.context.collection.objects.link(duplicate)
    duplicate.parent = armature
    duplicate.matrix_world = source.matrix_world.copy()
    for modifier in list(duplicate.modifiers):
        duplicate.modifiers.remove(modifier)
    armature_modifier = duplicate.modifiers.new("Armature", "ARMATURE")
    armature_modifier.object = armature
    duplicate.hide_viewport = False
    duplicate.hide_render = False
    new_objects.append(duplicate)

for obj in list(bpy.context.scene.objects):
    if obj not in new_objects:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.context.scene.objects:
    obj.select_set(True)
    obj.hide_viewport = False
    obj.hide_render = False

bpy.context.view_layer.objects.active = armature

print("=== EXPORT OBJECTS ===")
for obj in bpy.context.scene.objects:
    print(obj.name, obj.type, len(obj.data.vertices) if obj.type == "MESH" else "", [m.type for m in obj.modifiers])

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=False,
    use_visible=True,
    use_renderable=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_anim_single_armature=True,
    export_extra_animations=True,
    export_skins=True,
    export_morph=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)

print(f"EXPORTED {OUT}")
