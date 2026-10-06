# คู่มือ Deploy บน Vercel

> **ภาษา:** [English](../en/VERCEL_SETUP.md) · **ภาษาไทย**

คู่มือนี้ใช้ deploy เฉพาะ Frontend ที่พัฒนาด้วย Next.js ส่วน FastAPI API และ
Media Worker ต้องทำงานแยกบนโฮสต์ที่รองรับ runtime ของแอปและพื้นที่เก็บไฟล์ร่วมกัน

---

## รูปแบบการ Deploy

```text
apps/web    → Vercel (Next.js Frontend)
apps/api    → Container Host แยกที่ให้บริการ HTTPS (FastAPI)
apps/worker → โฮสต์ Worker ที่เข้าถึง media volume เดียวกับ API
Supabase    → Authentication และ PostgreSQL
```

Vercel ไม่ได้รันบริการ Docker Compose ของ Repository นี้ ห้ามใช้ Vercel Functions
สำหรับงานดาวน์โหลดสื่อที่ใช้เวลานาน การแปลงไฟล์ หรือจัดเก็บไฟล์ API และ Worker
ต้องเข้าถึง output directory เดียวกัน เพื่อให้ API ส่งไฟล์ที่ Worker สร้างได้

---

## สิ่งที่ต้องเตรียม

- บัญชี Vercel ที่เชื่อมกับ Git Repository นี้
- โปรเจกต์ Supabase และ Google OAuth Provider หากต้องการใช้ Google Sign-in
- API และ Worker ที่ deploy แยกกันและใช้ media volume ร่วมกัน
- HTTPS URL สาธารณะของ API และ Production Origin ของ Frontend สำหรับตั้งค่า CORS

ห้ามเปิดเผย credentials ของ Backend ใน Environment Variables ฝั่ง Frontend บน
Vercel ดูเพิ่มเติมที่ [Environment Variables](ENVIRONMENT_VARIABLES.md) และ
[Secrets Protocol](SECRETS_PROTOCOL.md)

---

## สร้างโปรเจกต์ Vercel

1. Import GitHub Repository นี้เข้า Vercel
2. ตั้ง **Root Directory** เป็นไดเรกทอรีหลักของ Repository (ใช้ค่าเริ่มต้น)
   เพราะ `vercel.json` ที่ Root และ pnpm workspace ใช้ตั้งค่า Monorepo นี้
3. เลือก Framework Preset เป็น **Next.js** หรือให้ Vercel ตรวจหาอัตโนมัติ
4. ไม่ต้องกำหนด Output Directory เอง ให้ Next.js Preset จัดการ
5. ใช้คำสั่ง Install และ Build จาก `vercel.json` ใน Repository

ค่าที่มีอยู่จะ pin pnpm 12.6.0 สำหรับติดตั้ง และเรียกสคริปต์ `build` ที่ Root
เพื่อ build `apps/web` ส่วน `ignoreCommand` จะจบด้วยรหัสสถานะ 1 เพื่อไม่ให้ Vercel
ข้ามการ Deploy การตั้งค่า Build ใน Vercel อาจถูก `vercel.json` เขียนทับ
หากแก้ค่าใดค่าหนึ่ง ให้ตรวจสอบว่าอีกแห่งยังสอดคล้องกัน

อย่าตั้ง Root Directory เป็น `apps/web` เพราะจะตัดการเข้าถึง workspace config
และ deployment config ที่ Repository นี้ใช้

---

## ตั้งค่า Environment Variables ใน Vercel

เพิ่มค่าที่เปิดเผยต่อ Frontend ได้ใน Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=https://api.example.com
```

แทนค่าตัวอย่างด้วยค่าจากบริการของคุณ สำหรับ Production ให้ตั้ง
`NEXT_PUBLIC_FASTAPI_BASE_URL` เป็น HTTPS URL ของ API ที่เข้าถึงได้จากภายนอก
ค่า `localhost` ใช้ได้เฉพาะการพัฒนาในเครื่องเท่านั้น ตัวแปร `NEXT_PUBLIC_`
จะถูกรวมไว้ใน Frontend ตอน Build หากแก้ค่าเหล่านี้ต้อง Deploy ใหม่

ห้ามเพิ่ม `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth Client Secret, ข้อมูลเชื่อมต่อ
ฐานข้อมูล หรือ credentials ของ Worker ในโปรเจกต์ Frontend บน Vercel ให้ตั้งค่า
credentials ส่วนตัวไว้บน Backend Host ที่ต้องใช้เท่านั้น

---

## Deploy และตั้งค่า Supabase Auth

1. Deploy โปรเจกต์ Vercel แล้วจด Production Domain เช่น
   `https://media-loader.example.com`
2. ใน Supabase Dashboard → **Authentication** → **URL Configuration** ให้ตั้ง
   **Site URL** เป็น Production Origin ของ Frontend
3. เพิ่ม Production Callback URL ในรายการ **Redirect URLs**:
   `https://media-loader.example.com/auth/callback`
4. เก็บ Callback URL สำหรับพัฒนาในเครื่องไว้ใน **Redirect URLs** ด้วย:
   `http://localhost:3000/auth/callback`
5. ใน Google Cloud OAuth Client ค่า Authorized Redirect URI คือ Callback URL
   ของ Supabase ที่แสดงใน Supabase Auth ไม่ใช่ URL `/auth/callback` ของแอป
   ดู [คู่มือ Google OAuth](GOOGLE_OAUTH_SETUP.md)

---

## ตั้งค่า Backend

- เพิ่ม Production Origin ของ Frontend แบบตรงกันทุกตัวอักษรใน `CORS_ORIGINS`
  ของ API
- ตั้งค่า Supabase credentials และ Worker credentials เฉพาะบน Backend Host
- ตั้ง `MEDIA_URL_ENCRYPTION_KEY` ค่าเดียวกันให้ API และ Worker เก็บเป็น secret
  และสำรองไว้อย่างปลอดภัยเพื่อให้ถอดรหัส URL งานที่เข้าคิวแล้วได้
- Deploy Worker เวอร์ชันใหม่ก่อน API เวอร์ชันใหม่ Worker ใหม่ยังรองรับ URL งาน
  plaintext เดิมระหว่าง rollout หลังอัปเดตทั้งคู่แล้วจึงรันคำสั่งย้ายข้อมูล URL เดิม
- ส่ง request ของ API/Worker ที่มาจาก URL ผู้ใช้ผ่าน SSRF egress proxy ทั้งหมด
  โดย Docker Compose มี proxy และบล็อกการออกอินเทอร์เน็ตตรงให้แล้ว หากใช้ Backend
  Host แบบอื่น ต้องมี network isolation และการตรวจ public IP ขณะเชื่อมต่อเทียบเท่า
- รันคำสั่งย้าย URL เก่าใน [Environment Variables](ENVIRONMENT_VARIABLES.md)
  ก่อนเปิดฐานข้อมูลเดิมให้ผู้ใช้อื่น
- ตรวจสอบว่า API และ Worker mount shared/persistent output volume เดียวกัน และ
  กำหนด `TEMP_DIR` ให้ตรงกัน
- ตรวจสอบเงื่อนไขและข้อจำกัดของผู้ให้บริการเรื่องการประมวลผลสื่อ แบนด์วิดท์
  และการส่งไฟล์ ก่อนนำไปใช้กับ Production

Cloudflare Quick Tunnel มีไว้สำหรับทดสอบและพัฒนา และ Cloudflare มีเงื่อนไข
เฉพาะบริการเกี่ยวกับการส่งวิดีโอและไฟล์ขนาดใหญ่ผ่าน Tunnel อ่าน
[คู่มือ Cloudflare Tunnel](CLOUDFLARE_TUNNEL_GUIDE.md) ก่อนเลือกเส้นทาง Backend
สำหรับ Production

---

## ตรวจสอบ Production

- Vercel Deploy สำเร็จและหน้าแรกเปิดผ่าน HTTPS ได้
- Google Sign-in กลับมายังแอปที่ Deploy แล้ว หากเปิดใช้งาน
- API requests เรียก HTTPS Endpoint ได้โดยไม่มี CORS error
- API เข้าถึงไฟล์ผลลัพธ์จาก shared volume ที่ Worker ใช้ได้
- ผู้ใช้ที่มีสิทธิ์ดาวน์โหลดไฟล์ของงานที่เสร็จแล้วได้ และผู้ที่ไม่มีสิทธิ์ไม่สามารถ
  เข้าถึงงานหรือไฟล์ของผู้ใช้อื่น

---

## แก้ปัญหาเบื้องต้น

### Build ไม่ผ่าน

- ตรวจว่า **Root Directory** เป็นไดเรกทอรีหลักของ Repository
- ตรวจ Build Logs ของ Vercel ว่าคำสั่งติดตั้ง pnpm หรือสคริปต์ `build` ที่ Root ล้มเหลวหรือไม่
- ตรวจว่า Project Settings ใน Vercel ไม่ได้เขียนทับคำสั่ง Build ของ Repository

### Google Sign-in ไม่ทำงาน

- ตรวจ Site URL และ Callback URL สำหรับ Production ใน Supabase
- ตรวจว่าลงทะเบียน Supabase Callback URI ไว้ใน Google OAuth Client แล้ว
- ตรวจว่าเปิด Google Provider ใน Supabase Auth แล้ว

### เรียก API ไม่ได้

- ตรวจว่า `NEXT_PUBLIC_FASTAPI_BASE_URL` เป็น HTTPS Origin ของ API ที่เข้าถึงได้
  และ Deploy ใหม่หลังแก้ค่า
- เพิ่ม Frontend Origin ของ Vercel ให้ตรงกันทุกตัวอักษรใน `CORS_ORIGINS`
- ตรวจว่า API และ Worker ใช้ output volume ร่วมกันและตั้ง `TEMP_DIR` ตรงกัน
