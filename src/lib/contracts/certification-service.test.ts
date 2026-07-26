import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { addCertificationImages } from "@/lib/contracts/certification-service";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8AARAwMDAxQAAAKAAH+4n0xAAAAAElFTkSuQmCC",
  "base64",
);

async function pdfWithAnchor(anchor: string, y: number) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Contract table", { x: 50, y: 700, size: 12, font });
  page.drawText(anchor, { x: 430, y, size: 1, font });
  return Buffer.from(await pdf.save());
}

const settings = {
  alignment: "RIGHT" as const,
  layout: "SIGNATURE_RIGHT_STAMP_LEFT" as const,
  horizontalOffsetPt: 18,
  itemGapPt: 12,
  signatureWidthPt: 150,
  stampWidthPt: 115,
};

describe("contract certification PDF placement", () => {
  it("places the company identity on the anchor page when there is room", async () => {
    const anchor = "CMC_ANCHOR_room";
    const result = await addCertificationImages(await pdfWithAnchor(anchor, 560), anchor, PNG, PNG, settings);
    const certified = await PDFDocument.load(result.pdf);
    expect(certified.getPageCount()).toBe(1);
    expect(result.pageNumber).toBe(1);
    expect(result.usedOverflowPage).toBe(false);
  });

  it("adds a clean page when the last table leaves too little space", async () => {
    const anchor = "CMC_ANCHOR_overflow";
    const result = await addCertificationImages(await pdfWithAnchor(anchor, 45), anchor, PNG, PNG, settings);
    const certified = await PDFDocument.load(result.pdf);
    expect(certified.getPageCount()).toBe(2);
    expect(result.pageNumber).toBe(2);
    expect(result.usedOverflowPage).toBe(true);
  });
});
