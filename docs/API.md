# Bun System Utilities: RAD API Reference & Cookbook

A high-performance suite of modern system utilities (`fd`, `sd`, `rip`, `procs`, `watchexec`, `tokei`, `gdu`, `ipinfo`, `subfinder`, `doggo`) written in TypeScript for the Bun runtime.

Built for **Rapid Application Development (RAD)** using the **Single Responsibility (Doer vs. Coordinator)** pattern and **Feature-First** architecture from [AGENTS.md](../AGENTS.md).

---

## Architecture Overview

All features strictly separate single-responsibility worker functions (**Doers**) from workflow orchestrators (**Coordinators**):

- **Doers (`*Doers.ts`)**: Pure calculations, validations, or single I/O actions (5–25 lines). No side effects or cross-domain dependencies.
- **Coordinators (`*Coordinator.ts`)**: Orchestrate Doers linearly like a recipe.
- **Types (`*Types.ts`)**: Plain data interfaces and record definitions.
- **CLI (`*Cli.ts`)**: Argument parsing and terminal invocation.

---

## Dedicated Feature API Guides

Each utility has its own self-contained API documentation and complete code examples:

| Utility | Location | Description |
| :--- | :--- | :--- |
| **`fd`** | [`src/features/fd/README.md`](../src/features/fd/README.md) | File & directory search with regex, type filters, and command execution |
| **`sd`** | [`src/features/sd/README.md`](../src/features/sd/README.md) | In-place regex substitution, literal string mode, and dry-run diffs |
| **`rip`** | [`src/features/rip/README.md`](../src/features/rip/README.md) | Safe deletion to graveyard, instant undo / unbury, and seance listing |
| **`procs`** | [`src/features/procs/README.md`](../src/features/procs/README.md) | Process monitoring, keyword search, CPU/MEM sorting, and process tree |
| **`watchexec`** | [`src/features/watchexec/README.md`](../src/features/watchexec/README.md) | File watching, debouncing, ignore filters, and process restart |
| **`tokei`** | [`src/features/tokei/README.md`](../src/features/tokei/README.md) | Code counter: lines, blanks, comments, and code across 20+ languages |
| **`gdu`** | [`src/features/gdu/README.md`](../src/features/gdu/README.md) | Recursive directory disk usage, relative visual bars, and mounted disks |
| **`ipinfo`** | [`src/features/ipinfo/README.md`](../src/features/ipinfo/README.md) | IP geolocation, ASN, organization, coordinates, and network lookup |
| **`subfinder`** | [`src/features/subfinder/README.md`](../src/features/subfinder/README.md) | Passive subdomain discovery via public intelligence sources + active DNS |
| **`doggo`** | [`src/features/doggo/README.md`](../src/features/doggo/README.md) | Modern DNS client: A, AAAA, MX, TXT, CNAME, SOA, CAA with `@nameserver` |

---

## 1. `fd` (Fast File & Directory Search)

Colocated under `src/features/fd/`.

### Types (`fdTypes.ts`)

```typescript
export type EntryTypeFilter = "f" | "d" | "l" | "x";

export interface FdOptions {
  pattern?: string;
  rootPath: string;
  typeFilter?: EntryTypeFilter;
  extension?: string;
  hidden: boolean;
  maxDepth?: number;
  minDepth?: number;
  changedWithin?: string;
  empty?: boolean;
  sizeFilter?: string;
  exclude?: string[];
  absolute: boolean;
  caseSensitive?: boolean;
  execCmd?: string[];
}

export interface FdEntry {
  path: string;
  displayPath: string;
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  isExecutable: boolean;
  depth: number;
  size?: number;
  mtime?: Date;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Search files by extension and pattern
```typescript
import { searchFiles } from "./src/features/fd/fdCoordinator.ts";

// Find all TypeScript files matching "test"
const files = await searchFiles({
  pattern: "test",
  rootPath: "src",
  extension: "ts",
  hidden: false,
  absolute: false,
});

for (const file of files) {
  console.log(`${file.displayPath} (depth: ${file.depth})`);
}
```

#### Recipe 2: Find directories only with depth limit
```typescript
import { searchFiles } from "./src/features/fd/fdCoordinator.ts";

const dirs = await searchFiles({
  rootPath: ".",
  typeFilter: "d",
  maxDepth: 2,
  hidden: false,
  absolute: true,
});

const dirPaths = dirs.map((d) => d.path);
console.log(dirPaths);
```

#### Recipe 3: Execute a command on search matches (like `-x`)
```typescript
import { runFdCoordinator } from "./src/features/fd/fdCoordinator.ts";

// Executes "ls -lh <match>" on each package.json found
await runFdCoordinator({
  pattern: "package.json",
  rootPath: ".",
  hidden: false,
  absolute: true,
  execCmd: ["ls", "-lh", "{}"],
});
```

#### Recipe 4: Low-level matching with pure Doers
```typescript
import { buildMatcher, matchesExtension, matchesType } from "./src/features/fd/fdDoers.ts";

const matcher = buildMatcher("config"); // Smart-case matcher
console.log(matcher("tsconfig.json", "src/tsconfig.json")); // true

const isTs = matchesExtension("server.ts", "ts"); // true
```

---

## 2. `sd` (Search & Displace / Sed Alternative)

Colocated under `src/features/sd/`.

### Types (`sdTypes.ts`)

```typescript
export interface SdOptions {
  findPattern: string;
  replacePattern: string;
  files: string[];
  stringMode: boolean;
  flags: string;
  preview: boolean;
  countOnly?: boolean;
  ignoreCase?: boolean;
  backupExt?: string;
  wholeWord?: boolean;
  quiet?: boolean;
}

export interface DiffHunk {
  lineNumber: number;
  original: string;
  modified: string;
}

export interface FileTransformResult {
  filePath: string;
  hasChanged: boolean;
  originalContent: string;
  newContent: string;
  diffHunks: DiffHunk[];
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: In-place file replacement with regex capture groups
```typescript
import { runSdCoordinator } from "./src/features/sd/sdCoordinator.ts";

// Replaces "version: 1.0.0" -> "version: 2.0.0" in files
const results = await runSdCoordinator({
  findPattern: "version: (\\d+)\\.(\\d+)\\.(\\d+)",
  replacePattern: "version: 2.0.0",
  files: ["package.json"],
  stringMode: false,
  flags: "g",
  preview: false,
});
console.log(results); // ["Updated package.json (1 changes)"]
```

#### Recipe 2: Dry-run diff preview without modifying disk
```typescript
import { runSdCoordinator } from "./src/features/sd/sdCoordinator.ts";

const previewDiff = await runSdCoordinator({
  findPattern: "Bun System Utilities",
  replacePattern: "Bun Power Tools",
  files: ["index.ts"],
  stringMode: true,
  flags: "g",
  preview: true,
});
console.log(previewDiff[0]); // Prints colored unified diff
```

#### Recipe 3: Single file transformation with structured diff hunks
```typescript
import { processFile } from "./src/features/sd/sdCoordinator.ts";
import { buildReplacerRegex } from "./src/features/sd/sdDoers.ts";

const regex = buildReplacerRegex("localhost:\\d+", false, "g");
const result = await processFile("config.json", regex, "api.production.com");

if (result.hasChanged) {
  console.log(`Changed ${result.filePath}:`);
  for (const hunk of result.diffHunks) {
    console.log(`Line ${hunk.lineNumber}: -${hunk.original} +${hunk.modified}`);
  }
}
```

#### Recipe 4: In-memory string replacement
```typescript
import { buildReplacerRegex, replaceText } from "./src/features/sd/sdDoers.ts";

const regex = buildReplacerRegex("foo-(\\w+)", false, "g");
const output = replaceText("foo-bar foo-baz", regex, "qux-$1");
console.log(output); // "qux-bar qux-baz"
```

---

## 3. `rip` / `rip2` (Safe Removal with Graveyard & Undo)

Colocated under `src/features/rip/`.

### Types (`ripTypes.ts`)

```typescript
export interface GraveyardRecord {
  id: string;
  originalPath: string;
  graveyardPath: string;
  deletedAt: string;
  isDirectory: boolean;
  size: number;
}

export interface GraveyardManifest {
  version: number;
  records: GraveyardRecord[];
}

export interface RipOptions {
  targets: string[];
  unbury: boolean;
  unburyTarget?: string;
  seance: boolean;
  decompose: boolean;
  permanent: boolean;
  verbose: boolean;
  graveyardDir?: string;
  infoTarget?: string;
  pruneDays?: number;
  dryRun?: boolean;
  showSize?: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Safely bury a file or directory into graveyard
```typescript
import { buryTarget } from "./src/features/rip/ripCoordinator.ts";
import { resolveGraveyardDir } from "./src/features/rip/ripDoers.ts";

const graveyard = resolveGraveyardDir();
const record = await buryTarget("temp.txt", graveyard);

console.log(`Buried: ${record.originalPath}`);
console.log(`Graveyard ID: ${record.id}`);
console.log(`Deleted at: ${record.deletedAt}`);
```

#### Recipe 2: Undelete / Unbury the last deleted file
```typescript
import { unburyTarget } from "./src/features/rip/ripCoordinator.ts";
import { resolveGraveyardDir } from "./src/features/rip/ripDoers.ts";

const graveyard = resolveGraveyardDir();
const restored = await unburyTarget(graveyard);
console.log(`Restored back to: ${restored.originalPath}`);
```

#### Recipe 3: Restore a specific file by filename query
```typescript
import { unburyTarget } from "./src/features/rip/ripCoordinator.ts";
import { resolveGraveyardDir } from "./src/features/rip/ripDoers.ts";

const graveyard = resolveGraveyardDir();
// Restores the most recent deleted item containing "report.pdf"
const restored = await unburyTarget(graveyard, "report.pdf");
console.log(`Restored: ${restored.originalPath}`);
```

#### Recipe 4: Inspect graveyard contents (Seance)
```typescript
import { readManifest, resolveGraveyardDir } from "./src/features/rip/ripDoers.ts";

const graveyard = resolveGraveyardDir();
const manifest = await readManifest(graveyard);

console.log(`Graveyard contains ${manifest.records.length} buried item(s):`);
for (const item of manifest.records) {
  console.log(`- ${item.originalPath} (${item.size} bytes, ID: ${item.id})`);
}
```

#### Recipe 5: Permanently purge all buried files (Decompose)
```typescript
import { decomposeGraveyard } from "./src/features/rip/ripCoordinator.ts";
import { resolveGraveyardDir } from "./src/features/rip/ripDoers.ts";

const graveyard = resolveGraveyardDir();
const purgedCount = await decomposeGraveyard(graveyard);
console.log(`Purged ${purgedCount} items from graveyard.`);
```

---

## 4. `procs` (Modern Process Viewer)

Colocated under `src/features/procs/`.

### Types (`procsTypes.ts`)

```typescript
export type SortField = "cpu" | "mem" | "pid" | "user";

export interface ProcessInfo {
  pid: number;
  ppid: number;
  user: string;
  cpu: number;
  mem: number;
  stat: string;
  time: string;
  command: string;
  ports?: string[];
}

export interface ProcessTreeNode {
  process: ProcessInfo;
  children: ProcessTreeNode[];
}

export interface ProcsOptions {
  keyword?: string;
  user?: string;
  tree: boolean;
  sortBy?: SortField;
  watch: boolean;
  limit?: number;
  json?: boolean;
  ports?: boolean;
  killPid?: number;
  signal?: string;
  interactive?: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Get processes filtered by keyword and sorted by CPU
```typescript
import { getProcesses } from "./src/features/procs/procsCoordinator.ts";

// Find all processes matching "bun" sorted by CPU usage
const processes = await getProcesses("bun", "cpu");

for (const p of processes) {
  console.log(`PID ${p.pid} (${p.user}): ${p.cpu}% CPU, ${p.mem}% MEM - ${p.command}`);
}
```

#### Recipe 2: Build and traverse the hierarchical process tree
```typescript
import { getProcesses } from "./src/features/procs/procsCoordinator.ts";
import { buildProcessTree, formatTreeLines } from "./src/features/procs/procsDoers.ts";

const processes = await getProcesses();
const tree = buildProcessTree(processes);
const treeLines = formatTreeLines(tree);

console.log(treeLines.slice(0, 20).join("\n"));
```

#### Recipe 3: Render formatted process table as string
```typescript
import { runProcsCoordinator } from "./src/features/procs/procsCoordinator.ts";

const tableOutput = await runProcsCoordinator({
  keyword: "node",
  tree: false,
  sortBy: "mem",
  watch: false,
});
console.log(tableOutput);
```

#### Recipe 4: Low-level process collection & parsing
```typescript
import { fetchRawProcessList, parsePsOutput, sortProcesses } from "./src/features/procs/procsDoers.ts";

const raw = await fetchRawProcessList();
const procs = parsePsOutput(raw);
const sorted = sortProcesses(procs, "pid");
console.log(`Total active processes: ${sorted.length}`);
```

#### Recipe 5: Terminate process by PID and inspect listening ports
```typescript
import { killProcess, fetchListeningPorts, attachListeningPorts } from "./src/features/procs/procsDoers.ts";
import { getProcesses } from "./src/features/procs/procsCoordinator.ts";

// Terminate process cleanly (SIGTERM) or forcefully (SIGKILL)
// killProcess(12345, "SIGTERM");

// Enrich process list with active listening network ports
const procs = await getProcesses();
const portMap = await fetchListeningPorts();
const enriched = attachListeningPorts(procs, portMap);
for (const p of enriched.filter(p => p.ports && p.ports.length > 0)) {
  console.log(`PID ${p.pid} (${p.command}) listening on ports: ${p.ports.join(", ")}`);
}
```

#### Recipe 6: Interactive TUI state and action driving
```typescript
import { getProcesses } from "./src/features/procs/procsCoordinator.ts";
import { applyProcsTuiAction, renderProcsTuiFrame, type ProcsTuiState } from "./src/features/procs/procsTui.ts";

const procs = await getProcesses();
let state: ProcsTuiState = {
  allProcesses: procs,
  filteredProcesses: procs,
  selectedIndex: 0,
  scrollOffset: 0,
  sortBy: "cpu",
  filterQuery: "",
  isFiltering: false,
  isPaused: false,
  showingDetails: false,
  shouldExit: false,
};

// Filter live for "bun", then sort by memory
state = applyProcsTuiAction(state, { type: "FILTER_CHAR", char: "b" });
state = applyProcsTuiAction(state, { type: "SET_SORT", sortBy: "mem" });
console.log(renderProcsTuiFrame(state));
```

---

## 5. `watchexec` (File Watcher & Process Orchestrator)

Colocated under `src/features/watchexec/`.

### Types (`watchexecTypes.ts`)

```typescript
export interface WatchexecOptions {
  watchPaths: string[];
  command: string[];
  extensions?: string[];
  filterPatterns?: string[];
  ignorePatterns: string[];
  debounceMs: number;
  clear: boolean;
  restart: boolean;
  runOnStart: boolean;
  shell?: string;
}

export interface ProcessState {
  currentProcess: Subprocess | null;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Watch directory and run a command on change
```typescript
import { runWatchexecCoordinator } from "./src/features/watchexec/watchexecCoordinator.ts";

// Watches "src" for changes to .ts and .json files, restarting the test runner
const watcher = await runWatchexecCoordinator({
  watchPaths: ["src"],
  command: ["bun", "test"],
  extensions: ["ts", "json"],
  ignorePatterns: ["node_modules", ".git", "dist"],
  debounceMs: 150,
  clear: true,
  restart: true,
  runOnStart: true,
});

// To stop watcher programmatically later:
// watcher.close();
```

#### Recipe 2: Trigger custom code on file change (Doer composition)
```typescript
import { startWatcher } from "./src/features/watchexec/watchexecCoordinator.ts";
import type { ProcessState, WatchexecOptions } from "./src/features/watchexec/watchexecTypes.ts";

const state: ProcessState = { currentProcess: null };
const options: WatchexecOptions = {
  watchPaths: ["src"],
  command: [],
  extensions: ["ts"],
  ignorePatterns: ["node_modules"],
  debounceMs: 100,
  clear: false,
  restart: false,
  runOnStart: false,
};

const watcher = startWatcher(options, state, () => {
  console.log("TypeScript file changed at:", new Date().toLocaleTimeString());
});
```

#### Recipe 3: Pure filter checks
```typescript
import { shouldTrigger, matchesExtension, shouldIgnore } from "./src/features/watchexec/watchexecDoers.ts";

console.log(matchesExtension("server.ts", ["ts", "js"])); // true
console.log(shouldIgnore("node_modules/pkg/index.js", ["node_modules"])); // true
console.log(shouldTrigger("src/index.ts", ["ts"], ["node_modules"])); // true
```

---

## 6. `tokei` (Fast Code & LOC Counter)

Colocated under `src/features/tokei/`.

### Types (`tokeiTypes.ts`)

```typescript
export interface LineStats {
  lines: number;
  blank: number;
  comment: number;
  code: number;
}

export interface FileStat {
  path: string;
  language: string;
  stats: LineStats;
}

export interface LanguageReport {
  language: string;
  files: number;
  stats: LineStats;
  fileDetails: FileStat[];
}

export type TokeiSortField = "files" | "lines" | "blank" | "comment" | "code";

export interface TokeiOptions {
  paths: string[];
  sort: TokeiSortField;
  showFiles: boolean;
  hidden: boolean;
  json?: boolean;
  markdown?: boolean;
  excludes?: string[];
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Compute codebase statistics programmatically
```typescript
import { computeCodeStats } from "./src/features/tokei/tokeiCoordinator.ts";

const reports = await computeCodeStats({
  paths: ["."],
  sort: "code",
  showFiles: false,
  hidden: false,
});

for (const report of reports) {
  console.log(`${report.language}: ${report.files} files, ${report.stats.code} LOC (comments: ${report.stats.comment})`);
}
```

#### Recipe 2: Render formatted ASCII table
```typescript
import { runTokeiCoordinator } from "./src/features/tokei/tokeiCoordinator.ts";

const tableString = await runTokeiCoordinator({
  paths: ["src"],
  sort: "files",
  showFiles: false,
  hidden: false,
});
console.log(tableString);
```

#### Recipe 3: Analyze code lines in a string directly
```typescript
import { analyzeLines } from "./src/features/tokei/tokeiDoers.ts";

const snippet = `
// Initialize app
const port = 3000;

/*
 Multi-line
 explanation
*/
console.log(port);
`;

const stats = analyzeLines(snippet, {
  single: ["//"],
  multi: [["/*", "*/"]],
});
console.log(stats);
// { lines: 11, blank: 3, comment: 5, code: 2 }
```

#### Recipe 4: Export report as a GitHub-flavored Markdown table
```typescript
import { computeCodeStats } from "./src/features/tokei/tokeiCoordinator.ts";
import { formatMarkdownTable } from "./src/features/tokei/tokeiDoers.ts";

const reports = await computeCodeStats({ paths: ["src"], sort: "code", showFiles: false, hidden: false });
const markdown = formatMarkdownTable(reports);
console.log(markdown);
```

---

## 7. `gdu` / `gdu-go` (Pretty Fast Disk Usage Analyzer)

Colocated under `src/features/gdu/`.

### Types (`gduTypes.ts`)

```typescript
export interface DiskUsageItem {
  name: string;
  path: string;
  size: number;
  itemCount: number;
  isDirectory: boolean;
  mtime: Date;
  children?: DiskUsageItem[];
}

export interface MountedDisk {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  percentUsed: string;
  mountPoint: string;
}

export type GduSortBy = "size" | "name" | "count" | "mtime";

export interface GduOptions {
  targetDir: string;
  nonInteractive: boolean;
  showItemCount: boolean;
  showRelativeSize: boolean;
  showDisks: boolean;
  summarize: boolean;
  noHidden: boolean;
  top?: number;
  si: boolean;
  ignoreDirs: string[];
  maxDepth?: number;
  sortBy?: GduSortBy;
  minSize?: number | string;
  json?: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Scan directory and inspect top largest items
```typescript
import { analyzeDirectory } from "./src/features/gdu/gduCoordinator.ts";
import { formatBytes } from "./src/features/gdu/gduDoers.ts";

const root = await analyzeDirectory({
  targetDir: ".",
  nonInteractive: true,
  showItemCount: true,
  showRelativeSize: true,
  showDisks: false,
  summarize: false,
  noHidden: true,
  si: false,
  ignoreDirs: [],
});

console.log(`Total directory size: ${formatBytes(root.size)} (${root.itemCount} items)`);

// Top 5 largest child directories or files:
const top5 = (root.children ?? []).slice(0, 5);
for (const item of top5) {
  console.log(`${formatBytes(item.size)} - ${item.name} (${item.itemCount} items)`);
}
```

#### Recipe 2: Query mounted disks and storage capacity
```typescript
import { fetchMountedDisks } from "./src/features/gdu/gduDoers.ts";
import { formatBytes } from "./src/features/gdu/gduDoers.ts";

const disks = await fetchMountedDisks();
for (const disk of disks) {
  console.log(`${disk.mountPoint} (${disk.filesystem}): ${formatBytes(disk.used)} used / ${formatBytes(disk.size)} total (${disk.percentUsed})`);
}
```

#### Recipe 3: Format bytes and relative size bars
```typescript
import { formatBytes, formatCount, formatRelativeBar } from "./src/features/gdu/gduDoers.ts";

console.log(formatBytes(1024 * 1024 * 50)); // "  50.0 MiB"
console.log(formatBytes(1000 * 1000 * 50, true)); // "  50.0 MB"
console.log(formatCount(12500)); // "     12.5k"
console.log(formatRelativeBar(0.75, 10)); // "[########  ]"
```

#### Recipe 4: Pure Doers: File deletion, default app launcher, and byte parsing
```typescript
import { parseByteSize, deleteDiskItem, openItemInDefaultApp } from "./src/features/gdu/gduDoers.ts";

// Parse human readable size strings to bytes
const bytes = parseByteSize("500M"); // 524288000

// In-place deletion and default desktop app opening
// deleteDiskItem("/tmp/scratch-cache");
// openItemInDefaultApp("./README.md");
```

---

## 8. `ipinfo` / `ipinfo-cli` (IP Geolocation & ASN Details)

Colocated under `src/features/ipinfo/`.

### Types (`ipinfoTypes.ts`)

```typescript
export interface IpInfoResult {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  mapUrl?: string;
  readme?: string;
}

export interface SubnetInfo {
  cidr: string;
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
}

export interface LocalInterfaceInfo {
  name: string;
  address: string;
  family: string;
  netmask: string;
  mac: string;
  internal: boolean;
}

export interface IpInfoOptions {
  targetIp?: string;
  token?: string;
  field?: string;
  json: boolean;
  csv: boolean;
  noColor: boolean;
  bulkFile?: string;
  local?: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Lookup any IP address or current client IP
```typescript
import { queryIp } from "./src/features/ipinfo/ipinfoCoordinator.ts";

// Lookup specific IP
const googleDns = await queryIp("8.8.8.8");
console.log(`Country: ${googleDns.country}, City: ${googleDns.city}, Org: ${googleDns.org}`);

// Lookup current machine public IP
const myIp = await queryIp();
console.log(`Current Public IP: ${myIp.ip} (${myIp.city}, ${myIp.country})`);
```

#### Recipe 2: Extract specific fields (country, org, coordinates)
```typescript
import { queryIp } from "./src/features/ipinfo/ipinfoCoordinator.ts";
import { extractField } from "./src/features/ipinfo/ipinfoDoers.ts";

const ipData = await queryIp("1.1.1.1");
const org = extractField(ipData, "org"); // "AS13335 Cloudflare, Inc."
const loc = extractField(ipData, "loc"); // "-27.4679,153.0281"
```

#### Recipe 3: Export to JSON or CSV
```typescript
import { queryIp } from "./src/features/ipinfo/ipinfoCoordinator.ts";
import { formatCsv, formatJson } from "./src/features/ipinfo/ipinfoDoers.ts";

const info = await queryIp("8.8.8.8");
const jsonString = formatJson(info);
const csvString = formatCsv(info);
```

#### Recipe 4: Local network interfaces & IPv4 CIDR subnet calculation
```typescript
import { getLocalInterfaces, calculateSubnet, formatLocalInterfaces, formatSubnetInfo } from "./src/features/ipinfo/ipinfoDoers.ts";

// Inspect local interfaces
const ifaces = getLocalInterfaces();
console.log(formatLocalInterfaces(ifaces));

// Calculate subnet
const subnet = calculateSubnet("192.168.1.0/24");
console.log(`Usable hosts: ${subnet.usableHosts} (${subnet.firstHost} -> ${subnet.lastHost})`);
```

---

## 9. `subfinder` (Passive Subdomain Discovery)

Colocated under `src/features/subfinder/`.

### Types (`subfinderTypes.ts`)

```typescript
export interface SubdomainResult {
  host: string;
  sources: string[];
  ip?: string[];
  httpStatus?: number;
  httpTitle?: string;
  openPorts?: number[];
  isWildcard?: boolean;
}

export interface SubfinderOptions {
  domains: string[];
  sources?: string[];
  active: boolean;
  probe: boolean;
  silent: boolean;
  json: boolean;
  outputFile?: string;
  timeoutMs: number;
  ports?: number[];
  detectWildcard?: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Passive subdomain enumeration
```typescript
import { enumerateDomain } from "./src/features/subfinder/subfinderCoordinator.ts";

// Queries crt.sh, HackerTarget, AlienVault, and Anubis in parallel
const subdomains = await enumerateDomain("example.com", 8000, false);

for (const sub of subdomains) {
  console.log(`${sub.host} (sources: ${sub.sources.join(", ")})`);
}
```

#### Recipe 2: Active subdomain discovery (with live IP verification)
```typescript
import { enumerateDomain } from "./src/features/subfinder/subfinderCoordinator.ts";

// Resolves DNS A/AAAA records for each found subdomain, filtering out dead hosts
const liveHosts = await enumerateDomain("example.com", 8000, true);

for (const live of liveHosts) {
  console.log(`${live.host} -> [${live.ip?.join(", ")}]`);
}
```

#### Recipe 3: Query an individual passive intelligence source
```typescript
import { queryHackerTarget, queryCrtSh } from "./src/features/subfinder/subfinderDoers.ts";

const hackerTargetHosts = await queryHackerTarget("example.com");
console.log(`HackerTarget returned ${hackerTargetHosts.length} hosts.`);

const crtShHosts = await queryCrtSh("example.com");
console.log(`crt.sh returned ${crtShHosts.length} certificate hosts.`);
```

#### Recipe 4: HTTP title probing and open port scanning
```typescript
import { probeHttp, probePorts } from "./src/features/subfinder/subfinderDoers.ts";

const probe = await probeHttp("example.com", 3000);
console.log(`Status: ${probe.status}, Title: "${probe.title}"`);

const openPorts = await probePorts("example.com", [80, 443, 8080]);
console.log(`Open ports: ${openPorts.join(", ")}`);
```

---

## 10. `doggo` (DNS Client for Humans)

Colocated under `src/features/doggo/`.

### Types (`doggoTypes.ts`)

```typescript
export type DnsRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "SOA"
  | "PTR"
  | "CAA"
  | "SRV";

export interface DnsAnswer {
  name: string;
  type: string;
  class: string;
  ttl?: number;
  data: string;
}

export interface DoggoResponse {
  domain: string;
  queryType: string;
  answers: DnsAnswer[];
  queryTimeMs: number;
  server: string;
  protocol?: "UDP" | "DoH";
}

export interface DoggoOptions {
  domain: string;
  queryType: DnsRecordType | "ALL";
  nameserver?: string;
  doh?: boolean;
  dohUrl?: string;
  all?: boolean;
  short: boolean;
  json: boolean;
  showTime: boolean;
}
```

### RAD Copy & Paste Recipes

#### Recipe 1: Simple DNS query with latency and server details
```typescript
import { lookupDomain } from "./src/features/doggo/doggoCoordinator.ts";

// Query A records
const response = await lookupDomain("example.com", "A");

console.log(`Resolved in ${response.queryTimeMs}ms via ${response.server}:`);
for (const ans of response.answers) {
  console.log(`${ans.name} ${ans.type} ${ans.data} (TTL: ${ans.ttl})`);
}
```

#### Recipe 2: Query MX and TXT records with a custom nameserver
```typescript
import { lookupDomain } from "./src/features/doggo/doggoCoordinator.ts";

// Query MX records against Cloudflare DNS (1.1.1.1)
const mxResponse = await lookupDomain("google.com", "MX", "1.1.1.1");
for (const mx of mxResponse.answers) {
  console.log(`MX record: ${mx.data}`);
}

// Query TXT records against Google DNS (8.8.8.8)
const txtResponse = await lookupDomain("google.com", "TXT", "8.8.8.8");
for (const txt of txtResponse.answers) {
  console.log(`TXT record: ${txt.data}`);
}
```

#### Recipe 3: Scripting with bare answer values (like `dig +short`)
```typescript
import { lookupDomain } from "./src/features/doggo/doggoCoordinator.ts";
import { formatShortOutput } from "./src/features/doggo/doggoDoers.ts";

const res = await lookupDomain("example.com", "A");
const ipAddresses = formatShortOutput(res).split("\n");
console.log(ipAddresses); // ["172.66.147.243", "104.20.23.154"]
```

#### Recipe 4: DNS-over-HTTPS (DoH) encrypted queries
```typescript
import { performDohLookup } from "./src/features/doggo/doggoDoers.ts";

// Query securely via Cloudflare JSON DoH API
const dohResponse = await performDohLookup("example.com", "A", "https://cloudflare-dns.com/dns-query");
console.log(`Protocol: ${dohResponse.protocol}, Server: ${dohResponse.server}`);
for (const ans of dohResponse.answers) {
  console.log(`${ans.name} -> ${ans.data}`);
}
```

#### Recipe 5: Query all standard record types in parallel
```typescript
import { runDoggoCoordinator } from "./src/features/doggo/doggoCoordinator.ts";

const lines = await runDoggoCoordinator({
  domain: "example.com",
  queryType: "ALL",
  short: false,
  json: false,
  showTime: true,
});
console.log(lines.join("\n"));
```

---

## 11. Shared Utilities (Colors & Tables)

Colocated under `src/shared/`.

### RAD Copy & Paste Recipes

#### Recipe 1: Render custom column-aligned terminal tables
```typescript
import { renderTable, type ColumnDef } from "./src/shared/table.ts";
import { colors } from "./src/shared/colors.ts";

interface ServiceStatus {
  name: string;
  uptime: string;
  status: "ONLINE" | "OFFLINE";
  pingMs: number;
}

const services: ServiceStatus[] = [
  { name: "Auth Service", uptime: "99.9%", status: "ONLINE", pingMs: 14 },
  { name: "Billing API", uptime: "98.4%", status: "ONLINE", pingMs: 38 },
  { name: "Search Cluster", uptime: "90.1%", status: "OFFLINE", pingMs: 0 },
];

const columns: ColumnDef<ServiceStatus>[] = [
  { header: "SERVICE", align: "left", getValue: (s) => colors.bold(s.name) },
  { header: "UPTIME", align: "right", getValue: (s) => colors.dim(s.uptime) },
  {
    header: "STATUS",
    align: "left",
    getValue: (s) => (s.status === "ONLINE" ? colors.green(s.status) : colors.red(s.status)),
  },
  { header: "PING", align: "right", getValue: (s) => `${s.pingMs}ms` },
];

const table = renderTable(columns, services);
console.log(table);
```

#### Recipe 2: Zero-dependency terminal colors
```typescript
import { colors } from "./src/shared/colors.ts";

console.log(colors.bold(colors.green("✓ Success: Build completed in 42ms")));
console.log(colors.red("✗ Error: Connection refused on port 8080"));
console.log(colors.yellow("⚠ Warning: Memory threshold exceeded"));
console.log(colors.dim("Detailed trace logs available in /tmp/debug.log"));
```

---

## 12. Shell Autocompletions API

Colocated under `src/shared/completions.ts`.

### RAD Copy & Paste Recipes

#### Recipe 1: Generate shell completion scripts programmatically
```typescript
import { renderCompletionScript } from "./src/shared/completions.ts";

// Generate native Zsh completion for doggo
const zshScript = renderCompletionScript("doggo", "zsh");
console.log(zshScript);

// Generate native Fish completion for gdu
const fishScript = renderCompletionScript("gdu", "fish");
console.log(fishScript);

// Generate native Bash completion for procs
const bashScript = renderCompletionScript("procs", "bash");
console.log(bashScript);
```

---

## 13. Interactive TUI Navigation APIs

Colocated in `src/features/gdu/gduTui.ts` and `src/features/procs/procsTui.ts`.

### RAD Copy & Paste Recipes

#### Recipe 1: Drive `gdu` interactive directory navigation, deletion & search
```typescript
import { analyzeDirectory } from "./src/features/gdu/gduCoordinator.ts";
import {
  applyGduTuiAction,
  handleGduTuiKey,
  renderGduTuiFrame,
  type GduTuiState,
} from "./src/features/gdu/gduTui.ts";

const root = await analyzeDirectory({
  targetDir: ".",
  nonInteractive: true,
  showItemCount: true,
  showRelativeSize: true,
  showDisks: false,
  summarize: false,
  noHidden: true,
  si: false,
  ignoreDirs: [],
});

let state: GduTuiState = {
  currentDir: root,
  history: [],
  selectedIndex: 0,
  scrollOffset: 0,
  sortBy: "size",
  filterQuery: "",
  isFiltering: false,
  confirmingDelete: false,
  showingDetails: false,
  shouldExit: false,
};

// Simulate Down arrow keypress
const downAction = handleGduTuiKey("\u001b[B");
state = applyGduTuiAction(state, downAction);

// Render ANSI frame text
const frame = renderGduTuiFrame(state);
console.log(frame);
```

#### Recipe 2: Drive `procs` process explorer state & live filtering
```typescript
import { getProcesses } from "./src/features/procs/procsCoordinator.ts";
import {
  applyProcsTuiAction,
  handleProcsTuiKey,
  renderProcsTuiFrame,
  type ProcsTuiState,
} from "./src/features/procs/procsTui.ts";

const processes = await getProcesses();
let state: ProcsTuiState = {
  allProcesses: processes,
  filteredProcesses: processes,
  selectedIndex: 0,
  scrollOffset: 0,
  sortBy: "cpu",
  filterQuery: "",
  isFiltering: false,
  isPaused: false,
  showingDetails: false,
  shouldExit: false,
};

// Start live filtering for "bun"
state = applyProcsTuiAction(state, { type: "START_FILTER" });
state = applyProcsTuiAction(state, { type: "FILTER_CHAR", char: "b" });
state = applyProcsTuiAction(state, { type: "FILTER_CHAR", char: "u" });
state = applyProcsTuiAction(state, { type: "FILTER_CHAR", char: "n" });

// Switch sort to Memory descending
state = applyProcsTuiAction(state, { type: "SET_SORT", sortBy: "mem" });

// Render ANSI frame
const frame = renderProcsTuiFrame(state);
console.log(frame);
```

---

## 14. Standalone Binary Compilation Engine

Colocated under `scripts/build.ts`.

### RAD Copy & Paste Recipes

#### Recipe 1: Compile all or selected tools to native standalone binaries
```typescript
import { compileTarget, runBuild, TARGETS, type BuildTarget } from "./scripts/build.ts";

// Build all 11 binaries into ./dist/
const results = await runBuild();
for (const res of results) {
  console.log(`${res.name}: ${res.success ? "OK" : "FAILED"} (${res.durationMs}ms)`);
}

// Or compile a single custom target
const doggoTarget: BuildTarget = { name: "doggo", entry: "src/features/doggo/doggoCli.ts" };
const singleResult = await compileTarget(doggoTarget, "dist");
console.log(`Compiled doggo: ${singleResult.sizeBytes} bytes`);
```

