# Explicación de Enlaces de Amazon Associates

## Diferentes Formatos de Enlaces

Amazon Associates permite varios formatos de enlaces. Todos funcionan, pero tienen diferentes características:

### 1. Link Corto de SiteStripe (`amzn.to/XXXXX`)
**Ejemplo:** `https://amzn.to/44HwQwD`

✅ **Ventajas:**
- Más corto y fácil de compartir
- Ya incluye tu tag de tracking
- Funciona perfectamente

⚠️ **Desventajas:**
- No puedes ver el ASIN directamente
- Menos transparente para el usuario
- Puede ser bloqueado por algunos filtros

### 2. Link Largo de SiteStripe (Recomendado ⭐)
**Ejemplo:** `https://www.amazon.com/dp/B0DYK1ZH2D?coliid=...&tag=kingdice-20&linkId=...&ref_=as_li_ss_tl`

✅ **Ventajas:**
- Incluye parámetros de tracking adicionales (`linkId`, `ref_`, etc.)
- Más información para Amazon sobre el origen del clic
- Puede ayudar con mejor tracking y reportes
- Transparente (se ve el ASIN)

✅ **Funciona perfectamente** - Este es el formato más completo

### 3. Link Básico (`/dp/ASIN?tag=YOUR_TAG`)
**Ejemplo:** `https://www.amazon.com/dp/B0DYK1ZH2D?tag=kingdice-20`

✅ **Ventajas:**
- Formato mínimo requerido
- Simple y limpio
- Funciona perfectamente
- Fácil de generar automáticamente

✅ **Funciona perfectamente** - Este es el formato que genera la función `createAmazonLink()`

## ¿Cuál Usar?

### Recomendación: **Usa el Link Largo de SiteStripe cuando esté disponible**

**Razones:**
1. Tiene parámetros de tracking adicionales que pueden ayudar
2. Amazon lo genera específicamente para tu cuenta
3. Incluye información sobre el origen del enlace

**Pero:**
- El link básico (`/dp/ASIN?tag=kingdice-20`) **también funciona perfectamente**
- Ambos formatos son válidos según las políticas de Amazon Associates
- Ambos te darán comisiones si alguien compra

## Cómo Actualizar el Código

### Opción 1: Usar el Link Completo de SiteStripe (Recomendado)

En `data/board-games.ts`, puedes usar el link completo directamente:

```typescript
{
  id: '1',
  name: 'Catan',
  amazonUrl: 'https://www.amazon.com/dp/B0DYK1ZH2D?coliid=...&tag=kingdice-20&linkId=...&ref_=as_li_ss_tl',
  asin: 'B0DYK1ZH2D',
  // ...
}
```

### Opción 2: Usar Solo el ASIN (Funciona Perfectamente)

```typescript
{
  id: '1',
  name: 'Catan',
  amazonUrl: createAmazonLink('B0DYK1ZH2D'), // Genera: /dp/B0DYK1ZH2D?tag=kingdice-20
  asin: 'B0DYK1ZH2D',
  // ...
}
```

## Función Actualizada

He actualizado el código para que puedas usar cualquier formato:

```typescript
// Usa el link completo de SiteStripe si lo tienes
amazonUrl: 'https://www.amazon.com/dp/B0DYK1ZH2D?coliid=...&tag=kingdice-20&...'

// O usa solo el ASIN (funciona igual de bien)
amazonUrl: createAmazonLink('B0DYK1ZH2D')
```

## Verificación

Para verificar que tu link funciona:

1. **Abre el link** en una nueva pestaña
2. **Verifica que:**
   - La página del producto se carga correctamente
   - En la URL aparece `tag=kingdice-20`
   - El producto es el correcto

## Políticas de Amazon Associates

Según las políticas de Amazon Associates:

✅ **Permitido:**
- Usar cualquier formato de enlace que incluya tu tag
- Usar links cortos (amzn.to)
- Usar links largos con parámetros adicionales
- Usar links básicos con solo el tag

❌ **No permitido:**
- Modificar el tag de otro afiliado
- Usar links sin tag
- Ocultar que es un enlace de afiliado (debe abrir en nueva pestaña)

## Conclusión

**Ambos formatos funcionan perfectamente:**
- ✅ Link largo de SiteStripe: Más completo, mejor tracking
- ✅ Link básico (`/dp/ASIN?tag=kingdice-20`): Más simple, funciona igual

**Mi recomendación:** Usa el link largo de SiteStripe cuando lo tengas, pero el básico funciona perfectamente si prefieres simplicidad.

