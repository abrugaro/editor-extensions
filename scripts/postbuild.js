#!/usr/bin/env node
/**
 * MTA postbuild verification script
 * Comprehensive validation that MTA branding was applied correctly
 * Based on proven logic from migtools/editor-extensions
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Expected MTA values
const expectedExtensionName = "mta-vscode-extension";
const expectedPublisher = "redhat";
const expectedAuthor = "Red Hat";
const expectedCategory = "MTA";

let errors = [];
let warnings = [];

function addError(message) {
  errors.push(message);
  console.error(`❌ ${message}`);
}

function addWarning(message) {
  warnings.push(message);
  console.warn(`⚠️  ${message}`);
}

function checkSuccess(message) {
  console.log(`✅ ${message}`);
}

// Verify workspace version consistency
function verifyVersionConsistency() {
  console.log("🔍 Checking version consistency...");

  const rootPackagePath = path.join(rootDir, "package.json");
  const vsCodePackagePath = path.join(rootDir, "vscode", "package.json");

  if (!fs.existsSync(rootPackagePath)) {
    addError("Root package.json not found");
    return;
  }

  if (!fs.existsSync(vsCodePackagePath)) {
    addError("VSCode workspace package.json not found");
    return;
  }

  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
  const vsCodePackage = JSON.parse(fs.readFileSync(vsCodePackagePath, "utf8"));

  if (rootPackage.version !== vsCodePackage.version) {
    addError(`Version mismatch: root is ${rootPackage.version}, vscode workspace is ${vsCodePackage.version}`);
  } else {
    checkSuccess(`Version consistency: ${vsCodePackage.version}`);
  }
}

// Verify core extension branding
function verifyExtensionBranding() {
  console.log("🔍 Checking extension branding...");

  const packagePath = path.join(rootDir, "vscode", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  // Check basic branding
  if (packageJson.name !== expectedExtensionName) {
    addError(`Extension name is "${packageJson.name}", expected "${expectedExtensionName}"`);
  } else {
    checkSuccess(`Extension name: ${packageJson.name}`);
  }

  if (packageJson.publisher !== expectedPublisher) {
    addError(`Publisher is "${packageJson.publisher}", expected "${expectedPublisher}"`);
  } else {
    checkSuccess(`Publisher: ${packageJson.publisher}`);
  }

  if (packageJson.author !== expectedAuthor) {
    addError(`Author is "${packageJson.author}", expected "${expectedAuthor}"`);
  } else {
    checkSuccess(`Author: ${packageJson.author}`);
  }

  // Check display name contains MTA
  if (!packageJson.displayName?.toLowerCase().includes('migration')) {
    addError(`Display name "${packageJson.displayName}" should contain "migration"`);
  } else {
    checkSuccess(`Display name: ${packageJson.displayName}`);
  }

  // Check repository URL
  if (!packageJson.repository?.url?.includes('migtools/editor-extensions')) {
    addError(`Repository URL should point to migtools/editor-extensions`);
  } else {
    checkSuccess(`Repository: ${packageJson.repository.url}`);
  }
}

// Verify commands have correct branding
function verifyCommands() {
  console.log("🔍 Checking command branding...");

  const packagePath = path.join(rootDir, "vscode", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  if (!packageJson.contributes?.commands) {
    addWarning("No commands found to verify");
    return;
  }

  let commandErrors = 0;
  packageJson.contributes.commands.forEach((cmd, index) => {
    if (!cmd.command?.startsWith(`${expectedExtensionName}.`)) {
      addError(`Command[${index}] "${cmd.command}" should start with "${expectedExtensionName}."`);
      commandErrors++;
    }

    if (cmd.category && cmd.category !== expectedCategory && cmd.category !== "View") {
      addError(`Command[${index}] category "${cmd.category}" should be "${expectedCategory}" (or "View")`);
      commandErrors++;
    }
  });

  if (commandErrors === 0) {
    checkSuccess(`${packageJson.contributes.commands.length} commands properly branded`);
  }
}

// Verify configuration properties
function verifyConfiguration() {
  console.log("🔍 Checking configuration branding...");

  const packagePath = path.join(rootDir, "vscode", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  if (!packageJson.contributes?.configuration) {
    addWarning("No configuration found to verify");
    return;
  }

  const configs = Array.isArray(packageJson.contributes.configuration)
    ? packageJson.contributes.configuration
    : [packageJson.contributes.configuration];

  let configErrors = 0;
  configs.forEach((config, configIndex) => {
    if (config.properties) {
      Object.keys(config.properties).forEach((prop) => {
        if (!prop.startsWith(`${expectedExtensionName}.`)) {
          addError(`Config property "${prop}" should start with "${expectedExtensionName}."`);
          configErrors++;
        }
      });
    }
  });

  if (configErrors === 0) {
    checkSuccess("Configuration properties properly branded");
  }
}

// Verify views and containers
function verifyViews() {
  console.log("🔍 Checking view branding...");

  const packagePath = path.join(rootDir, "vscode", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  // Check view containers
  if (packageJson.contributes?.viewsContainers?.activitybar) {
    const containers = packageJson.contributes.viewsContainers.activitybar;
    let containerErrors = 0;

    containers.forEach((container, index) => {
      if (container.id !== expectedExtensionName) {
        addError(`View container[${index}] id "${container.id}" should be "${expectedExtensionName}"`);
        containerErrors++;
      }
      if (container.title !== expectedCategory) {
        addError(`View container[${index}] title "${container.title}" should be "${expectedCategory}"`);
        containerErrors++;
      }
    });

    if (containerErrors === 0) {
      checkSuccess("View containers properly branded");
    }
  }

  // Check views
  if (packageJson.contributes?.views) {
    let viewErrors = 0;
    Object.keys(packageJson.contributes.views).forEach((containerKey) => {
      if (!containerKey.includes(expectedExtensionName)) {
        addError(`View container key "${containerKey}" should include "${expectedExtensionName}"`);
        viewErrors++;
      }

      const views = packageJson.contributes.views[containerKey];
      views.forEach((view, index) => {
        if (!view.id?.startsWith(`${expectedExtensionName}.`)) {
          addError(`View[${index}] id "${view.id}" should start with "${expectedExtensionName}."`);
          viewErrors++;
        }
      });
    });

    if (viewErrors === 0) {
      checkSuccess("Views properly branded");
    }
  }
}

// Verify assets exist
function verifyAssets() {
  console.log("🔍 Checking branded assets...");

  const iconPath = path.join(rootDir, "vscode", "resources", "icon.png");
  const avatarPath = path.join(rootDir, "webview-ui", "public", "avatarIcons", "avatar.svg");
  const readmePath = path.join(rootDir, "vscode", "README.md");

  if (fs.existsSync(iconPath)) {
    checkSuccess("VSCode sidebar icon found");
  } else {
    addWarning("VSCode sidebar icon not found");
  }

  if (fs.existsSync(avatarPath)) {
    checkSuccess("Webview avatar found");
  } else {
    addWarning("Webview avatar not found");
  }

  if (fs.existsSync(readmePath)) {
    checkSuccess("README found");
  } else {
    addWarning("README not found");
  }
}

// Main execution
function main() {
  console.log("🔍 Running postbuild verification for MTA extension...");
  console.log();

  try {
    verifyVersionConsistency();
    verifyExtensionBranding();
    verifyCommands();
    verifyConfiguration();
    verifyViews();
    verifyAssets();

    console.log();
    console.log("📊 Verification Summary:");
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log();
      console.error("❌❌❌ POSTBUILD VERIFICATION FAILED ❌❌❌");
      console.error("❌ Build cannot continue with branding errors");
      console.error("❌❌❌ Fix the above errors and rebuild ❌❌❌");
      process.exit(1);
    } else {
      console.log();
      console.log("✅ All verifications passed! Extension properly branded for MTA.");
      if (warnings.length > 0) {
        console.log("⚠️  Note: Some warnings were found but they won't block the build.");
      }
    }
  } catch (error) {
    console.error("❌❌❌ FATAL: Postbuild verification crashed ❌❌❌");
    console.error("❌ Error:", error.message);
    console.error("❌ Stack:", error.stack);
    process.exit(1);
  }
}

// Process-level error handling
process.on('uncaughtException', (error) => {
  console.error('❌❌❌ FATAL: Uncaught exception in postbuild:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ FATAL: Unhandled promise rejection in postbuild:', reason);
  process.exit(1);
});

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as verifyMTABranding };