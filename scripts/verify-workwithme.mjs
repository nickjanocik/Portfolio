import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({
  entryPoints: [resolve(root, "workwithme-src/lib/contact.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  define: { "import.meta.env": "{}" },
});
const { calendlyEventUrl, emailDraft, CALENDLY_URL, FORM_ENDPOINT } =
  await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
  );
assert.equal(CALENDLY_URL, null);
assert.equal(FORM_ENDPOINT, null);
for (const invalid of [
  undefined,
  "",
  "javascript:alert(1)",
  "https://calendly.com.evil.test/nick/event",
  "http://calendly.com/nick/event",
  "https://calendly.com/nick",
  "https://user:password@calendly.com/nick/event",
])
  assert.equal(calendlyEventUrl(invalid), null);
assert.equal(
  calendlyEventUrl("https://calendly.com/example/consultation"),
  "https://calendly.com/example/consultation",
);
const fields = {
  name: "A & B",
  email: "someone+test@example.com",
  business: "Service & Supply",
  message: "First line\nSecond line: 5% & ? # “quoted”",
};
const draft = new URL(emailDraft(fields));
assert.equal(draft.protocol, "mailto:");
assert.equal(draft.pathname, "nickjanocik@gmail.com");
assert.equal(
  draft.searchParams.get("subject"),
  "Free consultation: Service & Supply",
);
assert.ok(draft.searchParams.get("body").includes(fields.message));
assert.ok(draft.searchParams.get("body").includes(fields.email));
assert.equal([...draft.searchParams.keys()].join(","), "subject,body");
let files = 0;
async function compare(relative) {
  const source = resolve(root, relative);
  if ((await stat(source)).isDirectory()) {
    for (const name of await readdir(source))
      await compare(`${relative}/${name}`);
  } else {
    assert.deepEqual(
      await readFile(resolve(root, "dist", relative)),
      await readFile(source),
      `Original site asset changed in build: ${relative}`,
    );
    files++;
  }
}
for (const name of [
  "index.html",
  "styles.css",
  "assets",
  "data",
  "js",
  "vendor",
])
  await compare(name);
const page = await readFile(
  resolve(root, "dist/workwithme/index.html"),
  "utf8",
);
assert.ok(page.includes("https://nickjanocik.com/workwithme"));
for (const match of page.matchAll(/(?:src|href)="(\/workwithme\/[^"#]+)"/g))
  await stat(resolve(root, "dist", match[1].slice(1)));
assert.ok(!(await readdir(resolve(root, "dist"))).includes("workwithme-src"));
const copy = JSON.parse(
  await readFile(resolve(root, "workwithme-src/content.json"), "utf8"),
);
assert.equal(Object.keys(copy).length, 9);
assert.equal(copy.problems.examples.length, 4);
assert.equal(copy.start.steps.length, 4);
assert.equal(copy.faq.items.length, 6);
assert.ok(copy.start.boundary.includes("separate paid work"));
assert.ok(!JSON.stringify(copy).includes("—"));
console.log(
  `Passed: booking URL validation, email draft encoding, required content, built route assets, and ${files} unchanged original-site files.`,
);
