import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
