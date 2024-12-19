import {
  ChatMetadataImpl,
  SequenceMetadataImpl,
  SequenceMetadataOptions,
} from "../../../src/models/ChatMetadata";
import { ChatMetadata } from "../../../src/models/types";

describe("ChatMetadataImpl", () => {
  describe("Constructor", () => {
    const validOptions = {
      participants: ["Me", "Assistant"],
      length: 100,
      keywords: ["test"],
      timestamp: "2024-01-01",
      contentType: "text",
    };

    it("should create metadata with valid options", () => {
      const metadata = new ChatMetadataImpl(validOptions);
      expect(metadata).toBeDefined();
      expect(metadata.participants).toEqual(["Me", "Assistant"]);
      expect(metadata.length).toBe(100);
    });

    it("should throw error on invalid options", () => {
      expect(
        () => new ChatMetadataImpl({ ...validOptions, participants: [] })
      ).toThrow("Invalid participants");
      expect(
        () => new ChatMetadataImpl({ ...validOptions, length: -1 })
      ).toThrow("Invalid length");
    });
  });

  describe("Metadata Operations", () => {
    it("should merge metadata correctly", () => {
      const metadata1 = new ChatMetadataImpl({
        participants: ["Me"],
        length: 100,
        keywords: ["test1"],
        timestamp: "2024-01-01",
      });

      const metadata2 = new ChatMetadataImpl({
        participants: ["Assistant"],
        length: 200,
        keywords: ["test2"],
        timestamp: "2024-01-02",
      });

      const merged = metadata1.merge(metadata2);
      expect(merged.participants).toEqual(["Me", "Assistant"]);
      expect(merged.length).toBe(300);
      expect(merged.keywords).toEqual(["test1", "test2"]);
    });
  });
});

describe("SequenceMetadataImpl", () => {
  const defaultOptions: SequenceMetadataOptions = {
    filename: "test.log",
    size: 1024,
    lastModified: "2024-01-01",
    segmentCount: 2,
    totalLength: 100,
  };

  const mockSegments: ChatMetadata[] = [
    new ChatMetadataImpl({
      participants: ["Me"],
      length: 50,
      keywords: ["test1"],
    }),
    new ChatMetadataImpl({
      participants: ["Other"],
      length: 50,
      keywords: ["test2"],
    }),
  ];

  describe("Constructor", () => {
    test("initializes with required options", () => {
      const metadata = new SequenceMetadataImpl(defaultOptions);
      expect(metadata.sourceFile).toBe("test.log");
      expect(metadata.size).toBe(1024);
      expect(metadata.segmentCount).toBe(2);
      expect(metadata.length).toBe(100);
    });

    test("initializes empty arrays", () => {
      const metadata = new SequenceMetadataImpl(defaultOptions);
      expect(metadata.participants).toEqual([]);
      expect(metadata.keywords).toEqual([]);
    });

    test("validates options", () => {
      expect(
        () =>
          new SequenceMetadataImpl({
            ...defaultOptions,
            segmentCount: -1,
          })
      ).toThrow("Segment count cannot be negative");

      expect(
        () =>
          new SequenceMetadataImpl({
            ...defaultOptions,
            totalLength: -1,
          })
      ).toThrow("Total length cannot be negative");
    });
  });

  describe("withSegmentData", () => {
    test("aggregates segment metadata", () => {
      const metadata = new SequenceMetadataImpl(defaultOptions);
      const updated = metadata.withSegmentData(mockSegments);

      expect(updated.participants).toEqual(["Me", "Other"]);
      expect(updated.keywords).toEqual(["test1", "test2"]);
    });

    test("maintains sequence metadata", () => {
      const metadata = new SequenceMetadataImpl(defaultOptions);
      const updated = metadata.withSegmentData(mockSegments);

      expect(updated.sourceFile).toBe(metadata.sourceFile);
      expect(updated.size).toBe(metadata.size);
      expect(updated.segmentCount).toBe(metadata.segmentCount);
    });

    test("handles empty segments array", () => {
      const metadata = new SequenceMetadataImpl(defaultOptions);
      const updated = metadata.withSegmentData([]);

      expect(updated.participants).toEqual([]);
      expect(updated.keywords).toEqual([]);
    });
  });
});
