"use client";

import type { ModelDef, ModelField } from "@/lib/models";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/media-upload";
import { MultiImageUpload } from "./multi-image-upload";

export type FormValue = string | boolean | string[] | null;
export type FormValues = Record<string, FormValue>;

/** Initial form state for a model: field defaults, empty otherwise. */
export function buildDefaults(model: ModelDef): FormValues {
  const values: FormValues = {};
  for (const f of model.fields) {
    switch (f.type) {
      case "boolean":
        values[f.name] = typeof f.default === "boolean" ? f.default : false;
        break;
      case "image":
      case "audio":
        values[f.name] = null;
        break;
      case "images":
        values[f.name] = [];
        break;
      default:
        values[f.name] = f.default != null ? String(f.default) : "";
    }
  }
  return values;
}

/** Labels of required fields that are still empty. Generate stays disabled while any remain. */
export function missingRequired(model: ModelDef, values: FormValues): string[] {
  const missing: string[] = [];
  for (const f of model.fields) {
    if (!f.required) continue;
    const v = values[f.name];
    const ok =
      f.type === "images"
        ? Array.isArray(v) && v.length > 0
        : f.type === "boolean"
          ? true
          : typeof v === "string" && v.trim() !== "";
    if (!ok) missing.push(f.label);
  }
  return missing;
}

/**
 * Params for POST /api/generate/model. Empty optionals are omitted. Media fields
 * follow their wrap: "bare" submits the plain URL string (or string array),
 * "ref" (the default) wraps into { type: "image_url", image_url } style objects.
 */
export function buildParams(model: ModelDef, values: FormValues): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const f of model.fields) {
    const v = values[f.name];
    switch (f.type) {
      case "text":
      case "textarea":
      case "url": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s !== "") params[f.name] = s;
        break;
      }
      case "number": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s !== "" && !Number.isNaN(Number(s))) params[f.name] = Number(s);
        break;
      }
      case "select": {
        const s = typeof v === "string" ? v : "";
        if (s !== "") params[f.name] = f.coerce === "number" ? Number(s) : s;
        break;
      }
      case "boolean": {
        params[f.name] = v === true;
        break;
      }
      case "image": {
        if (typeof v === "string" && v !== "") {
          params[f.name] = f.wrap === "bare" ? v : { type: "image_url", image_url: v };
        }
        break;
      }
      case "audio": {
        if (typeof v === "string" && v !== "") {
          params[f.name] = f.wrap === "bare" ? v : { type: "audio_url", audio_url: v };
        }
        break;
      }
      case "images": {
        if (Array.isArray(v) && v.length > 0) {
          params[f.name] =
            f.wrap === "bare" ? v : v.map((url) => ({ type: "image_url", image_url: url }));
        }
        break;
      }
    }
  }
  return params;
}

function labelFor(f: ModelField): string {
  return f.required ? `${f.label} · required` : f.label;
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ModelField;
  value: FormValue;
  onChange: (name: string, value: FormValue) => void;
}) {
  const id = `pg-${field.name}`;
  const label = labelFor(field);
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "textarea":
      return (
        <Field label={label} htmlFor={id} help={field.help}>
          <Textarea
            id={id}
            rows={3}
            value={text}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        </Field>
      );
    case "text":
      return (
        <Field label={label} htmlFor={id} help={field.help}>
          <Input id={id} type="text" value={text} onChange={(e) => onChange(field.name, e.target.value)} />
        </Field>
      );
    case "url":
      return (
        <Field label={label} htmlFor={id} help={field.help}>
          <Input
            id={id}
            type="url"
            placeholder="https://"
            value={text}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        </Field>
      );
    case "number":
      return (
        <Field label={label} htmlFor={id} help={field.help}>
          <Input
            id={id}
            type="number"
            className="font-mono"
            min={field.min}
            max={field.max}
            step={field.step}
            value={text}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        </Field>
      );
    case "select":
      return (
        <Field label={label} htmlFor={id} help={field.help}>
          <Select id={id} value={text} onChange={(e) => onChange(field.name, e.target.value)}>
            {text === "" && (
              <option value="" disabled>
                Choose
              </option>
            )}
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "boolean":
      return (
        <div className="flex min-h-[62px] flex-col justify-center py-1.5">
          <Switch checked={value === true} onChange={(v) => onChange(field.name, v)} label={label} />
          {field.help && <p className="mt-1.5 text-[13px] text-ink-400">{field.help}</p>}
        </div>
      );
    case "image":
      return (
        <MediaUpload
          label={label}
          kind="image"
          value={typeof value === "string" ? value : null}
          onChange={(url) => onChange(field.name, url)}
          help={field.help}
        />
      );
    case "audio":
      return (
        <MediaUpload
          label={label}
          kind="audio"
          value={typeof value === "string" ? value : null}
          onChange={(url) => onChange(field.name, url)}
          help={field.help}
        />
      );
    case "images":
      return (
        <MultiImageUpload
          label={label}
          value={Array.isArray(value) ? value : []}
          onChange={(urls) => onChange(field.name, urls)}
          max={field.max ?? 4}
          help={field.help}
        />
      );
  }
}

/** Renders a model's fields: textareas first, media next, everything else in a two column grid on sm+. */
export function ModelForm({
  model,
  values,
  onChange,
}: {
  model: ModelDef;
  values: FormValues;
  onChange: (name: string, value: FormValue) => void;
}) {
  const isMedia = (f: ModelField) => f.type === "image" || f.type === "images" || f.type === "audio";
  const textareas = model.fields.filter((f) => f.type === "textarea");
  const media = model.fields.filter(isMedia);
  const rest = model.fields.filter((f) => f.type !== "textarea" && !isMedia(f));

  return (
    <div className="space-y-4">
      {textareas.map((f) => (
        <FieldControl key={f.name} field={f} value={values[f.name] ?? null} onChange={onChange} />
      ))}
      {media.map((f) => (
        <FieldControl key={f.name} field={f} value={values[f.name] ?? null} onChange={onChange} />
      ))}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rest.map((f) => (
            <FieldControl key={f.name} field={f} value={values[f.name] ?? null} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}
