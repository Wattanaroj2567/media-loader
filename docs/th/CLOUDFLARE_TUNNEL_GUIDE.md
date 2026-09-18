# คู่มือการติดตั้งและใช้งาน Cloudflare Tunnel

[English](../en/CLOUDFLARE_TUNNEL_GUIDE.md) | ภาษาไทย

คู่มือนี้แนะนำการนำ **Cloudflare Tunnel** มาใช้เชื่อมต่อหลังบ้าน Docker (`media-loader-api` & `media-loader-worker`) ที่รันอยู่บนเครื่องของคุณ เข้ากับ Next.js Frontend บน **Vercel** อย่างปลอดภัยผ่าน HTTPS โดยไม่ต้องเปิดพอร์ตเราเตอร์ (No Port Forwarding), ไม่ต้องใช้ Static IP และไม่ต้องกังวลเรื่องปัญหา Mixed Content บนเบราว์เซอร์

---

## สถาปัตยกรรม (Architecture)

```text
┌────────────────────────────────────────────────────────┐
│               Vercel (Frontend Next.js)                │
│             https://media-loader.vercel.app            │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS API Calls)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Cloudflare Global Edge Network             │
│            (HTTPS / Automatic SSL / DDoS)              │
└───────────────────────────┬────────────────────────────┘
                            │ (Encrypted Outbound Tunnel)
                            ▼
┌────────────────────────────────────────────────────────┐
│      เครื่อง Local / Home Server (Windows / Linux)      │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │             cloudflared daemon                 │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │ (HTTP localhost:8000)      │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │     Docker Compose: media-loader-api (FastAPI) │   │
│   │     Docker Compose: media-loader-worker        │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │          Supabase (Database & Auth)            │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## ข้อดีของการใช้ Cloudflare Tunnel

1. **ปลอดภัยสูงสุด (Zero Inbound Ports)**: ไม่ต้องเปิด Port Forwarding บนเราเตอร์ ไม่ต้องเปิดเผย Public IP ของบ้าน
2. **ข้ามขีดจำกัดเครือข่าย (NAT & CGNAT)**: ทำงานได้ทันทีแม้ใช้อินเทอร์เน็ตบ้านหรือเน็ตมือถือที่อยู่หลัง CGNAT
3. **HTTPS ฟรีตลอดชีพ**: มี SSL Certificate ที่ถูกต้องโดยอัตโนมัติ ทำให้เบราว์เซอร์ไม่บล็อก Mixed Content จาก Vercel
4. **ไม่เสียค่าใช้จ่าย (100% Free)**: ใช้งานได้ฟรีไม่มีค่าบริการของ Cloudflare

---

## วิธีที่ 1: Quick Tunnel (ทดสอบใช้งานทันที ไม่ต้องมีโดเมนของตัวเอง)

Quick Tunnel เป็นวิธีที่เร็วที่สุดในการสร้าง Public HTTPS URL ชั่วคราว (เช่น `https://xxxx.trycloudflare.com`) ไปยัง FastAPI พอร์ต 8000

### 1. รัน Quick Tunnel ด้วย CLI
เปิด PowerShell หรือ Terminal แล้วรันคำสั่ง:

```powershell
cloudflared tunnel --url http://localhost:8000
```
*(หรือรันผ่านสคริปต์ช่วย: `.\scripts\tunnel.ps1`)*

### 2. นำ URL ที่ได้ไปใช้งาน
ในหน้าจอ Terminal จะแสดงข้อความประมาณ:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-1234.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

### 3. นำ URL ไปใส่ใน Vercel
1. เข้าไปที่ [Vercel Dashboard](https://vercel.com/) → เลือกโปรเจกต์ของคุณ
2. ไปที่ **Settings** → **Environment Variables**
3. แก้ไขหรือเพิ่มตัวแปร:
   ```env
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://random-words-1234.trycloudflare.com
   ```
4. ไปที่หน้า **Deployments** แล้วกด **Redeploy**

> [!NOTE]
> URL แบบ Quick Tunnel จะเปลี่ยนใหม่ทุกครั้งที่ปิดและเปิดคำสั่งใหม่ หากต้องการ URL ถาวร แนะนำให้ใช้วิธีที่ 2 (Named Tunnel)

---

## วิธีที่ 2: Named Tunnel (แนะนำสำหรับการใช้งานถาวรด้วย Custom Domain)

วิธีนี้จะผูกกับโดเมนที่คุณเป็นเจ้าของบน Cloudflare (เช่น `api.yourdomain.com`) ทำให้ URL ไม่เปลี่ยนตลอดไป

### ขั้นตอนที่ 1: เข้าสู่ระบบ Cloudflare
```powershell
cloudflared tunnel login
```
เบราว์เซอร์จะเปิดขึ้นมา ให้เลือกโดเมนที่คุณต้องการใช้งาน

### ขั้นตอนที่ 2: สร้าง Tunnel
```powershell
cloudflared tunnel create media-loader
```
คำสั่งจะแสดง **Tunnel ID** และบันทึกไฟล์ credentials (json) ลงในเครื่องของคุณ

### ขั้นตอนที่ 3: ชี้ DNS มาที่ Tunnel
```powershell
cloudflared tunnel route dns media-loader api.yourdomain.com
```

### ขั้นตอนที่ 4: สร้างไฟล์คอนฟิก (`config.yml`)
สร้างไฟล์คอนฟิกไว้ที่โฟลเดอร์ `~/.cloudflared/config.yml` (บน Windows: `%USERPROFILE%\.cloudflared\config.yml`):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<USERNAME>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

### ขั้นตอนที่ 5: สั่งรัน Tunnel
```powershell
cloudflared tunnel run media-loader
```

*(หรือติดตั้งเป็น Windows Service ให้รันอัตโนมัติเมื่อเปิดเครื่อง:)*
```powershell
cloudflared service install
Start-Service cloudflared
```

---

## วิธีที่ 3: รัน Cloudflare Tunnel ผ่าน Docker Compose

คอนเทนเนอร์ `tunnel` ใน [docker-compose.yml](file:///d:/media-loader/docker-compose.yml) ถูกตั้งค่าเริ่มต้นให้รันเป็น **Quick Tunnel (ฟรี ทันที ไม่ต้องมีบัญชีหรือ Token)**:

### แบบที่ 1: Quick Tunnel (ฟรี ไม่ต้องมีบัญชี)
1. สั่งรัน Tunnel คอนเทนเนอร์:
   ```powershell
   docker compose --profile tunnel up -d tunnel
   ```
2. ดู URL ที่ Cloudflare สร้างให้:
   ```powershell
   docker compose logs tunnel
   ```
   จะเห็นบรรทัด URL เช่น:
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
   |  https://xxxxxxxx.trycloudflare.com                                                        |
   +--------------------------------------------------------------------------------------------+
   ```
   นำ URL นั้นไปใส่ใน Vercel `NEXT_PUBLIC_FASTAPI_BASE_URL`

### แบบที่ 2: Named Tunnel (เมื่อมี Cloudflare Zero Trust Token)
หากคุณสร้าง Named Tunnel บน Cloudflare Dashboard ไว้แล้ว:
1. นำ Token มาใส่ใน `.env.local`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...
   ```
2. แก้ไขใน `docker-compose.yml` ใต้ service `tunnel`:
   - สลับ comment มาใช้ `command: tunnel --no-autoupdate run` และเปิด environment `TUNNEL_TOKEN`
3. สั่งรัน:
   ```powershell
   docker compose --profile tunnel up -d tunnel
   ```

---

## การตั้งค่า CORS ใน `.env.local`

เมื่อเปิดใช้งานผ่านโดเมน Tunnel อย่าลืมตรวจสอบว่าใน `.env.local` มีโดเมนของ Vercel อยู่ใน `CORS_ORIGINS`:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://media-loader.vercel.app
```
*(หากแก้ไข `.env.local` ให้สั่งรีสตาร์ต API คอนเทนเนอร์ด้วย `docker compose restart api`)*

---

## การตรวจสอบการทำงาน (Verification)

1. ทดสอบยิง Healthcheck ผ่าน Tunnel:
   ```powershell
   curl https://<YOUR_TUNNEL_DOMAIN>/health
   ```
   ต้องได้รับคำตอบกลับมา:
   ```json
   {"ok":true,"data":{"status":"healthy",...}}
   ```
2. เปิดหน้าเว็บ `https://media-loader.vercel.app/history` ข้อความแจ้งเตือนสีแดง "เชื่อมต่อระบบไม่ได้" จะหายไป และสามารถดึงข้อมูลคิวงานและประวัติการดาวน์โหลดได้ทันที
