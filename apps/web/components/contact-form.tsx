"use client";

import { useState, type FormEvent } from "react";

import {
  createContactMailtoUrl,
  type ContactRequestType,
  type ContactTopic,
} from "@/lib/contact-mailto";
import fieldStyles from "./form-field.module.css";

type ContactFormProps = {
  initialTopic: ContactTopic;
  recipient: string;
  isThai: boolean;
};
type ValidationField = "message" | "replyEmail" | "requestType";
type ValidationErrors = Partial<Record<ValidationField, string>>;

const fieldClassName = `${fieldStyles.field} w-full text-base text-text`;

export function ContactForm({ initialTopic, recipient, isThai }: ContactFormProps) {
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
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
    const topicValue = String(fields.get("topic") ?? "rights");
    const requestTypeValue = String(fields.get("requestType") ?? "");
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
      (form.elements.namedItem(firstInvalidField) as HTMLElement | null)?.focus();
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
      className="mt-5 grid max-w-2xl gap-4 rounded-[18px] border border-border bg-bg-elevated/75 p-4 sm:p-5"
    >
      <div>
        <label className={labelClassName} htmlFor="contact-topic">
          {isThai ? "เรื่องที่ต้องการติดต่อ" : "What is this about?"}
        </label>
        <select
          className={fieldClassName}
          id="contact-topic"
          name="topic"
          value={topic}
          onChange={(event) => {
            setTopic(event.currentTarget.value as ContactTopic);
            clearValidationError("requestType");
          }}
        >
          <option value="account">
            {isThai ? "บัญชีหรือการใช้งาน" : "Account or usage"}
          </option>
          <option value="rights">
            {isThai ? "ข้อกำหนดหรือสิทธิ์การใช้สื่อ" : "Terms or media rights"}
          </option>
          <option value="privacy">
            {isThai ? "คำขอเกี่ยวกับข้อมูลส่วนบุคคล" : "Personal data request"}
          </option>
        </select>
      </div>

      {topic === "privacy" && (
        <div>
          <label className={labelClassName} htmlFor="privacy-contact-request-type">
            {isThai ? "ต้องการจัดการข้อมูลอย่างไร" : "What would you like us to do?"}
          </label>
          <select
            aria-describedby={
              validationErrors.requestType
                ? "privacy-contact-request-type-error"
                : undefined
            }
            aria-invalid={Boolean(validationErrors.requestType)}
            className={fieldClassName}
            defaultValue=""
            id="privacy-contact-request-type"
            name="requestType"
            onChange={() => clearValidationError("requestType")}
            required
          >
            <option value="">
              {isThai ? "เลือกประเภทคำขอ" : "Select a request type"}
            </option>
            <option value="access">
              {isThai ? "ขอดูหรือขอสำเนาข้อมูล" : "Access or copy my data"}
            </option>
            <option value="correction">
              {isThai ? "แก้ไขข้อมูล" : "Correct my data"}
            </option>
            <option value="deletion">{isThai ? "ลบข้อมูล" : "Delete my data"}</option>
          </select>
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
        <textarea
          aria-describedby={
            validationErrors.message ? "contact-message-error" : undefined
          }
          aria-invalid={Boolean(validationErrors.message)}
          className={`${fieldClassName} ${fieldStyles.textarea}`}
          id="contact-message"
          name="message"
          placeholder={
            isThai
              ? "เล่าเรื่องที่ต้องการติดต่อ หรือระบุข้อมูลที่ต้องการขอดู แก้ไข หรือลบ"
              : "Describe your question or the information you want to access, correct, or delete."
          }
          maxLength={5000}
          onChange={() => clearValidationError("message")}
          required
          rows={4}
        />
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
