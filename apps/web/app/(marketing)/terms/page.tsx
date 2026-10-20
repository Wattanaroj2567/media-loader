import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms / ข้อกำหนดการใช้งาน",
  description: "ข้อกำหนดการใช้บริการ Media Loader",
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
