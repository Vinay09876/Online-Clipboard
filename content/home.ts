/**
 * Home page copy, below the tool. EDIT WORDING HERE.
 *
 * Rules (docs/content-guidelines.md):
 *  - Every claim must be true for the current code. Check before changing.
 *  - Numbers are never typed in: they come from `facts`, which page.tsx reads from server config.
 *  - Answers are lists of segments so a link can sit inside a sentence. The FAQ JSON-LD uses
 *    the plain text of the same segments, so the structured data always matches the page.
 */

import { CLAIMS, trackingClaims } from "./claims";
import { fmt as n, plural } from "./text";

/** Values read from server config (lib/facts.ts, via app/page.tsx). */
export type HomeFacts = {
  maxFileMb: number;
  maxTextLength: number;
  expiryMinutes: number;
  /** Failed code lookups allowed per IP per window. */
  lookupFailures: number;
  /** Rate-limit window, in minutes. */
  rateWindowMinutes: number;
  /** How long hashed-IP counters are kept, in hours. */
  rateLimitRetentionHours: number;
  /** Public abuse contact, or null if not configured. */
  abuseEmail: string | null;
  /** Ads switched on (lib/ads.ts): changes the "What we keep about you" wording. */
  adsActive: boolean;
};

/** A piece of a paragraph: plain text, or a link. */
export type Segment = string | { text: string; href: string };
export type Paragraph = Segment[];

export type HomeContent = {
  howItWorks: { id: string; title: string; intro: string; steps: Array<{ title: string; text: string }> };
  whatYouCanShare: { id: string; title: string; items: Array<{ label: string; text: string }>; note: string };
  commonUses: { id: string; title: string; intro: string; items: Array<{ title: string; text: string }> };
  privacy: { id: string; title: string; intro: string; points: Array<{ title: string; text: Paragraph }> };
  faq: { id: string; title: string; items: Array<{ question: string; answer: Paragraph[] }> };
  closing: Paragraph;
};


/** Plain text of a paragraph (links become their text). Used for JSON-LD and tests. */
export function plainText(p: Paragraph): string {
  return p.map((s) => (typeof s === "string" ? s : s.text)).join("");
}

export function homeContent(f: HomeFacts): HomeContent {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  const fileSize = `${n(f.maxFileMb)} MB`;
  const textLimit = `${n(f.maxTextLength)} characters`;
  const terms: Segment = { text: "Terms of use", href: "/terms" };
  const privacyPolicy: Segment = { text: "Privacy policy", href: "/privacy" };
  const contact: Segment = { text: "Contact page", href: "/contact" };
  const abuse: Segment = f.abuseEmail ? { text: f.abuseEmail, href: `mailto:${f.abuseEmail}` } : contact;

  return {
    howItWorks: {
      id: "how-it-works",
      title: "How it works",
      intro:
        "Online Clipboard is a quick way to share text between phone and computer, or between any two devices with a browser. There is nothing to install and no account to create.",
      steps: [
        {
          title: "Paste or drop",
          text: `Type or paste text, add one file, or both. Then press "Send".`,
        },
        {
          title: "Get a 6-digit code",
          text: "You get a short code and a link. Read the code out, type it on the other device, or send the link.",
        },
        {
          title: "Open it anywhere",
          text: `On the other device, open this page, choose Receive and enter the code. The clip works for ${minutes}, then it is deleted.`,
        },
      ],
    },

    whatYouCanShare: {
      id: "what-you-can-share",
      title: "What you can share",
      items: [
        { label: "Text", text: `Up to ${textLimit}: notes, links, addresses, code snippets. Line breaks and spacing are kept.` },
        { label: "One file", text: `Up to ${fileSize}, any file type: photos, PDFs, documents, archives.` },
        { label: "Both at once", text: "A message and a file can travel together under one code." },
        { label: "Lifetime", text: `Every clip expires ${minutes} after it is created. A countdown shows the time left.` },
      ],
      note: "This is temporary file sharing, not storage. Keep your own copy of anything you need later.",
    },

    commonUses: {
      id: "common-uses",
      title: "Common uses",
      intro: "People mostly use it for small, quick hand-offs where email or chat feels like too much:",
      items: [
        { title: "Phone to laptop", text: "Move a link, a photo or a screenshot from your phone to your computer in a few seconds." },
        {
          title: "Shared or public computers",
          text: "Get a document onto a library, lab or print-shop computer without signing in to your email there.",
        },
        { title: "Quick text between people", text: "Pass a long address, a parcel tracking number or a booking reference to someone sitting next to you." },
        {
          title: "Send a file without signing up",
          text: `Hand over a file up to ${fileSize} without creating an account or installing an app.`,
        },
      ],
    },

    privacy: {
      id: "privacy-and-security",
      title: "Privacy and security",
      intro: "Short version: it is built for convenience, not for secrets. Here is exactly what happens to your data.",
      points: [
        {
          title: "Not end-to-end encrypted",
          text: [
            `${CLAIMS.encryption} Don't share passwords, ID documents, bank details or anything you would not put on a postcard.`,
          ],
        },
        {
          title: "Anyone with the code can open it",
          text: [
            `A clip is not deleted when it is opened. Anyone who has the code or link can open it again until it expires ${minutes} after creation.`,
          ],
        },
        {
          title: "Deleted automatically",
          text: [
            `When a clip expires, its code stops working straight away, and ${CLAIMS.deletion}.`,
          ],
        },
        {
          title: "What we keep about you",
          text: [
            `${trackingClaims(f.adsActive).home} To stop abuse we keep ${CLAIMS.ipHash(f.rateLimitRetentionHours)}. Details are in the `,
            privacyPolicy,
            ".",
          ],
        },
      ],
    },

    faq: {
      id: "faq",
      title: "Frequently asked questions",
      items: [
        {
          question: "Is Online Clipboard free?",
          answer: [
            [
              "Yes. There is no charge and no paid plan. It runs on free hosting, so in rare cases uploads or downloads may pause for a while if the monthly limits are reached.",
            ],
          ],
        },
        {
          question: "Do I need an account?",
          answer: [["No. There are no accounts and nothing to install. You only need a web browser."]],
        },
        {
          question: "How long do clips last?",
          answer: [[`Each clip lasts ${minutes} from the moment it is created. After that the code no longer works.`]],
        },
        {
          question: "What is the maximum file size and text length?",
          answer: [[`One file of up to ${fileSize}, and text of up to ${textLimit}. You can send both in the same clip.`]],
        },
        {
          question: "Can someone guess my code?",
          answer: [
            [
              `Codes are 6 random digits, so there are a million possibilities, and each code only works for ${minutes}. After ${plural(f.lookupFailures, "wrong code", "wrong codes")} from the same internet connection, lookups are paused for up to ${plural(f.rateWindowMinutes, "minute", "minutes")}.`,
            ],
            [
              "That makes guessing slow, but not impossible for someone who keeps trying. So treat a code like a note left on a desk: fine for everyday things, not for sensitive data.",
            ],
          ],
        },
        {
          question: "Is it encrypted?",
          answer: [
            [
              CLAIMS.encryption,
            ],
          ],
        },
        {
          question: "What file types work?",
          answer: [
            [
              `Any type, as long as it is one file of up to ${fileSize}. Files are always downloaded, never opened inside the page. To send several files, put them in a ZIP first.`,
            ],
          ],
        },
        {
          question: "What happens when a clip expires?",
          answer: [
            [
              `The code stops working immediately and shows "Clip not found or expired." After that, ${CLAIMS.deletion}. Expired clips cannot be recovered.`,
            ],
          ],
        },
        {
          question: "Does it work on phone and computer?",
          answer: [
            [
              `It runs in the browser. ${CLAIMS.browsers} Send from one device and open the code or link on another.`,
            ],
          ],
        },
        {
          question: "Can I delete a clip early?",
          answer: [
            [
              `Not at the moment. There is no delete button: every clip is removed automatically ${minutes} after it is created. If you shared something by mistake, wait for it to expire, and don't send the code to anyone else.`,
            ],
          ],
        },
        {
          question: "How do I report abuse?",
          answer: f.abuseEmail
            ? [["Email ", abuse, " with the 6-digit code and what is wrong with the clip."]]
            : [["Use the ", contact, " and include the 6-digit code and what is wrong with the clip."]],
        },
      ],
    },

    closing: ["By using Online Clipboard you agree to the ", terms, ". What happens to your data is explained in the ", privacyPolicy, "."],
  };
}
