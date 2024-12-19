import * as vscode from "vscode";
import { SyntaxHighlighter } from "../../../src/ui/SyntaxHighlighter";
import hljs from "highlight.js";

// Mock vscode module
jest.mock("vscode", () => ({
  window: {
    activeColorTheme: {
      kind: 1, // Dark theme
    },
    onDidChangeActiveColorTheme: jest.fn().mockImplementation((callback) => {
      return { dispose: jest.fn() };
    }),
  },
  ColorThemeKind: {
    Dark: 1,
    Light: 2,
    HighContrast: 3,
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  ThemeColor: jest.fn().mockImplementation((id) => ({
    toString: () => "#000000",
  })),
}));

jest.mock("highlight.js", () => ({
  highlight: jest.fn(),
  highlightAuto: jest.fn(),
}));

describe("SyntaxHighlighter", () => {
  let highlighter: SyntaxHighlighter;
  let mockThemeColors: any;
  let mockConfiguration: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock theme colors
    mockThemeColors = {
      background: "#1e1e1e",
      foreground: "#d4d4d4",
      timestamp: "#858585",
      codeBackground: "#1e1e1e",
      codeForeground: "#d4d4d4",
      participants: {},
    };

    // Mock vscode.workspace.getConfiguration
    mockConfiguration = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case "workbench.colorCustomizations.editor.background":
            return mockThemeColors.background;
          case "workbench.colorCustomizations.editor.foreground":
            return mockThemeColors.foreground;
          case "workbench.colorCustomizations.editorLineNumber.foreground":
            return mockThemeColors.timestamp;
          default:
            return undefined;
        }
      }),
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfiguration
    );

    // Mock highlight.js
    (hljs.highlight as jest.Mock).mockReturnValue({
      value: '<span class="hljs-keyword">const</span>',
    });
    (hljs.highlightAuto as jest.Mock).mockReturnValue({
      value: '<span class="hljs-string">test</span>',
    });

    // Create highlighter instance
    highlighter = new SyntaxHighlighter();
  });

  describe("Theme Management", () => {
    it("should initialize with theme colors", () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
      expect((highlighter as any).themeColors).toBeDefined();
    });

    it("should update colors on theme change", () => {
      const listener = (vscode.window.onDidChangeActiveColorTheme as jest.Mock)
        .mock.calls[0][0];
      mockThemeColors.background = "#ffffff";
      listener();
      expect((highlighter as any).themeColors.background).toBe("#ffffff");
    });
  });

  describe("Content Highlighting", () => {
    it("should escape HTML special characters", () => {
      const input = "<div>&test</div>";
      const result = (highlighter as any).escapeHtml(input);
      expect(result).toBe("&lt;div&gt;&amp;test&lt;/div&gt;");
    });

    it("should highlight code blocks with language", () => {
      const input = '```typescript\nconst test = "hello";\n```';
      const result = (highlighter as any).highlightCodeBlocks(input);
      expect(result).toContain('class="code-block"');
      expect(result).toContain('class="code-lang"');
      expect(hljs.highlight).toHaveBeenCalledWith('const test = "hello";', {
        language: "typescript",
        ignoreIllegals: true,
      });
    });

    it("should highlight code blocks without language", () => {
      const input = "```\ntest\n```";
      const result = (highlighter as any).highlightCodeBlocks(input);
      expect(result).toContain('class="code-block"');
      expect(hljs.highlightAuto).toHaveBeenCalledWith("test");
    });

    it("should handle code block highlighting errors", () => {
      (hljs.highlight as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Test error");
      });
      const input = "```typescript\ntest\n```";
      const result = (highlighter as any).highlightCodeBlocks(input);
      expect(result).toContain("test");
      expect(result).not.toContain("hljs-keyword");
    });

    it("should highlight participants", () => {
      const input = "User: Hello\nAssistant: Hi";
      const participants = ["User", "Assistant"];
      const result = (highlighter as any).highlightParticipants(
        input,
        participants
      );
      expect(result).toContain('class="participant"');
      expect(result).toContain('style="color: ');
    });

    it("should highlight timestamps", () => {
      const input = "2024-01-01T12:34:56.789Z";
      const result = (highlighter as any).highlightTimestamps(input);
      expect(result).toContain('class="timestamp"');
      expect(result).toContain(`color: ${mockThemeColors.timestamp}`);
    });

    it("should generate consistent participant colors", () => {
      const participant = "User";
      const color1 = (highlighter as any).generateParticipantColor(participant);
      const color2 = (highlighter as any).generateParticipantColor(participant);
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^hsl\(\d+, 70%, 45%\)$/);
    });
  });

  describe("Style Generation", () => {
    it("should generate CSS styles", () => {
      const styles = highlighter.getStyles();
      expect(styles).toContain(".code-block");
      expect(styles).toContain(".participant");
      expect(styles).toContain(".timestamp");
      expect(styles).toContain(".hljs");
    });

    it("should include highlight.js styles", () => {
      const styles = (highlighter as any).getHljsStyles();
      expect(styles).toContain(".hljs-keyword");
      expect(styles).toContain(".hljs-string");
      expect(styles).toContain(".hljs-number");
      expect(styles).toContain(".hljs-comment");
    });
  });

  describe("Full Content Processing", () => {
    it("should process content with all features", () => {
      const input = `2024-01-01T12:00:00Z
User: Here's some code:
\`\`\`typescript
const test = "hello";
\`\`\`
Assistant: Let me check that.`;

      const participants = ["User", "Assistant"];
      const result = highlighter.highlightContent(input, participants);

      expect(result).toContain('class="timestamp"');
      expect(result).toContain('class="participant"');
      expect(result).toContain('class="code-block"');
      expect(result).toContain('class="hljs-');
    });

    it("should handle empty content", () => {
      const result = highlighter.highlightContent("", []);
      expect(result).toBe("");
    });

    it("should handle content with no special elements", () => {
      const result = highlighter.highlightContent("Plain text", []);
      expect(result).toBe("Plain text");
    });
  });

  describe("Regular Expression Safety", () => {
    it("should escape regex special characters", () => {
      const input = "User.*+?^${}()|[]\\";
      const escaped = (highlighter as any).escapeRegExp(input);
      expect(escaped).toBe("User\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    it("should safely highlight participants with special characters", () => {
      // Mock theme colors for participant highlighting
      mockThemeColors = {
        ...mockThemeColors,
        participants: {},
      };

      // Create a new instance with mocked colors
      highlighter = new SyntaxHighlighter();

      const input = "User.* says hi";
      const participants = ["User.*"];

      // First highlight to ensure participant color is generated
      const result = highlighter.highlightContent(input, participants);

      // The participant should be wrapped in a span with color
      expect(result).toContain('<span class="participant"');
      expect(result).toContain('style="color: hsl(');
      expect(result).toContain("User.*");
      expect(result).toContain("says hi");
    });
  });
});
