import { Suspense } from "react";
import { PublicReleases } from "@/features/game-releases/public-page";
type Props = { params: Promise<{ id: string }> };
async function Content({ params }: Props) {
  const { id } = await params;
  return <PublicReleases rawId={id} />;
}
export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">Loading downloads…</p>}><Content {...props} /></Suspense>;
}
