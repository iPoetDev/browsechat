import * as vscode from "vscode";
import { SearchManager } from "../../../src/ui/SearchManager";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatMetadata,
  ChatSegment,
  ChatSequence,
} from "../../../src/models/types";

jest.mock("vscode");

describe("SearchManager", () => {
  let searchManager: SearchManager;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockContext: vscode.ExtensionContext;
  let mockCancellationToken: vscode.CancellationToken;
  let mockSequences: ChatSequence[];
  let mockSegments: ChatSegment[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock segments
    const mockSegment1: ChatSegment = {
      id: "segment1",
      sequenceId: "seq1",
      content: "Test content with some keywords",
      startIndex: 0,
      endIndex: 34,
      metadata: {
        participants: ["User", "Assistant"],
        keywords: ["test"],
        timestamp: "2024-01-01",
        length: 34,
        merge: function (other: ChatMetadata): ChatMetadata {
          throw new Error("Function not implemented.");
        },
      },
      timestamp: new Date(),
    };

    const mockSegment2: ChatSegment = {
      id: "segment2",
      sequenceId: "seq1",
      content: "Another test segment with different content",
      startIndex: 34,
      endIndex: 73,
      metadata: {
        participants: ["User", "Bot"],
        keywords: ["test"],
        timestamp: "2024-01-02",
        length: 39,
        contentType: "text/plain",
        merge: jest.fn(),
      },
      timestamp: new Date(),
    };

    mockSegments = [mockSegment1, mockSegment2];

    // Mock sequences
    mockSequences = [
      {
        id: "seq1",
        sourceFile: "test.log",
        segments: mockSegments,
        totalSegments: 2,
        metadata: {
          participants: ["User", "Assistant", "Bot"],
          keywords: ["test"],
          length: 73,
          sourceFile: "test.log",
          size: 0,
          lastModified: "",
          segmentCount: 0,
          merge: function (other: ChatMetadata): ChatMetadata {
            throw new Error("Function not implemented.");
          },
        },
        withSegments: function (newSegments: ChatSegment[]): ChatSequence {
          return {
            ...this,
            segments: newSegments,
            totalSegments: newSegments.length,
          };
        },
      },
    ];

    // Mock DataModelManager
    mockDataModel = {
      getAllSequences: jest.fn().mockReturnValue(mockSequences),
    } as unknown as jest.Mocked<DataModelManager>;

    // Mock ExtensionContext
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock CancellationToken
    mockCancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    };

    // Mock VSCode window
    (vscode.window.showInputBox as jest.Mock).mockResolvedValue("test query");

    // Create search manager instance
    searchManager = new SearchManager(mockDataModel, mockContext);
  });

  describe("Command Registration", () => {
    it("should register all search commands", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.search.showPanel",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.search.nextMatch",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.search.previousMatch",
        expect.any(Function)
      );
    });
  });

  describe("Search Functionality", () => {
    it("should perform basic text search", async () => {
      const results = await searchManager.search(
        "test",
        {},
        mockCancellationToken
      );

      expect(results).toHaveLength(2);
      expect(results[0].segment.id).toBe("segment1");
      expect(results[1].segment.id).toBe("segment2");
      expect(results[0].matches).toHaveLength(1);
      expect(results[1].matches).toHaveLength(1);
    });

    it("should respect case sensitivity", async () => {
      const results = await searchManager.search(
        "TEST",
        { caseSensitive: true },
        mockCancellationToken
      );
      expect(results).toHaveLength(0);

      const insensitiveResults = await searchManager.search(
        "TEST",
        { caseSensitive: false },
        mockCancellationToken
      );
      expect(insensitiveResults).toHaveLength(2);
    });

    it("should handle whole word search", async () => {
      const results = await searchManager.search(
        "test",
        { wholeWord: true },
        mockCancellationToken
      );
      expect(results).toHaveLength(2);

      const noResults = await searchManager.search(
        "tes",
        { wholeWord: true },
        mockCancellationToken
      );
      expect(noResults).toHaveLength(0);
    });

    it("should support regex search", async () => {
      const results = await searchManager.search(
        "test\\s\\w+",
        { useRegex: true },
        mockCancellationToken
      );
      expect(results).toHaveLength(2);
    });

    it("should filter by time range", async () => {
      const results = await searchManager.search(
        "test",
        {
          timeRange: {
            start: new Date("2024-01-01"),
            end: new Date("2024-01-01"),
          },
        },
        mockCancellationToken
      );

      expect(results).toHaveLength(1);
      expect(results[0].segment.id).toBe("segment1");
    });

    it("should filter by participants", async () => {
      const results = await searchManager.search(
        "test",
        {
          participants: ["Bot"],
        },
        mockCancellationToken
      );

      expect(results).toHaveLength(1);
      expect(results[0].segment.id).toBe("segment2");
    });
  });

  describe("Search Token Management", () => {
    it("should generate unique search tokens", () => {
      const token1 = (searchManager as any).generateSearchToken();
      const token2 = (searchManager as any).generateSearchToken();
      expect(token1).not.toBe(token2);
    });

    it("should store results with current token", async () => {
      await searchManager.search("test", {}, mockCancellationToken);
      const results = searchManager.getSearchResults();
      expect(results).toHaveLength(2);
    });

    it("should clear search results", async () => {
      await searchManager.search("test", {}, mockCancellationToken);
      searchManager.clearSearch();
      const results = searchManager.getSearchResults();
      expect(results).toHaveLength(0);
    });
  });

  describe("Search Panel", () => {
    it("should show search input box", async () => {
      await (searchManager as any).showSearchPanel();
      expect(vscode.window.showInputBox).toHaveBeenCalledWith({
        placeHolder: "Search in chat logs...",
        prompt: "Enter search query",
      });
    });

    it("should not search if input is cancelled", async () => {
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(
        undefined
      );
      await (searchManager as any).showSearchPanel();
      expect(mockDataModel.getAllSequences).not.toHaveBeenCalled();
    });
  });

  describe("Search Cancellation", () => {
    it("should respect cancellation token", async () => {
      const cancelToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(),
      };

      const results = await searchManager.search("test", {}, cancelToken);
      expect(results).toHaveLength(0);
    });
  });

  describe("Regular Expression Handling", () => {
    it("should escape special characters in non-regex mode", () => {
      const escaped = (searchManager as any).escapeRegExp(
        "test.*+?^${}()|[]\\"
      );
      expect(escaped).toBe("test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    it("should handle invalid regex patterns", async () => {
      const results = await searchManager.search(
        "[invalid",
        { useRegex: true },
        mockCancellationToken
      );
      expect(results).toHaveLength(0);
    });
  });
});
