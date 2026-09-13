import { lookup } from "node:dns/promises";

export function cleanDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export function cleanSubdomain(raw: string, rootDomain: string): string | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^\*\./, "")
    .replace(/[^a-z0-9.-]/g, "");

  if (!cleaned || cleaned === rootDomain) return cleaned || null;
  if (!cleaned.endsWith(`.${rootDomain}`) && cleaned !== rootDomain) return null;
  return cleaned;
}

export function deduplicateSubdomains(list: string[]): string[] {
  return Array.from(new Set(list)).sort();
}

export async function queryHackerTarget(
  domain: string,
  timeoutMs: number = 8000
): Promise<string[]> {
  try {
    const res = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "bun-subfinder/1.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (text.includes("error") || text.includes("No DNS records found")) return [];
    return text
      .split("\n")
      .map((line) => line.split(",")[0]?.trim())
      .filter((h): h is string => Boolean(h));
  } catch {
    return [];
  }
}

export async function queryCrtSh(
  domain: string,
  timeoutMs: number = 8000
): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "bun-subfinder/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ name_value?: string }>;
    const results: string[] = [];
    for (const item of data) {
      if (!item.name_value) continue;
      const subdomains = item.name_value.split("\n");
      results.push(...subdomains);
    }
    return results;
  } catch {
    return [];
  }
}

export async function queryAlienVault(
  domain: string,
  timeoutMs: number = 8000
): Promise<string[]> {
  try {
    const url = `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "bun-subfinder/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { passive_dns?: Array<{ hostname?: string }> };
    return (data.passive_dns ?? [])
      .map((d) => d.hostname)
      .filter((h): h is string => Boolean(h));
  } catch {
    return [];
  }
}

export async function queryAnubis(
  domain: string,
  timeoutMs: number = 8000
): Promise<string[]> {
  try {
    const res = await fetch(`https://jldc.me/anubis/subdomains/${domain}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "bun-subfinder/1.0" },
    });
    if (!res.ok) return [];
    return (await res.json()) as string[];
  } catch {
    return [];
  }
}

export async function resolveHostDns(host: string): Promise<string[]> {
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.map((a) => a.address);
  } catch {
    return [];
  }
}

export async function probeHttp(
  host: string,
  timeoutMs: number = 3000
): Promise<{ status?: number; title?: string }> {
  for (const proto of ["https", "http"]) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${proto}://${host}`, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      clearTimeout(id);
      const html = await res.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = match ? match[1]!.trim().slice(0, 40) : undefined;
      return { status: res.status, title };
    } catch {
      // Try next protocol or fail
    }
  }
  return {};
}

export async function detectWildcardDns(rootDomain: string): Promise<string[]> {
  const randomPrefix = `probe-wildcard-${Math.random().toString(36).substring(2, 10)}`;
  const testHost = `${randomPrefix}.${rootDomain}`;
  return resolveHostDns(testHost);
}

export function isWildcardMatch(ips: string[], wildcardIps: string[]): boolean {
  if (wildcardIps.length === 0 || ips.length === 0) return false;
  return ips.every((ip) => wildcardIps.includes(ip));
}

export async function probePort(host: string, port: number, timeoutMs: number = 1500): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        open(s) {
          s.end();
        },
        data() {},
        error() {},
        close() {},
      },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

export async function probePorts(
  host: string,
  ports: number[],
  timeoutMs: number = 1500
): Promise<number[]> {
  const openPorts: number[] = [];
  await Promise.all(
    ports.map(async (port) => {
      const isOpen = await probePort(host, port, timeoutMs);
      if (isOpen) openPorts.push(port);
    })
  );
  return openPorts.sort((a, b) => a - b);
}

