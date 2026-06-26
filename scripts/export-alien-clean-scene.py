import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_animal_rigged.glb").resolve()
keep_names = {
    "Rig-Alien-Animal",
    "Alien-Animal_PostProcessing",
    "Eyes-Alien-Animal",
}

bpy.ops.object.mode_set(mode="OBJECT") if bpy.ops.object.mode_set.poll() else None

for obj in list(bpy.context.scene.objects):
    if obj.name not in keep_names:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.context.scene.objects:
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)

for obj_name in ["Alien-Animal_PostProcessing", "Eyes-Alien-Animal"]:
    obj = bpy.data.objects.get(obj_name)
    if not obj:
        continue
    for modifier in obj.modifiers:
        if modifier.type == "ARMATURE":
            modifier.show_viewport = True
            modifier.show_render = True

armature = bpy.data.objects.get("Rig-Alien-Animal")
if armature:
    bpy.context.view_layer.objects.active = armature

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
