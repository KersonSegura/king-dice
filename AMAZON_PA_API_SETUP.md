# Amazon Product Advertising API (PA-API 5.0) Setup Guide

## ¿Qué es PA-API?

La Amazon Product Advertising API te permite obtener información de productos de Amazon, incluyendo:
- Precios actuales
- Ratings y reviews
- Disponibilidad
- Imágenes
- Descripciones
- Y más información del producto

## Requisitos para Solicitar Acceso

### 1. Tener una Cuenta de Amazon Associates Activa

- Debes estar registrado en [Amazon Associates](https://affiliate-program.amazon.com/)
- Tu cuenta debe estar **aprobada** y **activa**
- Debes haber generado al menos **3 ventas calificadas** en los últimos 180 días
- O tener un sitio web activo con tráfico significativo

### 2. Cumplir con los Requisitos de Tráfico

Amazon requiere que tengas:
- Un sitio web activo y funcional
- Contenido original y valioso
- Tráfico regular (no hay un número exacto, pero debe ser significativo)
- Enlaces de Amazon Associates funcionando correctamente

### 3. Solicitar Acceso a PA-API

1. **Inicia sesión** en [Amazon Associates Central](https://affiliate-program.amazon.com/)
2. Ve a **"Tools"** → **"Product Advertising API"**
3. Haz clic en **"Request Access"** o **"Sign Up"**
4. Completa el formulario con:
   - Información de tu sitio web
   - Propósito de uso
   - Volumen estimado de requests
   - Ejemplos de cómo usarás la API

### 4. Proceso de Aprobación

- Amazon revisará tu solicitud (puede tomar días o semanas)
- Verificarán que tu sitio cumple con sus políticas
- Pueden pedirte más información o ejemplos

## Alternativas si No Puedes Obtener PA-API

### Opción 1: Actualización Manual (Recomendado para empezar)

1. Visita cada página de Amazon
2. Copia el precio actual
3. Actualiza `data/board-games.ts` manualmente
4. Actualiza periódicamente (semanal o mensual)

### Opción 2: Servicios de Terceros

Hay servicios que ofrecen APIs para obtener precios de Amazon:
- **Keepa API** - Requiere suscripción
- **CamelCamelCamel API** - Limitado
- **Price API** - Servicios de terceros

⚠️ **Nota:** Algunos servicios pueden violar los términos de servicio de Amazon. Verifica antes de usar.

### Opción 3: Web Scraping (No Recomendado)

- Amazon prohíbe el scraping en sus términos de servicio
- Puede resultar en el bloqueo de tu cuenta
- No es confiable (Amazon cambia su estructura frecuentemente)

## Implementación con PA-API (Cuando Tengas Acceso)

Una vez que tengas acceso, necesitarás:

1. **Credenciales:**
   - Access Key ID
   - Secret Access Key
   - Partner Tag (tu tag de Associates, ej: `kingdice-20`)

2. **Instalar SDK:**
   ```bash
   npm install @aws-sdk/client-paapi5
   ```

3. **Ejemplo de Código:**
   ```typescript
   import { ProductAdvertisingAPIv1Client, GetItemsCommand } from '@aws-sdk/client-paapi5';
   
   const client = new ProductAdvertisingAPIv1Client({
     region: 'us-east-1',
     credentials: {
       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
     },
   });
   
   const command = new GetItemsCommand({
     PartnerTag: 'kingdice-20',
     PartnerType: 'Associates',
     Marketplace: 'www.amazon.com',
     ItemIds: ['B0DYK1ZH2D'], // ASIN
     Resources: [
       'Offers.Listings.Price',
       'Offers.Listings.Availability',
       'CustomerReviews.StarRating',
       'Images.Primary.Large',
     ],
   });
   
   const response = await client.send(command);
   ```

## Costos

- **PA-API es GRATIS** para miembros de Amazon Associates
- Tienes un límite de requests por segundo (varía según tu plan)
- No hay costos adicionales

## Límites

- **Rate Limits:** Depende de tu plan de Associates
- **Request Limits:** Generalmente 1 request por segundo para nuevos usuarios
- **Throttling:** Amazon puede limitar requests si excedes los límites

## Pasos Recomendados

1. ✅ **Primero:** Asegúrate de tener una cuenta de Amazon Associates activa
2. ✅ **Segundo:** Genera algunas ventas calificadas (3+ en 180 días)
3. ✅ **Tercero:** Solicita acceso a PA-API desde Associates Central
4. ✅ **Cuarto:** Mientras tanto, actualiza precios manualmente
5. ✅ **Quinto:** Una vez aprobado, implementa la API

## Enlaces Útiles

- [Amazon Associates Central](https://affiliate-program.amazon.com/)
- [PA-API Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [PA-API GitHub Examples](https://github.com/amzn/paapi5-nodejs-sdk)
- [Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement)

## Nota Importante

Amazon es muy estricto con PA-API. Asegúrate de:
- ✅ Usar la API solo para productos que estás promocionando
- ✅ No hacer caching excesivo de datos
- ✅ Respetar los rate limits
- ✅ No compartir tus credenciales
- ✅ Seguir todas las políticas de Amazon Associates

