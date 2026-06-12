// Start the emu backend (uvicorn) and frontend (vite) together: `bun run dev`.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = import.meta.dir;
const python = resolve(root, "backend/.venv/bin/python");

if (!existsSync(python)) {
  console.error("backend venv missing. Set it up first:");
  console.error("  cd tools/emu/backend && python3 -m venv .venv && .venv/bin/pip install -e .");
  process.exit(1);
}

const backend = Bun.spawn([python, "-m", "emu.api"], {
  cwd: resolve(root, "backend"),
  stdout: "inherit",
  stderr: "inherit",
});

const frontend = Bun.spawn(["bun", "run", "dev"], {
  cwd: resolve(root, "frontend"),
  stdout: "inherit",
  stderr: "inherit",
});

const procs = [backend, frontend];
const shutdown = () => procs.forEach((proc) => proc.kill());
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

// If either side exits (crash or clean), take the other down with it.
const code = await Promise.race(procs.map((proc) => proc.exited));
shutdown();
process.exit(code);
