import { Suspense } from "react";
import { AdminEditor } from "@/features/admin-games/pages";
async function Editor({ params }: { params: Promise<{ id: string }> }) { return <AdminEditor id={(await params).id} />; }
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<p className="content-width" role="status">Loading editor…</p>}><Editor params={params} /></Suspense>; }
