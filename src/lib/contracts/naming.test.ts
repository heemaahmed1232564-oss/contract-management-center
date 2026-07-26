import { describe, expect, it } from "vitest";
import { buildContractFileName, sanitizeFilePart } from "@/lib/contracts/naming";

describe("contract file naming", () => {
  it("preserves Arabic and replaces invalid Drive filename characters", () => {
    expect(sanitizeFilePart("شركة/أحمد: الجديدة")) .toBe("شركة-أحمد- الجديدة");
  });

  it("uses a client fallback and never renders undefined", () => {
    const name = buildContractFileName(undefined, {
      reference_number: "CTR-2026-000125",
      agency_code: "AG01",
      package_code: "VIP-3M",
      client_name: undefined,
      employee_name: "إبراهيم",
      date: "2026-07-14",
    });
    expect(name).toContain("No-Client-Name");
    expect(name).not.toContain("undefined");
  });

  it("limits long names while retaining the reference", () => {
    const name = buildContractFileName(undefined, {
      reference_number: "CTR-2026-999999",
      agency_code: "AG01",
      package_code: "VIP",
      client_name: "أ".repeat(300),
      employee_name: "إبراهيم",
      date: "2026-07-14",
    }, 120);
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name).toContain("CTR-2026-999999");
  });
});
