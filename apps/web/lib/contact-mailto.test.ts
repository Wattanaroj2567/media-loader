import assert from "node:assert/strict";
import test from "node:test";

import { createContactMailtoUrl } from "./contact-mailto.ts";

test("createContactMailtoUrl encodes an English support message", () => {
  const url = createContactMailtoUrl({
    recipient: "help@example.com",
    topic: "account",
    replyEmail: "person@example.com",
    jobReference: "job-4",
    message: "A problem & its expected result",
    isThai: false,
  });

  const parsedUrl = new URL(url);
  assert.equal(parsedUrl.protocol, "mailto:");
  assert.equal(parsedUrl.pathname, "help@example.com");
  assert.equal(
    parsedUrl.searchParams.get("subject"),
    "[Media Loader] Account and usage"
  );
  assert.match(parsedUrl.searchParams.get("body") ?? "", /Job or error ID: job-4/);
  assert.match(
    parsedUrl.searchParams.get("body") ?? "",
    /A problem & its expected result/
  );
});

test("createContactMailtoUrl includes the selected personal data request", () => {
  const url = createContactMailtoUrl({
    recipient: "help@example.com",
    topic: "privacy",
    requestType: "deletion",
    message: "Please delete my saved profile data.",
    isThai: true,
  });

  const parsedUrl = new URL(url);
  assert.equal(parsedUrl.searchParams.get("subject"), "[Media Loader] ข้อมูลส่วนบุคคล");
  assert.match(parsedUrl.searchParams.get("body") ?? "", /ประเภทคำขอ: ลบข้อมูล/);
  assert.match(
    parsedUrl.searchParams.get("body") ?? "",
    /Please delete my saved profile data\./
  );
});
