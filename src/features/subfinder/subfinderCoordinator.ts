import type { SubdomainResult, SubfinderOptions } from "./subfinderTypes.ts";
import {
  cleanDomain,
  cleanSubdomain,
  deduplicateSubdomains,
  detectWildcardDns,
  isWildcardMatch,
  probeHttp,
  probePorts,
  queryAlienVault,
  queryAnubis,
  queryCrtSh,
  queryHackerTarget,
  resolveHostDns,
} from "./subfinderDoers.ts";
import { colors } from "../../shared/colors.ts";

export async function enumerateDomain(
  domain: string,
  timeoutMs: number,
  active: boolean,
  probe: boolean = false,
  ports?: number[],
  detectWildcard: boolean = false
): Promise<SubdomainResult[]> {
  const rootDomain = cleanDomain(domain);
  const [hackertarget, crtsh, alienvault, anubis, wildcardIps] = await Promise.all([
    queryHackerTarget(rootDomain, timeoutMs),
    queryCrtSh(rootDomain, timeoutMs),
    queryAlienVault(rootDomain, timeoutMs),
    queryAnubis(rootDomain, timeoutMs),
    detectWildcard || active ? detectWildcardDns(rootDomain) : Promise.resolve([]),
  ]);

  const rawHosts = [...hackertarget, ...crtsh, ...alienvault, ...anubis];
  const cleaned = rawHosts
    .map((h) => cleanSubdomain(h, rootDomain))
    .filter((h): h is string => h !== null);

  const uniqueHosts = deduplicateSubdomains(cleaned);
  const results: SubdomainResult[] = [];

  for (const host of uniqueHosts) {
    const sources: string[] = [];
    if (hackertarget.includes(host)) sources.push("hackertarget");
    if (crtsh.includes(host)) sources.push("crtsh");
    if (alienvault.includes(host)) sources.push("alienvault");
    if (anubis.includes(host)) sources.push("anubis");

    let ip: string[] | undefined = undefined;
    let isWildcard: boolean | undefined = undefined;
    if (active) {
      ip = await resolveHostDns(host);
      if (ip.length === 0) continue; // Skip inactive hosts
      isWildcard = isWildcardMatch(ip, wildcardIps);
    }

    let httpStatus: number | undefined = undefined;
    let httpTitle: string | undefined = undefined;
    if (probe) {
      const p = await probeHttp(host, 3000);
      httpStatus = p.status;
      httpTitle = p.title;
    }

    let openPorts: number[] | undefined = undefined;
    if (ports && ports.length > 0) {
      openPorts = await probePorts(host, ports, 1500);
    }

    results.push({ host, sources, ip, httpStatus, httpTitle, openPorts, isWildcard });
  }

  return results;
}

export function formatSubdomainResult(
  res: SubdomainResult,
  options: SubfinderOptions
): string {
  if (options.json) {
    return JSON.stringify(res);
  }
  if (options.silent) {
    return res.host;
  }
  const hostStr = colors.bold(colors.cyan(res.host));
  const ipStr = res.ip && res.ip.length > 0 ? ` ${colors.dim(`[${res.ip.join(", ")}]`)}` : "";
  const wildcardStr = res.isWildcard ? ` ${colors.yellow("[wildcard]")}` : "";
  const portsStr = res.openPorts && res.openPorts.length > 0 ? ` ${colors.magenta(`[ports: ${res.openPorts.join(",")}]`)}` : "";
  const statusStr = res.httpStatus ? ` ${colors.green(`[${res.httpStatus}]`)}` : "";
  const titleStr = res.httpTitle ? ` ${colors.dim(`("${res.httpTitle}")`)}` : "";
  const srcStr = res.sources.length > 0 ? ` ${colors.yellow(`(${res.sources.join(",")})`)}` : "";
  return `${hostStr}${ipStr}${wildcardStr}${portsStr}${statusStr}${titleStr}${srcStr}`;
}

export async function runSubfinderCoordinator(
  options: SubfinderOptions
): Promise<string[]> {
  const allResults: SubdomainResult[] = [];

  for (const domain of options.domains) {
    const domainResults = await enumerateDomain(
      domain,
      options.timeoutMs,
      options.active,
      options.probe,
      options.ports,
      options.detectWildcard
    );
    allResults.push(...domainResults);
  }

  const lines = allResults.map((r) => formatSubdomainResult(r, options));

  if (options.outputFile) {
    await Bun.write(options.outputFile, lines.join("\n") + "\n");
  }

  return lines;
}
