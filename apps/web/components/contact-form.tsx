"use client";

import { useState, type FormEvent } from "react";

import {
  createContactMailtoUrl,
  type ContactRequestType,
  type ContactTopic,
} from "@/lib/contact-mailto";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import fieldStyles from "./form-field.module.css";

type ContactFormProps = {
  initialTopic: ContactTopic;
  recipient: string;
  isThai: boolean;
};
type ValidationField = "message" | "replyEmail" | "requestType";
type ValidationErrors = Partial<Record<ValidationField, string>>;

const fieldClassName = `${fieldStyles.field} w-full text-base text-text`;

const TOPIC_OPTIONS: readonly {
  value: ContactTopic;
  label: { th: string; en: string };
}[] = [
  { value: "account", label: { th: "บัญชีหรือการใช้งาน", en: "Account or usage" } },
  {
    value: "rights",
    label: { th: "ข้อกำหนดหรือสิทธิ์การใช้สื่อ", en: "Terms or media rights" },
  },
  {
    value: "privacy",
    label: { th: "คำขอเกี่ยวกับข้อมูลส่วนบุคคล", en: "Personal data request" },
  },
];

const REQUEST_TYPE_OPTIONS: readonly {
  value: ContactRequestType;
  label: { th: string; en: string };
}[] = [
  {
    value: "access",
    label: { th: "ขอดูหรือขอสำเนาข้อมูล", en: "Access or copy my data" },
  },
  { value: "correction", label: { th: "แก้ไขข้อมูล", en: "Correct my data" } },
  { value: "deletion", label: { th: "ลบข้อมูล", en: "Delete my data" } },
];

const MAX_MESSAGE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 120;
const MAX_JOB_REFERENCE_LENGTH = 120;

export function ContactForm({ initialTopic, recipient, isThai }: ContactFormProps) {
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [requestType, setRequestType] = useState<ContactRequestType | "">("");
  const [messageLength, setMessageLength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  function clearValidationError(field: ValidationField) {
    setValidationErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);
    const topicValue = String(fields.get("topic") ?? topic);
    const requestTypeValue = String(fields.get("requestType") ?? requestType);
    const topics: ContactTopic[] = ["account", "rights", "privacy"];
    const requestTypes: ContactRequestType[] = ["access", "correction", "deletion"];
    const selectedTopic = topics.includes(topicValue as ContactTopic)
      ? (topicValue as ContactTopic)
      : "rights";
    const selectedRequestType = requestTypes.includes(
      requestTypeValue as ContactRequestType
    )
      ? (requestTypeValue as ContactRequestType)
      : undefined;
    const replyEmail = String(fields.get("replyEmail") ?? "").trim();
    const message = String(fields.get("message") ?? "").trim();
    const emailInput = form.elements.namedItem("replyEmail") as HTMLInputElement | null;
    const nextErrors: ValidationErrors = {};

    if (!message) {
      nextErrors.message = isThai
        ? "กรุณากรอกรายละเอียดที่ต้องการติดต่อ"
        : "Please enter the details of your request.";
    } else if (message.length > MAX_MESSAGE_LENGTH) {
      nextErrors.message = isThai
        ? `ข้อความต้องไม่เกิน ${MAX_MESSAGE_LENGTH.toLocaleString()} ตัวอักษร`
        : `Message must not exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`;
    }
    if (replyEmail && emailInput?.validity.typeMismatch) {
      nextErrors.replyEmail = isThai
        ? "กรุณาตรวจรูปแบบอีเมล เช่น name@example.com"
        : "Enter an email address in the format name@example.com.";
    }
    if (selectedTopic === "privacy" && !selectedRequestType) {
      nextErrors.requestType = isThai
        ? "กรุณาเลือกสิ่งที่ต้องการให้จัดการ"
        : "Choose what you would like us to do.";
    }

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField: ValidationField = nextErrors.replyEmail
        ? "replyEmail"
        : nextErrors.requestType
          ? "requestType"
          : "message";
      if (firstInvalidField === "requestType") {
        document.getElementById("privacy-contact-request-type")?.focus();
      } else {
        (form.elements.namedItem(firstInvalidField) as HTMLElement | null)?.focus();
      }
      return;
    }

    window.location.href = createContactMailtoUrl({
      recipient,
      topic: selectedTopic,
      requestType: selectedRequestType,
      replyEmail,
      jobReference: String(fields.get("jobReference") ?? ""),
      message,
      isThai,
    });
  }

  const labelClassName = "block text-xs font-medium text-text";

  return (
    <form
      data-testid="contact-form"
      onSubmit={handleSubmit}
      noValidate
      className="mt-2 grid max-w-2xl gap-3 sm:gap-3.5 rounded-[18px] border border-border bg-bg-elevated/75 p-4 sm:p-5"
    >
      <div>
        <label className={labelClassName} htmlFor="contact-topic">
          {isThai ? "เรื่องที่ต้องการติดต่อ" : "What is this about?"}
        </label>
        <Select
          name="topic"
          value={topic}
          onValueChange={(val) => {
            if (val) {
              setTopic(val as ContactTopic);
              setRequestType("");
              clearValidationError("requestType");
            }
          }}
        >
          <SelectTrigger
            id="contact-topic"
            size="lg"
            className="mt-0.5 w-full justify-between rounded-lg border border-border bg-bg-base px-3.5 text-base text-text transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 dark:bg-bg-base"
          >
            <SelectValue
              placeholder={isThai ? "เลือกเรื่องที่ต้องการติดต่อ" : "Select a topic"}
            >
              {(val: ContactTopic | string | null) =>
                TOPIC_OPTIONS.find((opt) => opt.value === val)?.label[
                  isThai ? "th" : "en"
                ] ?? (isThai ? "เลือกเรื่องที่ต้องการติดต่อ" : "Select a topic")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            className="border border-border/80 bg-bg-elevated/95 p-1 text-text shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-bg-elevated/95"
          >
            {TOPIC_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer py-2 pr-8 pl-3 text-sm text-text transition-colors hover:bg-black/5 focus:bg-black/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
              >
                {opt.label[isThai ? "th" : "en"]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {topic === "privacy" && (
        <div>
          <label className={labelClassName} htmlFor="privacy-contact-request-type">
            {isThai ? "ต้องการจัดการข้อมูลอย่างไร" : "What would you like us to do?"}
          </label>
          <Select
            name="requestType"
            value={requestType || null}
            onValueChange={(val) => {
              setRequestType((val as ContactRequestType) || "");
              clearValidationError("requestType");
            }}
          >
            <SelectTrigger
              id="privacy-contact-request-type"
              size="lg"
              aria-invalid={Boolean(validationErrors.requestType)}
              aria-describedby={
                validationErrors.requestType
                  ? "privacy-contact-request-type-error"
                  : undefined
              }
              className={cn(
                "mt-0.5 w-full justify-between rounded-lg border border-border bg-bg-base px-3.5 text-base text-text transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 dark:bg-bg-base",
                validationErrors.requestType &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
              )}
            >
              <SelectValue
                placeholder={isThai ? "เลือกประเภทคำขอ" : "Select a request type"}
              >
                {(val: ContactRequestType | string | null) =>
                  REQUEST_TYPE_OPTIONS.find((opt) => opt.value === val)?.label[
                    isThai ? "th" : "en"
                  ] ?? (isThai ? "เลือกประเภทคำขอ" : "Select a request type")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              className="border border-border/80 bg-bg-elevated/95 p-1 text-text shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-bg-elevated/95"
            >
              {REQUEST_TYPE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="cursor-pointer py-2 pr-8 pl-3 text-sm text-text transition-colors hover:bg-black/5 focus:bg-black/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
                >
                  {opt.label[isThai ? "th" : "en"]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.requestType && (
            <p
              className="mt-1.5 text-xs leading-5 text-destructive"
              id="privacy-contact-request-type-error"
              role="alert"
            >
              {validationErrors.requestType}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="contact-email">
            {isThai ? "อีเมลสำหรับติดต่อกลับ (ไม่บังคับ)" : "Reply email (optional)"}
          </label>
          <input
            aria-describedby={
              validationErrors.replyEmail ? "contact-email-error" : undefined
            }
            aria-invalid={Boolean(validationErrors.replyEmail)}
            autoComplete="email"
            className={fieldClassName}
            id="contact-email"
            maxLength={MAX_EMAIL_LENGTH}
            name="replyEmail"
            onChange={() => clearValidationError("replyEmail")}
            placeholder="you@example.com"
            type="email"
          />
          {validationErrors.replyEmail && (
            <p
              className="mt-1.5 text-xs leading-5 text-destructive"
              id="contact-email-error"
              role="alert"
            >
              {validationErrors.replyEmail}
            </p>
          )}
        </div>
        <div>
          <label className={labelClassName} htmlFor="contact-job-reference">
            {isThai
              ? "ข้อความแจ้งเตือนหรือรหัสงาน (ถ้ามี)"
              : "Error message or job ID (optional)"}
          </label>
          <input
            className={fieldClassName}
            id="contact-job-reference"
            maxLength={MAX_JOB_REFERENCE_LENGTH}
            name="jobReference"
            placeholder={
              isThai ? "เช่น “วิเคราะห์ไม่สำเร็จ”" : "e.g. “Analysis failed”"
            }
            type="text"
          />
        </div>
      </div>

      <div>
        <label className={labelClassName} htmlFor="contact-message">
          {isThai ? "รายละเอียด" : "Details"}
        </label>
        <div className={fieldStyles.textareaWrapper}>
          <textarea
            aria-describedby={
              validationErrors.message ? "contact-message-error" : undefined
            }
            aria-invalid={Boolean(validationErrors.message)}
            className={fieldStyles.textareaInput}
            id="contact-message"
            maxLength={MAX_MESSAGE_LENGTH}
            name="message"
            onChange={(event) => {
              setMessageLength(event.currentTarget.value.length);
              clearValidationError("message");
            }}
            placeholder={
              isThai
                ? "เล่าเรื่องที่ต้องการติดต่อ หรือระบุข้อมูลที่ต้องการขอดู แก้ไข หรือลบ"
                : "Describe your question or the information you want to access, correct, or delete."
            }
            required
            rows={3}
          />
          <div className={fieldStyles.textareaCounter}>
            <span aria-live="polite">
              {messageLength.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>
        {validationErrors.message && (
          <p
            className="mt-1.5 text-xs leading-5 text-destructive"
            id="contact-message-error"
            role="alert"
          >
            {validationErrors.message}
          </p>
        )}
      </div>

      <p className="text-xs leading-5 text-text-muted">
        {isThai
          ? "เมื่อกดปุ่ม ระบบจะเปิดแอปอีเมลพร้อมข้อความให้ตรวจและกดส่ง กรุณาอย่าส่งรหัสผ่าน รหัสยืนยัน โทเค็นเข้าสู่ระบบ หรือ cookies"
          : "The button opens your email app with a prepared message for you to review and send. Do not include passwords, verification codes, sign-in tokens, or cookies."}
      </p>

      <button
        className="min-h-11 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 sm:w-fit"
        type="submit"
      >
        {isThai ? "เปิดแอปอีเมลเพื่อส่ง" : "Open email app to send"}
      </button>
    </form>
  );
}
