/**
 * Guide registry: metadata only (no JSX), so lib/sitePages.ts, proxy.ts and tests can import it.
 * The guide bodies live in content/guides/bodies.tsx.
 *
 * To add a guide: add an entry here (slug, primaryQuery, dates, 3 related) and a body in
 * bodies.tsx, then follow docs/content-guidelines.md. The sitemap and the /guides hub pick it
 * up automatically.
 *
 * NO-OVERLAP RULE: every guide answers ONE search intent, written as `primaryQuery`. No two
 * guides may share it (a test enforces this). If a new topic overlaps an existing guide,
 * extend that guide or link to it instead of writing a second page.
 */
/** Hub sections, in display order. */
export const GUIDE_CATEGORIES = [
  {
    id: "devices",
    title: "Move files and text between devices",
    description: "Phone to computer and back: text, documents, large files and code.",
  },
  { id: "photos", title: "Photos", description: "Getting photos and videos off your phone without losing quality or dates." },
  {
    id: "everyday",
    title: "Everyday situations",
    description: "Print shops, classrooms and computers that aren't yours.",
  },
  {
    id: "basics",
    title: "Online clipboards: basics and safety",
    description: "What an online clipboard is, how it compares, and what it should never hold.",
  },
] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]["id"];

export type GuideMeta = {
  slug: string;
  /** Hub section (see GUIDE_CATEGORIES). */
  category: GuideCategory;
  /** Page title and h1. */
  title: string;
  /** The main phrase this guide answers (lowercase, natural search wording). Unique. */
  primaryQuery: string;
  /** Meta description and hub blurb (~150 characters). */
  description: string;
  /** Short summary shown at the top of the guide. */
  summary: string;
  datePublished: string; // YYYY-MM-DD
  dateModified: string; // YYYY-MM-DD
  /** Exactly 3 related guide slugs (shown at the end, in this order). */
  related: string[];
};

export const GUIDES: readonly GuideMeta[] = [
  {
    slug: "copy-paste-text-between-phone-and-computer",
    category: "devices",
    title: "How to copy and paste text between your phone and computer",
    primaryQuery: "copy and paste text between phone and computer",
    description:
      "Built-in options for iPhone, Android, Mac and Windows, simple fallbacks that work everywhere, and when each one is the better choice.",
    summary:
      "If your phone and computer come from the same family (iPhone and Mac), the built-in clipboard sync is the easiest. Some Android phones can do it with Windows too. Everywhere else, sending the text to yourself or using a short-lived online clipboard is the quickest route.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["send-code-snippets-from-phone-to-computer", "send-file-from-phone-to-pc-without-cable", "online-clipboard-vs-email-yourself"],
  },
  {
    slug: "send-file-from-phone-to-pc-without-cable",
    category: "devices",
    title: "How to send a file from your phone to a PC without a cable",
    primaryQuery: "send a file from phone to pc without a cable",
    description:
      "Quick Share, Phone Link, Bluetooth, iCloud, email and online tools compared: which wireless option fits your phone, your PC and your file.",
    summary:
      "For Android and Windows, Quick Share or Phone Link are the most direct. For iPhone and Windows, iCloud is the built-in route. Email and cloud drives work for anyone. For a one-off file to a computer you don't own, a temporary file-sharing site avoids signing in anywhere.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["transfer-photos-from-android-to-computer", "send-files-too-big-for-email", "send-a-document-to-a-print-shop"],
  },
  {
    slug: "is-an-online-clipboard-safe",
    category: "basics",
    title: "Is an online clipboard safe? What you should never share",
    primaryQuery: "is an online clipboard safe",
    description:
      "An honest look at what protects a clip, what doesn't, and the things you should never put in any online clipboard.",
    summary:
      "An online clipboard is fine for everyday, non-sensitive things like links, notes and ordinary files. It is not a vault: clips here are not end-to-end encrypted and anyone with the code can open them until they expire. Passwords, ID documents, financial details and private keys don't belong in it.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["use-a-shared-computer-safely", "what-is-an-online-clipboard", "online-clipboard-vs-email-yourself"],
  },
  {
    slug: "send-files-too-big-for-email",
    category: "devices",
    title: "How to send files that are too big for email",
    primaryQuery: "send files too big for email",
    description:
      "Why big attachments bounce, what to use instead (share links, Mail Drop, cloud drives), and the mistakes that make large transfers fail.",
    summary:
      "When a file is over your email provider's attachment limit, send a link instead of the file: upload it to a cloud drive or use your provider's built-in large-file option, then share the link. Check the link's access settings and how long it stays available before you send it.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["send-file-from-phone-to-pc-without-cable", "share-files-in-a-classroom", "is-an-online-clipboard-safe"],
  },
  {
    slug: "use-a-shared-computer-safely",
    category: "everyday",
    title: "How to use a shared or public computer safely",
    primaryQuery: "use a public computer safely",
    description:
      "Practical steps for cyber cafés, libraries, print shops and office PCs: private windows, signing out, deleting downloads, and what to avoid.",
    summary:
      "On a computer you don't control, open a private or guest window, never let the browser save your password, delete anything you downloaded, and sign out before you leave. Avoid banking and other sensitive logins there altogether. If you forget to sign out, you can still end the session from your phone.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["send-a-document-to-a-print-shop", "is-an-online-clipboard-safe", "copy-paste-text-between-phone-and-computer"],
  },
  {
    slug: "transfer-photos-from-iphone-to-windows-pc",
    category: "photos",
    title: "How to transfer photos from an iPhone to a Windows PC",
    primaryQuery: "transfer photos from iphone to windows pc",
    description:
      "USB import with the Apple Devices app and Windows Photos, iCloud for Windows, HEIC files that won't open, Live Photos, and the common import errors.",
    summary:
      "For many photos, connect the iPhone by USB, unlock it, tap Trust, and import with the Windows Photos app (Apple recommends installing Apple Devices first). If you use iCloud Photos, iCloud for Windows is the alternative. If photos arrive as HEIC files Windows can't open, you can change how the iPhone transfers them.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["transfer-photos-from-android-to-computer", "send-file-from-phone-to-pc-without-cable", "send-files-too-big-for-email"],
  },
  {
    slug: "transfer-photos-from-android-to-computer",
    category: "photos",
    title: "How to transfer photos from an Android phone to a computer",
    primaryQuery: "transfer photos from android to computer",
    description:
      "USB file transfer to Windows or Mac, the Windows Photos import, downloading from Google Photos, and the USB setting that stops most imports from working.",
    summary:
      "Connect the phone with a cable that carries data, unlock it, and switch its USB mode from charging to file transfer. Windows can then import with the Photos app or show the phone in File Explorer; on a Mac, Google points to its Android File Transfer app. If your photos are backed up to Google Photos, you can download them in a browser instead.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["transfer-photos-from-iphone-to-windows-pc", "send-file-from-phone-to-pc-without-cable", "send-files-too-big-for-email"],
  },
  {
    slug: "send-a-document-to-a-print-shop",
    category: "everyday",
    title: "How to send a document to a print shop",
    primaryQuery: "send a document to a print shop",
    description:
      "Prepare a file that prints the way you expect (PDF, page size, fonts, colour), choose how to hand it over, and know what to ask the shop.",
    summary:
      "Export your document as a PDF, check the page size, orientation and colours before you leave home, and hand it over in a way that doesn't leave a copy in the shop's inbox. Ask the staff to delete your file once it has printed.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["use-a-shared-computer-safely", "send-file-from-phone-to-pc-without-cable", "send-files-too-big-for-email"],
  },
  {
    slug: "share-files-in-a-classroom",
    category: "everyday",
    title: "How to share files in a classroom",
    primaryQuery: "share files in a classroom",
    description:
      "For teachers and students: when to use the school platform, email or a quick temporary share, and how to keep student data private.",
    summary:
      "For anything that belongs to a course, use the school's own platform. Email suits one-to-one messages. A quick temporary share is only for harmless, public material during a lesson, never for student work, marks or personal data.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["send-files-too-big-for-email", "is-an-online-clipboard-safe", "online-clipboard-vs-email-yourself"],
  },
  {
    slug: "send-code-snippets-from-phone-to-computer",
    category: "devices",
    title: "How to move code snippets, logs or config text from your phone to your computer",
    primaryQuery: "send text from phone to computer code snippet",
    description:
      "Keep indentation and line breaks intact, stop your keyboard from adding curly quotes, handle long logs, and keep secrets out of every clipboard.",
    summary:
      "Code breaks in transit for predictable reasons: curly quotes from the phone keyboard, lost indentation, changed line endings, or truncated logs. Turn off smart punctuation, send logs as a file, check the result with a diff, and never send tokens, keys or passwords through any online clipboard.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["copy-paste-text-between-phone-and-computer", "is-an-online-clipboard-safe", "online-clipboard-vs-email-yourself"],
  },
  {
    slug: "online-clipboard-vs-email-yourself",
    category: "basics",
    title: "Online clipboard vs emailing yourself vs messaging apps",
    primaryQuery: "online clipboard vs email yourself",
    description:
      "An honest comparison of speed, privacy, limits, history, accounts and cleanup, including when an online clipboard is the worse choice.",
    summary:
      "Email and messaging apps keep a searchable history and work best for things you want to find again; a messenger with end-to-end encryption is the most private of the three. An online clipboard needs no sign-in and cleans up after itself, but it is not encrypted end to end and anyone with the code can open a clip.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["what-is-an-online-clipboard", "is-an-online-clipboard-safe", "copy-paste-text-between-phone-and-computer"],
  },
  {
    slug: "what-is-an-online-clipboard",
    category: "basics",
    title: "What is an online clipboard and how does it work?",
    primaryQuery: "what is an online clipboard",
    description:
      "How your device's clipboard works, what changes when a clipboard lives on a website, and what the code and the expiry time actually do.",
    summary:
      "Your device's clipboard holds what you copied in that device's memory. An online clipboard moves that idea to a website: you store text or a file on a server, get a short code, and anyone who enters the code on another device gets a copy until the clip expires.",
    datePublished: "2026-11-21",
    dateModified: "2026-11-21",
    related: ["online-clipboard-vs-email-yourself", "is-an-online-clipboard-safe", "copy-paste-text-between-phone-and-computer"],
  },
];

export function getGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export const guidePath = (slug: string) => `/guides/${slug}`;
