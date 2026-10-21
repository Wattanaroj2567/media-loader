import type { Metadata } from "next";

import { HowItWorksPage } from "@/components/how-it-works-page";

export const metadata: Metadata = {
  title: "How it works / วิธีทำงาน",
  description:
    "See how Media Loader queues, processes, and delivers a selected media file.",
};

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}
