import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/lib/store";
import { ContactEditor } from "@/components/admin/ContactEditor";

export default async function ContactPage() {
  await requireAdmin();
  const { contact } = await readContent();
  return (
    <ContactEditor
      initial={{
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        whatsapp: contact.whatsapp,
        whatsappMessage: contact.whatsappMessage,
        instagram: contact.instagram ?? "",
      }}
    />
  );
}
