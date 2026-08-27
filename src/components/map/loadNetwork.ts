import type { TrailCollection } from "../../hooks/useTrailMap";

let cached: TrailCollection | null = null;
let inflight: Promise<TrailCollection> | null = null;

export function loadNetworkClient(): Promise<TrailCollection> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch("/data/network.geojson")
    .then((response) => {
      if (!response.ok) throw new Error(`network.geojson ${response.status}`);
      return response.json() as Promise<TrailCollection>;
    })
    .then((data) => {
      cached = data;
      inflight = null;
      return data;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}
