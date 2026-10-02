// Doer: Parse simple scalar value in TOML
function parseTomlValue(raw: string): any {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => parseTomlValue(s.trim()));
  }
  return v;
}

// Coordinator: Parse TOML configuration text into nested JavaScript object
export function parseToml(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentSection = result;
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section header [section] or [section.subsection]
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const sectionName = trimmed.slice(1, -1).trim();
      const parts = sectionName.split(".");
      let target = result;
      for (const p of parts) {
        if (!target[p] || typeof target[p] !== "object") {
          target[p] = {};
        }
        target = target[p];
      }
      currentSection = target;
      continue;
    }

    // Key-value pair
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const valStr = trimmed.slice(eqIdx + 1).trim();
      currentSection[key] = parseTomlValue(valStr);
    }
  }

  return result;
}

// Doer: Resolve nested path like "server.port" from document
function resolveKeyPath(doc: Record<string, any>, keyPath: string): any {
  const parts = keyPath.split(".");
  let cur: any = doc;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

// Doer: Typed string accessor
export function getString(doc: Record<string, any>, keyPath: string, fallback = ""): string {
  const val = resolveKeyPath(doc, keyPath);
  return val !== undefined ? String(val) : fallback;
}

// Doer: Typed integer accessor
export function getInt(doc: Record<string, any>, keyPath: string, fallback = 0): number {
  const val = resolveKeyPath(doc, keyPath);
  if (typeof val === "number") return Math.floor(val);
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// Doer: Typed boolean accessor
export function getBool(doc: Record<string, any>, keyPath: string, fallback = false): boolean {
  const val = resolveKeyPath(doc, keyPath);
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
  return fallback;
}

// Doer: Typed array accessor
export function getArray<T = any>(doc: Record<string, any>, keyPath: string, fallback: T[] = []): T[] {
  const val = resolveKeyPath(doc, keyPath);
  return Array.isArray(val) ? (val as T[]) : fallback;
}

export const tomlutils = {
  parseToml,
  getString,
  getInt,
  getBool,
  getArray,
};
