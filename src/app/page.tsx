import { Catalog } from "@/features/catalog/catalog";
import { HomePage } from "@/features/home/home-page";
export default function Home() {
  return <HomePage catalog={<Catalog />} />;
}
