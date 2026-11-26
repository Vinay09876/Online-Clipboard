# Accessibility

## What is tested automatically

| Check | Where | Covers |
|---|---|---|
| **axe-core** (WCAG 2.0/2.1/2.2 A + AA and axe best practices) | `e2e/a11y.spec.ts` | Home and every tool state (send: empty, text typed, file error, file chosen, result; receive: empty, not found, text + file result), /guides, a guide, About, Contact, Terms, Privacy, 404, in **light and dark**, at **1280 px and 390 px** |
| **Keyboard only** | `e2e/keyboard.spec.ts` | Tab order from the top, a visible focus indicator on every stop, send text, copy code (announced), switch tabs with arrow keys, receive by typing, choose/remove/send a file, download with Enter, wrong code announced as an alert and focus returned |
| Headings, landmarks, skip link, FAQ keyboard, focus after actions | `e2e/seo.spec.ts`, `e2e/home-content.spec.ts`, `e2e/ui-extra.spec.ts` | Structure and focus management |

Tab order on the home page (from `e2e/keyboard.spec.ts`): Skip to content → EasyOnlinePaste
(home) → Guides → About → Contact → Dark theme → Send/Receive tab → Text box → Add a file →
Send clip (the Send button) → … → "On this page" links → FAQ questions → footer links.

Automated checks find roughly a third to a half of real problems. The screen-reader script
below covers what they can't: whether announcements make sense when you can't see the page.

---

## Manual test: NVDA (free screen reader for Windows), about 20 minutes

**Setup (once):** download NVDA from [nvaccess.org](https://www.nvaccess.org/download/) and
install it. Start it with **Ctrl + Alt + N**; stop it with **Insert + Q**. Use **Chrome** or
**Firefox**. Turn your speakers on. Optional: NVDA menu → Tools → **Speech viewer** shows
everything NVDA says as text, which is handy for notes.

Keys used below: **Tab** / **Shift + Tab** (next/previous control), **H** (next heading),
**D** (next landmark), **Enter** / **Space** (activate), **Arrow keys** (inside tabs and the code
boxes), **Insert + Down arrow** (read from here), **Ctrl** (stop speaking). NVDA switches between
"browse mode" (reading) and "focus mode" (typing) by itself; **Insert + Space** toggles it.

For each step, write ✅ if NVDA says roughly what's in quotes, or note what it said instead.

### 1. Page structure (home page)
1. Open the site. NVDA reads the page title: "EasyOnlinePaste – Online Clipboard with a 6-Digit Code".
2. Press **Tab** once: "Skip to content, link". Press **Enter**: focus moves to the main content.
3. Press **H** a few times: "EasyOnlinePaste Online clipboard: share text and files… heading level 1", then the section headings
   (How it works, Privacy and security, Frequently asked questions…). No heading is skipped.
4. Press **D** a few times: banner, navigation "Main", main, navigation "On this page",
   content info (footer). Each region has a sensible name.

### 2. Send text
1. Tab to "Send, tab, selected, 1 of 2", then **Tab** to the text box: "Text, edit, multi line".
2. Type a sentence. The character counter is not read on every key (good); Tab back and forth to hear it.
3. **Tab** to "Send clip, button" → **Enter**.
4. ✅ NVDA moves to and reads "**Your code**, heading", then you can read the 6 digits
   ("Code 1 2 3 4 5 6") and the countdown ("Expires in 29:58").
5. **Tab** to "Copy code, button" → **Enter** → ✅ "**Copied to clipboard**" is announced
   (without moving focus). Same for "Copy link".

### 3. Send a file
1. "Start over"/"Send another" or reload. **Tab** to "**Add a file (optional)** … button/file
   upload" → **Enter** → the file dialog opens; pick a small file.
2. ✅ The file name and size are read when you Tab past them; "**Remove file <name>**, button" exists.
3. Pick an empty file (0 bytes) instead: ✅ an error is announced at once ("… is empty").
4. Send a real file: ✅ progress is available ("progress bar, 40 %"), and "**Your code**" is
   announced when done.

### 4. Receive
1. Tab to the "Send" tab, press **Right arrow**: ✅ "**Receive**, tab, selected, 2 of 2".
2. **Tab**: "**Digit 1 of 6**, edit". Type a code that doesn't exist (e.g. 000000).
   ✅ "**Clip not found or expired.**" is announced, and focus returns to "Digit 1 of 6".
3. Type a real code: ✅ the result heading is read, then the text ("Text, edit, read only,
   multi line …") and, for a file, "**Download**, button" with name and size.
4. **Enter** on Download: the browser's download starts (Chrome announces it).
5. Type 11 wrong codes in a row: ✅ a message that you must wait is announced
   ("Too many attempts … try again in …").

### 5. Theme, FAQ, other pages
1. **Tab** to "**Dark theme**, toggle button, not pressed" → **Space** → "pressed".
2. Home page FAQ: press **H** to "Frequently asked questions", then **Tab** to a question:
   "… button collapsed" → **Enter** → "expanded", and the answer can be read.
3. Open **Guides** and one guide: **H** jumps through the sections; links say where they go
   ("Open EasyOnlinePaste", the official help page names), never "click here".

**Report back:** the list of steps with ✅ or what NVDA said. Anything confusing or silent is worth fixing.

---

## Real devices (what automated browsers can't prove)

The core flows pass in Chromium, Firefox and WebKit (Safari's engine) on desktop and in an
iPhone-sized WebKit (`npm run test:browsers`). These still need a real phone, because
emulators don't use the real OS file picker, share sheet or clipboard rules:

- **iPhone (Safari)**: send a photo from the photo library; receive and download a file (it
  goes to Files → Downloads); "Copy code"/"Copy link"; open a `/#123456` link from Messages.
- **Android (Chrome)**: the same, plus picking a file from Google Drive/Files; the download
  appears in the notification shade.
- Both: the on-screen keyboard shows **numbers** for the code boxes; pasting a 6-digit code
  from another app fills all boxes; landscape mode; the dark theme; text size set to "large"
  in the phone's settings.

### Found by the browser tests (Step 6)

| Finding | Engines | Status |
|---|---|---|
| Text typed before the page finished loading left "Create clip" disabled until the next keystroke | all, showed up in WebKit (slower start) | **Fixed** (`SendPanel.tsx`), regression test in `ui-extra.spec.ts` |
| File names with accents download as `_` (e.g. `report (1) _.bin`) | Playwright's WebKit on Windows | The server sends the correct UTF-8 name (`filename*=`); Chromium and Firefox use it. **Check on a real iPhone** with a file named e.g. `café.txt` |
| Tab skips links (incl. "Skip to content") | Safari/WebKit | Safari's default (turn on "Press Tab to highlight each item", or use Option+Tab). Not ours to change |
| The Send button ends ~46 px below the first screen | iPhone 13-sized (390×664 visible) | Fine on Pixel 7. **Owner decision**: leave, or tighten the space above the tool |
| Clipboard copy and upload cancel/retry not covered | Firefox, WebKit | The tests use Chromium-only tools (clipboard permission, DevTools throttling). **Check copy buttons by hand** on Safari/Firefox |
| Pasting a code not covered | Firefox | Synthetic paste events carry no data in Firefox. **Check by hand** |
