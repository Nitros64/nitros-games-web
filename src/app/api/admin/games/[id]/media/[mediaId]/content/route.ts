import { mediaContent } from "@/features/game-media/transport";
export async function GET(_request: Request, context: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await context.params; return mediaContent(id, mediaId, true);
}
