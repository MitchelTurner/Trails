/** Revillagigedo Island plus a tight water buffer. EPSG:4326 [west, south, east, north]. */
export const REVILLA_BBOX = {
  west: -131.82,
  south: 55.2,
  east: -131.0,
  north: 55.82,
} as const;

export const REVILLA_BBOX_ARRAY: [number, number, number, number] = [
  REVILLA_BBOX.west,
  REVILLA_BBOX.south,
  REVILLA_BBOX.east,
  REVILLA_BBOX.north,
];

export const SNAP_METERS = 180;

export const STATUS_LABEL: Record<
  "existing" | "needs-work" | "under-construction" | "proposed",
  string
> = {
  existing: "Existing",
  "needs-work": "Needs work",
  "under-construction": "Under construction",
  proposed: "Proposed",
};

export const SURFACE_LABEL = {
  boardwalk: "Boardwalk",
  gravel: "Gravel",
  native: "Native",
  rock: "Rock",
  unbuilt: "Unbuilt",
} as const;

export const DIFFICULTY_LABEL = {
  easy: "Easy",
  moderate: "Moderate",
  difficult: "Difficult",
} as const;

export const CONCEPTUAL_SOURCE = "hand-drawn-concept";
