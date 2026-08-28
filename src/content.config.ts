import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const news = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/news" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
  }),
});

const workParties = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work-parties" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    meetingPoint: z.string(),
    whatToBring: z.string(),
    contact: z.string(),
    status: z.enum(["upcoming", "past"]).default("upcoming"),
  }),
});

// Long-form trail documentation rendered on the matching /network/<id> page.
// The entry `id` (filename without extension) must equal a segment id in the network.
const trailGuides = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/trail-guides" }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { news, workParties, trailGuides };
