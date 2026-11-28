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
import { SITE_NAME } from "@/lib/site";

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
  // --- added in batch 1 of new guides (checked 2026-11-28) ---
  previewConvert: {
    title: "Apple: Convert image file types using Preview on Mac",
    href: "https://support.apple.com/en-us/guide/preview/prvw1012/mac",
  },
  finderQuickActions: {
    title: "Apple: Perform quick actions in the Finder on Mac",
    href: "https://support.apple.com/en-us/guide/mac-help/mchl97ff9142/mac",
  },
  photosMacExport: {
    title: "Apple: Export photos, videos, slideshows, and memories on Mac",
    href: "https://support.apple.com/en-us/guide/photos/pht6e157c5f/mac",
  },
  appleSharePhotos: {
    title: "Apple: Share photos and videos on iPhone",
    href: "https://support.apple.com/en-us/guide/iphone/iphf28f17237/ios",
  },
  quickSharePixel: {
    title: "Pixel Phone Help: Use Quick Share on your Android device",
    href: "https://support.google.com/pixelphone/answer/9286773",
  },
  airdropIphone: { title: "Apple: How to use AirDrop on your iPhone or iPad", href: "https://support.apple.com/en-us/119857" },
  rcsIphone: { title: "Apple: Turn on RCS messaging on your iPhone", href: "https://support.apple.com/en-us/122195" },
  rcsGoogle: { title: "Google Messages Help: RCS chats by Google FAQ", href: "https://support.google.com/messages/answer/9487020" },
  whatsappMedia: {
    title: "WhatsApp Help Center: How to send media, contacts, or location",
    href: "https://faq.whatsapp.com/453914586839706/",
  },
  driveUploadIos: {
    title: "Google Drive Help: Upload files & folders to Google Drive (iPhone & iPad)",
    href: "https://support.google.com/drive/answer/2424368?co=GENIE.Platform%3DiOS",
  },
  driveShareIos: {
    title: "Google Drive Help: Share and manage access to files and folders (iPhone & iPad)",
    href: "https://support.google.com/drive/answer/2494822?co=GENIE.Platform%3DiOS",
  },
  photosShare: {
    title: "Google Photos Help: Share photos & videos (iPhone & iPad)",
    href: "https://support.google.com/photos/answer/6131416?co=GENIE.Platform%3DiOS",
  },
  moveToIos: { title: "Apple: Move from Android to iPhone or iPad", href: "https://support.apple.com/en-us/118670" },
  switchToAndroid: {
    title: "Android Help: Copy apps & data from an iPhone or iPad to a new Android device",
    href: "https://support.google.com/android/answer/13626960",
  },
  phoneLinkStart: {
    title: "Microsoft: Mobile device in Start menu",
    href: "https://support.microsoft.com/en-us/windows/apps/phonelink/mobile-device-in-start-menu",
  },
  icloudDrive: { title: "Apple: Set up iCloud Drive", href: "https://support.apple.com/en-us/118443" },
  airdropMac: {
    title: "Apple: Use AirDrop to send items to nearby Apple devices (Mac)",
    href: "https://support.apple.com/guide/mac-help/use-airdrop-to-send-items-to-nearby-devices-mh35868/mac",
  },
  driveUploadDesktop: {
    title: "Google Drive Help: Upload files & folders to Google Drive (computer)",
    href: "https://support.google.com/drive/answer/2424368?co=GENIE.Platform%3DDesktop",
  },
  oneDriveMobile: {
    title: "Microsoft: Use OneDrive on Android and iOS devices",
    href: "https://support.microsoft.com/en-us/onedrive/use-onedrive-on-android-and-ios-devices",
  },
  nearbySharing: {
    title: "Microsoft: Share things with nearby devices in Windows",
    href: "https://support.microsoft.com/en-us/windows/experience/connectivity-networking/share-things-with-nearby-devices-in-windows",
  },
  appleScanDocs: { title: "Apple: How to scan documents on your iPhone or iPad", href: "https://support.apple.com/en-us/108963" },
  notesPdfs: {
    title: "Apple: Work with PDFs in Notes on iPhone",
    href: "https://support.apple.com/guide/iphone/work-with-pdfs-iph8958dd125/ios",
  },
  appleMarkup: { title: "Apple: Use Markup on your iPhone, iPad, or iPod touch", href: "https://support.apple.com/en-us/119875" },
  driveScan: { title: "Google Drive Help: Scan documents with Google Drive", href: "https://support.google.com/drive/answer/3145835" },
  filesScan: {
    title: "Files by Google Help: How to scan documents with Files by Google",
    href: "https://support.google.com/files/answer/15598575",
  },
  // --- added in batch 2 of new guides (checked 2026-11-28) ---
  macShareWithWindows: {
    title: "Apple: Share Mac files with Windows users",
    href: "https://support.apple.com/en-us/guide/mac-help/mchlp1657/mac",
  },
  windowsToMac: {
    title: "Apple: Connect to a Mac from a Windows computer",
    href: "https://support.apple.com/en-us/guide/mac-help/mchlp1658/mac",
  },
  macToWindows: {
    title: "Apple: Connect to a Windows computer from a Mac",
    href: "https://support.apple.com/en-us/guide/mac-help/mchlp1660/mac",
  },
  msFileSharing: {
    title: "Microsoft: File sharing over a network in Windows",
    href: "https://support.microsoft.com/en-us/windows/experience/connectivity-networking/file-sharing-over-a-network-in-windows",
  },
  diskFormats: {
    title: "Apple: File system formats available in Disk Utility on Mac",
    href: "https://support.apple.com/en-us/guide/disk-utility/dsku19ed921c/mac",
  },
  macExternalDrive: { title: "Apple: If your Mac can't save files to an external drive", href: "https://support.apple.com/en-us/101830" },
  diskErase: {
    title: "Apple: Erase and reformat a storage device in Disk Utility on Mac",
    href: "https://support.apple.com/en-us/guide/disk-utility/dskutl14079/mac",
  },
  oneDriveSync: {
    title: "Microsoft: Sync your computer's files and folders with OneDrive",
    href: "https://support.microsoft.com/en-us/onedrive/sync-your-computer-s-files-and-folders-with-onedrive",
  },
  appleShareWifi: {
    title: "Apple: How to share your Wi-Fi password from your iPhone or iPad",
    href: "https://support.apple.com/en-us/102635",
  },
  macShareWifi: { title: "Apple: Share a Wi-Fi password on Mac", href: "https://support.apple.com/en-us/guide/mac-help/mchlp1179/mac" },
  iphoneFindWifi: {
    title: "Apple: Find and share your Wi-Fi password on iPhone",
    href: "https://support.apple.com/en-us/guide/iphone/iph96e6aa9bb/ios",
  },
  iphoneSavedWifi: { title: "Apple: Find your saved Wi-Fi passwords on iPhone or iPad", href: "https://support.apple.com/en-us/104961" },
  appleQr: { title: "Apple: Scan a QR code with your iPhone or iPad", href: "https://support.apple.com/en-us/102680" },
  androidWifi: {
    title: "Android Help: Connect to Wi-Fi networks on your Android device",
    href: "https://support.google.com/android/answer/9075847",
  },
  pixelWifi: {
    title: "Pixel Phone Help: Connect to Wi-Fi networks on your Pixel phone",
    href: "https://support.google.com/pixelphone/answer/2819519",
  },
  pixelQr: { title: "Pixel Camera Help: Scan QR codes with your Pixel phone", href: "https://support.google.com/pixelcamera/answer/16561572" },
  nestGuestNetwork: {
    title: "Google Home and Nest Help: Create, edit & share a Guest Wi-Fi network",
    href: "https://support.google.com/googlehome/answer/6327302",
  },
  nestChangePassword: {
    title: "Google Home and Nest Help: Change Wi-Fi password",
    href: "https://support.google.com/googlehome/answer/6273434",
  },
  whatsappHd: { title: "WhatsApp Help Center: About HD photos and videos", href: "https://faq.whatsapp.com/759301289012856/" },
  googleMessagesMedia: {
    title: "Google Messages Help: Send photos, videos, or voice messages",
    href: "https://support.google.com/messages/answer/6159880",
  },
  appleMessagesTrouble: {
    title: "Apple: If you can't send or receive messages on your iPhone or iPad",
    href: "https://support.apple.com/en-us/118433",
  },
  sharedAlbumsLimits: { title: "Apple: Shared Albums limits", href: "https://support.apple.com/en-us/148868" },
  googlePhotosQuality: {
    title: "Google Photos Help: Choose the backup quality of your photos & videos",
    href: "https://support.google.com/photos/answer/6220791",
  },
  msZip: {
    title: "Microsoft: Zip and unzip files",
    href: "https://support.microsoft.com/en-us/windows/zip-and-unzip-files-8d28fa72-f2f9-712f-67df-f80cf89fd4e5",
  },
  macZip: {
    title: "Apple: Zip and unzip files and folders on Mac",
    href: "https://support.apple.com/guide/mac-help/compress-uncompress-files-folders-mac-mchlp2528/mac",
  },
  iphoneZip: {
    title: "Apple: Create or open ZIP files on your iPhone, iPad, or Apple Vision Pro",
    href: "https://support.apple.com/en-us/102532",
  },
  iphoneFilesOrganize: {
    title: "Apple: Organize files and folders in Files on iPhone",
    href: "https://support.apple.com/guide/iphone/organize-files-and-folders-iphab82e0798/ios",
  },
  filesUnzip: { title: "Files by Google Help: Unzip your files", href: "https://support.google.com/files/answer/9048509" },
  filesCompress: { title: "Files by Google Help: Compress your files", href: "https://support.google.com/files/answer/15679548" },
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
          and on whether you do this every day or once in a while. Moving text between two phones, one Android and one
          iPhone, is covered in{" "}
          <Link href="/guides/send-files-between-android-and-iphone">sending files and text between Android and iPhone</Link>.
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
          <li>On your phone, open <Link href="/">{SITE_NAME}</Link> and paste the text into the Send box.</li>
          <li>Tap &ldquo;Send&rdquo;. You get a 6-digit code and a link.</li>
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
          for a photo, a PDF or a short video. Which one fits depends on your phone, your PC and how big the file is. Going the
          other way, from a computer to a phone, has its own guide:{" "}
          <Link href="/guides/send-files-from-pc-to-phone">sending files from a PC to your phone</Link>.
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
          <li>On your phone, open <Link href="/">{SITE_NAME}</Link>, choose the file and tap &ldquo;Send&rdquo;.</li>
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
          <li>
            Wi-Fi passwords: share them from your phone instead (see{" "}
            <Link href="/guides/share-wifi-password-from-phone">sharing a Wi-Fi password</Link>).
          </li>
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
            or PDFs, which are already compressed. Don&apos;t expect a ZIP to get a 60 MB video under a 25 MB limit. How to
            create one on each device is in our <Link href="/guides/zip-and-unzip-files">guide to zipping and unzipping files</Link>.
          </li>
        </ul>

        <h2>Where a temporary file-sharing site fits</h2>
        <p>
          {SITE_NAME} is not a large-file service. It takes one file of up to {f.maxFileMb} MB, and the file is deleted{" "}
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

        <h2>Where {SITE_NAME} fits</h2>
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
        <p>
          Already have a folder of HEIC files? Our guide to{" "}
          <Link href="/guides/convert-heic-to-jpg">converting HEIC photos to JPG</Link> covers Mac, iPhone and Windows.
        </p>

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
          For a single photo, a cable is overkill. You can email it to yourself, or use {SITE_NAME}: choose the photo on
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
          in the File menu includes PDF (<Ext href={SRC.googleDocsDownload.href}>Google Docs Help</Ext>). Only have the paper
          original? You can{" "}
          <Link href="/guides/scan-document-to-pdf-with-phone">scan it to a PDF with your phone</Link> first.
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
            Paste it into <Link href="/">{SITE_NAME}</Link> and create a clip. Line breaks, tabs and spaces are stored as
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
            For a full log, send it as a file rather than pasted text. <Link href="/guides/zip-and-unzip-files">Compress it into a ZIP</Link>; text logs shrink well, unlike
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
          the <Link href="/">{SITE_NAME} home page</Link> has the tool and a short FAQ.
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

// ---------------------------------------------------------------------------
// 13. Convert HEIC photos to JPG (Windows, Mac, iPhone)
// ---------------------------------------------------------------------------

function heicToJpg(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          You have a photo ending in .HEIC and something refuses it: an upload form, an older program, a friend&apos;s laptop.
          This guide shows how to turn those files into ordinary JPGs on a Mac and an iPhone, what Windows can and can&apos;t do
          on its own, and how to stop new photos from being saved as HEIC at all. Moving photos from an iPhone to a PC is a
          separate job, covered in{" "}
          <Link href="/guides/transfer-photos-from-iphone-to-windows-pc">transferring photos from an iPhone to a Windows PC</Link>.
        </p>

        <h2>What HEIC is, and why you only sometimes see it</h2>
        <p>
          HEIC is the file extension of HEIF, the format iPhones use by default because it keeps good quality in less space.
          Apple explains that when you share with AirDrop, Messages or email, the iPhone may send a more compatible format such as
          JPEG if the other device can&apos;t handle HEIF. That is why the same photo arrives as a JPG one day and as a HEIC the
          next. iCloud Photos keeps the original format (
          <Ext href={SRC.appleHeif.href}>Apple: HEIF and HEVC media</Ext>).
        </p>

        <h2>Which method fits?</h2>
        <ul>
          <li><strong>A few files on a Mac:</strong> Preview or the Finder&apos;s Convert Image action.</li>
          <li><strong>Photos still in the Photos library on a Mac:</strong> export them as JPEG from Photos.</li>
          <li><strong>Sending from an iPhone:</strong> choose the compatible format in the share options before you send.</li>
          <li><strong>Only a Windows PC:</strong> read the Windows section first; it is the trickiest case.</li>
        </ul>

        <h2>On a Mac</h2>
        <h3>Preview (one file or a handful)</h3>
        <ol>
          <li>Open the HEIC file in Preview.</li>
          <li>Choose File &gt; Export.</li>
          <li>Click the Format menu and choose JPEG. You can also set the quality; lower quality means a smaller file.</li>
          <li>Pick where to save the copy, then click Save. The original HEIC stays untouched.</li>
        </ol>
        <p>
          Apple&apos;s Preview guide also describes converting several images at once by opening them in one window and selecting
          them in the sidebar first (<Ext href={SRC.previewConvert.href}>Apple: convert image file types in Preview</Ext>).
        </p>
        <h3>Finder: the Convert Image quick action</h3>
        <ol>
          <li>Select one or more HEIC files in the Finder.</li>
          <li>Control-click them and choose Quick Actions, then Convert Image (on some versions it sits under More).</li>
          <li>Choose JPEG as the format, pick an image size, and confirm.</li>
        </ol>
        <p>
          Apple uses exactly this case, an iPhone .heic photo turned into a .jpeg, as its example (
          <Ext href={SRC.finderQuickActions.href}>Apple: quick actions in the Finder</Ext>). The converted copies appear next
          to the originals.
        </p>
        <h3>Photos for Mac</h3>
        <ol>
          <li>Select the photos in the Photos app.</li>
          <li>Choose File &gt; Export &gt; Export Photos (the menu shows how many you selected).</li>
          <li>Set Photo Kind to JPEG; the arrow next to it reveals quality and size options.</li>
          <li>Click Export, choose a folder, and click Export again.</li>
        </ol>
        <p>
          Avoid &ldquo;Export Unmodified Original&rdquo; for this job: it saves the file exactly as it was taken, which for an
          iPhone photo usually means HEIC again (<Ext href={SRC.photosMacExport.href}>Apple: export from Photos on Mac</Ext>).
        </p>

        <h2>On an iPhone</h2>
        <h3>Send a compatible copy</h3>
        <ol>
          <li>In the Photos app, select the photos and tap the Share button.</li>
          <li>Tap Options near the top of the share sheet.</li>
          <li>
            Choose Most Compatible, which Apple says may convert files to JPEG or MOV, then tap Close and share as usual (
            <Ext href={SRC.appleSharePhotos.href}>Apple: share photos on iPhone</Ext>).
          </li>
        </ol>
        <p>
          &ldquo;Automatic&rdquo; lets the iPhone pick a format for the destination, and &ldquo;Current&rdquo; keeps the file
          as it is. If the person on the other end keeps receiving HEIC, Most Compatible is the one to choose.
        </p>
        <h3>Take new photos as JPEG</h3>
        <p>
          In Settings, open Camera, then Formats, and choose Most Compatible. Apple says new photos and videos then use JPEG and
          H.264; to go back, choose High Efficiency. Photos already in your library stay as they are, and the new ones take up
          more storage.
        </p>
        <h3>When you copy photos to a computer</h3>
        <p>
          Apple notes that photos imported into a PC may be converted to JPEG unless you turned on Keep Originals (Settings &gt;
          Apps &gt; Photos). If your PC keeps getting HEIC files over USB, check that setting before you change anything else.
        </p>

        <h2>On Windows</h2>
        <p>
          Windows needs extra components to show HEIC at all. Microsoft points to the HEIF Image Extensions in the Microsoft
          Store, and to the HEVC Video Extensions for iPhone videos, which it lists as a paid extension (
          <Ext href={SRC.msHeifExtensions.href}>Microsoft: &ldquo;Can&apos;t view this file type&rdquo;</Ext>). Microsoft&apos;s
          own help pages don&apos;t describe a built-in way to save a HEIC as a JPG, so we won&apos;t promise one. The dependable
          routes on Windows are:
        </p>
        <ul>
          <li>Have the iPhone send or transfer a compatible copy (the iPhone section above).</li>
          <li>Convert on a Mac, if one is nearby, and copy the JPGs over.</li>
          <li>Change the camera setting so future photos never need converting.</li>
        </ul>
        <p>
          Be careful with converter websites found through search results. You upload private photos to a server you know
          nothing about. If you do use one, pick photos you would be happy
          to post publicly.
        </p>

        <h2>What changes when you convert</h2>
        <ul>
          <li>
            <strong>File size:</strong> HEIC was designed to save space, so the JPEG copy is usually bigger, sometimes much
            bigger.
          </li>
          <li>
            <strong>Live Photos:</strong> a JPEG is a still image, so only the still frame survives the conversion.
          </li>
          <li>
            <strong>Edits:</strong> exporting from Photos includes your crops and filters; the unmodified original does not.
          </li>
          <li>
            <strong>Quality:</strong> every JPEG save compresses the image again. Convert from the original HEIC once, rather than
            re-saving a JPEG several times.
          </li>
        </ul>

        <h2>Getting the converted photo to another device</h2>
        <p>
          Once you have a JPG, any method works. For one photo to a computer you don&apos;t want to sign in on, {SITE_NAME} is
          an option: upload the JPG from the phone or Mac, then enter the 6-digit code on the other device. It takes one file of
          up to {f.maxFileMb} MB, and the clip disappears after {minutes}. It sends the file exactly as it is, so convert first.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Converting itself:</strong> {SITE_NAME} doesn&apos;t change file formats. A HEIC you send arrives as a HEIC.
        </li>
        <li>
          <strong>A whole photo library:</strong> one file per clip is far too slow; export in bulk on a Mac or use a cable
          import.
        </li>
        <li>
          <strong>Personal photos you wouldn&apos;t show a stranger:</strong> clips are not end-to-end encrypted, and anyone with
          the code can open them.
        </li>
        <li>
          <strong>Keeping copies:</strong> a clip is deleted after {minutes}, so it is no substitute for a backup.
        </li>
      </ul>
    ),
    sources: [
      SRC.appleHeif,
      SRC.previewConvert,
      SRC.finderQuickActions,
      SRC.photosMacExport,
      SRC.appleSharePhotos,
      SRC.msHeifExtensions,
    ],
  };
}

// ---------------------------------------------------------------------------
// 14. Send files and text between Android and iPhone
// ---------------------------------------------------------------------------

function androidAndIphone(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          For years, Android and iPhone had no shared &ldquo;send to the phone next to me&rdquo; button, so people fell back on
          messengers and email. That is slowly changing. This guide lists what works today between the two systems, which
          option suits photos, documents or a line of text, and what to do when you are switching phones for good.
        </p>

        <h2>The short version</h2>
        <ul>
          <li><strong>Photos to a person:</strong> Messages with RCS, or a messenger you both use.</li>
          <li><strong>Files between phones in the same room:</strong> Quick Share, if the Android phone supports AirDrop.</li>
          <li><strong>Big files or albums:</strong> a link from Google Drive or Google Photos.</li>
          <li><strong>A link, address or short note:</strong> a messenger, or a short-lived clip with a code.</li>
          <li><strong>Moving everything to a new phone:</strong> the official switching tools, not file-by-file sharing.</li>
        </ul>

        <h2>Quick Share to an iPhone</h2>
        <h3>Phones that can use AirDrop</h3>
        <p>
          Google says some Android phones can now send to an iPhone through AirDrop: Pixel 8a or later, and certain models from
          Samsung, Oppo, OnePlus, Vivo, Xiaomi, Honor, Transsion and Motorola. The list changes, so check{" "}
          <Ext href={SRC.quickSharePixel.href}>Google&apos;s Quick Share page</Ext> for your model.
        </p>
        <ol>
          <li>On the iPhone, set AirDrop to receive from Everyone for 10 Minutes.</li>
          <li>On the Android phone, open the photo or file, tap Share, then Quick Share.</li>
          <li>Pick the iPhone from the list of nearby devices.</li>
          <li>On the iPhone, accept the AirDrop request.</li>
        </ol>
        <p>
          Google lists receiving from an iPhone for a narrower set of phones than sending. AirDrop&apos;s receiving settings
          are explained on <Ext href={SRC.airdropIphone.href}>Apple&apos;s AirDrop page</Ext>.
        </p>
        <h3>Other Android phones: a QR code</h3>
        <p>
          Google&apos;s Pixel help describes a second route for phones without AirDrop support: on the Quick Share screen, tap
          Use QR code and let the iPhone scan it. The iPhone then downloads the files through a link in its web browser. Google
          says the files are end-to-end encrypted, stored on Google&apos;s servers and available for 24 hours, and both phones
          need internet access. Whether your phone shows this option depends on its maker and software version.
        </p>

        <h2>Messages with RCS</h2>
        <p>
          Since iOS 18, iPhones can use RCS for chats with Android phones, which brings high-resolution photos and videos,
          typing indicators and read receipts instead of blurry picture messages. It needs a carrier that supports RCS on
          iPhone; you turn it on in Settings &gt; Apps &gt; Messages (
          <Ext href={SRC.rcsIphone.href}>Apple: RCS messaging</Ext>). Google adds that RCS with iPhone users may not be available
          in every country or with every carrier (<Ext href={SRC.rcsGoogle.href}>Google Messages Help</Ext>). For sending
          photos to a friend, this is often all you need.
        </p>

        <h2>Messengers</h2>
        <p>
          If you both use WhatsApp or another cross-platform messenger, you can send a file as a document instead of as a
          photo. WhatsApp allows documents up to 2 GB (
          <Ext href={SRC.whatsappMedia.href}>WhatsApp: send media and documents</Ext>). Between your own two phones, a chat with
          yourself works the same way, as long as the messenger is signed in on both. What chat apps do to photo quality, and
          how to avoid it, is covered in{" "}
          <Link href="/guides/send-photos-and-videos-without-losing-quality">sending photos and videos without losing quality</Link>.
        </p>

        <h2>Links from Google Drive or Google Photos</h2>
        <p>
          Google&apos;s apps run on both systems, which makes them a natural bridge. In the Drive app on an iPhone, tap the add
          button and choose File upload (
          <Ext href={SRC.driveUploadIos.href}>Drive Help: upload on iPhone</Ext>). To share it, open the file&apos;s menu,
          choose Manage access and set General access to Anyone with the link, or invite the person by email (
          <Ext href={SRC.driveShareIos.href}>Drive Help: share on iPhone</Ext>). In Google Photos, Share and then Get link creates
          an album link that opens without the app (<Ext href={SRC.photosShare.href}>Google Photos Help</Ext>). Links like these
          stay valid until you switch them off, so remember to do that once the other person has the files.
        </p>

        <h2>A line of text or one file, right now</h2>
        <p>
          For a Wi-Fi password, an address or a single PDF, signing into a cloud drive is more work than the task deserves.
          A short-lived clip works on any phone with a browser:
        </p>
        <ol>
          <li>On the first phone, open <Link href="/">{SITE_NAME}</Link>, paste the text or add the file, and tap Send.</li>
          <li>Read out or show the 6-digit code.</li>
          <li>On the second phone, open the site, choose Receive and type the code.</li>
        </ol>
        <p>
          A clip holds text and one file of up to {f.maxFileMb} MB and is deleted {minutes} after it was created. It is not
          end-to-end encrypted, so leave passwords, ID photos and anything private out of it.
        </p>

        <h2>Switching phones for good</h2>
        <p>
          Moving to a new phone is a different job: contacts, messages and the whole photo library should come along. Apple&apos;s
          Move to iOS app copies data from an Android phone while you set up the iPhone (
          <Ext href={SRC.moveToIos.href}>Apple: move from Android</Ext>). Going the other way, Google describes copying data
          from an iPhone during the Android setup, by cable or with its Android Switch app (
          <Ext href={SRC.switchToAndroid.href}>Android Help: copy from iPhone</Ext>). Google also advises turning off iMessage
          first.
        </p>

        <h2>Why not Bluetooth?</h2>
        <p>
          It is tempting to pair the two phones and send over Bluetooth, but we found no Apple or Google instructions for
          sending files between an iPhone and an Android phone that way. Expect it not to work, and use one of the options above.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Videos or folders bigger than {f.maxFileMb} MB:</strong> use a Drive or Photos link, or Quick Share.
        </li>
        <li>
          <strong>Switching to a new phone:</strong> Move to iOS and Android Switch carry far more than single files.
        </li>
        <li>
          <strong>Private photos and documents:</strong> a clip can be opened by anyone who has the code until it expires.
        </li>
        <li>
          <strong>Phones side by side with AirDrop support:</strong> Quick Share is faster and nothing is uploaded to a website.
        </li>
      </ul>
    ),
    sources: [
      SRC.quickSharePixel,
      SRC.airdropIphone,
      SRC.rcsIphone,
      SRC.rcsGoogle,
      SRC.whatsappMedia,
      SRC.driveUploadIos,
      SRC.driveShareIos,
      SRC.photosShare,
      SRC.moveToIos,
      SRC.switchToAndroid,
    ],
  };
}

// ---------------------------------------------------------------------------
// 15. Send files from a PC to your phone
// ---------------------------------------------------------------------------

function pcToPhone(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A boarding pass on the laptop that you need on your phone, a PDF to read on the train, a ringtone, a map: getting files
          from a computer onto a phone is just as common as the other direction, but the steps are different. This guide goes
          from computer to phone. For the reverse, see{" "}
          <Link href="/guides/send-file-from-phone-to-pc-without-cable">sending a file from your phone to a PC</Link>. Between
          two computers, see <Link href="/guides/move-files-between-mac-and-windows-pc">moving files between a Mac and a Windows PC</Link>.
        </p>

        <h2>Windows PC to an Android phone</h2>
        <h3>Quick Share for Windows</h3>
        <p>
          Google&apos;s Quick Share app needs a 64-bit PC with Windows 10 or later, Bluetooth and Wi-Fi turned on, and the
          phone nearby on the same network (<Ext href={SRC.quickShareWindows.href}>Google: Quick Share for Windows</Ext>).
        </p>
        <ol>
          <li>Open Quick Share on the PC (Google advises against running it as administrator).</li>
          <li>Drag the file onto its window, or use Select files. Right-clicking a file and choosing Send with Quick Share also works.</li>
          <li>Choose your phone, compare the PIN if one appears, and tap Accept on the phone.</li>
        </ol>
        <h3>USB cable</h3>
        <ol>
          <li>Unlock the phone and connect it to the PC with a USB cable that carries data.</li>
          <li>On the phone, tap the &ldquo;Charging this device via USB&rdquo; notification.</li>
          <li>Under &ldquo;Use USB for&rdquo;, choose File Transfer.</li>
          <li>A window for the phone opens on the PC. Drag the files into a folder such as Download, then eject the phone.</li>
        </ol>
        <p>
          These steps are from{" "}
          <Ext href={SRC.androidUsbTransfer.href}>Google&apos;s USB transfer page</Ext>, which also covers Chromebooks.
        </p>
        <h3>Phone Link</h3>
        <p>
          Microsoft&apos;s Phone Link lets some Android phones receive files by drag and drop: open the phone&apos;s screen in
          Phone Link and drop files onto it, and they land in the phone&apos;s Download folder. Microsoft limits this to selected
          models, mainly Samsung, and both devices must be on the same Wi-Fi (
          <Ext href={SRC.phoneLinkCopyPaste.href}>Microsoft: transfer content with Phone Link</Ext>).
        </p>
        <h3>Bluetooth</h3>
        <p>
          With the phone paired, open Settings &gt; Bluetooth &amp; devices &gt; Devices, choose &ldquo;Send or receive files via
          Bluetooth&rdquo;, then Send files, pick the phone, browse for the file and finish (
          <Ext href={SRC.bluetoothWindows.href}>Microsoft: Bluetooth file transfer</Ext>). Microsoft leaves the receiving side
          to the phone maker&apos;s instructions. It is slow, so keep it for small files when nothing else is available.
        </p>

        <h2>Windows PC to an iPhone</h2>
        <h3>iCloud Drive</h3>
        <p>
          Install iCloud for Windows from the Microsoft Store and sign in with your Apple Account. Apple&apos;s setup steps for
          the PC refer to Windows 11 or later. Files you put in the iCloud Drive folder in File Explorer appear in the Files app
          on the iPhone (<Ext href={SRC.icloudDrive.href}>Apple: set up iCloud Drive</Ext>). Free iCloud storage is limited, so
          this suits documents better than large videos.
        </p>
        <h3>Apple Devices app and a cable</h3>
        <ol>
          <li>Connect the iPhone to the PC with a USB cable and open the Apple Devices app.</li>
          <li>Click Files and choose an app on the iPhone that supports file sharing.</li>
          <li>Click Add File, select the files on the PC, and click Add.</li>
        </ol>
        <p>
          This only works with apps that support file sharing; if there is no Files section, none are installed (
          <Ext href={SRC.appleDevicesWindows.href}>Apple: share files with Apple Devices</Ext>).
        </p>
        <h3>Phone Link&apos;s Send Files</h3>
        <p>
          On Windows 11 with a recent Phone Link, Microsoft describes a Send Files option in the Start menu&apos;s mobile device
          panel that works with Android phones and iPhones (
          <Ext href={SRC.phoneLinkStart.href}>Microsoft: mobile device in Start</Ext>). It needs a Microsoft account and the
          phone already linked.
        </p>

        <h2>Mac to iPhone: AirDrop</h2>
        <ol>
          <li>Make sure the iPhone is unlocked and nearby, with Wi-Fi and Bluetooth on.</li>
          <li>On the Mac, click AirDrop in the Finder sidebar and drag the file onto the iPhone, or use the Share button and choose AirDrop.</li>
          <li>Accept on the iPhone if asked.</li>
        </ol>
        <p>
          Apple says the devices need to be within 10 metres (30 feet) of each other, and that items are accepted automatically
          when both are signed in to the same Apple Account (<Ext href={SRC.airdropMac.href}>Apple: AirDrop on Mac</Ext>).
        </p>

        <h2>Mac to an Android phone</h2>
        <p>
          This is the awkward pair. Google&apos;s USB instructions cover Windows and Chromebook, and the Quick Share computer app
          is for Windows. From a Mac, the straightforward routes are a cloud drive, email, or a temporary share code (below).
        </p>

        <h2>Any computer to any phone</h2>
        <ul>
          <li>
            <strong>A cloud drive:</strong> on drive.google.com, choose New, then File upload, and open the file in the Drive app on
            the phone (<Ext href={SRC.driveUploadDesktop.href}>Drive Help: upload from a computer</Ext>). OneDrive works the same
            way with its phone app (<Ext href={SRC.oneDriveMobile.href}>Microsoft: OneDrive on phones</Ext>).
          </li>
          <li>
            <strong>Email to yourself:</strong> fine for documents; Gmail&apos;s personal attachment limit is 25 MB and bigger
            files become Drive links (<Ext href={SRC.gmailAttachments.href}>Gmail Help</Ext>).
          </li>
          <li>
            <strong>A temporary share code:</strong> on the computer, open <Link href="/">{SITE_NAME}</Link>, add the file and
            press Send; on the phone, choose Receive and enter the 6-digit code. Nothing to sign in to, which helps on a work or
            library computer. One file of up to {f.maxFileMb} MB, gone after {minutes}.
          </li>
        </ul>
        <p>
          One thing that does <em>not</em> work: Windows&apos; Nearby sharing. Microsoft describes it for sharing between Windows
          PCs, not phones (<Ext href={SRC.nearbySharing.href}>Microsoft: Nearby sharing</Ext>).
        </p>

        <h2>Where to find the file on the phone</h2>
        <ul>
          <li><strong>Android:</strong> open the Files app and look in Downloads; Quick Share saves into its own folder there.</li>
          <li><strong>iPhone:</strong> open the Files app; iCloud Drive files and browser downloads are both reachable from it.</li>
          <li>
            <strong>Opening it:</strong> a file only opens if an app on the phone understands it. A PDF is safe everywhere; an
            .exe or a Windows-only format will not run on a phone at all.
          </li>
        </ul>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Movies and big folders:</strong> anything over {f.maxFileMb} MB needs a cable, Quick Share or a cloud drive.
        </li>
        <li>
          <strong>Files you&apos;ll need again next month:</strong> keep them in a cloud drive; a clip is gone after {minutes}.
        </li>
        <li>
          <strong>Confidential work documents:</strong> use your employer&apos;s approved tools; clips are not end-to-end
          encrypted.
        </li>
        <li>
          <strong>Your own Mac and iPhone:</strong> AirDrop is quicker and keeps the file off the internet.
        </li>
      </ul>
    ),
    sources: [
      SRC.quickShareWindows,
      SRC.androidUsbTransfer,
      SRC.phoneLinkCopyPaste,
      SRC.phoneLinkStart,
      SRC.bluetoothWindows,
      SRC.icloudDrive,
      SRC.appleDevicesWindows,
      SRC.airdropMac,
      SRC.driveUploadDesktop,
      SRC.oneDriveMobile,
      SRC.gmailAttachments,
      SRC.nearbySharing,
    ],
  };
}

// ---------------------------------------------------------------------------
// 16. Scan a document with your phone and send it as a PDF
// ---------------------------------------------------------------------------

function scanToPdf(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A form to return, a signed contract, a receipt for an expense claim: you rarely need a real scanner anymore. Both iPhones
          and Android phones have scanners built into free apps that straighten the page, clean up the background and save a
          PDF. This guide covers those apps, how to get a scan that is easy to read, and how to send it. If the document holds
          ID numbers or other personal details, read the section on sensitive papers before you send anything.
        </p>

        <h2>Before you scan</h2>
        <ul>
          <li>Lay the page flat on a dark, plain surface, so the edges stand out.</li>
          <li>Use daylight or a bright room, and avoid your own shadow falling across the page.</li>
          <li>Hold the phone directly above the page, not at an angle, with all four corners in view.</li>
          <li>Scan every page of a multi-page document into the same scan, in order.</li>
        </ul>

        <h2>On an iPhone: the Notes app</h2>
        <ol>
          <li>Open Notes and create a note (or open one).</li>
          <li>Tap the Attachments button and choose Scan Documents.</li>
          <li>
            Hold the iPhone over the page. In automatic mode it captures the page by itself; in manual mode, tap the shutter
            button or press a volume button.
          </li>
          <li>Drag the corners to fit the page if needed, then tap Keep Scan. Add further pages the same way.</li>
          <li>Tap Done. Apple says the document is saved as a PDF in the note.</li>
        </ol>
        <p>
          To send the PDF, use the scan&apos;s menu in the note, where Apple lists options to copy, share, rename or delete it (
          <Ext href={SRC.notesPdfs.href}>Apple: PDFs in Notes</Ext>). The scanning steps are on{" "}
          <Ext href={SRC.appleScanDocs.href}>Apple&apos;s scanning page</Ext>, which also shows the same scanner in the Files
          app: tap the More button there, choose Scan Documents, then pick a folder and tap Save.
        </p>
        <p>
          Need a signature? Apple&apos;s Markup tools can add one to a PDF (
          <Ext href={SRC.appleMarkup.href}>Apple: Markup</Ext>). Check the whole document once more after signing.
        </p>

        <h2>On Android: Google Drive</h2>
        <ol>
          <li>Open the Google Drive app and tap the Camera button at the bottom right.</li>
          <li>Photograph the page. A blue outline shows where it will be cropped.</li>
          <li>Fix the result with Crop &amp; Rotate, Filter (colour or greyscale) or Clean, and tap Add for more pages.</li>
          <li>Tap Done, give the file a name, keep the format as PDF, choose a folder with Location, and tap Save.</li>
        </ol>
        <p>
          Google says Drive saves scans as searchable PDFs (
          <Ext href={SRC.driveScan.href}>Drive Help: scan documents</Ext>). Drive&apos;s button names can change between app
          versions; the help page shows the current ones.
        </p>
        <h3>Files by Google</h3>
        <p>
          The Files by Google app has its own scanner: tap Scan, capture the page automatically or by hand, adjust it, and tap
          Done. Google says these scans are saved as PDFs automatically, in a Scanned folder you reach through Documents (
          <Ext href={SRC.filesScan.href}>Files by Google Help</Ext>). It saves to the phone rather than to the cloud, which is
          handy when you don&apos;t want the scan in your Drive at all.
        </p>

        <h2>Check it before you send</h2>
        <ul>
          <li>Open the PDF and zoom in: small print and stamps should be readable.</li>
          <li>Count the pages and check their order; a missing back page is the most common reason forms get returned.</li>
          <li>For text documents, greyscale is usually clearer and smaller than colour.</li>
          <li>
            Give it a name the recipient understands, such as &ldquo;Lastname - rental application - signed.pdf&rdquo;.
          </li>
        </ul>

        <h2>Sending the PDF</h2>
        <ul>
          <li>
            <strong>To an organisation:</strong> use its official portal or upload system if it has one. That is where the
            document is expected, and it doesn&apos;t sit in anyone&apos;s inbox.
          </li>
          <li>
            <strong>By email, straight to the person who needs it:</strong> a scanned PDF of a few pages is usually well within
            Gmail&apos;s 25 MB attachment limit (<Ext href={SRC.gmailAttachments.href}>Gmail Help</Ext>). On an iPhone, Mail
            Drop handles larger attachments, up to 5 GB, with links that expire after 30 days (
            <Ext href={SRC.mailDrop.href}>Apple: Mail Drop</Ext>).
          </li>
          <li>
            <strong>To a print shop:</strong> the tips in{" "}
            <Link href="/guides/send-a-document-to-a-print-shop">sending a document to a print shop</Link> apply to scans too.
          </li>
          <li>
            <strong>To your own computer, for an ordinary document:</strong> {SITE_NAME} can carry the PDF across: one file of
            up to {f.maxFileMb} MB, deleted after {minutes}.
          </li>
        </ul>

        <h2>ID cards and sensitive papers</h2>
        <p>
          People often scan passports, ID cards, bank statements, payslips, tax forms and medical letters. Do not send these
          through {SITE_NAME} or any other online clipboard. {CLAIMS.encryption} Anyone who has the code can open the clip until
          it expires, and a code can be overheard or left behind in a chat.
        </p>
        <p>Safer ways to hand over a sensitive scan:</p>
        <ul>
          <li>Upload it in the official portal of the bank, office or school that asked for it.</li>
          <li>Use the organisation&apos;s own upload or secure-message system, if it offers one.</li>
          <li>Email it directly to the specific person who requested it, not to a general inbox or a third party.</li>
        </ul>
        <p>
          Send only what was asked for. If part of a page must stay private, cover it with a piece of paper before you scan.
          Drawing a box over it afterwards in a markup tool is not a reliable way to hide it, and Apple&apos;s Markup help
          doesn&apos;t describe it as redaction. When you are done, delete the scan from your phone and from any cloud folder it
          was saved to.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Passports, ID cards and similar documents:</strong> use the official portal or email the person who asked
          for them.
        </li>
        <li>
          <strong>Bank, tax and medical papers:</strong> anything that could be used to impersonate you doesn&apos;t belong in
          a clip.
        </li>
        <li>
          <strong>Archiving documents:</strong> a clip is deleted after {minutes}; keep the PDF in your own storage.
        </li>
        <li>
          <strong>Long scans with many photos:</strong> files over {f.maxFileMb} MB need email with Mail Drop or a cloud link.
        </li>
      </ul>
    ),
    sources: [
      SRC.appleScanDocs,
      SRC.notesPdfs,
      SRC.appleMarkup,
      SRC.driveScan,
      SRC.filesScan,
      SRC.gmailAttachments,
      SRC.mailDrop,
    ],
  };
}

// ---------------------------------------------------------------------------
// 17. Move files between a Mac and a Windows PC
// ---------------------------------------------------------------------------

function macAndWindows(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A Mac and a Windows PC in the same house can exchange files without any extra software, but AirDrop won&apos;t see
          the PC and Windows&apos; Nearby sharing won&apos;t see the Mac. This guide covers what does work: a shared folder on
          your home network, a USB drive formatted the right way, a cloud drive, and quick options for single files. Phones are
          covered separately in <Link href="/guides/send-files-from-pc-to-phone">sending files from a PC to your phone</Link>.
        </p>

        <h2>Which option fits?</h2>
        <ul>
          <li><strong>Both computers at home, often:</strong> a shared folder over the network.</li>
          <li><strong>A big one-off move, or no network:</strong> a USB stick or external drive in ExFAT format.</li>
          <li><strong>Files you work on from both:</strong> a cloud drive that syncs.</li>
          <li><strong>One small file:</strong> email, or a temporary share code.</li>
        </ul>

        <h2>Option 1: a shared folder on your home network</h2>
        <p>
          Both computers must be on the same network, and Microsoft&apos;s sharing steps assume the PC treats that network as
          private (a home network) rather than public.
        </p>
        <h3>Share a Mac folder with the PC</h3>
        <ol>
          <li>On the Mac, open System Settings, then General, then Sharing.</li>
          <li>Turn on File Sharing and click the info button next to it.</li>
          <li>Click Options and turn on &ldquo;Share files and folders using SMB&rdquo;.</li>
          <li>
            Under Windows File Sharing, select your user account, enter its password, and click OK, then Done. Add the folders
            you want to share with the add button under Shared Folders.
          </li>
          <li>
            On the PC, open File Explorer, click Network, double-click the Mac, and sign in with the Mac account&apos;s name and
            password.
          </li>
        </ol>
        <p>
          Apple&apos;s steps also show the Mac&apos;s network address, which appears below &ldquo;File Sharing: On&rdquo; (
          <Ext href={SRC.macShareWithWindows.href}>Apple: share Mac files with Windows users</Ext>,{" "}
          <Ext href={SRC.windowsToMac.href}>Apple: connect from a Windows computer</Ext>).
        </p>
        <h3>Share a Windows folder with the Mac</h3>
        <ol>
          <li>
            On the PC, right-click the folder, choose Show more options, then Give access to, then Specific people, and pick
            the account that may use it.
          </li>
          <li>
            If File Explorer says network discovery is off, select that message and turn on network discovery and file
            sharing (<Ext href={SRC.msFileSharing.href}>Microsoft: file sharing over a network</Ext>).
          </li>
          <li>
            On the Mac, choose Go &gt; Connect to Server in the Finder and click Browse to find the PC, or type
            smb://computername/sharename in the Server Address field.
          </li>
          <li>Click Connect As and sign in with the Windows account (<Ext href={SRC.macToWindows.href}>Apple: connect to a Windows computer</Ext>).</li>
        </ol>
        <p>
          Microsoft&apos;s troubleshooting steps include turning off password-protected sharing. That lets anyone on the
          network open the shared folder, so if you try it, turn it back on afterwards. When the move is done, stop sharing the
          folder on both sides.
        </p>

        <h2>Option 2: a USB stick or external drive</h2>
        <p>
          The drive&apos;s format decides whether both computers can use it. Apple lists MS-DOS (FAT) and ExFAT as the formats
          compatible with Windows, and suggests FAT for drives of 32 GB or less and ExFAT for larger ones (
          <Ext href={SRC.diskFormats.href}>Apple: Disk Utility formats</Ext>). APFS and Mac OS Extended are Mac formats, so a
          drive formatted that way is the wrong choice for sharing with a PC.
        </p>
        <p>
          The opposite trap: many drives come formatted as NTFS, the Windows format. Apple says a Mac might be able to read NTFS
          but not write to it, which is why the Mac refuses to copy files onto such a drive (
          <Ext href={SRC.macExternalDrive.href}>Apple: if your Mac can&apos;t save to an external drive</Ext>).
        </p>
        <ul>
          <li>
            <strong>To reformat as ExFAT on the Mac:</strong> in Disk Utility, choose View &gt; Show All Devices, select the
            drive, click Erase, and choose ExFAT as the format (
            <Ext href={SRC.diskErase.href}>Apple: erase and reformat</Ext>). Erasing deletes everything on the drive, so copy
            off anything you need first.
          </li>
          <li>
            <strong>Unplug safely:</strong> eject the drive on the Mac, or use the eject option on Windows, before pulling it
            out. Removing it mid-copy can damage the files.
          </li>
        </ul>

        <h2>Option 3: a cloud drive on both computers</h2>
        <p>
          If you switch between the two computers every day, syncing is less work than copying. iCloud for Windows puts your
          iCloud Drive in File Explorer on the PC (<Ext href={SRC.icloudDrive.href}>Apple: set up iCloud Drive</Ext>), and
          Microsoft&apos;s OneDrive app is available for both Windows and Mac, with the files appearing in File Explorer and the
          Finder (<Ext href={SRC.oneDriveSync.href}>Microsoft: sync files with OneDrive</Ext>). Free storage on either service
          is limited. For sending large files to someone else with a link, see{" "}
          <Link href="/guides/send-files-too-big-for-email">sending files that are too big for email</Link>.
        </p>

        <h2>Option 4: one small file</h2>
        <p>
          For a single document, emailing it to yourself works on both computers, within your email provider&apos;s attachment
          limit. On a computer where you&apos;d rather not sign in to email, {SITE_NAME} is quicker: send the file from one
          computer and type the 6-digit code on the other. It carries a single file of up to {f.maxFileMb} MB and deletes it
          after {minutes}. To move a
          handful of files that way, <Link href="/guides/zip-and-unzip-files">zip them first</Link>.
        </p>

        <h2>After the move: will the file open?</h2>
        <ul>
          <li>
            <strong>Documents from Mac-only apps</strong> such as Pages or Numbers need an app that understands them on the PC.
            Exporting to PDF or a Word or Excel format before you move them avoids that.
          </li>
          <li>
            <strong>iPhone photos</strong> saved as HEIC may need converting for older Windows software; see{" "}
            <Link href="/guides/convert-heic-to-jpg">converting HEIC to JPG</Link>.
          </li>
          <li>
            <strong>Programs don&apos;t cross over:</strong> a Mac app won&apos;t run on Windows or the other way round. Install
            the version made for that system instead.
          </li>
        </ul>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Moving a whole user folder or years of photos:</strong> use an external drive or the network share.
        </li>
        <li>
          <strong>Files over {f.maxFileMb} MB:</strong> too big for a clip; use a USB drive or a cloud drive.
        </li>
        <li>
          <strong>Work files with confidentiality rules:</strong> use the tools your employer approves; clips are not
          end-to-end encrypted.
        </li>
        <li>
          <strong>Keeping both computers in sync:</strong> a clip is a one-off hand-off that disappears after {minutes}.
        </li>
      </ul>
    ),
    sources: [
      SRC.macShareWithWindows,
      SRC.windowsToMac,
      SRC.macToWindows,
      SRC.msFileSharing,
      SRC.diskFormats,
      SRC.macExternalDrive,
      SRC.diskErase,
      SRC.icloudDrive,
      SRC.oneDriveSync,
    ],
  };
}

// ---------------------------------------------------------------------------
// 18. Share a Wi-Fi password from your phone
// ---------------------------------------------------------------------------

function wifiPassword(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A visitor asks for the Wi-Fi, and the password is a long string printed on the back of a router behind the TV. Both
          iPhones and Android phones can hand it over without anyone reading it out: Apple devices can pass it on with one tap,
          and both systems can show a QR code to scan. This guide covers those methods, how to look up a saved password, and
          what to do when it has spread further than you meant.
        </p>

        <h2>First: does the visitor need your main network?</h2>
        <p>
          If your router offers a guest network, give visitors that instead. It is a separate network just for guests, so
          they never learn the password your own devices use. On Google Nest Wifi and Google Wifi, you set one up in the Google
          Home app under the Wi-Fi network settings (
          <Ext href={SRC.nestGuestNetwork.href}>Google Home Help: guest network</Ext>). Other routers usually have a similar
          option in their app or settings page.
        </p>

        <h2>iPhone to a nearby iPhone, iPad or Mac</h2>
        <p>Apple lists these conditions for both devices (<Ext href={SRC.appleShareWifi.href}>Apple: share your Wi-Fi password</Ext>):</p>
        <ul>
          <li>Up-to-date software, Wi-Fi and Bluetooth on, and each person signed in to their Apple Account.</li>
          <li>Personal Hotspot turned off on both.</li>
          <li>Each person has the other&apos;s Apple Account email address or phone number saved in Contacts.</li>
          <li>The devices are close to each other.</li>
        </ul>
        <ol>
          <li>Your iPhone is unlocked and connected to the network.</li>
          <li>The visitor taps the network name in their Wi-Fi settings.</li>
          <li>A prompt appears on your iPhone: tap Share Password, then Done.</li>
        </ol>
        <p>
          If no prompt appears, Apple suggests restarting both devices and trying again; failing that, the other person types
          the password by hand. A Mac can share in the same way: it shows a Wi-Fi password notification and you confirm it (
          <Ext href={SRC.macShareWifi.href}>Apple: share a Wi-Fi password on Mac</Ext>).
        </p>

        <h2>iPhone: show a QR code or look up the password</h2>
        <p>
          The one-tap method needs both people to be in each other&apos;s contacts. For anyone else, the Passwords app on your
          iPhone can show a code: open it, tap Wi-Fi, choose the network, and tap Show Network QR Code for the visitor to scan.
          The same screen shows the password itself, and Copy Password copies it (
          <Ext href={SRC.iphoneFindWifi.href}>Apple: find and share your Wi-Fi password</Ext>).
        </p>
        <p>
          In Settings, you can also tap Wi-Fi, then the Info button next to the network, then the Password field; the iPhone
          asks for Face ID, Touch ID or your passcode first. Apple says this works from iOS 16, and that older saved networks
          are found through the Edit button on the Wi-Fi screen (
          <Ext href={SRC.iphoneSavedWifi.href}>Apple: find saved Wi-Fi passwords</Ext>).
        </p>

        <h2>Android: share with a QR code</h2>
        <ol>
          <li>Open Settings, then Network &amp; internet, then Internet.</li>
          <li>Tap your Wi-Fi network, then Share. If the phone asks you to verify your identity, do so.</li>
          <li>A QR code appears. The visitor scans it with their phone to join the same network.</li>
        </ol>
        <p>
          Google notes that some of these steps need Android 12 or later (
          <Ext href={SRC.androidWifi.href}>Android Help: Wi-Fi networks</Ext>). On a Pixel there is also a shortcut: swipe down,
          tap Internet and choose Share Wi-Fi (<Ext href={SRC.pixelWifi.href}>Pixel Help: Wi-Fi</Ext>). Phones from other
          makers often name these menus differently, so look for &ldquo;Share&rdquo; or a QR icon on the network&apos;s details
          screen.
        </p>
        <h3>Joining with a QR code</h3>
        <p>
          On a Pixel, Google says the camera can scan a QR code to connect to a Wi-Fi network, as long as camera scan suggestions
          are turned on, and there is also a Scan QR code tile in Quick Settings (
          <Ext href={SRC.pixelQr.href}>Pixel Camera Help: scan QR codes</Ext>). On other phones, try the camera first, then the
          Wi-Fi settings. Apple&apos;s help for the iPhone camera covers QR codes in general but doesn&apos;t mention Wi-Fi codes
          specifically (<Ext href={SRC.appleQr.href}>Apple: scan a QR code</Ext>), so if the iPhone doesn&apos;t offer to join,
          type the password instead.
        </p>

        <h2>Typing it in by hand</h2>
        <ul>
          <li>Read it from your phone&apos;s password screen rather than the router sticker, in case it was changed.</li>
          <li>Watch for characters that look alike: capital I and lowercase l, the letter O and zero.</li>
          <li>Wi-Fi passwords are case-sensitive, so capital letters must match exactly.</li>
        </ul>

        <h2>Don&apos;t send it through an online clipboard</h2>
        <p>
          It can be tempting to paste the password into a website and hand over a short code. Don&apos;t send a Wi-Fi password
          through {SITE_NAME} or any other online clipboard. {CLAIMS.encryption} Anyone who sees or guesses the code in the
          next {minutes} can read the password, and you can&apos;t take it back. The methods above keep it between the two
          devices. Our guide on{" "}
          <Link href="/guides/is-an-online-clipboard-safe">what an online clipboard should never hold</Link> explains the
          reasons in more detail.
        </p>
        <p>
          The same goes for group chats and social media posts: a Wi-Fi password written there tends to stay readable long after
          the visit.
        </p>

        <h2>If the password has spread too far</h2>
        <p>
          Change it. On Google Nest Wifi and Google Wifi, you do that in the Google Home app&apos;s network settings, and Google
          warns that all your devices disconnect until you enter the new password on each of them (
          <Ext href={SRC.nestChangePassword.href}>Google Home Help: change Wi-Fi password</Ext>). For other routers, use the
          maker&apos;s app or settings page. Plan it for a moment when reconnecting smart speakers, TVs and printers won&apos;t be
          a problem.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Wi-Fi passwords, always:</strong> use one-tap sharing, a QR code or a guest network instead. Never put them in
          a clip, whether on {SITE_NAME} or another online clipboard.
        </li>
        <li>
          <strong>Router admin passwords and other logins:</strong> share them, if you must, through a password manager.
        </li>
      </ul>
    ),
    sources: [
      SRC.appleShareWifi,
      SRC.macShareWifi,
      SRC.iphoneFindWifi,
      SRC.iphoneSavedWifi,
      SRC.androidWifi,
      SRC.pixelWifi,
      SRC.pixelQr,
      SRC.appleQr,
      SRC.nestGuestNetwork,
      SRC.nestChangePassword,
    ],
  };
}

// ---------------------------------------------------------------------------
// 19. Send photos and videos without losing quality
// ---------------------------------------------------------------------------

function photoQuality(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          The photo looked sharp on your phone and arrives soft and smeared; the video turns blocky. That isn&apos;t the
          camera&apos;s fault. Most messaging apps shrink pictures and videos before sending them, to save data and time. This
          guide explains where quality gets lost and which settings and methods keep it, based on what Apple, Google and
          WhatsApp say about their own apps.
        </p>

        <h2>Where the quality goes</h2>
        <ul>
          <li>
            <strong>Messengers:</strong> WhatsApp says media is usually compressed when shared, so what arrives may be lower in
            quality than the original. By default, its videos are limited in size and resolution, more so on a slow
            connection (<Ext href={SRC.whatsappMedia.href}>WhatsApp: send media</Ext>).
          </li>
          <li>
            <strong>Old-style picture messages (MMS):</strong> Google says carriers compress them, and recommends RCS for
            clearer images (<Ext href={SRC.googleMessagesMedia.href}>Google Messages Help</Ext>).
          </li>
          <li>
            <strong>Shared albums:</strong> some reduce resolution, depending on the service and version (details below).
          </li>
          <li>
            <strong>Format conversion:</strong> an iPhone may convert HEIC photos to JPEG for compatibility, which is a
            re-encode, not an exact copy.
          </li>
        </ul>

        <h2>Settings that keep more quality in chats</h2>
        <h3>WhatsApp: HD quality</h3>
        <p>
          When you send a photo or video, tap the HD Media button and choose HD quality instead of Standard quality. To make HD
          the default, open Settings, then Storage and data, then Media upload quality, and choose HD quality (
          <Ext href={SRC.whatsappHd.href}>WhatsApp: HD photos and videos</Ext>). WhatsApp notes that your connection still
          affects the quality of what is sent, and HD is not the same as the original file.
        </p>
        <h3>WhatsApp: send the photo as a document</h3>
        <p>
          Attaching the picture with Document instead of Photos sends it as a file, with a much higher size limit. WhatsApp&apos;s
          help doesn&apos;t explicitly promise that documents are left untouched, so if the original truly matters, compare the
          file size on both ends.
        </p>
        <h3>Google Messages: HD+</h3>
        <p>
          In Google Messages, the image preview has HD and HD+ buttons. Google describes HD+ as original quality, sent at full
          media resolution, while HD is optimised for chat and uses less data. The option you pick is remembered for next time.
        </p>
        <h3>iPhone Messages</h3>
        <p>
          In Settings, open Apps, then Messages, and check that Low Quality Image Mode is off; when it is on, the iPhone sends
          smaller images (<Ext href={SRC.appleMessagesTrouble.href}>Apple: if you can&apos;t send messages</Ext>). Apple also
          says the iPhone can compress attachments when necessary, for example when a carrier limits attachment sizes. Sending
          between an iPhone and an Android phone has its own catches; see{" "}
          <Link href="/guides/send-files-between-android-and-iphone">sending files between Android and iPhone</Link>.
        </p>

        <h2>Methods that keep the original</h2>
        <h3>AirDrop with All Photos Data (Apple devices)</h3>
        <ol>
          <li>In Photos, select the pictures and tap the Share button.</li>
          <li>Tap Options and turn on All Photos Data. Choose Current to stop any format conversion.</li>
          <li>Tap Close and send with AirDrop.</li>
        </ol>
        <p>
          Apple says All Photos Data shares the original file with its edit history and metadata, and that it works with
          AirDrop only (<Ext href={SRC.appleSharePhotos.href}>Apple: share photos on iPhone</Ext>).
        </p>
        <h3>A cable or a direct import</h3>
        <p>
          Copying straight from the phone to a computer skips every chat service. Our guides for{" "}
          <Link href="/guides/transfer-photos-from-iphone-to-windows-pc">iPhone to Windows</Link> and{" "}
          <Link href="/guides/transfer-photos-from-android-to-computer">Android to a computer</Link> walk through it.
        </p>
        <h3>Shared albums: check the version</h3>
        <p>
          Apple&apos;s limits for iCloud Shared Albums depend on the software version used to create the album. For albums
          created in version 26 or earlier, photos are reduced to 2048 pixels on the long edge and videos are delivered at up
          to 720p. For albums created in version 27 or later, photos and videos are stored at full resolution in their original
          formats and count towards the owner&apos;s iCloud storage (
          <Ext href={SRC.sharedAlbumsLimits.href}>Apple: Shared Albums limits</Ext>).
        </p>
        <p>
          In Google Photos, what you share comes from what is backed up. Google says Original quality keeps photos and videos
          at the resolution they were taken, while Storage saver stores reduced copies (
          <Ext href={SRC.googlePhotosQuality.href}>Google Photos: backup quality</Ext>).
        </p>
        <h3>Files in a cloud drive</h3>
        <p>
          A photo uploaded to Google Drive, OneDrive or iCloud Drive is stored as a file rather than as chat media, which makes a
          drive link a good choice for many photos or long videos. How to share such links is covered in{" "}
          <Link href="/guides/send-files-too-big-for-email">sending files that are too big for email</Link>.
        </p>

        <h2>Check what arrived</h2>
        <ul>
          <li>Compare the file size on both devices. A big drop means the file was recompressed.</li>
          <li>Open the photo at full size and zoom in on fine detail such as hair, text or leaves.</li>
          <li>For video, compare the length and check whether it plays smoothly at full screen.</li>
        </ul>

        <h2>Where {SITE_NAME} fits</h2>
        <p>
          {SITE_NAME} doesn&apos;t touch the file: what you upload is stored and downloaded byte for byte. That makes it a quick
          way to move one original photo or a short clip to another device, up to {f.maxFileMb} MB, without signing in anywhere.
          The clip is deleted after {minutes}, and a HEIC photo arrives as a HEIC.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>Long 4K videos and whole albums:</strong> anything over {f.maxFileMb} MB, or more than a few files, needs a
          cable, AirDrop or a cloud drive.
        </li>
        <li>
          <strong>Sharing with a group over time:</strong> a shared album suits that far better than a short-lived clip.
        </li>
        <li>
          <strong>Private photos:</strong> clips are not end-to-end encrypted, and anyone with the code can open them.
        </li>
        <li>
          <strong>Photos you want to keep safe:</strong> a clip is deleted after {minutes}; it is not a backup.
        </li>
      </ul>
    ),
    sources: [
      SRC.whatsappMedia,
      SRC.whatsappHd,
      SRC.googleMessagesMedia,
      SRC.appleMessagesTrouble,
      SRC.appleSharePhotos,
      SRC.sharedAlbumsLimits,
      SRC.googlePhotosQuality,
    ],
  };
}

// ---------------------------------------------------------------------------
// 20. Zip and unzip files on Windows, Mac, iPhone and Android
// ---------------------------------------------------------------------------

function zipFiles(f: SiteFacts): GuideBody {
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  return {
    body: (
      <>
        <p>
          A ZIP file packs several files and folders into one. That makes them easier to attach, upload or hand over, keeps a
          folder structure intact, and sometimes saves space. Every current system can create and open ZIP files without
          extra software. This guide shows the built-in way on each, and the cases where zipping doesn&apos;t help.
        </p>

        <h2>Windows 11</h2>
        <h3>Create a ZIP</h3>
        <ol>
          <li>In File Explorer, select the files or folder you want to pack.</li>
          <li>Right-click (or press and hold) and choose Show more options.</li>
          <li>Choose Send to, then Compressed (zipped) folder.</li>
          <li>A ZIP with the same name appears in the same place. Rename it if you like.</li>
        </ol>
        <h3>Open a ZIP</h3>
        <p>
          Double-clicking a ZIP opens it like a folder, and you can drag single items out of it. To unpack everything,
          right-click the ZIP, choose Extract All, and follow the prompts. Files you open straight from inside the ZIP without
          extracting are easy to lose track of, so extract first if you plan to edit them.
        </p>
        <p>
          Microsoft says Windows 11 version 24H2 supports ZIP, RAR, 7z and TAR archives, but not encrypted (password-protected)
          ones; for those, its built-in tool is not enough (
          <Ext href={SRC.msZip.href}>Microsoft: zip and unzip files</Ext>). Microsoft also warns that encrypted files you add
          to a ZIP come out unencrypted when unzipped, so avoid zipping them.
        </p>

        <h2>Mac</h2>
        <h3>Create a ZIP</h3>
        <ol>
          <li>In the Finder, select one or more files or folders.</li>
          <li>Control-click the selection and choose Compress.</li>
          <li>
            For a single item, the ZIP keeps its name with .zip added; for several items, it is called Archive.zip. Rename
            Archive.zip to something the recipient will recognise.
          </li>
        </ol>
        <h3>Open a ZIP</h3>
        <p>
          Double-click the .zip file. The unpacked item appears in the same folder, and you can delete the ZIP afterwards. If a
          ZIP won&apos;t open, Apple&apos;s first suggestion is to make sure there is enough free space for the unpacked files (
          <Ext href={SRC.macZip.href}>Apple: zip and unzip on Mac</Ext>).
        </p>

        <h2>iPhone and iPad: the Files app</h2>
        <h3>Create a ZIP</h3>
        <ol>
          <li>Open the Files app and find the file or folder.</li>
          <li>Touch and hold it, then tap Compress.</li>
          <li>
            For several files, tap the More button, choose Select, pick the files, then tap the More button again and choose
            Compress. The result is called Archive.zip; touch and hold it and tap Rename to change that.
          </li>
        </ol>
        <h3>Open a ZIP</h3>
        <p>
          Tap the ZIP file in the Files app and a folder with its contents appears next to it. You can also touch and hold it
          and tap Uncompress (
          <Ext href={SRC.iphoneZip.href}>Apple: ZIP files on iPhone</Ext>,{" "}
          <Ext href={SRC.iphoneFilesOrganize.href}>Apple: organise files</Ext>). A ZIP you downloaded in Safari usually sits in
          the Downloads folder in Files.
        </p>

        <h2>Android: Files by Google</h2>
        <h3>Open a ZIP</h3>
        <ol>
          <li>In Files by Google, select the .zip file.</li>
          <li>Tap Extract. Tick the option to delete the ZIP afterwards if you don&apos;t need it.</li>
          <li>Tap Done. The files are saved in the same folder as the ZIP.</li>
        </ol>
        <p>
          Google notes that only .zip files are supported here (
          <Ext href={SRC.filesUnzip.href}>Files by Google: unzip</Ext>). If extraction fails, the usual cause is a full phone:
          free some space first.
        </p>
        <h3>Create a ZIP</h3>
        <p>
          Select the files or folders, tap the More menu (three dots) and choose Compress, then name the ZIP. Google says this
          needs Android 8 or later, and that the name shouldn&apos;t contain spaces or full stops (
          <Ext href={SRC.filesCompress.href}>Files by Google: compress</Ext>). Other file manager apps, such as the one your
          phone maker installs, may use different menu names.
        </p>

        <h2>When zipping does and doesn&apos;t help</h2>
        <ul>
          <li>
            <strong>Many files in one go:</strong> the main reason to zip. One attachment or upload instead of twenty, and
            folders arrive in the right structure.
          </li>
          <li>
            <strong>Text, documents and logs:</strong> they usually shrink noticeably.
          </li>
          <li>
            <strong>Photos and videos:</strong> they are already compressed. Microsoft points out that a ZIP of JPEG pictures is
            about the same size as the pictures themselves. To make photos smaller, you need to resize them, not zip them.
          </li>
          <li>
            <strong>Too big for email:</strong> zipping rarely gets a large video under an attachment limit; see{" "}
            <Link href="/guides/send-files-too-big-for-email">sending files that are too big for email</Link> instead.
          </li>
        </ul>

        <h2>Before you send a ZIP</h2>
        <ul>
          <li>Open it once yourself to check that everything you meant to include is inside.</li>
          <li>Give it a clear name; &ldquo;Archive.zip&rdquo; tells the recipient nothing.</li>
          <li>
            Some email services and workplaces may refuse ZIPs that contain programs, because malware is often sent that way. If a
            ZIP bounces, ask the recipient how they would like to receive the files.
          </li>
          <li>Only open ZIPs from people you expect them from, and be suspicious of a ZIP that contains a single program file.</li>
        </ul>

        <h2>Sending several files with {SITE_NAME}</h2>
        <p>
          A clip carries one file, so a ZIP is how you send several at once: zip them, open {SITE_NAME}, add the ZIP and send
          it. The ZIP can be up to {f.maxFileMb} MB, and it is deleted after {minutes}. On the other device, unpack it with the
          steps above.
        </p>
      </>
    ),
    notRightFor: (
      <ul>
        <li>
          <strong>ZIPs larger than {f.maxFileMb} MB:</strong> use a cloud drive link or a cable.
        </li>
        <li>
          <strong>Confidential files:</strong> a ZIP is not encryption, and clips are not end-to-end encrypted either.
        </li>
        <li>
          <strong>Anything you need to keep:</strong> the clip disappears after {minutes}; keep the original files.
        </li>
        <li>
          <strong>Unknown ZIPs from strangers:</strong> don&apos;t pass on or open archives you didn&apos;t expect.
        </li>
      </ul>
    ),
    sources: [SRC.msZip, SRC.macZip, SRC.iphoneZip, SRC.iphoneFilesOrganize, SRC.filesUnzip, SRC.filesCompress],
  };
}

export const GUIDE_BODIES: Record<string, (f: SiteFacts) => GuideBody> = {
  "move-files-between-mac-and-windows-pc": macAndWindows,
  "share-wifi-password-from-phone": wifiPassword,
  "send-photos-and-videos-without-losing-quality": photoQuality,
  "zip-and-unzip-files": zipFiles,
  "convert-heic-to-jpg": heicToJpg,
  "send-files-between-android-and-iphone": androidAndIphone,
  "send-files-from-pc-to-phone": pcToPhone,
  "scan-document-to-pdf-with-phone": scanToPdf,
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
