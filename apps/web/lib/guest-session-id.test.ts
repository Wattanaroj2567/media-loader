import assert from "node:assert/strict";
import test from "node:test";

import { createSecureGuestSessionId } from "./guest-session-id.ts";

test("guest session identifiers prefer the platform UUID generator", () => {
  const sessionId = createSecureGuestSessionId({
    randomUUID: () => "secure-uuid",
    getRandomValues: () => {
      throw new Error("randomUUID should be preferred");
    },
  });

  assert.equal(sessionId, "secure-uuid");
});

test("guest session identifiers use cryptographic bytes when UUID is unavailable", () => {
  const sessionId = createSecureGuestSessionId({
    getRandomValues: (array) => array.fill(0xab),
  });

  assert.equal(sessionId, `guest_${"ab".repeat(16)}`);
});

test("guest session identifiers fail closed without a cryptographic source", () => {
  assert.equal(createSecureGuestSessionId(undefined), "");
  assert.equal(createSecureGuestSessionId({}), "");
});
