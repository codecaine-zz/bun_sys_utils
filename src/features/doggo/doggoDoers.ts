import { Resolver } from "node:dns/promises";
import type { DnsAnswer, DnsRecordType, DoggoResponse } from "./doggoTypes.ts";
import { colors } from "../../shared/colors.ts";
import { renderTable, type ColumnDef } from "../../shared/table.ts";

export const RECORD_TYPES: DnsRecordType[] = [
  "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR", "CAA", "SRV"
];

export function parseTargetArgs(args: string[]): {
  domain?: string;
  type?: DnsRecordType;
  nameserver?: string;
} {
  let domain: string | undefined;
  let type: DnsRecordType | undefined;
  let nameserver: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("@")) {
      nameserver = arg.slice(1);
    } else if (RECORD_TYPES.includes(arg.toUpperCase() as DnsRecordType)) {
      type = arg.toUpperCase() as DnsRecordType;
    } else if (!domain) {
      domain = arg;
    }
  }

  return { domain, type, nameserver };
}

export function isIpAddress(target: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(target) || target.includes(":");
}

export function formatRecordData(type: DnsRecordType, item: any): { data: string; ttl?: number } {
  if (typeof item === "string") return { data: item };
  if (Array.isArray(item)) return { data: `"${item.join(" ")}"` };
  if (item.address) return { data: item.address, ttl: item.ttl };
  if (typeof item.exchange === "string") return { data: `${item.priority} ${item.exchange || "."}` };
  if (item.nsname) {
    const parts = [item.nsname, item.hostmaster, item.serial, item.refresh, item.retry, item.expire, item.minttl].filter(Boolean);
    return { data: parts.join(" ") };
  }
  if (item.critical !== undefined) {
    const tag = item.issue ? "issue" : item.issuewild ? "issuewild" : item.iodef ? "iodef" : "contactemail";
    const val = item.issue ?? item.issuewild ?? item.iodef ?? "";
    return { data: `${item.critical ? "128" : "0"} ${tag} "${val}"` };
  }
  if (item.name && item.port) return { data: `${item.priority} ${item.weight} ${item.port} ${item.name}` };
  return { data: JSON.stringify(item) };
}

export async function performDnsLookup(
  domain: string,
  type: DnsRecordType,
  nameserver?: string
): Promise<DoggoResponse> {
  const resolver = new Resolver();
  if (nameserver) {
    resolver.setServers([nameserver]);
  }
  const activeServer = nameserver ?? resolver.getServers()[0] ?? "default";

  const start = performance.now();
  let rawRecords: any[] = [];

  try {
    if (type === "A") rawRecords = await resolver.resolve4(domain, { ttl: true });
    else if (type === "AAAA") rawRecords = await resolver.resolve6(domain, { ttl: true });
    else if (type === "CNAME") rawRecords = await resolver.resolveCname(domain);
    else if (type === "MX") rawRecords = await resolver.resolveMx(domain);
    else if (type === "TXT") rawRecords = await resolver.resolveTxt(domain);
    else if (type === "NS") rawRecords = await resolver.resolveNs(domain);
    else if (type === "SOA") rawRecords = [await resolver.resolveSoa(domain)];
    else if (type === "PTR") {
      rawRecords = isIpAddress(domain)
        ? await resolver.reverse(domain)
        : await resolver.resolvePtr(domain);
    }
    else if (type === "CAA") rawRecords = await resolver.resolveCaa(domain);
    else if (type === "SRV") rawRecords = await resolver.resolveSrv(domain);
  } catch (err: any) {
    if (err.code !== "ENODATA" && err.code !== "ENOTFOUND") {
      throw err;
    }
  }

  const queryTimeMs = Math.round(performance.now() - start);
  const answers: DnsAnswer[] = rawRecords.map((item) => {
    const { data, ttl } = formatRecordData(type, item);
    return { name: `${domain}.`, type, class: "IN", ttl, data };
  });

  return { domain, queryType: type, answers, queryTimeMs, server: activeServer, protocol: "UDP" };
}

export const DNS_TYPE_MAP: Record<number, string> = {
  1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 257: "CAA"
};

export async function performDohLookup(
  domain: string,
  type: string = "A",
  dohUrl: string = "https://cloudflare-dns.com/dns-query"
): Promise<DoggoResponse> {
  const start = performance.now();
  const url = `${dohUrl}?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`[DoggoDoH] HTTP error ${res.status}: ${res.statusText}`);
  const json: any = await res.json();
  const queryTimeMs = Math.round(performance.now() - start);
  const answers: DnsAnswer[] = (json.Answer ?? []).map((ans: any) => ({
    name: ans.name,
    type: DNS_TYPE_MAP[ans.type] ?? String(ans.type),
    class: "IN",
    ttl: ans.TTL,
    data: ans.data,
  }));
  return { domain, queryType: type, answers, queryTimeMs, server: dohUrl, protocol: "DoH" };
}

export async function performAllLookup(
  domain: string,
  nameserver?: string,
  isDoh?: boolean
): Promise<DoggoResponse> {
  const types: DnsRecordType[] = ["A", "AAAA", "MX", "TXT", "NS"];
  const lookups = await Promise.all(
    types.map((t) => (isDoh ? performDohLookup(domain, t) : performDnsLookup(domain, t, nameserver)))
  );
  const answers = lookups.flatMap((l) => l.answers);
  const queryTimeMs = Math.max(...lookups.map((l) => l.queryTimeMs));
  const server = lookups[0]?.server ?? "default";
  return { domain, queryType: "ALL", answers, queryTimeMs, server, protocol: isDoh ? "DoH" : "UDP" };
}

export function formatDoggoTable(res: DoggoResponse, showTime: boolean = true): string {
  const proto = res.protocol ? ` (${res.protocol})` : "";
  const footer = showTime ? `\n${colors.dim(`Query time: ${res.queryTimeMs}ms  Server: ${res.server}${proto}`)}` : "";
  if (res.answers.length === 0) {
    return `${colors.dim(`No ${res.queryType} records found for ${res.domain}.`)}${footer}`;
  }

  const columns: ColumnDef<DnsAnswer>[] = [
    { header: "NAME", align: "left", getValue: (a) => colors.bold(a.name) },
    { header: "TYPE", align: "left", getValue: (a) => colors.yellow(a.type) },
    { header: "CLASS", align: "left", getValue: (a) => colors.dim(a.class) },
    { header: "TTL", align: "right", getValue: (a) => (a.ttl ? colors.dim(a.ttl.toString()) : "-") },
    { header: "ADDRESS / DATA", align: "left", getValue: (a) => colors.cyan(a.data) },
  ];

  const table = renderTable(columns, res.answers);
  return `${table}${footer}`;
}

export function formatShortOutput(res: DoggoResponse): string {
  return res.answers.map((a) => a.data).join("\n");
}

export function formatJsonOutput(res: DoggoResponse): string {
  return JSON.stringify(res, null, 2);
}
