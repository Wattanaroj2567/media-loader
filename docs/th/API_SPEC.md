# ข้อกำหนดและรายละเอียด API (API Specification)

> **ภาษา:** [English](../en/API_SPEC.md) · **ภาษาไทย**

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
    "policy": {
      "decision": "allowed",
      "reason": "URL ผ่านการตรวจสอบความปลอดภัย"
    },
    "media": {
      "title": "Example Video Title",
      "platform": "youtube",
      "thumbnail_url": "https://i.ytimg.com/vi/example/hqdefault.jpg",
      "duration_seconds": 240,
      "uploader": "Channel Name",
      "source_domain": "youtube.com",
      "view_count": 1234567,
      "like_count": 45678,
      "reaction_count": null,
      "is_animated_gif": false
    },
    "formats": [
      {
        "format_id": "1080p",
        "type": "video",
        "extension": "mp4",
        "quality_label": "1080p · 30 FPS",
        "filesize": 52428800
      },
      {
        "format_id": "bestaudio",
        "type": "audio",
        "extension": "m4a",
        "quality_label": "128 kbps · MP4A",
        "filesize": 4194304
      }
    ]
  },
  "error": null
}
```

`view_count`, `like_count` และ `reaction_count` เป็นค่าที่เปิดเผยจริงใน metadata
ของแหล่งต้นทาง หากแพลตฟอร์มไม่เปิดเผยค่าใด API จะส่ง `null` และจะไม่ประมาณหรือ
สร้างยอดขึ้นมาเอง โดยระบบแยก reactions ออกจาก likes เพราะแพลตฟอร์มอย่าง Facebook
รายงานยอดปฏิกิริยารวม ไม่ใช่ยอดไลก์เพียงอย่างเดียว สำหรับโพสต์ Instagram สาธารณะ
หาก extractor หลักไม่ส่งยอดดู ระบบจะอ่าน `video_view_count` จริงจากหน้า embed
แบบไม่ล็อกอินของ Instagram โดยไม่ใช้ cookies ของบัญชีผู้ใช้

`is_animated_gif` จะเป็น `true` เฉพาะเมื่อ metadata ต้นทางระบุว่าเป็น GIF
ระบบตรวจ `.gif` จริงได้ทุกแพลตฟอร์ม และตรวจ animated GIF ของ X จาก path สาธารณะ
`/tweet_video/` แม้ X จะส่งไฟล์ต้นทางมาเป็น MP4 สำหรับลิงก์ `.gif` ตรงจาก Giphy
ระบบจะคงสถานะ GIF ไว้แม้ CDN สาธารณะ redirect การวิเคราะห์ไปยัง MP4 preview แบบไม่มีเสียง
และเมื่อเลือก GIF ระบบจะสร้างไฟล์ `.gif` จริง

---

## 3. POST `/downloads`

สร้าง คิวงานประมวลผลดาวน์โหลด/แปลงไฟล์ใหม่ลงในฐานข้อมูล

### Request Body

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "selected_format_id": "1080p",
  "output_format": "gif",
  "rights_confirmed": true
}
```

`output_format` รองรับ `mp4`, `mp3` และ `gif` โดย API จะรับ GIF เฉพาะ source
ที่ขั้นวิเคราะห์ตรวจว่าเป็น animated GIF เท่านั้น จากนั้น Worker จะแปลง container
ของแพลตฟอร์มเป็นไฟล์ `.gif` จริงด้วย palette ที่ 15 FPS และจำกัดความกว้างสูงสุด
960 พิกเซลเพื่อควบคุมขนาดไฟล์โดยคงอัตราส่วนเดิม

### Response

```json
{
  "ok": true,
  "data": {
    "job_id": "uuid-v4-job-id",
    "status": "QUEUED"
  },
  "error": null
}
```
