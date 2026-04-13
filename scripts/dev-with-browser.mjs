#!/usr/bin/env node

import { spawn } from "child_process";
import { execSync } from "child_process";

// Fixed base ports for each service
const SERVICES = {
  backend: 3000,
  swagger: 5175,
  admin: 5173,
  web: 5174,
};

function openInChrome(urls) {
  try {
    const urlsString = urls.join(" ");
    execSync(`start chrome ${urlsString}`, { stdio: "ignore" });
    console.log("✓ Opening Chrome with services...");
  } catch (error) {
    console.error(
      "Could not launch Chrome (ensure it is installed and in PATH).",
    );
  }
}

async function main() {
  console.log("🚀 Starting development environment...\n");

  // Start the dev process
  const devProcess = spawn(
    "pnpm -r --parallel --filter backend --filter admin --filter web --filter swagger run dev",
    [],
    {
      stdio: "inherit",
      shell: true,
    },
  );

  // Generate URLs for Chrome based on standard ports
  const urls = [
    `http://localhost:${SERVICES.web}`, // Web app
    `http://localhost:${SERVICES.admin}`, // Admin app
    `http://localhost:${SERVICES.backend}`, // Backend API
    `http://localhost:${SERVICES.swagger}`, // Swagger docs
  ];

  // Open Chrome after a brief delay to allow services to start
  setTimeout(() => {
    console.log("\n📍 Opening in Chrome:");
    urls.forEach((url, i) => {
      const service =
        Object.keys(SERVICES)[
          Object.values(SERVICES).indexOf(parseInt(url.split(":").pop()))
        ];
      console.log(`  • ${service}: ${url}`);
    });
    console.log("");
    openInChrome(urls);
  }, 2000);

  // Keep process running
  devProcess.on("exit", (code) => {
    process.exit(code);
  });

  devProcess.on("error", (error) => {
    console.error("Failed to start dev process:", error.message);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
