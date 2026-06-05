# Musica del Chill Player en Cloudflare R2

El reproductor `ChillMusicPlayer` carga primero desde Cloudflare R2 usando un manifest. Si el manifest no existe o falla, usa el bucket antiguo de Supabase `musica` como respaldo.

## Estructura recomendada en R2

Sube las canciones manteniendo estas carpetas:

```text
chillmusicplayer/
  manifest.json
  lofi/
  metal/
  rap/
```

## Manifest

Crea `manifest.json` en la raiz del bucket `chillmusicplayer`.

Para el bucket actual, sube este archivo como `manifest.json`:

```text
chillmusicplayer-manifest.json
```

La URL publica esperada es:

```text
https://pub-4bb704929f55442f8d9fa2e0cdde97ec.r2.dev/manifest.json
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
https://pub-4bb704929f55442f8d9fa2e0cdde97ec.r2.dev/manifest.json
```

`VITE_MUSIC_LIBRARY_BASE_URL` es opcional si el manifest ya trae `baseUrl`.

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
