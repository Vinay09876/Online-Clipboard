/**
 * Guide registry: metadata only (no JSX), so lib/sitePages.ts and tests can import it.
 * The guide bodies live in content/guides/bodies.tsx.
 *
 * To add a guide: add an entry here (slug, dates, related) and a body in bodies.tsx, then
 * follow docs/content-guidelines.md. The sitemap and the /guides hub pick it up automatically.
 */
export type GuideMeta = {
  slug: string;
  /** Page title and h1. */
  title: string;
  /** Meta description and hub blurb (~150 characters). */
  description: string;
  /** Short summary shown at the top of the guide. */
  summary: string;
  datePublished: string; // YYYY-MM-DD
  dateModified: string; // YYYY-MM-DD
  /** Related guide slugs (shown at the end, in this order). */
  related: string[];
};

export const GUIDES: readonly GuideMeta[] = [
  {
    slug: "copy-paste-text-between-phone-and-computer",
    title: "How to copy and paste text between your phone and computer",
    description:
      "Built-in options for iPhone, Android, Mac and Windows, simple fallbacks that work everywhere, and when each one is the better choice.",
    summary:
      "If your phone and computer come from the same family (iPhone and Mac), the built-in clipboard sync is the easiest. Some Android phones can do it with Windows too. Everywhere else, sending the text to yourself or using a short-lived online clipboard is the quickest route.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["send-file-from-phone-to-pc-without-cable", "is-an-online-clipboard-safe"],
  },
  {
    slug: "send-file-from-phone-to-pc-without-cable",
    title: "How to send a file from your phone to a PC without a cable",
    description:
      "Quick Share, Phone Link, Bluetooth, iCloud, email and online tools compared: which wireless option fits your phone, your PC and your file.",
    summary:
      "For Android and Windows, Quick Share or Phone Link are the most direct. For iPhone and Windows, iCloud is the built-in route. Email and cloud drives work for anyone. For a one-off file to a computer you don't own, a temporary file-sharing site avoids signing in anywhere.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["copy-paste-text-between-phone-and-computer", "is-an-online-clipboard-safe"],
  },
  {
    slug: "is-an-online-clipboard-safe",
    title: "Is an online clipboard safe? What you should never share",
    description:
      "An honest look at what protects a clip, what doesn't, and the things you should never put in any online clipboard.",
    summary:
      "An online clipboard is fine for everyday, non-sensitive things like links, notes and ordinary files. It is not a vault: clips here are not end-to-end encrypted and anyone with the code can open them until they expire. Passwords, ID documents, financial details and private keys don't belong in it.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["copy-paste-text-between-phone-and-computer", "send-file-from-phone-to-pc-without-cable"],
  },
];

export function getGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export const guidePath = (slug: string) => `/guides/${slug}`;
