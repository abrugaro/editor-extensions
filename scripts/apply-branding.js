#!/usr/bin/env node
/**
 * Apply MTA branding to upstream konveyor extension (release-0.2 single extension).
 *
 * Based on proven logic from migtools/editor-extensions prebuild.js
 */

import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "..");

// MTA Branding Constants (from proven prebuild.js)
const extensionName = "mta-vscode-extension";
const extensionShortName = "MTA";
const extensionVersion = "8.0.0";

// Brand pattern matching
const knownBrands = ["konveyor", "mta", "mta-vscode-extension"];
const brandPattern = knownBrands.join("|");
const brandRegex = new RegExp(brandPattern, "gi");
const brandPrefixRegex = new RegExp(`\\b(${brandPattern})\\.`, "gi");
const brandWordRegex = new RegExp(`\\b(${brandPattern})(?=\\s|$)`, "gi");

// Categories to preserve (don't replace with MTA)
const preservedCategories = ["View"];

console.log("🔄 Applying MTA branding (Release-0.2)...");
console.log(`   Extension: ${extensionName}`);
console.log(`   Version: ${extensionVersion}`);
console.log();

// Load configuration if available
let config = {};
const configPath = path.join(rootDir, "mta-build.yaml");
if (fs.existsSync(configPath)) {
  config = parseYaml(fs.readFileSync(configPath, "utf8"));
}

function applyExtensionBranding() {
  const packageJsonPath = path.join(rootDir, "vscode", "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Extension package.json not found at: ${packageJsonPath}`);
  }

  console.log("   Transforming vscode/package.json...");

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse package.json: ${error.message}`);
  }

  // Verify we have the expected structure
  if (!packageJson.name) {
    throw new Error("package.json missing required 'name' field");
  }

  // Apply basic branding (from proven prebuild.js)
  Object.assign(packageJson, {
    name: extensionName,
    displayName: "Migration toolkit for applications",
    description: "Migration toolkit for applications (MTA) - An enterprise migration tool to help you assess your applications and accelerate modernization timelines",
    homepage: "https://developers.redhat.com/products/mta/overview",
    repository: {
      type: "git",
      url: "https://github.com/migtools/editor-extensions"
    },
    bugs: "https://github.com/migtools/editor-extensions/issues",
    publisher: "redhat",
    author: "Red Hat",
    version: extensionVersion
  });

  // Transform configuration properties
  if (packageJson.contributes?.configuration) {
    const configs = Array.isArray(packageJson.contributes.configuration)
      ? packageJson.contributes.configuration
      : [packageJson.contributes.configuration];

    configs.forEach((config, index) => {
      if (config.properties) {
        const props = config.properties;
        const newProps = {};

        Object.keys(props).forEach((key) => {
          const newKey = key.replace(/^[^.]+\./, `${extensionName}.`);
          newProps[newKey] = props[key];
        });

        config.properties = newProps;
      }
    });
  }

  // Transform commands
  if (packageJson.contributes?.commands) {
    packageJson.contributes.commands = packageJson.contributes.commands.map((cmd) => ({
      ...cmd,
      command: cmd.command.replace(/^[^.]+\./, `${extensionName}.`),
      category: preservedCategories.includes(cmd.category) ? cmd.category : extensionShortName,
      title: cmd.title?.replace(brandRegex, extensionShortName) || cmd.title
    }));
  }

  // Transform views containers
  if (packageJson.contributes?.viewsContainers?.activitybar) {
    packageJson.contributes.viewsContainers.activitybar =
      packageJson.contributes.viewsContainers.activitybar.map((container) => ({
        ...container,
        id: extensionName,
        title: extensionShortName,
        icon: container.icon
      }));
  }

  // Transform views
  if (packageJson.contributes?.views) {
    Object.keys(packageJson.contributes.views).forEach((containerKey) => {
      const views = packageJson.contributes.views[containerKey];
      const newContainerKey = containerKey.replace(/^[^.]+/, extensionName);

      if (containerKey !== newContainerKey) {
        delete packageJson.contributes.views[containerKey];
        packageJson.contributes.views[newContainerKey] = views.map((view) => ({
          ...view,
          id: view.id.replace(/^[^.]+\./, `${extensionName}.`),
          name: view.name?.replace(brandWordRegex, extensionShortName),
          when: view.when
            ?.replace(brandPrefixRegex, `${extensionName}.`)
            .replace(brandWordRegex, extensionName)
        }));
      }
    });
  }

  // Transform menus
  const transformMenuCommands = (menuItems) => {
    return menuItems.map((item) => ({
      ...item,
      command: item.command?.replace(/^[^.]+\./, `${extensionName}.`),
      when: item.when
        ?.replace(brandPrefixRegex, `${extensionName}.`)
        .replace(brandWordRegex, extensionName),
      submenu: item.submenu?.replace(/^[^.]+\./, `${extensionName}.`)
    }));
  };

  if (packageJson.contributes?.menus) {
    Object.keys(packageJson.contributes.menus).forEach((menuKey) => {
      packageJson.contributes.menus[menuKey] = transformMenuCommands(
        packageJson.contributes.menus[menuKey]
      );
    });
  }

  // Transform submenus
  if (packageJson.contributes?.submenus) {
    packageJson.contributes.submenus = packageJson.contributes.submenus.map((submenu) => ({
      ...submenu,
      id: submenu.id.replace(/^[^.]+\./, `${extensionName}.`),
      label: submenu.label?.replace(brandWordRegex, extensionShortName)
    }));
  }

  // Remove kai binary assets (from proven prebuild.js)
  if (packageJson.includedAssetPaths?.kai) {
    delete packageJson.includedAssetPaths.kai;
    console.log("   ✅ Removed kai binary from includedAssetPaths");
  }

  // Save the transformed package.json
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("   ✅ vscode/package.json transformed");
  } catch (error) {
    throw new Error(`Failed to write transformed package.json: ${error.message}`);
  }
}

// Copy MTA-specific branded assets
function copyBrandedAssets() {
  console.log("   Copying branded assets...");

  // VSCode sidebar icon
  const iconSource = path.join(rootDir, "assets", "branding", "sidebar-icons", "icon.png");
  const iconTarget = path.join(rootDir, "vscode", "resources", "icon.png");

  if (fs.existsSync(iconSource)) {
    const targetDir = path.dirname(iconTarget);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(iconSource, iconTarget);
    console.log("     ✅ VSCode sidebar icon copied");
  } else {
    console.log("     ⚠️  No sidebar icon found at: assets/branding/sidebar-icons/icon.png");
  }

  // Webview avatar
  const avatarSource = path.join(rootDir, "assets", "branding", "avatars", "avatar.svg");
  const avatarTarget = path.join(rootDir, "webview-ui", "public", "avatarIcons", "avatar.svg");

  if (fs.existsSync(avatarSource)) {
    const targetDir = path.dirname(avatarTarget);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(avatarSource, avatarTarget);
    console.log("     ✅ Webview avatar copied");
  } else {
    console.log("     ⚠️  No avatar found at: assets/branding/avatars/avatar.svg");
  }

  // README
  const readmeSource = path.join(rootDir, "assets", "branding", "README.md");
  const readmeTarget = path.join(rootDir, "vscode", "README.md");

  if (fs.existsSync(readmeSource)) {
    fs.copyFileSync(readmeSource, readmeTarget);
    console.log("     ✅ README copied");
  } else if (fs.existsSync(path.join(rootDir, "assets", "README.md"))) {
    // Fallback to assets/README.md
    fs.copyFileSync(path.join(rootDir, "assets", "README.md"), readmeTarget);
    console.log("     ✅ README copied (from assets/)");
  } else {
    console.log("     ⚠️  No README found");
  }
}

// Apply branding to root package.json
function applyRootBranding() {
  const rootPackageJsonPath = path.join(rootDir, "package.json");

  if (!fs.existsSync(rootPackageJsonPath)) {
    throw new Error(`Root package.json not found at: ${rootPackageJsonPath}`);
  }

  console.log("   Transforming root package.json...");

  let rootPackageJson;
  try {
    rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse root package.json: ${error.message}`);
  }

  // Update root package to match extension branding
  const originalName = rootPackageJson.name;
  const originalVersion = rootPackageJson.version;

  Object.assign(rootPackageJson, {
    name: `${extensionName}-builder`,
    version: extensionVersion,
    description: "Build tools for Migration Toolkit for Applications VSCode extension",
    homepage: "https://developers.redhat.com/products/mta/overview",
    repository: {
      type: "git",
      url: "https://github.com/migtools/editor-extensions"
    },
    bugs: "https://github.com/migtools/editor-extensions/issues",
    author: "Red Hat"
  });

  // Save the transformed root package.json
  try {
    fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
    console.log(`   ✅ Root package.json transformed (${originalName}@${originalVersion} → ${rootPackageJson.name}@${rootPackageJson.version})`);
  } catch (error) {
    throw new Error(`Failed to write transformed root package.json: ${error.message}`);
  }
}

// Main execution
function main() {
  console.log("🎯 Starting MTA branding process...");
  console.log();

  try {
    applyRootBranding();
    applyExtensionBranding();
    copyBrandedAssets();

    console.log();
    console.log("✅ MTA branding applied successfully!");

    // Verify critical files exist after branding
    const vsCodePackageJsonPath = path.join(__dirname, "..", "vscode", "package.json");
    const rootPackageJsonPath = path.join(__dirname, "..", "package.json");

    const vsCodePackageJson = JSON.parse(fs.readFileSync(vsCodePackageJsonPath, "utf8"));
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));

    // Verify workspace branding
    if (vsCodePackageJson.name !== extensionName) {
      throw new Error(`Workspace branding verification failed: vscode package name is "${vsCodePackageJson.name}" but should be "${extensionName}"`);
    }

    // Verify root branding
    if (rootPackageJson.name !== `${extensionName}-builder`) {
      throw new Error(`Root branding verification failed: root package name is "${rootPackageJson.name}" but should be "${extensionName}-builder"`);
    }

    // Verify version consistency
    if (vsCodePackageJson.version !== rootPackageJson.version) {
      throw new Error(`Version mismatch: vscode workspace is ${vsCodePackageJson.version} but root is ${rootPackageJson.version}`);
    }

    console.log(`✅ Branding verification passed:`);
    console.log(`   Root: ${rootPackageJson.name}@${rootPackageJson.version}`);
    console.log(`   Extension: ${vsCodePackageJson.name}@${vsCodePackageJson.version}`);
    console.log();
  } catch (error) {
    console.error("❌❌❌ FATAL: MTA branding process failed ❌❌❌");
    console.error("❌ Error:", error.message);
    console.error("❌ Stack:", error.stack);
    console.error("❌❌❌ Build cannot continue without proper branding ❌❌❌");
    process.exit(1);
  }
}

// Ensure errors are handled at the process level
process.on('uncaughtException', (error) => {
  console.error('❌❌❌ FATAL: Uncaught exception in apply-branding:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ FATAL: Unhandled promise rejection in apply-branding:', reason);
  process.exit(1);
});

// Only run if called directly (ES module equivalent)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  applyExtensionBranding,
  copyBrandedAssets,
  extensionName,
  extensionShortName,
  extensionVersion
};