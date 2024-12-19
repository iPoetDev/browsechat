import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { DataModelManager } from "../models/DataModelManager";
import { ChatSegment, ChatSequence } from "../models/types";



/**
 * Export format for chat segments.
 *
 * @interface ExportFormat
 * @typedef {ExportFormat}
 * 
 * @property {string} id The unique identifier for the export format.
 * @property {string} name The name of the export format.
 * @property {string} extension The file extension for the export format.
 * @property {(segments: ChatSegment[], sequence: ChatSequence) => string} formatter The function to format the chat segments for the export format.
 */
interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  formatter: (segments: ChatSegment[], sequence: ChatSequence) => string;
}



/**
 * Export options for chat segments.
 *
 * @export
 * @interface ExportOptions
 * @typedef {ExportOptions}
 * 
 * @property {ExportFormat} format The format to export the chat segments in.
 * @property {boolean} includeMetadata Whether to include metadata in the export.
 * @property {string} [customTemplate] The custom template to use for the export.
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  customTemplate?: string;
}



/**
 * Description placeholder
 *
 * @class ExportChatCommand
 * @typedef {ExportChatCommand}
 * 
 * @property {vscode.ExtensionContext} context The extension context to register the command with.
 * @property {DataModelManager} dataModel The data model manager containing the chat data.
 * 
 * constructor: Initializes the export chat command with a data model manager and an extension context.
* registerCommand: Registers the "browsechat.exportChat" command with the VS Code extension host.
* execute: Executes the export chat command, which prompts the user to select chat segments, choose an export format, select an output location, and then performs the export with progress.
* selectSegments: Selects chat segments for export, prompting the user to select zero or more chat segments from the currently open chat sequences.
* selectExportOptions: Selects export options for chat segments, including the format, whether to include metadata, and a custom template for the selected format.
* selectOutputLocation: Selects an output location for the export, prompting the user to select a file path and name for the export.
* exportWithProgress: Exports the given segments to the specified file path with progress indication.
* export: Exports chat segments to the specified file path.
* getSegmentLabel: Gets a label for a chat segment that includes its timestamp and a preview of its content.
* getSegmentPreview: Gets a preview of the content of a chat segment, truncating it if necessary.
* formatAsPlainText, formatAsMarkdown, formatAsHtml, formatAsJson: Format the given chat segments as plain text, Markdown, HTML, or JSON, respectively.
* escapeHtml: Escapes a string for use in HTML.
 */
export class ExportChatCommand {
  private readonly exportFormats: ExportFormat[] = [
    {
      id: "plaintext",
      name: "Plain Text",
      extension: ".txt",
      formatter: this.formatAsPlainText.bind(this),
    },
    {
      id: "markdown",
      name: "Markdown",
      extension: ".md",
      formatter: this.formatAsMarkdown.bind(this),
    },
    {
      id: "html",
      name: "HTML",
      extension: ".html",
      formatter: this.formatAsHtml.bind(this),
    },
    {
      id: "json",
      name: "JSON",
      extension: ".json",
      formatter: this.formatAsJson.bind(this),
    },
  ];

  /**
   * Initializes the export chat command.
   *
   * @param dataModel The data model manager containing the chat data.
   * @param context The extension context to register the command with.
   */
  constructor(
    private readonly dataModel: DataModelManager,
    private readonly context: vscode.ExtensionContext
  ) {
    this.registerCommand();
  }

  /**
   * Registers the "browsechat.exportChat" command with the VS Code extension host.
   * This command is triggered when the user selects "Browse Chat: Export Chat" from
   * the command palette or uses the keyboard shortcut.
   */
  private registerCommand() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand("browsechat.exportChat", () => {
        this.execute();
      })
    );
  }

  /**
   * Executes the "browsechat.exportChat" command.
   *
   * Prompts the user to select chat segments, choose an export format, select an
   * output location, and then performs the export with progress.
   *
   * If any part of the export process fails, shows an error message to the user.
   */
  public async execute(): Promise<void> {
    try {
      // Step 1: Select segments
      const segments = await this.selectSegments();
      if (!segments || segments.length === 0) {
        return;
      }

      // Step 2: Choose export format
      const options = await this.selectExportOptions();
      if (!options) {
        return;
      }

      // Step 3: Select output location
      const outputPath = await this.selectOutputLocation(
        options.format.extension
      );
      if (!outputPath) {
        return;
      }

      // Step 4: Export with progress
      await this.exportWithProgress(segments, outputPath, options);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Export failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Selects chat segments for export.
   *
   * Prompts the user to select zero or more chat segments from the currently
   * open chat sequences. The prompt shows the timestamp, participants, and a
   * preview of each segment. The user can select multiple segments using the
   * space key and confirm the selection using the enter key.
   *
   * If the user selects no segments, an empty array is returned. Otherwise,
   * an array of the selected segments is returned.
   */
  private async selectSegments(): Promise<ChatSegment[]> {
    const sequences = this.dataModel.getAllSequences();
    const items: vscode.QuickPickItem[] = [];
    const segmentMap = new Map<string, ChatSegment>();

    for (const sequence of sequences) {
      const segments = this.dataModel.getSequenceSegments(sequence.id);
      for (const segment of segments) {
        const label = this.getSegmentLabel(segment);
        items.push({
          label,
          description: sequence.sourceFile,
          detail: this.getSegmentPreview(segment),
          picked: false,
        });
        segmentMap.set(label, segment);
      }
    }

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder:
        "Select segments to export (Space to select, Enter to confirm)",
      title: "Export Chat Segments",
    });

    if (!selected) {
      return [];
    }

    return selected.map((item) => segmentMap.get(item.label)!);
  }

  /**
   * Selects export options for chat segments.
   *
   * Prompts the user to select a format, whether to include metadata, and a custom
   * template for the selected format if applicable. If the user selects no format,
   * no include metadata option, or no custom template, an empty `ExportOptions`
   * object is returned. Otherwise, an `ExportOptions` object with the selected
   * options is returned.
   *
   * @returns An `ExportOptions` object with the selected options, or `undefined`
   * if the user selected no options.
   */
  private async selectExportOptions(): Promise<ExportOptions | undefined> {
    // Select format
    const formatItem = await vscode.window.showQuickPick(
      this.exportFormats.map((format) => ({
        label: format.name,
        description: format.extension,
        format,
      })),
      {
        placeHolder: "Select export format",
        title: "Export Format",
      }
    );

    if (!formatItem) {
      return undefined;
    }

    // Include metadata option
    const includeMetadata = await vscode.window.showQuickPick(
      [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
      {
        placeHolder: "Include metadata in export?",
        title: "Export Options",
      }
    );

    if (!includeMetadata) {
      return undefined;
    }

    // Custom template for selected format
    let customTemplate: string | undefined;
    if (formatItem.format.id === "custom") {
      customTemplate = await vscode.window.showInputBox({
        prompt: "Enter custom export template",
        placeHolder: "${content} ${timestamp} ${participants}",
      });

      if (!customTemplate) {
        return undefined;
      }
    }

    return {
      format: formatItem.format,
      includeMetadata: includeMetadata.value,
      customTemplate,
    };
  }

  /**
   * Selects an output location for the export.
   *
   * Prompts the user to select a file path and name for the export. The default
   * location is the root of the workspace with a file name of "chat_export" and
   * the selected extension. The user can select a different location or file name.
   * If the user selects no location, `undefined` is returned.
   *
   * @param extension The extension of the file to be saved, without the leading
   * dot (e.g. "txt", "md", etc.).
   * @returns The selected file path, or `undefined` if the user selected no
   * location.
   */
  private async selectOutputLocation(
    extension: string
  ): Promise<string | undefined> {
    const options: vscode.SaveDialogOptions = {
      defaultUri: vscode.Uri.file(
        path.join(
          vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
          `chat_export${extension}`
        )
      ),
      filters: {
        "Export File": [extension.slice(1)],
      },
      title: "Save Export As",
    };

    const uri = await vscode.window.showSaveDialog(options);
    return uri?.fsPath;
  }

  /**
   * Exports the given segments to the specified file path with progress
   * indication.
   *
   * This function exports the given segments to the specified file path using
   * the provided `ExportOptions`. It displays a progress bar with a title of
   * "Exporting chat segments" and a message of
   * "Processing segment X/Y", where X is the current segment index and Y is the
   * total number of segments. The progress bar is cancellable.
   *
   * If the export is cancelled, this function throws an error with the message
   * "Export cancelled".
   *
   * After the export is complete, this function displays an information message
   * with the text "Successfully exported Z segments to PATH", where Z is the
   * number of segments exported and PATH is the file path of the export.
   *
   * @param segments The segments to export.
   * @param outputPath The file path to export to.
   * @param options The export options.
   */
  private async exportWithProgress(
    segments: ChatSegment[],
    outputPath: string,
    options: ExportOptions
  ): Promise<void> {
    const sequence = this.dataModel.getSequence(segments[0].sequenceId);
    if (!sequence) {
      throw new Error("Sequence not found");
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Exporting chat segments",
        cancellable: true,
      },
      async (progress, token) => {
        const content = options.format.formatter(segments, sequence);

        // Simulate progress for large exports
        const totalSteps = segments.length;
        for (let i = 0; i < totalSteps; i++) {
          if (token.isCancellationRequested) {
            throw new Error("Export cancelled");
          }

          progress.report({
            increment: 100 / totalSteps,
            message: `Processing segment ${i + 1}/${totalSteps}`,
          });

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await fs.writeFile(outputPath, content, "utf-8");
        vscode.window.showInformationMessage(
          `Successfully exported ${segments.length} segments to ${outputPath}`
        );
      }
    );
  }

  /**
   * Export chat segments to the specified file path.
   * @param segments Chat segments to export.
   * @param outputPath Path to write the export file to.
   * @param options Export options, such as format and whether to include metadata.
   * @returns A promise that resolves when the export is complete.
   */
  public async export(
    segments: ChatSegment[],
    outputPath: string,
    options: ExportOptions
  ): Promise<void> {
    return this.exportWithProgress(segments, outputPath, options);
  }
  
  /**
   * Get a label for a chat segment that includes its timestamp and a preview
   * of its content.
   *
   * @param segment The chat segment to get the label for.
   * @returns A string that includes the timestamp and a preview of the segment's
   * content.
   */
  private getSegmentLabel(segment: ChatSegment): string {
    const timestamp = segment.metadata.timestamp
      ? new Date(segment.metadata.timestamp).toLocaleString()
      : "";
    return `${timestamp} - ${this.getSegmentPreview(segment)}`;
  }

  /**
   * Get a preview of the content of a chat segment. If the segment's content is
   * longer than 50 characters, return a truncated version with ellipsis at the
   * end; otherwise return the entire content.
   *
   * @param segment The chat segment to get the preview for.
   * @returns A string that previews the content of the segment.**/
  private getSegmentPreview(segment: ChatSegment): string {
    const firstLine = segment.content.split("\n")[0];
    return firstLine.length > 50 ? `${firstLine.slice(0, 47)}...` : firstLine;
  }

  /**
   * Format the given chat segments as plain text.
   *
   * Each segment is formatted as a single line with a timestamp and a list of
   * participants, followed by the segment's content indented by 4 spaces.
   * Between each segment, a line of 80 hyphens is inserted.
   *
   * @param segments The chat segments to format.
   * @param sequence The sequence the segments belong to.
   * @returns A string containing the formatted chat segments.
   */
  private formatAsPlainText(
    segments: ChatSegment[],
    sequence: ChatSequence
  ): string {
    return segments
      .map((segment) => {
        const timestamp = segment.metadata.timestamp
          ? new Date(segment.metadata.timestamp).toLocaleString()
          : "";
        const participants = segment.metadata.participants?.join(", ") || "";

        return [
          `[${timestamp}] ${participants}`,
          segment.content,
          "-".repeat(80),
        ].join("\n");
      })
      .join("\n\n");
  }

  /**
   * Format the given chat segments as Markdown.
  *
  * Each segment is formatted as a heading with a timestamp, followed by a
  * line with the participants, and then the segment's content indented by 4
  * spaces with triple-backtick delimiters.
  *
  * @param segments The chat segments to format.
  * @param sequence The sequence the segments belong to.
  * @returns A string containing the formatted chat segments.**/
  private formatAsMarkdown(
    segments: ChatSegment[],
    sequence: ChatSequence
  ): string {
    const lines = [
      `# Chat Export - ${sequence.sourceFile}`,
      `Generated on ${new Date().toLocaleString()}\n`,
    ];

    segments.forEach((segment) => {
      const timestamp = segment.metadata.timestamp
        ? new Date(segment.metadata.timestamp).toLocaleString()
        : "";
      const participants = segment.metadata.participants?.join(", ") || "";

      lines.push(
        `## ${timestamp}`,
        `**Participants:** ${participants}\n`,
        "```",
        segment.content,
        "```\n"
      );
    });

    return lines.join("\n");
  }

  /**
   * Format the given chat segments as HTML.
   *
   * Each segment is formatted as a `div.segment` element with two children:
   * a `div.metadata` element containing the timestamp and participants, and
   * a `div.content` element containing the segment's content.
   *
   * @param segments The chat segments to format.
   * @param sequence The sequence the segments belong to.
   * @returns A string containing the formatted chat segments.
   */
  private formatAsHtml(
    segments: ChatSegment[],
    sequence: ChatSequence
  ): string {
    const lines = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      '    <meta charset="utf-8">',
      "    <title>Chat Export</title>",
      "    <style>",
      "        body { font-family: sans-serif; max-width: 800px; margin: 2em auto; }",
      "        .segment { border: 1px solid #ccc; margin: 1em 0; padding: 1em; }",
      "        .metadata { color: #666; margin-bottom: 0.5em; }",
      "        .content { white-space: pre-wrap; }",
      "    </style>",
      "</head>",
      "<body>",
      `    <h1>Chat Export - ${sequence.sourceFile}</h1>`,
      `    <p>Generated on ${new Date().toLocaleString()}</p>`,
    ];

    segments.forEach((segment) => {
      const timestamp = segment.metadata.timestamp
        ? new Date(segment.metadata.timestamp).toLocaleString()
        : "";
      const participants = segment.metadata.participants?.join(", ") || "";

      lines.push(
        '    <div class="segment">',
        '        <div class="metadata">',
        `            <strong>Time:</strong> ${timestamp}<br>`,
        `            <strong>Participants:</strong> ${participants}`,
        "        </div>",
        '        <div class="content">',
        `            ${this.escapeHtml(segment.content)}`,
        "        </div>",
        "    </div>"
      );
    });

    lines.push("</body>", "</html>");
    return lines.join("\n");
  }

  /**
   * Format the given chat segments as JSON.
   *
   * The output is a JSON object with the following properties:
   * - `source`: the source file of the chat sequence.
   * - `generated`: the timestamp of when the export was generated.
   * - `segments`: an array of objects containing the segment's
   *   - `timestamp`: the timestamp of the segment.
   *   - `participants`: the participants in the segment.
   *   - `content`: the content of the segment.
   *   - `metadata`: the metadata of the segment.
   *
   * @param segments The chat segments to format.
   * @param sequence The sequence the segments belong to.
   * @returns A string containing the formatted chat segments as JSON.
   */
  private formatAsJson(
    segments: ChatSegment[],
    sequence: ChatSequence
  ): string {
    const export_data = {
      source: sequence.sourceFile,
      generated: new Date().toISOString(),
      segments: segments.map((segment) => ({
        timestamp: segment.metadata.timestamp,
        participants: segment.metadata.participants,
        content: segment.content,
        metadata: segment.metadata,
      })),
    };

    return JSON.stringify(export_data, null, 2);
  }
  
  /**
   * Escapes a string for use in HTML.
   * @param text The string to escape.
   * @returns The escaped string.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
