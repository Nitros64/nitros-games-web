import { Suspense } from "react";
import { AdminEditor } from "@/features/admin-games/pages";
export default function Page() { return <Suspense fallback={<p className="content-width" role="status">Loading editor…</p>}><AdminEditor /></Suspense>; }
