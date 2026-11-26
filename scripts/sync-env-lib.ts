/**
 * Pure helpers for `scripts/sync-env.ts`.
 *
 * These functions only deal with variable NAMES and placeholder text taken from
 * `.env.example`. Values from a real `.env.local` are never returned, logged,
 * or copied anywhere other than back into the same file untouched.
 */

export interface ExampleEntry {
  key: string;
  /** The exact `KEY=value` placeholder line from `.env.example`. */
  line: string;
  /** Comment lines directly above the key (no blank line in between). */
  comments: string[];
}

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Parse a `KEY=value` line. Returns the key, or null for comments/blank/invalid. */
export function parseKey(rawLine: string): string | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const withoutExport = trimmed.replace(/^export\s+/, "");
  const equals = withoutExport.indexOf("=");
  if (equals <= 0) return null;
  const key = withoutExport.slice(0, equals).trim();
  return KEY_PATTERN.test(key) ? key : null;
}

/** Return the variable names that are defined (uncommented) in an env file. */
export function parseEnvKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const line of splitLines(text)) {
    const key = parseKey(line);
    if (key) keys.add(key);
  }
  return keys;
}

/** Parse active entries from `.env.example`, keeping their leading comments. */
export function parseExampleEntries(text: string): ExampleEntry[] {
  const entries: ExampleEntry[] = [];
  const seen = new Set<string>();
  let comments: string[] = [];
  for (const line of splitLines(text)) {
    const trimmed = line.trim();
    if (!trimmed) {
      comments = [];
      continue;
    }
    if (trimmed.startsWith("#")) {
      // Section banners (`# ====`) are layout noise; drop them.
      if (!/^#\s*=+\s*$/.test(trimmed)) comments.push(line.trimEnd());
      continue;
    }
    const key = parseKey(line);
    if (key && !seen.has(key)) {
      seen.add(key);
      entries.push({ key, line: line.trimEnd(), comments });
    }
    comments = [];
  }
  return entries;
}

export interface SyncResult {
  /** Names of variables present in the example but missing from the target. */
  added: string[];
  /** Names present in the target but unknown to the example (informational). */
  unknown: string[];
  /** The updated file contents (identical to the input when nothing was added). */
  content: string;
}

/**
 * Append variables that exist in `.env.example` but not in the target file.
 * Existing lines and values are never modified or removed.
 */
export function syncEnv(
  exampleText: string,
  targetText: string,
  date: string
): SyncResult {
  const entries = parseExampleEntries(exampleText);
  const targetKeys = parseEnvKeys(targetText);
  const missing = entries.filter((entry) => !targetKeys.has(entry.key));
  const exampleKeys = new Set(entries.map((entry) => entry.key));
  const unknown = [...targetKeys].filter((key) => !exampleKeys.has(key)).sort();

  if (missing.length === 0) {
    return { added: [], unknown, content: targetText };
  }

  const eol = targetText.includes("\r\n") ? "\r\n" : "\n";
  const block: string[] = [
    `# --- Added by pnpm env:sync on ${date} (fill in the values) ---`,
  ];
  for (const entry of missing) {
    block.push(...entry.comments, entry.line);
  }

  let base = targetText;
  if (base.length > 0 && !base.endsWith("\n")) base += eol;
  if (base.length > 0) base += eol;
  return {
    added: missing.map((entry) => entry.key),
    unknown,
    content: base + block.join(eol) + eol,
  };
}
