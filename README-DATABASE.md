# 🎲 Script de Población de Base de Datos - Reglas de Mesa

Este script obtiene automáticamente los 1000 juegos más populares de BoardGameGeek y los guarda en PostgreSQL usando Prisma.

## 📋 Requisitos

- Node.js 18+
- PostgreSQL
- npm o yarn

## 🚀 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea un archivo `.env.local` con la siguiente configuración:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/reglas_de_mesa?schema=public"

# BGG API
BGG_API_BASE_URL="https://boardgamegeek.com/xmlapi2"
BGG_API_TIMEOUT=30000
BGG_API_RETRY_ATTEMPTS=3
BGG_API_RETRY_DELAY=1000

# Script Configuration
MAX_GAMES_TO_FETCH=1000
BATCH_SIZE=50
DELAY_BETWEEN_REQUESTS=1000
```

### 3. Configurar la base de datos
```bash
# Generar cliente de Prisma
npm run db:generate

# Configurar la base de datos
npm run db:setup

# Aplicar migraciones (si usas migraciones)
npm run db:migrate
```

## 🎯 Uso

### Poblar la base de datos
```bash
npm run db:seed
```

### Verificar datos
```bash
npm run db:verify
```

### Abrir Prisma Studio
```bash
npm run db:studio
```

## 📊 Estructura de la Base de Datos

### Tabla `games`
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  "bggId" INTEGER UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  year INTEGER,
  "minPlayers" INTEGER,
  "maxPlayers" INTEGER,
  image TEXT,
  ranking INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | - |
| `BGG_API_BASE_URL` | URL base de la API de BGG | `https://boardgamegeek.com/xmlapi2` |
| `MAX_GAMES_TO_FETCH` | Número máximo de juegos a obtener | `1000` |
| `BATCH_SIZE` | Tamaño de lotes para requests | `50` |
| `DELAY_BETWEEN_REQUESTS` | Delay entre requests (ms) | `1000` |
| `BGG_API_TIMEOUT` | Timeout para requests (ms) | `30000` |
| `BGG_API_RETRY_ATTEMPTS` | Intentos de retry | `3` |
| `BGG_API_RETRY_DELAY` | Delay entre retries (ms) | `1000` |

## 📈 Proceso del Script

1. **Obtener juegos populares**: Usa el endpoint `/hot?type=boardgame`
2. **Obtener detalles**: Usa el endpoint `/thing?id=<ids>&stats=1` en lotes
3. **Parsear XML**: Convierte respuestas XML a JSON usando `xml2js`
4. **Guardar en BD**: Inserta o actualiza juegos usando Prisma

## 🛡️ Características de Seguridad

- **Rate limiting**: Delay entre requests para no sobrecargar la API
- **Retry logic**: Reintentos automáticos en caso de fallos
- **Error handling**: Manejo robusto de errores
- **User-Agent**: Identificación apropiada en requests
- **Timeout**: Timeouts configurables para requests

## 📝 Logs del Script

El script proporciona logs detallados:

```
🚀 Iniciando script de población de base de datos...
📊 Configuración: Máximo 1000 juegos, Lotes de 50, Delay 1000ms
✅ Conexión a la base de datos establecida
🔄 Obteniendo juegos populares de BGG...
✅ Obtenidos 50 juegos populares
🔄 Obteniendo detalles de 50 juegos en lotes de 50...
✅ Procesado lote 1/1
🔄 Guardando 50 juegos en la base de datos...
✅ Guardados 50 juegos nuevos y actualizados 0 existentes
📈 Total de juegos en la base de datos: 50
🏆 Juegos con ranking: 50
🖼️ Juegos con imagen: 48
🎉 Script completado exitosamente!
```

## 🔍 Verificación de Datos

El script de verificación muestra:

- Total de juegos en la base de datos
- Juegos con ranking, imagen, año, información de jugadores
- Top 10 juegos por ranking
- Juegos más recientes
- Juegos con datos faltantes
- Verificación de duplicados

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
```bash
# Verificar que PostgreSQL esté corriendo
# Verificar DATABASE_URL en .env.local
npm run db:setup
```

### Error de timeout en la API
```bash
# Aumentar timeout en .env.local
BGG_API_TIMEOUT=60000
```

### Error de rate limiting
```bash
# Aumentar delay entre requests
DELAY_BETWEEN_REQUESTS=2000
```

### Error de parsing XML
```bash
# Verificar que xml2js esté instalado
npm install xml2js
```

## 📚 API de BoardGameGeek

### Endpoints utilizados:
- `GET /hot?type=boardgame` - Juegos populares
- `GET /thing?id=<ids>&stats=1` - Detalles de juegos

### Respuesta XML de ejemplo:
```xml
<items>
  <item id="13" type="boardgame">
    <name type="primary" value="Catan"/>
    <yearpublished value="1995"/>
    <minplayers value="3"/>
    <maxplayers value="4"/>
    <image value="https://cf.geekdo-images.com/..."/>
    <thumbnail value="https://cf.geekdo-images.com/..."/>
  </item>
</items>
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. 