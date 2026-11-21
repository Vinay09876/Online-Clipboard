# Real-device verification checklist

Claims in the guides that were checked against official documentation but **not** tested on
real devices. Test each one on your own phone and PC, then tick it.

**For each item:** do the check. If it works as written, tick it. If it doesn't:

- **soften** the sentence (e.g. "usually", "on some phones", "check the official page"), or
- **remove** the claim,

in `content/guides/bodies.tsx`, then update that guide's `dateModified` in
`content/guides/index.ts`. Quotes below are the exact sentences as they appear on the page
(with the default config: 25 MB, 30 minutes). Device menus differ by version: note the device
and OS version you tested with.

## Site-wide

- [ ] **Clean-up job runs every 10 minutes in production.** In Supabase, run the queries in
  `docs/cleanup-scheduling.md` ("Check it works") and confirm `cron.job_run_details` shows
  `succeeded` runs and `net._http_response` shows status 200.
  > "the text and file are removed by an automatic clean-up job, usually within about 10 minutes after expiry"

  If it fails: fix the job; until then change `CLAIMS.deletion` in `content/claims.ts` to
  "removed by an automatic clean-up job" without a time.
- [ ] **Browsers.** Send and receive text and a file on: Chrome (Android), Safari (iPhone),
  Chrome or Edge (Windows), Safari (Mac). Note versions.
  > "It is built to work in current versions of common browsers on phones and computers, with nothing to install."

  If a browser fails: fix the bug, or keep this wording and add a known-issues note.

## 1. Copy and paste text between phone and computer (`/guides/copy-paste-text-between-phone-and-computer`)

- [ ] iPhone + Mac: Universal Clipboard works with the same Apple Account, Wi-Fi, Bluetooth and Handoff on, devices close.
  > "According to Apple, both devices must be signed in to the same Apple Account, have Wi-Fi, Bluetooth and Handoff turned on, and be near each other (Apple says within about 10 metres)."
- [ ] Copied item expires after a short time (copy, wait a few minutes, paste).
  > "The copied item is only available for a short time, so it suits small bits of text or an image rather than whole documents."
- [ ] Phone Link copy and paste: available only on supported phones, turned on in Phone Link settings.
  > "The catch: Microsoft lists cross-device copy and paste only for certain phones, mainly recent Samsung models and selected devices from a few other makers."
  > "If your phone is on the list, you turn the feature on in Phone Link's settings."
- [ ] On an unsupported phone, the option really is absent.
  > "No setting will add it; use one of the methods below instead."
- [ ] SwiftKey cloud clipboard: personal Microsoft account, last item only, available about an hour.
  > "It needs a personal Microsoft account on both sides, and Microsoft says only the most recent item is synced and it stays available for an hour."
- [ ] WhatsApp self-chat opens on WhatsApp Web / desktop.
  > "WhatsApp, for example, has a message yourself chat that you can open on WhatsApp Web or the desktop app."

## 2. Send a file from phone to PC without a cable (`/guides/send-file-from-phone-to-pc-without-cable`)

- [ ] Quick Share for Windows requirements.
  > "Google lists a 64-bit Windows 10 or later PC, Bluetooth turned on, and both devices on the same network and close together."
  > "It isn't offered in every country, and Samsung PCs use Samsung's own version."
- [ ] Quick Share blocked on a work/school network; phone hotspot works around it.
  > "Switching both to your phone's hotspot often gets around that."
- [ ] Phone Link "Send to PC": files land in Downloads\Phone Link.
  > "Microsoft says received files land in a Phone Link folder inside Downloads."
- [ ] "Send to PC" missing when Link to Windows isn't connected.
  > "the Link to Windows app on the phone isn't set up or isn't connected to Phone Link on the PC."
- [ ] Bluetooth receive on Windows from a phone.
  > "Windows can receive files over Bluetooth from a paired phone: you start “receive” on the PC, then share the file over Bluetooth from the phone."
- [ ] iCloud for Windows syncs files with the same Apple Account.
  > "For a Windows PC, Apple's own route is iCloud: with iCloud for Windows and the same Apple Account on both devices, files sync automatically."
- [ ] Gmail attachment limit and Drive link (personal account).
  > "Gmail, for example, allows up to 25 MB and offers a Google Drive link for bigger files"

## 3. Is an online clipboard safe? (`/guides/is-an-online-clipboard-safe`)

- [ ] WhatsApp says messages to yourself are end-to-end encrypted (check the in-app encryption notice).
  > "WhatsApp, for example, says messages to yourself are end-to-end encrypted"
- [ ] Removal request via the Contact page reaches you (send yourself a test from another address).
  > "Ask for the clip to be removed early through the Contact page, with the code."

## 4. Send files that are too big for email (`/guides/send-files-too-big-for-email`)

- [ ] Gmail limit and automatic Drive link when the file is too big.
  > "Gmail, for example, allows attachments up to 25 MB for personal accounts and offers a Google Drive link when a file is bigger"
  > "Gmail offers to send a Drive link when you attach something too large."
- [ ] Outlook attaches a OneDrive file as a link.
  > "Outlook can attach a OneDrive file as a link."
- [ ] Microsoft's Outlook pages still disagree on the limit (if they now agree, consider stating the number with the source).
  > "Microsoft's own Outlook pages give different figures"
- [ ] Mail Drop in Apple Mail: limits still 5 GB / 30 days on Apple's page.
  > "Apple's Mail Drop page says attachments can be up to 5 GB and links last 30 days"
- [ ] Google free storage is still 15 GB shared across Drive, Gmail and Photos.
  > "Google says a free account's 15 GB is shared across Drive, Gmail and Photos"
- [ ] Encoding overhead: a file just under the limit fails (e.g. a 24 MB file in Gmail).
  > "Attachments are converted to text for sending, which makes them noticeably larger in transit."
- [ ] ZIP barely shrinks a video (zip a phone video, compare sizes).
  > "Don't expect a ZIP to get a 60 MB video under a 25 MB limit."

## 5. Use a shared or public computer safely (`/guides/use-a-shared-computer-safely`)

- [ ] Browser private modes exist with these names (Chrome guest/Incognito, Edge InPrivate).
  > "Chrome has guest and Incognito windows, Edge has InPrivate."
  > "Google's advice for a computer that isn't yours is to browse in a private window and close it when you're done"
- [ ] Downloads stay after closing a private window (download a file in Incognito/InPrivate, close, check Downloads).
  > "What it does not do is delete files you downloaded."
- [ ] Recycle Bin restores deleted downloads.
  > "Empty the Recycle Bin, or the deleted files can be restored."
- [ ] Removing a device remotely from your Google Account.
  > "Google lets you see where your account is signed in and remove a device from your account's device list."

## 6. Transfer photos from an iPhone to a Windows PC (`/guides/transfer-photos-from-iphone-to-windows-pc`)

- [ ] Apple Devices app from the Microsoft Store, then Photos import.
  > "On the PC, install Apple's Apple Devices app from the Microsoft Store, as Apple recommends on its photo transfer page."
  > "Open the Photos app on the PC, choose Import, select the iPhone, then pick the photos and the folder to save them in"
- [ ] Trust prompt appears; reset brings it back after "Don't Trust".
  > "If the iPhone asks whether to trust this computer, tap Trust (or Allow) and enter your passcode."
  > "Apple explains how to bring the prompt back by resetting location and privacy settings on the iPhone"
- [ ] Automatic conversion to JPEG/H.264 on USB import; HEIC when keeping originals.
  > "Apple says that when you import over USB to a PC, the iPhone may convert them to JPEG and H.264 automatically"
- [ ] HEIF/HEVC extensions needed to open HEIC in Photos; HEVC one is paid (note price).
  > "Microsoft says the Photos app needs the HEIF Image Extensions and the HEVC Video Extensions from the Microsoft Store, and lists the HEVC one as a paid extension"
- [ ] Camera setting Most Compatible makes new photos JPEG.
  > "Or set the iPhone camera to Most Compatible, so new photos are taken as JPEG from the start."
- [ ] What a Live Photo becomes on Windows via USB import (still only, or still + video).
  > "Windows has no Live Photo player, so depending on how you transfer it, you get just the still image or the still plus a separate short video file."
  > "Apple notes that sending one by Mail turns it into a still image."
- [ ] Photos stored only in iCloud don't import until downloaded.
  > "Apple says to download the originals to the iPhone before importing over USB."

## 7. Transfer photos from an Android phone to a computer (`/guides/transfer-photos-from-android-to-computer`)

- [ ] USB notification wording and File transfer option (note phone brand).
  > "tap the USB notification (often labelled something like “Charging this device via USB”), and choose File transfer."
- [ ] A charge-only cable is not detected.
  > "Google points out that not all USB cables can transfer files"
- [ ] Locked phone not visible to Windows.
  > "Microsoft notes the PC can't see a locked phone."
- [ ] Camera folder name.
  > "Camera photos are usually in a folder called DCIM."
- [ ] Phone Link shows recent photos.
  > "Microsoft's Phone Link can show recent phone photos on the PC"
- [ ] Android File Transfer on current macOS (is it still available and working?).
  > "Google's help page says to install its Android File Transfer app"
- [ ] Google Photos download and Takeout ZIPs.
  > "For an entire library, Google suggests Google Takeout, which packs everything into ZIP archives"
- [ ] Downloaded files show the download date; "date taken" is preserved.
  > "Google notes that downloaded files may show the download date in your file browser"
- [ ] Long copy stops when the screen locks (try a large folder with a short screen timeout).
  > "If a long copy stops partway, the phone may have locked itself."
- [ ] Some Android phones offer HEIF/HEIC.
  > "Some recent phones offer HEIF/HEIC to save space"

## 8. Send a document to a print shop (`/guides/send-a-document-to-a-print-shop`)

- [ ] Word's PDF/A option.
  > "Word offers an archiving format (PDF/A) aimed at keeping the document's appearance consistent on other computers"
- [ ] Google Docs File → Download → PDF.
  > "In Google Docs, the Download option in the File menu includes PDF"
- [ ] Unprintable margins on a typical office printer.
  > "most office printers can't print right up to the edge of the paper."
- [ ] Form fields not printing in some viewers (fill a PDF form, open in a second viewer).
  > "some PDF forms keep your answers in fields that not every program prints."
- [ ] Colour costs more (ask a local shop).
  > "colour printing usually costs more per page."

## 9. Share files in a classroom (`/guides/share-files-in-a-classroom`)

- [ ] Google Classroom: materials for a class or chosen students.
  > "In Google Classroom, for example, a teacher can post materials to the Classwork page for a whole class or for chosen students"
- [ ] Drive attachments view-only by default; per-student copies for assignments.
  > "Google notes that Drive files attached this way are view-only for students unless the teacher chooses otherwise for an assignment, such as giving each student their own copy"
- [ ] Document properties include the author's name (check File → Properties / Info).
  > "documents can also carry the author's name in their properties."

## 10. Move code snippets from phone to computer (`/guides/send-code-snippets-from-phone-to-computer`)

- [ ] iPhone Smart Punctuation in keyboard settings; turning it off stops curly quotes.
  > "On an iPhone, the setting is called Smart Punctuation and lives in the keyboard settings"
- [ ] Gboard text correction settings.
  > "On Android with Gboard, auto-correction and related options are under text correction in Gboard's settings"
- [ ] Text pasted on Windows arrives with CRLF (paste a received clip into an editor that shows line endings).
  > "when text is pasted on Windows it often arrives with CRLF endings."
- [ ] Checksum commands print matching SHA-256 hashes.
  > "Get-FileHash file in Windows PowerShell all print a SHA-256 hash"
- [ ] Text logs shrink well in a ZIP.
  > "text logs shrink well, unlike photos or videos."

## 11. Online clipboard vs emailing yourself vs messaging apps (`/guides/online-clipboard-vs-email-yourself`)

- [ ] Gmail personal limit still 25 MB.
  > "Gmail's limit for personal accounts is 25 MB at the time of writing"
- [ ] WhatsApp self-chat end-to-end encrypted.
  > "WhatsApp says chats with yourself are end-to-end encrypted"
- [ ] Telegram: cloud chats not end-to-end; secret chats device-specific.
  > "Telegram, for example, says its regular cloud chats are not end-to-end encrypted; only its secret chats are, and those stay on one device"
- [ ] Deleted mail sits in the bin/trash before final deletion.
  > "deleted mail usually sits there for a while before it is gone for good."
- [ ] Linked devices can be logged out from the messenger app.
  > "Linked desktop or web sessions you no longer need should be logged out from the app's linked-devices list."

## 12. What is an online clipboard? (`/guides/what-is-an-online-clipboard`)

- [ ] Windows clipboard history (Windows key + V) and sync with the same account.
  > "Windows can keep a clipboard history you open with Windows key + V, and can sync copied text between your own devices when you sign in with the same account"
- [ ] Universal Clipboard between nearby Apple devices on one Apple Account.
  > "Apple's Universal Clipboard shares copies between nearby Apple devices on the same Apple Account"
