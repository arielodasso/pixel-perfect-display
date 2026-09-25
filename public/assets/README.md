# Assets Folder

Place your **GLB/GLTF model** here for the 3D building viewer.

## Required file

**`modern-building.glb`** - Your building model exported from Blender/3ds Max

## How to convert your FBX to GLB

### Option 1: Blender (Recommended)
1. Open Blender
2. File → Import → FBX (.fbx)
3. Select your `modern building2-f.FBX`
4. File → Export → glTF 2.0 (.glb)
5. ✅ Check "Include textures" (or "Copy" to embed textures)
6. Save as `modern-building.glb` in this folder

### Option 2: Online Converter
- https://convertmodel.com/fbx-to-gltf
- https://anyconv.com/fbx-to-gltf-converter/
- Upload FBX → Download GLB → Place here

### Option 3: glTF Transform (CLI)
```bash
npx @gltf-transform/cli copy modern-building2-f.FBX modern-building.glb
```

## Textures

Your textures in `src/assets/2building modern/maps/` should be automatically embedded if you export GLB from Blender with "Include textures" checked.

If textures don't embed, you can:
1. Copy the `maps/` folder to `public/assets/maps/`
2. Or use a GLB editor to re-embed textures

## Viewer Features

Once the GLB is placed here, the "Modelo 3D" view in the showroom will have:
- OrbitControls (drag to rotate, scroll to zoom)
- Day / Sunset / Night lighting modes
- Auto-rotate toggle
- Shadows and PBR materials
- Loading/error states