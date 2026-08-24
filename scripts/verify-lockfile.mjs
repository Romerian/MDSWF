import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));

const failures = [];
for (const [name, requested] of Object.entries(manifest.dependencies)) {
  if (!/^\d+\.\d+\.\d+([+-].+)?$/.test(requested)) failures.push(`${name} is not pinned to an exact version: ${requested}`);
  const resolved = lock.packages?.[`node_modules/${name}`]?.version;
  if (resolved !== requested) failures.push(`${name} resolves to ${resolved ?? "nothing"}, expected ${requested}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Verified ${Object.keys(manifest.dependencies).length} pinned production dependencies against package-lock.json.`);
