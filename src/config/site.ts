export const site = {
  name: "Revilla Trails",
  workingName: "Revilla Trails",
  orgName: "Ketchikan Trail Association",
  tagline: "Connect the island.",
  description:
    "Every trail on Revillagigedo Island, every gap between them, and who owns the ground. First project: walking routes to the Patching Lake and Heckman Lake cabins.",
  url: "https://revillatrails.org",
  email: "hello@revillatrails.org",
  locale: "en-US",
  social: {
    instagram: "",
    facebook: "",
    bluesky: "",
  },
  features: {
    donations: false,
    memberAccounts: false,
    liveReports: false,
  },
  plausibleDomain: "",
  formspree: {
    signOn: "",
    report: "",
  },
} as const;

export type SiteConfig = typeof site;
export type FeatureFlag = keyof typeof site.features;
