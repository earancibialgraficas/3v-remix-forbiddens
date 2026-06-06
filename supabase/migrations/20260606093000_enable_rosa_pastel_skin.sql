UPDATE shop_items
SET
  name = 'Rosa Pastel',
  description = 'Recolor rosa pastel para website y launcher. Cambia la interfaz completa a una paleta suave con contraste legible.',
  is_active = true,
  updated_at = now()
WHERE slug = 'angelical';
