import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy / ความเป็นส่วนตัว",
  description: "ประกาศความเป็นส่วนตัวของ Media Loader",
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
