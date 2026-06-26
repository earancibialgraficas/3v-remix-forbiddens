import math
from pathlib import Path

import bpy


ROOT = Path(r"C:\Users\Orphen\Desktop\foro")
SOURCE = ROOT / "mascotas" / "Black-Dragon-NEW-27.03.2017" / "Black Dragon NEW"
FBX = SOURCE / "Dragon_Baked_Actions_fbx_7.4_binary.fbx"
OUT = ROOT / "3v-remix-forbiddens" / "public" / "mascot" / "dragon"
MODEL_OUT = OUT / "dragon_black_model.glb"
PREVIEW_OUT = OUT / "base.png"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_dragon():
    bpy.ops.import_scene.fbx(filepath=str(FBX))
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"LIGHT", "CAMERA"} or obj.name == "Cube":
            bpy.data.objects.remove(obj, do_unlink=True)

    armature = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not armature or not meshes:
        raise RuntimeError("No se encontro armature o mesh del dragon.")

    for obj in meshes:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        obj.rotation_euler[0] = math.radians(0)
        obj.location = (0, 0, 0)
        obj.scale = (1, 1, 1)
        for slot in obj.material_slots:
            material = slot.material
            if not material:
                continue
            material.use_nodes = True
            material.diffuse_color = (1, 1, 1, 1)

    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    return armature, meshes


def export_glb():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"ARMATURE", "MESH"}:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL_OUT),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_frame_range=False,
        export_force_sampling=True,
        export_nla_strips=True,
        export_morph=False,
        export_skins=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )


def render_preview(meshes):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = True
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.frame_set(18)

    coords = []
    for obj in meshes:
      coords.extend(obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box)
    mins = mathutils.Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
    maxs = mathutils.Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
    center = (mins + maxs) * 0.5
    size = maxs - mins

    for obj in meshes:
        for slot in obj.material_slots:
            material = slot.material
            if material:
                material.diffuse_color = (0.38, 0.055, 0.04, 1)

    camera = bpy.data.objects.new("Preview_Camera", bpy.data.cameras.new("Preview_Camera"))
    scene.collection.objects.link(camera)
    camera.location = center + mathutils.Vector((size.x * 0.58, -size.y * 1.45, size.z * 1.3))
    direction = center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.x, size.y) * 1.08
    scene.camera = camera

    light = bpy.data.objects.new("Preview_Key", bpy.data.lights.new("Preview_Key", "AREA"))
    scene.collection.objects.link(light)
    light.location = (1.8, -3.4, 4.8)
    light.data.energy = 650
    light.data.size = 4

    fill = bpy.data.objects.new("Preview_Fill", bpy.data.lights.new("Preview_Fill", "POINT"))
    scene.collection.objects.link(fill)
    fill.location = (-3.8, 2.4, 2.4)
    fill.data.energy = 90

    scene.render.filepath = str(PREVIEW_OUT)
    bpy.ops.render.render(write_still=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    clear_scene()
    _, meshes = import_dragon()
    export_glb()

    try:
        import mathutils  # noqa: F401
        render_preview(meshes)
    except Exception as exc:
        print(f"WARN preview no generado: {exc}")

    print(f"EXPORTED {MODEL_OUT}")
    print("ACTIONS", [(action.name, tuple(action.frame_range)) for action in bpy.data.actions])


if __name__ == "__main__":
    import mathutils

    main()
