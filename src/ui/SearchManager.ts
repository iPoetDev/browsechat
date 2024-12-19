import * as vscode from "vscode";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSegment, ChatSequence } from "../models/types";

/**
 * Search options interface for the search operation
 *
 * @interface SearchOptions
 * @typedef {SearchOptions}
 * 
 * @property {boolean} [caseSensitive]
 * @property {boolean} [wholeWord]
 * @property {boolean} [useRegex]
 * @property {boolean} [includeMetadata]
 * @property {{start: Date, end: Date}} [timeRange]
 * @property {string[]} [participants]
 */
interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includeMetadata?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  participants?: string[];
}

/**
 * Search result interface for the search operation
 *
 * @interface SearchResult
 * @typedef {SearchResult}
 * 
 * @property {ChatSegment} segment
 * @property {ChatSequence} sequence
 * @property {{start: number, end: number, text: string}[]} matches
 * @property {{[key: string]: any}} [metadata]
 */
interface SearchResult {
  segment: ChatSegment;
  sequence: ChatSequence;
  matches: {
    start: number;
    end: number;
    text: string;
  }[];
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Description placeholder
 *
 * 
 * @class SearchManager
 * @typedef {SearchManager}
 * 
 * @property {Map<string, SearchResult[]>} searchResults
 * @property {string} currentSearchToken
 * 
 */
export class SearchManager {
  // #todo: Implement the following methods
  activate() {
    throw new Error("Method not implemented.");
  }
  // #todo: Implement the following methods
  getLastQuery(): any {
    throw new Error("Method not implemented.");
  }

  private static readonly SEARCH_SCHEME = "chat-search";

  private searchResults: Map<string, SearchResult[]> = new Map();
  private currentSearchToken: string = "";

  /**
   * Creates an instance of SearchManager.
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
   * Registers the commands for the search manager
   *
   * @private
   */
  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand("browsechat.search.showPanel", () => {
        this.showSearchPanel();
      }),
      vscode.commands.registerCommand("browsechat.search.nextMatch", () => {
        this.navigateToNextMatch();
      }),
      vscode.commands.registerCommand("browsechat.search.previousMatch", () => {
        this.navigateToPreviousMatch();
      })
    );
  }

  /**
   * Searches for the given query in the chat logs
   *
   * @public
   * 
   * @param {string} query
   * @param {SearchOptions} options
   * @param {vscode.CancellationToken} token
   * @returns {Promise<SearchResult[]>}
   */
  public async search(
    query: string,
    options: SearchOptions,
    token: vscode.CancellationToken
  ): Promise<SearchResult[]> {
    this.currentSearchToken = this.generateSearchToken();
    const results = await this.performSearch(query, options, token);
    this.searchResults.set(this.currentSearchToken, results);
    return results;
  }

  /**
   * Performs the search operation
   *
   * @private
   * 
   * @param {string} query
   * @param {SearchOptions} options
   * @param {vscode.CancellationToken} token
   * @returns {Promise<SearchResult[]>}
   */
  private async performSearch(
    query: string,
    options: SearchOptions,
    token: vscode.CancellationToken
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const sequences = this.getSearchScope(options);

    for (const sequence of sequences) {
      if (token.isCancellationRequested) {
        break;
      }

      for (const segment of sequence.segments) {
        if (token.isCancellationRequested) {
          break;
        }

        if (!this.matchesFilters(segment, options)) {
          continue;
        }

        const matches = this.findMatches(segment.content, query, options);
        if (matches.length > 0) {
          results.push({
            segment,
            sequence,
            matches,
            metadata: segment.metadata,
          });
        }
      }
    }

    return results;
  }

  /**
   * Gets the search scope based on the search options
   *
   * @private
   * @param {SearchOptions} options
   * @returns {ChatSequence[]}
   */
  private getSearchScope(options: SearchOptions): ChatSequence[] {
    return this.dataModel.getAllSequences();
  }

  /**
   * Matches the segment against the search options
   *
   * @private
   * @param {ChatSegment} segment
   * @param {SearchOptions} options
   * @returns {boolean}
   */
  private matchesFilters(
    segment: ChatSegment,
    options: SearchOptions
  ): boolean {
    if (options.timeRange && segment.metadata?.timestamp) {
      const timestamp = new Date(segment.metadata.timestamp);
      if (
        !isNaN(timestamp.getTime()) &&
        (timestamp < options.timeRange.start ||
          timestamp > options.timeRange.end)
      ) {
        return false;
      }
    }

    if (options.participants && options.participants.length > 0) {
      const segmentParticipants = new Set(segment.metadata?.participants || []);
      if (!options.participants.some((p) => segmentParticipants.has(p))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Finds the matches in the content based on the query and options
   *
   * @private
   * @param {string} content
   * @param {string} query
   * @param {SearchOptions} options
   * @returns {{ start: number; end: number; text: string }[]}
   */
  private findMatches(
    content: string,
    query: string,
    options: SearchOptions
  ): { start: number; end: number; text: string }[] {
    const matches: { start: number; end: number; text: string }[] = [];
    let flags = "g";
    if (!options.caseSensitive) {
      flags += "i";
    }

    const pattern = options.useRegex
      ? query
      : options.wholeWord
      ? `\\b${this.escapeRegExp(query)}\\b`
      : this.escapeRegExp(query);

    const regex = new RegExp(pattern, flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }

    return matches;
  }
  
  /**
   * Escapes special characters in a string to be used in a regular expression
   *
   * @private
   * @param {string} string
   * @returns {string}
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Generates a unique token for the current search operation
   *
   * @private
   * @returns {string}
   */
  private generateSearchToken(): string {
    return Math.random().toString(36).substring(2);
  }

  /**
   * Shows the search panel to enter a query
   *
   * @private
   * 
   * @returns {*}
   */
  private async showSearchPanel() {
    const query = await vscode.window.showInputBox({
      placeHolder: "Search in chat logs...",
      prompt: "Enter search query",
    });

    if (query) {
      await this.search(query, {}, new vscode.CancellationTokenSource().token);
      // TODO: Show results in a custom webview or tree view
    }
  }

  /**
   * Navigates to the next search result
   *
   * @private
   * 
   * @returns {*}
   */
  private async navigateToNextMatch() {
    const results = this.getSearchResults();
    // TODO: Implement navigation through results
  }

  /**
   * Navigates to the previous search result
   *
   * @private
   * 
   * @returns {*}
   */
  private async navigateToPreviousMatch() {
    const results = this.getSearchResults();
    // TODO: Implement navigation through results
  }

  /**
   * Clears the current search results
   *
   * @public
   */
  public clearSearch() {
    this.searchResults.clear();
    this.currentSearchToken = "";
  }

  /**
   * Gets the current search results
   *
   * @public
   * @returns {SearchResult[]}
   */
  public getSearchResults(): SearchResult[] {
    return this.searchResults.get(this.currentSearchToken) || [];
  }
}
