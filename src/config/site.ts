export const site = {
  name: "SEAtrails",
  /** Field name for the Ketchikan map, the only network this site can stand behind today. */
  workingName: "Revilla Trails",
  orgName: "SEAtrails",
  tagline: "Bring the trails back.",
  description:
    "The public site for bringing SEAtrails back with Southeast Alaska communities. The mapped work starts on Revillagigedo Island. Students can volunteer to build trail. Universities are invited to offer scholarships and certificates for that work.",
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
