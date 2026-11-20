import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Shown for any unknown URL (status 404). The site footer comes from the root layout. */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-5xl font-bold tracking-widest text-zinc-400 dark:text-zinc-600">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This page doesn&apos;t exist. If someone gave you a code, open the home page and enter it under Receive.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        Go to Online Clipboard
      </Link>
    </div>
  );
}
