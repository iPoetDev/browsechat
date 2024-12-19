import { defineConfig } from "@vscode/test-cli";

// Helper function to determine test environment
const getTestConfig = () => {
  const useWindsurf = process.env.VSCODE_TEST_USE_WINDSURF === "1";
  const useVSCodium = process.env.VSCODE_TEST_USE_VSCODIUM === "1";
  const useInsiders = process.env.VSCODE_TEST_USE_INSIDERS === "1";

  // Only allow Windows platform
  if (process.platform !== "win32") {
    throw new Error("This extension currently only supports Windows platform");
  }

  if (useWindsurf) {
    return {
      type: "custom",
      downloadUrl:
        "https://github.com/codeium/windsurf/releases/download/v{version}/Windsurf-win32-x64-{version}.zip",
      version: "1.1.0",
      executable: {
        ["win32-x64"]: "./Windsurf.exe",
        // Keep other platforms in config but commented out for future reference
        // ["darwin-x64"]: "./Windsurf.app/Contents/MacOS/windsurf",
        // ["darwin-arm64"]: "./Windsurf.app/Contents/MacOS/windsurf",
        // ["linux-x64"]: "./windsurf",
      },
    };
  }

  if (useVSCodium) {
    return {
      type: "custom",
      downloadUrl:
        "https://github.com/VSCodium/vscodium/releases/download/{version}/VSCodium-win32-x64-{version}.zip",
      version: "1.94.0",
      executable: {
        ["win32-x64"]: "./VSCodium.exe",
        // Keep other platforms in config but commented out for future reference
        // ["darwin-x64"]: "./VSCodium.app/Contents/MacOS/vscodium",
        // ["darwin-arm64"]: "./VSCodium.app/Contents/MacOS/vscodium",
        // ["linux-x64"]: "./codium",
      },
    };
  }

  if (useInsiders) {
    return {
      version: "insiders",
      channel: "insiders",
      quality: "insiders",
    };
  }

  // Default to VSCode 1.94.0 stable
  return {
    version: "1.94.0",
    channel: "stable",
    quality: "stable",
  };
};

// Helper to get platform-specific paths
const getPlatformPaths = () => {
  // Only return Windows paths since it's the only supported platform
  return {
    vscodeUserDir: process.env.APPDATA + "/Code",
    vscodeInsidersUserDir: process.env.APPDATA + "/Code - Insiders",
    windsurfUserDir: process.env.APPDATA + "/Windsurf",
    vscodiumUserDir: process.env.APPDATA + "/VSCodium",
    // Keep other platforms commented out for future reference
    // darwin: {
    //   vscodeUserDir: "~/Library/Application Support/Code",
    //   vscodeInsidersUserDir: "~/Library/Application Support/Code - Insiders",
    //   windsurfUserDir: "~/Library/Application Support/Windsurf",
    //   vscodiumUserDir: "~/Library/Application Support/VSCodium",
    // },
    // linux: {
    //   vscodeUserDir: "~/.config/Code",
    //   vscodeInsidersUserDir: "~/.config/Code - Insiders",
    //   windsurfUserDir: "~/.config/Windsurf",
    //   vscodiumUserDir: "~/.config/VSCodium",
    // }
  };
};

export default defineConfig({
  files: "out/test/**/*.test.js",
  workspaceFolder: "test-workspace",
  mocha: {
    ui: "tdd",
    timeout: 20000,
  },
  vscode: {
    ...getTestConfig(),
    // Ensure electron version matches Windsurf's
    electronVersion: "30.5.1",
    // Use platform-specific paths
    userDataDir: (() => {
      // Verify Windows platform
      if (process.platform !== "win32") {
        throw new Error("This extension currently only supports Windows platform");
      }
      const paths = getPlatformPaths();
      if (process.env.VSCODE_TEST_USE_WINDSURF === "1") {
        return paths.windsurfUserDir;
      }
      if (process.env.VSCODE_TEST_USE_VSCODIUM === "1") {
        return paths.vscodiumUserDir;
      }
      if (process.env.VSCODE_TEST_USE_INSIDERS === "1") {
        return paths.vscodeInsidersUserDir;
      }
      return paths.vscodeUserDir;
    })(),
  },
});
