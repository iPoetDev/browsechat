import { ChatSequenceImpl } from "../../../src/models/ChatSequence";
import { ChatSegment } from "../../../src/models/types";
import { createMockMetadata } from "../../mocks/metadata";

describe("ChatSequenceImpl", () => {
  // Mock crypto.randomUUID for consistent testing
  const mockUUID = "12345678-1234-1234-1234-123456789012";
  global.crypto = {
    ...global.crypto,
    randomUUID: jest.fn().mockReturnValue(mockUUID),
  };

  // Mock segment factory
  const createMockSegment = (
    startIndex: number,
    content: string = "Me: Test",
    keywords: string[] = [],
    participants: string[] = ["Me"]
  ): ChatSegment => ({
    id: `segment-${startIndex}`,
    sequenceId: mockUUID,
    startIndex,
    endIndex: startIndex + content.length,
    content,
    metadata: createMockMetadata(participants, content.length, keywords),
    timestamp: new Date(),
  });

  describe("Constructor", () => {
    test("initializes with empty segments", () => {
      const sequence = new ChatSequenceImpl("test.log");
      expect(sequence.id).toBe(mockUUID);
      expect(sequence.sourceFile).toBe("test.log");
      expect(sequence.segments).toHaveLength(0);
      expect(sequence.totalSegments).toBe(0);
    });

    test("initializes with initial segments", () => {
      const segments = [createMockSegment(0), createMockSegment(10)];
      const sequence = new ChatSequenceImpl("test.log", segments);
      expect(sequence.segments).toHaveLength(2);
      expect(sequence.totalSegments).toBe(2);
    });

    test("creates immutable segment array", () => {
      const sequence = new ChatSequenceImpl("test.log");
      const segments = sequence.segments;
      expect(() => segments.push(createMockSegment(0))).toThrow();
    });
  });

  describe("Segment Management", () => {
    test("adds segments in order", () => {
      const sequence = new ChatSequenceImpl("test.log");
      const segments = [
        createMockSegment(10),
        createMockSegment(0),
        createMockSegment(5),
      ];

      sequence.addSegments(segments);
      const orderedSegments = sequence.segments;

      expect(orderedSegments[0].startIndex).toBe(0);
      expect(orderedSegments[1].startIndex).toBe(5);
      expect(orderedSegments[2].startIndex).toBe(10);
    });

    test("validates overlapping segments", () => {
      const sequence = new ChatSequenceImpl("test.log");
      const segments = [
        createMockSegment(0, "Me: Hello", [], ["Me"]),
        createMockSegment(5, "Me: World", [], ["Me"]),
      ];

      expect(() => sequence.addSegments(segments)).toThrow(
        "Segments cannot overlap"
      );
    });

    test("gets segment by index", () => {
      const segments = [createMockSegment(0), createMockSegment(10)];
      const sequence = new ChatSequenceImpl("test.log", segments);

      const segment = sequence.getSegment(0);
      expect(segment).toBeDefined();
      expect(segment?.startIndex).toBe(0);

      const invalidSegment = sequence.getSegment(2);
      expect(invalidSegment).toBeUndefined();
    });
  });

  describe("Search Operations", () => {
    const segments = [
      createMockSegment(0, "Me: Hello", ["greeting"], ["Me"]),
      createMockSegment(10, "Me: World", ["world"], ["Me"]),
      createMockSegment(20, "Other: Hi", ["greeting"], ["Other"]),
    ];
    let sequence: ChatSequenceImpl;

    beforeEach(() => {
      sequence = new ChatSequenceImpl("test.log", segments);
    });

    test("finds segments by keywords", () => {
      const greetingSegments = sequence.findSegmentsByKeywords(["greeting"]);
      expect(greetingSegments).toHaveLength(2);
      expect(greetingSegments[0].content).toBe("Me: Hello");
      expect(greetingSegments[1].content).toBe("Other: Hi");

      const worldSegments = sequence.findSegmentsByKeywords(["world"]);
      expect(worldSegments).toHaveLength(1);
      expect(worldSegments[0].content).toBe("Me: World");
    });

    test("finds segments by participant", () => {
      const meSegments = sequence.findSegmentsByParticipant("Me");
      expect(meSegments).toHaveLength(2);

      const otherSegments = sequence.findSegmentsByParticipant("Other");
      expect(otherSegments).toHaveLength(1);
      expect(otherSegments[0].content).toBe("Other: Hi");
    });

    test("handles case-insensitive search", () => {
      const meSegments = sequence.findSegmentsByParticipant("me");
      expect(meSegments).toHaveLength(2);

      const greetingSegments = sequence.findSegmentsByKeywords(["GREETING"]);
      expect(greetingSegments).toHaveLength(2);
    });
  });

  describe("Sequence Operations", () => {
    test("creates new sequence with updated segments", () => {
      const originalSequence = new ChatSequenceImpl("test.log");
      const newSegments = [createMockSegment(0), createMockSegment(10)];

      const updatedSequence = originalSequence.withSegments(newSegments);

      expect(updatedSequence).not.toBe(originalSequence);
      expect(updatedSequence.segments).toHaveLength(2);
      expect(updatedSequence.sourceFile).toBe(originalSequence.sourceFile);
    });

    test("maintains metadata after updates", () => {
      const sequence = new ChatSequenceImpl("test.log");
      const segments = [
        createMockSegment(0, "Me: Hello", ["greeting"], ["Me"]),
        createMockSegment(10, "Other: Hi", ["greeting"], ["Other"]),
      ];

      sequence.addSegments(segments);
      const metadata = sequence.metadata;

      expect(metadata.participants).toContain("Me");
      expect(metadata.participants).toContain("Other");
      expect(metadata.keywords).toContain("greeting");
      expect(metadata.sourceFile).toBe("test.log");
    });
  });
});
