import assert from "node:assert/strict";
import test from "node:test";

import { hostnameMatchesDomain, urlMatchesDomain } from "./url-domains.ts";

test("hostnameMatchesDomain accepts the exact host and its subdomains", () => {
  assert.equal(hostnameMatchesDomain("youtube.com", "youtube.com"), true);
  assert.equal(hostnameMatchesDomain("www.youtube.com", "youtube.com"), true);
});

test("hostnameMatchesDomain rejects suffix-spoofed hosts", () => {
  assert.equal(
    hostnameMatchesDomain("youtube.com.attacker.example", "youtube.com"),
    false
  );
  assert.equal(hostnameMatchesDomain("notyoutube.com", "youtube.com"), false);
});

test("urlMatchesDomain validates the parsed hostname", () => {
  assert.equal(
    urlMatchesDomain("https://media.giphy.com/media/id.gif", "giphy.com"),
    true
  );
  assert.equal(
    urlMatchesDomain("https://giphy.com.attacker.example/id", "giphy.com"),
    false
  );
  assert.equal(urlMatchesDomain("not a url", "giphy.com"), false);
});
