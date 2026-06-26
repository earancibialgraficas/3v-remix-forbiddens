import bpy

keep_names = {
    "Rig-Alien-Animal",
    "Alien-Animal_PostProcessing",
    "Eyes-Alien-Animal",
}

for obj in bpy.context.scene.objects:
    obj.select_set(False)
    obj.hide_viewport = obj.name not in keep_names
    obj.hide_render = obj.name not in keep_names
    if obj.name in keep_names:
        obj.select_set(True)

print("=== KEPT ===")
for obj in bpy.context.scene.objects:
    if obj.name in keep_names:
        print(
            obj.name,
            "type=", obj.type,
            "selected=", obj.select_get(),
            "visible=", obj.visible_get(),
            "hide_viewport=", obj.hide_viewport,
            "hide_render=", obj.hide_render,
            "verts=", len(obj.data.vertices) if obj.type == "MESH" else "",
            "modifiers=", [m.type for m in obj.modifiers],
        )

print("=== SELECTED ===")
for obj in bpy.context.selected_objects:
    print(obj.name, obj.type)
