# คู่มือการติดตั้งบน Oracle Cloud Always Free (OCI Deployment Guide)

[English](../en/OCI_DEPLOYMENT_GUIDE.md) | ภาษาไทย

คู่มือนี้จะแนะนำการนำ **FastAPI Backend (pps/api)** และ **Media Worker (pps/worker)** ไปรันบน **Oracle Cloud Always Free (Ampere A1 ARM)** ฟรีตลอดชีพ 100% พร้อมระบบป้องกันเครื่องว่าง (Keep-Alive) และต่อเข้ากับ Cloudflare Tunnel สำหรับ HTTPS

---

## 1. ข้อมูลสเปกเครื่องฟรี (Always Free Eligibility)
- **Shape**: VM.Standard.A1.Flex (Ampere ARM)
- **OCPU**: 2 ถึง 4 OCPUs (แนะนำเลือก 2 หรือ 4)
- **RAM**: 12 ถึง 24 GB
- **OS**: Ubuntu 22.04 หรือ 24.04 (Canonical Ubuntu)
- **Disk**: 50 - 100 GB

---

## 2. ขั้นตอนการสร้าง Instance บน Oracle Cloud Console
1. เข้าสู่ระบบ [Oracle Cloud Console](https://cloud.oracle.com/)
2. ไปที่เมนู **Compute > Instances > Create instance**
3. ตั้งชื่อเครื่อง (เช่น media-loader-backend)
4. ในส่วน **Placement and hardware**:
   - กดปุ่ม **Change shape**
   - เลือก **Ampere (ARM-based Processor)**
   - ติ๊กเลือก VM.Standard.A1.Flex
   - ปรับ OCPU เป็น 2 หรือ 4 และ RAM เป็น 12 หรือ 24 GB (มีป้าย Always Free Eligible)
5. ในส่วน **Image**:
   - เลือก Canonical Ubuntu 22.04 หรือ 24.04
6. ในส่วน **Add SSH keys**:
   - กด **Save private key** ลงบนคอมพิวเตอร์ของคุณ (สำหรับใช้เชื่อมต่อ SSH)
7. กด **Create** และรอสถานะเครื่องเปลี่ยนเป็นสีเขียว (Running)

---

## 3. การติดตั้งแบบคำสั่งเดียว (Automated One-Click Setup)

เชื่อมต่อ SSH เข้าสู่เครื่อง Oracle VPS ของคุณ:
`ash
ssh -i /path/to/your-private-key.key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
`

เมื่อเข้าสู่เครื่องแล้ว ให้รันคำสั่งต่อไปนี้:
`ash
# 1. Clone repository
git clone https://github.com/Wattanaroj2567/media-loader.git
cd media-loader

# 2. สร้างและตั้งค่าตัวแปร .env.local
cp .env.example .env.local
nano .env.local
`

ใส่ข้อมูล Supabase และ Worker Security:
`ini
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
WORKER_SECRET=your-worker-secret
MEDIA_OUTPUT_MODE=local_temp
WORKER_POOL=cloud
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
`

รันสคริปต์ติดตั้งอัตโนมัติ:
`ash
sudo bash deploy/oci-setup.sh
`

---

## 4. ทำ HTTPS ด้วย Cloudflare Tunnel (ฟรี & ปลอดภัย)

1. เข้าสู่ระบบ [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. ไปที่ **Networks > Tunnels > Add a tunnel**
3. เลือก **Cloudflared** และตั้งชื่อ Tunnel (เช่น media-backend)
4. คัดลอกคำสั่งติดตั้งบนเครื่อง Ubuntu ที่ Cloudflare ให้มา (รันคำสั่ง curl ... | sudo bash)
5. ในหน้าตั้งค่า **Public Hostname**:
   - Subdomain: pi (เช่น pi.yourdomain.com)
   - Type: HTTP
   - URL: localhost:8000
6. กด Save

---

## 5. เชื่อมต่อกับ Frontend บน Vercel
1. ไปที่โปรเจกต์บน **Vercel Dashboard > Settings > Environment Variables**
2. แก้ไขหรือเพิ่มตัวแปร:
   - NEXT_PUBLIC_FASTAPI_BASE_URL = https://api.yourdomain.com
3. ทำการ Redeploy บน Vercel เพื่อเริ่มใช้งานระบบ 24/7 ทันที!
