"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileText,
  List,
  ShieldCheck,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { HeaderUtilityControls } from "@/components/header-utility-controls";
import { SiteFooter } from "@/components/site-footer";
import { useT } from "@/lib/i18n/context";

type LocaleCopy = { th: string; en: string };
type PolicyBullet = LocaleCopy & { label?: LocaleCopy };
type PolicyTable = {
  caption: LocaleCopy;
  firstColumn: LocaleCopy;
  columns: LocaleCopy[];
  rows: { label: LocaleCopy; cells: LocaleCopy[] }[];
};
type PolicySection = {
  title: LocaleCopy;
  paragraphs?: LocaleCopy[];
  table?: PolicyTable;
  afterTableParagraphs?: LocaleCopy[];
  bullets?: PolicyBullet[];
  contactEmail?: string;
  externalReference?: LocaleCopy;
};
type PolicyKind = "privacy" | "terms";
type PolicyContent = {
  title: LocaleCopy;
  intro: LocaleCopy;
  summary: LocaleCopy[];
  sections: PolicySection[];
};

const policyContent: Record<PolicyKind, PolicyContent> = {
  privacy: {
    title: { th: "ประกาศความเป็นส่วนตัว", en: "Privacy notice" },
    intro: {
      th: "หน้านี้อธิบายข้อมูลที่ Media Loader ใช้ แหล่งที่มา วัตถุประสงค์ ผู้รับข้อมูล ข้อมูลที่จำเป็น และระยะเวลาจัดเก็บตามการทำงานปัจจุบัน",
      en: "This notice explains what information Media Loader uses, its sources and purposes, who may receive it, what is required, and how long it is kept based on current system behavior.",
    },
    summary: [
      {
        th: "ใช้ข้อมูลบัญชี ข้อมูลงาน ข้อมูลทางเทคนิค และข้อมูลในเบราว์เซอร์เพื่อให้บริการและรักษาความปลอดภัย",
        en: "We use account, job, technical, and browser information to provide and secure the service.",
      },
      {
        th: "ไฟล์ผลลัพธ์ตั้งต้นเก็บชั่วคราว 60 นาที และล้างเป็นรอบ",
        en: "Output files use a 60-minute default temporary retention and are cleaned up periodically.",
      },
      {
        th: "ประวัติงานอาจอยู่ต่อหลังไฟล์ถูกลบ และการลบบัญชีครอบคลุมข้อมูลที่ผูกกับบัญชีนั้น",
        en: "Job history may remain after a file is removed; account deletion covers records linked to that account.",
      },
    ],
    sections: [
      {
        title: { th: "ผู้ดูแลและช่องทางติดต่อ", en: "Controller and contact" },
        contactEmail: "tawan.wattanaroth@gmail.com",
        paragraphs: [
          {
            th: "ผู้ดูแล Media Loader คือคุณตะวัน หากมีคำถามหรือประสงค์ใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อทางอีเมลได้ที่",
            en: "Media Loader is operated by Mr. Tawan. For questions or personal data requests, contact him by email at",
          },
        ],
      },
      {
        title: { th: "ข้อมูลที่ระบบใช้", en: "Information we use" },
        bullets: [
          {
            label: { th: "ข้อมูลบัญชี", en: "Account information" },
            th: "อีเมลและข้อมูลยืนยันตัวตนที่ Supabase Auth จัดการเมื่อสมัครหรือเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน รวมถึงชื่อที่แสดงซึ่งไม่บังคับ และอีเมล ชื่อ หรือรูปโปรไฟล์ที่ได้รับเมื่อเลือกเข้าสู่ระบบด้วย Google",
            en: "Email and authentication information handled by Supabase Auth when you register or sign in with email and password; an optional display name; and email, name, or profile image received when you choose Google sign-in.",
          },
          {
            label: { th: "ข้อมูลงาน", en: "Job information" },
            th: "ลิงก์ต้นทาง แพลตฟอร์ม ชื่อสื่อ ผู้เผยแพร่ ภาพตัวอย่าง ระยะเวลา รูปแบบและคุณภาพที่เลือก สถานะ ความคืบหน้า ข้อผิดพลาด ขนาดไฟล์ และเวลาที่สร้างงาน",
            en: "Source link, platform, media title, uploader, thumbnail, duration, selected format and quality, status, progress, errors, file size, and job timestamps.",
          },
          {
            label: { th: "บันทึกการตรวจนโยบาย", en: "Policy-check records" },
            th: "โดเมนต้นทางที่ตัด path และ query ออก ผลการตรวจ และเหตุผล",
            en: "Source domain with its path and query removed, the decision, and its reason.",
          },
          {
            label: { th: "ข้อมูลในเบราว์เซอร์", en: "Browser data" },
            th: "คุกกี้สำหรับสถานะเข้าสู่ระบบและภาษา (คุกกี้ภาษาเก็บได้สูงสุด 1 ปี) ค่า locale และธีมใน localStorage และลิงก์/ผลวิเคราะห์/รูปแบบที่เลือกซึ่งพักไว้ใน sessionStorage ระหว่างใช้แท็บ รวมถึงรหัสเซสชันและรหัสงานแบบ guest ที่อาจเหลือจากระบบรุ่นเก่าใน localStorage",
            en: "Cookies for sign-in state and language (the language cookie can last up to one year); locale and theme preferences in localStorage; links, analysis results, and format selections held in sessionStorage while using a tab; and guest session/job IDs that may remain in localStorage from an older system version.",
          },
          {
            label: { th: "ข้อมูลทางเทคนิค", en: "Technical information" },
            th: "IP address และข้อมูลคำขอ เช่น เวลา เส้นทาง และผลตอบกลับ เพื่อจำกัดคำขอที่ถี่เกินไป รักษาความปลอดภัย และแก้ปัญหา บันทึกของ API จะตัดค่าหลังเครื่องหมาย ? ออกจากเส้นทางคำขอ",
            en: "IP address and request details such as time, path, and response status to rate-limit requests, protect the service, and troubleshoot. API access logs redact values after the ? in a request path.",
          },
        ],
      },
      {
        title: { th: "แหล่งที่มาของข้อมูล", en: "Sources of information" },
        bullets: [
          {
            label: { th: "จากคุณ", en: "From you" },
            th: "อีเมล ชื่อที่แสดง ลิงก์ต้นทาง รูปแบบที่เลือก และข้อมูลที่ส่งให้ฝ่ายช่วยเหลือ",
            en: "Email, display name, source links, selected formats, and information you send to support.",
          },
          {
            label: { th: "ผู้ให้บริการเข้าสู่ระบบ", en: "Sign-in providers" },
            th: "ข้อมูลบัญชีที่ Supabase Auth ใช้ และข้อมูลโปรไฟล์ที่ Google ส่งให้เมื่อคุณเลือก Google sign-in",
            en: "Account information handled by Supabase Auth and profile information returned by Google when you choose Google sign-in.",
          },
          {
            label: {
              th: "แพลตฟอร์มต้นทางและระบบอัตโนมัติ",
              en: "Source platforms and automatic collection",
            },
            th: "รายละเอียดสื่อสาธารณะที่แพลตฟอร์มต้นทางตอบกลับ และข้อมูลทางเทคนิคจากคำขอที่เบราว์เซอร์หรือระบบส่งมายังบริการ",
            en: "Public media details returned by source platforms and technical information from requests sent by your browser or the service.",
          },
        ],
      },
      {
        title: {
          th: "ข้อมูลที่จำเป็นต่อการใช้บริการ",
          en: "Information required to use the service",
        },
        paragraphs: [
          {
            th: "อีเมลจำเป็นต่อการสมัครและเข้าสู่ระบบ หากไม่ให้ข้อมูลนี้ คุณจะสร้างบัญชีและใช้คิวงานหรือประวัติที่ผูกกับบัญชีไม่ได้ ลิงก์ต้นทางจำเป็นต่อการตรวจและวิเคราะห์สื่อ หากไม่ส่งลิงก์ ระบบจะเริ่มงานนั้นไม่ได้ ชื่อที่แสดงเป็นข้อมูลไม่บังคับ ส่วนการไม่ให้ข้อมูลจาก Google หมายถึงคุณเลือกใช้วิธีเข้าสู่ระบบด้วย Google ไม่ได้ แต่ยังเลือกวิธีอีเมลได้",
            en: "Email is required to register and sign in. Without it, you cannot create an account or use account-based queues and history. A source link is required to check and analyze media; without it, that job cannot start. A display name is optional. If you do not provide information through Google, you cannot use Google sign-in, but you may choose email sign-in instead.",
          },
        ],
      },
      {
        title: { th: "เราใช้ข้อมูลเพื่ออะไร", en: "How we use information" },
        bullets: [
          {
            th: "สร้างและดูแลบัญชี รวมถึงให้คุณดูคิวงานและประวัติของตนเอง",
            en: "Create and maintain your account and show your own queue and job history.",
          },
          {
            th: "ตรวจสอบลิงก์และนโยบาย วิเคราะห์สื่อ จัดคิว ประมวลผล และส่งไฟล์ผลลัพธ์ให้เจ้าของงาน",
            en: "Validate links and policy, analyze media, queue and process jobs, and deliver the output to the job owner.",
          },
          {
            th: "จำกัดคำขอที่ถี่เกินไป ป้องกันการใช้งานที่ไม่เหมาะสม แก้ปัญหา และรักษาความปลอดภัยของบริการ",
            en: "Rate-limit requests, prevent misuse, troubleshoot problems, and protect the service.",
          },
        ],
      },
      {
        title: {
          th: "การประมวลผลและผู้ให้บริการที่เกี่ยวข้อง",
          en: "Processing and service providers",
        },
        paragraphs: [
          {
            th: "ลิงก์ที่ส่งเข้ามาจะถูกตรวจและประมวลผลโดย API และ worker ของบริการ ระบบจะเชื่อมต่อไปยังแพลตฟอร์มต้นทางผ่าน proxy ที่ตรวจปลายทางเครือข่ายก่อนเชื่อมต่อ แพลตฟอร์มต้นทางอาจได้รับคำขอที่จำเป็นต่อการอ่านข้อมูลหรือประมวลผลสื่อ",
            en: "Submitted links are checked and processed by the service API and worker. The system connects to source platforms through a proxy that validates network destinations. A source platform may receive requests needed to read metadata or process media.",
          },
          {
            th: "ระบบใช้ Supabase สำหรับการยืนยันตัวตนและฐานข้อมูล และใช้ Google เฉพาะเมื่อคุณเลือก Google sign-in ผู้ให้บริการโฮสต์เว็บ API worker และ proxy เครือข่ายอาจประมวลผลข้อมูลที่จำเป็นต่อการให้บริการและบันทึกทางเทคนิค แพลตฟอร์มต้นทางจะได้รับคำขอที่จำเป็นต่อการอ่านข้อมูลสาธารณะหรือประมวลผลสื่อ ผู้ให้บริการแต่ละรายอาจมีนโยบายความเป็นส่วนตัวและระยะเวลาเก็บข้อมูลของตนเอง",
            en: "The service uses Supabase for authentication and its database, and Google only when you choose Google sign-in. Providers hosting the web app, API, worker, and network proxy may process information needed to operate the service and technical logs. Source platforms receive requests needed to read public information or process media. Each provider may have its own privacy policy and retention periods.",
          },
        ],
      },
      {
        title: {
          th: "ไฟล์ชั่วคราวและระยะเวลาจัดเก็บ",
          en: "Temporary files and retention",
        },
        paragraphs: [
          {
            th: "ข้อมูลแต่ละประเภทมีระยะเวลาและวิธีลบต่างกัน ตารางนี้สรุปการจัดเก็บไฟล์ผลลัพธ์ ประวัติงาน และบันทึกการตรวจนโยบาย",
            en: "Each type of information has a different retention and deletion process. This table summarizes output files, job history, and policy-check records.",
          },
        ],
        table: {
          caption: {
            th: "สรุปการจัดเก็บและการลบข้อมูล",
            en: "Data retention and deletion summary",
          },
          firstColumn: { th: "รายการ", en: "Item" },
          columns: [
            { th: "การจัดเก็บ", en: "Storage" },
            { th: "ลบเมื่อใด", en: "When it is deleted" },
          ],
          rows: [
            {
              label: { th: "ไฟล์ผลลัพธ์", en: "Output files" },
              cells: [
                {
                  th: "เก็บชั่วคราวบนเซิร์ฟเวอร์ที่ประมวลผล ค่าเริ่มต้น 60 นาที และล้างเป็นรอบ การติดตั้งบางแห่งอาจตั้งเวลาแตกต่างกัน",
                  en: "Kept temporarily on the processing server. The default is 60 minutes, with periodic cleanup; a deployment may use a different setting.",
                },
                {
                  th: "ลบเมื่อรอบล้างไฟล์ทำงานหลังครบเวลา การลบงานหรือบัญชีจะพยายามลบไฟล์ที่เกี่ยวข้องด้วย",
                  en: "Removed by periodic cleanup after the retention period. Deleting a job or account also attempts to remove its related file.",
                },
              ],
            },
            {
              label: { th: "ประวัติงาน", en: "Job history" },
              cells: [
                {
                  th: "อาจยังอยู่หลังไฟล์ผลลัพธ์ถูกลบ ปัจจุบันไม่มีรอบลบประวัติงานอัตโนมัติแยกต่างหาก",
                  en: "May remain after the output file is deleted. There is currently no separate automatic cleanup schedule for job history.",
                },
                {
                  th: "ลบเมื่อคุณลบงานหรือลบบัญชี",
                  en: "Deleted when you delete the job or account.",
                },
              ],
            },
            {
              label: { th: "บันทึกการตรวจนโยบาย", en: "Policy-check records" },
              cells: [
                {
                  th: "รายการใหม่เก็บโดเมนต้นทางโดยตัด path และ query ออก ไม่มีรอบลบอัตโนมัติแยกจากการลบข้อมูลที่ผูกกับบัญชี",
                  en: "New records keep the source domain without its path or query. There is no separate automatic cleanup schedule beyond deletion of records linked to an account.",
                },
                {
                  th: "ลบเมื่อบัญชีถูกลบเฉพาะรายการที่ผูกกับบัญชี รายการ guest หรือข้อมูลรุ่นเก่าที่ไม่มีการผูกบัญชีอาจต้องให้ผู้ดูแลย้ายหรือลบแยก",
                  en: "Account deletion removes records linked to that account. Guest records or older data not linked to an account may require separate migration or cleanup by the operator.",
                },
              ],
            },
            {
              label: { th: "ข้อมูลในเบราว์เซอร์", en: "Browser data" },
              cells: [
                {
                  th: "คุกกี้ภาษาเก็บได้สูงสุด 1 ปี; locale, ธีม และรหัส guest อยู่ใน localStorage จนกว่าจะถูกลบ; sessionStorage ใช้พักข้อมูลระหว่างเซสชันของแท็บ",
                  en: "The language cookie can last up to one year; locale, theme, and guest IDs remain in localStorage until cleared; sessionStorage holds data for the tab session.",
                },
                {
                  th: "คุณลบข้อมูลเหล่านี้ได้จากการตั้งค่าเบราว์เซอร์ การลบอาจทำให้ต้องตั้งค่าภาษา/ธีมใหม่ ออกจากระบบ หรือเสียข้อมูลที่พักไว้",
                  en: "You can clear this data in your browser settings. Doing so may reset language or theme, sign you out, or remove in-progress data.",
                },
              ],
            },
            {
              label: {
                th: "ข้อมูลทางเทคนิคและบันทึกคำขอ",
                en: "Technical data and request logs",
              },
              cells: [
                {
                  th: "ตัวจำกัดคำขอของ API ใช้ IP address และเวลาในหน่วยความจำตามช่วงเวลา 60 วินาที บันทึก access log อาจมี IP และรายละเอียดคำขอ โดยค่าหลัง ? ถูกตัดออก",
                  en: "The API rate limiter uses IP addresses and timestamps in memory for a 60-second window. Access logs may contain IP addresses and request details, with values after ? removed.",
                },
                {
                  th: "เวลาในตัวจำกัดคำขออยู่นอกช่วง 60 วินาทีจะถูกล้างเมื่อมีคำขอถัดไป ส่วนระยะเวลาเก็บ access log ขึ้นอยู่กับผู้ให้บริการและการตั้งค่าของแต่ละ deployment; ระบบไม่ได้กำหนดระยะเวลาเดียวไว้",
                  en: "Rate-limiter timestamps outside the 60-second window are cleared on a subsequent request. Access-log retention depends on each deployment’s provider and settings; the service does not define one universal period.",
                },
              ],
            },
          ],
        },
        afterTableParagraphs: [
          {
            th: "สำหรับงานที่สร้างด้วยระบบรุ่นปัจจุบัน ลิงก์เต็มจะถูกเข้ารหัสก่อนบันทึกในฐานข้อมูลและเก็บไว้เท่าที่จำเป็นต่อการทำงาน เมื่อสถานะงานเป็นเสร็จสิ้น ล้มเหลว ถูกบล็อก หรือยกเลิก ระบบจะเปลี่ยนเป็นข้อมูลอ้างอิงต้นทางที่ตัด path และ query ออก งานสถานะอื่นอาจยังเก็บลิงก์ที่เข้ารหัสไว้จนกว่าจะลบงาน ข้อมูลจากงานหรือบันทึกนโยบายรุ่นเก่าอาจยังต้องรอการย้ายหรือลบโดยผู้ดูแล และอาจมีลิงก์ที่ยังไม่ได้ตัดข้อมูลส่วนเกิน",
            en: "For jobs created with the current system, the full source link is encrypted before being stored and kept only while needed for processing. When a job is completed, failed, blocked, or cancelled, the system replaces it with a redacted source reference that omits the path and query. Other job states may keep the encrypted link until the job is deleted. Older jobs or policy records may still require migration or cleanup by the operator and may contain links that have not yet been redacted.",
          },
        ],
      },
      {
        title: { th: "การควบคุมและสิทธิของคุณ", en: "Your controls and rights" },
        externalReference: {
          th: "อ่านพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
          en: "Read Thailand’s Personal Data Protection Act B.E. 2562",
        },
        paragraphs: [
          {
            th: "คุณลบงานหรือบัญชีได้จากบริการ การลบบัญชีจะยกเลิกงานที่ยังยกเลิกได้ ลบไฟล์ที่เกี่ยวข้อง และลบบัญชีกับข้อมูลในฐานข้อมูลที่ผูกกับบัญชี อย่างไรก็ตาม ข้อมูล guest หรือข้อมูลรุ่นเก่าที่ไม่มีการผูกบัญชีอาจไม่ถูกลบโดยขั้นตอนนี้และอาจต้องให้ผู้ดูแลตรวจสอบแยก คุณสามารถติดต่อผู้ดูแลเพื่อขอเข้าถึงหรือสำเนา ขอแก้ไข ขอให้ลบหรือทำให้ไม่สามารถระบุตัวบุคคล ขอระงับหรือคัดค้านการใช้ ขอรับหรือโอนข้อมูล ถอนความยินยอมเมื่อการประมวลผลอาศัยความยินยอม หรือร้องเรียนต่อหน่วยงานที่มีอำนาจได้ ทั้งนี้เป็นไปตามสิทธิและเงื่อนไขของกฎหมายที่เกี่ยวข้อง",
            en: "You can delete a job or account from the service. Account deletion cancels cancellable jobs, removes related files, and deletes the account and database records linked to it. Guest data or older data not linked to an account may not be removed by this process and may need separate review by the operator. You may contact the operator to request access or a copy, correction, deletion or de-identification, restriction or objection, portability, withdrawal of consent where processing is based on consent, or lodge a complaint with the competent authority, subject to applicable legal rights and conditions.",
          },
        ],
      },
      {
        title: { th: "การเปลี่ยนแปลงประกาศ", en: "Changes to this notice" },
        paragraphs: [
          {
            th: "เราอาจปรับปรุงประกาศเมื่อการทำงานของบริการเปลี่ยนแปลง วันที่ปรับปรุงล่าสุด: 20 ตุลาคม 2569",
            en: "We may update this notice when the service changes. Last updated: 20 October 2026.",
          },
        ],
      },
    ],
  },
  terms: {
    title: { th: "ข้อกำหนดการใช้งาน", en: "Terms of service" },
    intro: {
      th: "ข้อกำหนดนี้อธิบายเงื่อนไขพื้นฐานในการใช้ Media Loader โปรดอ่านก่อนส่งลิงก์หรือสร้างงาน",
      en: "These terms describe the basic conditions for using Media Loader. Please read them before submitting a link or creating a job.",
    },
    summary: [
      {
        th: "ต้องเข้าสู่ระบบเพื่อสร้างงานดาวน์โหลดและดูประวัติ",
        en: "Sign in to create download jobs and view your history.",
      },
      {
        th: "บันทึกและใช้สื่อเมื่อสิทธิ ใบอนุญาต หรือข้อยกเว้นตามกฎหมายครอบคลุมการกระทำนั้น",
        en: "Save and use media only when applicable rights, license terms, or legal exceptions cover those actions.",
      },
      {
        th: "ห้ามหลบเลี่ยง DRM หรือข้อจำกัดการเข้าถึงของแพลตฟอร์ม",
        en: "Do not bypass DRM or platform access restrictions.",
      },
      {
        th: "ไฟล์ผลลัพธ์เก็บชั่วคราว โดยค่าเริ่มต้น 60 นาที",
        en: "Output files are temporary, with a 60-minute default retention.",
      },
    ],
    sections: [
      {
        title: { th: "การใช้บริการและบัญชี", en: "Using the service and your account" },
        paragraphs: [
          {
            th: "การสร้างงานดาวน์โหลดและดูประวัติในบริการต้องเข้าสู่ระบบ คุณรับผิดชอบต่อการรักษาข้อมูลเข้าสู่ระบบและกิจกรรมที่เกิดขึ้นในบัญชีของคุณ หากพบการใช้งานที่ไม่ได้ทำเอง โปรดติดต่อผู้ดูแล",
            en: "You must sign in to create a download job and view its history. You are responsible for protecting your sign-in details and activity in your account. Contact the operator if you notice activity you did not authorize.",
          },
        ],
      },
      {
        title: {
          th: "สิทธิในสื่อและการใช้งานที่อนุญาต",
          en: "Media rights and permitted use",
        },
        bullets: [
          {
            th: "ส่งสื่อเมื่อการบันทึกและประมวลผลอยู่ในขอบเขตสิทธิ ใบอนุญาต หรือข้อยกเว้นตามกฎหมายที่เกี่ยวข้อง",
            en: "Submit media only when saving and processing it fall within applicable rights, license terms, or legal exceptions.",
          },
          {
            th: "ก่อนเข้าคิว คุณต้องยืนยันว่าการบันทึกและการใช้สื่อตามแผนอยู่ในขอบเขตดังกล่าว และรับผิดชอบต่อการใช้ไฟล์ที่ได้ตามกฎหมายและสิทธิของผู้อื่น",
            en: "Before queueing a job, you must confirm that saving the media and your intended use fall within that scope, and remain responsible for lawful use of the resulting file and respect for others’ rights.",
          },
          {
            th: "ห้ามใช้บริการเพื่อหลบเลี่ยง DRM ระบบล็อกอิน age gate ข้อจำกัดการเข้าถึง หรือมาตรการของแพลตฟอร์ม และห้ามส่งสื่อส่วนตัวหรือสื่อที่ไม่มีสิทธิ์เข้าถึง",
            en: "Do not use the service to bypass DRM, login walls, age gates, access restrictions, or platform safeguards. Do not submit private media or media you are not authorized to access.",
          },
        ],
      },
      {
        title: {
          th: "การตรวจลิงก์และการให้บริการ",
          en: "Link checks and service availability",
        },
        paragraphs: [
          {
            th: "ระบบตรวจสอบลิงก์และนโยบายก่อนวิเคราะห์ และอาจปฏิเสธลิงก์ที่ไม่รองรับ ไม่ปลอดภัย หรือมีข้อจำกัด ความละเอียด รูปแบบไฟล์ และการประมวลผลขึ้นอยู่กับสื่อและแพลตฟอร์มต้นทาง จึงไม่รับประกันว่าทุกลิงก์จะใช้งานได้หรือได้ผลลัพธ์เหมือนกัน",
            en: "The service checks links and policy before analysis and may reject unsupported, unsafe, or restricted links. Available resolutions, file formats, and processing depend on the source media and platform; therefore, not every link will work or produce the same result.",
          },
          {
            th: "แพลตฟอร์มต้นทางมีข้อกำหนดของตนเอง คุณมีหน้าที่ปฏิบัติตามข้อกำหนดเหล่านั้นและกฎหมายที่เกี่ยวข้อง",
            en: "Source platforms have their own terms. You are responsible for complying with those terms and applicable law.",
          },
        ],
      },
      {
        title: { th: "ไฟล์และประวัติงาน", en: "Files and job history" },
        table: {
          caption: {
            th: "ไฟล์ผลลัพธ์กับประวัติงานถูกจัดเก็บต่างกันอย่างไร",
            en: "How output files and job history are handled",
          },
          firstColumn: { th: "รายการ", en: "Item" },
          columns: [
            {
              th: "การจัดเก็บและการลบ",
              en: "Storage and deletion",
            },
          ],
          rows: [
            {
              label: { th: "ไฟล์ผลลัพธ์", en: "Output file" },
              cells: [
                {
                  th: "เมื่อแปลงเสร็จ ระบบพักไฟล์ไว้บนเซิร์ฟเวอร์ชั่วคราวเพื่อให้ดาวน์โหลด ค่าเริ่มต้น 60 นาทีและลบเป็นรอบ การติดตั้งบางแห่งอาจกำหนดเวลาแตกต่างกัน ควรบันทึกไฟล์ขณะที่ยังพร้อมใช้งาน",
                  en: "After processing, the file is kept temporarily on the server for download. The default is 60 minutes with periodic cleanup; a deployment may use a different setting. Save the file while it is available.",
                },
              ],
            },
            {
              label: { th: "ประวัติงาน", en: "Job history" },
              cells: [
                {
                  th: "ประวัติงานไม่ใช่ไฟล์ผลลัพธ์ และอาจยังอยู่หลังไฟล์ถูกลบ หากไฟล์หมดอายุ การเริ่มวิเคราะห์หรือสร้างงานใหม่ต้องส่งลิงก์ต้นทางอีกครั้ง คุณลบงานหรือบัญชีได้จากบริการ ดูรายละเอียดในประกาศความเป็นส่วนตัว",
                  en: "Job history is not the output file and may remain after the file is deleted. If a file expires, starting a new analysis or job requires submitting the source link again. You can delete a job or account from the service. See the Privacy Notice for details.",
                },
              ],
            },
          ],
        },
      },
      {
        title: { th: "การใช้งานที่ไม่เหมาะสม", en: "Misuse" },
        bullets: [
          {
            th: "ห้ามรบกวนระบบ พยายามเข้าถึงบัญชี งาน หรือไฟล์ของผู้อื่น หรือส่งคำขอที่มุ่งหลีกเลี่ยงข้อจำกัดของบริการ",
            en: "Do not disrupt the service, try to access another person’s account, jobs, or files, or submit requests intended to evade service restrictions.",
          },
          {
            th: "ระบบอาจบล็อกลิงก์หรือหยุดงานเมื่อพบความเสี่ยง การละเมิดข้อกำหนด หรือปัญหาทางเทคนิคที่กระทบความปลอดภัย",
            en: "The service may block a link or stop a job when it detects a risk, a terms violation, or a technical issue that affects safety.",
          },
        ],
      },
      {
        title: { th: "การเปลี่ยนแปลงข้อกำหนด", en: "Changes to these terms" },
        paragraphs: [
          {
            th: "เราอาจปรับปรุงข้อกำหนดเมื่อบริการหรือกฎหมายเปลี่ยนแปลง โดยจะแสดงวันที่ปรับปรุงล่าสุดไว้ในหน้านี้ วันที่ปรับปรุงล่าสุด: 20 ตุลาคม 2569",
            en: "We may update these terms when the service or law changes. The latest update date will be shown on this page. Last updated: 20 October 2026.",
          },
        ],
      },
      {
        title: { th: "ติดต่อผู้ดูแล", en: "Contact" },
        contactEmail: "tawan.wattanaroth@gmail.com",
        paragraphs: [
          {
            th: "หากมีคำถามเกี่ยวกับข้อกำหนด ติดต่อคุณตะวันทางอีเมลได้ที่",
            en: "For questions about these terms, email Mr. Tawan at",
          },
        ],
      },
    ],
  },
};

const getPolicySectionId = (kind: PolicyKind, index: number) =>
  `${kind}-section-${index + 1}`;
const getPolicyTableCaptionId = (kind: PolicyKind, index: number) =>
  `${kind}-table-caption-${index + 1}`;

function PolicyTableView({
  table,
  captionId,
  isThai,
  contentLanguage,
  thaiJustification,
}: {
  table: PolicyTable;
  captionId: string;
  isThai: boolean;
  contentLanguage: "th" | "en";
  thaiJustification: string;
}) {
  const locale = isThai ? "th" : "en";

  return (
    <div className="mt-4">
      <h3
        id={captionId}
        className="font-heading text-sm font-semibold text-text sm:text-base"
      >
        {table.caption[locale]}
      </h3>

      <p className="mt-2 text-xs text-text-dim lg:hidden">
        {isThai
          ? "เลื่อนตารางในแนวนอนเพื่อดูข้อมูลทั้งหมด"
          : "Scroll horizontally to view all table columns."}
      </p>

      <div
        role="region"
        aria-label={table.caption[locale]}
        tabIndex={0}
        className="mt-2 overflow-x-auto overscroll-x-contain rounded-xl border border-border/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:mt-3 dark:border-white/10"
      >
        <table
          aria-labelledby={captionId}
          className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm"
        >
          <caption className="sr-only">{table.caption[locale]}</caption>
          <thead className="bg-primary/10 text-text dark:bg-white/4">
            <tr>
              <th scope="col" className="w-1/5 px-4 py-3 font-semibold">
                {table.firstColumn[locale]}
              </th>
              {table.columns.map((column) => (
                <th key={column.en} scope="col" className="px-4 py-3 font-semibold">
                  {column[locale]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 dark:divide-white/10">
            {table.rows.map((row) => (
              <tr key={row.label.en} className="align-top">
                <th
                  scope="row"
                  className="wrap-break-word px-4 py-3 font-semibold text-text"
                >
                  {row.label[locale]}
                </th>
                {row.cells.map((cell, cellIndex) => {
                  const column = table.columns[cellIndex];
                  if (!column) return null;

                  return (
                    <td
                      key={column.en}
                      lang={contentLanguage}
                      className={`wrap-break-word px-4 py-3 leading-7 text-text-muted ${thaiJustification}`}
                    >
                      {cell[locale]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LegalPage({ kind }: { kind: PolicyKind }) {
  const { locale, t } = useT();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const isThai = locale === "th";
  const content = policyContent[kind];
  const sectionsCount = content.sections.length;
  const Icon = kind === "privacy" ? ShieldCheck : FileText;
  const otherKind: PolicyKind = kind === "privacy" ? "terms" : "privacy";
  const contentLanguage = isThai ? "th" : "en";
  const thaiJustification = isThai ? "thai-distributed" : "";
  const sectionTitle = (section: PolicySection) => section.title[isThai ? "th" : "en"];

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveSection = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const readingLine = window.innerHeight * 0.35;
        let nextActiveIndex = 0;

        for (let index = 0; index < sectionsCount; index += 1) {
          const section = document.getElementById(getPolicySectionId(kind, index));
          if (section && section.getBoundingClientRect().top <= readingLine) {
            nextActiveIndex = index;
          }
        }

        const reachedPageEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2;

        setActiveSectionIndex(reachedPageEnd ? sectionsCount - 1 : nextActiveIndex);
      });
    };

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [kind, sectionsCount]);

  const tableOfContents = (
    <nav aria-label={isThai ? "สารบัญ" : "Table of contents"}>
      <ol className="mt-3 space-y-1.5">
        {content.sections.map((section, index) => (
          <li key={section.title.en}>
            <Link
              href={`#${getPolicySectionId(kind, index)}`}
              aria-current={activeSectionIndex === index ? "location" : undefined}
              className={`group flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeSectionIndex === index
                  ? "bg-black/10 text-text-muted dark:bg-white/10"
                  : "text-text-dim hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span
                className={`mt-0.5 font-heading text-[11px] ${
                  activeSectionIndex === index ? "text-text-muted" : "text-text-dim"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{sectionTitle(section)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-bg-base text-text">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_55%)]"
      />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandMark size={36} className="size-9" />
          <span className="font-heading text-sm font-semibold tracking-tight">
            {t("app.name")}
          </span>
        </Link>
        <HeaderUtilityControls />
      </header>

      <article className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-2 sm:px-6 sm:pt-8 lg:px-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 rounded-lg py-2 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {isThai ? "กลับหน้าหลัก" : "Back to home"}
        </Link>

        <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
          <aside className="lg:sticky lg:top-6">
            <details className="group rounded-2xl border border-border/70 bg-bg-surface/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-bg-surface/65 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                <List aria-hidden="true" className="size-4 text-primary" />
                {isThai ? "สารบัญหัวข้อ" : "On this page"}
                <span className="ml-auto text-xs font-normal text-text-dim group-open:hidden">
                  {isThai ? "แสดง" : "Show"}
                </span>
                <span className="ml-auto hidden text-xs font-normal text-text-dim group-open:inline">
                  {isThai ? "ซ่อน" : "Hide"}
                </span>
              </summary>
              {tableOfContents}
            </details>

            <div className="hidden rounded-2xl border border-border/70 bg-bg-surface/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-bg-surface/65 lg:block">
              <p className="px-2.5 pt-1 text-xs font-semibold tracking-wide text-text-dim uppercase">
                {isThai ? "ในหน้านี้" : "On this page"}
              </p>
              {tableOfContents}
            </div>
          </aside>

          <div className="min-w-0 rounded-3xl border border-border/70 bg-bg-surface/75 p-5 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-bg-surface/65 dark:shadow-black/20 sm:p-8 md:p-10">
            <header className="mb-6 flex items-start gap-4 border-b border-border/60 pb-6 dark:border-white/10 sm:mb-8 sm:pb-7">
              <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  Media Loader
                </p>
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {content.title[isThai ? "th" : "en"]}
                </h1>
                <p
                  lang={contentLanguage}
                  className={`mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-base ${thaiJustification}`}
                >
                  {content.intro[isThai ? "th" : "en"]}
                </p>
              </div>
            </header>

            <section
              aria-labelledby="key-points-title"
              className="mb-7 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:mb-9 sm:p-5"
            >
              <h2
                id="key-points-title"
                className="font-heading text-sm font-semibold sm:text-base"
              >
                {isThai ? "ประเด็นสำคัญ" : "Key points"}
              </h2>
              <ul className="mt-3 grid gap-2.5 text-sm leading-6 text-text-muted sm:grid-cols-2">
                {content.summary.map((item) => (
                  <li key={item.en} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-primary"
                    />
                    <span>{item[isThai ? "th" : "en"]}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="divide-y divide-border/60 dark:divide-white/10">
              {content.sections.map((section, index) => (
                <section
                  key={section.title.en}
                  id={getPolicySectionId(kind, index)}
                  className="scroll-mt-6 py-6 first:pt-0 last:pb-0 sm:py-7"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="w-8 shrink-0 text-center font-heading text-lg font-semibold leading-7 text-text sm:text-xl"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-heading text-base font-semibold leading-7 sm:text-lg">
                      {sectionTitle(section)}
                    </h2>
                  </div>
                  <div className="mt-2.5 pl-0 sm:pl-11">
                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph.en}
                        lang={contentLanguage}
                        className={`mt-3 max-w-prose text-sm leading-7 text-text-muted first:mt-0 sm:text-[15px] sm:leading-8 ${thaiJustification}`}
                      >
                        {paragraph[isThai ? "th" : "en"]}
                      </p>
                    ))}
                    {section.table && (
                      <PolicyTableView
                        table={section.table}
                        captionId={getPolicyTableCaptionId(kind, index)}
                        isThai={isThai}
                        contentLanguage={contentLanguage}
                        thaiJustification={thaiJustification}
                      />
                    )}
                    {section.afterTableParagraphs?.map((paragraph) => (
                      <p
                        key={paragraph.en}
                        lang={contentLanguage}
                        className={`mt-3 max-w-prose text-sm leading-7 text-text-muted sm:text-[15px] sm:leading-8 ${thaiJustification}`}
                      >
                        {paragraph[isThai ? "th" : "en"]}
                      </p>
                    ))}
                    {section.contactEmail && (
                      <p className="mt-1 text-sm leading-7 sm:text-[15px] sm:leading-8">
                        <a
                          href={`mailto:${section.contactEmail}`}
                          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {section.contactEmail}
                        </a>
                      </p>
                    )}
                    {section.bullets && (
                      <ul className="mt-3 max-w-prose list-disc space-y-2.5 pl-5 text-sm leading-7 text-text-muted marker:text-primary sm:text-[15px] sm:leading-8">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet.en}
                            lang={contentLanguage}
                            className={`pl-1 ${thaiJustification}`}
                          >
                            {bullet.label && (
                              <span className="font-semibold text-text">
                                {bullet.label[isThai ? "th" : "en"]}—{" "}
                              </span>
                            )}
                            {bullet[isThai ? "th" : "en"]}
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.externalReference && (
                      <a
                        href="https://ratchakitcha.soc.go.th/documents/17082307.pdf"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {section.externalReference[isThai ? "th" : "en"]}
                        <ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </a>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 text-xs text-text-dim dark:border-white/10">
              <span>
                {isThai
                  ? "ปรับปรุงล่าสุด 20 ตุลาคม 2569"
                  : "Last updated 20 October 2026"}
              </span>
              <Link
                href={otherKind === "privacy" ? "/privacy" : "/terms"}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {policyContent[otherKind].title[isThai ? "th" : "en"]}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      <SiteFooter className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8" />
    </main>
  );
}
