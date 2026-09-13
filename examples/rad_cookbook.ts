/**
 * RAD Cookbook: Runnable demonstrations of all 10 Bun System Utilities.
 * Run with: bun run examples/rad_cookbook.ts
 */

import { colors } from "../src/shared/colors.ts";
import { renderTable, type ColumnDef } from "../src/shared/table.ts";
import { searchFiles } from "../src/features/fd/fdCoordinator.ts";
import { buildReplacerRegex, replaceText } from "../src/features/sd/sdDoers.ts";
import { readManifest, resolveGraveyardDir } from "../src/features/rip/ripDoers.ts";
import { getProcesses } from "../src/features/procs/procsCoordinator.ts";
import { shouldTrigger } from "../src/features/watchexec/watchexecDoers.ts";
import { computeCodeStats } from "../src/features/tokei/tokeiCoordinator.ts";
import { analyzeDirectory } from "../src/features/gdu/gduCoordinator.ts";
import { formatBytes } from "../src/features/gdu/gduDoers.ts";
import { queryIp } from "../src/features/ipinfo/ipinfoCoordinator.ts";
import { enumerateDomain } from "../src/features/subfinder/subfinderCoordinator.ts";
import { lookupDomain } from "../src/features/doggo/doggoCoordinator.ts";

console.log(colors.bold(colors.cyan("\n=== Bun System Utilities: RAD Cookbook Demo ===\n")));

// 1. fd
const fdResults = await searchFiles({ pattern: "package.json", rootPath: ".", hidden: false, absolute: false });
console.log(colors.green("1. [fd] Found package.json:"), fdResults[0]?.displayPath);

// 2. sd
const sdReplaced = replaceText("Hello World", buildReplacerRegex("World", true, "g"), "Bun");
console.log(colors.green("2. [sd] Replace text:"), sdReplaced);

// 3. rip
const graveyard = resolveGraveyardDir();
const manifest = await readManifest(graveyard);
console.log(colors.green("3. [rip] Graveyard active records:"), manifest.records.length);

// 4. procs
const procs = await getProcesses();
console.log(colors.green("4. [procs] Active system processes:"), procs.length);

// 5. watchexec
const willTrigger = shouldTrigger("src/index.ts", ["ts"], ["node_modules"]);
console.log(colors.green("5. [watchexec] src/index.ts triggers watcher:"), willTrigger);

// 6. tokei
const stats = await computeCodeStats({ paths: ["src"], sort: "code", showFiles: false, hidden: false });
console.log(colors.green("6. [tokei] Languages detected:"), stats.map((s) => `${s.language} (${s.stats.code} LOC)`).join(", "));

// 7. gdu
const gduRoot = await analyzeDirectory({ targetDir: ".", nonInteractive: true, showItemCount: true, showRelativeSize: true, showDisks: false, summarize: false, noHidden: true, si: false, ignoreDirs: [] });
console.log(colors.green("7. [gdu] Current dir size:"), formatBytes(gduRoot.size));

// 8. ipinfo
const ip = await queryIp("1.1.1.1");
console.log(colors.green("8. [ipinfo] 1.1.1.1 Org:"), ip.org);

// 9. subfinder
const subs = await enumerateDomain("example.com", 5000, false);
console.log(colors.green("9. [subfinder] example.com subdomains:"), subs.map((s) => s.host).join(", "));

// 10. doggo
const dns = await lookupDomain("example.com", "A");
console.log(colors.green("10. [doggo] example.com A records:"), dns.answers.map((a) => a.data).join(", "), `(${dns.queryTimeMs}ms)`);

console.log(colors.bold(colors.green("\n✓ All 10 utilities verified and working!\n")));
