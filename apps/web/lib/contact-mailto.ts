type LocaleCopy = { th: string; en: string };

export type ContactTopic = "account" | "rights" | "privacy";
export type ContactRequestType = "access" | "correction" | "deletion";

export const CONTACT_EMAIL = "tawan.wattanaroth@gmail.com";

type ContactMailtoInput = {
  recipient: string;
  topic: ContactTopic;
  requestType?: ContactRequestType;
  replyEmail?: string;
  jobReference?: string;
  message: string;
  isThai: boolean;
};

const topicLabels: Record<ContactTopic, LocaleCopy> = {
  account: { th: "บัญชีและการใช้งาน", en: "Account and usage" },
  rights: { th: "ข้อกำหนดและสิทธิ์", en: "Terms and rights" },
  privacy: { th: "ข้อมูลส่วนบุคคล", en: "Personal data" },
};

const requestLabels: Record<ContactRequestType, LocaleCopy> = {
  access: { th: "ขอดูหรือขอสำเนาข้อมูล", en: "Access or copy my data" },
  correction: { th: "แก้ไขข้อมูล", en: "Correct my data" },
  deletion: { th: "ลบข้อมูล", en: "Delete my data" },
};

export function createContactMailtoUrl({
  recipient,
  topic,
  requestType,
  replyEmail,
  jobReference,
  message,
  isThai,
}: ContactMailtoInput): string {
  const language = isThai ? "th" : "en";
  const selectedTopic = topicLabels[topic][language];
  const subject = `[Media Loader] ${selectedTopic}`;
  const body = isThai
    ? [
        `หัวข้อ: ${selectedTopic}`,
        ...(requestType ? [`ประเภทคำขอ: ${requestLabels[requestType][language]}`] : []),
        `อีเมลสำหรับติดต่อกลับ: ${replyEmail?.trim() || "ไม่ได้ระบุ"}`,
        `รหัสงานหรือข้อผิดพลาด: ${jobReference?.trim() || "ไม่ได้ระบุ"}`,
        "",
        "รายละเอียด:",
        message.trim(),
      ].join("\n")
    : [
        `Topic: ${selectedTopic}`,
        ...(requestType
          ? [`Request type: ${requestLabels[requestType][language]}`]
          : []),
        `Reply email: ${replyEmail?.trim() || "Not provided"}`,
        `Job or error ID: ${jobReference?.trim() || "Not provided"}`,
        "",
        "Details:",
        message.trim(),
      ].join("\n");

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
