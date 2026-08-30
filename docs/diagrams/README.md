# Diagrams — diagram-design

Editorial diagrams self-contained HTML+SVG. ไม่ใช้ Mermaid/shadows.

## ไฟล์
- `media-loader-architecture.html` — สถาปัตยกรรมหลัก (light, accent #0ea5e9 เข้ากับ dark command-center)
- เปิดใน browser ได้เลย ไม่มี build step

## Export PNG/SVG (เมื่อต้องการรูปสำหรับ README/slide)
```bash
# SVG (standalone ใส่ Figma/browser ได้)
python tmp/diagram-design/skills/diagram-design/scripts/self_check.py docs/diagrams/media-loader-architecture.html

# PNG ต้องมี playwright ครั้งเดียว
pip install playwright && playwright install chromium
# แล้วใช้วิธี browser screenshot หรือ script export ของ diagram-design
```

## Regenerate / Customize
- Template: `tmp/diagram-design/skills/diagram-design/assets/template.html`
- Type spec: `tmp/diagram-design/skills/diagram-design/references/type-architecture.md`
- Style tokens: `tmp/diagram-design/skills/diagram-design/references/style-guide.md`
- Clone อยู่ `tmp/diagram-design` (.gitignore แล้ว) — ลบได้ ติดตั้งใหม่ `git clone https://github.com/cathrynlavery/diagram-design.git tmp/diagram-design`
