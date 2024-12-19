import {
  DataModelManager,
  DataModelOptions,
} from "../../../src/models/DataModelManager";
import { ChatParser } from "../../../src/parser/ChatParser";
import { ChatSegment, ChatMetadata } from "../../../src/models/types";
import { DataModelEventType } from "../../../src/models/events";
import { mockFsPromises, MockStats } from "../../mocks/fs";

jest.mock("fs/promises", () => mockFsPromises);
jest.mock("../../../src/parser/ChatParser");

describe("DataModelManager", () => {
  let manager: DataModelManager;
  const mockParser = ChatParser as jest.Mocked<typeof ChatParser>;

  const defaultOptions: DataModelOptions = {
    maxFileSize: 10 * 1024 * 1024,
    chunkSize: 512 * 1024,
    parseTimeout: 5000,
  };

  const mockFilePath = "/test/chat.log";
  const mockTimestamp = new Date("2024-01-01");

  const mockSegment: ChatSegment = {
    id: "1",
    sequenceId: "sequence1",
    startIndex: 0,
    endIndex: 10,
    content: "test content",
    timestamp: mockTimestamp,
    metadata: {
      participants: ["Me"],
      length: 10,
      keywords: ["test"],
      timestamp: "2024-01-01",
      contentType: "text/plain",
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new DataModelManager(defaultOptions);

    // Setup mocks
    mockParser.prototype.parseFile = jest.fn().mockResolvedValue([mockSegment]);
    mockFsPromises.stat.mockResolvedValue(new MockStats(1000));
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("test content"));
  });

  describe("File Processing", () => {
    test("successfully processes valid log file", async () => {
      const sequence = await manager.processLogFile(mockFilePath);
      expect(sequence).toBeDefined();
      expect(sequence.sourceFile).toBe(mockFilePath);
      expect(sequence.segments.length).toBe(1);
    });

    test("handles file not found error", async () => {
      mockFsPromises.stat.mockRejectedValue(new Error("File not found"));
      await expect(manager.processLogFile(mockFilePath)).rejects.toThrow(
        "Failed to process log file"
      );
    });
  });

  describe("Segment Management", () => {
    test("creates segment with correct metadata", async () => {
      const sequence = await manager.processLogFile(mockFilePath);
      const segment = manager.getSegment(mockSegment.id);
      expect(segment?.metadata).toMatchObject({
        participants: ["Me"],
        length: 10,
        keywords: ["test"],
      });
    });

    test("gets sequence segments", async () => {
      const sequence = await manager.processLogFile(mockFilePath);
      const segments = manager.getSequenceSegments(sequence.id);
      expect(segments.length).toBe(1);
      expect(segments[0].id).toBe(mockSegment.id);
    });
  });

  describe("Event Handling", () => {
    test("emits sequence created event", async () => {
      const eventListener = jest.fn();
      manager.on(DataModelEventType.SequenceCreated, eventListener);
      await manager.processLogFile(mockFilePath);
      expect(eventListener).toHaveBeenCalled();
    });

    test("emits segment created event", async () => {
      const segmentListener = jest.fn();
      manager.on(DataModelEventType.SegmentCreated, segmentListener);
      await manager.processLogFile(mockFilePath);
      expect(segmentListener).toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    test("gets next and previous segments", async () => {
      const mockSegment2: ChatSegment = {
        ...mockSegment,
        id: "segment2",
        startIndex: 11,
        endIndex: 20,
      };

      mockParser.prototype.parseFile = jest
        .fn()
        .mockResolvedValue([mockSegment, mockSegment2]);
      await manager.processLogFile(mockFilePath);

      const nextSegment = manager.getNextSegment(mockSegment.id);
      expect(nextSegment?.id).toBe("segment2");

      const prevSegment = manager.getPreviousSegment(mockSegment2.id);
      expect(prevSegment?.id).toBe(mockSegment.id);
    });

    test("returns null for non-existent segments", () => {
      const nextSegment = manager.getNextSegment("non-existent");
      expect(nextSegment).toBeNull();

      const prevSegment = manager.getPreviousSegment("non-existent");
      expect(prevSegment).toBeNull();
    });
  });
});
