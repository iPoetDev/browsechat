import * as vscode from "vscode";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSegment } from "../models/types";

/**
 * Description placeholder
 *
 * @interface NavigationHistoryItem
 * @typedef {NavigationHistoryItem}
 * 
 * @property {string} segmentId
 * @property {number} timestamp
 */
interface NavigationHistoryItem {
  segmentId: string;
  timestamp: number;
}

/**
 * Description placeholder
 *
 * @interface SegmentQuickPickItem
 * @typedef {SegmentQuickPickItem}
 * @extends {vscode.QuickPickItem}
 * 
 * @property {ChatSegment} segment
 */
interface SegmentQuickPickItem extends vscode.QuickPickItem {
  segment: ChatSegment;
}

/**
 * Description placeholder
 *
 * 
 * @class ChatNavigationManager
 * @typedef {ChatNavigationManager}
 * 
 * @property {NavigationHistoryItem[]} history
 * @property {number} currentHistoryIndex
 * @property {number} maxHistorySize
 */
export class ChatNavigationManager {

  private history: NavigationHistoryItem[] = [];
  private currentHistoryIndex: number = -1;
  private readonly maxHistorySize = 100;

  /**
   * Creates an instance of ChatNavigationManager.
   *
   * 
   * @param {DataModelManager} dataModel
   * @param {vscode.ExtensionContext} context
   */
  constructor(
    private readonly dataModel: DataModelManager,
    private readonly context: vscode.ExtensionContext
  ) {
    this.registerCommands();
  }

  /**
   * Registers commands for chat navigation
   *
   * @private
   */
  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand("browsechat.navigation.nextSegment", () =>
        this.navigateToNextSegment()
      ),
      vscode.commands.registerCommand(
        "browsechat.navigation.previousSegment",
        () => this.navigateToPreviousSegment()
      ),
      vscode.commands.registerCommand(
        "browsechat.navigation.jumpToSegment",
        () => this.showJumpToSegmentPicker()
      ),
      vscode.commands.registerCommand("browsechat.navigation.showHistory", () =>
        this.showNavigationHistory()
      ),
      vscode.commands.registerCommand(
        "browsechat.navigation.navigateBack",
        () => this.navigateBack()
      )
    );
  }

  // #Todo  Implement
  navigateTo(arg0: string) {
    throw new Error("Method not implemented.");
  }
  // #Todo  Implement
  getCurrentLocation(): any {
    throw new Error("Method not implemented.");
  }

  /**
   * Navigate to the specified segment
   *
   * @public
   * 
   * @param {string} segmentId
   * @param {boolean} [addToHistory=true]
   * @returns {Promise<void>}
   */
  public async navigateToSegment(
    segmentId: string,
    addToHistory: boolean = true
  ): Promise<void> {
    const segment = this.dataModel.getSegment(segmentId);
    if (!segment) {
      return;
    }

    // Add to history if requested
    if (addToHistory) {
      this.addToHistory(segmentId);
    }

    // Notify tree view
    await vscode.commands.executeCommand(
      "browsechat.treeView.revealSegment",
      segmentId
    );

    // Update breadcrumb
    this.updateBreadcrumb(segment);

    // Notify webview
    await vscode.commands.executeCommand(
      "browsechat.webview.showSegment",
      segmentId
    );
  }

  /**
   * Navigate to the next segment in the chat
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async navigateToNextSegment(): Promise<void> {
    const currentSegmentId = this.getCurrentSegmentId();
    if (!currentSegmentId) {
      return;
    }

    const nextSegment = this.dataModel.getNextSegment(currentSegmentId);
    if (nextSegment) {
      await this.navigateToSegment(nextSegment.id);
    }
  }

  /**
   * Navigate to the previous segment in the chat
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async navigateToPreviousSegment(): Promise<void> {
    const currentSegmentId = this.getCurrentSegmentId();
    if (!currentSegmentId) {
      return;
    }

    const prevSegment = this.dataModel.getPreviousSegment(currentSegmentId);
    if (prevSegment) {
      await this.navigateToSegment(prevSegment.id);
    }
  }

  /**
   * Show a quick pick to jump to a specific chat segment
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async showJumpToSegmentPicker(): Promise<void> {
    const segments = this.dataModel.getAllSegments();
    const items: SegmentQuickPickItem[] = segments.map((segment) => ({
      label: this.getSegmentLabel(segment),
      description: this.getSegmentDescription(segment),
      detail: segment.content.split("\n")[0],
      segment,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select chat segment to jump to",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await this.navigateToSegment(selected.segment.id);
    }
  }

  /**
   * Show a preview of the specified chat segment
   *
   * @public
   * 
   * @param {ChatSegment} segment
   * @returns {Promise<void>}
   */
  public async showPreview(segment: ChatSegment): Promise<void> {
    if (!segment) {
      return;
    }

    // Show preview in webview without affecting navigation history
    await vscode.commands.executeCommand(
      "browsechat.webview.showSegment",
      segment.id,
      { preview: true }
    );

    // Update breadcrumb with preview indicator
    const sequence = this.dataModel.getSequence(segment.sequenceId);
    if (sequence) {
      vscode.commands.executeCommand("browsechat.breadcrumb.update", {
        file: sequence.sourceFile,
        sequence: sequence.id,
        segment: segment.id,
        isPreview: true,
      });
    }
  }

  /**
   * Get the label for a chat segment
   *
   * @private
   * @param {ChatSegment} segment
   * @returns {string}
   */
  private getSegmentLabel(segment: ChatSegment): string {
    const sequence = this.dataModel.getSequence(segment.sequenceId);
    return `${sequence?.sourceFile} - Segment ${segment.id}`;
  }

  /**
   * Get the description for a chat segment
   *
   * @private
   * @param {ChatSegment} segment
   * @returns {string}
   */
  private getSegmentDescription(segment: ChatSegment): string {
    return `Participants: ${segment.metadata.participants.join(", ")}`;
  }

  /**
   * Add a segment to the navigation history
   *
   * @private
   * @param {string} segmentId
   */
  private addToHistory(segmentId: string) {
    // Remove any forward history if we're not at the end
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    // Add new item
    this.history.push({
      segmentId,
      timestamp: Date.now(),
    });

    // Maintain max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    this.currentHistoryIndex = this.history.length - 1;
  }

  /**
   * Navigate back in the navigation history
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async navigateBack(): Promise<void> {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const item = this.history[this.currentHistoryIndex];
      await this.navigateToSegment(item.segmentId, false);
    }
  }

  /**
   * Show the navigation history and allow the user to jump to a specific segment
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async showNavigationHistory(): Promise<void> {
    const items = this.history.map((item, index) => {
      const segment = this.dataModel.getSegment(item.segmentId);
      return {
        label: this.getSegmentLabel(segment!),
        description: new Date(item.timestamp).toLocaleTimeString(),
        detail: segment?.content.split("\n")[0],
        index,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select from navigation history",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      this.currentHistoryIndex = selected.index;
      await this.navigateToSegment(
        this.history[selected.index].segmentId,
        false
      );
    }
  }

  /**
   * Get the ID of the current segment in the navigation history
   *
   * @private
   * @returns {(string | undefined)}
   */
  private getCurrentSegmentId(): string | undefined {
    return this.history[this.currentHistoryIndex]?.segmentId;
  }

  /**
   * Update the breadcrumb with the specified segment
   *
   * @private
   * @param {ChatSegment} segment
   */
  private updateBreadcrumb(segment: ChatSegment) {
    const sequence = this.dataModel.getSequence(segment.sequenceId);
    if (!sequence) {
      return;
    }

    vscode.commands.executeCommand("browsechat.breadcrumb.update", {
      file: sequence.sourceFile,
      sequence: sequence.id,
      segment: segment.id,
    });
  }
}
