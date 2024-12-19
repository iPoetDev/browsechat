import * as vscode from "vscode";
import * as path from "path";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSegment, ChatSequence } from "../models/types";
import { DataModelEventType } from "../models/events";

/**
 * Description placeholder
 *
 * 
 * @class ChatTreeItem
 * @typedef {ChatTreeItem}
 * @extends {vscode.TreeItem}
 */
export class ChatTreeItem extends vscode.TreeItem {
  /**
   * Creates an instance of ChatTreeItem.
   *
   * 
   * @param {string} id
   * @param {string} label
   * @param {vscode.TreeItemCollapsibleState} collapsibleState
   * @param {("sequence" | "segment")} type
   * @param {?*} [metadata]
   */
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: "sequence" | "segment",
    public readonly metadata?: any
  ) {
    super(label, collapsibleState);

    this.tooltip = this.getTooltip();
    this.contextValue = type;
    this.iconPath = this.getIcon();
  }

  /**
   * Description placeholder
   *
   * @private
   * @returns {string}
   */
  private getTooltip(): string {
    if (this.type === "sequence") {
      const meta = this.metadata;
      return `${this.label}\nSegments: ${
        meta.segmentCount
      }\nParticipants: ${meta.participants.join(", ")}`;
    } else {
      const meta = this.metadata;
      return `${this.label}\nParticipants: ${meta.participants.join(
        ", "
      )}\nKeywords: ${meta.keywords?.join(", ") || "none"}`;
    }
  }

  /**
   * Description placeholder
   *
   * @private
   * @returns {vscode.ThemeIcon}
   */
  private getIcon(): vscode.ThemeIcon {
    if (this.type === "sequence") {
      return new vscode.ThemeIcon("notebook");
    } else {
      return new vscode.ThemeIcon("comment");
    }
  }
}

/**
 * Description placeholder
 *
 * 
 * @class ChatTreeProvider
 * @typedef {ChatTreeProvider}
 *  {vscode.TreeDataProvider<ChatTreeItem>}
 */
export class ChatTreeProvider implements vscode.TreeDataProvider<ChatTreeItem> {
  /**
   * Description placeholder
   *
   * @param {{ expandedNodes: string[]; selectedNode: string }} arg0
   */
  setState(arg0: { expandedNodes: string[]; selectedNode: string }) {
    throw new Error("Method not implemented.");
  }
  /**
   * Description placeholder
   *
   * @returns {boolean}
   */
  isReady(): boolean {
    throw new Error("Method not implemented.");
  }
  /**
   * Description placeholder
   *
   * @returns {*}
   */
  isInConsistentState(): any {
    throw new Error("Method not implemented.");
  }
  /**
   * Description placeholder
   *
   * @private
   * @type {vscode.EventEmitter<
   *     ChatTreeItem | undefined | null | void
   *   >}
   */
  private _onDidChangeTreeData: vscode.EventEmitter<
    ChatTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ChatTreeItem | undefined | null | void>();

  /**
   * Description placeholder
   *
   * @readonly
   * @type {vscode.Event<
   *     ChatTreeItem | undefined | null | void
   *   >}
   */
  readonly onDidChangeTreeData: vscode.Event<
    ChatTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  /**
   * Description placeholder
   *
   * @private
   * @type {(string | undefined)}
   */
  private activeSegmentId: string | undefined;
  /**
   * Description placeholder
   *
   * @private
   * @type {Map<string, ChatTreeItem>}
   */
  private virtualRoot: Map<string, ChatTreeItem> = new Map();
  /**
   * Description placeholder
   *
   * @private
   * @type {Map<string, vscode.TextEditorDecorationType>}
   */
  private decorations: Map<string, vscode.TextEditorDecorationType> = new Map();

  /**
   * Creates an instance of ChatTreeProvider.
   *
   * 
   * @param {DataModelManager} dataModel
   */
  constructor(private dataModel: DataModelManager) {
    // Listen for data model events
    this.dataModel.on(DataModelEventType.SequenceCreated, () => this.refresh());
    this.dataModel.on(DataModelEventType.SequenceUpdated, () => this.refresh());
    this.dataModel.on(DataModelEventType.SegmentCreated, () => this.refresh());
    this.dataModel.on(DataModelEventType.SegmentUpdated, () => this.refresh());

    // Initialize decorations
    this.initializeDecorations();
  }

  /**
   * Description placeholder
   *
   * @private
   */
  private initializeDecorations() {
    this.decorations.set(
      "active",
      vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor(
          "editor.findMatchHighlightBackground"
        ),
        isWholeLine: true,
      })
    );

    this.decorations.set(
      "unread",
      vscode.window.createTextEditorDecorationType({
        fontWeight: "bold",
      })
    );

    this.decorations.set(
      "modified",
      vscode.window.createTextEditorDecorationType({
        after: {
          contentText: " (modified)",
          color: new vscode.ThemeColor("editorWarning.foreground"),
        },
      })
    );
  }

  /**
   * Description placeholder
   *
   * @public
   * @param {ChatTreeItem} element
   * @returns {vscode.TreeItem}
   */
  public getTreeItem(element: ChatTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Description placeholder
   *
   * @public
   * 
   * @param {?ChatTreeItem} [element]
   * @returns {Promise<ChatTreeItem[]>}
   */
  public async getChildren(element?: ChatTreeItem): Promise<ChatTreeItem[]> {
    if (!element) {
      // Root level - show sequences
      const sequences = this.dataModel.getAllSequences();
      return sequences.map((sequence) => this.createSequenceTreeItem(sequence));
    } else if (element.type === "sequence") {
      // Sequence level - show segments
      const segments = this.dataModel.getSequenceSegments(element.id);
      return segments.map((segment) => this.createSegmentTreeItem(segment));
    }
    return [];
  }

  /**
   * Description placeholder
   *
   * @private
   * @param {ChatSequence} sequence
   * @returns {ChatTreeItem}
   */
  private createSequenceTreeItem(sequence: ChatSequence): ChatTreeItem {
    const label = `${path.basename(sequence.sourceFile)} (${
      sequence.segments.length
    } segments)`;
    return new ChatTreeItem(
      sequence.id,
      label,
      vscode.TreeItemCollapsibleState.Collapsed,
      "sequence",
      sequence.metadata
    );
  }

  /**
   * Description placeholder
   *
   * @private
   * @param {ChatSegment} segment
   * @returns {ChatTreeItem}
   */
  private createSegmentTreeItem(segment: ChatSegment): ChatTreeItem {
    const preview = segment.content.split("\n")[0].substring(0, 50) + "...";
    const item = new ChatTreeItem(
      segment.id,
      preview,
      vscode.TreeItemCollapsibleState.None,
      "segment",
      segment.metadata
    );

    if (segment.id === this.activeSegmentId) {
      item.iconPath = new vscode.ThemeIcon("arrow-right");
    }

    return item;
  }

  /**
   * Description placeholder
   *
   * @public
   * @param {string} segmentId
   */
  public setActiveSegment(segmentId: string) {
    this.activeSegmentId = segmentId;
    this.refresh();
  }

  /**
   * Description placeholder
   *
   * @public
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Description placeholder
   *
   * @public
   * @param {ChatTreeItem} element
   * @returns {vscode.ProviderResult<ChatTreeItem>}
   */
  public getParent(element: ChatTreeItem): vscode.ProviderResult<ChatTreeItem> {
    if (element.type === "segment") {
      const segment = this.dataModel.getSegment(element.id);
      if (segment) {
        const sequence = this.dataModel.getSequence(segment.sequenceId);
        if (sequence) {
          return this.createSequenceTreeItem(sequence);
        }
      }
    }
    return null;
  }

  /**
   * Description placeholder
   *
   * @public
   * 
   * @param {string} segmentId
   * @returns {Promise<void>}
   */
  public async revealSegment(segmentId: string): Promise<void> {
    const segment = this.dataModel.getSegment(segmentId);
    if (!segment) {
      return;
    }

    const sequence = this.dataModel.getSequence(segment.sequenceId);
    if (!sequence) {
      return;
    }

    // Set active segment
    this.setActiveSegment(segmentId);

    // Expand the sequence if needed
    const sequenceItem = this.createSequenceTreeItem(sequence);
    await vscode.commands.executeCommand(
      "browsechat.treeView.reveal",
      sequenceItem,
      {
        select: false,
        focus: false,
        expand: true,
      }
    );

    // Select and reveal the segment
    const segmentItem = this.createSegmentTreeItem(segment);
    await vscode.commands.executeCommand(
      "browsechat.treeView.reveal",
      segmentItem,
      {
        select: true,
        focus: true,
      }
    );
  }
}
