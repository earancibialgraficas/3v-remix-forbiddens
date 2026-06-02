-- 🎨 Insertar los 3 Skins Principales en la Tienda (con UPSERT para evitar duplicados)

INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES 
  (
    'angelical',
    'Skin Angelical',
    'Estilo celestial rosado con nubes y corazones. Interfaz completa del website cambia a tema angelical ✨',
    15000,
    'stats',
    'launcher_skin',
    'lite',
    'https://images.unsplash.com/photo-1578987324336-f97497b91c42?w=400&h=300&fit=crop'
  ),
  (
    'demoniaco',
    'Skin Demoniaco',
    'Estilo oscuro rojo demoníaco con efectos de fuego infernal. Interfaz completa del website cambia a tema demoniaco 🔥',
    15000,
    'stats',
    'launcher_skin',
    'lite',
    'https://images.unsplash.com/photo-1576689238914-3b964a3a0a22?w=400&h=300&fit=crop'
  ),
  (
    'cyberpunk',
    'Skin Ciberpunk',
    'Estilo futurista con neón cyan y magenta. Interfaz completa del website cambia a tema ciberpunk 🌐',
    15000,
    'stats',
    'launcher_skin',
    'lite',
    'https://images.unsplash.com/photo-1571171438601-dfc41f1d2fd4?w=400&h=300&fit=crop'
  )
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- Marcos de avatar personalizables
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES
  (
    'princess_rose_01',
    'Marco Princesa Rosa I',
    'Marco rosa ornamental para tu avatar.',
    2000,
    'stats',
    'avatar_frame',
    'lite',
    '/avatar-frames/princess-rose-01/frame.svg'
  ),
  (
    'princess_rose_02',
    'Marco Princesa Rosa II',
    'Variante rosa brillante para destacar tu perfil.',
    2000,
    'stats',
    'avatar_frame',
    'lite',
    '/avatar-frames/princess-rose-02/frame.svg'
  ),
  (
    'princess_rose_03',
    'Marco Princesa Rosa III',
    'Marco rosa elegante con presencia de tienda premium.',
    2000,
    'stats',
    'avatar_frame',
    'lite',
    '/avatar-frames/princess-rose-03/frame.svg'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- Transiciones de perfil
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES
  (
    'fuego_infernal',
    'Transicion Fuego Infernal',
    'Intro de fuego con sonido para presentar tu perfil.',
    5000,
    'fcoins',
    'cosmetic',
    'novato',
    '/cosmetics/transitions/fuego/fuego-infernal.mp4'
  ),
  (
    'varita_magica',
    'Transicion Varita Magica',
    'Intro magica con sonido para presentar tu perfil.',
    5000,
    'fcoins',
    'cosmetic',
    'novato',
    '/cosmetics/transitions/varita-magica/varita-magica.mp4'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- Ejemplo de otros items que puedes agregar:
-- 📦 Cofres de Juegos
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES 
  (
    'game_chest_lite',
    'Cofre Gamer Lite',
    'Contiene 3 skins aleatorios para juegos multijugador',
    500,
    'fcoins',
    'game_chest',
    'lite',
    'https://images.unsplash.com/photo-1609710228159-0fa9817ba3a0?w=400&h=300&fit=crop'
  ),
  (
    'game_chest_premium',
    'Cofre Gamer Premium',
    'Contiene 5 skins aleatorios + 1 garantizado raro',
    1500,
    'fcoins',
    'game_chest',
    'legacy',
    'https://images.unsplash.com/photo-1609710228159-0fa9817ba3a0?w=400&h=300&fit=crop'
  )
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- 🎮 Skins para Agario
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES 
  (
    'agario_neon',
    'Skin Agario: Neón',
    'Skin exclusiva para Agario con colores neón brillantes',
    2000,
    'stats',
    'agario_skin',
    'lite',
    'https://images.unsplash.com/photo-1516383740770-fbdc00b4dc42?w=400&h=300&fit=crop'
  ),
  (
    'agario_fire',
    'Skin Agario: Fuego',
    'Skin exclusiva para Agario con efectos de fuego',
    2000,
    'stats',
    'agario_skin',
    'lite',
    'https://images.unsplash.com/photo-1609710228159-0fa9817ba3a0?w=400&h=300&fit=crop'
  )
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- ✨ Cosméticos (accesibles a Novatos con STATS)
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES 
  (
    'cosmetic_glow',
    'Efecto Glow',
    'Agrega un efecto de brillo a tu perfil',
    500,
    'stats',
    'cosmetic',
    'novato',
    'https://images.unsplash.com/photo-1618519764d7651dcd048bae83a12daf82b763209?w=400&h=300&fit=crop'
  ),
  (
    'cosmetic_particles',
    'Partículas Mágicas',
    'Agrega partículas animadas a tu perfil',
    750,
    'stats',
    'cosmetic',
    'novato',
    'https://images.unsplash.com/photo-1618519764d7651dcd048bae83a12daf82b763209?w=400&h=300&fit=crop'
  )
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;
