/**
 * File types that can run code on the receiver's device when opened (Growth Step 7c, D3).
 * Used only to show a WARNING before download; nothing is ever blocked (a block list is easy to
 * bypass by renaming or zipping, and people legitimately share scripts and installers).
 * Archives (.zip, .rar, .7z) are not listed: they don't run by themselves.
 */
export const RISKY_EXTENSIONS: ReadonlySet<string> = new Set([
  // Windows programs, installers and scripts
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "cpl", "dll", "reg", "lnk",
  "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta",
  // Cross-platform and other systems
  "jar", "apk", "sh", "dmg", "pkg", "app",
]);

/**
 * The risky extension of a file name ("exe" for "invoice.pdf.exe"), or null.
 * Only the LAST extension decides what the system runs, so that's the one checked.
 */
export function riskyExtension(fileName: string | null | undefined): string | null {
  const m = /\.([A-Za-z0-9]+)\s*$/.exec(fileName ?? "");
  const ext = m?.[1].toLowerCase();
  return ext && RISKY_EXTENSIONS.has(ext) ? ext : null;
}
