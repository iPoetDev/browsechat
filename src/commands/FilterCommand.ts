import * as vscode from "vscode";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSegment, ChatSequence, ChatMetadata } from "../models/types";
import { DataModelEventType } from "../models/events";

interface FilterCriteria {
  speakers?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  keywords?: string[];
  contentTypes?: string[];
  lengthRange?: {
    min?: number;
    max?: number;
  };
}

interface FilterResult {
  segment: ChatSegment;
  sequence: ChatSequence;
  matchedCriteria: string[];
}

export class FilterCommand {
  private static readonly FILTER_HISTORY_KEY = "browsechat.filterHistory";
  private static readonly MAX_HISTORY_SIZE = 5;
  private filterHistory: FilterCriteria[] = [];
  private currentFilters: FilterCriteria | undefined;

  constructor(
    private readonly dataModel: DataModelManager,
    private readonly context: vscode.ExtensionContext
  ) {
    this.registerCommand();
    this.loadFilterHistory();
    this.setupChangeListeners();
  }


  /**
   * Registers the "browsechat.filter" command.
   * This command is triggered when the user selects "Browse Chat: Filter" from the command palette.
   * It shows the filter interface to allow the user to select filter criteria.
   * After the user applies the filter, the command filters the chat log using the filter criteria.
   * If the user cancels the filter interface, the command does nothing.
   */
  private registerCommand() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand("browsechat.filter", () => {
        this.execute();
      })
    );
  }



  /**
   * Loads the filter history from the VS Code global state.
   * The history is an array of filter criteria objects.
   * If the history is not found, an empty array is used.
   */
 
  private async loadFilterHistory() {
  this.filterHistory = this.context.globalState.get<FilterCriteria[]>(
      FilterCommand.FILTER_HISTORY_KEY,
      []
    );
  }

  /**
   * Saves the filter history to the VS Code global state.
   * This is invoked after the user applies a filter.
   * The history is an array of filter criteria objects.
   * @returns A promise that resolves when the history is saved.
   */
  private async saveFilterHistory() {
    await this.context.globalState.update(
      FilterCommand.FILTER_HISTORY_KEY,
      this.filterHistory
    );
  }

  /**
   * Adds a filter criteria object to the filter history.
   * If the criteria already exists in the history, it is moved to the front.
   * The history is capped at the MAX_HISTORY_SIZE.
   * @param criteria The filter criteria object to add to the history.
   */
  private addToHistory(criteria: FilterCriteria) {
    this.filterHistory = [
      criteria,
      ...this.filterHistory.filter(
        (f) => JSON.stringify(f) !== JSON.stringify(criteria)
      ),
    ].slice(0, FilterCommand.MAX_HISTORY_SIZE);
    this.saveFilterHistory();
  }

  /**
   * Sets up listeners for data model changes.
   * When the data model is updated (e.g., a new chat log is opened),
   * the filter is reapplied to the new data model.
   * This ensures that the filter results are updated in real-time.
   */
  private setupChangeListeners() {
    // Listen for data model changes to update filters in real-time
    this.dataModel.on(DataModelEventType.SegmentUpdated, () => {
      if (this.currentFilters) {
        this.applyFilters(this.currentFilters, true);
      }
    });
  }

  /**
  * Executes the filter command.
  * This shows the filter interface to allow the user to select filter criteria.
  * After the user applies the filter, the command filters the chat log using the filter criteria.
  * If the user cancels the filter interface, the command does nothing.
  * If the filter fails, an error message is shown to the user.
  * @returns A promise that resolves when the filter is executed.
  */
  public async execute(): Promise<void> {
    try {
      // added
      const criteria = await this.getFilterCriteria();
      if (!criteria) {
        return;
      }

      this.currentFilters = criteria;
      await this.applyFilters(criteria);
      this.addToHistory(criteria);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Filter failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the filter criteria selected by the user.
   * Shows a QuickPick to let the user select which filter types to apply.
   * If the user cancels, returns undefined.
   * Otherwise, returns an object with the selected filter types as keys and their corresponding values as values.
   * If no filter types are selected, returns an empty object.
   * @returns A promise that resolves to the filter criteria or undefined.
   */
  private async getFilterCriteria(): Promise<FilterCriteria | undefined> {
    const filterTypes = [
      "$(person) Speaker",
      "$(calendar) Date Range",
      "$(tag) Keywords",
      "$(symbol-misc) Content Type",
      "$(arrow-both) Length Range",
    ];

    const selectedTypes = await vscode.window.showQuickPick(filterTypes, {
      canPickMany: true,
      placeHolder: "Select filter types",
    });

    if (!selectedTypes) {
      return undefined;
    }

    const criteria: FilterCriteria = {};

    for (const type of selectedTypes) {
      if (type.includes("Speaker")) {
        criteria.speakers = await this.selectSpeakers();
      }
      if (type.includes("Date Range")) {
        criteria.dateRange = await this.selectDateRange();
      }
      if (type.includes("Keywords")) {
        criteria.keywords = await this.selectKeywords();
      }
      if (type.includes("Content Type")) {
        criteria.contentTypes = await this.selectContentTypes();
      }
      if (type.includes("Length Range")) {
        criteria.lengthRange = await this.selectLengthRange();
      }

      if (!criteria) {
        return undefined;
      }
    }

    return Object.keys(criteria).length > 0 ? criteria : undefined;
  }

  /**
   * Prompts the user to select zero or more speakers from the chat log.
   * The prompt shows a list of all unique speakers in the chat log.
   * If the user cancels, returns undefined.
   * Otherwise, returns an array of the selected speaker names.
   * @returns A promise that resolves to the selected speaker names or undefined.
   */
  private async selectSpeakers(): Promise<string[] | undefined> {
    const speakers = new Set<string>();
    this.dataModel.getAllSequences().forEach((sequence) => {
      const segments = this.dataModel.getSequenceSegments(sequence.id);
      segments.forEach((segment) => {
        segment.metadata.participants?.forEach((p) => speakers.add(p));
      });
    });

    const items = Array.from(speakers).map((speaker) => ({
      label: speaker,
      picked: false,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: "Select speakers",
    });

    return selected?.map((item) => item.label);
  }

  /**
   * Prompts the user to select a date range from a list of presets.
   * If the user cancels, returns undefined.
   * Otherwise, returns an object with `start` and `end` properties
   * representing the selected date range.
   * @returns A promise that resolves to the selected date range or undefined.
   */
  private async selectDateRange(): Promise<
    { start: Date; end: Date } | undefined
  > {
    const ranges = [
      { label: "Last 24 hours", days: 1 },
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Custom range", days: 0 },
    ];

    const selected = await vscode.window.showQuickPick(ranges, {
      placeHolder: "Select date range",
    });

    if (!selected) {
      return undefined;
    }

    if (selected.days === 0) {
      // Custom range implementation would go here For now, default to last 7 days
      return {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };
    }

    return {
      start: new Date(Date.now() - selected.days * 24 * 60 * 60 * 1000),
      end: new Date(),
    };
  }

  /**
   * Prompts the user to enter one or more keywords, separated by commas.
   * If the user cancels, returns undefined.
   * Otherwise, returns an array of the entered keywords, trimmed and filtered for empty strings.
   * @returns A promise that resolves to the entered keywords or undefined.
   */
  private async selectKeywords(): Promise<string[] | undefined> {
    const input = await vscode.window.showInputBox({
      placeHolder: "Enter keywords (comma-separated)",
      validateInput: (input) => {
        return input.length > 0 ? null : "Please enter at least one keyword";
      },
    });

    if (!input) {
      return undefined;
    }

    return input
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  /**
   * Prompts the user to select one or more content types from a list of supported types.
   * If the user cancels, returns undefined.
   * Otherwise, returns an array of the selected content types.
   * @returns A promise that resolves to the selected content types or undefined.
  */
 private async selectContentTypes(): Promise<string[] | undefined> {
   const types = ["Text", "Code", "Command", "Error", "Warning", "Info"];
    const selected = await vscode.window.showQuickPick(types, {
      canPickMany: true,
      placeHolder: "Select content types",
    });

    return selected;
  }

  /**
   * Prompts the user to enter a length range using a flexible format.
   * If the user cancels, returns undefined.
   * Otherwise, returns an object with `min` and/or `max` properties
   * representing the parsed length range.
   * The format can be one of the following:
   *   `100-500` - Range from 100 to 500
   *   `>1000` - At least 1000
   *   `<500` - Less than 500
   * @returns A promise that resolves to the parsed length range or undefined.
   */
  private async selectLengthRange(): Promise<
    { min?: number; max?: number } | undefined
  > {
    const input = await vscode.window.showInputBox({
      placeHolder: 'Enter length range (e.g., "100-500" or ">1000" or "<500")',
      validateInput: (input) => {
        const valid = /^(\d+)-(\d+)$|^>(\d+)$|^<(\d+)$/.test(input);
        return valid ? null : "Invalid range format";
      },
    });

    if (!input) {
      return undefined;
    }

    const match = input.match(/^(\d+)-(\d+)$|^>(\d+)$|^<(\d+)$/);
    if (!match) {
      return undefined;
    }

    if (match[1] && match[2]) {
      return {
        min: parseInt(match[1]),
        max: parseInt(match[2]),
      };
    } else if (match[3]) {
      return { min: parseInt(match[3]) };
    } else if (match[4]) {
      return { max: parseInt(match[4]) };
    }

    return undefined;
  }

  /**
   * Applies the given filter criteria to all chat segments and shows the matching
   * segments in the chat panel.
   * @param criteria The filter criteria to apply.
   * @param silent If true, don't show the results in the chat panel.
   * @returns A promise that resolves when the filtering is complete.
   */
  private async applyFilters(
    criteria: FilterCriteria,
    silent: boolean = false
  ): Promise<void> {
    const results: FilterResult[] = [];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Applying filters",
        cancellable: true,
      },
      async (progress, token) => {
        const sequences = this.dataModel.getAllSequences();
        const totalSequences = sequences.length;

        for (let i = 0; i < sequences.length; i++) {
          if (token.isCancellationRequested) {
            throw new Error("Filtering cancelled");
          }

          const sequence = sequences[i];
          const segments = this.dataModel.getSequenceSegments(sequence.id);

          progress.report({
            increment: 100 / totalSequences,
            message: `Filtering sequence ${i + 1}/${totalSequences}`,
          });

          for (const segment of segments) {
            const matchedCriteria = this.matchesCriteria(segment, criteria);
            if (matchedCriteria.length > 0) {
              results.push({ segment, sequence, matchedCriteria });
            }
          }
        }

        if (!silent) {
          this.showResults(results, criteria);
        }
      }
    );
  }

  /**
   * Returns an array of criteria that the given segment matches.
   * @param segment The segment to check.
   * @param criteria The filter criteria to check against.
   * @returns An array of criteria names that the segment matches.
   */
  private matchesCriteria(
    segment: ChatSegment,
    criteria: FilterCriteria
  ): string[] {
    const matches: string[] = [];

    if (criteria.speakers && segment.metadata.participants) {
      const hasMatchingSpeaker = segment.metadata.participants.some((p) =>
        criteria.speakers!.includes(p)
      );
      if (hasMatchingSpeaker) {
        matches.push("speaker");
      }
    }

    if (criteria.dateRange && segment.metadata.timestamp) {
      const timestamp = new Date(segment.metadata.timestamp);
      if (
        timestamp >= criteria.dateRange.start &&
        timestamp <= criteria.dateRange.end
      ) {
        matches.push("date");
      }
    }

    if (criteria.keywords) {
      const hasKeywords = criteria.keywords.some((keyword) =>
        segment.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasKeywords) {
        matches.push("keyword");
      }
    }

    if (criteria.contentTypes && segment.metadata.contentType) {
      if (criteria.contentTypes.includes(segment.metadata.contentType)) {
        matches.push("content-type");
      }
    }

    if (criteria.lengthRange) {
      const length = segment.content.length;
      const meetsMin =
        !criteria.lengthRange.min || length >= criteria.lengthRange.min;
      const meetsMax =
        !criteria.lengthRange.max || length <= criteria.lengthRange.max;
      if (meetsMin && meetsMax) {
        matches.push("length");
      }
    }

    return matches;
  }

  /**
   * Displays the filter results in a webview panel.
   * @param results The filter results to display.
   * @param criteria The filter criteria used to generate the results.
   */
  private showResults(results: FilterResult[], criteria: FilterCriteria) {
    const panel = vscode.window.createWebviewPanel(
      "browsechat.filterResults",
      "Filter Results",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.generateResultsHtml(results, criteria);
    panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "jumpToResult":
          // TODO: Implement jump to result
          break;
        case "modifyFilters":
          this.execute();
          break;
      }
    });
  }

  /**
   * Generates the HTML for the filter results webview panel.
   * The generated HTML will show a summary of the number of matching segments,
   * the applied filters, and a list of the matching segments, with their
   * content, matched criteria, and location.
   * The HTML is styled to match Visual Studio Code.
   * @param results The filter results to display.
   * @param criteria The filter criteria used to generate the results.
   * @returns The generated HTML string.
   */
  private generateResultsHtml(
    results: FilterResult[],
    criteria: FilterCriteria
  ): string {
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
                    .filters {
                        margin-bottom: 20px;
                        padding: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
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
                    .content {
                        white-space: pre-wrap;
                        font-family: var(--vscode-editor-font-family);
                    }
                    .criteria {
                        color: var(--vscode-textPreformat-foreground);
                        margin-top: 5px;
                    }
                    .modify-button {
                        margin-top: 10px;
                        cursor: pointer;
                        color: var(--vscode-button-foreground);
                        background: var(--vscode-button-background);
                        border: none;
                        padding: 5px 10px;
                    }
                </style>
            </head>
            <body>
                <div class="summary">
                    Found ${results.length} matching segments
                </div>
                <div class="filters">
                    <strong>Applied Filters:</strong>
                    <ul>
                        ${this.formatAppliedFilters(criteria)}
                    </ul>
                    <button class="modify-button" onclick="modifyFilters()">
                        Modify Filters
                    </button>
                </div>
                ${results
                  .map(
                    (result, index) => `
                    <div class="result">
                        <div class="location" data-index="${index}">
                            ${result.sequence.sourceFile}
                            ${
                              result.segment.metadata.timestamp
                                ? `- ${new Date(
                                    result.segment.metadata.timestamp
                                  ).toLocaleString()}`
                                : ""
                            }
                        </div>
                        <div class="content">
                            ${this.formatContent(result.segment.content)}
                        </div>
                        <div class="criteria">
                            Matched: ${result.matchedCriteria.join(", ")}
                        </div>
                    </div>
                `
                  )
                  .join("")}
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
                    function modifyFilters() {
                        vscode.postMessage({ command: 'modifyFilters' });
                    }
                </script>
            </body>
            </html>
        `;
  }

  /**
   * Format the given filter criteria into a string suitable for display.
   * @param criteria The filter criteria to format.
   * @returns A string representation of the criteria.
   */
  private formatAppliedFilters(criteria: FilterCriteria): string {
    const filters: string[] = [];

    if (criteria.speakers) {
      filters.push(`Speakers: ${criteria.speakers.join(", ")}`);
    }
    if (criteria.dateRange) {
      filters.push(
        `Date Range: ${criteria.dateRange.start.toLocaleDateString()} - ` +
          `${criteria.dateRange.end.toLocaleDateString()}`
      );
    }
    if (criteria.keywords) {
      filters.push(`Keywords: ${criteria.keywords.join(", ")}`);
    }
    if (criteria.contentTypes) {
      filters.push(`Content Types: ${criteria.contentTypes.join(", ")}`);
    }
    if (criteria.lengthRange) {
      const range = [];
      if (criteria.lengthRange.min) {
        range.push(`>= ${criteria.lengthRange.min}`);
      }
      if (criteria.lengthRange.max) {
        range.push(`<= ${criteria.lengthRange.max}`);
      }
      filters.push(`Length: ${range.join(" and ")}`);
    }

    return filters.map((f) => `<li>${f}</li>`).join("");
  }

  /**
   * Format the given content into a string suitable for display in the filter
   * results. This will escape HTML characters and truncate the content to 5
   * lines, with an ellipsis if it is longer.
   * @param content The content to format.
   * @returns A formatted string representation of the content.
  */
  private formatContent(content: string): string {
    return (
      content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .split("\n")
        .slice(0, 5)
        .join("\n") + (content.split("\n").length > 5 ? "\n..." : "")
    );
  }
}
