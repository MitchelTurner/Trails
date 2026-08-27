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

export const collections = { news, workParties };
