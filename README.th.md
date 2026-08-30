# Media Loader

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.dot.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Runtime-Docker%20Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

[English](README.md) | [ภาษาไทย](README.th.md)

เว็บแอปพลิเคชันดาวน์โหลดและแปลงไฟล์วิดีโอ/เสียงส่วนตัวระดับพรีเมียม (Private Media Downloader & Converter) ที่เคารพสิทธิ์และออกแบบมาสำหรับการใช้งานประจำวัน วิเคราะห์ URL สื่อ, เลือกความละเอียดและฟอร์แมตวิดีโอ/เสียง, คิวงานดาวน์โหลดและแปลงไฟล์, และจัดการไฟล์ย้อนหลังได้อย่างปลอดภัยผ่านอินเทอร์เฟซโทนเข้มสไตล์ Command-Center ที่ทันสมัย

---

## การเริ่มต้นใช้งานด่วน (Quick Start)

เริ่มต้นรันระบบทั้ง Monorepo บนเครื่อง Local ได้ง่ายๆ ในไม่กี่ขั้นตอน:

### 1. สิ่งที่ต้องเตรียม (Prerequisites)
ตรวจสอบให้แน่ใจว่าติดตั้ง Node.js (v18+), pnpm (`npm install -g pnpm`), Python 3.12+, `uv`, และ FFmpeg บนเครื่องแล้ว

### 2. ตั้งค่าไฟล์ Environment & ติดตั้ง Dependencies
```bash
# 1. คัดลอกแม่แบบไฟล์ Environment
cp .env.example .env.local

# 2. ติดตั้ง Dependencies ของทั้ง Node.js และ Python (รันจาก Root)
pnpm install
pnpm setup:py
```

### 3. คำสั่งรันทั้ง 3 บริการพร้อมกันในคำสั่งเดียว (Single Terminal Command)

สั่งรันทั้ง Next.js Web UI, FastAPI Backend API และ Python Media Worker พร้อมกันในหน้าต่าง Terminal เดียว:

```bash
# สั่งรันทั้ง 3 บริการขนานกันใน Terminal เดียว
pnpm dev
```

> **หากต้องการสั่งรันแยก Terminal หรือใช้ Docker?**
> * **รันแยก Terminal**: สั่งรัน `pnpm dev:web`, `pnpm dev:api`, หรือ `pnpm dev:worker` แยกทีละตัวได้ตามสะดวก
> * **รันผ่าน Docker Mode**: สั่งรัน `docker compose --profile worker up --build`

> [!TIP]
> สั่งรัน `pnpm check-env` ได้ตลอดเวลาเพื่อตรวจสอบความถูกต้องของค่าแปรสภาพแวดล้อมโดยไม่พิมพ์รหัสลับออกมา

---

## ฟีเจอร์หลัก (Key Features)

* **ศูนย์ควบคุมผู้ใช้ (Command Center UI)**: อินเทอร์เฟซ Dashboard โทนเข้มที่สะอาด มินิมอล พร้อมระบบล็อกอิน Google OAuth ผ่าน Supabase Auth
* **ระบบวิเคราะห์ URL อัจฉริยะ (Smart URL Analyzer)**: ป้องกัน SSRF, ดึงข้อมูลเมตาสด, ประเมินขนาดไฟล์ และแสดงตัวอย่างความละเอียด
* **ระบบประมวลผลแยกอิสระ (Decoupled Processing)**: Worker Daemon สำหรับงานดาวน์โหลดและแปลงไฟล์ด้วย FFmpeg พร้อมติดตามความเร็วแบบเรียลไทม์
* **ความเป็นส่วนตัวและการเคารพสิทธิ์ (Privacy & Rights Guard)**: นโยบายไม่ข้ามระบบป้องกัน, กำหนดสิทธิ์ระดับตารางด้วย Postgres RLS และป้องกันรหัสผ่านหลุดอย่างเข้มงวด

---

## ผังสถาปัตยกรรมระบบ (Architecture)

![ผังสถาปัตยกรรม Media Loader](docs/diagrams/media-loader-architecture.svg)

---

## เทคโนโลยีที่ใช้ (Tech Stack)

| เลเยอร์ (Layer) | เทคโนโลยี (Technology) | โครงสร้างใน Monorepo |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, TailwindCSS | [`apps/web`](apps/web) |
| **Backend API** | FastAPI, Uvicorn, Python 3.12 | [`apps/api`](apps/api) |
| **Media Worker** | Python 3.12, yt-dlp, FFmpeg | [`apps/worker`](apps/worker) |
| **Database & Auth**| Supabase PostgreSQL, Supabase Auth | [`supabase`](supabase) |
| **Tooling** | `pnpm` (Node.js), `uv` (Python) | Monorepo Root |

---

## คู่มือการใช้งานและเอกสารฉบับเต็ม (Documentation & Guides)

ดูรายละเอียดการตั้งค่าเชิงลึกได้ที่ไดเรกทอรี [`docs/th/`](docs/th/DEVELOPER_GUIDE.md):

* **[คู่มือภาพรวมสำหรับนักพัฒนา](docs/th/DEVELOPER_GUIDE.md)** — สถาปัตยกรรมระบบ, Sequence Diagram, รวมคำสั่ง และดัชนีเอกสารทั้งหมด
* **[คู่มือการติดตั้งสภาพแวดล้อม](docs/th/USER_SETUP_GUIDE.md)** — ขั้นตอนการขอ Supabase & Google OAuth Keys ทีละขั้นตอน
* **[ข้อกำหนดสถาปัตยกรรมระบบ](docs/th/ARCHITECTURE.md)** — ผังระบบโดยละเอียด ขอบเขตความปลอดภัย และการไหลของข้อมูล
* **[คู่มือการ deploy บน Vercel](docs/th/VERCEL_SETUP.md)** — การตั้งค่า Next.js Monorepo ขึ้น Vercel
* **[คู่มือการ deploy บน Oracle Cloud (Always Free)](docs/th/OCI_DEPLOYMENT_GUIDE.md)** — รัน Backend & Worker ฟรีตลอดชีพบน OCI พร้อมระบบ Keep-Alive
* **[โปรโตคอลความปลอดภัย](docs/th/SECRETS_PROTOCOL.md)** — แนวปฏิบัติการดูแลความลับและป้องกันรหัสหลุด

---

## สิทธิ์การใช้งานและนโยบาย (License & Policy)

* **Private Repository**: สำหรับการใช้งานส่วนบุคคลเท่านั้น
* **Rights Compliance**: เคารพเงื่อนไขการให้บริการ (Terms of Service) ของแต่ละแพลตฟอร์ม และบังคับใช้การตรวจสอบสิทธิ์ในชั้นนโยบาย
