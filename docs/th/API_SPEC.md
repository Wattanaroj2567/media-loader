# ข้อกำหนด API

> **ภาษา:** [English](../en/API_SPEC.md) · **ภาษาไทย**

API หลักคือบริการ FastAPI โดยปกติเปิดที่ `http://localhost:8000` ระหว่างพัฒนาในเครื่อง

## การยืนยันตัวตนและการใช้งานแบบผู้เยี่ยมชม

- `GET /health` เปิดให้เรียกได้โดยไม่ต้องยืนยันตัวตน
- `POST /media/analyze` และ `POST /downloads` รองรับทั้งผู้ใช้ที่เข้าสู่ระบบและผู้เยี่ยมชม
- สำหรับงานของผู้เยี่ยมชม ให้ส่ง Header `X-Guest-Session-ID` ค่าเดิมตอนสร้างงาน
  และทุกครั้งที่เรียกดู จัดการ หรือรับไฟล์ เว็บแอปจะจัดเก็บและใช้ ID นี้ซ้ำ
- หากไม่ส่ง Header ดังกล่าว คำขอ `POST /downloads` แบบไม่ล็อกอินยังสร้าง ID ผู้เยี่ยมชม
  ให้ใหม่ แต่ไม่ได้ส่ง ID นั้นกลับมาใน Response ทำให้เรียกดูงานดังกล่าวภายหลังไม่ได้
- `GET /downloads` และ `DELETE /account` ต้องใช้ Supabase access token ใน
  `Authorization: Bearer <token>`
- คำสั่งกับงานแต่ละรายการและการขอ download token ใช้ได้ทั้ง Bearer token
  หรือ `X-Guest-Session-ID` ของเจ้าของงานนั้น

ห้ามบันทึก access token, download token, service-role key หรือค่าจากไฟล์
environment ลงใน log

URL ต้นทางของงานจะถูกเข้ารหัสในฐานข้อมูลและถอดรหัสส่งกลับให้เจ้าของงานที่มีสิทธิ์
ส่วน policy log เก็บเฉพาะ source origin ที่ปกปิดแล้ว API access log ตัด query
values ออก การวิเคราะห์และดาวน์โหลดส่งผ่าน public-IP egress proxy ตามที่ระบุใน
[Security and Policy](SECURITY_AND_POLICY.md)

## รูปแบบ JSON response

Endpoint ที่ตอบกลับเป็น JSON ใช้โครงสร้างนี้

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

เมื่อเกิดข้อผิดพลาดจะใช้โครงสร้างเดียวกัน:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "ข้อความอธิบายสำหรับผู้ใช้"
  }
}
```

ข้อยกเว้นคือ `GET /files/download/{job_id}` ซึ่งส่งเนื้อหาไฟล์แบบ binary

## รายการ Endpoint

| Method และ Path | การเข้าถึง |
| --- | --- |
| `GET /health` | สาธารณะ |
| `POST /media/analyze` | ไม่ล็อกอินหรือใช้ Bearer token |
| `POST /downloads` | ไม่ล็อกอินหรือใช้ Bearer token; ควรส่ง `X-Guest-Session-ID` สำหรับงานผู้เยี่ยมชม |
| `GET /downloads` | ต้องใช้ Bearer token |
| `GET /downloads/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/cancel` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/pause` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/resume` | Bearer token หรือ guest session ของเจ้าของงาน |
| `DELETE /downloads/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `GET /files/token/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `GET /files/download/{job_id}` | Download token, Bearer token หรือ guest session ของเจ้าของงาน |
| `DELETE /files/delete/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `DELETE /account` | ต้องใช้ Bearer token |

### GET `/health`

Endpoint ตรวจสอบสถานะระบบแบบสาธารณะ

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

### POST `/media/analyze`

ตรวจสอบ URL และวิเคราะห์สื่อก่อนสร้างงาน API จะตรวจนโยบายและความปลอดภัยของ URL
ก่อนดึงข้อมูลเมตากับรูปแบบไฟล์ที่มีให้เลือก Endpoint นี้ไม่บังคับล็อกอิน
หากมีผู้ใช้เข้าสู่ระบบ ระบบจะผูกบันทึกการตัดสินนโยบายกับบัญชีนั้น

Request:

```json
{
  "url": "https://example.com/video"
}
```

Response ที่สำเร็จมีข้อมูลจริงจากต้นทาง ค่าที่ต้นทางไม่เปิดเผยจะเป็น `null`

```json
{
  "ok": true,
  "data": {
    "policy": {
      "decision": "allowed",
      "reason": "URL ผ่านการตรวจสอบความปลอดภัยของโดเมน"
    },
    "media": {
      "title": "Example Video",
      "platform": "youtube",
      "thumbnail_url": "https://example.com/thumbnail.jpg",
      "duration_seconds": 125,
      "uploader": "Creator Name",
      "source_domain": "youtube.com",
      "view_count": 1234567,
      "like_count": 45678,
      "reaction_count": null,
      "is_animated_gif": false
    },
    "formats": [
      {
        "format_id": "137",
        "type": "video",
        "extension": "mp4",
        "resolution": "1920x1080",
        "quality_label": "1080p · 30 FPS",
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "bitrate": null,
        "video_codec": "avc1",
        "audio_codec": "none",
        "filesize": null,
        "has_video": true,
        "has_audio": false
      }
    ]
  },
  "error": null
}
```

`view_count`, `like_count` และ `reaction_count` เป็นค่าที่เปิดเผยจริงจาก
metadata ของแหล่งต้นทาง หากไม่มีข้อมูล API จะส่ง `null` โดยไม่ประมาณหรือสร้างยอดขึ้นเอง
ระบบแยก reactions ออกจาก likes เพราะบางแพลตฟอร์มรายงานยอดปฏิกิริยารวม สำหรับโพสต์
Instagram สาธารณะ ตัววิเคราะห์อาจอ่าน `video_view_count` จริงจากหน้า embed
แบบไม่ล็อกอินเมื่อ extractor หลักไม่ส่งค่า โดยไม่ใช้ cookies ของบัญชี

`is_animated_gif` จะเป็น `true` เฉพาะเมื่อ metadata ระบุว่าเป็นสื่อ animated GIF
รวมถึงโพสต์ X ที่เสิร์ฟไฟล์ MP4 จาก path สาธารณะ `/tweet_video/` และลิงก์ GIF
ตรงจาก Giphy ที่ redirect ไปยังไฟล์ preview MP4 แบบไม่มีเสียง

หากนโยบายบล็อก URL ระบบจะตอบผลการตัดสินโดยไม่มีรายการ format
ผู้ใช้ต้องยืนยันสิทธิ์ก่อนส่ง `POST /downloads`

### POST `/downloads`

สร้างงานประมวลผลสื่อ API จะตรวจ URL และนโยบายซ้ำ วิเคราะห์ต้นทางอีกครั้ง
และยืนยันว่า format ที่เลือกยังมีอยู่ก่อนสร้างงาน

Request:

```json
{
  "url": "https://example.com/video",
  "selected_format_id": "137",
  "output_format": "mp4",
  "rights_confirmed": true
}
```

`output_format` รองรับ `mp4`, `mp3` และ `gif` คำขอจะถูกปฏิเสธหาก
`rights_confirmed` ไม่เป็น `true` ระบบรับ output แบบ GIF เฉพาะเมื่อการวิเคราะห์
ระบุว่าต้นทางเป็นสื่อ animated GIF และ format ต้นทางต้องเข้ากันได้กับ output ที่เลือก

เมื่อสำเร็จ Response จะมี ID งานและสถานะ `QUEUED` ผู้เยี่ยมชมควรส่ง
`X-Guest-Session-ID` เพื่อให้เรียกดูงานเดิมได้ภายหลัง

### GET `/downloads`

แสดงรายการงานของผู้ใช้ที่เข้าสู่ระบบ ผู้เยี่ยมชมไม่มี endpoint สำหรับดูประวัติงานทั้งบัญชี

Query parameters:

- `status` — กรองตามสถานะ
- `q` — คำค้นหา
- `limit` — จำนวนรายการต่อหน้า
- `offset` — จำนวนรายการที่ข้าม

Frontend ใช้ Endpoint นี้ดูคิวงานและประวัติที่สิ้นสุดแล้ว
ผู้เยี่ยมชมดูงานรายรายการผ่าน `GET /downloads/{job_id}`

### GET `/downloads/{job_id}`

แสดงข้อมูลงานหนึ่งรายการหลังตรวจว่าเป็นของผู้ใช้จาก Bearer token
หรือ guest session ที่ส่งมา ระบบจะไม่ค้นข้อมูลงานของบัญชีอื่นแทน

### POST `/downloads/{job_id}/cancel`

ยกเลิกงานที่ยังยกเลิกได้ ได้แก่ `PENDING`, `ANALYZING`, `READY`, `QUEUED`,
`DOWNLOADING`, `CONVERTING`, `UPLOADING` และ `PAUSED`

### POST `/downloads/{job_id}/pause`

หยุดงานชั่วคราวที่มีสถานะ `PENDING`, `READY`, `QUEUED`, `DOWNLOADING`
หรือ `CONVERTING` Response จะเปลี่ยนสถานะเป็น `PAUSED`

### POST `/downloads/{job_id}/resume`

เริ่มงานสถานะ `PAUSED` ต่อ โดย API จะเปลี่ยนกลับเป็น `QUEUED`
เพื่อรอ Worker ใน pool เป้าหมาย

### DELETE `/downloads/{job_id}`

ลบงานและไฟล์ชั่วคราวในเครื่อง (หากมี) งานที่กำลังประมวลผลต้องยกเลิกก่อน
เมื่อสำเร็จจะตอบกลับดังนี้:

```json
{
  "ok": true,
  "data": {
    "deleted": true
  },
  "error": null
}
```

### GET `/files/token/{job_id}`

สร้าง download token อายุสั้นสำหรับไฟล์ที่ประมวลผลเสร็จ Response มี
`job_id`, `download_token`, `download_url` และ `expires_in` โดย token
มีอายุ 300 วินาที ต้องใช้ Bearer token หรือ guest session ของเจ้าของงาน

```json
{
  "ok": true,
  "data": {
    "job_id": "uuid",
    "download_token": "short-lived-token",
    "download_url": "/files/download/uuid?token=short-lived-token",
    "expires_in": 300
  },
  "error": null
}
```

ปฏิบัติต่อ URL นี้เหมือนข้อมูลลับขณะที่ยังใช้ได้ ห้ามบันทึกลง log หรือส่งต่อ

### GET `/files/download/{job_id}`

ส่งไฟล์ชั่วคราวในเครื่องที่ประมวลผลเสร็จแล้ว โดยใช้ token อายุสั้นใน query,
Bearer token หรือ guest session ของเจ้าของงาน Endpoint นี้ตอบกลับเป็นข้อมูลไฟล์
แบบ binary ไม่ใช่ JSON envelope

เมื่อดาวน์โหลดสำเร็จ ไฟล์จะไม่ถูกลบทันที Worker จะลบไฟล์ที่หมดอายุตามระยะเวลา
retention ซึ่งค่าเริ่มต้นคือ 60 นาที ผู้ใช้สามารถสั่งลบไฟล์ได้เองเช่นกัน

### DELETE `/files/delete/{job_id}`

ลบไฟล์ชั่วคราวที่ประมวลผลเสร็จและล้าง path ที่จัดเก็บไว้ แต่คงประวัติงานไว้
ต้องใช้ Bearer token หรือ guest session ของเจ้าของงาน

### DELETE `/account`

ลบบัญชี Media Loader ของผู้ใช้ที่เข้าสู่ระบบ API จะลบไฟล์ชั่วคราวของผู้ใช้
และลบบัญชี Supabase Auth ต้องใช้ Bearer token
