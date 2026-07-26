import { spawn } from "node:child_process";

const input = process.argv.slice(2);
const args = ["dev"];
for (let index = 0; index < input.length; index += 1) {
  const current = input[index];
  if (current === "--host") {
    args.push("-H", input[index + 1] || "0.0.0.0");
    index += 1;
  } else if (current !== "--strictPort") {
    args.push(current);
  }
}

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
