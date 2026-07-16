/**
 * Trigger a browser download of a Blob under the given filename.
 *
 * Creates a temporary object URL, clicks a hidden anchor, then revokes the URL.
 * Works in the browser / `ionic serve` / Capacitor WebView. (For native Android
 * & iOS a Filesystem + Share adapter would be needed — out of scope here.)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Guard for non-browser environments (e.g. SSR / unit tests).
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke on the next tick so the click has time to start the download.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
