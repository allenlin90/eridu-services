#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const isCheck = args.includes("--check");

// We want to run eslint on all .md files in the repository.
// By default, ESLint ignores files/folders in .gitignore and node_modules.
const eslintArgs = ["**/*.md"];

if (!isCheck) {
  eslintArgs.push("--fix");
}

console.log(isCheck ? "Checking markdown formatting using ESLint..." : "Formatting markdown files using ESLint...");

const eslint = spawn("pnpm", ["exec", "eslint", ...eslintArgs], {
  stdio: "inherit",
});

eslint.on("close", (code) => {
  if (code === 0) {
    console.log(isCheck ? "All markdown files are correctly formatted." : "Markdown files formatted successfully.");
    process.exit(0);
  } else {
    console.error(isCheck ? "Error: Markdown formatting check failed. Some files are not formatted or have lint errors." : "Error: Formatting failed.");
    process.exit(code || 1);
  }
});
