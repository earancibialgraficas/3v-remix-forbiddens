import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_animal_rigged.glb").resolve()

keep_names = {
    "Rig-Alien-Animal",
    "Alien-Animal_PostProcessing",
    "Eyes-Alien-Animal",
}

for obj in bpy.context.scene.objects:
    obj.select_set(False)
    obj.hide_viewport = False

for obj in bpy.context.scene.objects:
    if obj.name not in keep_names:
        obj.hide_viewport = True
        obj.hide_render = True
    else:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)

armature = bpy.data.objects.get("Rig-Alien-Animal")
if armature:
    bpy.context.view_layer.objects.active = armature

for obj in bpy.context.scene.objects:
    if obj.type == "MESH" and obj.name in keep_names:
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.show_viewport = True
                modifier.show_render = True

OUT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    export_apply=False,
    export_animations=True,
    export_bake_animation=False,
    export_anim_single_armature=True,
    export_extra_animations=True,
    export_skins=True,
    export_morph=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)

print(f"EXPORTED {OUT}")
