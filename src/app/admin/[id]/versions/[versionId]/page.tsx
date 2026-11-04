import { Suspense } from "react";
import { VersionsPage } from "@/features/game-releases/pages";
type Props = { params: Promise<{ id: string; versionId: string }> };
async function Content({ params }: Props) {
  const { id, versionId } = await params;
  return <VersionsPage gameId={id} versionId={versionId} />;
}
export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">Loading downloads…</p>}><Content {...props} /></Suspense>;
}
