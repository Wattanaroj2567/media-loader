# ข้อกำหนด API

> **ภาษา:** [English](../en/API_SPEC.md) · **ภาษาไทย**

API หลักคือบริการ FastAPI โดยปกติเปิดที่ `http://localhost:8000` ระหว่างพัฒนาในเครื่อง

## การยืนยันตัวตนและการใช้งานแบบผู้เยี่ยมชม

- `GET /health` เปิดให้เรียกได้โดยไม่ต้องยืนยันตัวตน
- การวิเคราะห์ สร้างงาน และ resume ต้องใช้ Supabase Bearer token ที่ตรวจแล้ว
- งานใหม่ผูกกับบัญชีที่ตรวจแล้ว Header ผู้เยี่ยมชมใช้สร้างงานไม่ได้
- งานผู้เยี่ยมชมเดิมยังเรียกดู หยุด ยกเลิก ลบ และรับไฟล์ได้เมื่อส่ง
  `X-Guest-Session-ID` ของเจ้าของงาน แต่ resume โดยไม่ล็อกอินไม่ได้
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

## Route ยืนยันตัวตนของเว็บ

Route เหล่านี้อยู่บน Next.js web origin ไม่ใช่ FastAPI base API
Supabase Auth จัดการบัญชีและ session คำขอ FastAPI ของผู้ใช้ที่ล็อกอินยังส่ง
access token ของ Supabase

เมื่อวาง URL ที่ถูกต้อง หน้าสาธารณะเปิดฟอร์มเข้าสู่ระบบใน modal ทันทีโดยไม่มีกล่องถามขั้นแรก
ปุ่มเข้าสู่ระบบบนแถบด้านบนเปิด modal ตัวเดียวกันได้แม้ยังไม่มีลิงก์ และรักษาลิงก์ที่รอวิเคราะห์ไว้
บนมือถือฟอร์มแสดงเต็มหน้าจอ รวมถึงแนวนอน ส่วนจอใหญ่ใช้ modal ตรงกลาง
ผู้ใช้เลื่อนฟอร์มได้โดยปุ่มปิดยังอยู่มุมเดิม และเว้นพื้นที่ขอบจอตาม safe area
ฟอร์มเข้าสู่ระบบ สมัครสมาชิก และขออีเมลกู้รหัสผ่านเปิดใน modal เดียวกัน
โดยไม่ออกจากหน้าแรก Route ยืนยันตัวตนเดิมยังใช้กับ callback และการเปิดโดยตรงได้
ผู้ใช้ปิดกล่องได้ การวางหรือปิดกล่องยังไม่วิเคราะห์หรือเปลี่ยนหน้า ระบบจำลิงก์
ใน session storage ของแท็บเดิม แม้ล็อกอินล้มเหลว โหลดหน้าใหม่ เปลี่ยนไปสมัคร
หรือใช้ OAuth เมื่อล็อกอินแล้ว dashboard จะนำลิงก์มาวิเคราะห์ โดยไม่ใส่ URL
ต้นทางใน query ของ redirect ผู้ใช้เลือกไฟล์แล้วกดปุ่มเดียว
“ยืนยันสิทธิ์และดาวน์โหลด” เพื่อยืนยันสิทธิ์และสร้างงาน ไม่มี checkbox ยืนยันสิทธิ์แยก

| Route | การทำงาน |
| --- | --- |
| `/auth/login` | เข้าสู่ระบบด้วย email/password หรือ Google |
| `/auth/register` | สมัครด้วย email/password หรือ Google; ชื่อที่แสดงเป็น metadata `full_name` ไม่ใช่ username สำหรับล็อกอิน |
| `/auth/forgot-password` | ขออีเมลกู้รหัสผ่านและแสดงข้อความยืนยันแบบกลางเหมือนกัน แม้ provider ล้มเหลว |
| `/auth/reset-password` | ต้องมี authenticated session ที่ตรวจแล้ว เปลี่ยนรหัสผ่าน แล้ว global sign-out และเปิด `/auth/login?reset=success` |
| `GET /auth/callback` | แลก authorization code เป็น session แล้ว redirect ไปปลายทางที่อนุญาต |
| `POST /auth/signout` | เรียก Supabase sign-out; สำเร็จตอบ `303` ไป `/` หาก provider ล้มเหลวตอบ `503` พร้อม error code ที่ปลอดภัย |

สมัครแล้วได้ session จะเปิด `/dashboard` หากต้องยืนยันอีเมลจะแจ้งให้ตรวจอีเมล
โดยใช้ database trigger เดิมสร้าง profile อีเมลกู้รหัสผ่านกลับผ่าน
`/auth/callback?next=/auth/reset-password` และต้องเปิดใน browser ที่ขอกู้รหัสผ่าน
เพื่อใช้ PKCE หากเปลี่ยนรหัสผ่านสำเร็จแต่ global sign-out ล้มเหลว การลองใหม่
จะสั่ง sign-out เท่านั้น
การสมัครด้วยอีเมลจะเก็บภาษาที่เลือกใน user metadata ชื่อ `language` เมื่อ
password sign-in หรือ callback สำเร็จ ระบบ sync ค่านี้จาก cookie
`media-loader-locale` และใช้ภาษาไทยเมื่อ cookie ไม่มีหรือค่าไม่ถูกต้อง redirect
สำหรับกู้รหัสผ่านไม่มี locale query parameter และแอปไม่ได้เลือกภาษาให้แม่แบบอีเมล
ที่โฮสต์ใน Supabase

ค่า `next` ของ callback ต้องเป็น same-origin ที่มี pathname เป็น `/dashboard`,
`/history`, `/settings`, `/downloads` หรือ `/auth/reset-password` ระบบตัด query
และ fragment ออก หากปลายทางไม่ผ่านจะใช้ `/dashboard` เมื่อ callback ล้มเหลว
จะ redirect พร้อม error code ที่ปลอดภัยไปหน้าล็อกอินหรือกู้รหัสผ่าน

Middleware ป้องกัน `/dashboard`, `/history`, `/downloads` และ `/settings`
โดยส่งผู้ที่ไม่ล็อกอินกลับ `/` ผู้ที่ล็อกอินแล้วเปิด `/`, `/auth/login`,
`/auth/register` หรือ `/auth/forgot-password` จะไป `/dashboard` หน้ากู้รหัสผ่าน
และ callback error ยังเข้าถึงได้ โดย redirect จะรักษา session cookies

เปิด Email/Password และ Google ใน Supabase dashboard และเพิ่ม URL ของ web origin
`/auth/callback` กับ `/auth/callback?next=/auth/reset-password` ให้ตรงใน allowlist
(เช่น `http://localhost:3000/auth/callback` และ
`http://localhost:3000/auth/callback?next=/auth/reset-password`) ต้องตั้งค่าแต่ละ
origin ที่ deploy ผ่าน dashboard ด้วยตนเอง

## รูปแบบ JSON response

FastAPI endpoint ที่ตอบกลับเป็น JSON ใช้โครงสร้างนี้

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
| `POST /media/analyze` | ต้องใช้ Bearer token |
| `POST /downloads` | ต้องใช้ Bearer token |
| `GET /downloads` | ต้องใช้ Bearer token |
| `GET /downloads/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/cancel` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/pause` | Bearer token หรือ guest session ของเจ้าของงาน |
| `POST /downloads/{job_id}/resume` | ต้องใช้ Bearer token |
| `DELETE /downloads/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `GET /files/token/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `GET /files/download/{job_id}` | Download token, Bearer token หรือ guest session ของเจ้าของงาน |
| `DELETE /files/delete/{job_id}` | Bearer token หรือ guest session ของเจ้าของงาน |
| `DELETE /account` | ต้องใช้ Bearer token |
| `GET /notifications/vapid-public-key` | ต้องใช้ Bearer token |
| `POST /notifications/subscriptions` | ต้องใช้ Bearer token |
| `DELETE /notifications/subscriptions` | ต้องใช้ Bearer token |

### GET `/health`

Endpoint ตรวจสอบสถานะระบบแบบสาธารณะ

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "worker_id": "local-worker-1",
    "worker_pool": "local",
    "output_mode": "local_temp",
    "supabase_connected": true
  },
  "error": null
}
```

`worker_id` คือรหัสของ worker, `output_mode` คือโหมดเก็บไฟล์ผลลัพธ์ และ
`supabase_connected` บอกว่าตั้งค่า Supabase ไว้หรือไม่ (ไม่ได้ทดสอบการเชื่อมต่อจริง)

### POST `/media/analyze`

ตรวจสอบ URL และวิเคราะห์สื่อก่อนสร้างงาน API จะตรวจนโยบายและความปลอดภัยของ URL
ก่อนดึงข้อมูลเมตากับรูปแบบไฟล์ที่มีให้เลือก ต้องยืนยันตัวตนก่อนตรวจ policy
หรือดึงข้อมูล และผูกบันทึกการตัดสินนโยบายกับบัญชีนั้น

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
        "raw_height": 1080,
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

ใน `formats[]` ค่า `height` และ `quality_label` เป็นระดับคุณภาพ (quality tier)
ตามป้ายของ YouTube ส่วน `resolution` คือขนาดเฟรมจริงของไฟล์ สำหรับเฟรมที่กว้างกว่า
16:9 ระดับคุณภาพจะคำนวณจากความสูงเทียบเท่า 16:9 ของความกว้าง เช่น วิดีโอ
1920x960 จะได้ `height` เป็น `1080` และ `quality_label` เป็น `1080p` แต่
`resolution` ยังเป็น `1920x960` ส่วน `raw_height` คือความสูงเฟรมจริง (`960` ในตัวอย่างนี้)

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

เมื่อสำเร็จ Response จะมี ID งานและสถานะ `QUEUED` งานผูกกับบัญชีที่ตรวจแล้ว
โดยไม่ใช้ Header ผู้เยี่ยมชมที่ส่งมาเป็นเจ้าของงาน

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

### Web Push subscriptions

`GET /notifications/vapid-public-key` ส่ง public application server key ให้
Push API ของเบราว์เซอร์ หากยังไม่ได้ตั้ง `VAPID_PUBLIC_KEY` จะตอบ `503
PUSH_NOT_CONFIGURED`

`POST /notifications/subscriptions` บันทึกหรืออัปเดต subscription ของบัญชีที่
เข้าสู่ระบบ รับเฉพาะ endpoint แบบ HTTPS จากผู้ให้บริการ Push ที่รองรับ URL ของ
endpoint และ subscription keys เป็นข้อมูลส่วนตัวและ API จะไม่ส่งค่ากลับ

```json
{
  "endpoint": "https://fcm.googleapis.com/push/<subscription-token>",
  "keys": {
    "p256dh": "<browser-public-key>",
    "auth": "<browser-auth-secret>"
  },
  "locale": "th"
}
```

`DELETE /notifications/subscriptions` รับ endpoint ใน request body และลบเฉพาะ
แถวของบัญชีที่ยืนยันตัวตนแล้ว Worker ส่งการแจ้งเตือนเมื่องานเปลี่ยนเป็น
`COMPLETED`, `FAILED` หรือ `BLOCKED` และลบ endpoint ที่หมดอายุเมื่อได้รับ
response `404` หรือ `410`
