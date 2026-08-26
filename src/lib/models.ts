import catalog from "@/data/models.json";

export interface ModelField {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "select"
    | "image"
    | "images"
    | "audio"
    | "url";
  required?: boolean;
  options?: string[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  /** For select fields whose values the API wants as numbers. */
  coerce?: "number";
  /**
   * How media URLs are submitted for image/images/audio fields:
   * - "bare": the plain URL string (or string array for `images`), e.g. v2 `image_url`.
   * - "ref" (default): wrapped as `{ type: "image_url", image_url }` objects, e.g. `input_images`.
   */
  wrap?: "bare" | "ref";
  help?: string;
}

export interface ModelDef {
  id: string;
  family: string;
  label: string;
  endpoint: string;
  output: "video" | "image";
  /**
   * true = route and params confirmed against docs/higgsfield-openapi.json
   * (v2 routes) or the official SDK (the v1 speak route).
   * false = seeded from a catalog snapshot; check before relying on it.
   */
  verified: boolean;
  fields: ModelField[];
}

export function listModels(): ModelDef[] {
  return (catalog as { models: ModelDef[] }).models;
}

export function getModel(id: string): ModelDef | undefined {
  return listModels().find((m) => m.id === id);
}
