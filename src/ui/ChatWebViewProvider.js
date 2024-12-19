import * as vscode from "vscode";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSequence, ChatSegment } from "../models/types";
import { getNonce } from "../utils/security";

/**
 * Description placeholder
 *
 * 
 * @class ChatWebViewProvider
 * @typedef {ChatWebViewProvider}
 *  {vscode.WebviewViewProvider}
 * 
 * @property {vscode.WebviewView} _view
 * @property {ChatSequence} _sequence
 * @property {DataModelManager} _dataModel
 * @property {vscode.Uri} _extensionUri
 * @property {string} static viewType
 * 
 * # todo has* or get* methods not implemented 
 *  hasMessageHandlers(): Not implemented. Should return whether the provider handles messages from the webview.
 *  refresh(): Not implemented. Should refresh the webview.
 *  getScrollPosition(): Not implemented. Should return the current scroll position of the webview.
 *  getHighlights(): Not implemented. Should return the current highlights in the webview.
 *  getCurrentStyles(): Not implemented. Should return the current styles applied to the webview.
 *  setState(arg0: { scrollPosition: number; selectedChat: string; theme: string }): Not implemented. Should set the state of the webview.
 *  isReady(): Not implemented. Should return whether the provider is ready to handle requests.
 *  postMessage(arg0: { type: string; chatId: string }): Not implemented. Should post a message to the webview.
 *  getWebview(): Not implemented. Should return the webview instance.
 *  getSearchResults(): Not implemented. Should return the search results in the webview.
 *  getCurrentScrollPosition(): Not implemented. Should return the current scroll position of the webview.
 *  isInConsistentState(): Not implemented. Should return whether the provider is in an inconsistent state.
 * 
 * # done methods
 *  displayChat(segments: ChatSegment[]): Displays the chat segments in the webview.
 *  resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): Resolves the webview view and sets up the webview instance.
 *  loadSequence(sequenceId: string): Loads a sequence of chat segments into the webview.
 *  openFile(file: vscode.Uri): Opens a file in the webview and loads its sequence of chat segments.
 *  jumpToSegment(segmentId: string): Jumps to a specific segment in the webview.
 *  updateTheme(theme: string): Updates the theme of the webview.
 *  _getHtmlForWebview(webview: vscode.Webview): Returns the HTML content for the webview.
 *  _getThemeColors(theme: string): Returns the theme colors for the webview.
 * 
 */
export class ChatWebViewProvider implements vscode.WebviewViewProvider {
  // #todo: Implement the following methods
  hasMessageHandlers(): any {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  refresh() {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getScrollPosition() {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getHighlights() {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getCurrentStyles() {
    throw new Error("Method not implemented.");
  }
  /**
   * Description placeholder
   *
   * @param {{
   *     scrollPosition: number;
   *     selectedChat: string;
   *     theme: string;
   *   }} arg0
   */
  // #todo: Implement the following methods
  setState(arg0: {
    scrollPosition: number;
    selectedChat: string;
    theme: string;
  }) {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  isReady() {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  postMessage(arg0: { type: string; chatId: string }) {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getWebview(): any {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getSearchResults() {
    throw new Error("Method not implemented.");
  }// #todo: Implement the following methods
  getCurrentScrollPosition(): any {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  isInConsistentState(): any {
    throw new Error("Method not implemented.");
  }

  /**
   * Description placeholder
   *
   * 
   * @param {ChatSegment[]} segments
   * @returns {Promise<void>}
   */
  async displayChat(segments: ChatSegment[]): Promise<void> {
    if (!this._view) {
      return;
    }

    await this._view.webview.postMessage({
      type: "displayChat",
      segments: segments,
    });
  }

  /**
   * Description placeholder
   *
   * @public
   * 
   * @readonly
   * @type {"browsechat.chatView"}
   */
  public static readonly viewType = "browsechat.chatView";
  /**
   * Description placeholder
   *
   * @private
   * @type {?vscode.WebviewView}
   */
  private _view?: vscode.WebviewView;
  /**
   * Description placeholder
   *
   * @private
   * @type {?ChatSequence}
   */
  private _sequence?: ChatSequence;

  /**
   * Creates an instance of ChatWebViewProvider.
   *
   * 
   * @param {vscode.Uri} _extensionUri
   * @param {DataModelManager} _dataModel
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _dataModel: DataModelManager
  ) {}

  /**
   * Resolves the webview view and sets up the webview instance.
   *
   * @public
   * @param {vscode.WebviewView} webviewView
   * @param {vscode.WebviewViewResolveContext} context
   * @param {vscode.CancellationToken} _token
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the WebView
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "loadSequence":
          await this.loadSequence(data.sequenceId);
          break;
        case "jumpToSegment":
          this.jumpToSegment(data.segmentId);
          break;
        case "themeChanged":
          this.updateTheme(data.theme);
          break;
      }
    });
  }

  /**
   * Loads a sequence of chat segments into the webview.
   *
   * @public
   * 
   * @param {string} sequenceId
   * @returns {Promise<void> || any}
   * #todo: Implement return type
   */
  public async loadSequence(sequenceId: string) {
    const sequence = this._dataModel.getSequence(sequenceId);
    if (!sequence || !this._view) {
      return;
    }

    this._sequence = sequence;
    const segments = this._dataModel.getSequenceSegments(sequenceId);

    // Post sequence data to WebView
    await this._view.webview.postMessage({
      type: "sequenceLoaded",
      sequence: {
        id: sequence.id,
        sourceFile: sequence.sourceFile,
        metadata: sequence.metadata,
        segments: segments.map((s) => ({
          id: s.id,
          content: s.content,
          metadata: s.metadata,
        })),
      },
    });
  }

  /**
   * Opens a file in the webview and loads its sequence of chat segments.
   *
   * @public
   * 
   * @param {vscode.Uri} file
   * @returns {Promise<void> || any}
   * #todo: Implement return type
   */
  public async openFile(file: vscode.Uri) {
    if (!this._view) {
      // Create the webview if it doesn't exist
      const column =
        vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
      this._view = (await vscode.commands.executeCommand(
        "vscode.createWebviewView",
        ChatWebViewProvider.viewType,
        { viewColumn: column, preserveFocus: false }
      )) as vscode.WebviewView;
    }

    // Load the file's sequence
    const sequence = this._dataModel.getSequence(file.fsPath);
    if (sequence) {
      await this.loadSequence(sequence.id);
    }
  }

  /**
   * Jump to a specific segment in the webview.
   *
   * @private
   * @param {string} segmentId
   */
  private jumpToSegment(segmentId: string) {
    if (!this._sequence) {
      return;
    }

    const segment = this._dataModel.getSegment(segmentId);
    if (!segment) {
      return;
    }

    // Create a selection at the segment's position
    const position = new vscode.Position(0, segment.startIndex);
    vscode.window.activeTextEditor?.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  }

  /**
   * Updates the theme of the webview.
   *
   * @private
   * @param {string} theme
   */
  private updateTheme(theme: string) {
    if (!this._view) {
      return;
    }

    const colors = this._getThemeColors(theme);
    this._view.webview.postMessage({
      type: "themeUpdated",
      colors,
    });
  }

  /**
   * Opens a file in the webview and loads its sequence of chat segments.
   *
   * @private
   * @param {vscode.Webview} webview
   * @returns {string}
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "styles.css")
    );
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css"
      )
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <link href="${codiconsUri}" rel="stylesheet">
                <title>Chat Browser</title>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 id="title">Chat Browser</h1>
                        <div class="toolbar">
                            <button class="icon-button" id="refreshButton">
                                <i class="codicon codicon-refresh"></i>
                            </button>
                            <button class="icon-button" id="searchButton">
                                <i class="codicon codicon-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="content">
                        <div id="chatContainer" class="chat-container">
                            <!-- Chat segments will be rendered here -->
                        </div>
                    </div>
                    <div class="footer">
                        <div id="status" class="status"></div>
                    </div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }

  /**
   * Updates the theme of the webview.
   *
   * @private
   * @param {string} theme
   * @returns {{ background: any; foreground: any; border: any; activeBackground: any; activeForeground: any; }}
   */
  private _getThemeColors(theme: string) {
    return {
      background: new vscode.ThemeColor("editor.background"),
      foreground: new vscode.ThemeColor("editor.foreground"),
      border: new vscode.ThemeColor("panel.border"),
      activeBackground: new vscode.ThemeColor("list.activeSelectionBackground"),
      activeForeground: new vscode.ThemeColor("list.activeSelectionForeground"),
    };
  }
}
