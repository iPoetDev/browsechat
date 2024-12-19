import {
  ChatSegmentImpl,
  ChatSegmentOptions,
} from "../../../src/models/ChatSegment";
import { createMockMetadata } from "../../mocks/metadata";

describe("ChatSegmentImpl", () => {
  // Mock crypto.randomUUID for consistent testing
  const mockUUID = "12345678-1234-1234-1234-123456789012";
  global.crypto = {
    ...global.crypto,
    randomUUID: jest.fn().mockReturnValue(mockUUID),
  };

  const mockMetadata = createMockMetadata(["Me"], 10, ["test"]);
  const defaultOptions: ChatSegmentOptions = {
    sequenceId: "sequence1",
    order: 1,
    startTime: new Date("2024-01-01T00:00:00Z"),
    endTime: new Date("2024-01-01T00:01:00Z"),
  };

  describe("Constructor", () => {
    test("initializes with valid parameters", () => {
      const segment = new ChatSegmentImpl(
        "Me: Hello",
        0,
        10,
        mockMetadata,
        defaultOptions
      );

      expect(segment.id).toBe(mockUUID);
      expect(segment.sequenceId).toBe("sequence1");
      expect(segment.startIndex).toBe(0);
      expect(segment.endIndex).toBe(10);
      expect(segment.content).toBe("Me: Hello");
      expect(segment.order).toBe(1);
    });

    test("validates content format", () => {
      expect(
        () =>
          new ChatSegmentImpl(
            "Invalid content",
            0,
            10,
            mockMetadata,
            defaultOptions
          )
      ).toThrow('Segment must start with "Me" keyword');

      expect(
        () => new ChatSegmentImpl("", 0, 10, mockMetadata, defaultOptions)
      ).toThrow("Segment content cannot be empty");
    });

    test("validates segment boundaries", () => {
      expect(
        () =>
          new ChatSegmentImpl("Me: Hello", 10, 5, mockMetadata, defaultOptions)
      ).toThrow("End index must be greater than start index");

      expect(
        () =>
          new ChatSegmentImpl("Me: Hello", -1, 10, mockMetadata, defaultOptions)
      ).toThrow("Start index cannot be negative");
    });

    test("handles optional order parameter", () => {
      const segment = new ChatSegmentImpl("Me: Hello", 0, 10, mockMetadata, {
        sequenceId: "sequence1",
      });
      expect(segment.order).toBe(-1);
    });
  });

  describe("Content and Metadata", () => {
    test("sanitizes content", () => {
      const segment = new ChatSegmentImpl(
        "Me: Hello\\nWorld",
        0,
        15,
        mockMetadata,
        defaultOptions
      );
      expect(segment.content).toBe("Me: Hello\nWorld");
    });

    test("clones metadata for immutability", () => {
      const segment = new ChatSegmentImpl(
        "Me: Hello",
        0,
        10,
        mockMetadata,
        defaultOptions
      );
      const metadata = segment.metadata;
      expect(metadata.keywords).toBeDefined();
      if (metadata.keywords) {
        metadata.keywords.push("new");
        expect(segment.metadata.keywords).toEqual(["test"]);
      }
    });
  });

  describe("Segment Operations", () => {
    test("detects overlapping segments", () => {
      const segment1 = new ChatSegmentImpl(
        "Me: Hello",
        0,
        10,
        mockMetadata,
        defaultOptions
      );
      const segment2 = new ChatSegmentImpl(
        "Me: World",
        5,
        15,
        mockMetadata,
        defaultOptions
      );
      const segment3 = new ChatSegmentImpl(
        "Me: Later",
        20,
        30,
        mockMetadata,
        defaultOptions
      );

      expect(segment1.overlaps(segment2)).toBe(true);
      expect(segment1.overlaps(segment3)).toBe(false);
    });

    test("checks index containment", () => {
      const segment = new ChatSegmentImpl(
        "Me: Hello",
        10,
        20,
        mockMetadata,
        defaultOptions
      );

      expect(segment.containsIndex(15)).toBe(true);
      expect(segment.containsIndex(5)).toBe(false);
      expect(segment.containsIndex(25)).toBe(false);
    });

    test("creates new segment with updated order", () => {
      const segment = new ChatSegmentImpl(
        "Me: Hello",
        0,
        10,
        mockMetadata,
        defaultOptions
      );
      const updated = segment.withOrder(2);

      expect(updated.order).toBe(2);
      expect(updated).not.toBe(segment);
      expect(updated.content).toBe(segment.content);
      expect(updated.startIndex).toBe(segment.startIndex);
    });
  });

  describe("Static Factory Methods", () => {
    test("creates segment from log content", () => {
      const segment = ChatSegmentImpl.fromLogContent(
        "Me: Hello [timestamp: 2024-01-01]",
        0,
        30,
        mockMetadata,
        defaultOptions
      );

      expect(segment.content).toBe("Me: Hello [timestamp: 2024-01-01]");
      expect(segment.startIndex).toBe(0);
      expect(segment.endIndex).toBe(30);
      expect(segment.metadata).toBeDefined();
    });
  });
});
