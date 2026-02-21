import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
  schema?: Record<string, any>; // JSON-LD Structured Data
}

export function SEO({ 
  title = "IftarInUAE - Find the Best Iftar Places", 
  description = "Discover top-rated Iftar places and traditional tents across UAE for Ramadan 2026.", 
  imageUrl = "/og-image.jpg", // TODO: Add a default OG image to attached_assets or public
  url = "https://iftarinuae.com", 
  type = "website",
  schema
}: SEOProps) {
  const siteTitle = title === "IftarInUAE - Find the Best Iftar Places" ? title : `${title} | IftarInUAE`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={imageUrl} />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
