import { mutateMedia } from "@/features/game-media/transport";
type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context) { return mutateMedia(request, (await context.params).id); }
export { mutate as POST, mutate as PUT, mutate as DELETE };
