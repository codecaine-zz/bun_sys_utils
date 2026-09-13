import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface BuildTarget {
  name: string;
  entry: string;
}

export interface BuildResult {
  name: string;
  outfile: string;
  sizeBytes: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export const TARGETS: readonly BuildTarget[] = [
  { name: "fd", entry: "src/features/fd/fdCli.ts" },
  { name: "sd", entry: "src/features/sd/sdCli.ts" },
  { name: "rip", entry: "src/features/rip/ripCli.ts" },
  { name: "procs", entry: "src/features/procs/procsCli.ts" },
  { name: "watchexec", entry: "src/features/watchexec/watchexecCli.ts" },
  { name: "tokei", entry: "src/features/tokei/tokeiCli.ts" },
  { name: "gdu", entry: "src/features/gdu/gduCli.ts" },
  { name: "ipinfo", entry: "src/features/ipinfo/ipinfoCli.ts" },
  { name: "subfinder", entry: "src/features/subfinder/subfinderCli.ts" },
  { name: "doggo", entry: "src/features/doggo/doggoCli.ts" },
  { name: "sysutils", entry: "index.ts" },
] as const;

// Doer: format bytes to human readable string
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Doer: ensure output directory exists
export function ensureDistDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Doer: compile a single target using bun build --compile --minify
export async function compileTarget(
  target: BuildTarget,
  distDir: string
): Promise<BuildResult> {
  const outfile = join(distDir, target.name);
  const startTime = performance.now();

  const proc = Bun.spawn([
    "bun",
    "build",
    "--compile",
    "--minify",
    target.entry,
    "--outfile",
    outfile,
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  const durationMs = Math.round(performance.now() - startTime);

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    return {
      name: target.name,
      outfile,
      sizeBytes: 0,
      durationMs,
      success: false,
      error: stderr.trim() || `Exit code ${exitCode}`,
    };
  }

  const stat = statSync(outfile);
  return {
    name: target.name,
    outfile,
    sizeBytes: stat.size,
    durationMs,
    success: true,
  };
}

// Coordinator: orchestrate builds for all targets and report status
export async function runBuild(
  targets: readonly BuildTarget[] = TARGETS,
  distDir = "dist"
): Promise<BuildResult[]> {
  console.log(`🔨 Building ${targets.length} standalone binaries to ./${distDir}/...\n`);
  ensureDistDir(distDir);

  const results: BuildResult[] = [];
  const totalStart = performance.now();

  for (const target of targets) {
    process.stdout.write(`  • Compiling ${target.name.padEnd(12)} (${target.entry})... `);
    const result = await compileTarget(target, distDir);
    results.push(result);

    if (result.success) {
      console.log(`✓ ${formatSize(result.sizeBytes).padStart(9)} [${result.durationMs}ms]`);
    } else {
      console.log(`✗ FAILED: ${result.error}`);
    }
  }

  const totalDuration = Math.round(performance.now() - totalStart);
  const successCount = results.filter((r) => r.success).length;

  console.log(`\n🎉 Built ${successCount}/${targets.length} binaries in ${(totalDuration / 1000).toFixed(2)}s`);
  return results;
}

if (import.meta.main) {
  const results = await runBuild();
  const hasError = results.some((r) => !r.success);
  if (hasError) {
    process.exit(1);
  }
}
