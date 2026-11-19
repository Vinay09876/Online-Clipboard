import { ClipboardApp } from "@/components/ClipboardApp";
import { MAX_TEXT_LENGTH } from "@/lib/clips";
import { CLIP_EXPIRY_MINUTES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config";

/**
 * Server Component. Reads the limits from server config and passes plain numbers to the
 * client, so lib/config.ts (which holds secrets) is never bundled for the browser.
 */
export default function Home() {
  const limits = {
    maxTextLength: MAX_TEXT_LENGTH,
    maxFileBytes: MAX_FILE_SIZE_BYTES,
    maxFileMb: MAX_FILE_SIZE_MB,
    expiryMinutes: CLIP_EXPIRY_MINUTES,
  };

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-14">
      <header className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Online Clipboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Share text or a file with a 6-digit code. Everything is deleted after {CLIP_EXPIRY_MINUTES} minutes.
        </p>
      </header>

      <ClipboardApp limits={limits} />
    </main>
  );
}
