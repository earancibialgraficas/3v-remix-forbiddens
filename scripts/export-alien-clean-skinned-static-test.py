import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_animal_model.glb").resolve()
ARMATURE_NAME = "Rig-Alien-Animal"
SOURCE_NAMES = ["Alien-Animal_PostProcessing", "Eyes-Alien-Animal"]


def rebuild_mesh_object(source, armature):
    verts = [vertex.co.copy() for vertex in source.data.vertices]
    faces = [[vertex_index for vertex_index in poly.vertices] for poly in source.data.polygons]
    material_indices = [poly.material_index for poly in source.data.polygons]
    smooth_flags = [poly.use_smooth for poly in source.data.polygons]
    uv_layers = []
    for uv_layer in source.data.uv_layers:
        uv_data = []
        for poly in source.data.polygons:
            for loop_index in poly.loop_indices:
                uv_data.append(uv_layer.data[loop_index].uv.copy())
        uv_layers.append((uv_layer.name, uv_data))
    mesh = bpy.data.meshes.new(f"Clean_{source.data.name}")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for material in source.data.materials:
        mesh.materials.append(material)
    for poly, material_index in zip(mesh.polygons, material_indices):
        poly.material_index = material_index
    for poly, smooth in zip(mesh.polygons, smooth_flags):
        poly.use_smooth = smooth
    for layer_name, uv_data in uv_layers:
        new_uv = mesh.uv_layers.new(name=layer_name)
        for index, uv in enumerate(uv_data):
            if index < len(new_uv.data):
                new_uv.data[index].uv = uv
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
    modifier.use_vertex_groups = True
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
