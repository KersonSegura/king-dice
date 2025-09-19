# King Dice

A web application specialized in providing board game rules in English, connected to the BoardGameGeek API.

## 🎯 Features

- **Game search**: Search for any board game and find its rules in English
- **Complete database**: Connected to BoardGameGeek for updated information
- **Rules in English**: Specialized in providing rules translated to English
- **Modern interface**: Clean and responsive design with Next.js and Tailwind CSS
- **Real-time search**: Autocomplete as you type

## 🚀 Technologies

- **Next.js 14**: Framework de React con App Router
- **TypeScript**: Control de tipos y escalabilidad
- **Tailwind CSS**: Estilos rápidos y limpios
- **BoardGameGeek API**: Base de datos de juegos de mesa
- **Lucide React**: Iconos modernos
- **Axios**: Cliente HTTP para llamadas a la API

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository>
   cd king-dice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
king-dice/
├── app/                    # App Router de Next.js
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   └── juego/[id]/        # Páginas de juegos individuales
├── components/            # Componentes reutilizables
│   ├── Header.tsx        # Navegación principal
│   ├── GameSearch.tsx    # Búsqueda de juegos
│   └── GameCard.tsx      # Tarjeta de juego
├── lib/                  # Utilidades y servicios
│   └── bgg-api.ts       # Cliente de BoardGameGeek API
├── public/               # Archivos estáticos
│   └── ReglasDeMesaLogo.svg
└── BGG API Repository/   # Repositorio de la API de BGG
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_BGG_API_URL=https://boardgamegeek.com/xmlapi2
```

### Customization

- **Colors**: Modify `tailwind.config.js` to change the color palette
- **Logo**: Replace `public/ReglasDeMesaLogo.svg` with your logo
- **API**: Configure custom endpoints in `lib/bgg-api.ts`

## 📱 Features

### Game Search
- Real-time search with autocomplete
- Results filtered by relevance
- Basic game information (year, type)

### Game Pages
- Complete game information
- Images and descriptions
- Rating statistics
- Links to BoardGameGeek

### Rules in English
- Dedicated section for translated rules
- Multiple formats (PDF, HTML)
- Download and view buttons

## 🎨 Design

The application uses a warm color palette inspired by board games:

- **Primary**: Warm orange (#f1953e)
- **Secondary**: Neutral grays
- **Accents**: Green for positive elements

### Main Components

- **Header**: Responsive navigation with logo
- **GameSearch**: Search with autocomplete
- **GameCard**: Game cards with information
- **GameDetail**: Complete game information page

## 🔌 BoardGameGeek API

The application connects to the official BoardGameGeek API to get:

- Game information
- Images and descriptions
- Ratings and statistics
- Metadata (players, duration, etc.)

### Used Endpoints

- `GET /search` - Game search
- `GET /thing` - Detailed game information

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically

### Other Providers

- **Netlify**: Similar configuration to Vercel
- **AWS Amplify**: Full support for Next.js
- **Docker**: Use the included Dockerfile

## 🤝 Contributing

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is under the MIT License. See the `LICENSE` file for more details.

## 🙏 Acknowledgments

- [BoardGameGeek](https://boardgamegeek.com/) for providing the API
- [Next.js](https://nextjs.org/) for the framework
- [Tailwind CSS](https://tailwindcss.com/) for the styles
- [Lucide](https://lucide.dev/) for the icons

## 📞 Contact

Do you have questions or suggestions? Don't hesitate to contact us!

---

**King Dice** - Find the rules for your favorite games in English 🎲 