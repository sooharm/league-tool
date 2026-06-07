import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ports = [3000, 3001, 3002];

function killPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port}" | findstr LISTENING`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const pid = Number.parseInt(trimmed.split(/\s+/).at(-1) ?? "", 10);
      if (Number.isFinite(pid) && pid > 0) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}`);
      } catch {
        // already exited
      }
    }
  } catch {
    // nothing listening
  }
}

for (const port of ports) {
  killPort(port);
}

const nextDir = path.join(process.cwd(), ".next");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
}

console.log("Dev environment cleaned");
