export const site = {
  name: "Revilla Trails",
  workingName: "Revilla Trails",
  orgName: "Ketchikan Trail Association",
  tagline: "Connect the island.",
  description:
    "A status-coded map of every existing and proposed trail segment on Revillagigedo Island — the public case for connecting the network across jurisdictions.",
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
