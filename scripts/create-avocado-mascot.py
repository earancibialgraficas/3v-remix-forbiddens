import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "mascot" / "avocado"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ARMATURE_NAME = "Armature"
OUT_GLB = OUTPUT_DIR / "avocado_mascot.glb"
OUT_THUMB = OUTPUT_DIR / "base.png"

arm = bpy.data.objects.get(ARMATURE_NAME)
if arm is None:
    raise RuntimeError(f"Missing armature named {ARMATURE_NAME}")

arm.rotation_mode = "XYZ"

for obj in bpy.data.objects:
    if obj.animation_data:
        obj.animation_data_clear()
    obj.select_set(False)

arm.animation_data_create()

for bone in arm.pose.bones:
    bone.rotation_mode = "XYZ"

BODY = "Bone"
RIGHT_ARM = "Bendy"
LEFT_ARM = "Bendy.001"
RIGHT_LEG = "Bendy.002"
LEFT_LEG = "Bendy.003"


def reset_pose():
    arm.location = (0, 0, 0)
    arm.rotation_euler = (0, 0, 0)
    for pose_bone in arm.pose.bones:
        pose_bone.location = (0, 0, 0)
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


def set_bone(name, rotation=(0, 0, 0), location=(0, 0, 0), scale=(1, 1, 1)):
    bone = arm.pose.bones.get(name)
    if not bone:
        return
    bone.rotation_euler = tuple(math.radians(v) for v in rotation)
    bone.location = location
    bone.scale = scale


def key(frame):
    arm.keyframe_insert("location", frame=frame)
    arm.keyframe_insert("rotation_euler", frame=frame)
    for pose_bone in arm.pose.bones:
        pose_bone.keyframe_insert("rotation_euler", frame=frame)
        pose_bone.keyframe_insert("location", frame=frame)
        pose_bone.keyframe_insert("scale", frame=frame)


def make_action(name, frames, end_frame):
    reset_pose()
    action = bpy.data.actions.new(name)
    arm.animation_data.action = action
    for frame, pose in frames:
        reset_pose()
        arm.location = pose.get("root_location", (0, 0, 0))
        arm.rotation_euler = tuple(math.radians(v) for v in pose.get("root_rotation", (0, 0, 0)))
        for bone_name, values in pose.get("bones", {}).items():
            set_bone(
                bone_name,
                rotation=values.get("rotation", (0, 0, 0)),
                location=values.get("location", (0, 0, 0)),
                scale=values.get("scale", (1, 1, 1)),
            )
        key(frame)
    action.frame_start = 1
    action.frame_end = end_frame
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.frame_start = 1
    strip.frame_end = end_frame
    strip.action_frame_start = 1
    strip.action_frame_end = end_frame
    arm.animation_data.action = None


make_action(
    "idle",
    [
        (1, {"root_location": (0, 0, 0), "bones": {BODY: {"rotation": (0, 0, -2)}, RIGHT_ARM: {"rotation": (0, 0, 8)}, LEFT_ARM: {"rotation": (0, 0, -8)}}}),
        (24, {"root_location": (0, 0, 0.035), "bones": {BODY: {"rotation": (0, 0, 2)}, RIGHT_ARM: {"rotation": (0, 0, -4)}, LEFT_ARM: {"rotation": (0, 0, 4)}}}),
        (48, {"root_location": (0, 0, 0), "bones": {BODY: {"rotation": (0, 0, -2)}, RIGHT_ARM: {"rotation": (0, 0, 8)}, LEFT_ARM: {"rotation": (0, 0, -8)}}}),
    ],
    48,
)

make_action(
    "walk",
    [
        (1, {"root_location": (-0.12, 0, 0), "root_rotation": (0, 0, -4), "bones": {RIGHT_ARM: {"rotation": (0, 0, 22)}, LEFT_ARM: {"rotation": (0, 0, -18)}, RIGHT_LEG: {"rotation": (14, 0, 0)}, LEFT_LEG: {"rotation": (-14, 0, 0)}}}),
        (12, {"root_location": (0, 0, 0.04), "root_rotation": (0, 0, 4), "bones": {RIGHT_ARM: {"rotation": (0, 0, -18)}, LEFT_ARM: {"rotation": (0, 0, 22)}, RIGHT_LEG: {"rotation": (-14, 0, 0)}, LEFT_LEG: {"rotation": (14, 0, 0)}}}),
        (24, {"root_location": (0.12, 0, 0), "root_rotation": (0, 0, -4), "bones": {RIGHT_ARM: {"rotation": (0, 0, 22)}, LEFT_ARM: {"rotation": (0, 0, -18)}, RIGHT_LEG: {"rotation": (14, 0, 0)}, LEFT_LEG: {"rotation": (-14, 0, 0)}}}),
    ],
    24,
)

make_action(
    "talk",
    [
        (1, {"bones": {RIGHT_ARM: {"rotation": (0, 0, -22)}, LEFT_ARM: {"rotation": (0, 0, 22)}, BODY: {"scale": (1.02, 1.02, 0.98)}}}),
        (8, {"root_location": (0, 0, 0.025), "bones": {RIGHT_ARM: {"rotation": (0, 0, -8)}, LEFT_ARM: {"rotation": (0, 0, 8)}, BODY: {"scale": (0.98, 0.98, 1.03)}}}),
        (16, {"bones": {RIGHT_ARM: {"rotation": (0, 0, -22)}, LEFT_ARM: {"rotation": (0, 0, 22)}, BODY: {"scale": (1.02, 1.02, 0.98)}}}),
    ],
    16,
)

make_action(
    "happy",
    [
        (1, {"root_location": (0, 0, 0), "bones": {RIGHT_ARM: {"rotation": (0, 0, -58)}, LEFT_ARM: {"rotation": (0, 0, 58)}}}),
        (10, {"root_location": (0, 0, 0.18), "root_rotation": (0, 0, 7), "bones": {RIGHT_ARM: {"rotation": (0, 0, -76)}, LEFT_ARM: {"rotation": (0, 0, 76)}, RIGHT_LEG: {"rotation": (-10, 0, 0)}, LEFT_LEG: {"rotation": (-10, 0, 0)}}}),
        (20, {"root_location": (0, 0, 0), "root_rotation": (0, 0, -4), "bones": {RIGHT_ARM: {"rotation": (0, 0, -58)}, LEFT_ARM: {"rotation": (0, 0, 58)}}}),
    ],
    20,
)

make_action(
    "sad",
    [
        (1, {"root_location": (0, 0, -0.03), "root_rotation": (7, 0, 0), "bones": {BODY: {"scale": (1.05, 1.05, 0.92)}, RIGHT_ARM: {"rotation": (0, 0, 24)}, LEFT_ARM: {"rotation": (0, 0, -24)}}}),
        (28, {"root_location": (0, 0, -0.07), "root_rotation": (10, 0, 0), "bones": {BODY: {"scale": (1.07, 1.07, 0.9)}, RIGHT_ARM: {"rotation": (0, 0, 30)}, LEFT_ARM: {"rotation": (0, 0, -30)}}}),
    ],
    28,
)

make_action(
    "sleep",
    [
        (1, {"root_location": (0, 0, -0.18), "root_rotation": (0, 0, -82), "bones": {RIGHT_ARM: {"rotation": (0, 0, 18)}, LEFT_ARM: {"rotation": (0, 0, -18)}, RIGHT_LEG: {"rotation": (-10, 0, 0)}, LEFT_LEG: {"rotation": (-10, 0, 0)}}}),
        (36, {"root_location": (0, 0, -0.16), "root_rotation": (0, 0, -82), "bones": {BODY: {"scale": (1.03, 1.03, 0.97)}, RIGHT_ARM: {"rotation": (0, 0, 14)}, LEFT_ARM: {"rotation": (0, 0, -14)}, RIGHT_LEG: {"rotation": (-10, 0, 0)}, LEFT_LEG: {"rotation": (-10, 0, 0)}}}),
        (72, {"root_location": (0, 0, -0.18), "root_rotation": (0, 0, -82), "bones": {RIGHT_ARM: {"rotation": (0, 0, 18)}, LEFT_ARM: {"rotation": (0, 0, -18)}, RIGHT_LEG: {"rotation": (-10, 0, 0)}, LEFT_LEG: {"rotation": (-10, 0, 0)}}}),
    ],
    72,
)

make_action(
    "drag",
    [
        (1, {"root_location": (0, 0, 0.18), "root_rotation": (0, 0, 2), "bones": {BODY: {"scale": (0.95, 0.95, 1.08)}, RIGHT_ARM: {"rotation": (0, 0, 72)}, LEFT_ARM: {"rotation": (0, 0, -72)}, RIGHT_LEG: {"rotation": (-24, 0, 0)}, LEFT_LEG: {"rotation": (-24, 0, 0)}}}),
        (18, {"root_location": (0, 0, 0.2), "root_rotation": (0, 0, -2), "bones": {BODY: {"scale": (0.95, 0.95, 1.08)}, RIGHT_ARM: {"rotation": (0, 0, 64)}, LEFT_ARM: {"rotation": (0, 0, -64)}, RIGHT_LEG: {"rotation": (-18, 0, 0)}, LEFT_LEG: {"rotation": (-18, 0, 0)}}}),
    ],
    18,
)

reset_pose()

floor = bpy.data.objects.get("Plane")
if floor is not None:
    bpy.data.objects.remove(floor, do_unlink=True)

limbs = bpy.data.objects.get("Cylinder.001")
if limbs is not None:
    inverse = limbs.matrix_world.inverted()
    for vertex in limbs.data.vertices:
        world = limbs.matrix_world @ vertex.co
        side = 1 if world.x >= 0 else -1
        distance = abs(world.x) - 0.62
        if distance > 0 and world.z > 1.22:
            lowered = min(distance, 1.35)
            world.x = side * (0.62 + lowered * 0.32)
            world.z = 1.46 - lowered * 0.72
            vertex.co = inverse @ world
    limbs.data.update()

camera = bpy.data.objects.get("Camera") or bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
if not camera.users_collection:
    bpy.context.scene.collection.objects.link(camera)
camera.location = (0, -6.2, -0.45)
target = Vector((0, 0.12, 0.2))
direction = target - Vector(camera.location)
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 4.65
bpy.context.scene.camera = camera

for light in [obj for obj in bpy.data.objects if obj.type == "LIGHT"]:
    light.data.energy = 250
area = bpy.data.objects.get("MascotKeyLight")
if area is None:
    area = bpy.data.objects.new("MascotKeyLight", bpy.data.lights.new("MascotKeyLight", "AREA"))
    bpy.context.scene.collection.objects.link(area)
area.location = (0, -3, 4)
area.data.energy = 450
area.data.size = 5

bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.resolution_x = 512
bpy.context.scene.render.resolution_y = 512
bpy.context.scene.frame_set(1)
bpy.context.scene.render.filepath = str(OUT_THUMB)
bpy.ops.render.render(write_still=True)

export_kwargs = {
    "filepath": str(OUT_GLB),
    "export_format": "GLB",
    "export_animations": True,
    "export_nla_strips": True,
    "export_frame_range": False,
}
try:
    bpy.ops.export_scene.gltf(**export_kwargs)
except TypeError:
    export_kwargs.pop("export_frame_range", None)
    bpy.ops.export_scene.gltf(**export_kwargs)

print(f"Exported {OUT_GLB}")
print(f"Rendered {OUT_THUMB}")
