import { test, expect } from '@playwright/test';
import { validateUrl } from '../lib/url-validation';

test.describe('URL Analyzer Logic Validation', () => {
  test('should invalidate empty URL', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL is required');
  });

  test('should invalidate blocked protocols (ftp, file, javascript)', () => {
    const ftpResult = validateUrl('ftp://example.com/file.mp4');
    expect(ftpResult.valid).toBe(false);
    expect(ftpResult.error).toContain('Blocked protocol');

    const fileResult = validateUrl('file:///C:/Windows/system32');
    expect(fileResult.valid).toBe(false);
    expect(fileResult.error).toContain('Blocked protocol');
  });

  test('should invalidate private IP and SSRF target hostnames', () => {
    const localhostResult = validateUrl('http://localhost:8000/media');
    expect(localhostResult.valid).toBe(false);
    expect(localhostResult.error).toContain('blocked for safety');

    const privateIpResult = validateUrl('http://192.168.1.1/video.mp4');
    expect(privateIpResult.valid).toBe(false);
    expect(privateIpResult.error).toContain('RFC 1918');
  });

  test('should validate allowed public HTTP/HTTPS URLs', () => {
    const validResult = validateUrl('https://upload.wikimedia.org/wikipedia/commons/test.mp4');
    expect(validResult.valid).toBe(true);
    expect(validResult.url).toBe('https://upload.wikimedia.org/wikipedia/commons/test.mp4');
  });
});
