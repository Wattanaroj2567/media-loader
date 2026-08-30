# คู่มือการ Deploy บน Vercel (Vercel Setup Guide)

[English](VERCEL_SETUP.md) | ภาษาไทย

## วัตถุประสงค์ (Purpose)

Vercel ใช้สำหรับโฮสต์ Next.js Frontend (`apps/web`)

ห้ามใช้ Vercel Functions หรือ Serverless Functions ในการประมวลผลดาวน์โหลดหรือแปลงไฟล์หนักๆ โดยเด็ดขาด

---

## รูปแบบการ Deploy ที่แนะนำ (Recommended Deployment)

```text
apps/web    → Vercel (Frontend UI)
apps/api    → Oracle Cloud Always Free (OCI) หรือ Local
apps/worker → Oracle Cloud Always Free (OCI) หรือ Local
```

---

## ขั้นตอนที่ 1: สร้างโปรเจกต์บน Vercel

1. เข้าสู่ระบบที่ [vercel.com](https://vercel.com)
2. คลิก **Add New Project**
3. นำเข้า Repository จาก GitHub
4. ตั้งค่าโปรเจกต์ตามขั้นตอนด้านล่าง

---

## ขั้นตอนที่ 2: ตั้งค่าโปรเจกต์ (Project Settings)

### Framework Preset
- **Framework Preset**: Next.js
- **Root Directory**: ปล่อยว่าง (อยู่ที่ Root ของ Repo)
- **Build Command**: `cd apps/web && pnpm build`
- **Output Directory**: `apps/web/.next`

### ตัวแปรสภาพแวดล้อม (Environment Variables)

เพิ่มค่าตัวแปรต่อไปนี้ใน Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-backend-api-domain.com
```

**สำคัญมาก**: ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ลงใน Vercel โดยเด็ดขาด ค่านี้ต้องใช้เฉพาะบนฝั่ง Backend Containers เท่านั้น
