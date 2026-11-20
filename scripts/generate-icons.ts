/**
 * Generates the PNG/ICO icons from the logo SVG, using the Playwright Chromium that is
 * already installed for the e2e tests (no image library needed). Run after changing the logo:
 *
 *   npm run icons:generate
 *
 * Outputs (all committed):
 *   app/favicon.ico        16 + 32 + 48 px (PNG-in-ICO), for /favicon.ico
 *   app/apple-icon.png     180 px, full-bleed background (iOS rounds the corners itself)
 *   public/icon-192.png    web app manifest
 *   public/icon-512.png    web app manifest
 *   public/icon-maskable-512.png  manifest "maskable" (logo inside the safe zone)
 *
 * app/icon.svg (the source, also served as the SVG favicon) is not touched.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const ROUNDED = readFileSync("app/icon.svg", "utf8");
// Full-bleed variant: square background, same artwork (for Apple and maskable icons).
const SQUARE = ROUNDED.replace('<rect x="2" y="2" width="28" height="28" rx="7"', '<rect x="0" y="0" width="32" height="32" rx="0"');
// Maskable: artwork scaled to ~70% so it stays inside the circular safe zone.
const MASKABLE = SQUARE.replace(/<rect x="9"[\s\S]*<\/svg>/, (inner) =>
  `<g transform="translate(16 16) scale(0.72) translate(-16 -16)">${inner.replace("</svg>", "")}</g></svg>`,
);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  async function png(svg: string, size: number, transparent: boolean): Promise<Buffer> {
    await page.setViewportSize({ width: size, height: size });
    const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${sized}</body></html>`,
    );
    return page.locator("svg").screenshot({ omitBackground: transparent, type: "png" });
  }

  const outputs: Array<[string, Buffer]> = [
    ["app/apple-icon.png", await png(SQUARE, 180, false)],
    ["public/icon-192.png", await png(ROUNDED, 192, true)],
    ["public/icon-512.png", await png(ROUNDED, 512, true)],
    ["public/icon-maskable-512.png", await png(MASKABLE, 512, false)],
  ];

  // favicon.ico: an ICO container with PNG images inside (supported by all current browsers).
  const sizes = [16, 32, 48];
  const pngs: Buffer[] = [];
  for (const s of sizes) pngs.push(await png(ROUNDED, s, true));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * sizes.length;
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s, 0); // width
    e.writeUInt8(s, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(e);
  });
  outputs.push(["app/favicon.ico", Buffer.concat([header, ...entries, ...pngs])]);

  for (const [path, data] of outputs) {
    writeFileSync(path, data);
    console.log(`wrote ${path} (${data.length} bytes)`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
