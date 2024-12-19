import { ChatParser, ParserOptions } from "../../../src/parser/ChatParser";
import { mockFsPromises, mockFileHandle } from "../../mocks/fs";

jest.mock("fs/promises", () => mockFsPromises);

describe("ChatParser", () => {
  let parser: ChatParser;
  const mockFileContent =
    "Me: Hello/nAssistant: Hi there/n/nMe: How are you?/nAssistant: I'm good!";
  const mockFilePath = "/test/chat.log";

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new ChatParser();

    // Setup basic mocks
    mockFsPromises.stat.mockResolvedValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
    });

    mockFileHandle.read = jest.fn().mockResolvedValue({
      bytesRead: mockFileContent.length,
      buffer: Buffer.from(mockFileContent),
    });

    mockFsPromises.open.mockResolvedValue(mockFileHandle);
  });

  describe("File Reading", () => {
    beforeEach(() => {
      const mockBuffer = Buffer.from("test content");
      mockFileHandle.read = jest.fn().mockImplementation((buffer: Buffer) => {
        mockBuffer.copy(buffer);
        return Promise.resolve({
          bytesRead: mockBuffer.length,
          buffer: buffer,
        });
      });
    });

    test("should read file content", async () => {
      const mockFileContent = "Me: Hello/nAssistant: Hi there";
      mockFileHandle.read = jest.fn().mockImplementation((buffer: Buffer) => {
        const content = Buffer.from(mockFileContent);
        content.copy(buffer);
        return Promise.resolve({
          bytesRead: mockFileContent.length,
          buffer: buffer,
        });
      });

      await parser.parseFile(mockFilePath);
      expect(mockFileHandle.read).toHaveBeenCalled();
    });

    test("should handle read errors", async () => {
      mockFileHandle.read = jest
        .fn()
        .mockRejectedValueOnce(new Error("Read error"));
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow(
        "Read error"
      );
    });

    test("should close file handle after parsing error", async () => {
      mockFileHandle.read = jest
        .fn()
        .mockRejectedValueOnce(new Error("Read error"));
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow();
      expect(mockFileHandle.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("File Operations", () => {
    test("should validate file existence", async () => {
      await parser.parseFile(mockFilePath);
      expect(mockFsPromises.stat).toHaveBeenCalledWith(mockFilePath);
    });

    test("should reject empty files", async () => {
      mockFsPromises.stat.mockResolvedValue({ size: 0, isFile: () => true });
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow(
        "File is empty"
      );
    });

    test("should reject oversized files", async () => {
      mockFsPromises.stat.mockResolvedValue({
        size: 20 * 1024 * 1024,
        isFile: () => true,
      });
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow(
        "File size exceeds limit"
      );
    });
  });

  describe("Content Reading", () => {
    test("should read file content correctly", async () => {
      await parser.parseFile(mockFilePath);
      expect(mockFsPromises.open).toHaveBeenCalledWith(mockFilePath, "r");
      expect(mockFileHandle.read).toHaveBeenCalled();
    });

    test("should handle read errors", async () => {
      mockFileHandle.read = jest
        .fn()
        .mockRejectedValue(new Error("Read error"));
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow();
    });
  });

  describe("Parsing Results", () => {
    test("should parse chat segments", async () => {
      const segments = await parser.parseFile(mockFilePath);
      expect(segments).toBeInstanceOf(Array);
      expect(segments.length).toBeGreaterThan(0);

      segments.forEach((segment) => {
        expect(segment).toMatchObject({
          id: expect.any(String),
          content: expect.any(String),
          timestamp: expect.any(Date),
          metadata: expect.objectContaining({
            participants: expect.any(Array),
          }),
        });
      });
    });
  });

  describe("Resource Cleanup", () => {
    test("should close file handle after successful parsing", async () => {
      await parser.parseFile(mockFilePath);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    test("should close file handle after parsing error", async () => {
      mockFileHandle.read = jest
        .fn()
        .mockRejectedValue(new Error("Read error"));
      await expect(parser.parseFile(mockFilePath)).rejects.toThrow();
      expect(mockFileHandle.close).toHaveBeenCalled();
    });
  });

  describe("Parser Options", () => {
    test("should respect custom options", async () => {
      const options: ParserOptions = {
        maxFileSize: 2048,
        chunkSize: 512,
        parseTimeout: 10000,
      };
      parser = new ChatParser(options);

      mockFsPromises.stat.mockResolvedValue({ size: 2000, isFile: () => true });
      await parser.parseFile(mockFilePath);
      expect(mockFileHandle.read).toHaveBeenCalled();
    });
  });
});
