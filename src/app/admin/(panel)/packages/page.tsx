import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/lib/store";
import { PackagesEditor } from "@/components/admin/PackagesEditor";

export default async function PackagesPage() {
  await requireAdmin();
  const c = await readContent();
  return <PackagesEditor initial={c.packages} reviewed={c.settings.pricesReviewed} />;
}
