import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { colors } from "../../shared/colors.ts";
import type { DiffHunk } from "./sdTypes.ts";

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildReplacerRegex(
  find: string,
  stringMode: boolean,
  flags: string = "",
  ignoreCase?: boolean,
  wholeWord?: boolean
): RegExp {
  let pattern = stringMode ? escapeRegExp(find) : find;
  if (wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }
  const safeFlags = flags || "";
  let activeFlags = safeFlags.includes("g") ? safeFlags : `${safeFlags}g`;
  if (ignoreCase && !activeFlags.includes("i")) {
    activeFlags += "i";
  }
  return new RegExp(pattern, activeFlags);
}

export async function createBackup(filePath: string, backupExt: string): Promise<string> {
  const ext = backupExt.startsWith(".") ? backupExt : `.${backupExt}`;
  const backupPath = `${filePath}${ext}`;
  const content = await Bun.file(filePath).text();
  await Bun.write(backupPath, content);
  return backupPath;
}

export function countMatches(content: string, regex: RegExp): number {
  return (content.match(regex) ?? []).length;
}

export async function expandTargets(
  targets: string[],
  ignores: string[] = ["node_modules", ".git", ".graveyard", "dist", "build"]
): Promise<string[]> {
  const filePaths: string[] = [];
  for (const target of targets) {
    if (target === "-") {
      filePaths.push("-");
      continue;
    }
    try {
      const s = await stat(target);
      if (s.isDirectory()) {
        const entries = await readdir(target, { withFileTypes: true });
        const subTargets = entries
          .filter((e) => !ignores.includes(e.name) && !e.name.startsWith("."))
          .map((e) => join(target, e.name));
        const expanded = await expandTargets(subTargets, ignores);
        filePaths.push(...expanded);
      } else if (s.isFile()) {
        filePaths.push(target);
      }
    } catch {
      // File not found or unreadable
    }
  }
  return filePaths;
}

export function replaceText(
  content: string,
  regex: RegExp,
  replacement: string
): string {
  // Support $1, $2, etc., capture groups in regex replacements
  return content.replaceAll(regex, replacement);
}

export function computeDiffHunks(
  original: string,
  modified: string
): DiffHunk[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const hunks: DiffHunk[] = [];

  const max = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < max; i++) {
    const orig = origLines[i] ?? "";
    const mod = modLines[i] ?? "";
    if (orig !== mod) {
      hunks.push({ lineNumber: i + 1, original: orig, modified: mod });
    }
  }
  return hunks;
}

export function formatDiffPreview(filePath: string, hunks: DiffHunk[]): string {
  if (hunks.length === 0) return "";
  const header = colors.bold(colors.cyan(`--- ${filePath} ---`));
  const diffLines = hunks.map((h) => {
    const lineNum = colors.dim(`[L${h.lineNumber}]`);
    const del = colors.red(`- ${h.original}`);
    const add = colors.green(`+ ${h.modified}`);
    return `${lineNum}\n${del}\n${add}`;
  });
  return `${header}\n${diffLines.join("\n")}`;
}

export async function readContent(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`[SdRead] File not found: ${filePath}`);
  }
  return await file.text();
}

export async function writeContent(
  filePath: string,
  content: string
): Promise<number> {
  return await Bun.write(filePath, content);
}
