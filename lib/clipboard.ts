/**
 * Copies text to the clipboard.
 * navigator.clipboard needs a secure context (https or localhost). On plain http,
 * e.g. testing from a phone at http://192.168.x.x:3000, fall back to a temporary
 * textarea + execCommand("copy").
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the fallback */
    }
  }
  try {
    const active = document.activeElement as HTMLElement | null;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    active?.focus(); // keep focus on the button the user pressed
    return ok;
  } catch {
    return false;
  }
}
