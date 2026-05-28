# 🚀 Guía: Almacenar Assets en Repositorio Aparte

**Objetivo**: Mantener los assets del tema demoniaco en un repositorio GitHub dedicado, sin usar el bucket de Supabase (que está casi lleno).

---

## 📌 Opción 1: GitHub + GitHub Raw CDN (RECOMENDADO - 🎯 Más Simple)

### Ventajas:
- ✅ Gratis
- ✅ Sin configuración de servidor
- ✅ URLs directas y estables
- ✅ Control de versiones
- ✅ Caché automático

### Pasos:

#### 1️⃣ Crear repositorio en GitHub
```bash
# En GitHub.com: Crear nuevo repositorio
# Nombre: forbiddens-skins-assets
# Descripción: CDN para assets de skins del website/launcher
# Visibilidad: Public
# NO inicializar con README (lo haremos nosotros)
```

#### 2️⃣ Clonar el repositorio localmente
```bash
cd c:\Users\Orphen\Desktop\foro
git clone https://github.com/tu-usuario/forbiddens-skins-assets.git
cd forbiddens-skins-assets
```

#### 3️⃣ Crear estructura de carpetas
```
forbiddens-skins-assets/
├── demoniaco/
│   ├── backgrounds/
│   ├── textures/
│   ├── launcher-topbar/
│   ├── panels/
│   ├── inventory-slots/
│   ├── buttons/
│   ├── badges/
│   ├── decorations/
│   ├── icons/
│   └── README.md
├── angelical/
├── cyberpunk/
├── README.md
└── .gitignore
```

#### 4️⃣ Agregar .gitignore
```
# forbiddens-skins-assets/.gitignore
.DS_Store
Thumbs.db
*.psd
node_modules/
.env
```

#### 5️⃣ Crear README.md
```markdown
# Forbiddens Skins Assets

CDN centralizado para todos los assets de skins del website y launcher de Forbiddens.

## Uso

### URLs de Assets
```
https://raw.githubusercontent.com/tu-usuario/forbiddens-skins-assets/main/demoniaco/backgrounds/main-bg.webp
```

### Temas Disponibles
- `demoniaco` - Tema demoniaco rojo fuego
- `angelical` - Tema angelical rosa
- `cyberpunk` - Tema ciberpunk neón
```

#### 6️⃣ Copiar assets (que crearás luego)
```bash
# Copiar todos los .webp generados a las carpetas correspondientes
cp /ruta/a/tus/assets/* demoniaco/backgrounds/
# etc.
```

#### 7️⃣ Pushear a GitHub
```bash
git add .
git commit -m "feat: Add demoniaco skin assets"
git push origin main
```

---

## 📌 Opción 2: jsDelivr CDN (MEJOR PERFORMANCE)

### Ventajas:
- ✅ CDN global (más rápido)
- ✅ Caché agresivo
- ✅ URLs idénticas a GitHub Raw
- ✅ Purge automático

### Uso:
Simplemente reemplaza las URLs:
```
GitHub Raw:    https://raw.githubusercontent.com/usuario/repo/main/path/file.webp
jsDelivr:      https://cdn.jsdelivr.net/gh/usuario/repo@main/path/file.webp
```

**Ejemplo:**
```
https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp
```

---

## 📌 Opción 3: Vercel + GitHub (ALTERNATIVA)

Si quieres hosting más robusto:

```bash
# 1. Crear proyecto Vercel conectado a GitHub
vercel --prod

# 2. Configurar vercel.json
{
  "headers": [
    {
      "source": "/demoniaco/:path*",
      "headers": [
        {"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}
      ]
    }
  ]
}

# 3. URLs sería: https://forbiddens-skins.vercel.app/demoniaco/backgrounds/main-bg.webp
```

---

## 🔗 Actualizar URLs en la Aplicación

### En `populate_shop.sql`
```sql
-- Anterior (Supabase):
-- https://images.unsplash.com/...

-- Nuevo (GitHub Raw):
UPDATE shop_items 
SET image_url = 'https://raw.githubusercontent.com/tu-usuario/forbiddens-skins-assets/main/demoniaco/backgrounds/main-bg.webp'
WHERE slug = 'demoniaco';

-- O con jsDelivr:
UPDATE shop_items 
SET image_url = 'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp'
WHERE slug = 'demoniaco';
```

### En TypeScript (si usas URLs directas)
```tsx
// src/lib/skinUrls.ts (NUEVO)
export const SKIN_ASSETS = {
  demoniaco: {
    background: 'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp',
    topbarLogo: 'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/launcher-topbar/topbar-logo-glow.webp',
    // ... más assets
  },
};
```

---

## 📊 Comparación de Opciones

| Criterio | GitHub Raw | jsDelivr | Vercel |
|----------|-----------|---------|--------|
| Costo | $0 | $0 | $0 (free tier) |
| Performance | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Facilidad | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Control | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Escalabilidad | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**🎯 RECOMENDACIÓN**: GitHub Raw + jsDelivr (mejor balance)

---

## 🎨 Herramientas para Crear Assets

Si necesitas generar los assets, aquí están las herramientas:

### Online (Sin instalar):
1. **Photopea.com** - Editor Photoshop-like online
2. **Figma.com** - Diseño vectorial colaborativo
3. **Pixlr.com** - Editor de imágenes online
4. **Canva.com** - Diseño rápido (plantillas)

### Escritorio:
1. **GIMP** - Fotoshop gratuito
2. **Krita** - Pintura digital
3. **Aseprite** - Pixel art (pago, pero vale la pena)

### Generación Automática (con IA):
1. **ChatGPT + DALL-E** - Generar conceptos
2. **Midjourney** - Imágenes high-quality
3. **Stable Diffusion** - Local, gratis

---

## 🔒 Optimizaciones de Performance

### Comprimir WebP
```bash
# Instalar cwebp
# Windows: descargar de https://developers.google.com/speed/webp/download

# Comprimir una imagen
cwebp -q 80 imagen.png -o imagen.webp

# Batch compress
for %f in (*.png) do cwebp -q 80 %f -o %~nf.webp
```

### Usar Lazy Loading en la App
```tsx
<img 
  src={assetUrl} 
  loading="lazy"
  alt="Demoniaco Skin Background"
/>
```

---

## 📝 Checklist Final

- [ ] Crear repositorio `forbiddens-skins-assets` en GitHub
- [ ] Clonar localmente
- [ ] Crear estructura de carpetas
- [ ] Agregar .gitignore y README.md
- [ ] Generar/conseguir assets del tema demoniaco (60-70 archivos)
- [ ] Copiar assets a las carpetas correspondientes
- [ ] Pushear a GitHub (primer commit)
- [ ] Verificar URLs son accesibles (test 2-3 URLs)
- [ ] Actualizar `populate_shop.sql` con nuevas URLs
- [ ] Actualizar base de datos Supabase
- [ ] Probar en desarrollo que se cargan las imágenes
- [ ] Deployar a producción

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si quiero cambiar una imagen?**
A: Actualiza el archivo en el repositorio, haz commit/push, y la URL sigue siendo la misma. jsDelivr tiene un purge automático.

**P: ¿Hay límite de tamaño?**
A: GitHub permite 100 MB por archivo. Nuestros assets (.webp comprimidos) serán mucho más pequeños.

**P: ¿Y si necesito versiones diferentes de una imagen?**
A: Usa branches o crea carpetas adicionales: `demoniaco-v1`, `demoniaco-v2`, etc.

**P: ¿Puedo usar más de un repositorio?**
A: Sí, puedes tener `forbiddens-skins-assets`, `forbiddens-ui-assets`, etc.
