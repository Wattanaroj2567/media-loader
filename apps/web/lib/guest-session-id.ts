export interface GuestSessionCrypto {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

export function createSecureGuestSessionId(
  cryptoApi: GuestSessionCrypto | undefined
): string {
  if (!cryptoApi) return "";
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi.getRandomValues !== "function") return "";

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  return `guest_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
