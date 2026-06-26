import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_skinned_static_test.glb").resolve()
ARMATURE_NAME = "Rig-Alien-Animal"
SOURCE_NAMES = ["Alien-Animal_PostProcessing", "Eyes-Alien-Animal"]


def rebuild_mesh_object(source, armature):
    verts = [vertex.co.copy() for vertex in source.data.vertices]
    faces = [[vertex_index for vertex_index in poly.vertices] for poly in source.data.polygons]
    mesh = bpy.data.meshes.new(f"Clean_{source.data.name}")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for material in source.data.materials:
        mesh.materials.append(material)
    obj = bpy.data.objects.new(f"Export_{source.name}", mesh)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = source.matrix_world.copy()
    for group in source.vertex_groups:
        obj.vertex_groups.new(name=group.name)
    for vertex in source.data.vertices:
        for group in vertex.groups:
            obj.vertex_groups[group.group].add([vertex.index], group.weight, "ADD")
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature
    return obj


armature = bpy.data.objects[ARMATURE_NAME]
sources = [bpy.data.objects[name] for name in SOURCE_NAMES]
bpy.ops.object.mode_set(mode="OBJECT") if bpy.ops.object.mode_set.poll() else None
rebuilt = [rebuild_mesh_object(source, armature) for source in sources]

for obj in list(bpy.context.scene.objects):
    if obj not in rebuilt and obj != armature:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.context.scene.objects:
    obj.select_set(True)
    obj.hide_viewport = False
    obj.hide_render = False

bpy.context.view_layer.objects.active = armature
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=False,
    use_visible=True,
    export_animations=False,
    export_skins=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
print(f"EXPORTED {OUT}")
