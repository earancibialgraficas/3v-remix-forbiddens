import bpy

for name in ["Alien-Animal_PostProcessing", "Eyes-Alien-Animal"]:
    obj = bpy.data.objects.get(name)
    if not obj:
        print(name, "missing")
        continue
    print("==", name, "==")
    print("type", obj.type)
    print("data", obj.data.name)
    print("verts", len(obj.data.vertices))
    print("edges", len(obj.data.edges))
    print("polygons", len(obj.data.polygons))
    print("materials", [m.name if m else None for m in obj.data.materials])
    print("users_collection", [c.name for c in obj.users_collection])
    print("display_type", obj.display_type)
    print("hide_get", obj.hide_get())
    print("visible_get", obj.visible_get())
    print("modifiers", [(m.name, m.type, getattr(m, "object", None).name if getattr(m, "object", None) else None) for m in obj.modifiers])
