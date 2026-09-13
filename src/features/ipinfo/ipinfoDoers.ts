import { lookup, reverse } from "node:dns/promises";
import { networkInterfaces } from "node:os";
import type { IpInfoResult, LocalInterfaceInfo, SubnetInfo } from "./ipinfoTypes.ts";
import { colors } from "../../shared/colors.ts";
import { renderTable, type ColumnDef } from "../../shared/table.ts";

export function isIpAddress(input: string): boolean {
  const ipv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(input) || (input.includes(":") && ipv6.test(input));
}

export function isCidr(input: string): boolean {
  const parts = input.trim().split("/");
  if (parts.length !== 2) return false;
  const prefix = parseInt(parts[1], 10);
  return isIpAddress(parts[0]) && !isNaN(prefix) && prefix >= 0 && prefix <= 32;
}

export function cleanTarget(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export async function resolveTargetToIp(
  target?: string
): Promise<{ ip?: string; domain?: string }> {
  if (!target || target === "myip") return {};
  const cleaned = cleanTarget(target);
  if (isIpAddress(cleaned)) {
    return { ip: cleaned };
  }

  try {
    const res = await lookup(cleaned, { family: 4 }).catch(() => lookup(cleaned));
    return { ip: res.address, domain: cleaned };
  } catch {
    throw new Error(`[IpInfoResolve] Could not resolve host to IP: ${target}`);
  }
}

export async function fetchIpDetails(
  ip?: string,
  token?: string
): Promise<IpInfoResult> {
  const cleanIp = ip && ip !== "myip" ? `${ip.trim()}/` : "";
  const query = token ? `?token=${token}` : "";
  const url = `https://ipinfo.io/${cleanIp}json${query}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "bun-ipinfo/1.0" },
  });

  if (!res.ok) {
    throw new Error(`[IpInfoFetch] Request failed with status ${res.status}: ${res.statusText}`);
  }

  return (await res.json()) as IpInfoResult;
}

export function extractField(data: IpInfoResult, fieldName: string): string {
  const key = fieldName.toLowerCase().trim() as keyof IpInfoResult;
  const val = data[key];
  if (val === undefined || val === null) {
    throw new Error(`[IpInfoExtract] Field not found: ${fieldName}`);
  }
  return typeof val === "string" ? val : JSON.stringify(val);
}

export function formatSummary(data: IpInfoResult): string {
  const mapUrl = data.loc ? `https://maps.google.com/?q=${data.loc}` : undefined;
  const fields: [string, string | undefined][] = [
    ["IP", data.ip],
    ["Hostname", data.hostname],
    ["City", data.city],
    ["Region", data.region],
    ["Country", data.country],
    ["Location", data.loc],
    ["Google Maps", mapUrl],
    ["Organization", data.org],
    ["Postal", data.postal],
    ["Timezone", data.timezone],
  ];

  const lines = fields
    .filter(([_, val]) => val !== undefined && val !== "")
    .map(([label, val]) => `${colors.bold(colors.cyan(label.padEnd(14)))}: ${val}`);

  return lines.join("\n");
}

export function formatJson(data: IpInfoResult | IpInfoResult[]): string {
  return JSON.stringify(data, null, 2);
}

export function formatCsv(data: IpInfoResult): string {
  const headers = ["ip", "hostname", "city", "region", "country", "loc", "org", "postal", "timezone"];
  const values = headers.map((h) => {
    const val = (data as any)[h] ?? "";
    return `"${String(val).replace(/"/g, '""')}"`;
  });
  return `${headers.join(",")}\n${values.join(",")}`;
}

export async function readIpTargets(target: string): Promise<string[]> {
  const text = target === "-" ? await Bun.stdin.text() : await Bun.file(target).text();
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

export function formatBulkTable(results: IpInfoResult[]): string {
  const columns: ColumnDef<IpInfoResult>[] = [
    { header: "IP", align: "left", getValue: (r) => colors.bold(colors.cyan(r.ip)) },
    { header: "CITY", align: "left", getValue: (r) => r.city ?? "-" },
    { header: "REGION", align: "left", getValue: (r) => r.region ?? "-" },
    { header: "COUNTRY", align: "left", getValue: (r) => r.country ?? "-" },
    { header: "ORGANIZATION", align: "left", getValue: (r) => colors.yellow(r.org ?? "-") },
  ];
  return renderTable(columns, results);
}

export function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

export function intToIp(int: number): string {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join(".");
}

export function calculateSubnet(cidr: string): SubnetInfo {
  const [ipStr, prefixStr] = cidr.trim().split("/");
  const prefix = parseInt(prefixStr, 10);
  const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const wildcardInt = ~maskInt >>> 0;
  const ipInt = ipToInt(ipStr);
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const totalHosts = prefix === 32 ? 1 : Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

  return {
    cidr,
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    netmask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    firstHost: prefix >= 31 ? intToIp(networkInt) : intToIp(networkInt + 1),
    lastHost: prefix >= 31 ? intToIp(broadcastInt) : intToIp(broadcastInt - 1),
    totalHosts,
    usableHosts,
  };
}

export function formatSubnetInfo(info: SubnetInfo): string {
  const fields: [string, string][] = [
    ["CIDR Range", info.cidr],
    ["Network", info.network],
    ["Broadcast", info.broadcast],
    ["Netmask", info.netmask],
    ["Wildcard Mask", info.wildcard],
    ["Host Range", `${info.firstHost} - ${info.lastHost}`],
    ["Usable Hosts", info.usableHosts.toLocaleString()],
    ["Total Hosts", info.totalHosts.toLocaleString()],
  ];
  return fields
    .map(([lbl, val]) => `${colors.bold(colors.cyan(lbl.padEnd(14)))}: ${val}`)
    .join("\n");
}

export function getLocalInterfaces(): LocalInterfaceInfo[] {
  const ifaces = networkInterfaces();
  const result: LocalInterfaceInfo[] = [];
  for (const [name, list] of Object.entries(ifaces)) {
    if (!list) continue;
    for (const item of list) {
      result.push({
        name,
        address: item.address,
        family: item.family,
        netmask: item.netmask,
        mac: item.mac,
        internal: item.internal,
      });
    }
  }
  return result;
}

export function formatLocalInterfaces(ifaces: LocalInterfaceInfo[]): string {
  const columns: ColumnDef<LocalInterfaceInfo>[] = [
    { header: "INTERFACE", align: "left", getValue: (i) => colors.bold(colors.cyan(i.name)) },
    { header: "FAMILY", align: "left", getValue: (i) => i.family },
    { header: "ADDRESS", align: "left", getValue: (i) => colors.yellow(i.address) },
    { header: "NETMASK", align: "left", getValue: (i) => colors.dim(i.netmask) },
    { header: "MAC", align: "left", getValue: (i) => colors.dim(i.mac) },
    { header: "TYPE", align: "left", getValue: (i) => (i.internal ? "internal" : "external") },
  ];
  return renderTable(columns, ifaces);
}

export async function lookupPtr(ip: string): Promise<string | undefined> {
  if (!isIpAddress(ip)) return undefined;
  try {
    const hostnames = await reverse(ip);
    return hostnames[0];
  } catch {
    return undefined;
  }
}

