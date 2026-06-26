import bpy
from pathlib import Path

OUT = Path("public/mascot/alien/alien_static_rebuilt.glb").resolve()
source = bpy.data.objects.get("Alien-Animal_PostProcessing")
if not source:
    raise RuntimeError("source mesh missing")
verts = [v.co.copy() for v in source.data.vertices]
faces = [[v for v in poly.vertices] for poly in source.data.polygons]

bpy.ops.object.mode_set(mode="OBJECT") if bpy.ops.object.mode_set.poll() else None
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

mesh = bpy.data.meshes.new("AlienRebuiltMesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
obj = bpy.data.objects.new("AlienRebuiltStatic", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

mat = bpy.data.materials.new("AlienDebugRed")
mat.diffuse_color = (0.65, 0.02, 0.02, 1)
mesh.materials.append(mat)

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    export_animations=False,
    export_materials="EXPORT",
)
print(f"EXPORTED {OUT}")
