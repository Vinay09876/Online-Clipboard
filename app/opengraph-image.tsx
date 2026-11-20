import { ImageResponse } from "next/og";

/**
 * Social share image (1200×630), generated at build time with next/og.
 * Uses next/og's bundled default font: no external fonts or images are fetched.
 * Used for /, and inherited by pages that don't define their own.
 */
export const alt = "Online Clipboard: share text and files with a 6-digit code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const digits = ["4", "8", "2", "9", "1", "3"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "#09090b",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            #
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Online Clipboard</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 60, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>
          Share text and files with a 6-digit code
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          {digits.map((d, i) => (
            <div
              key={i}
              style={{
                width: 84,
                height: 104,
                borderRadius: 16,
                border: "3px solid #4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 44, fontSize: 30, color: "#a1a1aa" }}>
          Free · No account · Deleted automatically
        </div>
      </div>
    ),
    size,
  );
}
