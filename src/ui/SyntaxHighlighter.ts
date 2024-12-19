import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import hljs from 'highlight.js';

/**
 * Interface for the theme colors used in the SyntaxHighlighter class.
 *
 * @interface ThemeColors
 * @typedef {ThemeColors}
 * 
 * @property {string} background
 * @property {string} foreground
 * @property {{ [key: string]: string }} participants
 * @property {string} timestamp
 * @property {string} codeBackground
 * @property {string} codeForeground
 */
interface ThemeColors {
    background: string;
    foreground: string;
    participants: { [key: string]: string };
    timestamp: string;
    codeBackground: string;
    codeForeground: string;
}

/**
 * SyntaxHighlighter class for highlighting chat content with code blocks, participants, and timestamps.
 *
 * 
 * @class SyntaxHighlighter
 * @typedef {SyntaxHighlighter}
 * 
 * @property {ThemeColors} themeColors
 * @property {Map<string, string>} participantColorMap
 * @property {TextDecoder} decoder
 * 
 *  Constructor: Initializes the SyntaxHighlighter instance with theme colors and sets up a listener for theme changes.
 *  setupThemeListener: Sets up a listener to update the theme colors when the active color theme changes.
 *  getThemeColors: Returns the current theme colors based on the active color theme and color customizations.
 *  highlightContent: Highlights the content of a chat segment by escaping HTML, highlighting code blocks, participants, and timestamps.
 *  escapeHtml: Escapes special characters in HTML to prevent XSS attacks.
 *  highlightCodeBlocks: Highlights code blocks using the highlight.js library and wraps them in a HTML structure with a copy button.
 *  wrapHighlightedCode: Wraps highlighted code in a HTML structure with a copy button.
 *  highlightParticipants: Highlights participant names in the content by replacing them with a span element with a generated color.
 *  highlightTimestamps: Highlights timestamps in the content by replacing them with a span element with a specific color.
 *  generateParticipantColor: Generates a deterministic color for a participant based on their name.
 *  escapeRegExp: Escapes special characters in a string to use in a regular expression.
 *  getStyles: Returns the CSS styles for the highlighted content, including code blocks, participants, and timestamps.
 *  getHljsStyles: Returns the CSS styles for highlighted code blocks using the highlight.js library.
 */
export class SyntaxHighlighter {
    private themeColors: ThemeColors;
    private participantColorMap: Map<string, string> = new Map();
    private readonly decoder = new TextDecoder();

    /**
     * Creates an instance of SyntaxHighlighter.
     *
     * 
     */
    constructor() {
        this.themeColors = this.getThemeColors();
        this.setupThemeListener();
    }

    /**
     * Sets up a listener to update the theme colors when the active color theme changes.
     *
     * @private
     */
    private setupThemeListener() {
        vscode.window.onDidChangeActiveColorTheme(() => {
            this.themeColors = this.getThemeColors();
        });
    }

    /**
     *  Gets the current theme colors based on the active color theme and color customizations.
     *
     * @private
     * @returns {ThemeColors} The current theme colors.
     */
    private getThemeColors(): ThemeColors {
        const theme = vscode.window.activeColorTheme;
        const getColor = (id: string) => {
            const color = vscode.workspace.getConfiguration().get<string>(`workbench.colorCustomizations.${id}`);
            if (color) {
                return color;
            }
            
            const defaultColor = new vscode.ThemeColor(id);
            return defaultColor.toString();
        };

        return {
            background: getColor('editor.background'),
            foreground: getColor('editor.foreground'),
            participants: {},
            timestamp: getColor('editorLineNumber.foreground'),
            codeBackground: getColor('editor.background'),
            codeForeground: getColor('editor.foreground')
        };
    }

    /**
     * Highlights the content of a chat segment by escaping HTML, highlighting code blocks, participants, and timestamps.
     *
     * @public
     * @param {string} content
     * @param {string[]} participants
     * @returns {string} The content with highlighting applied.
     */
    public highlightContent(content: string, participants: string[]): string {
        let highlighted = this.escapeHtml(content);

        // Highlight code blocks
        highlighted = this.highlightCodeBlocks(highlighted);

        // Highlight participants
        highlighted = this.highlightParticipants(highlighted, participants);

        // Highlight timestamps
        highlighted = this.highlightTimestamps(highlighted);

        return highlighted;
    }

    /**
     * Escapes special characters in a string to use in a regular expression.
     *
     * @private
     * @param {string} text
     * @returns {string} The escaped text.
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Highlights code blocks in the content by wrapping them in a pre element with a specific background color.
     *
     * @private
     * @param {string} content
     * @returns {string} The content with code blocks highlighted.
     */
    private highlightCodeBlocks(content: string): string {
        const codeBlockRegex = /\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g;
        return content.replace(codeBlockRegex, (match, lang, code) => {
            try {
                const highlighted = lang
                    ? hljs.highlight(code.trim(), { language: lang, ignoreIllegals: true })
                    : hljs.highlightAuto(code.trim());

                return this.wrapHighlightedCode(highlighted.value);
            } catch (error) {
                console.error('Error highlighting code:', error);
                return this.wrapHighlightedCode(code);
            }
        });
    }

    
    /**
     * Highlights code blocks in the content by wrapping them in a pre element with a specific background color.
     *
     * @private
     * @param {string} code
     * @returns {string} The code block with highlighting applied.
     */
    private wrapHighlightedCode(code: string): string {
        return `<pre class="code-block" style="background-color: ${this.themeColors.codeBackground}">
            <div class="code-header">
                <span class="code-lang">plaintext</span>
                <button class="copy-button" onclick="copyCode(this)">Copy</button>
            </div>
            <code class="language-plaintext">${code}</code>
        </pre>`;
    }

    /**
     * Highlights participant names in the content by replacing them with a span element with a generated color.
     *
     * @private
     * @param {string} content
     * @param {string[]} participants
     * @returns {string} The content with participants highlighted.
     */
    private highlightParticipants(content: string, participants: string[]): string {
        participants.forEach(participant => {
            if (!this.participantColorMap.has(participant)) {
                this.participantColorMap.set(participant, this.generateParticipantColor(participant));
            }
            const color = this.participantColorMap.get(participant)!;
            const regex = new RegExp(`\\b${this.escapeRegExp(participant)}\\b`, 'g');
            content = content.replace(regex, `<span class="participant" style="color: ${color}">$&</span>`);
        });
        return content;
    }

    /**
     * Highlights timestamps in the content by replacing them with a span element with a specific color.
     *
     * @private
     * @param {string} content
     * @returns {string} The content with timestamps highlighted.
     */
    private highlightTimestamps(content: string): string {
        const timestampRegex = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?\b/g;
        return content.replace(timestampRegex, 
            `<span class="timestamp" style="color: ${this.themeColors.timestamp}">$&</span>`);
    }

    /**
     * Generates a deterministic color for a participant based on their name.
     *
     * @private
     * @param {string} participant
     * @returns {string} The generated color in HSL format.
     */
    private generateParticipantColor(participant: string): string {
        // Generate a deterministic color based on participant name
        let hash = 0;
        for (let i = 0; i < participant.length; i++) {
            hash = participant.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Convert to HSL for better control over brightness and saturation
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 45%)`; // Fixed saturation and lightness for readability
    }

    /**
     * Escapes special characters in a string to use in a regular expression.
     *
     * @private
     * @param {string} string
     * @returns {string} The escaped string.
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Returns the CSS styles for the highlighted content, including code blocks, participants, and timestamps.
     *
     * @public
     * @returns {string} The CSS styles.
     */
    public getStyles(): string {
        return `
            .code-block {
                margin: 1em 0;
                padding: 1em;
                border-radius: 4px;
                overflow: auto;
            }

            .code-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5em;
                padding-bottom: 0.5em;
                border-bottom: 1px solid ${this.themeColors.timestamp};
            }

            .code-lang {
                color: ${this.themeColors.timestamp};
                font-size: 0.9em;
            }

            .copy-button {
                background: transparent;
                border: 1px solid ${this.themeColors.timestamp};
                color: ${this.themeColors.foreground};
                padding: 2px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.9em;
            }

            .copy-button:hover {
                background: ${this.themeColors.codeBackground};
            }

            .participant {
                font-weight: bold;
            }

            .timestamp {
                font-style: italic;
            }

            ${this.getHljsStyles()}
        `;
    }

    /**
     * Returns the CSS styles for highlighted code blocks using the highlight.js library.
     *
     * @private
     * @returns {string} The CSS styles.
     */
    private getHljsStyles(): string {
        return `
            .hljs {
                color: ${this.themeColors.codeForeground};
                background: transparent;
            }

            .hljs-keyword { color: #569CD6; }
            .hljs-string { color: #CE9178; }
            .hljs-number { color: #B5CEA8; }
            .hljs-comment { color: #6A9955; }
            .hljs-function { color: #DCDCAA; }
            .hljs-class { color: #4EC9B0; }
            .hljs-variable { color: #9CDCFE; }
            .hljs-operator { color: #D4D4D4; }
        `;
    }
}
