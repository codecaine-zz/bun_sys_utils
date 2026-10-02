import { colors } from "./src/shared/colors.ts";
import { renderCompletionScript, TOOL_FLAGS } from "./src/shared/completions.ts";

const command = process.argv[2];
const commandArgs = process.argv.slice(3);

function printHubHelp(): void {
  console.log(`
${colors.bold("Bun System Utilities")} (Ports of modern CLI tools in Bun)

Available Commands:
  ${colors.bold(colors.cyan("fd"))}          Fast, simple find alternative
  ${colors.bold(colors.cyan("sd"))}          Intuitive find & replace (sed alternative)
  ${colors.bold(colors.cyan("rip"))}         Safe rm with graveyard & undo (rip2)
  ${colors.bold(colors.cyan("procs"))}       Modern replacement for ps
  ${colors.bold(colors.cyan("watchexec"))}   Execute commands on file change
  ${colors.bold(colors.cyan("tokei"))}       Fast code and lines-of-code (LOC) counter
  ${colors.bold(colors.cyan("gdu"))}         Pretty fast disk usage analyzer (gdu-go)
  ${colors.bold(colors.cyan("ipinfo"))}      IP address geolocation & ASN lookup
  ${colors.bold(colors.cyan("subfinder"))}   Passive subdomain discovery tool
  ${colors.bold(colors.cyan("doggo"))}       DNS Client for Humans (modern dig alternative)
  ${colors.bold(colors.cyan("rad"))}         37-module Rapid Application Development (RAD) utility showcase
  ${colors.bold(colors.cyan("completions"))} Generate shell autocompletion script (bash, zsh, fish)

Usage:
  bun run <command> [options]
  bun run index.ts <command> [options]
  bun run index.ts completions <tool> <shell>

Examples:
  bun run fd "test" src/
  bun run sd "old" "new" file.txt --preview
  bun run rip file.txt
  bun run procs --tree
  bun run watchexec -e ts -- bun test
  bun run tokei .
  bun run gdu -B -C .
  bun run ipinfo 1.1.1.1
  bun run subfinder -d example.com -silent
  bun run doggo example.com MX @1.1.1.1
  bun run index.ts completions doggo zsh
`);
}

async function main(): Promise<void> {
  if (!command || command === "--help" || command === "-h") {
    printHubHelp();
    return;
  }

  if (command === "completions") {
    const tool = commandArgs[0];
    const shell = commandArgs[1] || "zsh";
    if (!tool || !TOOL_FLAGS[tool]) {
      console.error(`Please specify a valid tool: ${Object.keys(TOOL_FLAGS).join(", ")}`);
      process.exit(1);
    }
    const script = renderCompletionScript(tool, shell, TOOL_FLAGS[tool]!);
    console.log(script);
    return;
  }

  const scriptMap: Record<string, string> = {
    fd: "src/features/fd/fdCli.ts",
    sd: "src/features/sd/sdCli.ts",
    rip: "src/features/rip/ripCli.ts",
    rip2: "src/features/rip/ripCli.ts",
    procs: "src/features/procs/procsCli.ts",
    watchexec: "src/features/watchexec/watchexecCli.ts",
    tokei: "src/features/tokei/tokeiCli.ts",
    gdu: "src/features/gdu/gduCli.ts",
    "gdu-go": "src/features/gdu/gduCli.ts",
    ipinfo: "src/features/ipinfo/ipinfoCli.ts",
    "ipinfo-cli": "src/features/ipinfo/ipinfoCli.ts",
    subfinder: "src/features/subfinder/subfinderCli.ts",
    doggo: "src/features/doggo/doggoCli.ts",
    rad: "src/features/rad/radCli.ts",
  };

  const targetScript = scriptMap[command];
  if (!targetScript) {
    console.error(`Unknown utility command: "${command}". Run "bun run index.ts --help" for available commands.`);
    process.exit(1);
  }

  const proc = Bun.spawn(["bun", targetScript, ...commandArgs], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

if (import.meta.main) {
  await main();
}