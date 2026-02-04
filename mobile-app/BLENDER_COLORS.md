# Keeping Colors When Exporting from Blender for the Mobile App

React Native **cannot load image textures** from GLB files. If your model uses image textures (e.g. from an Image Texture node), they will not show and the model will appear gray or black and white.

Use one of these methods so colors show correctly:

---

## Option A: Solid Base Color (Easiest)

1. **Select your object(s)** in Blender.
2. Open the **Shading** tab (or switch to Shading workspace).
3. In the **Shader Editor**, find the **Principled BSDF** node.
4. **Remove any Image Texture node** connected to the **Base Color** input.
5. Click the **Base Color** color picker and choose your color.
6. Repeat for each material if you have multiple (dice, crown, etc.).
7. **File → Export → glTF 2.0 (.glb)**.
8. Save as `KingDice.glb`.

---

## Option B: Vertex Colors

1. **Enter Edit Mode** (Tab) and select the faces you want to color.
2. In the **Viewport Shading** dropdown, choose **Material Preview** or **Rendered**.
3. In the **Mesh** menu: **Vertex Paint** (or switch to Vertex Paint mode).
4. Pick a color and paint the vertices.
5. In the Shader Editor, add a **Vertex Color** node and connect it to **Base Color** of Principled BSDF.
6. Remove any Image Texture from Base Color.
7. **File → Export → glTF 2.0 (.glb)**.
8. Enable **Include → Vertex Colors** in the export dialog.
9. Save as `KingDice.glb`.

---

## Export Settings Checklist

- Format: **glTF Binary (.glb)**
- Include: **Selected Objects** (or your scene)
- **Transform**: Apply Modifiers if you use any
- **Geometry**: Apply Modifiers, UVs, Normals
- **Include → Vertex Colors** (if using Option B)
- **Materials**: Export

---

## After Exporting

1. Copy `KingDice.glb` to:
   ```
   E:\King Dice\mobile-app\assets\Models\KingDice.glb
   ```
2. Restart the Expo app (or reload).

---

## Why Image Textures Don't Work

The mobile app runs in React Native, which does not have the browser APIs (Image, createImageBitmap, etc.) that Three.js uses to load texture images. Only vertex colors and solid base colors are supported.
