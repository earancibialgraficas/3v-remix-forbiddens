import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_static_test.glb").resolve()
keep_names = {"Rig-Alien-Animal", "Alien-Animal_PostProcessing", "Eyes-Alien-Animal"}

for obj in bpy.context.scene.objects:
    obj.select_set(False)
    obj.hide_viewport = obj.name not in keep_names
    obj.hide_render = obj.name not in keep_names
    if obj.name in keep_names:
        obj.select_set(True)

bpy.context.view_layer.objects.active = bpy.data.objects["Alien-Animal_PostProcessing"]
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    use_visible=True,
    export_animations=False,
    export_skins=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
print(f"EXPORTED {OUT}")
