import { z } from "zod";

export const SegmentStatus = z.enum([
  "existing",
  "needs-work",
  "under-construction",
  "proposed",
]);

export const SegmentDifficulty = z.enum(["easy", "moderate", "difficult"]);

export const SegmentSurface = z.enum([
  "boardwalk",
  "gravel",
  "native",
  "rock",
  "unbuilt",
]);

export const Segment = z.object({
  id: z.string(),
  name: z.string(),
  status: SegmentStatus,
  corridorId: z.string().nullable(),
  landManagers: z.array(z.string()).min(1),
  lengthMi: z.number(),
  elevationGainFt: z.number().nullable(),
  difficulty: SegmentDifficulty.nullable(),
  surface: SegmentSurface,
  seasonality: z.string().nullable(),
  connectsTo: z.array(z.string()),
  summary: z.string().max(400),
  whatItNeeds: z.string().nullable(),
  sourceRef: z.string(),
  updatedAt: z.string(),
});

export const Corridor = z.object({
  id: z.string(),
  name: z.string(),
  segmentIds: z.array(z.string()),
  blurb: z.string(),
  totalMi: z.number(),
  existingMi: z.number(),
  gapMi: z.number(),
  percentComplete: z.number(),
});

export const CorridorSource = Corridor.omit({
  totalMi: true,
  existingMi: true,
  gapMi: true,
  percentComplete: true,
});

export const SegmentOverride = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    status: SegmentStatus.optional(),
    corridorId: z.string().nullable().optional(),
    landManagers: z.array(z.string()).min(1).optional(),
    elevationGainFt: z.number().nullable().optional(),
    difficulty: SegmentDifficulty.nullable().optional(),
    surface: SegmentSurface.optional(),
    seasonality: z.string().nullable().optional(),
    summary: z.string().max(400).optional(),
    whatItNeeds: z.string().nullable().optional(),
    include: z.boolean().optional(),
  })
  .strict();

export const GeoJsonGeometry = z.object({
  type: z.enum(["LineString", "MultiLineString"]),
  coordinates: z.array(z.any()).min(1),
});

export const SegmentFeature = z.object({
  type: z.literal("Feature"),
  id: z.string().optional(),
  geometry: GeoJsonGeometry,
  properties: Segment,
});

export const NetworkCollection = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(SegmentFeature),
});

export const CorridorList = z.array(Corridor);
export const CorridorSourceList = z.array(CorridorSource);

export type SegmentStatus = z.infer<typeof SegmentStatus>;
export type Segment = z.infer<typeof Segment>;
export type Corridor = z.infer<typeof Corridor>;
export type CorridorSource = z.infer<typeof CorridorSource>;
export type SegmentOverride = z.infer<typeof SegmentOverride>;
export type SegmentFeature = z.infer<typeof SegmentFeature>;
export type NetworkCollection = z.infer<typeof NetworkCollection>;
