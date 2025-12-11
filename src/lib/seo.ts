const FALLBACK_SITE_URL = "https://gusss-singapore.vercel.app/";

const sanitizeSiteUrl = (baseUrl: string): string => {
  try {
    const normalized = new URL(baseUrl);
    return normalized.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
};

const siteUrl = sanitizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL
);

export const seoConfig = {
  siteName: "GuessSG",
  tagline: "Guess Singapore-themed words in six tries",
  description:
    "GuessSG is the Singapore word game inspired by Wordle. Practice Singlish, hawker food, and local trivia clues in a daily brain teaser.",
  locale: "en-SG",
  siteUrl,
  publisher: "Orchids Studio",
  defaultSocialImage: "/orchids-logo.png",
  keywords: [
    "Guess Singapore",
    "Guess SG",
    "Singapore games",
    "Singapore word game",
    "Singapore Wordle",
    "Singlish game",
    "Hawker food quiz",
    "SG trivia game",
    "daily word game",
    "word puzzle Singapore",
  ],
};

export const absoluteUrl = (path = "/"): string =>
  new URL(path, seoConfig.siteUrl).toString();

export const buildJsonLd = () => {
  const publisher = {
    "@type": "Organization",
    name: seoConfig.publisher,
    url: seoConfig.siteUrl,
  };

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: seoConfig.siteName,
      url: seoConfig.siteUrl,
      description: seoConfig.description,
      inLanguage: seoConfig.locale,
      publisher,
      potentialAction: {
        "@type": "PlayAction",
        target: seoConfig.siteUrl,
      },
      about: [
        "Singapore culture",
        "Singlish vocabulary",
        "Hawker centre food",
        "Local trivia",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: seoConfig.siteName,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      url: seoConfig.siteUrl,
      description: seoConfig.description,
      inLanguage: seoConfig.locale,
      publisher,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "SGD",
      },
      genre: ["puzzle", "education"],
      keywords: seoConfig.keywords.join(", "),
    },
  ];
};
