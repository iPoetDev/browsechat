// tests/parser/MetadataExtractor.test.ts
import { MetadataExtractor } from "../../../src/parser/MetadataExtractor";

describe("MetadataExtractor", () => {
  let extractor: MetadataExtractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  describe("extract", () => {
    test("extracts all metadata components", () => {
      const content =
        "Me: Hello #greeting\nOther: Hi\nMe: How are you? #question";
      const metadata = extractor.extract(content);

      expect(metadata).toHaveProperty("participants");
      expect(metadata).toHaveProperty("length");
      expect(metadata).toHaveProperty("keywords");
      expect(metadata.length).toBe(content.length);
    });

    test("returns empty arrays for content without metadata", () => {
      const content = "Plain text without any special formatting";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toEqual([]);
      expect(metadata.keywords).toEqual([]);
      expect(metadata.length).toBe(content.length);
    });
  });

  describe("extractParticipants", () => {
    test("extracts unique participants", () => {
      const content = "Me: Hello\nOther: Hi\nMe: How are you?";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("Me");
      expect(metadata.participants).toContain("Other");
      expect(metadata.participants).toHaveLength(2);
    });

    test("normalizes participant names", () => {
      const content = "Me : Hello\n  Other  : Hi\nMe: Bye";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("Me");
      expect(metadata.participants).toContain("Other");
      expect(metadata.participants).toHaveLength(2);
    });

    test("handles special characters in participant names", () => {
      const content = "User\u200B: Hello\nUser\u200C: Hi";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("User");
      expect(metadata.participants).toHaveLength(1);
    });
  });

  describe("extractKeywords", () => {
    test("extracts hashtag keywords", () => {
      const content = "Me: Hello #greeting #hello\nOther: Hi #greeting";
      const metadata = extractor.extract(content);

      expect(metadata.keywords).toContain("greeting");
      expect(metadata.keywords).toContain("hello");
      expect(metadata.keywords).toHaveLength(2);
    });

    test("converts keywords to lowercase", () => {
      const content = "Me: Hello #Greeting #HELLO";
      const metadata = extractor.extract(content);

      expect(metadata.keywords).toContain("greeting");
      expect(metadata.keywords).toContain("hello");
      expect(metadata.keywords).toHaveLength(2);
    });

    test("handles multiple hashtags in single line", () => {
      const content = "Me: #one #two #three";
      const metadata = extractor.extract(content);

      expect(metadata.keywords).toHaveLength(3);
      expect(metadata.keywords).toContain("one");
      expect(metadata.keywords).toContain("two");
      expect(metadata.keywords).toContain("three");
    });
  });

  describe("normalizeParticipantName", () => {
    test("trims whitespace", () => {
      const content = "  Me  : Hello";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("Me");
      expect(metadata.participants[0]).toBe("Me");
    });

    test("normalizes internal whitespace", () => {
      const content = "User   Name: Hello";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("User Name");
    });

    test("removes zero-width spaces", () => {
      const content = "User\u200BName: Hello";
      const metadata = extractor.extract(content);

      expect(metadata.participants).toContain("UserName");
    });
  });
});
