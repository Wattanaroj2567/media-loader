# ข้อกำหนดและรายละเอียด API (API Specification)

[English](API_SPEC.md) | ภาษาไทย

Base API: FastAPI Service ทำงานปกติที่ `http://localhost:8000` ระหว่างการพัฒนาแบบ Local

ทุก Endpoint ที่เข้าถึงข้อมูลผู้ใช้จำเป็นต้องแนบ Header ยืนยันตัวตน:

```http
Authorization: Bearer <Supabase access token>
```

ห้ามบันทึกหรือพิมพ์ Tokens, Signed URLs, Service Role Keys หรือค่าใน `.env.local` ลงใน Log

ทุก Endpoint คืนค่ารูปแบบ Envelope มาตรฐานเดียวกัน:

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

รูปแบบตอบกลับกรณีเกิดข้อผิดพลาด (Error Response):

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "ข้อความอธิบายข้อผิดพลาดสำหรับผู้ใช้"
  }
}
```

---

## 1. GET `/health`

ตรวจสอบการทำงานของระบบ (Public Health Check)

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "worker_pool": "local"
  },
  "error": null
}
```

---

## 2. POST `/media/analyze`

วิเคราะห์ URL ของสื่อก่อนนำเข้าคิวงาน ระบบ API จะตรวจสอบความถูกต้องของ URL, รันการตรวจสอบนโยบายสิทธิ์ (Policy Check), บันทึกการตัดสินใจสำหรับผู้ใช้ที่ล็อกอิน และดึงข้อมูลเมตาพร้อมรายการฟอร์แมตสดเมื่อได้รับอนุญาต

### Request Body
```json
{
  "url": "https://www.youtube.com/watch?v=example"
}
```

### Response (เมื่อได้รับอนุญาต)
```json
{
  "ok": true,
  "data": {
    "title": "Example Video Title",
    "uploader": "Channel Name",
    "duration": 240,
    "thumbnail": "https://i.ytimg.com/vi/example/hqdefault.jpg",
    "formats": [
      {
        "format_id": "1080p",
        "quality_label": "1080p (HD)",
        "ext": "mp4",
        "filesize_approx": 52428800
      },
      {
        "format_id": "bestaudio",
        "quality_label": "Audio Only (MP3)",
        "ext": "mp3",
        "filesize_approx": 4194304
      }
    ]
  },
  "error": null
}
```

---

## 3. POST `/jobs`

สร้าง คิวงานประมวลผลดาวน์โหลด/แปลงไฟล์ใหม่ลงในฐานข้อมูล

### Request Body
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format_id": "1080p",
  "audio_only": false
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "job_id": "uuid-v4-job-id",
    "status": "PENDING"
  },
  "error": null
}
```
