import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/lib/store";
import { ContentEditor } from "@/components/admin/ContentEditor";

export default async function ContentPage() {
  await requireAdmin();
  const c = await readContent();
  return (
    <ContentEditor
      initial={{
        hero: c.hero,
        work: c.work,
        packagesSection: c.packagesSection,
        process: c.process,
        contact: { headline: c.contact.headline, description: c.contact.description },
      }}
    />
  );
}
