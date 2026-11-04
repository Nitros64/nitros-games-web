import { Suspense } from "react";
import { VersionsPage } from "@/features/game-releases/pages";
type Props = { params: Promise<{ id: string }> };
async function Content({ params }: Props) {
  const { id } = await params;
  return <VersionsPage gameId={id} />;
}
export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">Loading versions…</p>}><Content {...props} /></Suspense>;
}
