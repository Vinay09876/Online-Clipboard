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

## 13. Convert HEIC photos to JPG (`/guides/convert-heic-to-jpg`)

- [ ] Mac Preview: File > Export offers JPEG in the Format menu, with a quality setting.
  > "Click the Format menu and choose JPEG."
- [ ] Finder quick action Convert Image exists (and where: directly under Quick Actions or under More). Note the macOS version.
  > "Control-click them and choose Quick Actions, then Convert Image (on some versions it sits under More)."
- [ ] Photos for Mac: Export Photos with Photo Kind JPEG; the arrow shows quality and size.
  > "Set Photo Kind to JPEG; the arrow next to it reveals quality and size options."
- [ ] iPhone share sheet Options > Most Compatible really sends a JPEG (send one to a PC and check the extension).
  > "Choose Most Compatible, which Apple says may convert files to JPEG or MOV, then tap Close and share as usual"
- [ ] iPhone camera setting Formats > Most Compatible; existing photos stay HEIC.
  > "In Settings, open Camera, then Formats, and choose Most Compatible."
  > "Photos already in your library stay as they are, and the new ones take up more storage."
- [ ] Keep Originals under Settings > Apps > Photos (USB import to a PC gives HEIC only when it is on).
  > "Apple notes that photos imported into a PC may be converted to JPEG unless you turned on Keep Originals (Settings > Apps > Photos)."
- [ ] Windows 11: confirm that neither Photos nor Paint offers a documented HEIC-to-JPG save. If one does, the guide can say so (with an official source).
  > "Microsoft's own help pages don't describe a built-in way to save a HEIC as a JPG, so we won't promise one."
- [ ] Converted JPEG is larger than the HEIC (compare one photo).
  > "HEIC was designed to save space, so the JPEG copy is usually bigger, sometimes much bigger."

## 14. Send files and text between Android and iPhone (`/guides/send-files-between-android-and-iphone`)

- [ ] Quick Share to iPhone via AirDrop on a supported Android phone (note the model; the list changes).
  > "Google says some Android phones can now send to an iPhone through AirDrop: Pixel 8a or later, and certain models from Samsung, Oppo, OnePlus, Vivo, Xiaomi, Honor, Transsion and Motorola."
  > "On the iPhone, set AirDrop to receive from Everyone for 10 Minutes."
- [ ] Quick Share QR code to an iPhone: download in the browser, available for 24 hours.
  > "Google says the files are end-to-end encrypted, stored on Google's servers and available for 24 hours, and both phones need internet access."
- [ ] RCS on iPhone: switch under Settings > Apps > Messages; high-resolution photos to an Android phone.
  > "It needs a carrier that supports RCS on iPhone; you turn it on in Settings > Apps > Messages"
- [ ] WhatsApp document limit 2 GB.
  > "WhatsApp allows documents up to 2 GB"
- [ ] Google Photos Get link opens on a device without the app.
  > "In Google Photos, Share and then Get link creates an album link that opens without the app"
- [ ] Android Switch: Google says to turn off iMessage first.
  > "Google also advises turning off iMessage first."
- [ ] Bluetooth file transfer between iPhone and Android: confirm it doesn't work (no official instructions exist).
  > "It is tempting to pair the two phones and send over Bluetooth, but we found no Apple or Google instructions for sending files between an iPhone and an Android phone that way."

## 15. Send files from a PC to your phone (`/guides/send-files-from-pc-to-phone`)

- [ ] Quick Share for Windows: right-click > Send with Quick Share; PIN shown; accept on the phone.
  > "Right-clicking a file and choosing Send with Quick Share also works."
- [ ] USB to Android: File Transfer mode opens a window for the phone on the PC.
  > "A window for the phone opens on the PC."
- [ ] Phone Link drag and drop to Android (supported models only, same Wi-Fi); file lands in Download.
  > "Microsoft limits this to selected models, mainly Samsung, and both devices must be on the same Wi-Fi"
- [ ] Bluetooth from Windows 11: Settings path and "Send files" wizard.
  > "With the phone paired, open Settings > Bluetooth & devices > Devices"
- [ ] iCloud for Windows: a file in the iCloud Drive folder appears in the iPhone's Files app.
  > "Files you put in the iCloud Drive folder in File Explorer appear in the Files app on the iPhone"
- [ ] Apple Devices app: Files section only with file-sharing apps; Add File copies to the iPhone.
  > "This only works with apps that support file sharing; if there is no Files section, none are installed"
- [ ] Phone Link Send Files in the Start menu works with an iPhone.
  > "Microsoft describes a Send Files option in the Start menu's mobile device panel that works with Android phones and iPhones"
- [ ] AirDrop Mac to iPhone: range and automatic accept with the same Apple Account.
  > "Apple says the devices need to be within 10 metres (30 feet) of each other"
- [ ] Mac to Android: still no official direct route from Google.
  > "Google's USB instructions cover Windows and Chromebook, and the Quick Share computer app is for Windows."
- [ ] Windows Nearby sharing cannot send to a phone.
  > "Microsoft describes it for sharing between Windows PCs, not phones"
- [ ] Quick Share received files are in a Quick Share folder under Downloads.
  > "Quick Share saves into its own folder there."

## 16. Scan a document with your phone and send it as a PDF (`/guides/scan-document-to-pdf-with-phone`)

- [ ] iPhone Notes: Attachments button > Scan Documents; Keep Scan; result is a PDF in the note.
  > "Tap the Attachments button and choose Scan Documents."
  > "Drag the corners to fit the page if needed, then tap Keep Scan."
  > "Apple says the document is saved as a PDF in the note."
- [ ] Sharing a single scan from Notes through its menu (copy, share, rename, delete).
  > "To send the PDF, use the scan's menu in the note, where Apple lists options to copy, share, rename or delete it"
- [ ] Files app scanner: More button > Scan Documents, then choose a folder and Save. Note which file type it saves.
  > "tap the More button there, choose Scan Documents, then pick a folder and tap Save."
- [ ] Google Drive scan: Camera button at the bottom right (Drive is getting a new multi-page scanner, so labels may change).
  > "Open the Google Drive app and tap the Camera button at the bottom right."
  > "Google says Drive saves scans as searchable PDFs"
- [ ] Files by Google: Scan saves PDFs in Documents > Scanned.
  > "Google says these scans are saved as PDFs automatically, in a Scanned folder you reach through Documents"
- [ ] Mail Drop limits (5 GB, 30 days).
  > "Mail Drop handles larger attachments, up to 5 GB, with links that expire after 30 days"
- [ ] Markup can add a signature to a scanned PDF.
  > "Apple's Markup tools can add one to a PDF"
- [ ] Markup box is not redaction: draw a box over text in a scanned PDF, save, reopen, and check whether the box can be moved or removed.
  > "Drawing a box over it afterwards in a markup tool is not a reliable way to hide it"

## 17. Move files between a Mac and a Windows PC (`/guides/move-files-between-mac-and-windows-pc`)

- [ ] Mac File Sharing with SMB and Windows File Sharing for your account.
  > "Under Windows File Sharing, select your user account, enter its password, and click OK, then Done."
- [ ] The PC finds the Mac under Network in File Explorer and asks for the Mac account.
  > "On the PC, open File Explorer, click Network, double-click the Mac, and sign in with the Mac account's name and password."
- [ ] Windows 11 menu for sharing a folder.
  > "right-click the folder, choose Show more options, then Give access to, then Specific people"
  > "If File Explorer says network discovery is off, select that message and turn on network discovery and file sharing"
- [ ] Sharing works with the PC's network set to private (and what happens on public).
  > "Microsoft's sharing steps assume the PC treats that network as private (a home network) rather than public."
- [ ] Mac connects to the PC's shared folder.
  > "type smb://computername/sharename in the Server Address field"
- [ ] Drive formats: FAT/ExFAT work on both; NTFS is read-only on the Mac.
  > "Apple lists MS-DOS (FAT) and ExFAT as the formats compatible with Windows, and suggests FAT for drives of 32 GB or less and ExFAT for larger ones"
  > "Apple says a Mac might be able to read NTFS but not write to it"
- [ ] Reformatting a drive as ExFAT in Disk Utility, then using it on Windows.
  > "in Disk Utility, choose View > Show All Devices, select the drive, click Erase, and choose ExFAT as the format"
- [ ] Pages/Numbers files: exporting to PDF or Word/Excel format first opens fine on Windows.
  > "Exporting to PDF or a Word or Excel format before you move them avoids that."

## 18. Share a Wi-Fi password from your phone (`/guides/share-wifi-password-from-phone`)

- [ ] iPhone one-tap sharing: contacts requirement and the Share Password prompt.
  > "Each person has the other's Apple Account email address or phone number saved in Contacts."
  > "A prompt appears on your iPhone: tap Share Password, then Done."
- [ ] Mac shares a Wi-Fi password through a notification.
  > "it shows a Wi-Fi password notification and you confirm it"
- [ ] iPhone Passwords app: Show Network QR Code (scan it with an Android phone and an iPhone).
  > "open it, tap Wi-Fi, choose the network, and tap Show Network QR Code for the visitor to scan"
- [ ] iPhone Settings > Wi-Fi > Info > Password (iOS 16+), older networks under Edit.
  > "Apple says this works from iOS 16, and that older saved networks are found through the Edit button on the Wi-Fi screen"
- [ ] Android QR code from Wi-Fi settings (note phone maker and Android version).
  > "Open Settings, then Network & internet, then Internet."
- [ ] Pixel quick settings shortcut.
  > "swipe down, tap Internet and choose Share Wi-Fi"
- [ ] Pixel camera joins Wi-Fi from a QR code.
  > "Google says the camera can scan a QR code to connect to a Wi-Fi network, as long as camera scan suggestions are turned on"
- [ ] iPhone camera with an Android Wi-Fi QR code: does it offer to join?
  > "so if the iPhone doesn't offer to join, type the password instead."
- [ ] Changing the password on Nest Wifi disconnects every device.
  > "Google warns that all your devices disconnect until you enter the new password on each of them"

## 19. Send photos and videos without losing quality (`/guides/send-photos-and-videos-without-losing-quality`)

- [ ] WhatsApp HD per message and as the default setting.
  > "tap the HD Media button and choose HD quality instead of Standard quality"
  > "open Settings, then Storage and data, then Media upload quality, and choose HD quality"
- [ ] WhatsApp document: send a photo as a document and compare file sizes on both ends.
  > "WhatsApp's help doesn't explicitly promise that documents are left untouched"
- [ ] Google Messages HD+ button in the image preview.
  > "Google describes HD+ as original quality, sent at full media resolution"
- [ ] iPhone Messages: Low Quality Image Mode setting name and location.
  > "check that Low Quality Image Mode is off"
- [ ] AirDrop with All Photos Data delivers the original (compare size and metadata).
  > "Tap Options and turn on All Photos Data."
- [ ] iCloud Shared Albums limits by version.
  > "For albums created in version 26 or earlier, photos are reduced to 2048 pixels on the long edge and videos are delivered at up to 720p."
  > "For albums created in version 27 or later, photos and videos are stored at full resolution in their original formats"
- [ ] Google Photos backup quality names.
  > "Google says Original quality keeps photos and videos at the resolution they were taken, while Storage saver stores reduced copies"

## 20. Zip and unzip files (`/guides/zip-and-unzip-files`)

- [ ] Windows 11: Send to > Compressed (zipped) folder, and Extract All.
  > "Choose Send to, then Compressed (zipped) folder."
  > "right-click the ZIP, choose Extract All, and follow the prompts"
- [ ] Windows 11 24H2 archive formats; encrypted archives not supported.
  > "Microsoft says Windows 11 version 24H2 supports ZIP, RAR, 7z and TAR archives, but not encrypted (password-protected) ones"
- [ ] Mac: Compress from the shortcut menu; several items give Archive.zip.
  > "Control-click the selection and choose Compress."
  > "for several items, it is called Archive.zip"
- [ ] iPhone Files: Compress and opening a ZIP (note the iOS version).
  > "Touch and hold it, then tap Compress."
  > "Tap the ZIP file in the Files app and a folder with its contents appears next to it."
- [ ] Safari downloads land in the Downloads folder in Files.
  > "A ZIP you downloaded in Safari usually sits in the Downloads folder in Files."
- [ ] Files by Google: Extract, and Compress (Android 8+, no spaces or full stops in the name).
  > "Tap Extract. Tick the option to delete the ZIP afterwards if you don't need it."
  > "Google says this needs Android 8 or later, and that the name shouldn't contain spaces or full stops"
- [ ] A ZIP of JPEGs is about the same size as the photos.
  > "Microsoft points out that a ZIP of JPEG pictures is about the same size as the pictures themselves."
- [ ] Email services refusing ZIPs that contain programs (try with Gmail).
  > "Some email services and workplaces may refuse ZIPs that contain programs, because malware is often sent that way."
