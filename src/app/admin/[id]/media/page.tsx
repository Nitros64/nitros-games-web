import { Suspense } from "react";
import { MediaPage } from "@/features/game-media/pages";
type Props = { params: Promise<{ id: string }> };
async function Content({ params }: Props) { const { id } = await params; return <MediaPage rawId={id} />; }
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading images…</p>}><Content {...props} /></Suspense>; }
