import math
from pathlib import Path

import bpy


ROOT = Path(r"C:\Users\Orphen\Desktop\foro")
SOURCE = ROOT / "mascotas" / "Black-Dragon-NEW-27.03.2017" / "Black Dragon NEW"
FBX = SOURCE / "Dragon_Baked_Actions_fbx_7.4_binary.fbx"
OUT = ROOT / "3v-remix-forbiddens" / "public" / "mascot" / "dragon"
MODEL_OUT = OUT / "dragon_black_model.glb"
PREVIEW_OUT = OUT / "base.png"


def pose_bone(armature, name, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bone = armature.pose.bones.get(name)
    if not bone:
        return
    bone.rotation_mode = "XYZ"
    bone.rotation_euler = tuple(math.radians(value) for value in rotation)
    bone.scale = scale


def key_all_pose_bones(armature, frame):
    bpy.context.scene.frame_set(frame)
    for bone in armature.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame)
        bone.keyframe_insert(data_path="scale", frame=frame)


def reset_pose(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def apply_sleep_pose(armature, intensity=1.0, breathe=0.0):
    def mul(values):
        return tuple(value * intensity for value in values)

    chest_scale = 1 + breathe * 0.035
    belly_scale = 1 + breathe * 0.045

    pose_bone(armature, "pelvic_1", mul((-18, 0, 0)))
    pose_bone(armature, "pelvic_2", mul((-12, 0, 0)))
    pose_bone(armature, "paunch", mul((-10, 0, 0)), (belly_scale, belly_scale, belly_scale))
    pose_bone(armature, "breast", mul((18, 0, 0)), (chest_scale, chest_scale, chest_scale))

    pose_bone(armature, "ACT_neck_4", mul((28, -8, 10)))
    pose_bone(armature, "ACT_neck_3", mul((24, -7, 8)))
    pose_bone(armature, "ACT_neck_2", mul((20, -5, 6)))
    pose_bone(armature, "ACT_neck_1", mul((18, -4, 4)))
    pose_bone(armature, "head", mul((16, 0, -10)))

    pose_bone(armature, "tail_1", mul((0, 0, 42)))
    pose_bone(armature, "tail_2", mul((0, 0, 54)))
    pose_bone(armature, "tail_3", mul((0, 0, 62)))
    pose_bone(armature, "ik_ACT_tail_5", mul((0, 0, 72)))

    for side, sign in (("L", 1), ("R", -1)):
        pose_bone(armature, f"Oberschenkel_{side}", mul((-34, 10 * sign, 18 * sign)))
        pose_bone(armature, f"lowerleg_{side}", mul((54, 0, -14 * sign)))
        pose_bone(armature, f"upper_arm_{side}", mul((22, 22 * sign, 36 * sign)))
        pose_bone(armature, f"ik_underarm_{side}", mul((48, 6 * sign, -22 * sign)))
        pose_bone(armature, f"Hand_{side}", mul((0, 0, 22 * sign)))
        pose_bone(armature, f"w_C_{side}", mul((48, 0, 48 * sign)))
        pose_bone(armature, f"w1_{side}", mul((28, 0, 34 * sign)))
        pose_bone(armature, f"w2_{side}", mul((22, 0, 28 * sign)))
        pose_bone(armature, f"w3_{side}", mul((18, 0, 22 * sign)))
        pose_bone(armature, f"w4_{side}", mul((30, 0, 28 * sign)))
        pose_bone(armature, f"w5_{side}", mul((24, 0, 20 * sign)))
        pose_bone(armature, f"w6_{side}", mul((18, 0, 16 * sign)))
        pose_bone(armature, f"w7_{side}", mul((34, 0, 22 * sign)))
        pose_bone(armature, f"w8_{side}", mul((24, 0, 16 * sign)))
        pose_bone(armature, f"w9_{side}", mul((16, 0, 10 * sign)))


def create_sleep_actions(armature):
    actions = [
        ("FORBIDDENS_Lie_Down", ((1, 0.0, 0.0), (24, 0.35, 0.0), (52, 0.72, 0.0), (82, 1.0, 0.0))),
        ("FORBIDDENS_Sleep_Loop", ((1, 1.0, 0.0), (34, 1.0, 1.0), (68, 1.0, 0.0), (102, 1.0, -0.65), (136, 1.0, 0.0))),
        ("FORBIDDENS_Wake_Up", ((1, 1.0, 0.0), (24, 0.7, 0.0), (48, 0.28, 0.0), (72, 0.0, 0.0))),
    ]

    for action_name, keyframes in actions:
        action = bpy.data.actions.new(action_name)
        armature.animation_data_create()
        armature.animation_data.action = action
        for frame, intensity, breathe in keyframes:
            reset_pose(armature)
            apply_sleep_pose(armature, intensity=intensity, breathe=breathe)
            key_all_pose_bones(armature, frame)
        action.use_fake_user = True
    reset_pose(armature)


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
        bpy.ops.object.shade_smooth()
        normal_modifier = obj.modifiers.new("FORBIDDENS_weighted_normals", "WEIGHTED_NORMAL")
        normal_modifier.keep_sharp = True
        normal_modifier.weight = 50
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
    armature, meshes = import_dragon()
    create_sleep_actions(armature)
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
