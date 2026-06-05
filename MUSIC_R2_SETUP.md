# Musica del Chill Player en Cloudflare R2

El reproductor `ChillMusicPlayer` carga la musica estatica desde Cloudflare R2 usando un manifest local del website. Supabase queda reservado para tablas y texto, no para estos archivos.

## Estructura recomendada en R2

Sube las canciones manteniendo estas carpetas:

```text
chillmusicplayer/
  lofi/
  metal/
  rap/
```

## Manifest

El manifest vive en el website para evitar problemas de CORS al hacer `fetch` desde el navegador:

```text
public/chillmusicplayer-manifest.json
```

La URL publica del manifest en el website sera:

```text
/chillmusicplayer-manifest.json
```

Formato base:

```json
{
  "baseUrl": "https://TU_DOMINIO_PUBLICO_R2",
  "folders": [
    {
      "path": "lofi",
      "name": "Lofi Hip-Hop",
      "files": ["cancion-1.mp3", "cancion-2.mp3"]
    },
    {
      "path": "metal",
      "name": "Metal",
      "files": ["cancion-1.mp3"]
    },
    {
      "path": "rap",
      "name": "Rap",
      "files": ["cancion-1.mp3"]
    }
  ]
}
```

Tambien puedes usar URLs completas por cancion:

```json
{
  "songs": [
    {
      "id": "lofi-1",
      "title": "Lofi Track",
      "url": "https://TU_DOMINIO_PUBLICO_R2/musica/Lofi%20Hip%20Hop%20zelda/lofi-1.mp3",
      "category": "Lofi Hip-Hop"
    }
  ]
}
```

## Variables en Vercel

Agrega estas variables al proyecto:

```text
VITE_MUSIC_LIBRARY_MANIFEST_URL=https://TU_DOMINIO_PUBLICO_R2/manifest.json
VITE_MUSIC_LIBRARY_BASE_URL=https://TU_DOMINIO_PUBLICO_R2
```

Para el bucket actual no es obligatorio configurar variables, porque el codigo ya usa por defecto:

```text
/chillmusicplayer-manifest.json
```

`VITE_MUSIC_LIBRARY_BASE_URL` es opcional si el manifest ya trae `baseUrl`.

Si el manifest no existe o esta mal nombrado, la libreria estatica de musica no cargara. No hay fallback a Supabase.

## CORS

El dominio publico de R2 debe permitir `GET` y `HEAD` desde el website y el launcher. Para probar rapido, puede permitir origen `*` mientras verificas que todo carga bien.

Configuracion sugerida:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```
