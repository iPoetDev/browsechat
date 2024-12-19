import * as vscode from 'vscode';
import { DataModelManager } from '../models/DataModelManager';
import { ChatNavigationManager } from '../ui/ChatNavigationManager';
import { ChatSegment, ChatSequence } from '../models/types';



/**
 * Interface for items in the (VSCode) QuickPick that allows the user to jump to chat segments.
 *
 * @interface QuickPickSegmentItem
 * @typedef {QuickPickSegmentItem}
 * @extends {vscode.QuickPickItem}
 */
interface QuickPickSegmentItem extends vscode.QuickPickItem {
    segment: ChatSegment;
    sequence: ChatSequence;
}

/**
 * Command to open the quick pick interface for jumping to chat segments.
 * This command is bound to the "browsechat.jumpToChat" command ID.
 * The command is registered in the extension context and can be triggered from the command palette.
 * It also registers a keyboard shortcut for the same command.
 * The command uses a QuickPick interface to allow the user to search for and select a chat segment.
 * When the user selects a segment, the command navigates to the segment in the chat browser.
 *  registerCommand(): Registers the "browsechat.jumpToChat" command and its associated keyboard shortcut.
 *  createQuickPick(): Creates a QuickPick that allows the user to search for and select a chat segment.
 *  execute(): Executes the Jump to Chat command, showing the quick pick interface to allow the user to search for and select a chat segment.
 *  loadSegments(): Loads all chat segments into the QuickPick, updating the items that represent each segment.
 *  createQuickPickItem(segment, sequence): Creates a QuickPickSegmentItem for the given chat segment and sequence.
 *  getSegmentPreview(segment): Returns a preview of the content of a chat segment, truncating it if necessary.
 *  getSegmentDetail(segment): Returns a string that lists the participants and keywords of the given chat segment.
 *  handleQuickPickValueChange(value): Handles changes to the QuickPick's value by filtering the items that are visible.
 *  handleQuickPickAccept(): Handles the QuickPick's accept event by navigating to the selected segment.
 *  handleQuickPickButton(item, button): Handles the QuickPick's button click event, showing a preview of the segment content if the "Preview segment" button is clicked.
 *  dispose(): Disposes of the QuickPick when it is no longer needed.
 * */
export class JumpToChatCommand {
    private quickPick: vscode.QuickPick<QuickPickSegmentItem>;

    constructor(
        private readonly dataModel: DataModelManager,
        private readonly navigationManager: ChatNavigationManager,
        private readonly context: vscode.ExtensionContext
    ) {
        this.quickPick = this.createQuickPick();
        this.registerCommand();
    }


    /**
     * Registers the "browsechat.jumpToChat" command and its associated keyboard shortcut.
     * The command opens the quick pick interface for jumping to chat segments.
     */
    private registerCommand() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('browsechat.jumpToChat', () => {
                this.execute();
            }),
            // Register keyboard shortcut
            vscode.commands.registerCommand('browsechat.jumpToChatShortcut', () => {
                this.execute();
            })
        );
    }

    /**
     * Creates a QuickPick that allows the user to search for and select a chat segment.
     * The QuickPick is configured to match on both the description and detail fields of each item.
     * When the user types, the QuickPick is updated to show only items that match the current value.
     * When the user selects a segment, the QuickPick is hidden and the `handleQuickPickAccept` method is called.
     * When the QuickPick is hidden, it is disposed of automatically.
     * @returns {vscode.QuickPick<QuickPickSegmentItem>} The created QuickPick.
     */
    private createQuickPick(): vscode.QuickPick<QuickPickSegmentItem> {
        const quickPick = vscode.window.createQuickPick<QuickPickSegmentItem>();
        quickPick.placeholder = 'Type to search chat segments...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;

        quickPick.onDidChangeValue(this.handleQuickPickValueChange.bind(this));
        quickPick.onDidAccept(this.handleQuickPickAccept.bind(this));
        quickPick.onDidHide(() => quickPick.dispose());

        return quickPick;
    }

    /** 
     * Executes the Jump to Chat command.
     * Shows the quick pick interface to allow the user to search for and select a chat segment.
     * If the user selects a segment, the `handleQuickPickAccept` method is called.
     * @returns {Promise<void>} A promise that resolves when the command is finished executing.*/
    public async execute(): Promise<void> {
        try {
            await this.loadSegments();
            this.quickPick.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open jump dialog: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

     /** 
      * Loads all chat segments into the QuickPick.
     * The QuickPick is updated with items that represent each segment, and the user can search for and select a segment.
     * @returns {Promise<void>} A promise that resolves when the loading is finished.*/
    private async loadSegments(): Promise<void> {
        const sequences = this.dataModel.getAllSequences();
        const items: QuickPickSegmentItem[] = [];

        for (const sequence of sequences) {
            const segments = this.dataModel.getSequenceSegments(sequence.id);
            for (const segment of segments) {
                items.push(this.createQuickPickItem(segment, sequence));
            }
        }

        this.quickPick.items = items;
    }

     /** Creates a QuickPickSegmentItem for the given chat segment and sequence.
     * The label is a preview of the segment's content, the description is the sequence file and segment timestamp,
     * and the detail is a string that lists the segment's participants and keywords.
     * The item also has a button to preview the segment.
     * @param segment The chat segment.
     * @param sequence The sequence that the segment belongs to.
     * @returns The QuickPickSegmentItem.*/
    private createQuickPickItem(segment: ChatSegment, sequence: ChatSequence): QuickPickSegmentItem {
        const preview = this.getSegmentPreview(segment);
        const timestamp = segment.metadata.timestamp ? 
            new Date(segment.metadata.timestamp).toLocaleString() : '';
        
        return {
            label: preview,
            description: `${sequence.sourceFile} - ${timestamp}`,
            detail: this.getSegmentDetail(segment),
            segment,
            sequence,
            buttons: [
                {
                    iconPath: new vscode.ThemeIcon('eye'),
                    tooltip: 'Preview segment'
                }
            ]
        };
    }

     /** 
      * Get a preview of the content of a chat segment. If the segment's content is
     * longer than 100 characters, return a truncated version with ellipsis at the
     * end; otherwise return the entire content.
     *
     * @param segment The chat segment to get the preview for.
     * @returns A string that previews the content of the segment.*/
    private getSegmentPreview(segment: ChatSegment): string {
        const firstLine = segment.content.split('\n')[0];
        return firstLine.length > 100 ? 
            `${firstLine.substring(0, 97)}...` : 
            firstLine;
    }

     /** 
      * Returns a string that lists the participants and keywords of the given chat segment.
     * The string is formatted as "Participants: participant1, participant2 | Keywords: keyword1, keyword2".
     * If the segment has no participants or keywords, an empty string is returned.
     * @param segment The chat segment to get the detail string for.
     * @returns The detail string.*/
    private getSegmentDetail(segment: ChatSegment): string {
        const details: string[] = [];

        if (segment.metadata.participants?.length) {
            details.push(`Participants: ${segment.metadata.participants.join(', ')}`);
        }

        if (segment.metadata.keywords?.length) {
            details.push(`Keywords: ${segment.metadata.keywords.join(', ')}`);
        }

        return details.join(' | ');
    }

    /** 
     * Handles changes to the QuickPick's value by filtering the items that are visible.
     * If the value is empty, all items are shown; otherwise, only items that contain the value (case-insensitive)
     * in their label, description, detail or segment content are shown.
     * @param value The new value of the QuickPick.*/
    private async handleQuickPickValueChange(value: string): Promise<void> {
        if (!value) {
            await this.loadSegments();
            return;
        }

        const filteredItems = this.quickPick.items.filter(item => {
            const searchContent = [
                item.label,
                item.description,
                item.detail,
                item.segment.content
            ].join(' ').toLowerCase();

            return searchContent.includes(value.toLowerCase());
        });

        this.quickPick.items = filteredItems;
    }

    /** 
     * Handles the QuickPick's accept event by navigating to the selected segment.
     * If no segment is selected, nothing happens.
     * If an error occurs while navigating to the segment, an error message is shown.
     */
    private async handleQuickPickAccept(): Promise<void> {
        const selectedItem = this.quickPick.selectedItems[0];
        if (!selectedItem) {
            return;
        }

        try {
            await this.navigationManager.navigateToSegment(selectedItem.segment.id);
            this.quickPick.hide();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to jump to segment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Handles the QuickPick's button click event. If the button is the
     * "Preview segment" button, it shows a temporary information message
     * with a code block preview of the segment content.
     * @param item The QuickPickSegmentItem that was clicked.
     * @param button The QuickInputButton that was clicked.
     */
    private async handleQuickPickButton(
        item: QuickPickSegmentItem,
        button: vscode.QuickInputButton
    ): Promise<void> {
        if (button.tooltip === 'Preview segment') {
            // Show preview in a temporary webview or hover
            const preview = new vscode.MarkdownString();
            preview.appendCodeblock(item.segment.content, 'text');
            
            await vscode.window.showInformationMessage(
                'Segment Preview',
                { modal: true, detail: preview.value }
            );
        }
    }

    /**
     * Disposes the QuickPick and all its associated resources.
     * This should be called when the command is no longer needed.
     */
    public dispose(): void {
        this.quickPick.dispose();
    }
}
