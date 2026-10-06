# คู่มือ Cloudflare Tunnel

> **ภาษา:** [English](../en/CLOUDFLARE_TUNNEL_GUIDE.md) · **ภาษาไทย**

คู่มือนี้อธิบายการเชื่อมต่อ API และ Worker ใน Docker กับ Frontend Next.js
ผ่าน Cloudflare Tunnel เพื่อเรียก API ผ่าน HTTPS โดยไม่ต้องเปิดพอร์ตเราเตอร์

## สถาปัตยกรรม

```text
Vercel Frontend
    ↓ คำขอ API ผ่าน HTTPS
Public hostname ของ Cloudflare
    ↓ encrypted outbound tunnel
cloudflared → Docker API พอร์ต 8000
                  ↕ shared media-output volume
               Docker Worker
                  ↓
               Supabase
```

API และ Worker ใช้ output volume เดียวกัน Tunnel เปิดทางเข้าเฉพาะ API
ไม่ได้เปิด Worker container โดยตรง

## ข้อควรรู้ก่อนนำขึ้นใช้งานจริง

Quick Tunnel มีไว้ทดสอบและพัฒนา ใช้ hostname ชั่วคราว ไม่มี uptime
guarantee รองรับคำขอพร้อมกันได้สูงสุด 200 รายการ และไม่รองรับ
Server-Sent Events ผู้ที่มี URL สามารถเรียกบริการในเครื่องได้
ควรใช้ named tunnel เมื่อต้องการ hostname คงที่ และห้ามถือ Quick Tunnel
เป็น production endpoint อ่าน[ข้อจำกัด Quick Tunnel ของ Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

Cloudflare ระบุว่า public-hostname route บนแผน Free, Pro และ Business
ต้องใช้บริการ Cloudflare แบบชำระเงินเฉพาะทางเพื่อให้บริการวิดีโอและไฟล์ขนาดใหญ่
Media Loader ส่งไฟล์สื่อผ่าน API จึงควรตรวจว่าเส้นทางส่งไฟล์ที่เลือกสอดคล้องกับ
[คำแนะนำ Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/concepts/routing/)
และ[ข้อกำหนดบริการ](https://www.cloudflare.com/service-specific-terms-application-services/)
ฉบับปัจจุบันก่อนเปิดเว็บ หากรูปแบบนี้ไม่ตรงข้อกำหนด ให้ใช้ผู้ให้บริการ backend
หรือ file delivery ที่อนุญาตการรับส่งข้อมูลลักษณะนี้

Cloudflare Tunnel เปิดให้ใช้ได้ทุกแผน แต่ไม่ได้หมายความว่าเครื่องต้นทาง
อินเทอร์เน็ต หรือการส่งไฟล์สื่อจะไม่มีค่าใช้จ่าย

## ข้อดี

1. ไม่ต้องเปิดพอร์ต inbound บนเราเตอร์
2. เครื่องต้นทางไม่จำเป็นต้องมี public static IP
3. named tunnel ให้ hostname คงที่พร้อม HTTPS ได้
4. tunnel เชื่อมต่อออกจากเครื่องต้นทางไปยัง Cloudflare

## วิธีที่ 1: Quick Tunnel สำหรับทดสอบชั่วคราว

Quick Tunnel สร้าง HTTPS URL ชั่วคราว เช่น
`https://random-words.trycloudflare.com` ไปยังบริการในเครื่อง
ห้ามใช้เป็น endpoint production ของเว็บสาธารณะ

เริ่ม API ในเครื่องหรือผ่าน Docker แล้วรัน:

```powershell
cloudflared tunnel --url http://localhost:8000
```

คัดลอก URL จาก Terminal ผู้ที่มี URL นี้จะเข้าถึง API ได้ URL จะเปลี่ยน
เมื่อหยุดแล้วเริ่ม process ใหม่

หากทดสอบผ่าน Vercel ให้กำหนด URL ใน `NEXT_PUBLIC_FASTAPI_BASE_URL`
ของ Vercel project แล้ว redeploy ตัวแปร public นี้ถูกรวมใน frontend build

## วิธีที่ 2: Named Tunnel สำหรับ hostname คงที่

ใช้โดเมนที่จัดการผ่าน Cloudflare แล้วสร้าง named tunnel สำหรับ deployment ใหม่
Cloudflare แนะนำ remotely-managed tunnel ในปัจจุบัน โปรดตรวจขั้นตอนล่าสุด
ใน Dashboard ก่อนตั้งค่า

ขั้นตอน CLI พื้นฐานของ locally-managed tunnel:

```powershell
cloudflared tunnel login
cloudflared tunnel create media-loader
cloudflared tunnel route dns media-loader api.yourdomain.com
```

คำสั่งจะสร้างไฟล์ credentials ไว้ในเครื่อง เก็บไฟล์นี้เป็นข้อมูลลับ
และห้าม commit ลง repository

ตัวอย่าง config ของ locally-managed tunnel ที่ชี้ hostname ไปยัง API:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<USERNAME>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

เริ่ม tunnel ด้วยคำสั่ง:

```powershell
cloudflared tunnel run media-loader
```

สำหรับ remotely-managed tunnel ให้ทำตามขั้นตอนปัจจุบันใน Cloudflare Dashboard
ห้ามส่ง token ลงในแชต ใส่ใน source code หรือบันทึกใน log

## วิธีที่ 3: Docker Compose

บริการ tunnel ใน Compose ตั้งค่าเป็น Quick Tunnel ชั่วคราว เริ่มเฉพาะตอนทดสอบ:

```powershell
docker compose --profile tunnel up -d tunnel
docker compose logs tunnel
```

คัดลอก HTTPS URL ที่ได้ไปกำหนดเป็น `NEXT_PUBLIC_FASTAPI_BASE_URL` ใน
Vercel หลังเปลี่ยนค่านี้ต้อง redeploy Frontend

### ใช้ remotely-managed tunnel ผ่าน Compose

บริการ tunnel อ่าน `.env.local` ผ่านการตั้งค่า Compose `env_file`
เมื่อต้องการใช้ remotely-managed tunnel:

1. ใส่ tunnel token ใน `TUNNEL_TOKEN` ของไฟล์ `.env.local` ในเครื่อง
   ห้าม commit ไฟล์นี้
2. ใน `docker-compose.yml` เปลี่ยน command ของ tunnel จาก
   `tunnel --no-autoupdate --url http://api:8000` เป็น
   `tunnel --no-autoupdate run` container จะอ่านค่า `TUNNEL_TOKEN`
   จาก environment
3. เริ่มบริการ:

```powershell
docker compose --profile tunnel up -d tunnel
```

ใน Compose ปัจจุบันไม่มีบรรทัด token ที่ comment ไว้ให้เปิดใช้
เก็บ token ไว้ใน environment file ในเครื่องเท่านั้น

## ตั้งค่า CORS

เพิ่ม Vercel origin ที่ใช้งานจริงลงใน `CORS_ORIGINS` ของ environment
ที่ API ใช้ เปลี่ยนโดเมนตัวอย่างให้เป็นโดเมน Frontend ที่ deploy แล้ว:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://media-loader.vercel.app
```

หลังแก้ CORS ให้ restart API:

```powershell
docker compose restart api
```

## ตรวจสอบการทำงาน

ตรวจ health endpoint ของ API ผ่าน tunnel:

```powershell
curl https://<YOUR_TUNNEL_HOST>/health
```

บริการที่พร้อมทำงานจะตอบ envelope ซึ่งมี `"status":"healthy"` จากนั้น
ล็อกอินเว็บที่ deploy แล้ว ทดสอบงานที่ได้รับอนุญาต และตรวจการรับไฟล์
ห้ามใช้สื่อจริงของผู้อื่นเป็นข้อมูลทดสอบหากไม่ได้รับอนุญาต
