"""Exercise the actual workflow shell with fake HTTP responses and no credentials."""

import os
import shutil
import subprocess
import textwrap
import unittest
from pathlib import Path

WORKFLOW = (
    Path(__file__).resolve().parents[1] / ".github/workflows/keep-alive-supabase.yml"
)
BASH = "C:/Program Files/Git/bin/bash.exe" if os.name == "nt" else shutil.which("bash")
MOCKS = r"""
curl() {
  local arg endpoint="${!#}" has_apikey=false
  for arg in "$@"; do
    case "$arg" in
      'Authorization: Bearer sb_publishable_'*) printf '401'; return 0 ;;
      "apikey: $SUPABASE_ANON_KEY") has_apikey=true ;;
    esac
  done
  if [ "$has_apikey" != true ]; then printf '401'; return 0; fi
  case "$endpoint" in
    https://example.supabase.co/rest/v1/) printf '401'; return 0 ;;
    'https://example.supabase.co/rest/v1/profiles?select=id&limit=0'|https://example.supabase.co/auth/v1/health) ;;
    *) printf '404'; return 0 ;;
  esac
  case "$MOCK_MODE" in
    unauthorized) if [[ "$endpoint" == */rest/* ]]; then printf '401'; else printf '200'; fi ;;
    forbidden) if [[ "$endpoint" == */rest/* ]]; then printf '403'; else printf '200'; fi ;;
    unavailable) printf '503' ;;
    transport) printf '000'; return 7 ;;
    transient) if [ "$attempt" -eq 1 ]; then printf '503'; else printf '200'; fi ;;
    auth_failure) if [[ "$endpoint" == */auth/* ]]; then printf '503'; else printf '200'; fi ;;
    *) printf '200' ;;
  esac
}
sleep() { :; }
"""


class KeepAliveTests(unittest.TestCase):
    def run_ping(
        self,
        mode: str = "success",
        key: str = "sb_publishable_placeholder",
        url: str = "https://example.supabase.co/",
    ) -> subprocess.CompletedProcess[str]:
        shell = textwrap.dedent(WORKFLOW.read_text().split("        run: |\n", 1)[1])
        result = subprocess.run(
            [
                str(BASH),
                "--noprofile",
                "--norc",
                "-e",
                "-o",
                "pipefail",
                "-c",
                MOCKS + shell,
            ],
            env={
                "SUPABASE_URL": url,
                "SUPABASE_ANON_KEY": key,
                "MOCK_MODE": mode,
                "PATH": os.defpath,
                "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            },
            capture_output=True,
            text=True,
            timeout=10,
        )
        if key:
            self.assertNotIn(key, result.stdout + result.stderr)
        return result

    def test_publishable_key(self):
        self.assertEqual(self.run_ping().returncode, 0)

    def test_legacy_key(self):
        self.assertEqual(self.run_ping(key="eyJ.placeholder.signature").returncode, 0)

    def test_missing_key(self):
        result = self.run_ping(key="")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("Attempt", result.stdout)

    def test_missing_url(self):
        result = self.run_ping(url="")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("Attempt", result.stdout)

    def test_transient_failure_recovers(self):
        result = self.run_ping("transient")
        self.assertEqual(result.returncode, 0)
        self.assertIn("Attempt 2", result.stdout)

    def test_persistent_failures(self):
        for mode in ("unavailable", "transport", "auth_failure"):
            with self.subTest(mode=mode):
                result = self.run_ping(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Attempt 2", result.stdout)

    def test_authentication_errors_fail_without_retry(self):
        for mode in ("unauthorized", "forbidden"):
            with self.subTest(mode=mode):
                result = self.run_ping(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("::error::", result.stdout)
                self.assertNotIn("Attempt 2", result.stdout)


if __name__ == "__main__":
    unittest.main()
