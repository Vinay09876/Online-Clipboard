/**
 * Starts `next start` (production build) on a port with env overrides, for test scripts.
 * Requires a prior `npm run build`.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

const NEXT_BIN = "node_modules/next/dist/bin/next";
const running: Array<() => void> = [];

export async function startServer(port: number, env: Record<string, string>): Promise<string> {
  const child: ChildProcess = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs: string[] = [];
  child.stdout?.on("data", (d) => logs.push(String(d)));
  child.stderr?.on("data", (d) => logs.push(String(d)));
  running.push(() => {
    if (child.exitCode !== null) return;
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    else child.kill();
  });

  const base = `http://localhost:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`server on ${port} exited:\n${logs.join("").slice(-1500)}`);
    try {
      if ((await fetch(`${base}/api/clips/abc`)).status === 400) return base;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server on ${port} did not start:\n${logs.join("").slice(-1500)}`);
}

export function stopAllServers() {
  for (const stop of running.splice(0)) stop();
}

export function build(): boolean {
  console.log("Building the app (next build)…");
  return spawnSync(process.execPath, [NEXT_BIN, "build"], { stdio: "inherit" }).status === 0;
}
