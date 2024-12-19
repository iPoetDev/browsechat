import * as vscode from "vscode";
import * as path from "path";

// tests/mocks/webview.ts
export class MockWebviewPanel {
  public readonly webview = {
    html: "",
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(),
  };

  public dispose = jest.fn();
}
