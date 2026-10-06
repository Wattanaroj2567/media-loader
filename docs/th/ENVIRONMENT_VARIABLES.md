# ตัวแปรสภาพแวดล้อม

> **ภาษา:** [English](../en/ENVIRONMENT_VARIABLES.md) · **ภาษาไทย**

ใช้ `.env.example` สำหรับ placeholder และใช้ `.env.local` เก็บค่าจริงในเครื่อง
ห้าม commit ข้อมูลลับจริง

## ตัวแปรที่ `pnpm check-env` บังคับให้มี

สคริปต์ตรวจสอบปัจจุบันต้องพบชื่อตัวแปรเหล่านี้:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_FASTAPI_BASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
MEDIA_URL_ENCRYPTION_KEY
MEDIA_EGRESS_PROXY
DATABASE_URL
WORKER_SECRET
```

`pnpm check-env` ตรวจค่าที่ขาดและใช้รูปแบบข้อความอย่างง่ายเพื่อตรวจ service-role
key ในตัวแปร public แต่ไม่ได้ตรวจไฟล์ frontend bundle ผลตรวจสำเร็จจึงไม่ได้
ยืนยันว่าไม่มี secret ถูก bundle เข้าไป

## ตัวแปร Frontend ที่เบราว์เซอร์มองเห็น

Next.js เปิดเผยตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ให้โค้ดในเบราว์เซอร์เห็น
จึงใส่ได้เฉพาะค่าคอนฟิกสาธารณะ:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

เมื่อนำขึ้นใช้งานจริง ให้กำหนด `NEXT_PUBLIC_FASTAPI_BASE_URL` เป็น HTTPS URL
ของ API ที่เข้าถึงได้จากภายนอก ค่า localhost ใช้เฉพาะพัฒนาในเครื่อง

## เครื่องมือจัดการฐานข้อมูล

`DATABASE_URL` ใช้กับคำสั่ง Drizzle Kit เช่น `db:push` และ `db:generate`
เก็บไว้ใน environment ของเครื่องมือหรือ deployment ฝั่ง server
ห้ามเปิดเผยให้โค้ดเบราว์เซอร์เข้าถึง

## ค่าที่ API และ Worker ใช้ร่วมกัน

FastAPI และ Worker ใช้ Supabase project และ output directory ร่วมกัน:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEDIA_URL_ENCRYPTION_KEY=
MEDIA_EGRESS_PROXY=http://127.0.0.1:3128
MEDIA_OUTPUT_MODE=local_temp
TEMP_DIR=tmp/media-loader
MAX_FILE_SIZE_MB=500
TEMP_FILE_RETENTION_MINUTES=60
WORKER_POOL=
LOG_LEVEL=info
```

- `TEMP_DIR` ต้องชี้ไปยังไดเรกทอรีเดียวกันสำหรับ API และ Worker
  Docker Compose mount named volume เดียวกันให้ทั้งสอง container
- ค่าเริ่มต้นของ `MAX_FILE_SIZE_MB` คือ `500`
- ค่าเริ่มต้นของ `TEMP_FILE_RETENTION_MINUTES` คือ `60`
- `MEDIA_OUTPUT_MODE` มีค่าเริ่มต้นเป็น `local_temp`; การเปลี่ยนค่านี้ไม่ได้เปิดใช้
  การจัดเก็บไฟล์บน Cloud
- `WORKER_POOL` ต้องตรงกันระหว่าง API กับ Worker ที่ใช้คิวเดียวกัน
  ค่าเริ่มต้นคือ `local`
- `LOG_LEVEL` มีค่าเริ่มต้นเป็น `info`
- `MEDIA_URL_ENCRYPTION_KEY` จำเป็นสำหรับสร้างงาน สร้าง key ด้วยคำสั่ง
  `uv run --directory apps/api python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
  แล้วกำหนดค่าเดียวกันให้ API และ Worker เก็บสำรองไว้อย่างปลอดภัย และห้ามใส่ใน
  ตัวแปร `NEXT_PUBLIC_` หากทำ key หายหรือเปลี่ยนค่า จะถอดรหัส URL งานเก่าไม่ได้
- `MEDIA_EGRESS_PROXY` กำหนด proxy สำหรับ request ไปยัง URL ของผู้ใช้ ค่า local
  เริ่มต้นคือ `http://127.0.0.1:3128`; Docker Compose จะตั้ง internal service
  address ให้อัตโนมัติ หากใช้ `pnpm dev` ให้เปิด proxy ก่อนด้วยคำสั่ง
  `docker compose up -d --build ssrf-proxy` การ deploy นอก Compose ต้องมี proxy
  ที่ตรวจ DNS แบบเทียบเท่าและป้องกันการเชื่อมต่อออกโดยตรงที่หลบ proxy

### ย้าย URL แถวเดิม

Deploy Worker เวอร์ชันใหม่ก่อน แล้วจึง deploy API โดยตั้ง encryption key
ค่าเดียวกันให้ทั้งคู่ Worker เวอร์ชันใหม่ยังประมวลผลงานเก่าที่เป็น plaintext ได้
เมื่อทั้งสองบริการใช้เวอร์ชันใหม่แล้ว ให้รันคำสั่งนี้ครั้งเดียวเพื่อเข้ารหัส URL
งานเก่าและปกปิด URL ใน policy log เก่า:

```bash
uv run --directory apps/api python -m app.url_storage_migration
```

คำสั่งจะแสดงเฉพาะจำนวนแถว จนกว่าจะทำเสร็จ URL งานเดิมในฐานข้อมูลยังเป็น plaintext

โหมดจัดเก็บไฟล์ปัจจุบันคือ `local_temp` ฟิลด์สำหรับ Cloud Storage มีอยู่ใน
service settings แต่เส้นทางจัดเก็บไฟล์บน cloud ยังทำไม่ครบ การกำหนด bucket
เพียงอย่างเดียวจึงยังไม่เปิดใช้งานโหมดนั้น

## ค่าของ API

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

เพิ่ม origin จริงของ Frontend ที่ deploy แล้วลงใน `CORS_ORIGINS`
หากมีหลาย origin ให้คั่นด้วย comma

## ค่าของ Worker

```env
WORKER_ID=local-worker-1
WORKER_SECRET=
POLL_INTERVAL_SECONDS=5
NODE_PATH=
DENO_PATH=
FFMPEG_PATH=
MEDIA_STORAGE_BUCKET=media-downloads
```

- `WORKER_ID` มีค่าเริ่มต้นเป็น `local-worker-1`
- `POLL_INTERVAL_SECONDS` มีค่าเริ่มต้นเป็น `5` และกำหนดช่วงเวลาที่ Worker
  จะตรวจคิวงาน
- `DENO_PATH` และ `NODE_PATH` ใช้กำหนด JavaScript runtime สำหรับ yt-dlp ได้
  โดย Worker เลือก Deno ก่อน หากไม่มีจะค้นหา Node จาก `PATH`
- `FFMPEG_PATH` ใช้ระบุตำแหน่ง FFmpeg ได้ หากไม่กำหนด Worker จะค้นหาใน
  `PATH` หรือใช้ binary จาก Python package ที่จัดการไว้
- `WORKER_SECRET` เป็นค่าที่ตัวตรวจ environment บังคับให้มี แต่ปัจจุบันยังไม่ได้
  ใช้ยืนยันตัวตน Worker
- `MEDIA_STORAGE_BUCKET` มีใน settings แต่ไม่ได้เปิดใช้การจัดเก็บไฟล์บน Cloud
  ส่วน `JOB_TIMEOUT_MINUTES` ก็มีใน worker settings แต่ยังไม่มีการบังคับใช้

`API_PORT` กำหนดค่าไว้ที่ `8000` แต่คำสั่งพัฒนาและ Compose ปัจจุบันระบุพอร์ต
`8000` ไว้โดยตรง การเปลี่ยนตัวแปรนี้อย่างเดียวจึงไม่เปลี่ยนพอร์ตที่รับฟัง

## Cloudflare Tunnel

บริการ tunnel ใน Compose อ่านค่า `TUNNEL_TOKEN` จาก `.env.local`
เมื่อใช้ remotely-managed tunnel หากใช้ Quick Tunnel ชั่วคราวให้เว้นค่านี้ว่าง

```env
TUNNEL_TOKEN=
```

ห้ามใส่ tunnel token ในตัวแปร Frontend, source code หรือ log
