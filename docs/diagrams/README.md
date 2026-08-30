# Diagrams — diagram-design

Editorial diagrams self-contained HTML+SVG (no Mermaid shadows).

## Files
- `media-loader-architecture.html` — สถาปัตยกรรมระบบหลัก (Light Editorial)
- `media-loader-architecture-dark.html` — สถาปัตยกรรมระบบ (Dark Mode)
- `media-loader-architecture.svg` — รูป SVG สำหรับแสดงผลบน README
- เปิดในเบราว์เซอร์ได้ทันทีโดยไม่ต้องผ่าน build step

## Export PNG/SVG
```bash
# SVG (Standalone สำหรับใส่ Figma / README)
python tmp/diagram-design/skills/diagram-design/scripts/self_check.py docs/diagrams/media-loader-architecture.html
```

