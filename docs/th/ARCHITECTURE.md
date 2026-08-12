# สถาปัตยกรรมระบบ (System Architecture)

[English](ARCHITECTURE.md) | ภาษาไทย

## ภาพรวมสถาปัตยกรรม (Overview)

Media Loader ถูกออกแบบสถาปัตยกรรมแบบแยกส่วน (Decoupled Architecture) เพื่อให้แต่ละส่วนทำงานตามหน้าที่หลักของตนเองอย่างมีประสิทธิภาพ:

```text
apps/web      → Next.js Frontend ทำงานบน Vercel
apps/api      → FastAPI Service สำหรับตรวจสอบนโยบาย วิเคราะห์ URL และสร้างคิวงาน (รันแบบ Local / Docker)
apps/worker   → Python Media Worker สำหรับประมวลผลดาวน์โหลดและแปลงไฟล์หนักๆ (รันแบบ Local / Docker)
supabase      → Auth, PostgreSQL Database, Storage และ Row Level Security (RLS)
```

---

## สภาพแวดล้อม Backend แบบ Local & Docker (Local Docker Backend)

ในระหว่างการพัฒนา สภาพแวดล้อมฝั่ง Backend API และ Worker จะรันผ่าน Docker Compose หรือ Python Local จาก Root Directory ของโปรเจกต์:

```text
Next.js บน Vercel หรือ Local Dev → เรียกใช้ API ที่ http://localhost:8000
FastAPI API Container          → เปิดพอร์ต 8000
Worker Container               → ประมวลผลคิวงานดาวน์โหลดและไฟล์ชั่วคราว
Supabase Cloud                 → Auth, Database, RLS และ Storage (ตัวเลือกเสริม)
```

ไฟล์สำคัญที่เกี่ยวข้องกับการรัน Docker:
```text
docker-compose.yml
apps/api/Dockerfile
apps/worker/Dockerfile
.dockerignore
```

---

## ทำไมต้องแยกส่วน Worker? (Why Split the Worker?)

การประมวลผลสื่อ (ดาวน์โหลดและแปลงไฟล์วิดีโอ/เสียง) เป็นงานที่ใช้เวลาและทรัพยากรสูง

หน้าที่หลักของ Worker ได้แก่:
- การเรียกใช้งาน `yt-dlp` ในโหมดควบคุมความปลอดภัย
- การประมวลผลไฟล์ด้วย `FFmpeg` (การตัดต่อ แปลงไฟล์ และสกัดเสียง)
- การบริหารจัดการไฟล์ชั่วคราว (Temporary File Cleanup)
- การเตรียมไฟล์ผลลัพธ์บนเครื่อง Local สำหรับการดาวน์โหลด
- การอัปเดตความคืบหน้า (Progress Tracking) และความเร็วในการดาวน์โหลดแบบเรียลไทม์

การแยกส่วนนี้ช่วยป้องกันไม่ให้งานหนักส่งผลกระทบต่อ Web Server หรือเกินข้อจำกัดของ Serverless Functions บน Vercel

---

## ลำดับการไหลของคำขอ (Request Flow)

### 1. การเข้าสู่ระบบ (Login)
```text
ผู้ใช้งาน ──> ล็อกอินผ่าน Google ──> Supabase Auth ──> คืนค่า JWT Session ──> Next.js Web App
```

### 2. การวิเคราะห์ URL (URL Analysis)
```text
กรอก URL ──> Web App ──> FastAPI (/api/v1/analyze) ──> ตรวจสอบ SSRF & Policy ──> คืนค่ารายการฟอร์แมตสด
```

### 3. การสร้างและประมวลผลคิวงาน (Job Queue Processing)
```text
เลือกฟอร์แมต ──> Web App ──> บันทึก Job ลง Supabase DB (Status: PENDING)
                                     │
Worker ดักรอคิวงาน ◄─────────────────┘
    │
    ├──> ดาวน์โหลดสื่อผ่าน yt-dlp
    ├──> แปลงไฟล์ด้วย FFmpeg
    ├──> อัปเดตความคืบหน้าลง DB (Status: DOWNLOADING / CONVERTING)
    └──> บันทึกไฟล์ผลลัพธ์ลง Local Temp / Storage (Status: COMPLETED)
```

---

## การรักษาความปลอดภัยของรหัสผ่านและความลับ (Secrets Protocol)

- ห้ามพิมพ์หรือบันทึกรหัสผ่านลับลงใน Log หรือ Console
- ห้าม commit ไฟล์ `.env.local` ลงใน Git Repository
- ฝั่ง Frontend จะเข้าถึงเฉพาะ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `NEXT_PUBLIC_FASTAPI_BASE_URL` เท่านั้น
