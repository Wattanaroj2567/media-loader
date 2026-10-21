import type { Metadata } from "next";

import { ContactPage } from "@/components/contact-page";
import type { ContactTopic } from "@/lib/contact-mailto";

export const metadata: Metadata = {
  title: "Contact / ติดต่อผู้ดูแล",
  description: "ติดต่อผู้ดูแล Media Loader",
};

const contactTopics: ContactTopic[] = ["account", "rights", "privacy"];

export default async function ContactRoute({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { topic } = await searchParams;
  const initialTopic =
    typeof topic === "string" && contactTopics.includes(topic as ContactTopic)
      ? (topic as ContactTopic)
      : "account";

  return <ContactPage initialTopic={initialTopic} />;
}
