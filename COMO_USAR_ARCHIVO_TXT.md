# Cómo Usar el Archivo .txt para Procesar Juegos

## Formato del Archivo

Crea un archivo `data/board-games-input.txt` con el siguiente formato:

```
Game Name|Amazon URL|Category|Players|PlayTime|AgeRange
```

### Ejemplo:

```
Catan|https://www.amazon.com/dp/B0DYK1ZH2D?tag=kingdice-20|Strategy|3-4|60-90 min|10+
Ticket to Ride|https://www.amazon.com/dp/B000W7JWUA?tag=kingdice-20|Family|2-5|30-60 min|8+
Wingspan|https://www.amazon.com/dp/B07G1J1Q1X?tag=kingdice-20|Strategy|1-5|40-70 min|10+
```

## Campos

- **Game Name**: Nombre del juego (requerido)
- **Amazon URL**: Enlace completo de Amazon con tu tag (requerido)
- **Category**: Categoría (opcional): Strategy, Family, Cooperative, Abstract, etc.
- **Players**: Número de jugadores (opcional): "2-4", "3-5", etc.
- **PlayTime**: Tiempo de juego (opcional): "30-60 min", "60-90 min", etc.
- **AgeRange**: Edad recomendada (opcional): "8+", "10+", "12+", etc.

## Cómo Ejecutar el Script

### Opción 1: Solo generar código TypeScript (sin añadir a BD)

```bash
npx tsx scripts/process-board-games.ts data/board-games-input.txt
```

### Opción 2: Procesar y añadir automáticamente a la base de datos ⭐ RECOMENDADO

```bash
npx tsx scripts/process-board-games-to-db.ts data/board-games-input.txt
```

Este script:
- ✅ Lee el archivo .txt
- ✅ Verifica qué juegos NO están en la base de datos
- ✅ Los añade automáticamente a la base de datos
- ✅ Genera el código TypeScript para el shop

**Nota:** Asegúrate de que tu servidor de desarrollo esté corriendo (`npm run dev`) para que el script pueda conectarse a la API.

## Qué Hace el Script

### Script Básico (`process-board-games.ts`):
1. **Lee el archivo .txt** línea por línea
2. **Extrae el ASIN** del enlace de Amazon
3. **Genera un ID único** para cada juego
4. **Crea la ruta de imagen** (`/games/nombre-del-juego.jpg`)
5. **Genera una descripción básica** (puedes personalizarla después)
6. **Genera código TypeScript** listo para copiar en `data/board-games.ts`

### Script Avanzado (`process-board-games-to-db.ts`):
1. **Hace todo lo del script básico** +
2. **Verifica qué juegos NO están en la base de datos**
3. **Los añade automáticamente** usando la API `/api/boardgames`
4. **Parsea jugadores y tiempo de juego** automáticamente
5. **Genera el código TypeScript** para el shop

**Ventaja:** Los juegos quedan disponibles tanto en la base de datos principal como en el shop.

## Ejemplo de Salida

El script generará código TypeScript como este:

```typescript
export const boardGames: BoardGame[] = [
  {
    id: 'catan',
    name: 'Catan',
    description: 'Experience Catan, a strategy board game...',
    imageUrl: '/games/catan.jpg',
    amazonUrl: createAmazonLink('B0DYK1ZH2D'),
    asin: 'B0DYK1ZH2D',
    category: 'Strategy',
    players: '3-4',
    playTime: '60-90 min',
    ageRange: '10+',
    price: '$0.00', // TODO: Update with current price from Amazon
  },
  // ... más juegos
];
```

## Pasos Siguientes

1. **Copia el código generado** en `data/board-games.ts`
2. **Actualiza los precios** manualmente desde Amazon
3. **Añade imágenes** a `public/games/` con los nombres generados
4. **Personaliza las descripciones** si lo deseas

## Notas

- Las líneas que empiezan con `#` son comentarios y se ignoran
- Las líneas vacías se ignoran
- Si falta el ASIN en la URL, el script mostrará un error
- El script genera IDs basados en el nombre del juego (lowercase, sin espacios)

## Imágenes

Después de procesar, necesitarás:

1. **Descargar imágenes** de los productos de Amazon o del fabricante
2. **Guardarlas** en `public/games/` con los nombres generados
3. **Formato recomendado**: JPG, 400x400px o más grande

## Políticas de Amazon Associates

✅ **Permitido:**
- Mostrar información del producto (nombre, descripción, precio)
- Usar imágenes oficiales del producto
- Añadir tu propia descripción o reseña
- Categorizar y organizar productos

❌ **No permitido:**
- Modificar información del producto de manera engañosa
- Hacer afirmaciones falsas
- Usar imágenes de terceros sin permiso
- Omitir la disclosure requerida

