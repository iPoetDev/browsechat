import * as vscode from 'vscode';
import { DataModelManager } from '../models/DataModelManager';
import { ChatSegment, ChatSequence } from '../models/types';

/**
 * Interface for the search results.
 *
 * @interface SearchResult
 * @typedef {SearchResult}
 * 
 * @property {ChatSegment} segment
 * @property {ChatSequence} sequence
 * @property {{start: number, end: number, text: string}[]} matches
 */
interface SearchResult {
    segment: ChatSegment;
    sequence: ChatSequence;
    matches: {
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
}

/**
 * Interface for search options.
 *
 * @interface SearchOptions
 * @typedef {SearchOptions}
 * 
 * @property {boolean} caseSensitive Whether the search should be case sensitive.
 * @property {boolean} useRegex Whether the search should use regular expressions.
 * @property {'all' | 'current' | 'selected'} scope The scope of the search.
 */
interface SearchOptions {
    /**
     * Whether the search should be case sensitive.
     *
     * @type {boolean}
     * @memberof SearchOptions
     */
    caseSensitive: boolean; 
    /**
     * Whether the search should use regular expressions.
     *
     * @type {boolean}
     * @memberof SearchOptions
     */
    useRegex: boolean;
    /**
     * The scope of the search.
     *
     * @type {'all' | 'current' | 'selected'}
     * @memberof SearchOptions
     */
    scope: 'all' | 'current' | 'selected';
}

/**
 * Interface for the search chats command.
 *
 * 
 * @class SearchChatsCommand
 * @typedef {SearchChatsCommand}
 * 
 * @property {DataModelManager} dataModel
 * @property {vscode.ExtensionContext} context
 * @property {string[]} searchHistory
 */
export class SearchChatsCommand {
    private static readonly SEARCH_HISTORY_KEY = 'browsechat.searchHistory';
    private static readonly MAX_HISTORY_SIZE = 10;
    private searchHistory: string[] = [];

    /**
     * Creates an instance of SearchChatsCommand.
     *
     * 
     * @param {DataModelManager} dataModel Data model manager
     * @param {vscode.ExtensionContext} context VS Code extension context
     */
    constructor(
        private readonly dataModel: DataModelManager,
        private readonly context: vscode.ExtensionContext
    ) {
        this.registerCommand();
        this.loadSearchHistory();
    }

    /**
     * Registers the command to execute the search interface.
     * This command is bound to the "browsechat.searchChats" command ID.
     * It is triggered when the user invokes the command from the command palette.
     */
    private registerCommand() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('browsechat.searchChats', () => {
                this.execute();
            })
        );
    }

    /**
     * Loads the search history from the VS Code global state.
     * This history is populated when the user searches for text in the chat
     * interface.
     */
    private async loadSearchHistory() {
        this.searchHistory = this.context.globalState.get<string[]>(
            SearchChatsCommand.SEARCH_HISTORY_KEY,
            []
        );
    }

    /**
     * Saves the search history to the VS Code global state.
     * This is invoked when the user adds a new search query to the history.
     */
    private async saveSearchHistory() {
        await this.context.globalState.update(
            SearchChatsCommand.SEARCH_HISTORY_KEY,
            this.searchHistory
        );
    }

    /**
     * Adds a search query to the search history.
     * If the query already exists in the history, it is moved to the front.
     * The history is capped at the MAX_HISTORY_SIZE.
     * @param {string} query The search query to add to the history.
     */
    private addToHistory(query: string) {
        this.searchHistory = [
            query,
            ...this.searchHistory.filter(q => q !== query)
        ].slice(0, SearchChatsCommand.MAX_HISTORY_SIZE);
        this.saveSearchHistory();
    }

    /**
     * Executes the search command.
     * The command execution is split into three steps:
     * 1. Get search options (case sensitivity, regex, scope).
     * 2. Get search query.
     * 3. Perform search using the provided options and query.
     * If any step fails, an error message is shown to the user.
     * @returns {Promise<void>}
     */
    public async execute(): Promise<void> {
        try {
            // Step 1: Get search options
            const options = await this.getSearchOptions();
            if (!options) {
                return;
            }

            // Step 2: Get search query
            const query = await this.getSearchQuery();
            if (!query) {
                return;
            }

            // Step 3: Perform search
            await this.performSearch(query, options);

        } catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Shows a quick pick with search options to the user and returns the selected options.
     * The options are:
     * - Case sensitivity
     * - Use regular expressions
     * - Search scope (all chats, current chat, selected chats)
     * If the user cancels the quick pick, the function returns undefined.
     * @returns The selected search options or undefined if the user cancelled.
     */
    private async getSearchOptions(): Promise<SearchOptions | undefined> {
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(case-sensitive) Case Sensitive',
                description: 'Match case in search',
                picked: false
            },
            {
                label: '$(regex) Use Regular Expression',
                description: 'Enable regex in search',
                picked: false
            }
        ];

        const scopeItems = [
            { label: 'All Chats', id: 'all' },
            { label: 'Current Chat', id: 'current' },
            { label: 'Selected Chats', id: 'selected' }
        ];

        const selectedOptions = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select search options'
        });

        if (!selectedOptions) {
            return undefined;
        }

        const selectedScope = await vscode.window.showQuickPick(scopeItems, {
            placeHolder: 'Select search scope'
        });

        if (!selectedScope) {
            return undefined;
        }

        return {
            caseSensitive: selectedOptions.some(opt => opt.label.includes('Case Sensitive')),
            useRegex: selectedOptions.some(opt => opt.label.includes('Regular Expression')),
            scope: selectedScope.id as SearchOptions['scope']
        };
    }

    /**
     * Shows a quick pick with search history to the user and returns the selected query.
     * If the user selects the "Enter search query..." item, shows an input box to enter a new query.
     * If the user cancels the quick pick or the input box, the function returns undefined.
     * @returns The selected query or undefined if the user cancelled.
     */
    private async getSearchQuery(): Promise<string | undefined> {
        const query = await vscode.window.showQuickPick(
            [
                { label: '$(search) Enter search query...', alwaysShow: true },
                ...this.searchHistory.map(h => ({
                    label: h,
                    description: 'Recent search'
                }))
            ],
            {
                placeHolder: 'Enter search query',
                ignoreFocusOut: true
            }
        );

        if (!query) {
            return undefined;
        }

        if (query.label === '$(search) Enter search query...') {
            const input = await vscode.window.showInputBox({
                placeHolder: 'Enter search query',
                ignoreFocusOut: true
            });

            if (!input) {
                return undefined;
            }

            this.addToHistory(input);
            return input;
        }

        return query.label;
    }

    /**
     * Performs a search of chat segments using the given query and options.
     * Shows progress in the VS Code status bar and notifications area.
     * If the search is cancelled, throws an error.
     * @param query The search query.
     * @param options The search options.
     */
    private async performSearch(query: string, options: SearchOptions): Promise<void> {
        const startTime = Date.now();
        const results: SearchResult[] = [];
        let totalMatches = 0;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Searching chats',
                cancellable: true
            },
            async (progress, token) => {
                const sequences = this.getSearchScope(options.scope);
                const searchRegex = this.createSearchRegex(query, options);
                const totalSequences = sequences.length;

                for (let i = 0; i < sequences.length; i++) {
                    if (token.isCancellationRequested) {
                        throw new Error('Search cancelled');
                    }

                    const sequence = sequences[i];
                    const segments = this.dataModel.getSequenceSegments(sequence.id);
                    
                    progress.report({
                        increment: (100 / totalSequences),
                        message: `Searching file ${i + 1}/${totalSequences}`
                    });

                    for (const segment of segments) {
                        const matches = this.findMatches(segment.content, searchRegex);
                        if (matches.length > 0) {
                            results.push({ segment, sequence, matches });
                            totalMatches += matches.length;
                        }
                    }

                    // Show progressive results
                    if (results.length > 0 && (i + 1) % 5 === 0) {
                        this.showResults(results, totalMatches, startTime);
                    }
                }

                this.showResults(results, totalMatches, startTime);
            }
        );
    }

    /**
     * Returns the sequences to search based on the given scope.
     * If the scope is "all", returns all sequences.
     * If the scope is "current", returns the first sequence (TODO: Get current sequence from active editor).
     * If the scope is "selected", returns the first 3 sequences (TODO: Get selected sequences from tree view).
     * Otherwise, returns all sequences.
     * @param scope The search scope.
     * @returns The sequences to search.
     */
    private getSearchScope(scope: SearchOptions['scope']): ChatSequence[] {
        const allSequences = this.dataModel.getAllSequences();
        switch (scope) {
            case 'all':
                return allSequences;
            case 'current':
                // TODO: Get current sequence from active editor
                return allSequences.slice(0, 1);
            case 'selected':
                // TODO: Get selected sequences from tree view
                return allSequences.slice(0, 3);
            default:
                return allSequences;
        }
    }

    /**
     * Creates a regular expression based on the given search query and options.
     * If `options.useRegex` is true, the `query` is used as is.
     * If `options.useRegex` is false, the `query` is treated as a literal string and
     * any special regular expression characters are escaped.
     * If `options.caseSensitive` is true, the regular expression is case sensitive,
     * otherwise it is case insensitive.
     * @param query The search query.
     * @param options The search options.
     * @returns A regular expression based on the given search query and options.
     */
    private createSearchRegex(query: string, options: SearchOptions): RegExp {
        if (options.useRegex) {
            try {
                return new RegExp(
                    query,
                    options.caseSensitive ? 'g' : 'gi'
                );
            } catch (error) {
                throw new Error(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return new RegExp(
            query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            options.caseSensitive ? 'g' : 'gi'
        );
    }

    /**
     * Finds all matches of a regular expression in a given string and returns an array of
     * objects containing the text of the match, the start index of the match, and the end
     * index of the match.
     * The regular expression is executed with its `lastIndex` set to 0 before the loop begins.
     * Each match is given a context of 50 characters before and after the match.
     * @param content The string to search.
     * @param regex The regular expression to use.
     * @returns An array of objects containing the text of the match, the start index of the match,
     * and the end index of the match.
     */
    private findMatches(content: string, regex: RegExp): { text: string; startIndex: number; endIndex: number; }[] {
        const matches: { text: string; startIndex: number; endIndex: number; }[] = [];

        let match: RegExpExecArray | null;

        regex.lastIndex = 0;
        while ((match = regex.exec(content)) !== null) {
            const contextStart = Math.max(0, match.index - 50);
            const contextEnd = Math.min(content.length, match.index + match[0].length + 50);

            matches.push({
                text: content.substring(contextStart, contextEnd),
                startIndex: match.index,
                endIndex: match.index + match[0].length
            });
        }

        return matches;
    }
    
    /**
     * Displays the search results in a webview panel.
     * @param results The search results.
     * @param totalMatches The total number of matches.
     * @param startTime The start time of the search.
     */
    private showResults(results: SearchResult[], totalMatches: number, startTime: number) {
        const searchTime = Date.now() - startTime;
        const panel = vscode.window.createWebviewPanel(
            'browsechat.searchResults',
            'Chat Search Results',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateResultsHtml(results, totalMatches, searchTime);
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'jumpToResult':
                    // TODO: Implement jump to result
                    break;
            }
        });
    }

    /**
     * Generates the HTML for the search results webview panel.
     * @param results The search results.
     * @param totalMatches The total number of matches.
     * @param searchTime The time it took to perform the search.
     * @returns The HTML content for the webview panel.
     */
    private generateResultsHtml(results: SearchResult[], totalMatches: number, searchTime: number): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                    }
                    .summary {
                        margin-bottom: 20px;
                        color: var(--vscode-foreground);
                    }
                    .result {
                        margin-bottom: 20px;
                        padding: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                    }
                    .location {
                        color: var(--vscode-textLink-foreground);
                        cursor: pointer;
                        margin-bottom: 5px;
                    }
                    .match {
                        white-space: pre-wrap;
                        font-family: var(--vscode-editor-font-family);
                    }
                    .highlight {
                        background: var(--vscode-editor-findMatchHighlightBackground);
                        color: var(--vscode-editor-findMatchHighlightForeground);
                    }
                </style>
            </head>
            <body>
                <div class="summary">
                    Found ${totalMatches} matches in ${results.length} segments
                    (${searchTime}ms)
                </div>
                ${results.map((result, index) => `
                    <div class="result">
                        <div class="location" data-index="${index}">
                            ${result.sequence.sourceFile}
                            ${result.segment.metadata.timestamp ?
                                `- ${new Date(result.segment.metadata.timestamp).toLocaleString()}` :
                                ''}
                        </div>
                        ${result.matches.map(match => `
                            <div class="match">
                                ${this.highlightMatch(match.text, match.startIndex, match.endIndex)}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                <script>
                    const vscode = acquireVsCodeApi();
                    document.querySelectorAll('.location').forEach(el => {
                        el.addEventListener('click', () => {
                            vscode.postMessage({
                                command: 'jumpToResult',
                                index: parseInt(el.dataset.index)
                            });
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Replaces the matched text with a span element, highlighting the matched
     * area.
     * @param text The text to highlight
     * @param matchStart The start index of the matched text
     * @param matchEnd The end index of the matched text
     * @returns The text with the matched area highlighted
     */
    private highlightMatch(text: string, matchStart: number, matchEnd: number): string {
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(
                new RegExp(`(.{${matchStart}})(.{${matchEnd - matchStart}})(.*)`, 's'),
                '$1<span class="highlight">$2</span>$3'
            );
    }
}
