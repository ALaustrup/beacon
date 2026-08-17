declare module "world-atlas/land-110m.json" {
  import type { Topology } from "topojson-specification";
  const value: Topology<{ land: { type: "GeometryCollection"; geometries: unknown[] } }>;
  export default value;
}
