export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

const SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

// Doer: Parse semantic version string
export function parseSemver(version: string): SemVer {
  const match = version.trim().match(SEMVER_REGEX);
  if (!match) {
    throw new Error(`[semverutils] Invalid semantic version format: "${version}"`);
  }
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    prerelease: match[4],
    build: match[5],
  };
}

// Doer: Compare two semantic versions (-1: v1 < v2, 0: equal, 1: v1 > v2)
export function compareSemver(v1: string, v2: string): -1 | 0 | 1 {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  // Prerelease comparison: non-prerelease has higher precedence than prerelease
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    if (p1.prerelease > p2.prerelease) return 1;
    if (p1.prerelease < p2.prerelease) return -1;
  }
  return 0;
}

// Coordinator: Check if version satisfies caret, tilde, or comparator range
export function satisfiesRange(version: string, range: string): boolean {
  const v = parseSemver(version);
  const r = range.trim();
  if (r === "*" || r === "") return true;

  if (r.startsWith("^")) {
    const base = parseSemver(r.slice(1));
    if (v.major !== base.major) return false;
    return compareSemver(version, r.slice(1)) >= 0;
  }

  if (r.startsWith("~")) {
    const base = parseSemver(r.slice(1));
    if (v.major !== base.major || v.minor !== base.minor) return false;
    return compareSemver(version, r.slice(1)) >= 0;
  }

  if (r.startsWith(">=")) {
    return compareSemver(version, r.slice(2).trim()) >= 0;
  }
  if (r.startsWith("<=")) {
    return compareSemver(version, r.slice(2).trim()) <= 0;
  }
  if (r.startsWith(">")) {
    return compareSemver(version, r.slice(1).trim()) > 0;
  }
  if (r.startsWith("<")) {
    return compareSemver(version, r.slice(1).trim()) < 0;
  }

  return compareSemver(version, r) === 0;
}

// Doer: Bump major, minor, or patch version component
export function bumpVersion(version: string, type: "major" | "minor" | "patch"): string {
  const v = parseSemver(version);
  if (type === "major") {
    return `${v.major + 1}.0.0`;
  }
  if (type === "minor") {
    return `${v.major}.${v.minor + 1}.0`;
  }
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

export const semverutils = {
  parseSemver,
  compareSemver,
  satisfiesRange,
  bumpVersion,
};
