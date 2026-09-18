# Packaging assets

`moyu-icon.png` is the source of truth for the product icon. The derived assets
consumed by electron-builder (`icon.png`, `icon.icns`, `icon.ico`, resolved via
`icon: build/icon` in `electron-builder.yml`) are generated from it:

```bash
# icon.png (Linux / generic)
sips -z 512 512 build/moyu-icon.png --out build/icon.png

# icon.icns (macOS)
rm -rf /tmp/moyu.iconset && mkdir /tmp/moyu.iconset
for s in 16 32 64 128 256 512 1024; do
  sips -z $s $s build/moyu-icon.png --out /tmp/moyu.iconset/icon_${s}x${s}.png
done
for s in 16 32 128 256; do
  sips -z $((s * 2)) $((s * 2)) build/moyu-icon.png \
    --out /tmp/moyu.iconset/icon_${s}x${s}@2x.png
done
iconutil -c icns /tmp/moyu.iconset -o build/icon.icns

# icon.ico (Windows): resize to 16/24/32/48/64/128/256 PNGs, then pack them as
# PNG-compressed ICO entries; see git history of this directory for a reference
# script (struct.pack, no external dependencies required).
```

Until signing and product approval are complete, package outputs remain
unsigned development artifacts.
