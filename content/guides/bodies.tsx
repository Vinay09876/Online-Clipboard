/**
 * Guide bodies. One function per guide (keyed by slug), receiving server facts so every
 * number about this service comes from config (docs/content-guidelines.md).
 *
 * Device instructions were checked against official help pages (listed in `sources`) on
 * 2026-11-21. Menu names change between versions, so the text describes features in general
 * terms and links to the official page for exact steps.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { CLAIMS, trackingClaims } from "@/content/claims";
import { fmt, plural } from "@/content/text";
import type { SiteFacts } from "@/lib/facts";

export type Source = { title: string; href: string };
export type GuideBody = {
  body: ReactNode;
  /** Content for the required "When this tool is not the right choice" section. */
  notRightFor: ReactNode;
  /** Official documentation cited in the guide. */
  sources: Source[];
};

/** Outbound link to official documentation. */
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  );
}

const SRC = {
  universalClipboard: {
    title: "Apple: Use Universal Clipboard to copy and paste between your Apple devices",
    href: "https://support.apple.com/en-us/102430",
  },
  phoneLinkCopyPaste: {
    title: "Microsoft: Seamlessly transfer content between your devices (Phone Link)",
    href: "https://support.microsoft.com/en-us/windows/apps/phonelink/seamlessly-transfer-content-between-your-devices",
  },
  swiftKeyClipboard: {
    title: "Microsoft: Copy and paste text between Microsoft SwiftKey and Windows",
    href: "https://support.microsoft.com/en-us/topic/how-to-use-microsoft-swiftkey-keyboard-to-copy-and-paste-text-between-swiftkey-and-windows-85c8ca64-7091-477f-91d1-99c3b1f75138",
  },
  whatsappSelf: {
    title: "WhatsApp Help Center: How to message yourself",
    href: "https://faq.whatsapp.com/1785465805163404/",
  },
  quickShareWindows: {
    title: "Google: Share files between Android & Windows with Quick Share",
    href: "https://support.google.com/android/answer/13801258",
  },
  bluetoothWindows: {
    title: "Microsoft: Send and receive files over Bluetooth in Windows",
    href: "https://support.microsoft.com/en-us/windows/hardware/bluetooth/send-and-receive-files-over-bluetooth-in-windows",
  },
  appleDevicesWindows: {
    title: "Apple: Use Apple Devices to share files between your Windows computer and your iPhone or iPad",
    href: "https://support.apple.com/en-us/120402",
  },
  gmailAttachments: {
    title: "Gmail Help: Send attachments with your Gmail message",
    href: "https://support.google.com/mail/answer/6584",
  },
  // --- added in Step 3b (checked 2026-11-21) ---
  outlookLargeFiles: {
    title: "Microsoft: Reduce attachment size to send large files with Outlook",
    href: "https://support.microsoft.com/en-us/outlook/reduce-attachment-size-to-send-large-files-with-outlook",
  },
  mailDrop: { title: "Apple: Mail Drop limits", href: "https://support.apple.com/en-us/108329" },
  driveFileLimits: {
    title: "Google Drive Help: Files you can store in Google Drive",
    href: "https://support.google.com/drive/answer/37603",
  },
  googleStorage: {
    title: "Google One Help: How your Google storage works",
    href: "https://support.google.com/googleone/answer/9312312",
  },
  oneDriveUpload: {
    title: "Microsoft: Upload photos and files to OneDrive",
    href: "https://support.microsoft.com/en-us/office/upload-photos-and-files-to-onedrive-b00ad3fe-6643-4b16-9212-de00ef02b586",
  },
  googleSignInNotYours: {
    title: "Google Account Help: Sign in on a device that's not yours",
    href: "https://support.google.com/accounts/answer/2917834",
  },
  edgePrivacy: {
    title: "Microsoft: Microsoft Edge, browsing data, and privacy",
    href: "https://support.microsoft.com/en-us/help/4468242/microsoft-edge-browsing-data-and-privacy-microsoft-privacy",
  },
  appleTransferPhotos: {
    title: "Apple: Transfer photos from your iPhone or iPad",
    href: "https://support.apple.com/en-us/120267",
  },
  appleTrust: {
    title: "Apple: About the 'Trust This Computer' alert",
    href: "https://support.apple.com/en-us/109054",
  },
  appleNotRecognized: {
    title: "Apple: If your computer doesn't recognize your iPhone or iPad",
    href: "https://support.apple.com/en-us/108643",
  },
  appleHeif: { title: "Apple: Using HEIF or HEVC media on Apple devices", href: "https://support.apple.com/en-us/116944" },
  appleLivePhotos: { title: "Apple: Bring your photos to life (Live Photos)", href: "https://support.apple.com/en-us/104966" },
  msImportPhotos: {
    title: "Microsoft: Import photos and videos from phone to PC",
    href: "https://support.microsoft.com/en-us/windows/apps/photos/import-photos-and-videos-from-phone-to-pc",
  },
  msHeifExtensions: {
    title: "Microsoft: Photos app error \"Can't view this file type\" (HEIF/HEVC extensions)",
    href: "https://support.microsoft.com/en-us/windows/apps/photos/photos-app-video-editor-error-can-t-view-this-file-type",
  },
  androidUsbTransfer: {
    title: "Android Help: Transfer files between your computer & Android device",
    href: "https://support.google.com/android/answer/9064445",
  },
  googlePhotosDownload: {
    title: "Google Photos Help: Download photos or videos to your device",
    href: "https://support.google.com/photos/answer/7652919",
  },
  // --- added in Step 3c (checked 2026-11-21) ---
  msSavePdf: {
    title: "Microsoft: Save or convert to PDF or XPS in Office desktop apps",
    href: "https://support.microsoft.com/en-us/office/save-or-convert-to-pdf-or-xps-in-office-desktop-apps-d85416c5-7d77-4fd6-a216-6f4bf7c7c110",
  },
  googleDocsDownload: {
    title: "Google Docs Editors Help: Create, view, or download a file",
    href: "https://support.google.com/docs/answer/49114",
  },
  classroomMaterials: {
    title: "Classroom Help: Add materials to the Classwork page",
    href: "https://support.google.com/edu/classroom/answer/9123621",
  },
  classroomAttachments: {
    title: "Classroom Help: How attachments are shared in Classroom",
    href: "https://support.google.com/edu/classroom/answer/6020260",
  },
  appleKeyboard: {
    title: "Apple: Type with the onscreen keyboard on iPhone",
    href: "https://support.apple.com/guide/iphone/type-with-the-onscreen-keyboard-iph3c50f96e/ios",
  },
  gboardCorrections: {
    title: "Gboard Help: Get word suggestions & fix mistakes",
    href: "https://support.google.com/gboard/answer/7068415",
  },
  telegramFaq: { title: "Telegram FAQ (encryption of cloud chats and secret chats)", href: "https://telegram.org/faq" },
  windowsClipboard: {
    title: "Microsoft: Using the clipboard (Windows clipboard history)",
    href: "https://support.microsoft.com/en-us/windows/apps/using-the-clipboard",
  },
  msPhoneLinkPhotos: {
    title: "Microsoft: View and manage photos from your Android device on your PC",
    href: "https://support.microsoft.com/en-us/windows/apps/photos/view-and-manage-photos-from-your-android-device-on-your-pc",
  },
} satisfies Record<string, Source>;

// ---------------------------------------------------------------------------
// 1. Copy and paste text between phone and computer
// ---------------------------------------------------------------------------

function copyPasteText(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Copying a link, an address or a few paragraphs from your phone to your computer sounds trivial, but there is no
          single button that works for every pair of devices. The best method depends on which phone and computer you have,
          and on whether you do this every day or once in a while.
        </p>

        <h2>If your devices are from the same family</h2>
        <h3>iPhone with a Mac: Universal Clipboard</h3>
        <p>
          Apple devices can share one clipboard: copy on the iPhone, paste on the Mac. According to Apple, both devices must
          be signed in to the same Apple Account, have Wi-Fi, Bluetooth and Handoff turned on, and be near each other (Apple
          says within about 10 metres). The copied item is only available for a short time, so it suits small bits of text
          or an image rather than whole documents. Universal Clipboard only works between Apple devices, so it won&apos;t
          help with a Windows PC. See{" "}
          <Ext href={SRC.universalClipboard.href}>Apple&apos;s Universal Clipboard page</Ext> for the current requirements.
        </p>

        <h3>Android with Windows: Phone Link</h3>
        <p>
          Microsoft&apos;s Phone Link app on Windows 11, together with the Link to Windows app on the phone, can share copied
          text and images between phone and PC. The catch: Microsoft lists cross-device copy and paste only for certain
          phones, mainly recent Samsung models and selected devices from a few other makers. If your phone is on the list,
          you turn the feature on in Phone Link&apos;s settings. Check{" "}
          <Ext href={SRC.phoneLinkCopyPaste.href}>Microsoft&apos;s Phone Link copy and paste page</Ext> for the supported
          devices and versions.
        </p>

        <h3>Android with Windows: SwiftKey&apos;s cloud clipboard</h3>
        <p>
          If you use the Microsoft SwiftKey keyboard on Android, it can sync your clipboard with Windows clipboard history.
          It needs a personal Microsoft account on both sides, and Microsoft says only the most recent item is synced and it
          stays available for an hour. Setup steps are on{" "}
          <Ext href={SRC.swiftKeyClipboard.href}>Microsoft&apos;s SwiftKey clipboard page</Ext>.
        </p>

        <h2>Methods that work with any combination</h2>
        <h3>Send it to yourself</h3>
        <p>
          Email the text to yourself, or use a chat app&apos;s self-chat. WhatsApp, for example, has a{" "}
          <Ext href={SRC.whatsappSelf.href}>message yourself</Ext> chat that you can open on WhatsApp Web or the desktop app.
          This is reliable and leaves a copy you can find later, which is either useful or clutter, depending on the text. It
          also means signing in on the computer, which you may not want on a shared or public machine.
        </p>

        <h3>Use an online clipboard</h3>
        <p>
          A website like this one needs no app and no sign-in on either device:
        </p>
        <ol>
          <li>On your phone, open <Link href="/">Online Clipboard</Link> and paste the text into the Send box.</li>
          <li>Tap &ldquo;Create clip&rdquo;. You get a 6-digit code and a link.</li>
          <li>On the computer, open the same site, choose Receive and type the code. The text appears, ready to copy.</li>
        </ol>
        <p>
          Line breaks and spacing are kept, and you can send up to {fmt(f.maxTextLength)} characters. The clip disappears{" "}
          {minutes} after you create it, so it won&apos;t pile up anywhere.
        </p>

        <h2>When the built-in sync doesn&apos;t work</h2>
        <ul>
          <li>
            <strong>Universal Clipboard pastes old content:</strong> Apple says the copied item is only available for a short
            time and that both devices need Wi-Fi, Bluetooth and Handoff on, signed in to the same Apple Account. Check all four
            on both devices; Handoff is the one most often switched off.
          </li>
          <li>
            <strong>Phone Link&apos;s copy and paste option is missing:</strong> your phone is probably not on Microsoft&apos;s
            list of supported models. No setting will add it; use one of the methods below instead.
          </li>
          <li>
            <strong>SwiftKey sync pastes something else:</strong> only the most recent item syncs, so copying anything new on
            either side replaces it.
          </li>
        </ul>

        <h2>A quick way to decide</h2>
        <p>
          Same Apple Account on iPhone and Mac: Universal Clipboard. Supported Android phone and a Windows 11 PC: Phone Link.
          A computer you won&apos;t use again, or a mix of brands: a message to yourself if you&apos;re happy to sign in there,
          an online clipboard if you aren&apos;t.
        </p>

        <h2>Tips that save time</h2>
        <ul>
          <li>
            For something you copy daily between the same two devices, set up the built-in option once. It is quicker in the
            long run than any website.
          </li>
          <li>For long text, check that the end arrived intact before you close the source.</li>
          <li>
            On a shared computer, prefer a method that doesn&apos;t need you to sign in, and close the browser tab when
            you&apos;re done.
          </li>
        </ul>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Passwords and one-time codes.</strong> Use your password manager&apos;s own sync instead. Clips here are not
          end-to-end encrypted.
        </li>
        <li>
          <strong>Text you need later.</strong> Every clip expires after {minutes}; email or notes apps keep things.
        </li>
        <li>
          <strong>Constant, everyday copying</strong> between the same Apple devices, or between a supported Android phone and
          Windows: the built-in sync is smoother.
        </li>
      </ul>
    ),
    sources: [SRC.universalClipboard, SRC.phoneLinkCopyPaste, SRC.swiftKeyClipboard, SRC.whatsappSelf],
  };
}

// ---------------------------------------------------------------------------
// 2. Send a file from phone to PC without a cable
// ---------------------------------------------------------------------------

function sendFileWithoutCable(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A cable works, but you need the right one and sometimes a driver or an app. Wireless options are usually quicker
          for a photo, a PDF or a short video. Which one fits depends on your phone, your PC and how big the file is.
        </p>

        <h2>Android to Windows</h2>
        <h3>Quick Share</h3>
        <p>
          Google&apos;s Quick Share app for Windows lets you send files from an Android phone to a nearby PC, much like
          sharing between two phones. Google lists a 64-bit Windows 10 or later PC, Bluetooth turned on, and both devices on
          the same network and close together. It isn&apos;t offered in every country, and Samsung PCs use Samsung&apos;s
          own version. Details are on{" "}
          <Ext href={SRC.quickShareWindows.href}>Google&apos;s Quick Share for Windows page</Ext>.
        </p>
        <h3>Phone Link</h3>
        <p>
          With Microsoft&apos;s Phone Link on a Windows 11 PC and the Link to Windows app on the phone, you can share a file
          from the phone&apos;s share menu to your PC. Microsoft says received files land in a Phone Link folder inside
          Downloads. See <Ext href={SRC.phoneLinkCopyPaste.href}>Microsoft&apos;s Phone Link transfer page</Ext> for
          requirements.
        </p>
        <h3>Bluetooth</h3>
        <p>
          Windows can receive files over Bluetooth from a paired phone: you start &ldquo;receive&rdquo; on the PC, then share
          the file over Bluetooth from the phone. It is slow, so it suits small files, and not every phone offers Bluetooth
          in its share menu. Steps are on{" "}
          <Ext href={SRC.bluetoothWindows.href}>Microsoft&apos;s Bluetooth file transfer page</Ext>.
        </p>

        <h2>iPhone to Windows</h2>
        <p>
          AirDrop only works between Apple devices. For a Windows PC, Apple&apos;s own route is iCloud: with iCloud for
          Windows and the same Apple Account on both devices, files sync automatically. If a cable is fine after all,
          Apple&apos;s Apple Devices app for Windows can copy files from apps that support file sharing. Both are described
          on <Ext href={SRC.appleDevicesWindows.href}>Apple&apos;s Windows file-sharing page</Ext>.
        </p>

        <h2>Options that work for any phone</h2>
        <h3>Email or a cloud drive</h3>
        <p>
          Emailing a file to yourself works everywhere you can sign in. Attachment sizes are limited: Gmail, for example,
          allows up to 25 MB and offers a Google Drive link for bigger files (see{" "}
          <Ext href={SRC.gmailAttachments.href}>Gmail Help</Ext>). Cloud drives such as Google Drive, OneDrive or iCloud
          Drive are better for large files and for files you want to keep.
        </p>
        <h3>A temporary file-sharing site</h3>
        <p>
          When you just need one file on a computer that isn&apos;t yours, signing in to your email or cloud drive there is
          a risk you may not want. Temporary file sharing avoids that:
        </p>
        <ol>
          <li>On your phone, open <Link href="/">Online Clipboard</Link>, choose the file and tap &ldquo;Create clip&rdquo;.</li>
          <li>Wait for the upload to finish. Only then do you get the 6-digit code.</li>
          <li>On the PC, open the site, choose Receive, enter the code and press Download.</li>
        </ol>
        <p>
          One file per clip, up to {f.maxFileMb} MB, any file type. To send several files, zip them first. The clip and the
          file are deleted {minutes} after you create them.
        </p>

        <h2>When a wireless transfer fails</h2>
        <ul>
          <li>
            <strong>Quick Share can&apos;t find the PC:</strong> Google says both devices need Bluetooth on and must be on the
            same network and close together. It also notes that some networks, typically at work or school, block devices from
            seeing each other. Switching both to your phone&apos;s hotspot often gets around that.
          </li>
          <li>
            <strong>&ldquo;Send to PC&rdquo; is missing from the share menu:</strong> the Link to Windows app on the phone
            isn&apos;t set up or isn&apos;t connected to Phone Link on the PC. Open Phone Link on the PC and check that the phone
            shows as connected.
          </li>
          <li>
            <strong>Bluetooth transfer starts and then stops:</strong> start &ldquo;receive&rdquo; on the PC first, keep the
            devices close, and send one file at a time.
          </li>
          <li>
            <strong>The upload to a website never finishes:</strong> a weak mobile signal is the usual cause. Switch to Wi-Fi, or
            send a smaller version of the file.
          </li>
        </ul>

        <h2>Which one should you pick?</h2>
        <ul>
          <li><strong>Your own PC, regularly:</strong> set up Quick Share, Phone Link or iCloud once.</li>
          <li><strong>Large videos or many photos:</strong> a cloud drive, or a cable.</li>
          <li><strong>Someone else&apos;s PC, once:</strong> email via a web browser you sign out of, or a temporary file-sharing site.</li>
        </ul>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Files bigger than {f.maxFileMb} MB</strong>, or whole photo libraries: use a cloud drive or a cable.
        </li>
        <li>
          <strong>Sensitive documents</strong> (IDs, contracts, bank statements): files here are not end-to-end encrypted.
        </li>
        <li>
          <strong>Files you need to keep</strong>: the clip is deleted after {minutes}.
        </li>
        <li>
          <strong>No internet</strong>: Bluetooth or a cable still work offline.
        </li>
      </ul>
    ),
    sources: [SRC.quickShareWindows, SRC.phoneLinkCopyPaste, SRC.bluetoothWindows, SRC.appleDevicesWindows, SRC.gmailAttachments],
  };
}

// ---------------------------------------------------------------------------
// 3. Is an online clipboard safe?
// ---------------------------------------------------------------------------

function isItSafe(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          &ldquo;Safe&rdquo; depends on what you share and who might want it. An online clipboard is like leaving a note in a
          locked drop-box that opens with a short number. Fine for a shopping list. Not where you&apos;d leave your passport.
          Here is what actually happens to a clip on this site, what protects it, and where the limits are.
        </p>

        <h2>What happens to your clip</h2>
        <ol>
          <li>Your browser sends the text or file over HTTPS, so it is encrypted on the way.</li>
          <li>
            {CLAIMS.encryption} Anyone who broke into those servers could read it too.
          </li>
          <li>Anyone who enters the code or opens the link gets the clip, as many times as they like, until it expires.</li>
          <li>{`After ${minutes}`} the code stops working, and {CLAIMS.deletion}.</li>
        </ol>

        <h2>What protects you</h2>
        <ul>
          <li>
            <strong>Random codes.</strong> Each code is 6 random digits, one of a million possibilities.
          </li>
          <li>
            <strong>Short lifetime.</strong> Every clip expires {minutes} after it is created, which leaves little time for
            anyone to find it.
          </li>
          <li>
            <strong>Limited guessing.</strong> After {plural(f.lookupFailures, "wrong code", "wrong codes")} from the same
            internet connection, lookups pause for up to {plural(f.rateWindowMinutes, "minute", "minutes")}.
          </li>
          <li>
            <strong>Short-lived download links.</strong> Files are only handed out through links that work for{" "}
            {plural(f.downloadLinkSeconds, "second", "seconds")}.
          </li>
          <li>
            <strong>Little data about you.</strong> {trackingClaims(f.adsActive).guide} For rate limiting we keep{" "}
            {CLAIMS.ipHash(f.rateLimitRetentionHours)}.
          </li>
        </ul>

        <h2>What it doesn&apos;t protect against</h2>
        <ul>
          <li>
            <strong>Someone who has the code.</strong> A screenshot in a group chat, a code read out loud on a train, a link
            forwarded by mistake: whoever has it can open the clip.
          </li>
          <li>
            <strong>Determined guessing.</strong> Rate limits make guessing slow, but someone using many connections could
            still find some clip eventually. Not necessarily yours, but you can&apos;t rule it out.
          </li>
          <li>
            <strong>Browser history on shared computers.</strong> If you open a clip by link, the code is in that browser&apos;s
            history. Harmless after the clip expires, but close the tab on public computers.
          </li>
          <li>
            <strong>No take-backs.</strong> There is no early-delete button. Once shared, a clip stays until it expires.
          </li>
        </ul>

        <h2>Never put these in an online clipboard</h2>
        <ul>
          <li>Passwords, PINs, one-time codes and backup or recovery codes.</li>
          <li>Private keys, crypto wallet seed phrases, API keys and access tokens.</li>
          <li>ID documents: passport, national ID or driving licence scans.</li>
          <li>Bank and card details, statements and tax documents.</li>
          <li>Medical records, and anything confidential from work or school.</li>
        </ul>

        <h2>Better tools for sensitive things</h2>
        <ul>
          <li>
            <strong>Passwords:</strong> a password manager, which can sync between your devices and share items securely.
          </li>
          <li>
            <strong>Private messages and files:</strong> an end-to-end encrypted messenger. WhatsApp, for example, says messages
            to yourself are end-to-end encrypted (<Ext href={SRC.whatsappSelf.href}>WhatsApp Help</Ext>).
          </li>
          <li>
            <strong>Documents you must send:</strong> a password-protected archive, with the password sent through a different
            channel.
          </li>
        </ul>

        <h2>If you shared something by mistake</h2>
        <ol>
          <li>Don&apos;t pass the code or link on, and delete the message where you shared it, if you can.</li>
          <li>
            If it was a password or a key, change it now. Assume it is compromised; waiting for the clip to expire does not
            undo that someone may already have opened it.
          </li>
          <li>
            Ask for the clip to be removed early through the <Link href="/contact">Contact page</Link>, with the code. It may
            expire before anyone reads the email, so steps 1 and 2 matter more.
          </li>
        </ol>

        <h2>When someone sends you a code</h2>
        <p>
          A code from someone you know is as trustworthy as that person. A code from a stranger, or one that arrives out of the
          blue, deserves the same care as an unexpected email attachment: files in a clip are not scanned for malware, so
          don&apos;t open a program, a document with macros or an archive you weren&apos;t expecting.
        </p>

        <h2>A quick check before you send</h2>
        <p>
          Ask yourself: &ldquo;Would it matter if a stranger read this in the next {minutes}?&rdquo; If the answer is no,
          an online clipboard is a fast, convenient way to move it. If the answer is yes, use one of the tools above instead.
          The full details of what we store are in the <Link href="/privacy">Privacy policy</Link>.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>Anything on the &ldquo;never share&rdquo; list above.</li>
        <li>Content that must stay private even if the code leaks.</li>
        <li>Anything you need to delete on demand: clips can&apos;t be removed early.</li>
      </ul>
    ),
    sources: [SRC.whatsappSelf],
  };
}

// ---------------------------------------------------------------------------
// 4. Send files that are too big for email
// ---------------------------------------------------------------------------

function tooBigForEmail(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          You attach a video or a folder of scans, press send, and the email bounces back or refuses to attach at all. Email
          was never designed to carry large files. Every provider caps the size of a message, and the person receiving it has
          a cap of their own. The reliable fix is to stop attaching the file and send a link to it instead.
        </p>

        <h2>Why big attachments fail</h2>
        <ul>
          <li>
            <strong>Your provider&apos;s limit.</strong> Gmail, for example, allows attachments up to 25 MB for personal
            accounts and offers a Google Drive link when a file is bigger (
            <Ext href={SRC.gmailAttachments.href}>Gmail Help</Ext>). Microsoft&apos;s own Outlook pages give different
            figures, so check{" "}
            <Ext href={SRC.outlookLargeFiles.href}>Microsoft&apos;s large-files page</Ext> for the current number. Limits
            like these change, so treat any number you read, here included, as a snapshot.
          </li>
          <li>
            <strong>The recipient&apos;s limit.</strong> Even if your provider accepts the message, the receiving server can
            reject it. Work and school accounts often have their own limits set by an administrator.
          </li>
          <li>
            <strong>Encoding overhead.</strong> Attachments are converted to text for sending, which makes them noticeably
            larger in transit. A file just under the limit can push the message over it, so leave some room.
          </li>
        </ul>

        <h2>Option 1: a share link from a cloud drive</h2>
        <p>This works with any email provider, and the recipient doesn&apos;t need an account in most cases.</p>
        <ol>
          <li>Upload the file to a cloud drive you already use, such as Google Drive, OneDrive or iCloud Drive.</li>
          <li>Create a share link, and check who it allows: anyone with the link, or only specific people.</li>
          <li>Paste the link into your email and say what the file is, so the recipient knows it is genuine.</li>
          <li>After they confirm they have it, remove sharing or delete the file if it doesn&apos;t need to stay online.</li>
        </ol>
        <p>
          Two limits matter here: the size of a single upload and your storage quota. Google says a free account&apos;s 15 GB
          is shared across Drive, Gmail and Photos (<Ext href={SRC.googleStorage.href}>Google One Help</Ext>), and lists the
          per-file maximums on <Ext href={SRC.driveFileLimits.href}>its Drive limits page</Ext>. Microsoft lists OneDrive
          upload limits on <Ext href={SRC.oneDriveUpload.href}>its upload page</Ext>. A full drive is the most common reason
          an upload stops halfway, so check your free space first.
        </p>

        <h2>Option 2: your email app&apos;s built-in large-file feature</h2>
        <p>
          Some providers do the link step for you. Gmail offers to send a Drive link when you attach something too large.
          Outlook can attach a OneDrive file as a link. Apple Mail has Mail Drop, which uploads the attachment to iCloud and
          sends a link; Apple&apos;s{" "}
          <Ext href={SRC.mailDrop.href}>Mail Drop page</Ext> says attachments can be up to 5 GB and links last 30 days, but
          that page isn&apos;t recent, so check it before relying on those numbers.
        </p>

        <h2>Option 3: make the file smaller first</h2>
        <ul>
          <li>
            <strong>Video:</strong> phones record at high resolution. Exporting or sharing at a lower quality can cut the size
            dramatically, if the recipient doesn&apos;t need full quality.
          </li>
          <li>
            <strong>Documents and scans:</strong> a PDF made from photos is often far bigger than it needs to be. Scanning at a
            lower resolution or in black and white helps.
          </li>
          <li>
            <strong>ZIP files:</strong> zipping is great for bundling many files into one, but it barely shrinks photos, videos
            or PDFs, which are already compressed. Don&apos;t expect a ZIP to get a 60 MB video under a 25 MB limit.
          </li>
        </ul>

        <h2>Where a temporary file-sharing site fits</h2>
        <p>
          Online Clipboard is not a large-file service. It takes one file of up to {f.maxFileMb} MB, and the file is deleted{" "}
          {minutes} after you create the clip. That suits a file that is slightly too big for an attachment and needs to reach
          someone right now, while you can tell them the code directly. For anything bigger, or anything that must wait for the
          recipient, use a share link from a cloud drive.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Files over {f.maxFileMb} MB:</strong> that is our hard limit. Use a cloud drive share link or your email
          provider&apos;s large-file option.
        </li>
        <li>
          <strong>Recipients who won&apos;t open it soon:</strong> the clip is gone after {minutes}; a share link can stay
          available for days.
        </li>
        <li>
          <strong>Sending to a group or a client:</strong> a named link from your own cloud drive looks more trustworthy than a
          6-digit code, and you can see who has access.
        </li>
        <li>
          <strong>Contracts, payslips and other confidential files:</strong> clips are not end-to-end encrypted; use a share
          link restricted to the recipient&apos;s account.
        </li>
      </ul>
    ),
    sources: [SRC.gmailAttachments, SRC.outlookLargeFiles, SRC.mailDrop, SRC.googleStorage, SRC.driveFileLimits, SRC.oneDriveUpload],
  };
}

// ---------------------------------------------------------------------------
// 5. Use a shared or public computer safely
// ---------------------------------------------------------------------------

function sharedComputer(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Cyber cafés, library terminals, print-shop PCs and hot desks at work all have one thing in common: other people use
          them after you, and you don&apos;t know what is installed. You can still get a document printed or a file sent
          safely if you treat the machine as borrowed and leave nothing of yours behind.
        </p>

        <h2>Before you start</h2>
        <ul>
          <li>
            <strong>Open a private or guest window.</strong> Chrome has guest and Incognito windows, Edge has InPrivate.
            Google&apos;s advice for a computer that isn&apos;t yours is to browse in a private window and close it when
            you&apos;re done (<Ext href={SRC.googleSignInNotYours.href}>Google Account Help</Ext>).
          </li>
          <li>
            <strong>Check for anything odd.</strong> An unfamiliar browser extension, a toolbar you didn&apos;t expect, or a
            small device plugged in between the keyboard cable and the computer are all reasons to use another machine.
          </li>
          <li>
            <strong>Decide what you will sign in to.</strong> The fewer accounts you open, the less can go wrong. Online banking,
            tax portals and your main email are better left for your own phone.
          </li>
        </ul>

        <h2>While you work</h2>
        <ol>
          <li>
            When a site asks to <strong>save your password</strong>, choose never or not now. Untick &ldquo;stay signed in&rdquo;
            or &ldquo;remember me&rdquo; on login pages.
          </li>
          <li>
            Watch out for people looking over your shoulder when you type a password or a one-time code, and cover the keyboard
            if needed.
          </li>
          <li>
            If you need a file on this computer, prefer a method that doesn&apos;t require signing in here: a temporary
            file-sharing site with a short code, or a USB stick you control. Be careful with USB sticks on public machines;
            they can pick up malware and carry it back to your own computer.
          </li>
          <li>Open documents to print them, but don&apos;t edit sensitive files on a machine you don&apos;t trust.</li>
        </ol>

        <h2>Before you leave: the step most people miss</h2>
        <p>
          A private window deletes history, cookies and site data when you close it. Microsoft describes this for Edge&apos;s
          InPrivate mode on <Ext href={SRC.edgePrivacy.href}>its browsing-data page</Ext>. What it does{" "}
          <strong>not</strong> do is delete files you downloaded. Your PDF, photo or ticket is still sitting in the Downloads
          folder for the next person.
        </p>
        <ol>
          <li>Sign out of every site you used.</li>
          <li>Open the Downloads folder and delete what you downloaded. Check the desktop too.</li>
          <li>Empty the Recycle Bin, or the deleted files can be restored.</li>
          <li>If you printed, check that nothing is still waiting in the print queue or in the printer tray.</li>
          <li>Close all browser windows, including the private ones.</li>
        </ol>

        <h2>At a print shop</h2>
        <ul>
          <li>
            Staff sometimes ask you to email the file to the shop. That puts your document in their inbox indefinitely. Ask
            whether you can open it on their computer instead, and delete it once it has printed.
          </li>
          <li>
            Count the pages before you pay and take every copy, including misprints, which can contain the same details as the
            good ones.
          </li>
          <li>Don&apos;t leave your USB stick in the machine; it is the most commonly forgotten item.</li>
        </ul>

        <h2>If you forgot to sign out</h2>
        <p>
          You can usually end the session remotely. Google lets you see where your account is signed in and remove a device
          from your account&apos;s device list. If you think the computer saved your password, change it as soon as you can
          from your own device. Other large providers offer similar &ldquo;sign out everywhere&rdquo; controls in their security
          settings.
        </p>

        <h2>Where Online Clipboard fits</h2>
        <p>
          It needs no sign-in on the shared computer: you create the clip on your phone and type the code there. Keep in mind
          that the clip can be opened by anyone with the code until it expires {minutes} after you created it, and that it is
          not end-to-end encrypted. If you opened it with a link, the code stays in that browser&apos;s history until you close
          a private window. Delete the downloaded file afterwards, exactly as you would with any other method.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Documents with personal data</strong> (IDs, bank letters, medical forms): print them from your own device or
          a trusted print service, not via a public PC and a shared code.
        </li>
        <li>
          <strong>Office computers with rules:</strong> if your workplace blocks downloads or file-sharing sites, follow its
          policy instead of working around it.
        </li>
        <li>
          <strong>Anything you need to sign in to anyway</strong>, such as a work system: an online clipboard doesn&apos;t make
          that login safer.
        </li>
        <li>
          <strong>Files over {f.maxFileMb} MB</strong>, which don&apos;t fit in a clip.
        </li>
      </ul>
    ),
    sources: [SRC.googleSignInNotYours, SRC.edgePrivacy],
  };
}

// ---------------------------------------------------------------------------
// 6. Transfer photos from an iPhone to a Windows PC
// ---------------------------------------------------------------------------

function iphonePhotosToWindows(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Moving a few photos is easy; moving a year of them without missing files, blurry copies or files Windows can&apos;t
          open takes a little preparation. This guide covers the photo-specific parts: formats, Live Photos and import errors.
          For other file types, see{" "}
          <Link href="/guides/send-file-from-phone-to-pc-without-cable">sending a file from your phone to a PC</Link>.
        </p>

        <h2>Which method should you use?</h2>
        <ul>
          <li><strong>Hundreds of photos, once:</strong> USB import (method 1). It is the fastest and needs no account.</li>
          <li><strong>Every new photo, automatically:</strong> iCloud for Windows (method 2), if you already pay for iCloud storage.</li>
          <li><strong>One or two photos to someone else&apos;s PC:</strong> email or a short-lived clip (end of this guide).</li>
        </ul>

        <h2>Method 1: USB and the Windows Photos app (best for many photos)</h2>
        <ol>
          <li>
            On the PC, install Apple&apos;s <strong>Apple Devices</strong> app from the Microsoft Store, as Apple recommends on{" "}
            <Ext href={SRC.appleTransferPhotos.href}>its photo transfer page</Ext>.
          </li>
          <li>Connect the iPhone with a USB cable and unlock it.</li>
          <li>If the iPhone asks whether to trust this computer, tap Trust (or Allow) and enter your passcode.</li>
          <li>
            Open the Photos app on the PC, choose Import, select the iPhone, then pick the photos and the folder to save them in (
            <Ext href={SRC.msImportPhotos.href}>Microsoft&apos;s import steps</Ext>).
          </li>
        </ol>

        <h2>Method 2: iCloud Photos and iCloud for Windows</h2>
        <p>
          If iCloud Photos is turned on, your library already lives in iCloud. With iCloud for Windows and the same Apple Account,
          photos can sync to the PC without a cable, which suits ongoing backups more than a one-off transfer. Free iCloud storage
          is small, so large libraries usually need a paid plan.
        </p>

        <h2>HEIC files that Windows won&apos;t open</h2>
        <p>
          iPhones save photos as HEIF (files ending in .HEIC) and videos as HEVC to save space. Apple says that when you import
          over USB to a PC, the iPhone may convert them to JPEG and H.264 automatically; if you chose to keep originals, you get
          HEIC files instead (<Ext href={SRC.appleHeif.href}>Apple: HEIF and HEVC</Ext>). To open HEIC files, Microsoft says
          the Photos app needs the HEIF Image Extensions and the HEVC Video Extensions from the Microsoft Store, and lists the
          HEVC one as a paid extension (<Ext href={SRC.msHeifExtensions.href}>Microsoft&apos;s page</Ext>). The alternatives:
        </p>
        <ul>
          <li>Leave the iPhone&apos;s transfer setting on automatic so photos arrive as JPEG.</li>
          <li>
            Or set the iPhone camera to <strong>Most Compatible</strong>, so new photos are taken as JPEG from the start. Apple
            suggests this for the best results on Windows; existing photos are not converted.
          </li>
        </ul>

        <h2>Live Photos</h2>
        <p>
          A Live Photo is a still photo plus a short clip from just before and after you pressed the shutter (
          <Ext href={SRC.appleLivePhotos.href}>Apple: Live Photos</Ext>). Windows has no Live Photo player, so depending on how
          you transfer it, you get just the still image or the still plus a separate short video file. Apple notes that sending
          one by Mail turns it into a still image. If the motion matters, convert it to a video on the iPhone first.
        </p>

        <h2>Common problems and fixes</h2>
        <ul>
          <li>
            <strong>The iPhone doesn&apos;t appear on the PC.</strong> Unlock it, try another cable (some only charge and
            can&apos;t carry data) and another USB port, then restart both devices. Apple lists these steps on{" "}
            <Ext href={SRC.appleNotRecognized.href}>its troubleshooting page</Ext>.
          </li>
          <li>
            <strong>You tapped &ldquo;Don&apos;t Trust&rdquo; by mistake.</strong> Apple explains how to bring the prompt back by
            resetting location and privacy settings on the iPhone (
            <Ext href={SRC.appleTrust.href}>Apple: Trust This Computer</Ext>).
          </li>
          <li>
            <strong>Some photos are missing from the import.</strong> If iCloud Photos is set to save storage on the iPhone, the
            full-size originals may only exist in iCloud. Apple says to download the originals to the iPhone before importing over
            USB.
          </li>
          <li>
            <strong>The import stops halfway on a big library.</strong> Import in smaller batches, by month or album, and keep
            the iPhone unlocked and connected until it finishes.
          </li>
        </ul>

        <h2>Just one or two photos?</h2>
        <p>
          For a single photo, a cable is overkill. You can email it to yourself, or use Online Clipboard: choose the photo on
          the iPhone, create a clip, and enter the code on the PC. One file per clip, up to {f.maxFileMb} MB, gone after{" "}
          {minutes}.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Whole albums or a full photo library:</strong> one file per clip makes this impractical. Use USB import or
          iCloud.
        </li>
        <li>
          <strong>Keeping a backup:</strong> clips are deleted after {minutes}; they are a hand-off, not storage.
        </li>
        <li>
          <strong>Long 4K videos</strong> that are bigger than {f.maxFileMb} MB.
        </li>
        <li>
          <strong>Private photos:</strong> clips are not end-to-end encrypted and can be opened by anyone with the code.
        </li>
      </ul>
    ),
    sources: [
      SRC.appleTransferPhotos,
      SRC.msImportPhotos,
      SRC.appleHeif,
      SRC.msHeifExtensions,
      SRC.appleLivePhotos,
      SRC.appleNotRecognized,
      SRC.appleTrust,
    ],
  };
}

// ---------------------------------------------------------------------------
// 7. Transfer photos from an Android phone to a computer
// ---------------------------------------------------------------------------

function androidPhotosToComputer(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Android phones store photos as ordinary files, which makes copying them to a computer straightforward once the phone
          and the computer can see each other. Most failed transfers come down to one setting and one cable. This guide is about
          photos and videos; for documents and other files, see{" "}
          <Link href="/guides/send-file-from-phone-to-pc-without-cable">sending a file from your phone to a PC</Link>.
        </p>

        <h2>The setting that blocks most transfers</h2>
        <p>
          When you plug an Android phone into a computer, it usually only charges. You have to tell it to share files: unlock the
          phone, tap the USB notification (often labelled something like &ldquo;Charging this device via USB&rdquo;), and choose{" "}
          <strong>File transfer</strong>. Google describes this on{" "}
          <Ext href={SRC.androidUsbTransfer.href}>its Android file transfer page</Ext>. The wording differs between phone makers,
          but the option is in that notification.
        </p>
        <p>
          The other usual suspect is the cable. Google points out that not all USB cables can transfer files; the thin cable that
          came with a power bank may only charge. If the phone charges but the computer never sees it, try another cable before
          anything else.
        </p>

        <h2>Windows: Photos app or File Explorer</h2>
        <ol>
          <li>Connect the phone, unlock it and select File transfer as above.</li>
          <li>
            To pick photos visually, open the Photos app, choose Import and select the phone (
            <Ext href={SRC.msImportPhotos.href}>Microsoft&apos;s import steps</Ext>). Microsoft notes the PC can&apos;t see a
            locked phone.
          </li>
          <li>
            Or open File Explorer, select the phone, and copy the photo folder yourself. Camera photos are usually in a folder
            called DCIM.
          </li>
        </ol>
        <p>
          For a handful of recent photos without a cable, Microsoft&apos;s Phone Link can show recent phone photos on the PC (
          <Ext href={SRC.msPhoneLinkPhotos.href}>Microsoft: photos in Phone Link</Ext>); it is meant for recent shots, not whole
          libraries.
        </p>

        <h2>Mac</h2>
        <p>
          Macs don&apos;t show Android phones in Finder. Google&apos;s help page says to install its Android File Transfer app,
          connect the phone, and choose File transfer on the phone; the app then lets you drag files across. If that app
          isn&apos;t available or doesn&apos;t work on your version of macOS, the cloud route below avoids cables entirely.
        </p>

        <h2>From Google Photos (no cable at all)</h2>
        <p>
          If your phone backs up to Google Photos, the photos are already online. On the computer, open Google Photos in a
          browser, select the photos and choose Download. For an entire library, Google suggests Google Takeout, which packs
          everything into ZIP archives (<Ext href={SRC.googlePhotosDownload.href}>Google Photos Help</Ext>).
        </p>
        <p>
          One detail that surprises people: Google notes that downloaded files may show the download date in your file browser,
          even though the original date taken is still stored inside each photo. Sort by &ldquo;date taken&rdquo;, not
          &ldquo;date modified&rdquo;, and your timeline looks right again.
        </p>

        <h2>Tips for big transfers</h2>
        <ul>
          <li>
            Copy in batches, a month or a folder at a time. If something goes wrong, you only redo one batch, not the whole
            camera roll.
          </li>
          <li>
            If a long copy stops partway, the phone may have locked itself. Keep it unlocked, or lengthen the screen timeout
            while you copy, then set it back.
          </li>
          <li>
            Check a few videos after copying. If a video was still being backed up or edited on the phone, the copied file can be
            incomplete.
          </li>
          <li>Only delete photos from the phone once you have opened them on the computer, not just seen the file names.</li>
        </ul>

        <h2>Formats you might see</h2>
        <p>
          Most Android phones save JPEG photos and MP4 videos, which every computer opens. Some recent phones offer HEIF/HEIC to
          save space; if Windows won&apos;t open those, check the camera app&apos;s settings for a more compatible format, or see
          the HEIC section of our{" "}
          <Link href="/guides/transfer-photos-from-iphone-to-windows-pc">iPhone to Windows photos guide</Link>.
        </p>

        <h2>One photo, right now</h2>
        <p>
          For a single photo to a computer that isn&apos;t yours, cables and cloud logins are overkill. Create a clip with Online
          Clipboard on the phone and enter the code on the computer: one file per clip, up to {f.maxFileMb} MB, deleted after{" "}
          {minutes}.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Backing up your camera roll:</strong> use a cable or Google Photos; a clip is deleted after {minutes}.
        </li>
        <li>
          <strong>Dozens of photos at once:</strong> one file per clip turns that into a chore. Zip them, or use a cable.
        </li>
        <li>
          <strong>Videos bigger than {f.maxFileMb} MB</strong>, which won&apos;t fit.
        </li>
        <li>
          <strong>Photos of documents or people you&apos;d rather keep private:</strong> clips are not end-to-end encrypted.
        </li>
      </ul>
    ),
    sources: [SRC.androidUsbTransfer, SRC.msImportPhotos, SRC.msPhoneLinkPhotos, SRC.googlePhotosDownload],
  };
}

// ---------------------------------------------------------------------------
// 8. Send a document to a print shop
// ---------------------------------------------------------------------------

function printShop(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Most print-shop disappointments happen before you arrive: a CV that spills onto a second page, a poster printed in
          portrait, or a photo that comes out muddy in black and white. Ten minutes of preparation at home avoids nearly all of
          them, and choosing how you hand the file over decides who keeps a copy afterwards.
        </p>

        <h2>Prepare the file</h2>
        <h3>Send a PDF, not the editable file</h3>
        <p>
          A Word document or a spreadsheet can reflow on the shop&apos;s computer: different fonts, a different default printer
          and different margins all move things around. A PDF looks the same everywhere. In Microsoft Office you can save a copy
          as PDF, and Word offers an archiving format (PDF/A) aimed at keeping the document&apos;s appearance consistent on
          other computers (<Ext href={SRC.msSavePdf.href}>Microsoft: save as PDF</Ext>). In Google Docs, the Download option
          in the File menu includes PDF (<Ext href={SRC.googleDocsDownload.href}>Google Docs Help</Ext>).
        </p>
        <h3>Check what the printer will see</h3>
        <ul>
          <li>
            <strong>Page size:</strong> A4 and US Letter are close but not identical, and the difference cuts off footers or adds
            white margins. Set the size the shop will print on.
          </li>
          <li>
            <strong>Orientation:</strong> open the PDF and scroll through every page. Landscape pages inside a portrait document
            are easy to miss.
          </li>
          <li>
            <strong>Fonts and images:</strong> zoom in on text and photos in the PDF. Blurry images at 200% will be blurry on
            paper; replace them with the original photo rather than a screenshot.
          </li>
          <li>
            <strong>Colour or black and white:</strong> colour printing usually costs more per page. If you want black and
            white, look at a greyscale preview first: light-coloured text and coloured charts can become unreadable grey.
          </li>
          <li>
            <strong>Page count:</strong> note how many pages the PDF has, so you can check the bill and the stack of paper.
          </li>
        </ul>
        <p>
          Name the file so staff can find it: &ldquo;Surname - visa form - 3 pages - colour.pdf&rdquo; beats
          &ldquo;scan0007.pdf&rdquo;.
        </p>

        <h2>Two errors that waste paper</h2>
        <ul>
          <li>
            <strong>Edges cut off:</strong> most office printers can&apos;t print right up to the edge of the paper. Keep text and
            logos a little away from the edges, or ask whether the shop can print &ldquo;borderless&rdquo; or trim the page.
          </li>
          <li>
            <strong>Filled-in form prints blank:</strong> some PDF forms keep your answers in fields that not every program
            prints. Open the finished PDF in a different viewer before you go; if your answers are missing, save or print it to
            a new PDF so they become part of the page.
          </li>
        </ul>

        <h2>Ways to hand it over</h2>
        <ul>
          <li>
            <strong>Email to the shop:</strong> simple, but your document then lives in their inbox for as long as they keep it.
          </li>
          <li>
            <strong>A share link</strong> from your cloud drive: you can switch the link off once it has printed.
          </li>
          <li>
            <strong>A messaging app</strong> to the shop&apos;s number: convenient, and it also leaves a copy on their phone.
          </li>
          <li>
            <strong>USB stick:</strong> no internet needed, but shop computers are a common source of viruses, so scan the stick
            when you get home.
          </li>
          <li>
            <strong>A temporary share code:</strong> you create a clip on your phone, read the code to the staff, and they
            download the file on their computer. Nothing lands in an inbox, and the clip expires after {minutes}. It holds one
            file of up to {f.maxFileMb} MB.
          </li>
        </ul>
        <p>
          If you have to use the shop&apos;s own computer to download or sign in, follow the steps in{" "}
          <Link href="/guides/use-a-shared-computer-safely">using a shared or public computer safely</Link>.
        </p>

        <h2>What to ask the shop</h2>
        <ol>
          <li>&ldquo;Can I see a preview before you print the whole thing?&rdquo; One test page is cheaper than a reprint.</li>
          <li>&ldquo;Is this printing at actual size?&rdquo; &ldquo;Fit to page&rdquo; shrinks forms and can break their layout.</li>
          <li>&ldquo;Please delete my file from your computer, inbox and downloads when we&apos;re done.&rdquo;</li>
        </ol>
        <p>
          The last request is the one people forget. A shop that prints passport forms and bank letters all day sees a lot of
          personal data; asking politely is normal, and good shops do it anyway.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Print jobs bigger than {f.maxFileMb} MB</strong>, such as high-resolution posters or long brochures: use a
          share link or a USB stick.
        </li>
        <li>
          <strong>Documents the shop needs to keep</strong>, for example for a reprint next week: the clip is gone after{" "}
          {minutes}.
        </li>
        <li>
          <strong>Several separate files:</strong> one file per clip. Combine them into one PDF first, or use a share link.
        </li>
        <li>
          <strong>Identity documents and bank statements:</strong> {CLAIMS.encryption} Use the shop&apos;s own secure upload if it
          has one, or a USB stick.
        </li>
      </ul>
    ),
    sources: [SRC.msSavePdf, SRC.googleDocsDownload],
  };
}

// ---------------------------------------------------------------------------
// 9. Share files in a classroom
// ---------------------------------------------------------------------------

function classroom(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A worksheet for thirty students, a project file passed between a group, a slide deck a guest speaker forgot to send:
          classrooms share files constantly, and the quickest method is not always the right one. The deciding question is
          rarely speed. It is whose data is in the file and whether the school expects it to live on its own systems.
        </p>

        <h2>Use the school platform for anything that belongs to the course</h2>
        <p>
          If your school uses a learning platform such as Google Classroom or Microsoft Teams, that is where coursework, marks and
          anything with students&apos; names should go. The school controls who can see it, and it is still there next week.
          In Google Classroom, for example, a teacher can post materials to the Classwork page for a whole class or for chosen
          students (<Ext href={SRC.classroomMaterials.href}>Classroom Help</Ext>). Google notes that Drive files attached this
          way are view-only for students unless the teacher chooses otherwise for an assignment, such as giving each student
          their own copy (<Ext href={SRC.classroomAttachments.href}>how attachments are shared</Ext>).
        </p>

        <h2>Email: for one-to-one, not for the whole class</h2>
        <p>
          Email works for sending one parent a letter or one student their feedback. For a group, it scatters copies across
          many inboxes, makes it easy to reply-all by accident, and exposes every address in the recipient list unless you use
          BCC. Use your school email account, not a personal one, so the message stays within the school&apos;s records.
        </p>

        <h2>A quick temporary share: only for harmless, public material</h2>
        <p>
          Sometimes you just need a file on the projector computer now: a public video link, a blank template, a reading list.
          A temporary share code is handy here because nobody has to sign in on the classroom PC. Write the code on the board,
          open it, and it disappears {minutes} later.
        </p>
        <p>
          Keep this to material you&apos;d be comfortable pinning on a noticeboard. {CLAIMS.encryption} So never use it for
          student work, marks, attendance lists, photos of students, medical or support information, or anything with names
          and contact details.
        </p>

        <h2>For students sharing with each other</h2>
        <ul>
          <li>
            For group projects, use a shared folder or document on the school platform, so the work stays with the class and
            the teacher can see who contributed.
          </li>
          <li>Never share your school login with a classmate to &ldquo;just grab a file&rdquo;; ask them to share it with you instead.</li>
          <li>
            Before sending a file to a group, check it doesn&apos;t contain someone else&apos;s photo or contact details they
            haven&apos;t agreed to share.
          </li>
        </ul>

        <h2>Student privacy and age-appropriate use</h2>
        <ul>
          <li>
            <strong>Follow your school&apos;s policy first.</strong> Many schools approve a short list of tools, especially for
            younger students. If a tool isn&apos;t on the list, ask before using it with a class.
          </li>
          <li>
            <strong>Don&apos;t ask students to use outside services</strong> that need accounts or collect personal data without
            the school&apos;s and, where required, parents&apos; agreement.
          </li>
          <li>
            <strong>Watch file names and metadata.</strong> A file called &ldquo;Year 9 - support needs.xlsx&rdquo; reveals
            something even before it is opened; documents can also carry the author&apos;s name in their properties.
          </li>
          <li>
            <strong>Projectors are public.</strong> Close email and notifications before you share your screen to fetch a file.
          </li>
        </ul>

        <h2>Checklist for sharing a file with a group</h2>
        <ol>
          <li>Does this file contain anything personal about a student or a colleague? If yes, school platform only.</li>
          <li>Should it still be available next week? If yes, a platform or a shared folder, not a temporary share.</li>
          <li>Can every recipient open the format? A PDF is safer than an editable file for handouts.</li>
          <li>Is the file small enough for the method you picked?</li>
          <li>After the lesson, delete downloaded copies from the classroom computer.</li>
        </ol>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Anything with student data:</strong> names, marks, photos, attendance or support information belong on the
          school&apos;s own platform.
        </li>
        <li>
          <strong>Coursework and handouts students need later:</strong> a clip disappears after {minutes}.
        </li>
        <li>
          <strong>Sending to the whole class at once:</strong> everyone would need the same code, which is effectively public.
          A class post on the platform is cleaner.
        </li>
        <li>
          <strong>Schools where outside tools aren&apos;t approved:</strong> follow the school&apos;s rules, even for harmless
          files.
        </li>
      </ul>
    ),
    sources: [SRC.classroomMaterials, SRC.classroomAttachments],
  };
}

// ---------------------------------------------------------------------------
// 10. Move code snippets, logs or config text from phone to computer
// ---------------------------------------------------------------------------

function codeSnippets(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Prose survives being copied between devices; code often doesn&apos;t. A YAML file loses one level of indentation, a
          shell command gains a curly quote, a JSON log gets cut in half, and suddenly nothing parses. This guide is about the
          developer-specific problems. For the general ways to get text from a phone to a computer, see{" "}
          <Link href="/guides/copy-paste-text-between-phone-and-computer">copying text between phone and computer</Link>.
        </p>

        <h2>The usual ways code gets damaged</h2>
        <h3>Smart quotes and dashes</h3>
        <p>
          Phone keyboards &ldquo;helpfully&rdquo; turn straight quotes into curly ones and double hyphens into dashes. That
          breaks strings, flags like <code>--force</code> and most config formats. On an iPhone, the setting is called Smart
          Punctuation and lives in the keyboard settings (<Ext href={SRC.appleKeyboard.href}>Apple: iPhone keyboard</Ext>). On
          Android with Gboard, auto-correction and related options are under text correction in Gboard&apos;s settings (
          <Ext href={SRC.gboardCorrections.href}>Gboard Help</Ext>). Turning them off only affects what you type from now on;
          text that was already converted stays converted.
        </p>
        <h3>Auto-correct and auto-capitalisation</h3>
        <p>
          Typing code on a phone keyboard is risky in itself: variable names get &ldquo;corrected&rdquo;, the first letter of a
          command gets capitalised. Copy code from its source rather than retyping it, and paste it into a field that doesn&apos;t
          reformat text.
        </p>
        <h3>Indentation and line endings</h3>
        <p>
          Chat apps and some note apps trim leading spaces or merge lines. Windows also uses a different line ending (CRLF) from
          macOS, Linux and phones (LF); when text is pasted on Windows it often arrives with CRLF endings. Most editors handle
          both, but shell scripts and some diff tools don&apos;t. If a script fails with odd errors after the transfer, convert
          the line endings in your editor.
        </p>

        <h2>A method that keeps text exactly</h2>
        <ol>
          <li>On the phone, copy the snippet from where it lives (the app, the log viewer, the documentation).</li>
          <li>
            Paste it into <Link href="/">Online Clipboard</Link> and create a clip. Line breaks, tabs and spaces are stored as
            they are, and the text is shown in a monospace font on the receiving side.
          </li>
          <li>On the computer, enter the code and use the Copy text button rather than selecting the text by hand.</li>
          <li>Paste it into your editor and check it. For anything longer than a few lines, compare it with a diff.</li>
        </ol>
        <p>
          A clip takes up to {fmt(f.maxTextLength)} characters of text and expires after {minutes}. For a one-off, nothing has
          to be installed or signed in to on either side.
        </p>

        <h2>Check that it arrived intact</h2>
        <p>
          For a short snippet, a glance is enough. For a config file or a long script, compare it properly: count the lines on
          both sides, or compare a checksum of the file. <code>sha256sum file</code> on Linux, <code>shasum -a 256 file</code>{" "}
          on macOS and <code>Get-FileHash file</code> in Windows PowerShell all print a SHA-256 hash; if the hashes match, the
          bytes match. Different line endings change the hash, so normalise them first if you compare across systems.
        </p>

        <h2>Large logs</h2>
        <ul>
          <li>Trim first: the last few hundred lines around the error are usually all anyone needs.</li>
          <li>
            For a full log, send it as a file rather than pasted text. Compress it into a ZIP; text logs shrink well, unlike
            photos or videos. A clip takes one file of up to {f.maxFileMb} MB.
          </li>
          <li>Logs from phones are often noisy. Search for the error timestamp before sharing everything.</li>
        </ul>

        <h2>Never send secrets through any online clipboard</h2>
        <p>
          API keys, access tokens, passwords, private keys, <code>.env</code> files, database connection strings and session
          cookies must never go through an online clipboard, ours included. {CLAIMS.encryption} Logs are the sneaky case: they
          often contain tokens, internal URLs or customers&apos; email addresses. Redact them before sending, and if a secret slips
          through, rotate it rather than hoping nobody saw it.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Secrets of any kind</strong>: use your password manager or your platform&apos;s secret store, and rotate
          anything that leaked.
        </li>
        <li>
          <strong>Code you want to keep or share with a team:</strong> commit it to your repository or a private gist; a clip
          is gone after {minutes}.
        </li>
        <li>
          <strong>Logs bigger than {f.maxFileMb} MB even after zipping:</strong> attach them to the issue tracker or upload
          them to your team&apos;s storage.
        </li>
        <li>
          <strong>Customer data in logs</strong>: anonymise first, or keep the log inside your company&apos;s systems.
        </li>
      </ul>
    ),
    sources: [SRC.appleKeyboard, SRC.gboardCorrections],
  };
}

// ---------------------------------------------------------------------------
// 11. Online clipboard vs emailing yourself vs messaging apps
// ---------------------------------------------------------------------------

function comparison(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          Getting something from one device to another is a daily chore, and most people default to whatever they used last
          time. Each option makes different trade-offs. This comparison is meant to help you pick, including the cases where an
          online clipboard such as this site is the weaker choice.
        </p>

        <h2>The short comparison</h2>
        <ul>
          <li>
            <strong>Speed for a one-off:</strong> an online clipboard or a self-chat in a messenger you&apos;re already signed in
            to. Email is a little slower but always works.
          </li>
          <li>
            <strong>Privacy of the content:</strong> a messenger with end-to-end encryption wins. Email and online clipboards
            store your content on the provider&apos;s servers in a form the provider can access.
          </li>
          <li>
            <strong>Finding it again later:</strong> email and messengers keep searchable history. An online clipboard
            deliberately doesn&apos;t.
          </li>
          <li>
            <strong>Accounts:</strong> email and messengers need you to be signed in on both devices. An online clipboard needs
            no account anywhere.
          </li>
          <li>
            <strong>Cleanup:</strong> with email and chats, copies stay until you delete them. An online clipboard cleans up by
            itself.
          </li>
        </ul>

        <h2>Emailing yourself</h2>
        <p>
          <strong>Good:</strong> works on every device, keeps a permanent and searchable record, and handles attachments.{" "}
          <strong>Less good:</strong> you have to sign in to your mailbox on the receiving device, which is a real risk on a
          shared computer, and attachments are capped; Gmail&apos;s limit for personal accounts is 25 MB at the time of writing (
          <Ext href={SRC.gmailAttachments.href}>Gmail Help</Ext>). Ordinary email is not end-to-end encrypted, and your inbox
          slowly fills with &ldquo;note to self&rdquo; messages.
        </p>

        <h2>Messaging apps</h2>
        <p>
          <strong>Good:</strong> fast if the app is already on both devices, and some offer strong privacy. WhatsApp says chats
          with yourself are end-to-end encrypted (<Ext href={SRC.whatsappSelf.href}>WhatsApp Help</Ext>).{" "}
          <strong>Less good:</strong> not every app works the same way. Telegram, for example, says its regular cloud chats are
          not end-to-end encrypted; only its secret chats are, and those stay on one device (
          <Ext href={SRC.telegramFaq.href}>Telegram FAQ</Ext>). Using a messenger on a computer usually means linking the
          desktop or web version to your phone, which you shouldn&apos;t do on a computer you don&apos;t own.
        </p>

        <h2>An online clipboard</h2>
        <p>
          <strong>Good:</strong> no app, no sign-in on either device, and nothing left in an inbox or chat history. The clip and
          its file are deleted {minutes} after creation. It holds up to {fmt(f.maxTextLength)} characters of text and one file
          of up to {f.maxFileMb} MB.
        </p>
        <p>
          <strong>Less good:</strong> {CLAIMS.encryption} Anyone with the code can open the clip until it expires. There is no
          history to search, no way to delete a clip early, and the file size limit is modest.
        </p>

        <h2>Cleaning up afterwards</h2>
        <ul>
          <li>
            <strong>Email:</strong> delete the message, then empty the bin or trash folder; deleted mail usually sits there for a
            while before it is gone for good. Copies may still exist on the other device if it downloaded the message.
          </li>
          <li>
            <strong>Messengers:</strong> delete the message in the chat with yourself. Linked desktop or web sessions you no
            longer need should be logged out from the app&apos;s linked-devices list.
          </li>
          <li>
            <strong>Online clipboard:</strong> the clip removes itself, but the downloaded file is still on the receiving
            computer. Delete it there, especially on a shared machine.
          </li>
        </ul>

        <h2>When an online clipboard is the worse choice</h2>
        <p>
          It is the wrong tool whenever privacy or permanence matters more than convenience. A private message to someone,
          anything you&apos;ll want to find next month, a file larger than {f.maxFileMb} MB, or something you might want to take
          back: an end-to-end encrypted messenger, email or a cloud drive handles each of those better.
        </p>

        <h2>A rule of thumb: three questions</h2>
        <ol>
          <li>
            Is it sensitive? Then use an end-to-end encrypted messenger, never a clipboard site, and stop here.
          </li>
          <li>
            Will you want it again later? Then email it to yourself or save it in a notes app or cloud drive.
          </li>
          <li>
            Are both devices yours and already signed in? Use the messenger or email you have. If one device isn&apos;t yours
            or you won&apos;t use it again, an online clipboard avoids signing in there.
          </li>
        </ol>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Private conversations:</strong> an end-to-end encrypted messenger protects content far better.
        </li>
        <li>
          <strong>Notes and files you&apos;ll need again:</strong> email or a notes app keeps them; a clip is gone after{" "}
          {minutes}.
        </li>
        <li>
          <strong>Regular transfers between your own devices:</strong> the messenger or email you&apos;re already signed in to
          is one step shorter.
        </li>
        <li>
          <strong>Files over {f.maxFileMb} MB:</strong> use a cloud drive share link.
        </li>
      </ul>
    ),
    sources: [SRC.gmailAttachments, SRC.whatsappSelf, SRC.telegramFaq],
  };
}

// ---------------------------------------------------------------------------
// 12. What is an online clipboard and how does it work?
// ---------------------------------------------------------------------------

function whatIsIt(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          &ldquo;Clipboard&rdquo; is one of those computer words everyone uses and few people think about. Understanding what
          your device&apos;s clipboard really is makes it much clearer what an online clipboard can and can&apos;t do for you.
        </p>

        <h2>The clipboard on your device</h2>
        <p>
          When you press copy, your operating system puts the selected text, image or file reference into a holding area in
          memory. Paste reads it back. Traditionally the clipboard holds one item at a time and belongs to that single device:
          copy something new and the old item is gone; switch devices and it isn&apos;t there.
        </p>
        <p>
          Modern systems stretch this a little. Windows can keep a clipboard history you open with Windows key + V, and can sync
          copied text between your own devices when you sign in with the same account (
          <Ext href={SRC.windowsClipboard.href}>Microsoft: using the clipboard</Ext>). Apple&apos;s Universal Clipboard shares
          copies between nearby Apple devices on the same Apple Account (
          <Ext href={SRC.universalClipboard.href}>Apple: Universal Clipboard</Ext>). These work only within one company&apos;s
          ecosystem and only for devices signed in as you.
        </p>

        <h2>What makes a clipboard &ldquo;online&rdquo;</h2>
        <p>
          An online clipboard puts the holding area on a server instead of in your device&apos;s memory. Instead of an account
          linking your devices, a short code links the person who stores something with the person who fetches it. That is why
          it works between any two devices with a browser, including ones that aren&apos;t yours.
        </p>

        <h2>How it works, step by step</h2>
        <ol>
          <li>You paste text or choose a file in the web page. It is sent to the server over HTTPS.</li>
          <li>
            The server stores it and gives it a short code. Here that is 6 random digits, picked so that no two live clips share
            a code.
          </li>
          <li>On another device, someone enters the code. The server checks that it exists and hasn&apos;t expired.</li>
          <li>If it matches, the server sends back the text, or a short-lived link to download the file.</li>
          <li>
            When the time is up, the code stops working, and {CLAIMS.deletion}.
          </li>
        </ol>

        <h2>What the code does, and doesn&apos;t, do</h2>
        <p>
          The code is the only key. There is no password and no list of allowed people, so anyone holding the code can open the
          clip, as many times as they like, until it expires. That makes sharing effortless and is exactly why codes should only
          be given to the intended person. Six digits give a million possibilities; to make guessing slow, this site pauses
          lookups for up to {plural(f.rateWindowMinutes, "minute", "minutes")} after {plural(f.lookupFailures, "wrong code", "wrong codes")}{" "}
          from the same connection.
        </p>

        <h2>Why clips expire</h2>
        <p>
          Expiry is a safety feature, not a limitation. A clip that disappears after {minutes} can&apos;t be found next week by
          someone who stumbled on an old code, and the service doesn&apos;t become an accidental archive of everyone&apos;s
          documents. The trade-off is that an online clipboard is a hand-off, not storage.
        </p>

        <h2>Common misunderstandings</h2>
        <ul>
          <li>
            <strong>&ldquo;It&apos;s like a cloud drive.&rdquo;</strong> No: there are no folders, no account and no way to come
            back to your files later.
          </li>
          <li>
            <strong>&ldquo;The code is my password.&rdquo;</strong> You don&apos;t choose it and can&apos;t change it; it is closer
            to a ticket number that anyone holding it can use.
          </li>
          <li>
            <strong>&ldquo;It vanishes once the other person reads it.&rdquo;</strong> Here it doesn&apos;t. Opening a clip leaves
            it in place until it expires; some other services work differently, so check before relying on that.
          </li>
        </ul>

        <h2>What it is good and not good for</h2>
        <p>
          It shines for small, short-lived, low-risk hand-offs: a link onto a borrowed laptop, a file onto a print-shop computer,
          a paragraph from phone to PC. It is the wrong place for anything secret, because {CLAIMS.encryption.charAt(0).toLowerCase()}
          {CLAIMS.encryption.slice(1)} It is also the wrong place for anything you want to keep. If you want to see it in action,
          the <Link href="/">Online Clipboard home page</Link> has the tool and a short FAQ.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Your own devices on one account:</strong> the built-in clipboard sync (Windows clipboard history, Universal
          Clipboard) is quicker once set up.
        </li>
        <li>
          <strong>Storing anything:</strong> clips are designed to vanish after {minutes}.
        </li>
        <li>
          <strong>Secrets:</strong> a code is a key anyone can use; keep passwords and keys in a password manager.
        </li>
        <li>
          <strong>Many files or big ones:</strong> one file per clip, up to {f.maxFileMb} MB.
        </li>
      </ul>
    ),
    sources: [SRC.windowsClipboard, SRC.universalClipboard],
  };
}

export const GUIDE_BODIES: Record<string, (f: SiteFacts) => GuideBody> = {
  "send-a-document-to-a-print-shop": printShop,
  "share-files-in-a-classroom": classroom,
  "send-code-snippets-from-phone-to-computer": codeSnippets,
  "online-clipboard-vs-email-yourself": comparison,
  "what-is-an-online-clipboard": whatIsIt,
  "send-files-too-big-for-email": tooBigForEmail,
  "use-a-shared-computer-safely": sharedComputer,
  "transfer-photos-from-iphone-to-windows-pc": iphonePhotosToWindows,
  "transfer-photos-from-android-to-computer": androidPhotosToComputer,
  "copy-paste-text-between-phone-and-computer": copyPasteText,
  "send-file-from-phone-to-pc-without-cable": sendFileWithoutCable,
  "is-an-online-clipboard-safe": isItSafe,
};
