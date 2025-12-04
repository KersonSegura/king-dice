# Cómo Obtener Enlaces de Amazon Associates

## Método 1: Usar la Herramienta de Amazon Associates (Recomendado)

### Paso 1: Acceder a SiteStripe
1. Ve a [Amazon Associates Central](https://affiliate-program.amazon.com/)
2. Inicia sesión con tu cuenta
3. En el menú, busca **"Tools"** → **"SiteStripe"**
4. Activa SiteStripe (si no está activado)

### Paso 2: Generar Enlaces
1. Abre una nueva pestaña y ve a Amazon.com
2. Busca el juego de mesa que quieres (ej: "Catan board game")
3. En la página del producto, verás una barra amarilla en la parte superior (SiteStripe)
4. Haz clic en **"Get Link"** o **"Text"**
5. Copia el enlace generado - ya incluirá tu tag `kingdice-20`

### Paso 3: Extraer el ASIN
El ASIN está en la URL del producto:
- URL: `https://www.amazon.com/dp/B000W7JWUA`
- ASIN: `B000W7JWUA` (el código después de `/dp/`)

## Método 2: Construir el Enlace Manualmente

### Paso 1: Encontrar el ASIN
1. Ve a la página del producto en Amazon
2. El ASIN está en:
   - La URL: `amazon.com/dp/ASIN_AQUI`
   - O en los detalles del producto (scroll hacia abajo)

### Paso 2: Construir el Enlace
Formato: `https://www.amazon.com/dp/ASIN?tag=kingdice-20`

Ejemplo:
- ASIN: `B000W7JWUA`
- Enlace: `https://www.amazon.com/dp/B000W7JWUA?tag=kingdice-20`

## Método 3: Usar el Código que Ya Tienes

Ya tienes configurado `kingdice-20` en `data/board-games.ts`. Solo necesitas:

1. **Encontrar el ASIN** del juego en Amazon
2. **Usar la función `createAmazonLink()`** que ya está en el código:

```typescript
// Ejemplo en data/board-games.ts
{
  id: '1',
  name: 'Catan',
  amazonUrl: createAmazonLink('B000W7JWUA'), // Solo necesitas el ASIN
  // ... resto de datos
}
```

La función automáticamente añadirá `?tag=kingdice-20` al enlace.

## Cómo Encontrar ASINs de Juegos Populares

### Opción 1: Buscar en Amazon
1. Ve a Amazon.com
2. Busca el juego (ej: "Ticket to Ride board game")
3. Abre la página del producto
4. El ASIN está en la URL o en los detalles

### Opción 2: Lista de ASINs Comunes
Aquí tienes algunos ASINs de juegos populares (verifica que sean correctos):

- **Catan**: `B000W7JWUA`
- **Ticket to Ride**: `B000W7JWUA` (verificar)
- **Wingspan**: `B07G1J1Q1X`
- **Azul**: `B075GQJ3LL`
- **Pandemic**: `B00A2HD40E`
- **Splendor**: `B00IEZH0DE`

⚠️ **Importante**: Siempre verifica el ASIN en la página real del producto en Amazon.

## Verificar que el Enlace Funciona

1. Construye el enlace: `https://www.amazon.com/dp/ASIN?tag=kingdice-20`
2. Ábrelo en una nueva pestaña
3. Verifica que:
   - La página del producto se carga correctamente
   - En la URL aparece `tag=kingdice-20`
   - El producto es el correcto

## Ejemplo Completo

Para añadir "Catan" a tu tienda:

1. **Buscar en Amazon**: "Catan board game"
2. **Encontrar ASIN**: En la URL ves `amazon.com/dp/B000W7JWUA` → ASIN es `B000W7JWUA`
3. **Añadir al código**:
```typescript
{
  id: '1',
  name: 'Catan',
  description: 'The classic strategy game...',
  imageUrl: '/games/catan.jpg',
  amazonUrl: createAmazonLink('B000W7JWUA'), // ✅ Automáticamente añade ?tag=kingdice-20
  price: '$49.99',
  rating: 4.8,
  players: '3-4',
  playTime: '60-90 min',
  category: 'Strategy',
  ageRange: '10+'
}
```

4. **Resultado**: El enlace será `https://www.amazon.com/dp/B000W7JWUA?tag=kingdice-20`

## Consejos

- ✅ Usa SiteStripe de Amazon para generar enlaces fácilmente
- ✅ Verifica siempre que el ASIN sea correcto
- ✅ El código `kingdice-20` ya está configurado, solo necesitas los ASINs
- ✅ Guarda los ASINs en un documento para referencia futura
- ❌ No uses enlaces acortados (bit.ly, etc.) - Amazon no los permite
- ❌ No modifiques los enlaces después de generarlos

## ¿Necesitas Ayuda?

Si tienes problemas:
1. Verifica que tu cuenta de Amazon Associates esté activa
2. Confirma que `kingdice-20` es tu tag correcto
3. Prueba el enlace en modo incógnito para verificar que funciona

