import { cp, mkdir, readFile, readdir, readlink, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = join(projectRoot, "runtime");
const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));

async function copy(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

await rm(runtimeRoot, { recursive: true, force: true });
await copy(join(projectRoot, ".next", "standalone"), runtimeRoot);
await copy(join(projectRoot, ".next", "static"), join(runtimeRoot, ".next", "static"));
await copy(join(projectRoot, "public"), join(runtimeRoot, "public"));
await copy(join(projectRoot, "prisma", "migrations"), join(runtimeRoot, "prisma", "migrations"));
await copy(join(projectRoot, "scripts", "runtime-migrate.mjs"), join(runtimeRoot, "migrate.mjs"));
await copy(join(projectRoot, "scripts", "runtime-seed-admin.mjs"), join(runtimeRoot, "seed-admin.mjs"));
await copy(join(projectRoot, "RESET-PASSWORD-HASH.cjs"), join(runtimeRoot, "reset-password-hash.cjs"));
await copy(join(projectRoot, "node_modules", "bcryptjs"), join(runtimeRoot, "node_modules", "bcryptjs"));
await copy(join(projectRoot, "node_modules", "pdfjs-dist"), join(runtimeRoot, "node_modules", "pdfjs-dist"));
await copy(
  join(projectRoot, "node_modules", "@napi-rs", "canvas"),
  join(runtimeRoot, "node_modules", "@napi-rs", "canvas"),
);
await copy(
  join(projectRoot, "node_modules", "@napi-rs", "canvas-linux-x64-gnu"),
  join(runtimeRoot, "node_modules", "@napi-rs", "canvas-linux-x64-gnu"),
);

async function materializeStandaloneAliases() {
  const aliasRoot = join(runtimeRoot, ".next", "node_modules");
  async function walk(folder) {
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      const aliasPath = join(folder, entry.name);
      if (entry.isSymbolicLink()) {
        const targetPath = resolve(dirname(aliasPath), await readlink(aliasPath));
        await rm(aliasPath, { recursive: true, force: true });
        await cp(targetPath, aliasPath, { recursive: true });
      } else if (entry.isDirectory()) {
        await walk(aliasPath);
      }
    }
  }
  await walk(aliasRoot);
}

await materializeStandaloneAliases();

async function verifyPdfPositioningRuntime() {
  const pdfUrl = pathToFileURL(
    join(runtimeRoot, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs"),
  ).href;
  const workerUrl = pathToFileURL(
    join(runtimeRoot, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs"),
  ).href;
  const standardFontDataUrl = `${join(
    runtimeRoot,
    "node_modules",
    "pdfjs-dist",
    "standard_fonts",
  )}/`;
  const [{ getDocument }, pdfjsWorker] = await Promise.all([import(pdfUrl), import(workerUrl)]);
  globalThis.pdfjsWorker = pdfjsWorker;

  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const page = document.addPage([300, 200]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("CMC_RUNTIME_ANCHOR", { x: 25, y: 75, size: 12, font });
  const bytes = await document.save();
  const task = getDocument({ data: bytes, standardFontDataUrl });
  const loaded = await task.promise;
  try {
    const text = await (await loaded.getPage(1)).getTextContent();
    if (!text.items.some((item) => "str" in item && item.str.includes("CMC_RUNTIME_ANCHOR"))) {
      throw new Error("PDF.js loaded but could not locate the runtime anchor.");
    }
  } finally {
    await loaded.destroy();
  }
}

await verifyPdfPositioningRuntime();

await writeFile(
  join(runtimeRoot, "RELEASE.json"),
  `${JSON.stringify(
    {
      name: packageJson.name,
      version: packageJson.version,
      node: "24",
      mode: "prebuilt",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Prepared prebuilt runtime ${packageJson.version} at ${runtimeRoot}`);
