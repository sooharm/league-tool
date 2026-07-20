const fs = require("fs");
const path = require("path");

const src = path.join("src", "app", "Pro");
const dest = path.join("src", "app", "season4");

function walk(dir, base = "") {
  for (const name of fs.readdirSync(dir)) {
    if (name === "db") continue;
    const rel = path.join(base, name);
    const full = path.join(dir, name);
    const out = path.join(dest, rel);
    if (fs.statSync(full).isDirectory()) {
      fs.mkdirSync(out, { recursive: true });
      walk(full, rel);
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      let text = fs.readFileSync(full, "utf8");
      text = text.replace(/PRO_ROUTES/g, "SEASON4_ROUTES");
      text = text.replace(/<PageShell/g, '<PageShell siteMode="season4"');
      fs.writeFileSync(out, text, "utf8");
    }
  }
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
walk(src);
console.log("season4 copied");
