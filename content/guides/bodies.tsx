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
import { fmt, plural, type SiteFacts } from "@/lib/facts";

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
            It is stored on our servers <strong>in a readable form</strong>. It is <strong>not end-to-end encrypted</strong>:
            the service itself could read it, and so could anyone who got into the servers.
          </li>
          <li>Anyone who enters the code or opens the link gets the clip, as many times as they like, until it expires.</li>
          <li>{`After ${minutes}`} the code stops working and a clean-up job deletes the text and file, usually within minutes.</li>
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
            <strong>Little data about you.</strong> No accounts, cookies or analytics. For rate limiting only a hashed form of
            your IP address is kept, for about {plural(f.rateLimitRetentionHours, "hour", "hours")}.
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

export const GUIDE_BODIES: Record<string, (f: SiteFacts) => GuideBody> = {
  "copy-paste-text-between-phone-and-computer": copyPasteText,
  "send-file-from-phone-to-pc-without-cable": sendFileWithoutCable,
  "is-an-online-clipboard-safe": isItSafe,
};
