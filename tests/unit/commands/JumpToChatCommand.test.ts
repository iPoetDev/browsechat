import * as vscode from "vscode";
import { JumpToChatCommand } from "../../../src/commands/JumpToChatCommand";
import { DataModelManager } from "../../../src/models/DataModelManager";
import { ChatNavigationManager } from "../../../src/ui/ChatNavigationManager";
import {
  ChatSegment,
  ChatSequence,
  ChatMetadata,
} from "../../../src/models/types";
import { mockVSCode } from "../../mocks/vscode";

// Mock modules
jest.mock("../../../src/models/DataModelManager");
jest.mock("../../../src/ui/ChatNavigationManager");
jest.mock("vscode", () => mockVSCode);

interface QuickPickSegmentItem extends vscode.QuickPickItem {
  segment: ChatSegment;
  sequence: ChatSequence;
}

describe("JumpToChatCommand", () => {
  let jumpToChatCommand: JumpToChatCommand;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockNavigationManager: jest.Mocked<ChatNavigationManager>;
  let mockContext: vscode.ExtensionContext;
  let mockQuickPick: vscode.QuickPick<QuickPickSegmentItem>;

  const createMockSequence = (segments: ChatSegment[] = []): ChatSequence => ({
    id: "seq1",
    sourceFile: "test.log",
    segments,
    totalSegments: segments.length,
    metadata: {
      participants: ["User1", "User2"],
      length: 10,
      timestamp: "2024-12-16T21:19:16Z",
      sourceFile: "test.log",
      startTime: new Date("2024-12-16T21:19:16Z"),
      endTime: new Date("2024-12-16T21:19:26Z"),
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
      size: 1024,
      lastModified: "2024-01-01",
      segmentCount: 2,
    },
    withSegments(newSegments: ChatSegment[]): ChatSequence {
      return createMockSequence(newSegments);
    },
  });

  const createMockSegment = (
    overrides: Partial<ChatSegment> = {}
  ): ChatSegment => ({
    id: "seg1",
    sequenceId: "seq1",
    startIndex: 0,
    endIndex: 10,
    content: "Test chat content\nSecond line",
    timestamp: new Date("2024-12-16T21:15:18Z"),
    metadata: {
      timestamp: "2024-12-16T21:15:18Z",
      participants: ["User1", "User2"],
      length: 50,
      keywords: ["test", "chat"],
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
    ...overrides,
  });

  const createQuickPickItem = (
    segment: ChatSegment,
    sequence: ChatSequence
  ): QuickPickSegmentItem => ({
    label: `${segment.metadata.participants.join(", ")} - ${new Date(
      segment.metadata.timestamp!
    ).toLocaleString()}`,
    description: sequence.sourceFile,
    detail: segment.content,
    segment,
    sequence,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock data model
    mockDataModel = {
      getAllSequences: jest.fn().mockReturnValue([]),
      getSegments: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      dispose: jest.fn(),
      addSequence: jest.fn(),
      addSegment: jest.fn(),
      getSequence: jest.fn(),
      clear: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    } as any;

    // Setup mock navigation manager
    mockNavigationManager = {
      navigateToSegment: jest.fn().mockResolvedValue(undefined),
      showPreview: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Setup mock context
    mockContext = new mockVSCode.ExtensionContext();

    // Create command instance
    jumpToChatCommand = new JumpToChatCommand(
      mockDataModel,
      mockNavigationManager,
      mockContext
    );

    // Setup QuickPick mock
    mockQuickPick = {
      ...mockVSCode.window.createQuickPick(),
      onDidTriggerButton: jest.fn(),
      onDidAccept: jest.fn(),
      onDidHide: jest.fn(),
    } as any;
  });

  describe("Command Registration", () => {
    it("should register jump to chat commands", async () => {
      expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.jumpToChat",
        expect.any(Function)
      );
    });
  });

  describe("QuickPick Creation", () => {
    it("should create quick pick with correct configuration", async () => {
      await jumpToChatCommand.execute();

      expect(mockVSCode.window.createQuickPick).toHaveBeenCalled();
      expect(mockQuickPick.placeholder).toBe("Search chat segments...");
      expect(mockQuickPick.matchOnDescription).toBe(true);
      expect(mockQuickPick.matchOnDetail).toBe(true);
    });
  });

  describe("Execute Command", () => {
    it("should load segments and show quick pick", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      // Type-safe mock implementation
      mockDataModel.getAllSequences = jest.fn().mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      expect(mockDataModel.getAllSequences).toHaveBeenCalled();
      expect(mockDataModel.getSegments).toHaveBeenCalledWith("seq1");
      expect(mockQuickPick.show).toHaveBeenCalled();
    });

    it("should handle errors during execution", async () => {
      mockDataModel.getAllSequences.mockImplementation(() => {
        throw new Error("Test error");
      });

      await jumpToChatCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "Error loading chat segments: Test error"
      );
    });
  });

  describe("Segment Loading", () => {
    it("should create quick pick items with correct format", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      // Type-safe mock implementation
      mockDataModel.getAllSequences = jest.fn().mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      const expectedItem = {
        label: `${mockSeg.metadata.participants.join(", ")} - ${new Date(
          mockSeg.metadata.timestamp!
        ).toLocaleString()}`,
        description: mockSeq.sourceFile,
        detail: mockSeg.content,
        segment: mockSeg,
        sequence: mockSeq,
      };

      expect(mockQuickPick.items[0]).toEqual(expectedItem);
    });

    it("should handle segments without metadata", async () => {
      const segmentWithoutMetadata: ChatSegment = {
        id: "seg1",
        sequenceId: "seq1",
        startIndex: 0,
        endIndex: 10,
        content: "Test content",
        timestamp: new Date("2024-12-16T21:15:18Z"),
        metadata: {
          participants: ["User1"],
          length: 20,
          timestamp: "2024-12-16T21:15:18Z",
          merge: function (other: ChatMetadata): ChatMetadata {
            throw new Error("Function not implemented.");
          },
        },
      };

      const mockSeq = createMockSequence();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest
        .fn()
        .mockReturnValue([segmentWithoutMetadata]);

      await jumpToChatCommand.execute();
      expect(mockQuickPick.items[0]).toBeDefined();
    });
  });

  describe("Quick Pick Interaction", () => {
    it("should filter items based on search value", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      const onDidChangeValue = (mockQuickPick.onDidChangeValue as jest.Mock)
        .mock.calls[0][0];
      onDidChangeValue("test");

      expect(mockQuickPick.items.length).toBeGreaterThan(0);
    });

    it("should reload all items when search value is empty", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      const onDidChangeValue = (mockQuickPick.onDidChangeValue as jest.Mock)
        .mock.calls[0][0];
      onDidChangeValue("");

      expect(mockQuickPick.items.length).toBeGreaterThan(0);
    });

    it("should navigate to selected segment on accept", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      const onDidAccept = (mockQuickPick.onDidAccept as jest.Mock).mock
        .calls[0][0];
      mockQuickPick.selectedItems = [createQuickPickItem(mockSeg, mockSeq)];
      onDidAccept();

      expect(mockNavigationManager.navigateToSegment).toHaveBeenCalledWith(
        mockSeg
      );
      expect(mockQuickPick.hide).toHaveBeenCalled();
    });

    it("should handle navigation errors", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      mockNavigationManager.navigateToSegment.mockRejectedValue(
        new Error("Navigation error")
      );

      await jumpToChatCommand.execute();

      const onDidAccept = (mockQuickPick.onDidAccept as jest.Mock).mock
        .calls[0][0];
      mockQuickPick.selectedItems = [createQuickPickItem(mockSeg, mockSeq)];
      onDidAccept();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "Error navigating to segment: Navigation error"
      );
    });

    it("should show preview when preview button is clicked", async () => {
      const mockSeq = createMockSequence();
      const mockSeg = createMockSegment();
      mockDataModel.getAllSequences.mockReturnValue([mockSeq]);
      mockDataModel.getSegments = jest.fn().mockReturnValue([mockSeg]);

      await jumpToChatCommand.execute();

      const onDidTriggerButton = (mockQuickPick.onDidTriggerButton as jest.Mock)
        .mock.calls[0][0];
      mockQuickPick.selectedItems = [createQuickPickItem(mockSeg, mockSeq)];
      onDidTriggerButton({ iconPath: "preview" });

      expect(mockNavigationManager.showPreview).toHaveBeenCalledWith(mockSeg);
    });
  });

  describe("Cleanup", () => {
    it("should dispose quick pick on hide", async () => {
      await jumpToChatCommand.execute();

      const onDidHide = (mockQuickPick.onDidHide as jest.Mock).mock.calls[0][0];
      onDidHide();

      expect(mockQuickPick.dispose).toHaveBeenCalled();
    });

    it("should dispose quick pick when command is disposed", () => {
      jumpToChatCommand.dispose();
      expect(mockQuickPick.dispose).toHaveBeenCalled();
    });
  });
});
