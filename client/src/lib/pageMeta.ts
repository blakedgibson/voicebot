/**
 * Sets the page title, meta description, and canonical URL for SEO.
 * Call this at the top of each public-facing page component.
 */
export function setPageMeta(options: {
  title: string;
  description?: string;
  canonical?: string;
}) {
  const { title, description, canonical } = options;
  const fullTitle = title.includes('VoiceBot') ? title : `${title} | VoiceBot`;

  document.title = fullTitle;

  if (description) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;

    // Also update OG description
    let ogMeta = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogMeta) ogMeta.content = description;
  }

  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;

    // Also update OG URL
    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (ogUrl) ogUrl.content = canonical;

    // Also update OG title
    let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = fullTitle;
  }
}
