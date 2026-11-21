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

## 9. Guides: structure and checklist

Guides live in two places: metadata in `content/guides/index.ts` (slug, title, description,
summary, dates, related slugs) and the body in `content/guides/bodies.tsx`. The layout
(`components/guides/GuideLayout.tsx`) adds the parts every guide must have, so they can't be
forgotten: breadcrumbs, one `<h1>`, the "In short" summary, the last-updated date, the
**"When this tool is not the right choice"** section, official sources, related guides and a
calm link to the tool. Article and BreadcrumbList JSON-LD are generated automatically, and the
sitemap and /guides hub pick up new guides from the registry.

**Structure of a guide body**

- First paragraph: the situation and what the reader will get. No throat-clearing.
- `<h2>` per approach (often per platform), `<h3>` for individual options. Never skip levels.
- Numbered steps (`<ol>`) for anything the reader must do in order.
- Honest comparisons: name the alternatives (cable, Quick Share, AirDrop, Phone Link, cloud
  drives, email, messengers) and say plainly when each is better than our tool.
- The `notRightFor` list: concrete cases where the reader should use something else.
- 600-900 words of useful content. Never pad.

**Fact-checking device instructions**

- Check every device or software claim against the vendor's **official** help page (Apple,
  Google/Android, Microsoft, WhatsApp, …) and add that page to the guide's `sources`.
- Write the platform context ("on a Windows 11 PC", "with the Link to Windows app") and prefer
  general wording over exact menu paths; menus change. Only give an exact path if the official
  page confirms it, and link to that page.
- Note the check date in the bodies file header. Re-check when updating `dateModified`.
- Anything that can't be checked on real devices goes on a "steps to verify" list in the step
  report; the owner tests those on real phones and PCs before launch.

**Honesty**

- Security wording follows `/privacy`: not end-to-end encrypted, anyone with the code can
  open a clip until it expires, no early delete.
- No invented facts about the owner, usage numbers, testimonials or reviews. Personal details
  are `[[ADD: …]]` placeholders until the owner provides them. `npm run build` refuses to build
  an indexable site while any placeholder remains (`scripts/check-placeholders.ts`).

**No thin pages**

- One guide per genuinely different question. If two planned topics would share most of their
  text, merge them or make one link to the other.
- Every guide gets real internal links (related guides and the hub), and appears in the hub.
