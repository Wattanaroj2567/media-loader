export function hostnameMatchesDomain(
  hostname: string | null | undefined,
  domain: string
): boolean {
  if (!hostname) return false;
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, "");
  return (
    normalizedHostname === normalizedDomain ||
    normalizedHostname.endsWith(`.${normalizedDomain}`)
  );
}

export function urlMatchesDomain(
  value: string | null | undefined,
  domain: string
): boolean {
  if (!value) return false;
  try {
    return hostnameMatchesDomain(new URL(value).hostname, domain);
  } catch {
    return false;
  }
}
