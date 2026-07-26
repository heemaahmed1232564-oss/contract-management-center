import { describe, expect, it } from "vitest";
import { resolveTemplate, type TemplateCandidate } from "@/lib/contracts/template-resolver";

const now = new Date("2026-07-14T12:00:00Z");
const base: TemplateCandidate = {
  id: "v1", agencyId: "agency", packageId: "package", contractType: "Marketing",
  duration: 3, price: 5000, currency: "SAR", offerCode: "SUMMER", version: "1.0",
  effectiveFrom: new Date("2026-01-01"), effectiveTo: null, isActive: true,
};
const criteria = { agencyId: "agency", packageId: "package", contractType: "Marketing", duration: 3, price: 5000, currency: "SAR", offerCode: "SUMMER", at: now };

describe("template resolver", () => {
  it("uses the latest effective version", () => {
    const result = resolveTemplate([base, { ...base, id: "v2", version: "2.0", effectiveFrom: new Date("2026-06-01") }], criteria);
    expect(result.kind).toBe("match");
    if (result.kind === "match") expect(result.template.id).toBe("v2");
  });

  it("returns ambiguity instead of choosing randomly", () => {
    const result = resolveTemplate([base, { ...base, id: "same-rank" }], criteria);
    expect(result.kind).toBe("ambiguous");
  });

  it("excludes inactive and expired versions", () => {
    const result = resolveTemplate([{ ...base, isActive: false }, { ...base, id: "expired", effectiveTo: new Date("2026-06-30") }], criteria);
    expect(result.kind).toBe("none");
  });
});
