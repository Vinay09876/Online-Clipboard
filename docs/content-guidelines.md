# Content guidelines

Rules for every piece of text on the site: the home page, guides (Step 3), About, Contact,
Privacy Policy, and anything after. They exist for three readers: **visitors** (who need clear,
true answers), **search engines** (which reward pages that genuinely help) and **AdSense
reviewers** (who reject thin, copied or misleading sites).

## 1. Truth first: fact-check against the code

- **Every factual claim must be true for the current code and config.** Before writing "X
  happens", find where X happens in the code. If you can't find it, don't write it.
- **Never claim features we don't have.** Today there are **no** accounts, early-delete
  button, one-time ("burn after reading") clips, password protection, end-to-end encryption,
  public API, file previews or apps. (Update this list when that changes.)
- **Never promise more than the code does.** "Usually within minutes", not "instantly";
  "slow to guess", not "impossible to guess".
- **Privacy statements must match `app/terms/page.tsx` exactly in substance.** If a page would
  need to say something the Terms don't, update both together (and note it in the step report).
- When the code changes behaviour, search the content for affected claims (`content/`,
  `app/**/page.tsx`) in the same change.

## 2. Numbers come from config, never typed

Limits change (file size, expiry, rate limits). Typed numbers silently become lies.

- Read numbers in the **Server Component** from `lib/config.ts` / `lib/clips.ts`, pass them as
  plain values (see `HomeFacts` in `content/home.ts`), and build sentences from them.
- Format with `toLocaleString("en-US")` (100,000) and handle singular/plural (1 minute).
- Fixed facts of the design may be written directly ("6-digit code", "one file per clip"),
  as long as they're actually fixed in the code.
- Tests must check at least one number against a server started with **non-default** config
  (see the `@config` test in `e2e/home-content.spec.ts`).

## 3. Where copy lives

- Page copy is **plain data** in `content/*.ts` (one file per page or page group), so wording
  can be edited without touching layout code.
- Links inside sentences use segments: `["Read the ", { text: "Terms", href: "/terms" }, "."]`.
- Structured data (FAQ, HowTo, Article) is generated **from the same data** as the visible
  text, never written separately, so it can't drift. It must describe only what is visible.

## 4. Tone and style

- Plain, friendly, direct English. Write for someone in a hurry on a phone.
- Short paragraphs (1-3 sentences). Lists for steps and options. One idea per sentence.
- Second person ("you"), active voice, present tense.
- Concrete over vague: "a photo from your phone to your laptop", not "seamless cross-device
  workflows".
- No hype: no "best", "ultimate", "revolutionary", "100% secure", no fake urgency.
- Be honest about limits and risks, especially security. Honesty builds trust and avoids
  complaints and policy problems.
- Spell out what a term means the first time ("hashed (scrambled, non-reversible)").

## 5. Originality and depth (no thin pages)

- Every page must answer a real question **better than a quick search result would**: a
  specific situation, steps that actually work, pitfalls, what to do when it fails.
- **No mass-generated pages**: no near-duplicate pages that only swap a keyword ("share text
  from iPhone", "share text from Android", … with the same body). One good page beats ten
  thin ones. If two topics share 80% of their content, merge them.
- No copied or lightly reworded text from other sites. AI can help draft, but every page needs
  a human edit for accuracy, usefulness and voice, and must follow these rules.
- A guide is worth publishing only if it has at least: a clear purpose in the first lines,
  concrete steps or explanation, at least one practical tip or caveat specific to the topic,
  and an honest note on when our tool is **not** the right choice.
- Rough length: a guide should be as long as needed to fully answer the question. Typically
  400-1,200 words. Never pad to reach a number.

## 6. Keywords

- Write for people first. Use the words people actually search for **where they fit
  naturally**, e.g. "online clipboard", "share text between phone and computer", "send a file
  without signing up", "temporary file sharing".
- Use the main phrase in the page title, the `<h1>` (or close to it) and the first paragraph,
  once. After that, use natural variations and synonyms.
- **No keyword stuffing**: no repeated phrases, no lists of keywords, no hidden text, no
  doorway pages. If a sentence reads awkwardly because of a keyword, rewrite it without one.
- Titles: specific and under ~60 characters where possible. Descriptions: one or two honest
  sentences (~150 characters) saying what the page gives the reader.

## 7. Structure and accessibility

- Exactly one `<h1>` per page; then `<h2>` for sections and `<h3>` only inside them. Never skip
  levels.
- Every content section is a `<section aria-labelledby="…">` with its heading id.
- FAQ: native `<details>`/`<summary>` (no JavaScript); all answers in the HTML.
- Links have descriptive text ("Terms & privacy", never "click here").
- Images: only local, light inline SVG or optimized local files; decorative ones are
  `aria-hidden`, meaningful ones get real `alt` text. No external images or fonts (CSP).
- Check contrast in light and dark mode.

## 8. Before publishing a page (checklist)

- [ ] Every claim checked against the code; numbers come from config.
- [ ] Nothing contradicts the Terms page.
- [ ] Original, useful, not a near-duplicate of another page.
- [ ] Title, description, `<h1>`, headings in order, sections labelled.
- [ ] Added to `lib/sitePages.ts` (sitemap) and given `pageUrls(...)` metadata.
- [ ] Internal links to and from related pages.
- [ ] Spell-checked; read once on a phone.
- [ ] Tests updated (headings/sections exist; numbers follow config where used).
