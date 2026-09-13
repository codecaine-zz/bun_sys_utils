import { describe, expect, it } from "bun:test";
import { formatSize, TARGETS } from "./build";

describe("Build Script", () => {
  it("should have all 11 targets configured", () => {
    expect(TARGETS.length).toBe(11);
    const names = TARGETS.map((t) => t.name);
    expect(names).toContain("fd");
    expect(names).toContain("sd");
    expect(names).toContain("rip");
    expect(names).toContain("procs");
    expect(names).toContain("watchexec");
    expect(names).toContain("tokei");
    expect(names).toContain("gdu");
    expect(names).toContain("ipinfo");
    expect(names).toContain("subfinder");
    expect(names).toContain("doggo");
    expect(names).toContain("sysutils");
  });

  it("should format file sizes correctly", () => {
    expect(formatSize(512)).toBe("0.5 KB");
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatSize(55 * 1024 * 1024)).toBe("55.00 MB");
  });
});
