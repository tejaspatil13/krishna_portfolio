import { getPublicContent } from "@/lib/content";
import { Site } from "@/components/site/Site";

export default async function Home() {
  const content = await getPublicContent();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: content.contact.name,
    description: content.settings.metaDescription,
    email: content.contact.email,
    telephone: content.contact.phone,
    founder: { "@type": "Person", name: content.contact.name, jobTitle: "Video Editor" },
  };
  return (
    <>
      <script
        // Enables JS-only pre-hide styles; the page always opens at the top and then glides to the work.
        dangerouslySetInnerHTML={{
          __html:
            "document.documentElement.classList.add('js');try{history.scrollRestoration='manual'}catch(e){}",
        }}
      />
      <noscript>
        <style>{".enter-gate{display:none!important}"}</style>
      </noscript>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Site content={content} />
    </>
  );
}
