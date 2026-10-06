# คู่มือตั้งค่า Google OAuth

> **ภาษา:** [English](../en/GOOGLE_OAUTH_SETUP.md) · **ภาษาไทย**

คู่มือนี้อธิบายการใช้ Google เป็นผู้ให้บริการล็อกอินผ่าน Supabase Auth โดย Google
จะส่ง callback มาที่ Supabase จากนั้น Supabase จึง redirect กลับมายัง Media Loader

---

## เป้าหมาย

ให้ผู้ใช้ล็อกอินเข้า Next.js App ด้วย Google ผ่าน Supabase Auth โดยไม่ใส่
Google credentials ไว้ในโค้ดเบราว์เซอร์

---

## ขั้นตอนที่ 1 — เปิด Google Auth Platform

1. เปิด [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างหรือเลือก Google Cloud Project สำหรับ Media Loader
3. เปิดเมนู **Google Auth Platform** ใน Console

การตั้งค่าปัจจุบันของ Google อยู่ในส่วน Branding, Audience, Data Access และ
Clients ดู [คู่มือ Sign in with Google ของ Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

---

## ขั้นตอนที่ 2 — ตั้งค่า Audience และหน้าจอ Consent

- ในส่วน **Branding** ให้ใส่ชื่อแอปและอีเมลติดต่อที่ระบุโปรเจกต์ได้ชัดเจน
  รวมถึงข้อมูลอื่นที่ Google ขอ
- ในส่วน **Audience** ให้เลือกกลุ่มผู้ใช้ให้ตรงกับการใช้งาน หากแอปอยู่ในสถานะ
  Testing ให้เพิ่มบัญชี Google ที่อนุญาตเป็น test users
- ในส่วน **Data Access** ขอเฉพาะ scope โปรไฟล์ที่ต้องใช้ล็อกอิน ได้แก่
  `openid`, `email` และ `profile`

โหมด Testing เหมาะสำหรับพัฒนาและจำกัดการล็อกอินไว้เฉพาะบัญชีทดสอบ
ก่อนเปิดให้ผู้ใช้กลุ่มกว้างขึ้น ให้ทำตามข้อกำหนดการเผยแพร่และการยืนยันแอป
ล่าสุดของ Google

---

## ขั้นตอนที่ 3 — สร้าง Web OAuth Client

1. เปิดส่วน **Clients** แล้วสร้าง OAuth Client
2. เลือกประเภทแอปเป็น **Web application**
3. ตั้งชื่อที่จำได้ เช่น `Media Loader Web`
4. ในช่อง **Authorized redirect URIs** ให้เพิ่ม Callback URL ที่แสดงในหน้า
   Google Provider ของ Supabase ซึ่งมีรูปแบบดังนี้:

   ```text
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

URL นี้เป็นปลายทางของ Google ในขั้นตอน Provider ส่วน URL `/auth/callback`
ของแอปจะตั้งแยกใน Supabase ตามขั้นตอนที่ 5

---

## ขั้นตอนที่ 4 — เพิ่ม Client Credentials ใน Supabase

Google จะแสดง **Client ID** และ **Client Secret** ใน Supabase Dashboard
เปิด **Authentication** → **Providers** → **Google** เปิดใช้ Provider แล้วกรอก
ทั้งสองค่า ดู [คู่มือ Google Sign-in ของ Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)

ห้ามใส่ Google Client Secret ในตัวแปร Frontend, ไฟล์ Repository หรือ public log

---

## ขั้นตอนที่ 5 — ตั้งค่า Redirect URLs ของแอป

ใน Supabase Dashboard → **Authentication** → **URL Configuration**:

- ตั้ง **Site URL** เป็น Frontend Origin ที่ deploy แล้วสำหรับ Production เช่น
  `https://your-domain.vercel.app`
- เพิ่ม callback สำหรับพัฒนาในเครื่องใน **Redirect URLs**:
  `http://localhost:3000/auth/callback`
- เพิ่ม callback สำหรับ Production ใน **Redirect URLs**:
  `https://your-domain.vercel.app/auth/callback`

ใช้โดเมนและ callback path ที่ตรงกับแอป ดูรายละเอียดใน
[คู่มือ Redirect URLs ของ Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

---

## ขั้นตอนที่ 6 — ทดสอบการล็อกอิน

1. เริ่ม Frontend ด้วย `pnpm dev:web`
2. เปิด `http://localhost:3000` แล้วเลือก **Sign in with Google**
3. ตรวจว่า Google ส่งกลับผ่าน Supabase มาที่ `/auth/callback` และแอปเปิดหน้า Dashboard
4. เมื่อตั้ง Production URLs แล้ว ให้ทดสอบซ้ำบน Frontend ที่ deploy แล้ว
