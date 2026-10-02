import { describe, expect, it } from "bun:test";
import { searchFiles, runFdCoordinator } from "../src/features/fd/fdCoordinator.ts";
import { buildMatcher, collectAllEntries, matchesType, matchesSize, matchesExclude, parseSizeFilter, parseDurationMs, matchesChangedWithin, matchesEmpty, matchesMinDepth } from "../src/features/fd/fdDoers.ts";
import { runSdCoordinator, processFile } from "../src/features/sd/sdCoordinator.ts";
import { buildReplacerRegex, replaceText, computeDiffHunks, formatDiffPreview, countMatches, expandTargets, createBackup } from "../src/features/sd/sdDoers.ts";
import { buryTarget, unburyTarget, getRecordInfo, pruneGraveyard, runRipCoordinator } from "../src/features/rip/ripCoordinator.ts";
import { resolveGraveyardDir, readManifest, formatRecordDetail, computeGraveyardSize, formatGraveyardSummary } from "../src/features/rip/ripDoers.ts";
import { getProcesses, runProcsCoordinator } from "../src/features/procs/procsCoordinator.ts";
import { buildProcessTree, formatTreeLines, fetchRawProcessList, parsePsOutput, sortProcesses, formatJsonProcesses, filterProcessesByUser, parseLsofOutput, attachListeningPorts } from "../src/features/procs/procsDoers.ts";
import { startWatcher } from "../src/features/watchexec/watchexecCoordinator.ts";
import { shouldTrigger, spawnCommand, killRunningProcess, matchesFilter, buildWatchexecEnv, formatShellCommand } from "../src/features/watchexec/watchexecDoers.ts";
import { computeCodeStats, runTokeiCoordinator } from "../src/features/tokei/tokeiCoordinator.ts";
import { analyzeLines, detectLanguage, formatFilesBreakdown, formatJsonReports, formatMarkdownTable } from "../src/features/tokei/tokeiDoers.ts";
import { analyzeDirectory, runGduCoordinator } from "../src/features/gdu/gduCoordinator.ts";
import { fetchMountedDisks, formatBytes, formatCount, formatGduJson, formatRelativeBar, parseByteSize, sortDiskItems } from "../src/features/gdu/gduDoers.ts";
import { queryIp, runIpInfoCoordinator } from "../src/features/ipinfo/ipinfoCoordinator.ts";
import { extractField, formatCsv, formatJson, formatSummary, formatBulkTable, formatLocalInterfaces, formatSubnetInfo, getLocalInterfaces, calculateSubnet, isIpAddress, isCidr } from "../src/features/ipinfo/ipinfoDoers.ts";
import { enumerateDomain, runSubfinderCoordinator } from "../src/features/subfinder/subfinderCoordinator.ts";
import { cleanDomain, cleanSubdomain, deduplicateSubdomains, detectWildcardDns, isWildcardMatch, resolveHostDns, probeHttp, probePorts } from "../src/features/subfinder/subfinderDoers.ts";
import { lookupDomain, runDoggoCoordinator } from "../src/features/doggo/doggoCoordinator.ts";
import { formatShortOutput, performDohLookup } from "../src/features/doggo/doggoDoers.ts";
import { renderCompletionScript } from "../src/shared/completions.ts";
import { applyGduTuiAction, handleGduTuiKey, renderGduTuiFrame } from "../src/features/gdu/gduTui.ts";
import { applyProcsTuiAction, handleProcsTuiKey, renderProcsTuiFrame } from "../src/features/procs/procsTui.ts";
import { formatSize, TARGETS } from "../scripts/build.ts";

describe("README Client Code Verification", () => {
  it("fd README examples run without errors", async () => {
    const results = await searchFiles({
      pattern: "^[a-z_]+\\.test",
      rootPath: "src",
      extension: "ts",
      hidden: false,
      absolute: false,
    });
    expect(results.length).toBeGreaterThan(0);

    const executables = await searchFiles({
      rootPath: ".",
      typeFilter: "x",
      hidden: false,
      absolute: true,
    });
    expect(Array.isArray(executables)).toBe(true);

    const topLevelHidden = await searchFiles({
      pattern: ".*",
      rootPath: ".",
      maxDepth: 1,
      hidden: true,
      absolute: false,
    });
    expect(topLevelHidden.some((e) => e.name === ".gitignore")).toBe(true);

    const execOutputs = await runFdCoordinator({
      pattern: "package.json",
      rootPath: ".",
      hidden: false,
      absolute: true,
      execCmd: ["echo", "{}"],
    });
    expect(Array.isArray(execOutputs)).toBe(true);

    const matcher = buildMatcher("config");
    const entries = await collectAllEntries(".", 1, ".", 2, false);
    const configFiles = entries.filter((e) => matcher(e.name, e.displayPath) && matchesType(e, "f"));
    expect(configFiles.some((e) => e.name.includes("tsconfig.json"))).toBe(true);

    // New features: exclude, sizeFilter, parseSizeFilter, matchesExclude
    expect(matchesSize(1024 * 1024 * 10, "+5M")).toBe(true);
    expect(matchesExclude("node_modules/bun/index.d.ts", ["node_modules"])).toBe(true);
    expect(parseSizeFilter("+10M")?.bytes).toBe(10 * 1024 * 1024);
    const filteredSearch = await searchFiles({
      rootPath: "src",
      exclude: ["node_modules"],
      sizeFilter: "+10",
      hidden: false,
    });
    expect(filteredSearch.length).toBeGreaterThan(0);

    // Generational modern features: parseDurationMs, matchesChangedWithin, matchesEmpty, matchesMinDepth
    expect(parseDurationMs("24h")).toBe(86400000);
    expect(matchesChangedWithin(new Date(Date.now() - 1000), "5s")).toBe(true);
    expect(matchesEmpty({ name: "empty.txt", path: "empty.txt", displayPath: "empty.txt", isDirectory: false, isFile: true, isSymlink: false, size: 0 }, true)).toBe(true);
    expect(matchesMinDepth(3, 2)).toBe(true);
  });

  it("sd README examples run without errors", async () => {
    const summaries = await runSdCoordinator({
      findPattern: 'version": "(\\d+)\\.(\\d+)\\.(\\d+)',
      replacePattern: 'version": "1.0.0"',
      files: ["package.json"],
      stringMode: false,
      flags: "g",
      preview: true,
    });
    expect(summaries.length).toBeGreaterThan(0);

    const diffOutputs = await runSdCoordinator({
      findPattern: "foo",
      replacePattern: "bar",
      files: ["index.ts"],
      stringMode: true,
      flags: "g",
      preview: true,
    });
    expect(Array.isArray(diffOutputs)).toBe(true);

    const regex = buildReplacerRegex("bun_sys_utils", false, "g");
    const result = await processFile("package.json", regex, "bun_sys_utils");
    expect(result.hasChanged).toBe(false);

    const rawPattern = "api.url[0]*test";
    const escRegex = buildReplacerRegex(rawPattern, true, "g");
    const replaced = replaceText("Connecting to api.url[0]*test now", escRegex, "new_endpoint");
    expect(replaced).toBe("Connecting to new_endpoint now");

    const oldText = "line 1\nline 2\nline 3";
    const newText = "line 1\nchanged line 2\nline 3";
    const hunks = computeDiffHunks(oldText, newText);
    expect(hunks.length).toBe(1);
    const preview = formatDiffPreview("test.txt", hunks);
    expect(preview).toContain("line 2");

    // New features: countOnly, ignoreCase, expandTargets
    const countOutput = await runSdCoordinator({
      findPattern: "name",
      replacePattern: "renamed",
      files: ["package.json"],
      countOnly: true,
      stringMode: true,
    });
    expect(countOutput[0]).toContain("Found");

    const expandedFiles = await expandTargets(["src/features/sd"]);
    expect(expandedFiles.some((f) => f.endsWith("sdDoers.ts"))).toBe(true);

    const count = countMatches("apple orange apple banana APPLE", buildReplacerRegex("apple", false, "g", true));
    expect(count).toBe(3);

    // Generational modern features: wordMode boundary, createBackup
    const wordRegex = buildReplacerRegex("cat", false, "g", false, true);
    expect("scatter the cat in the cathouse".replace(wordRegex, "dog")).toBe("scatter the dog in the cathouse");

    const tmpFile = "scratch_backup_test.txt";
    await Bun.write(tmpFile, "backup test");
    const bakPath = await createBackup(tmpFile, ".bak");
    expect(await Bun.file(bakPath).exists()).toBe(true);
    await Bun.file(tmpFile).delete();
    await Bun.file(bakPath).delete();
  });

  it("rip README examples run without errors", async () => {
    const graveyard = resolveGraveyardDir();
    const testFile = "sample_rip_test.txt";
    await Bun.write(testFile, "temporary content");

    const record = await buryTarget(testFile, graveyard);
    expect(record.originalPath).toContain("sample_rip_test.txt");

    const manifest = await readManifest(graveyard);
    expect(manifest.records.some((r) => r.id === record.id)).toBe(true);

    // New features: inspect record info detail, prune, and unbury
    const info = await getRecordInfo(graveyard, record.id);
    expect(info.id).toBe(record.id);
    const detail = formatRecordDetail(info);
    expect(detail).toContain(record.id);

    const restored = await unburyTarget(graveyard);
    expect(restored.id).toBe(record.id);
    expect(await Bun.file(testFile).exists()).toBe(true);

    await Bun.file(testFile).delete();

    const pruned = await pruneGraveyard(graveyard, 30);
    expect(pruned).toBeGreaterThanOrEqual(0);

    // Generational modern features: computeGraveyardSize, formatGraveyardSummary, dryRun
    const gSize = computeGraveyardSize(manifest);
    expect(typeof gSize.totalBytes).toBe("number");
    const gSummary = formatGraveyardSummary(manifest);
    expect(gSummary).toContain("Graveyard contains");

    const dryRunResult = await runRipCoordinator({
      targets: ["package.json"],
      graveyardDir: graveyard,
      dryRun: true,
    });
    expect(dryRunResult[0]).toContain("[Dry-Run]");
  });

  it("procs README examples run without errors", async () => {
    // New features: limit, json formatting
    const procs = await getProcesses("bun", "cpu", 5);
    expect(Array.isArray(procs)).toBe(true);
    expect(procs.length).toBeLessThanOrEqual(5);

    const allProcs = await getProcesses();
    const tree = buildProcessTree(allProcs);
    const lines = formatTreeLines(tree);
    expect(lines.length).toBeGreaterThan(0);

    const tableOutput = await runProcsCoordinator({
      keyword: "bun",
      tree: false,
      sortBy: "mem",
      watch: false,
      limit: 3,
    });
    expect(tableOutput).toContain("PID");

    const jsonOutput = await runProcsCoordinator({
      keyword: "bun",
      json: true,
      limit: 2,
    });
    expect(jsonOutput).toContain('"pid"');

    const rawPs = await fetchRawProcessList();
    const processes = parsePsOutput(rawPs);
    const topCpu = sortProcesses(processes, "cpu").slice(0, 3);
    expect(topCpu.length).toBeLessThanOrEqual(3);

    const jsonStr = formatJsonProcesses(processes.slice(0, 2));
    expect(JSON.parse(jsonStr).length).toBeLessThanOrEqual(2);

    // Generational modern features: filterProcessesByUser, attachListeningPorts
    const currentUser = process.env.USER || "root";
    const userProcs = filterProcessesByUser(processes, currentUser);
    expect(Array.isArray(userProcs)).toBe(true);

    const lsofSample = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    12345 user   22u  IPv4 0x1234      0t0  TCP *:3000 (LISTEN)`;
    const portMap = parseLsofOutput(lsofSample);
    const enriched = attachListeningPorts([{ pid: 12345, ppid: 1, user: "user", cpu: 0, mem: 10, time: "0:01", command: "node" }], portMap);
    expect(enriched[0].ports).toContain("3000");
  });

  it("watchexec README examples run without errors", async () => {
    const triggers = shouldTrigger("src/models/user.ts", ["ts"], ["node_modules"]);
    expect(triggers).toBe(true);

    // New features: filter pattern and postpone option
    expect(matchesFilter("src/main.ts", ["main"])).toBe(true);
    expect(matchesFilter("src/shared/colors.ts", ["main"])).toBe(false);

    const proc = spawnCommand(["echo", "hello"]);
    expect(proc.pid).toBeGreaterThan(0);
    killRunningProcess(proc);

    const state = { currentProcess: null };
    const watcher = startWatcher(
      {
        watchPaths: ["."],
        command: [],
        extensions: ["ts"],
        ignorePatterns: ["node_modules", ".git"],
        filters: ["test"],
        postpone: true,
        debounceMs: 50,
        clear: false,
        restart: false,
        runOnStart: false,
      },
      state,
      () => {}
    );
    expect(typeof watcher.close).toBe("function");
    watcher.close();

    // Generational modern features: buildWatchexecEnv, formatShellCommand
    const env = buildWatchexecEnv("src/test.ts", "./src");
    expect(env.WATCHEXEC_WRITTEN_PATH).toBe("src/test.ts");
    expect(formatShellCommand(["echo", "test"], "sh")).toEqual(["sh", "-c", "echo test"]);
  });

  it("tokei README examples run without errors", async () => {
    // New features: excludeDirs, showFiles breakdown, json format
    const reports = await computeCodeStats({
      paths: ["src/shared"],
      sort: "code",
      showFiles: true,
      hidden: false,
      excludeDirs: ["node_modules"],
    });
    expect(reports.length).toBeGreaterThan(0);

    const tableOutput = await runTokeiCoordinator({
      paths: ["src/shared"],
      sort: "files",
      showFiles: false,
      hidden: false,
    });
    expect(tableOutput).toContain("TypeScript");

    const jsonOutput = await runTokeiCoordinator({
      paths: ["src/shared"],
      json: true,
      showFiles: false,
      hidden: false,
    });
    expect(jsonOutput).toContain('"language"');

    const breakdownOutput = formatFilesBreakdown(reports);
    expect(breakdownOutput).toContain("--- TypeScript");

    const jsonReports = formatJsonReports(reports);
    expect(JSON.parse(jsonReports).length).toBeGreaterThan(0);

    const codeSnippet = `
// Config options
const timeout = 5000;

/*
 Multi-line
 note
*/
export default timeout;
`;
    const stats = analyzeLines(codeSnippet, {
      single: ["//"],
      multi: [["/*", "*/"]],
    });
    expect(stats.code).toBe(2);
    expect(stats.comment).toBe(5);
    expect(stats.blank).toBe(3);

    // Generational modern features: modern languages, markdown table
    expect(detectLanguage("build.zig")?.name).toBe("Zig");
    expect(detectLanguage("App.svelte")?.name).toBe("Svelte");
    const md = formatMarkdownTable(reports);
    expect(md).toContain("| Language | Files | Lines | Blank | Comment | Code |");
  });

  it("gdu README examples run without errors", async () => {
    // New features: maxDepth, sortBy
    const root = await analyzeDirectory({
      targetDir: "src/shared",
      nonInteractive: true,
      showItemCount: true,
      showRelativeSize: true,
      showDisks: false,
      summarize: false,
      noHidden: true,
      si: false,
      ignoreDirs: [],
      maxDepth: 1,
    });
    expect(root.size).toBeGreaterThan(0);

    const disks = await fetchMountedDisks();
    expect(disks.length).toBeGreaterThan(0);

    const lines = await runGduCoordinator({
      targetDir: "src/shared",
      nonInteractive: true,
      showItemCount: true,
      showRelativeSize: true,
      showDisks: false,
      summarize: false,
      noHidden: false,
      top: 5,
      si: false,
      ignoreDirs: [],
      sortBy: "name",
      maxDepth: 1,
    });
    expect(lines.length).toBeGreaterThan(0);

    const sortedByName = sortDiskItems(root.children ?? [], "name");
    expect(sortedByName.length).toBeGreaterThan(0);

    expect(formatBytes(1024 * 1024 * 50)).toBe("  50.0 MiB");
    expect(formatCount(12500)).toBe("     12.5k");
    expect(formatRelativeBar(0.75, 10)).toBe("[########  ]");

    // Generational modern features: parseByteSize, formatGduJson
    expect(parseByteSize("10M")).toBe(10 * 1024 * 1024);
    const gduJson = formatGduJson(root);
    expect(JSON.parse(gduJson).name).toBe("shared");
  });

  it("ipinfo README examples run without errors", async () => {
    const cloudflareDns = await queryIp("1.1.1.1");
    expect(cloudflareDns.ip).toBe("1.1.1.1");

    const org = extractField(cloudflareDns, "org");
    expect(org).toContain("Cloudflare");

    const jsonStr = formatJson(cloudflareDns);
    expect(jsonStr).toContain("1.1.1.1");
    const csvStr = formatCsv(cloudflareDns);
    expect(csvStr).toContain("1.1.1.1");

    // New features: Google Maps URL in summary and bulk table formatting
    const summary = formatSummary(cloudflareDns);
    expect(summary).toContain("1.1.1.1");
    expect(summary).toContain("https://maps.google.com/?q=");

    const bulkTable = formatBulkTable([cloudflareDns]);
    expect(bulkTable).toContain("1.1.1.1");
    expect(bulkTable).toContain("Cloudflare");

    expect(isIpAddress("1.1.1.1")).toBe(true);
    expect(isIpAddress("google.com")).toBe(false);

    // Generational modern features: CIDR calculator, local network interfaces
    expect(isCidr("10.0.0.0/24")).toBe(true);
    const subnet = calculateSubnet("10.0.0.0/24");
    expect(subnet.network).toBe("10.0.0.0");
    expect(subnet.usableHosts).toBe(254);
    expect(formatSubnetInfo(subnet)).toContain("10.0.0.0");

    const ifaces = getLocalInterfaces();
    expect(ifaces.length).toBeGreaterThan(0);
    const ifaceTable = formatLocalInterfaces(ifaces);
    expect(ifaceTable).toContain("INTERFACE");
  });

  it("subfinder README examples run without errors", async () => {
    const results = await enumerateDomain("example.com", 3000, false);
    expect(Array.isArray(results)).toBe(true);

    expect(cleanDomain("https://sub.example.com/path")).toBe("sub.example.com");
    expect(cleanSubdomain("*.api.example.com", "example.com")).toBe("api.example.com");
    expect(deduplicateSubdomains(["b.example.com", "a.example.com", "b.example.com"])).toEqual([
      "a.example.com",
      "b.example.com",
    ]);
    const ips = await resolveHostDns("localhost");
    expect(ips.length).toBeGreaterThan(0);

    // New feature: HTTP/HTTPS probing
    const probeRes = await probeHttp("localhost", 1000);
    expect(typeof probeRes).toBe("object");

    // Generational modern features: wildcard detection & port probing
    expect(isWildcardMatch(["1.1.1.1"], ["1.1.1.1"])).toBe(true);
    const ports = await probePorts("127.0.0.1", [99999], 200); // non-existent port
    expect(Array.isArray(ports)).toBe(true);
  }, 15000);

  it("doggo README examples run without errors", async () => {
    const res = await lookupDomain("example.com", "A");
    expect(res.answers.length).toBeGreaterThan(0);

    const short = formatShortOutput(res);
    expect(short.length).toBeGreaterThan(0);

    // New features: reverse DNS PTR lookup and --no-time
    const reverseRes = await lookupDomain("8.8.8.8", "PTR");
    expect(reverseRes.answers.length).toBeGreaterThan(0);
    expect(reverseRes.answers[0]?.data).toContain("dns.google");

    const table = await runDoggoCoordinator({
      domain: "example.com",
      queryType: "A",
      nameserver: "1.1.1.1",
      short: false,
      json: false,
      showTime: false,
    });
    expect(table).toContain("example.com");

    // Generational modern features: DoH lookup and multi-query
    const dohRes = await performDohLookup("cloudflare.com", "A");
    expect(dohRes.protocol).toBe("DoH");
    expect(dohRes.answers.length).toBeGreaterThan(0);

    const multiRes = await runDoggoCoordinator({
      domain: "example.com",
      queryType: "ALL",
      short: false,
      json: false,
      showTime: false,
    });
    expect(multiRes).toContain("example.com");
  });

  it("completions, TUI, and build recipes run without errors", async () => {
    // Completions recipe
    const zsh = renderCompletionScript("doggo", "zsh");
    expect(zsh).toContain("#compdef doggo");
    const bash = renderCompletionScript("procs", "bash");
    expect(bash).toContain("complete -F _procs procs");
    const fish = renderCompletionScript("gdu", "fish");
    expect(fish).toContain("complete -c gdu");

    // GDU TUI recipe
    const rootDir = await analyzeDirectory({
      targetDir: "src/shared",
      nonInteractive: true,
      showItemCount: true,
      showRelativeSize: true,
      showDisks: false,
      summarize: false,
      noHidden: true,
      si: false,
      ignoreDirs: [],
    });
    let gduState = {
      currentDir: rootDir,
      history: [],
      selectedIndex: 0,
      scrollOffset: 0,
      sortBy: "size" as const,
      filterQuery: "",
      isFiltering: false,
      confirmingDelete: false,
      showingDetails: false,
      shouldExit: false,
    };
    const downAction = handleGduTuiKey("\u001b[B");
    gduState = applyGduTuiAction(gduState, downAction);
    const gduFrame = renderGduTuiFrame(gduState);
    expect(gduFrame).toContain("gdu");

    // Procs TUI recipe
    const procs = await getProcesses();
    let procsState = {
      allProcesses: procs,
      filteredProcesses: procs,
      selectedIndex: 0,
      scrollOffset: 0,
      sortBy: "cpu" as const,
      filterQuery: "",
      isFiltering: false,
      isPaused: false,
      showingDetails: false,
      shouldExit: false,
    };
    const procsDown = handleProcsTuiKey("\u001b[B");
    procsState = applyProcsTuiAction(procsState, procsDown);
    const procsFrame = renderProcsTuiFrame(procsState);
    expect(procsFrame).toContain("PID");

    // Build recipe
    expect(TARGETS.length).toBe(11);
    expect(formatSize(1024 * 1024)).toBe("1.00 MB");
  });

  it("rad README recipes run without errors", async () => {
    const { rad } = await import("./features/rad/index.ts");

    // Recipe 1: SQLite KV & Document Store
    const db = rad.sqliteutils.openDb(":memory:");
    rad.sqliteutils.createKvTable(db, "app_kv");
    rad.sqliteutils.setKv(db, "app_kv", "version", "2.0.0");
    expect(rad.sqliteutils.getKv(db, "app_kv", "version")).toBe("2.0.0");
    rad.sqliteutils.createJsonStore(db, "users");
    rad.sqliteutils.saveDoc(db, "users", "u1", { name: "Alice", active: true });
    const doc = rad.sqliteutils.loadDoc<{ name: string; active: boolean }>(db, "users", "u1");
    expect(doc?.name).toBe("Alice");
    rad.sqliteutils.closeDb(db);

    // Recipe 2: String transforms, masking, and Levenshtein
    const slug = rad.strutils.slugify("Bun System Utilities 2026: Fast & Pure!");
    expect(slug).toBe("bun-system-utilities-2026-fast-pure");
    const email = rad.strutils.maskEmail("developer@bun.sh");
    expect(email).toBe("d*******r@bun.sh");
    expect(rad.strutils.levenshteinDistance("kitten", "sitting")).toBe(3);

    // Recipe 3: Collection operations
    const chunks = rad.arrutils.chunk([1, 2, 3, 4, 5, 6], 3);
    expect(chunks.length).toBe(2);
    const [evens, odds] = rad.arrutils.partition([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3]);

    // Recipe 4: Cryptography & password hashing
    expect(rad.cryptoutils.sha256("bun")).toBe("08d1082cc8d85a0833da8815ff1574675c415760e0aff7fb4e32de6de27faf86");
    const passHash = await rad.cryptoutils.hashPassword("super-secret");
    expect(await rad.cryptoutils.verifyPassword("super-secret", passHash)).toBe(true);

    // Recipe 5: JWT signing and verification
    const token = rad.jwtutils.signJwt({ sub: "user_42", role: "admin" }, "secret-key", 3600);
    const payload = rad.jwtutils.verifyJwt<{ sub: string; role: string }>(token, "secret-key");
    expect(payload.sub).toBe("user_42");

    // Recipe 6: Bounded parallel mapping
    const squares = await rad.asyncutils.parallelMap([1, 2, 3], 2, async (n) => n * n);
    expect(squares).toEqual([1, 4, 9]);

    // Recipe 7: DAG topological sort
    const dag = rad.graphutils.newGraph<string>();
    dag.addEdge("compile", "test");
    dag.addEdge("test", "package");
    dag.addEdge("package", "deploy");
    expect(dag.topologicalSort()).toEqual(["compile", "test", "package", "deploy"]);

    // Recipe 8: Glob & Shell execution
    const jsonFiles = await rad.globutils.findFiles("*.json", ".");
    expect(jsonFiles).toContain("package.json");
    const shellRes = await rad.shellutils.execCmd("echo 'rad'");
    expect(shellRes.stdout.trim()).toBe("rad");

    // Recipe 9: Ultra-fast hashes and BloomFilter
    expect(typeof rad.hashutils.wyhash("speed")).toBe("bigint");
    const filter = rad.hashutils.createBloomFilter(100, 0.01);
    filter.add("alpha");
    expect(filter.has("alpha")).toBe(true);
    expect(filter.has("omega")).toBe(false);

    // Recipe 10: Server Router and In-memory Transpiler
    const router = rad.serverutils.createRouter();
    router.get("/status", () => new Response("OK"));
    const server = rad.serverutils.serveHttp({ router });
    const res = await fetch(`${server.url}/status`);
    expect(await res.text()).toBe("OK");
    server.stop();

    const transformed = rad.transpileutils.transpileTs("const x: number = 100; export default x;");
    expect(transformed).toContain("export default");

    // Recipe 11: Object path access & deep merge (es-toolkit)
    const stateDoc = { app: { settings: { theme: "dark" } } };
    expect(rad.objutils.get(stateDoc, "app.settings.theme")).toBe("dark");
    const mergedObj = rad.objutils.deepMerge({ a: { b: 1 } }, { a: { c: 2 } });
    expect(mergedObj).toEqual({ a: { b: 1, c: 2 } });
    expect(rad.objutils.isEqual({ x: [1] }, { x: [1] })).toBe(true);

    // Recipe 12: Functional tools & array at (es-toolkit)
    expect(rad.arrutils.at(["first", "second", "last"], -1)).toBe("last");
    const pipedNum = rad.fnutils.pipe(5, (n: number) => n * 2, (n: number) => n + 3);
    expect(pipedNum).toBe(13);
  });
});

