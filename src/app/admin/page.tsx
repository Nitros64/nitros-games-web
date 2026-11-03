import { Suspense } from "react";
import { AdminList } from "@/features/admin-games/pages";
export default function Page() { return <Suspense fallback={<p className="content-width" role="status">Loading administration…</p>}><AdminList /></Suspense>; }
