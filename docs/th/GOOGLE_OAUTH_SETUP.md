# คู่มือการตั้งค่า Google OAuth (Google OAuth Setup Guide)

[English](GOOGLE_OAUTH_SETUP.md) | ภาษาไทย

คู่มืออธิบายการตั้งค่าระบบยืนยันตัวตน Google OAuth 2.0 ร่วมกับ Supabase Auth สำหรับ Media Loader

---

## เป้าหมาย (Goal)

เปิดใช้งานระบบล็อกอินด้วย Google ผ่าน Supabase Auth เพื่อให้เว็บแอปพลิเคชัน Next.js สามารถยืนยันตัวตนผู้ใช้ได้อย่างปลอดภัย โดยไม่ต้องสร้างระบบ Auth ขึ้นเองตั้งแต่ต้น

---

## ขั้นตอนที่ 1 — เปิด Google Cloud Console

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจกต์ใหม่ หรือเลือกโปรเจกต์ที่มีอยู่แล้ว
3. เปิดเมนู **APIs & Services**
4. เปิดเมนู **OAuth consent screen**

---

## ขั้นตอนที่ 2 — ตั้งค่าหน้าจอ OAuth Consent Screen

การตั้งค่าที่แนะนำสำหรับการใช้งานส่วนบุคคล:

- **App name**: `Media Loader`
- **User support email**: อีเมลของนักพัฒนา
- **Developer contact email**: อีเมลของนักพัฒนา
- **Publishing status**: เลือกสถานะเป็น Testing สำหรับการพัฒนาแบบ Local

หากแอปอยู่ในสถานะ Testing ให้เพิ่มบัญชี Google ของคุณลงในรายชื่อ **Test Users**

---

## ขั้นตอนที่ 3 — สร้าง OAuth Client Credentials

1. ไปที่เมนู **Credentials**
2. คลิก **Create Credentials** → เลือก **OAuth client ID**
3. เลือกประเภทแอปพลิเคชัน (Application Type): **Web application**
4. กำหนดชื่อ: `Media Loader Web Client`

---

## ขั้นตอนที่ 4 — เพิ่ม Authorized Redirect URI

ใน Supabase Dashboard ให้เปิดหน้าต่าง:
```text
Authentication → Providers → Google
```

คัดลอก Callback URL ที่แสดงบน Supabase (รูปแบบ: `https://<your-project-ref>.supabase.co/auth/v1/callback`) แล้วนำไปวางในช่อง **Authorized redirect URIs** บน Google Cloud Console

---

## ขั้นตอนที่ 5 — นำค่า Google Credentials ไปใส่ใน Supabase

Google Cloud Console จะสร้างรหัสคู่มาให้:
```text
Client ID
Client Secret
```

คัดลอกทั้งสองค่าไปใส่ที่:
```text
Supabase Dashboard → Authentication → Providers → Google → กด Enable Provider
```

*หมายเหตุ: ห้าม commit รหัส Client Secret ลงใน Repository หรือเปิดเผยใน Log เด็ดขาด*

---

## ขั้นตอนที่ 6 — ตั้งค่า Redirect URLs สำหรับแอปพลิเคชันใน Supabase

ใน Supabase Dashboard → **Authentication** → **URL Configuration**:

เพิ่ม URL Callback สำหรับ Local:
```text
http://localhost:3000/auth/callback
```

เพิ่ม URL Callback สำหรับ Production หลังจาก deploy บน Vercel:
```text
https://<your-vercel-domain>.vercel.app/auth/callback
```

---

## ขั้นตอนที่ 7 — การทดสอบและการตรวจสอบ (Verification)

ทดสอบขั้นตอนการล็อกอินด้วย Google บน Frontend:
1. สั่งรัน Frontend Server: `pnpm dev:web`
2. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`
3. คลิกปุ่ม **Sign in with Google**
4. ตรวจสอบว่าหน้าต่างยืนยันตัวตนของ Google แสดงผลถูกต้อง และสามารถเปลี่ยนหน้าไปยัง `/dashboard` ได้อย่างสมบูรณ์หลังล็อกอินสำเร็จ
