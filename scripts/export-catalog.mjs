import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build } from "vite";

const root = process.cwd();
const outputPath = path.resolve(root, process.argv[2] || "database/mysql/catalog/financial-catalog-20260914.json");

const bundle = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    ssr: path.resolve(root, "src/data.ts"),
    target: "node22",
    write: false,
    minify: false,
  },
});

const output = Array.isArray(bundle) ? bundle[0] : bundle;
const chunk = output.output.find((item) => item.type === "chunk");
if (!chunk || chunk.type !== "chunk") throw new Error("Vite did not emit the catalog module");
const encoded = Buffer.from(chunk.code).toString("base64");
const data = await import(`data:text/javascript;base64,${encoded}`);
const products = data.products.map(({ estimate, evaluate, ...product }) => product);
const payload = {
  schemaVersion: 1,
  batchKey: "financial-catalog-20260914",
  generatedAt: new Date().toISOString(),
  sourceLabel: "跨境金融产品方合并总表-0903及四个机构资料包",
  counts: {
    products: products.length,
    partners: data.partners.length,
    libraryDocuments: data.libraryDocuments.length,
  },
  products,
  partners: data.partners,
  libraryDocuments: data.libraryDocuments,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(`${outputPath}\n`);
