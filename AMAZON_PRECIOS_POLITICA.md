# Política de Amazon Associates sobre Mostrar Precios

## ⚠️ Respuesta Directa

Según los términos de servicio de Amazon Associates, **técnicamente se prefiere usar PA-API** para mostrar precios, pero hay matices importantes.

## Lo que Dice Amazon

### Política Oficial:
- Amazon **recomienda** usar PA-API para obtener precios actualizados
- Los precios pueden cambiar frecuentemente
- Información desactualizada puede inducir a error a los clientes
- Amazon requiere que la información sea **precisa y actualizada**

### Lo que NO Dice Amazon:
- ❌ No dice explícitamente que está **prohibido** mostrar precios manualmente
- ❌ No dice que será suspendido automáticamente si muestras precios manuales

## Práctica Real

### Muchos Afiliados Hacen Esto:
- ✅ Muestran precios obtenidos manualmente
- ✅ Actualizan periódicamente (semanal/mensual)
- ✅ Funcionan sin problemas

### Cuándo Amazon Toma Acción:
- ❌ Si muestras precios **obviamente incorrectos**
- ❌ Si haces afirmaciones **falsas** sobre descuentos
- ❌ Si no actualizas los precios y están **muy desactualizados**
- ❌ Si usas precios para **engañar** a los clientes

## Recomendaciones para Cumplir

### Si Muestras Precios Manualmente:

1. **Actualiza Regularmente:**
   - Semanal para productos populares
   - Mensual para el resto
   - Inmediatamente si notas cambios

2. **Sé Preciso:**
   - Verifica el precio antes de publicarlo
   - Si hay descuento, verifica que realmente existe
   - No inventes precios o descuentos

3. **Añade Disclaimer:**
   - "Los precios pueden variar"
   - "Precios actualizados el [fecha]"
   - "Verifica el precio actual en Amazon"

4. **No Hagas Afirmaciones Falsas:**
   - ❌ "Mejor precio garantizado"
   - ❌ "Precio más bajo del mercado"
   - ✅ "Precio actual en Amazon"
   - ✅ "Ver precio en Amazon"

5. **Usa Texto Dinámico:**
   - "Ver precio actual" en lugar de precio fijo
   - O muestra precio con advertencia de que puede cambiar

## Alternativas Seguras

### Opción 1: Mostrar "Ver Precio" (Más Seguro)
En lugar de mostrar el precio exacto, puedes mostrar:
- "Ver precio en Amazon" (botón)
- "Desde $XX.XX" (precio aproximado)
- "Precio disponible en Amazon"

### Opción 2: Actualización Manual Regular
- Actualiza precios semanalmente
- Añade fecha de última actualización
- Añade disclaimer sobre variación de precios

### Opción 3: Solicitar PA-API (Ideal)
- Solicita acceso a PA-API
- Mientras tanto, usa opción 1 o 2
- Una vez aprobado, automatiza todo

## Ejemplo de Implementación Segura

```typescript
{
  id: 'catan',
  name: 'Catan',
  price: '$29.99', // Precio actualizado el [fecha]
  originalPrice: '$54.99', // Solo si realmente hay descuento
  priceDisclaimer: 'Los precios pueden variar. Verifica el precio actual en Amazon.',
  lastPriceUpdate: '2025-01-15', // Fecha de última actualización
}
```

Y en la página:
```tsx
{game.price && (
  <div>
    <span>{game.price}</span>
    {game.originalPrice && <span className="line-through">{game.originalPrice}</span>}
    <p className="text-xs text-gray-500">
      Precio actualizado el {formatDate(game.lastPriceUpdate)}. 
      Los precios pueden variar.
    </p>
  </div>
)}
```

## Conclusión

### ¿Es Violación?
**Técnicamente:** Amazon prefiere PA-API, pero no está explícitamente prohibido si:
- ✅ La información es precisa
- ✅ Se actualiza regularmente
- ✅ No engañas a los clientes
- ✅ Añades disclaimers apropiados

### Recomendación:
1. **Corto plazo:** Muestra precios manualmente con disclaimers y actualización regular
2. **Mediano plazo:** Solicita acceso a PA-API
3. **Mientras tanto:** Actualiza precios semanalmente o mensualmente

### Lo Más Importante:
- ✅ **Precisión:** Los precios deben ser correctos
- ✅ **Transparencia:** Avisa que pueden cambiar
- ✅ **Actualización:** Mantén los precios actualizados
- ✅ **No engañes:** No inventes descuentos o precios

## Enlaces Oficiales

- [Amazon Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement)
- [Product Advertising API](https://webservices.amazon.com/paapi5/documentation/)

## Nota Final

Muchos afiliados exitosos muestran precios manualmente sin problemas. La clave es:
- Ser preciso
- Actualizar regularmente
- No hacer afirmaciones falsas
- Añadir disclaimers apropiados

Si sigues estas prácticas, es poco probable que tengas problemas mientras solicitas acceso a PA-API.

