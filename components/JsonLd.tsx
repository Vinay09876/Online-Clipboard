import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/site";

/**
 * One <script type="application/ld+json"> per object. Safe serialization ("<" escaped, see
 * lib/site.ts) and the per-request CSP nonce from proxy.ts. Only pass static, server-built
 * data: never user content.
 */
export async function JsonLd({ data }: { data: Array<Record<string, unknown>> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      {data.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce}
          // Escaped by serializeJsonLd: "<" can't close the tag.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(d) }}
        />
      ))}
    </>
  );
}
