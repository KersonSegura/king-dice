# Cómo Obtener Precios de Amazon - Guía Completa

## El Problema

Amazon no permite obtener precios automáticamente sin la Product Advertising API (PA-API), que requiere:
- Cuenta de Amazon Associates aprobada
- Al menos 3 ventas calificadas en 180 días
- Aprobación de Amazon

## Soluciones Disponibles

### Opción 1: Actualización Manual (Recomendada - Gratis y Legal) ⭐

**Ventajas:**
- ✅ 100% legal y seguro
- ✅ Gratis
- ✅ No requiere aprobaciones
- ✅ Siempre funciona

**Desventajas:**
- ⚠️ Requiere tiempo manual
- ⚠️ Necesitas actualizar periódicamente

**Cómo hacerlo:**

1. **Usa el script helper:**
   ```bash
   npx tsx scripts/fetch-amazon-prices-manual.ts
   ```
   Esto te mostrará todos los juegos que necesitan precios.

2. **Para cada juego:**
   - Abre el enlace de Amazon
   - Busca el precio cerca del botón "Add to Cart"
   - Si hay descuento, busca el precio original (tachado)
   - Busca el rating en las estrellas
   - Actualiza `data/board-games.ts`

3. **Formato:**
   ```typescript
   {
     price: '$29.99',
     originalPrice: '$54.99', // Solo si hay descuento
     rating: 4.8,
   }
   ```

### Opción 2: Keepa API (Servicio de Terceros - De Pago)

**Keepa** es un servicio que rastrea precios de Amazon y ofrece una API.

**Ventajas:**
- ✅ Automático
- ✅ Historial de precios
- ✅ Datos de descuentos

**Desventajas:**
- ❌ Requiere suscripción (aproximadamente $20-50/mes)
- ❌ Necesitas registrarte y pagar
- ⚠️ Puede tener límites de requests

**Cómo obtenerlo:**
1. Ve a [Keepa.com](https://keepa.com/)
2. Regístrate para la API
3. Obtén tu API key
4. Integra con el código

**Ejemplo de implementación:**
```typescript
// Necesitarías instalar: npm install axios
import axios from 'axios';

async function getPriceFromKeepa(asin: string) {
  const response = await axios.get(`https://api.keepa.com/product`, {
    params: {
      key: process.env.KEEPA_API_KEY,
      domain: 1, // 1 = Amazon.com
      asin: asin,
      stats: 60, // Últimos 60 días
    }
  });
  
  // Keepa devuelve datos en formato especial
  // Necesitas procesar la respuesta según su documentación
  return response.data;
}
```

### Opción 3: Scraping con Servicios Proxy (Riesgoso - No Recomendado)

**Servicios como:**
- ScraperAPI
- Bright Data (anteriormente Luminati)
- Smartproxy

**Ventajas:**
- ✅ Puede funcionar automáticamente
- ✅ Algunos servicios manejan rotación de IPs

**Desventajas:**
- ❌ **Violan los términos de servicio de Amazon**
- ❌ Pueden resultar en bloqueo de cuenta
- ❌ Costosos (pueden ser $50-200/mes)
- ❌ No confiables (Amazon puede cambiar su estructura)
- ❌ Riesgo legal

**⚠️ NO RECOMENDADO** - Puede resultar en:
- Bloqueo de tu cuenta de Amazon Associates
- Acciones legales de Amazon
- Pérdida de acceso a tu cuenta

### Opción 4: Amazon Product Advertising API (Ideal - Pero Requiere Aprobación)

**Cómo obtener acceso:**

1. **Asegúrate de cumplir requisitos:**
   - Cuenta de Amazon Associates activa
   - Al menos 3 ventas calificadas en 180 días
   - Sitio web activo con tráfico

2. **Solicita acceso:**
   - Ve a [Amazon Associates Central](https://affiliate-program.amazon.com/)
   - Tools → Product Advertising API
   - Request Access
   - Completa el formulario

3. **Una vez aprobado:**
   - Obtendrás Access Key y Secret Key
   - Puedes usar la API oficial
   - Es gratis para Associates

**Ver guía completa:** `AMAZON_PA_API_SETUP.md`

## Recomendación

### Para Empezar (Ahora):
**Usa actualización manual** - Es la forma más segura y rápida de empezar.

1. Ejecuta el script helper
2. Visita cada página de Amazon
3. Copia los precios
4. Actualiza el archivo

### A Mediano Plazo:
**Solicita acceso a PA-API** - Mientras tanto, actualiza manualmente.

### Si Tienes Presupuesto:
**Considera Keepa API** - Si necesitas automatización y tienes $20-50/mes.

## Script Helper

He creado un script que te ayuda a organizar la actualización manual:

```bash
npx tsx scripts/fetch-amazon-prices-manual.ts
```

Este script:
- ✅ Lista todos los juegos que necesitan precios
- ✅ Muestra los enlaces de Amazon
- ✅ Genera un template para actualizar
- ✅ Te guía paso a paso

## Ejemplo de Actualización

**Antes:**
```typescript
{
  id: 'ticket-to-ride',
  price: '$0.00', // TODO: Update
  rating: 4.7, // TODO: Update
}
```

**Después (visitando Amazon):**
```typescript
{
  id: 'ticket-to-ride',
  price: '$44.99',
  originalPrice: '$49.99', // Si hay descuento
  rating: 4.7,
}
```

## Frecuencia de Actualización

**Recomendado:**
- **Semanal:** Para juegos populares
- **Mensual:** Para el resto
- **Cuando notes cambios:** Si ves que un precio cambió

Los precios de Amazon cambian frecuentemente, especialmente durante:
- Black Friday
- Cyber Monday
- Temporadas de vacaciones
- Ofertas flash

## Conclusión

**La mejor opción ahora:** Actualización manual usando el script helper.

**La mejor opción a largo plazo:** Solicitar acceso a PA-API de Amazon.

**Si necesitas automatización inmediata:** Considera Keepa API (de pago).

