# Bun System Utilities

A collection of modern command-line system utilities written in TypeScript and powered by native [Bun](https://bun.com) APIs.

Built following the **Single Responsibility (Doer vs Coordinator)** pattern and **Feature-First** architecture as specified in [AGENTS.md](./AGENTS.md).

---

## Utilities Included

| Tool | API Docs | Description |
| :--- | :--- | :--- |
| **`fd`** | [`src/features/fd`](./src/features/fd/README.md) | Simple, fast, and user-friendly alternative to `find` |
| **`sd`** | [`src/features/sd`](./src/features/sd/README.md) | Intuitive find & replace CLI (modern `sed` alternative) |
| **`rip`** | [`src/features/rip`](./src/features/rip/README.md) | Safe `rm` alternative with a graveyard and instant undelete |
| **`procs`** | [`src/features/procs`](./src/features/procs/README.md) | Modern `ps` replacement with colored tables and process tree view |
| **`watchexec`** | [`src/features/watchexec`](./src/features/watchexec/README.md) | Executes commands in response to file modifications |
| **`tokei`** | [`src/features/tokei`](./src/features/tokei/README.md) | Fast code counter displaying files, lines, blanks, comments, and code |
| **`gdu`** / **`gdu-go`** | [`src/features/gdu`](./src/features/gdu/README.md) | Fast disk usage analyzer and mounted disk explorer |
| **`ipinfo`** | [`src/features/ipinfo`](./src/features/ipinfo/README.md) | IP address geolocation, ASN, and network details lookup |
| **`subfinder`** | [`src/features/subfinder`](./src/features/subfinder/README.md) | Fast passive subdomain discovery tool |
| **`doggo`** | [`src/features/doggo`](./src/features/doggo/README.md) | Command-line DNS Client for Humans (modern `dig` alternative) |
| **`rad`** | [`src/features/rad`](./src/features/rad/README.md) | 45-module Rapid Application Development (RAD) utility suite (44 core + `sliceutils` alias) |

---

## Quick Start

```bash
# Install dependencies
bun install

# Run tests (155 passed across 16 test suites)
bun test
```

---

## CLI Usage

### 1. `fd` (Find Directory / Entries)

```bash
# Search for pattern in directory
bun run fd "index" src/

# Filter by file extension and type (f = file, d = dir, l = symlink, x = exec)
bun run fd -e ts -t f src/

# Search hidden files
bun run fd -H ".gitignore" .

# Limit search depth & skip shallow levels
bun run fd -d 2 --min-depth 1 "package" .

# Filter by size (+5M: larger than 5MB, -100k: smaller than 100KB)
bun run fd -S "+1M" src/

# Filter by modification time (e.g. 10m, 2h, 7d, 1w)
bun run fd --changed-within 24h .

# Find empty files only
bun run fd --empty .

# Exclude glob patterns
bun run fd -E "node_modules/*" -E "dist/*" .

# Execute a command for each result ({} replaced with path)
bun run fd "test" src/ -x "ls -lh {}"
```

### 2. `sd` (Search & Displace)

```bash
# In-place regex replacement in files
bun run sd "hello (\w+)" "hi $1" file.txt

# Literal string mode (disables regex interpretation)
bun run sd -s "old.domain.com" "new.domain.com" config.json

# Whole word matching (\b pattern \b)
bun run sd -w "cat" "feline" document.txt

# Create backup before writing (.bak extension)
bun run sd -b .bak "foo" "bar" file.txt

# Preview diffs without writing to disk
bun run sd "Bun System Utilities" "Bun Power Tools" index.ts --preview

# Only count matches without modifying files
bun run sd -c "import" "" src/index.ts

# Stream replacement via stdin
cat file.txt | bun run sd "foo" "bar" -
```

### 3. `rip` / `rip2` (Safe RM with Graveyard & Undo)

```bash
# Safely bury file or folder into graveyard
bun run rip unwanted_file.txt

# Dry-run preview without moving any files
bun run rip unwanted_file.txt --dry-run

# Inspect graveyard contents (seance listing with deletion date, size)
bun run rip --seance

# Inspect detailed metadata for a specific buried item
bun run rip -i 0

# Check total disk space consumed by graveyard
bun run rip --size

# Restore / undelete the last buried item back to its original location
bun run rip --unbury

# Restore a specific buried item by ID or filename
bun run rip --unbury unwanted_file.txt

# Prune graveyard items older than N days
bun run rip --prune 30

# Permanently purge all items from the graveyard
bun run rip --decompose
```

### 4. `procs` (Process Viewer & Interactive Manager)

```bash
# View process table
bun run procs

# Filter by keyword, PID, or command
bun run procs bun

# Filter processes by username
bun run procs -u root

# Inspect active listening TCP ports per process
bun run procs -P

# Limit process table output
bun run procs -n 10

# Hierarchical process tree view
bun run procs --tree

# Sort by CPU, memory, or PID
bun run procs --sort-cpu
bun run procs --sort-mem
bun run procs --sort-pid

# Terminate process by PID directly from CLI
bun run procs -k 12345 --signal SIGTERM

# Output process list as structured JSON
bun run procs -j

# Watch mode (updates every second)
bun run procs -w

# Launch Interactive TUI Process Explorer:
bun run procs -i
# Controls:
#   ↑/↓ (or k/j)     Navigate process list
#   PageUp/PageDown  Scroll 10 rows
#   / or f           Live process filter (name, PID, user; Enter to save, Esc to clear)
#   c / m / p / u    Sort by CPU, Memory, PID, or User
#   Space            Pause / resume live 2-second background refresh
#   Enter / d        Inspect detailed process modal (ports, child PIDs, full command)
#   x / K            Terminate selected process (SIGTERM) with auto-refresh
#   9 / X            Force kill selected process (SIGKILL)
#   r                Force refresh from OS
#   q / Ctrl+C       Exit interactive TUI (or close modal)
```

### 5. `watchexec` (File Watcher & Command Runner)

```bash
# Run tests whenever TypeScript files change
bun run watchexec -e ts -- bun test

# Watch specific folder with screen clear and debounce
bun run watchexec -w src -c -d 200 -- bun run index.ts

# Filter files by pattern (e.g. only files matching "router")
bun run watchexec -f "*router*" -- bun test

# Execute command inside a specific shell (bash, sh, zsh)
bun run watchexec -s bash -- "echo Changed: \$WATCHEXEC_WRITTEN_PATH"

# Wait for first file modification before executing
bun run watchexec --postpone -e ts -- bun run build

# Ignore patterns
bun run watchexec -i dist,build -e ts,json -- bun run build
```

### 6. `tokei` (Code & LOC Counter)

```bash
# Count lines of code in current directory
bun run tokei .

# Sort by code lines, files, comments, or blank lines
bun run tokei --sort code .
bun run tokei --sort files .

# Display per-file breakdown under each language
bun run tokei --files .

# Output as GitHub-flavored Markdown table (ideal for CI/CD or PR summaries)
bun run tokei -m .

# Output stats as structured JSON
bun run tokei -j .

# Exclude folders or patterns
bun run tokei -e "node_modules,dist" .
```

### 7. `gdu` / `gdu-go` (Fast Disk Usage Analyzer)

```bash
# Interactive TUI mode (default when run in terminal)
bun run gdu .
# Interactive TUI Controls:
#   ↑/↓ (or k/j)     Navigate items
#   Enter / →        Drill into directory (or inspect file details)
#   Backspace / ←    Navigate up to parent directory
#   d / Delete       Delete selected file/folder (prompts [y/N] confirmation, frees disk space)
#   / or f           Live item filter (Enter to save, Esc to clear)
#   s                Cycle sort mode: Size → Name → Count → Modified Time
#   i                Inspect detailed item card (exact bytes, parent %, mtime)
#   o                Open file or folder with system default viewer
#   r                Rescan current directory
#   q                Exit interactive TUI (or close modal)

# Non-interactive terminal report
bun run gdu -n .

# Show relative visual size bars and item counts
bun run gdu -B -C .

# Filter out items smaller than threshold (e.g. 10M, 500k, 1G)
bun run gdu -m 10M .

# Limit directory traversal depth
bun run gdu -L 2 .

# Sort items non-interactively (size, name, count)
bun run gdu -S name .

# Show top X largest items
bun run gdu -t 5 .

# Show summary total only
bun run gdu -s ~/Documents

# View all mounted disks and available space
bun run gdu -d

# Show sizes with decimal SI prefixes (kB, MB, GB instead of KiB, MiB)
bun run gdu --si .

# Ignore hidden files and directories
bun run gdu -H .

# Ignore specific paths (comma-separated)
bun run gdu -i "dist,node_modules" .

# Output entire directory tree as structured JSON
bun run gdu -j .
```

### 8. `ipinfo` (IP Geolocation & ASN Details)

```bash
# Look up current public IP details
bun run ipinfo

# Look up specific IP address
bun run ipinfo 8.8.8.8

# Extract specific field (org, city, country, loc, timezone)
bun run ipinfo 1.1.1.1 -f org

# Calculate IPv4 CIDR subnet details (broadcast, netmask, usable hosts)
bun run ipinfo 192.168.1.0/24

# Inspect local machine network interfaces and assigned IPs
bun run ipinfo --local

# Perform bulk IP lookups from file or stdin
bun run ipinfo -b ips.txt
cat ips.txt | bun run ipinfo -b -

# Output as JSON or CSV
bun run ipinfo 8.8.8.8 -j
bun run ipinfo 8.8.8.8 -c
```

### 9. `subfinder` (Passive Subdomain Discovery)

```bash
# Discover subdomains passively (crt.sh, HackerTarget, AlienVault, Anubis)
bun run subfinder -d example.com

# Active verification (resolves live IPs via DNS)
bun run subfinder -d example.com -active

# HTTP/HTTPS probe (checks HTTP status codes and extracts HTML page titles)
bun run subfinder -d example.com -probe

# Probe specific open ports (e.g. 80, 443, 8080, 8443)
bun run subfinder -d example.com --ports 80,443,8080

# Filter out wildcard DNS subdomains
bun run subfinder -d example.com --wildcard

# Silent output (subdomains only, ideal for piping to other tools)
bun run subfinder -d example.com -silent

# Output to JSON or save to file
bun run subfinder -d example.com -json -o results.json
```

### 10. `doggo` (DNS Client for Humans)

```bash
# Simple A record lookup
bun run doggo example.com

# Specific record types (A, AAAA, MX, TXT, CNAME, NS, SOA, CAA, PTR, SRV)
bun run doggo example.com MX
bun run doggo example.com TXT

# Query all common record types in parallel (A, AAAA, MX, TXT, NS)
bun run doggo example.com --all

# Custom nameserver via @nameserver syntax or -n flag
bun run doggo example.com @1.1.1.1
bun run doggo example.com AAAA @8.8.8.8

# DNS-over-HTTPS (DoH) via Cloudflare or Google
bun run doggo example.com --doh
bun run doggo example.com --doh --doh-url https://dns.google/resolve

# Reverse DNS PTR lookup for an IP address
bun run doggo 8.8.8.8 -x

# Short output (answers only, similar to dig +short) or JSON
bun run doggo example.com --short
bun run doggo example.com -j
```

### 11. `rad` (45-Module Rapid Application Development Suite)

A comprehensive, production-grade suite of **45 ergonomic utility modules** (44 core modules + `sliceutils` alias) engineered for **Rapid Application Development (RAD)** in [Bun](https://bun.com). Ported and extended from [`codecaine-zz/vlang_utils`](https://github.com/codecaine-zz/vlang_utils) and modern utility primitives inspired by [`toss/es-toolkit`](https://github.com/toss/es-toolkit), supercharged with native Bun standard library superpowers (`Bun.Glob`, `Bun.$`, `Bun.serve`, `Bun.hash`, `Bun.Transpiler`, `Bun.TOML`, `Bun.semver`, and `bun:sqlite` FTS5).

```bash
# Run full 44-module interactive showcase with execution timing
bun run rad

# Or via unified hub
bun run index.ts rad

# Run runnable dual cookbook (10 CLI tools + 44 RAD modules)
bun run rad:cookbook
```

👉 **[📖 View Exhaustive 45-Module API Specification & Code Recipes in src/features/rad/README.md](src/features/rad/README.md)** for complete function signatures, parameter types, and practical examples across all 370+ utility methods!

#### Complete 45-Module Index by Domain

| Domain | Modules Included | Superpowers & Highlights |
| :--- | :--- | :--- |
| **File & Storage (8)** | `fileutils`, `sqliteutils`, `tomlutils`, `archiveutils`, `compressutils`, `tarutils`, `stateutils`, `cacheutils` | Native `bun:sqlite` with FTS5, `Bun.TOML`, `Bun.deflateSync`/`Bun.inflateSync`, O(1) LRU & TTL |
| **Data Structures (8)** | `arrutils` / `sliceutils`, `objutils`, `structutils`, `statutils`, `mathutils`, `bitutils`, `graphutils` | `arrutils.at` (-1 index), `objutils.isEqual` (`Bun.deepEquals`), RingBuffer, MinHeap, DAG topo sort |
| **Strings & Formats (6)** | `strutils`, `regexutils`, `templateutils`, `colorutils`, `htmlutils`, `diffutils` | Slugs, privacy masks, Levenshtein, Truecolor ANSI, WCAG 2.1 contrast, `Bun.escapeHTML`, unified diff |
| **System & Runtime (9)** | `sysutils`, `cliutils`, `envutils`, `shellutils`, `globutils`, `transpileutils`, `logutils`, `cronutils`, `semverutils` | `Bun.$`, `Bun.which`, `Bun.Glob`, `Bun.Transpiler`, `Bun.semver.order`/`satisfies`, Cron humanizer |
| **Network & Web (7)** | `netutils`, `httputils`, `serverutils`, `urlutils`, `jwtutils`, `cryptoutils`, `hashutils` | `Bun.serve`, `Bun.hash` (`wyhash`, Bloom filter), `Bun.dns`, zero-dependency HS256 JWT, `Bun.password` |
| **Concurrency & Logic (7)** | `asyncutils`, `flowutils`, `fnutils`, `eventutils`, `validutils`, `mockutils`, `timeutils` | Bounded `parallelMap`, Token Bucket `RateLimiter`, CircuitBreaker, `fnutils.pipe`, `timeAgo`, `Bun.nanoseconds` |


---

## Unified Hub

You can also run any tool directly through the main entry point:

```bash
bun run index.ts fd "pattern" .
bun run index.ts procs --tree
bun run index.ts tokei .
bun run index.ts gdu -B -C .
bun run index.ts ipinfo 8.8.8.8
bun run index.ts subfinder -d example.com -silent
bun run index.ts doggo example.com MX @1.1.1.1
```

---

## Shell Autocompletions

Generate native autocompletion scripts for `bash`, `zsh`, or `fish` for any tool:

```bash
# Generate zsh autocompletion for doggo
bun run index.ts completions doggo zsh > ~/.zfunc/_doggo

# Generate bash autocompletion for procs
bun run index.ts completions procs bash > ~/.bash_completion.d/procs

# Generate fish autocompletion for gdu
bun run index.ts completions gdu fish > ~/.config/fish/completions/gdu.fish
```

---

## Standalone Binary Compilation

Compile any or all tools into zero-dependency standalone native binaries using Bun's compilation engine:

```bash
# Compile all 10 tools and unified hub into ./dist/
bun run build

# Direct standalone execution (no Node or Bun required on target system)
./dist/doggo example.com MX @1.1.1.1
./dist/gdu -B -C .
./dist/procs --tree
./dist/fd ".*\.ts$" src/
```

---

## Programmatic API Documentation

For full TypeScript function signatures, Doers, Coordinators, and types, see [docs/API.md](./docs/API.md).

