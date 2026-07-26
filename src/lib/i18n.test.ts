import { describe, expect, it } from "vitest";
import { ContractStatus } from "@/generated/prisma/enums";
import { AppError, userMessage } from "@/lib/api-error";
import { contractStatusLabel } from "@/components/contracts/status-badge";
import { localizedName, localeTag, tx } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

describe("bilingual presentation", () => {
  it("selects the requested language", () => {
    expect(tx("ar", "العربية", "English")).toBe("العربية");
    expect(tx("en", "العربية", "English")).toBe("English");
    expect(localeTag("ar")).toBe("ar-EG");
    expect(localeTag("en")).toBe("en-US");
  });

  it("uses the Arabic company name only in Arabic", () => {
    const company = { name: "Azzrk", nameAr: "أزرق" };
    expect(localizedName("ar", company)).toBe("أزرق");
    expect(localizedName("en", company)).toBe("Azzrk");
  });

  it("falls back safely when an Arabic company name is missing", () => {
    expect(localizedName("ar", { name: "Azzrk", nameAr: null })).toBe("Azzrk");
  });

  it("localizes contract statuses", () => {
    expect(contractStatusLabel(ContractStatus.CERTIFIED, "ar")).toBe("موثّق");
    expect(contractStatusLabel(ContractStatus.CERTIFIED, "en")).toBe("Certified");
  });

  it("localizes API errors without exposing internal details", () => {
    const error = new AppError("DRIVE_NOT_CONNECTED", "اربط حساب Google Drive.");
    expect(userMessage(error, "ar")).toBe("اربط حساب Google Drive.");
    expect(userMessage(error, "en")).toBe(
      "Connect Google Drive from the admin overview first.",
    );
    expect(userMessage(new Error("database secret"), "en")).not.toContain("database secret");
  });

  it("formats money using the active interface locale", () => {
    const arabic = formatMoney(1250, "SAR", "ar");
    const english = formatMoney(1250, "SAR", "en");
    expect(arabic).not.toBe(english);
    expect(english).toContain("1,250");
  });
});
