import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = resolve(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of [
  "index.html",
  "styles.css",
  "assets",
  "data",
  "js",
  "vendor",
  "workwithme",
]) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
console.log("Built the original portfolio and /workwithme into dist/.");
