import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/lib/store";
import { ReelsManager } from "@/components/admin/ReelsManager";

export default async function ReelsPage() {
  await requireAdmin();
  const c = await readContent();
  return <ReelsManager reels={c.reels} />;
}
