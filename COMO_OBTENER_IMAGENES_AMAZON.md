# Cómo Obtener Imágenes de Productos de Amazon

## Método 1: Copiar URL de Imagen Directamente (Recomendado)

1. **Ve a la página del producto en Amazon**
   - Usa el enlace que tienes en tu archivo `.txt`

2. **Encuentra la imagen principal del producto**
   - Generalmente es la imagen grande a la izquierda

3. **Copia la URL de la imagen:**
   - **Chrome/Edge:** Clic derecho en la imagen → "Copiar dirección de imagen"
   - **Firefox:** Clic derecho en la imagen → "Copiar ubicación de imagen"
   - **Safari:** Clic derecho en la imagen → "Copiar dirección de imagen"

4. **La URL se verá así:**
   ```
   https://m.media-amazon.com/images/I/81QZ1fV9+YL._AC_SL1500_.jpg
   ```

5. **Úsala directamente en `data/board-games.ts`:**
   ```typescript
   {
     name: 'Catan',
     imageUrl: 'https://m.media-amazon.com/images/I/81QZ1fV9+YL._AC_SL1500_.jpg',
     // ...
   }
   ```

## Método 2: Usar el Script Helper

Ejecuta el script para ver una lista de todos los juegos:

```bash
npx tsx scripts/get-amazon-images.ts data/board-games-input.txt
```

Esto te mostrará:
- Lista de todos los juegos
- Enlaces a las páginas de Amazon
- Instrucciones para obtener cada imagen

## Formato de URLs de Imagen de Amazon

Las URLs de imágenes de Amazon generalmente siguen este patrón:

```
https://m.media-amazon.com/images/I/[IMAGE_ID]._AC_SL[SIZE]_.jpg
```

Donde:
- `[IMAGE_ID]` es un identificador único del producto
- `[SIZE]` puede ser: `150`, `300`, `500`, `1000`, `1500`, etc.

**Recomendación:** Usa `_AC_SL1500_` o `_AC_SL1000_` para imágenes de buena calidad.

## Ejemplo Completo

Para Catan:

1. **Página del producto:** `https://www.amazon.com/dp/B0DYK1ZH2D?tag=kingdice-20`
2. **Copia la URL de la imagen principal**
3. **Actualiza en `data/board-games.ts`:**
   ```typescript
   {
     id: 'catan',
     name: 'Catan',
     imageUrl: 'https://m.media-amazon.com/images/I/81QZ1fV9+YL._AC_SL1500_.jpg',
     // ...
   }
   ```

## Ventajas de Usar Imágenes de Amazon

✅ **Ventajas:**
- Imágenes oficiales y de alta calidad
- Siempre actualizadas
- No necesitas almacenarlas localmente
- Se cargan directamente desde Amazon

⚠️ **Consideraciones:**
- Las URLs pueden cambiar si Amazon actualiza las imágenes
- Dependes de la disponibilidad de los servidores de Amazon
- Algunas imágenes pueden tener restricciones de hotlinking (pero generalmente funcionan)

## Fallback

El código ya tiene un fallback automático:
- Si la imagen de Amazon falla al cargar, se mostrará un placeholder
- Puedes tener imágenes locales como respaldo en `public/games/`

## Políticas de Amazon

✅ **Permitido:**
- Usar imágenes de productos de Amazon en tu sitio
- Mostrar imágenes de productos que estás promocionando
- Usar imágenes oficiales del producto

❌ **No permitido:**
- Modificar las imágenes de manera engañosa
- Usar imágenes de productos que no estás promocionando
- Ocultar que son productos de Amazon

