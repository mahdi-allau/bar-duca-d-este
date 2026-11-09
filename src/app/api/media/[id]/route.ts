import { one } from "@/server/db";

export const dynamic = "force-dynamic";

type Row = { mime: string; data: Uint8Array };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return new Response("Not found", { status: 404 });
  const row = await one<Row>(`SELECT mime, data FROM media WHERE id = $1`, [id]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      // The id changes whenever a photo is replaced, so it can be cached for a long time.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
