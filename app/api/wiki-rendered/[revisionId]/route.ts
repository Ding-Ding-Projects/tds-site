import wikiRevisions from "@/data/wiki-revisions.json";
import { sanitizeWikiHtml } from "@/lib/wiki-html-sanitizer.mjs";

const revisionById = new Map((wikiRevisions as Array<{ revisionId: number; pageid: number; namespace: number }>).map((entry) => [String(entry.revisionId), entry]));
const MAX_RENDERED_BYTES = 6_000_000;

async function readBoundedText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RENDERED_BYTES) {
      await reader.cancel();
      throw new RangeError("Rendered article exceeds the reader limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function GET(_request: Request, context: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await context.params;
  const page = revisionById.get(revisionId);
  if (!/^\d{1,12}$/.test(revisionId) || !page) {
    return Response.json({ error: "This revision is outside the imported public snapshot." }, { status: 404 });
  }
  if (page.namespace === 2900) {
    return Response.json({
      fallback: "imported-source",
      message: "This map page uses its complete imported source and the local article formatter.",
    }, { status: 501, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  }

  try {
    const upstream = await fetch(`https://tds.wiki/rest.php/v1/revision/${revisionId}/html`, {
      headers: { "Api-User-Agent": "TDS Strategy Lab/1.0 (public reference; https://github.com/Ding-Ding-Projects/tds-site)" },
      signal: AbortSignal.timeout(20_000),
      redirect: "manual",
    });
    if (!upstream.ok || !upstream.headers.get("content-type")?.toLowerCase().startsWith("text/html")) {
      return Response.json({ error: "The source wiki did not return rendered article content." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const declaredLength = Number(upstream.headers.get("content-length"));
    if (declaredLength > MAX_RENDERED_BYTES) {
      return Response.json({ error: "The rendered article is larger than this reader accepts." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    const html = await readBoundedText(upstream);
    const article = sanitizeWikiHtml(html);
    return Response.json(article, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return Response.json({ error: "The rendered article is larger than this reader accepts." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Rendered article content is temporarily unavailable. The imported source remains available below." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
