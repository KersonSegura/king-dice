# FINAL MAP CONFIGURATIONS - LOCKED FOREVER
## DO NOT CHANGE THESE SETTINGS - THEY ARE PERFECT

### DESKTOP CLASSIC MAP (LOCKED):
- **Scale:** `sm:scale-[0.85]`
- **Transform Origin:** `transformOrigin: "0 0"`
- **Position:** `margin-top: -450px`, `margin-left: -50px`
- **Transform Offset:** `tilesPosition.y + 20px` (moves down 20px from base position)
- **Star Button:** `right: 8px`, `left: auto`
- **Star Button Size:** `56px x 56px`, padding: `10px`, icon: `28px x 28px`
- **Star Button Centering:** `display: flex`, `align-items: center`, `justify-content: center`

### DESKTOP EXPANSION MAP (LOCKED):
- **Scale:** `scale(0.60)`
- **Position:** `translate(${tilesPosition.x - 190}px, ${tilesPosition.y - 140}px)`
- **Transform Origin:** `center center`
- **Star Button:** Same as classic map (right: 8px, 56px size, centered icon)

### MOBILE CLASSIC MAP (LOCKED):
- **Scale:** `scale-[1.23]`
- **Position:** `transform: translate(0px, 20px) scale(1.0)`, `left: 50%`, `margin-left: -306.573px`
- **Star Button:** `top: 5%`, `left: 75%`, `transform: translate(-50%, -50%)`
- **Star Button Size:** `56px x 56px`, padding: `10px`, icon: `28px x 28px`

### MOBILE EXPANSION MAP (LOCKED):
- **Scale:** `scale(0.75)`
- **Position:** `translate(${tilesPosition.x - 275}px, ${tilesPosition.y - 100}px)`
- **Star Button:** Same as classic mobile (top: 5%, left: 75%)

### DESKTOP PAGE LAYOUT (LOCKED):
- **Top Padding:** `padding-top: 2rem` for `.max-w-7xl.mx-auto`
- **Map Container Height:** `400px` (global)
- **Desktop Maps:** `height: auto`, `min-height: auto`

### CSS FILES TO PRESERVE:
1. **app/globals.css** - All mobile and desktop positioning rules
2. **components/CatanMapGenerator.tsx** - Classic map transform with `tilesPosition.y + 20px`
3. **components/CatanMapGenerator.tsx** - Expansion map scale `0.60`

### CRITICAL NOTES:
- Classic map uses inline transform with `+ 20px` offset for desktop
- Expansion map uses `scale(0.60)` for desktop
- Star buttons are `56px x 56px` with `28px x 28px` icons
- Mobile configurations remain completely locked
- Desktop has `2rem` top padding for proper spacing

## ⚠️ WARNING: DO NOT MODIFY THESE SETTINGS ⚠️
## These configurations are PERFECT and should NEVER be changed again
