const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
}

const insideWorkTree = run("git", ["rev-parse", "--is-inside-work-tree"]);

if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== "true") {
  console.log("Skipping Lefthook install outside a git worktree.");
  process.exit(0);
}

const hooksPath = run("git", ["config", "--get", "core.hooksPath"]);

if (hooksPath.status === 0 && hooksPath.stdout.trim() !== "") {
  console.log(
    `Skipping Lefthook install because core.hooksPath is set to ${hooksPath.stdout.trim()}.`
  );
  process.exit(0);
}

const install = run("pnpm", ["run", "hooks:install"], { stdio: "inherit" });

if (install.status !== 0) {
  process.exit(install.status ?? 1);
}
