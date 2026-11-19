#!/usr/bin/env node
/**
 * Deterministically generates src/data/models.json from docs/higgsfield-openapi.json
 * plus the verified v1 Speak route (/v1/speak/higgsfield).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const specPath = path.join(root, "docs", "higgsfield-openapi.json");
const outPath = path.join(root, "src", "data", "models.json");

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const FAMILY_LABELS = {
  "higgsfield-ai": "Higgsfield",
  "veo3.1": "Google Veo 3.1",
  bytedance: "ByteDance Seedance",
  "flux-pro": "Flux Pro",
  "kling-video": "Kling Video",
  minimax: "MiniMax Hailuo",
  "nano-banana": "Nano Banana",
  reve: "Reve",
  "sora-2": "OpenAI Sora 2",
  "wan-25-preview": "Wan 2.5",
};

function titleCase(str) {
  return str
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferOutput(endpoint, op) {
  const lower = `${endpoint} ${op?.summary ?? ""} ${op?.description ?? ""}`.toLowerCase();
  if (
    lower.includes("video") ||
    lower.includes("/dop/") ||
    lower.includes("/veo") ||
    lower.includes("/sora") ||
    lower.includes("/kling") ||
    lower.includes("/hailuo") ||
    lower.includes("/seedance") ||
    lower.includes("/wan-")
  ) {
    return "video";
  }
  return "image";
}

function resolveProp(prop) {
  if (!prop) return {};
  if (prop.anyOf && Array.isArray(prop.anyOf)) {
    const nonNull = prop.anyOf.find((s) => s.type !== "null") ?? prop.anyOf[0];
    return { ...prop, ...nonNull };
  }
  return prop;
}

function mapField(name, rawProp, required) {
  const prop = resolveProp(rawProp);
  const label = prop.title || titleCase(name);
  const help = typeof prop.description === "string" ? prop.description.trim() : undefined;

  // Skip complex nested array-of-objects fields (e.g. DoP motions handled on Create Video)
  if (prop.type === "array" && prop.items?.type === "object") {
    return null;
  }

  // Image arrays
  if (
    prop.type === "array" &&
    (name.includes("image") || name.includes("frame")) &&
    prop.items?.type === "string"
  ) {
    return {
      name,
      label,
      type: "images",
      required,
      wrap: "bare",
      max: prop.maxItems ?? 4,
      ...(help ? { help } : {}),
    };
  }

  // Single image URL fields
  if (
    prop.type === "string" &&
    (name === "image_url" ||
      name === "end_image_url" ||
      name === "last_image_url" ||
      name === "first_image_url" ||
      name === "start_image_url" ||
      name === "tail_image_url" ||
      name.endsWith("_image_url"))
  ) {
    return {
      name,
      label,
      type: "image",
      required,
      wrap: "bare",
      ...(help ? { help } : {}),
    };
  }

  // Audio URL fields
  if (prop.type === "string" && name.includes("audio")) {
    return {
      name,
      label,
      type: "audio",
      required,
      wrap: "bare",
      ...(help ? { help } : {}),
    };
  }

  // Enum / select
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    const isNum = prop.type === "integer" || prop.type === "number" || typeof prop.enum[0] === "number";
    return {
      name,
      label,
      type: "select",
      required,
      options: prop.enum.map(String),
      ...(prop.default !== undefined ? { default: String(prop.default) } : {}),
      ...(isNum ? { coerce: "number" } : {}),
      ...(help ? { help } : {}),
    };
  }

  // Boolean
  if (prop.type === "boolean") {
    return {
      name,
      label,
      type: "boolean",
      required,
      ...(typeof prop.default === "boolean" ? { default: prop.default } : {}),
      ...(help ? { help } : {}),
    };
  }

  // Number / integer
  if (prop.type === "integer" || prop.type === "number") {
    return {
      name,
      label,
      type: "number",
      required,
      ...(prop.default !== undefined ? { default: prop.default } : {}),
      ...(prop.minimum !== undefined ? { min: prop.minimum } : {}),
      ...(prop.maximum !== undefined ? { max: prop.maximum } : {}),
      ...(prop.type === "number" ? { step: 0.1 } : { step: 1 }),
      ...(help ? { help } : {}),
    };
  }

  // Prompt / textarea
  if (name === "prompt" || name === "negative_prompt" || name.includes("prompt")) {
    return {
      name,
      label,
      type: "textarea",
      required,
      ...(typeof prop.default === "string" ? { default: prop.default } : {}),
      ...(help ? { help } : {}),
    };
  }

  // Generic URL
  if (name.includes("url") || prop.format === "uri") {
    return {
      name,
      label,
      type: "url",
      required,
      ...(help ? { help } : {}),
    };
  }

  // Plain string
  if (prop.type === "string" || !prop.type) {
    return {
      name,
      label,
      type: "text",
      required,
      ...(typeof prop.default === "string" ? { default: prop.default } : {}),
      ...(help ? { help } : {}),
    };
  }

  return null;
}

const models = [];

for (const [endpoint, item] of Object.entries(spec.paths ?? {})) {
  if (!item?.post) continue;
  const op = item.post;
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  if (!schema || !schema.properties) continue;

  const segments = endpoint.replace(/^\//, "").split("/");
  const familyKey = segments[0];
  const family = FAMILY_LABELS[familyKey] ?? titleCase(familyKey);
  const id = segments.join("--");
  const label =
    segments.length > 1
      ? segments.slice(1).map(titleCase).join(" · ")
      : family;
  const requiredSet = new Set(schema.required ?? []);

  const fields = [];
  for (const [propName, rawProp] of Object.entries(schema.properties)) {
    const mapped = mapField(propName, rawProp, requiredSet.has(propName));
    if (mapped) fields.push(mapped);
  }

  models.push({
    id,
    family,
    label,
    endpoint,
    output: inferOutput(endpoint, op),
    verified: true,
    fields,
  });
}

// Add verified v1 Speak route
models.push({
  id: "v1--speak--higgsfield",
  family: "Higgsfield",
  label: "Speak · Talking Avatar (v1)",
  endpoint: "/v1/speak/higgsfield",
  output: "video",
  verified: true,
  fields: [
    { name: "prompt", label: "Direction Prompt", type: "textarea", required: false },
    { name: "input_image", label: "Portrait Image", type: "image", required: true, wrap: "ref" },
    { name: "input_audio", label: "Audio Track (WAV)", type: "audio", required: true, wrap: "ref" },
    {
      name: "quality",
      label: "Quality",
      type: "select",
      options: ["mid", "high"],
      default: "high",
    },
    {
      name: "duration",
      label: "Duration (s)",
      type: "select",
      options: ["5", "10", "15"],
      default: "5",
      coerce: "number",
    },
  ],
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ generatedAt: "2026-11-19", count: models.length, models }, null, 2) + "\n");
console.log(`Generated ${models.length} verified models -> ${path.relative(root, outPath)}`);
