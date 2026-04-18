/**
 * Copies dist/MockupLocalEngine.exe (repo root) -> public/MockupLocalEngine.exe
 * Run from frontend/frontend: npm run sync:local-engine
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const repoRoot = join(frontendRoot, "..", "..");
const src = join(repoRoot, "dist", "MockupLocalEngine.exe");
const destDir = join(frontendRoot, "public");
const dest = join(destDir, "MockupLocalEngine.exe");

if (!existsSync(src)) {
  console.error(
    "Missing:", src,
    "\nBuild first: python companion_app/build_exe.py (from repo root)",
  );
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("Copied to", dest);
