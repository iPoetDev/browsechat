import { ChatSegment, ChatMetadata } from "../models/types";
import { MetadataExtractor } from "./MetadataExtractor";
import * as fs from "fs/promises";


/**
 * Custom error class for ChatParser errors.
 *
 * 
 * @class ChatParserError
 * @typedef {ChatParserError}
 * @extends {Error}
 */
export class ChatParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatParserError";
  }
}

/**
 * Parser options for ChatParser.
 *
 * 
 * @interface ParserOptions
 * @typedef {ParserOptions}
 * 
 * @property {number} [maxFileSize] - Maximum file size in bytes.
 * @property {number} [chunkSize] - Chunk size in bytes.
 * @property {number} [parseTimeout] - Parsing timeout in milliseconds.
 */
export interface ParserOptions {
  maxFileSize?: number; // in bytes
  chunkSize?: number; // in bytes
  parseTimeout?: number; // in milliseconds
}

/**
 * ChatParser class for parsing chat log files.
 *  
 * 
 * @class ChatParser
 * @typedef {ChatParser}
 * 
 * @property {MetadataExtractor} metadataExtractor: The MetadataExtractor instance used for extracting metadata from chat content.
 * 
 *  constructor(options: ParserOptions = {}): Initializes the parser with default options (max file size, chunk size, and parse timeout) and creates a MetadataExtractor instance.
 *  isInitialized(): boolean: Returns whether the parser is initialized (i.e., the MetadataExtractor instance is created).
 *  parseFile(filePath: string): Promise<ChatSegment[]>: Parses a chat log file at the given file path and returns an array of extracted chat segments.
 *  getFileStats(filePath: string): Promise<{ size: number }>: Retrieves the file size of the given file path.
 *  openFile(filePath: string): Promise<fs.FileHandle>: Opens the file at the given file path for reading.
 *  readChunk(fileHandle: fs.FileHandle, buffer: Buffer, offset: number): Promise<{ bytesRead: number; content: string }>: Reads a chunk of the file at the given offset and returns the number of bytes read and the chunk content.
 *  parseContent(content: string, offset: number): Promise<{ parsedSegments: ChatSegment[]; remaining: string }>: Parses the given content and returns an array of extracted chat segments and any remaining content.
 *  finalizeSegment(segment: Partial<ChatSegment>): Promise<ChatSegment>: Finalizes a chat segment by extracting its metadata and returns the complete segment.
 */
export class ChatParser {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly CHUNK_SIZE = 1 * 1024 * 1024; // 1MB
  private readonly PARSE_TIMEOUT = 5000; // 5 seconds
  private readonly metadataExtractor: MetadataExtractor;

  /**
   *
   * @param {ParserOptions} [options={}] - Options for the parser, including
   * max file size, chunk size, and parse timeout. If not provided, the parser
   * will use default values.
   */
  constructor(private options: ParserOptions = {}) {
    this.options.maxFileSize = options.maxFileSize || this.MAX_FILE_SIZE;
    this.options.chunkSize = options.chunkSize || this.CHUNK_SIZE;
    this.options.parseTimeout = options.parseTimeout || this.PARSE_TIMEOUT;
    this.metadataExtractor = new MetadataExtractor();
  }

  /** 
   * Returns whether the parser is initialized (i.e., the MetadataExtractor instance is created).
   */
  isInitialized(): boolean {
    return this.metadataExtractor !== undefined;
  }

  /** 
   * Parses a chat log file at the given file path and returns an array of extracted chat segments.
   * 
   * @param {string} filePath - The path to the chat log file.
   * @returns {Promise<ChatSegment[]>} An array of extracted chat segments.
   * @throws {ChatParserError} If the file cannot be read or parsed.
   * @throws {Error} If an unknown error occurs during parsing.
   */
  async parseFile(filePath: string): Promise<ChatSegment[]> {
    const startTime = Date.now();
    const segments: ChatSegment[] = [];

    try {
      // Check file size
      const stats = await this.getFileStats(filePath);
      if (stats.size > this.options.maxFileSize!) {
        throw new ChatParserError(
          `File size exceeds limit of ${
            this.options.maxFileSize! / (1024 * 1024)
          }MB`
        );
      }

      // Check if file is empty
      if (stats.size === 0) {
        throw new ChatParserError("File is empty");
      }

      // Process file in chunks
      const fileHandle = await this.openFile(filePath);
      let offset = 0;
      let buffer = Buffer.alloc(this.options.chunkSize!);
      let remainingContent = "";

      // Process file in chunks
      while (offset < stats.size) {
        if (Date.now() - startTime > this.options.parseTimeout!) {
          throw new ChatParserError("Parsing timeout exceeded");
        }
        // Read chunk asynchronously
        const { bytesRead, content } = await this.readChunk(
          fileHandle,
          buffer,
          offset
        );
        const combinedContent = remainingContent + content;
        // Parse content asynchronously
        const { parsedSegments, remaining } = await this.parseContent(
          combinedContent,
          offset
        );
        segments.push(...parsedSegments);

        remainingContent = remaining;
        offset += bytesRead;
      }
      // Close file handle
      await fileHandle.close();
      return segments;
    } catch (error) {
      if (error instanceof ChatParserError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ChatParserError(`Failed to parse file: ${error.message}`);
      }
      throw new ChatParserError("Failed to parse file: Unknown error occurred");
    }
  }


  
  /**
   * Get the file size of the given file path.
   *
   * @private
   * 
   * @param {string} filePath
   * @returns {Promise<{ size: number }>}
   */
  private async getFileStats(filePath: string): Promise<{ size: number }> {
    const stats = await fs.stat(filePath);
    return { size: stats.size };
  }

  /**
   * Open the file at the given file path for reading.
   *
   * @private
   * 
   * @param {string} filePath
   * @returns {Promise<fs.FileHandle>}
   */ 
  private async openFile(filePath: string): Promise<fs.FileHandle> {
    return fs.open(filePath, "r");
  }

  /**
   * Read a chunk of the file at the given offset.
   *
   * @private
   * 
   * @param {fs.FileHandle} fileHandle
   * @param {Buffer} buffer
   * @param {number} offset
   * @returns {Promise<{ bytesRead: number; content: string }>}
   */
  private async readChunk(
    fileHandle: fs.FileHandle,
    buffer: Buffer,
    offset: number
  ): Promise<{ bytesRead: number; content: string }> {
    const { bytesRead } = await fileHandle.read(
      buffer,
      0,
      buffer.length,
      offset
    );
    return {
      bytesRead,
      content: buffer.slice(0, bytesRead).toString(),
    };
  }

  /**
   * Parse the given content and returns an array of extracted chat segments and any remaining content.
   *
   * @private
   * 
   * @param {string} content
   * @param {number} offset
   * @returns {Promise<{ parsedSegments: ChatSegment[]; remaining: string }>}
   */
  private async parseContent(
    content: string,
    offset: number
  ): Promise<{ parsedSegments: ChatSegment[]; remaining: string }> {
    const segments: ChatSegment[] = [];
    const lines = content.split("\n");
    let currentSegment: Partial<ChatSegment> | null = null;
    let remaining = "";

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];

      // Check if line starts with "Me"
      if (line.startsWith("Me")) {
        // If we have a current segment, finalize it
        if (currentSegment) {
          segments.push(await this.finalizeSegment(currentSegment));
        }

        // Start new segment
        currentSegment = {
          id: crypto.randomUUID(),
          startIndex: offset + content.indexOf(line),
          content: line,
        };
      } else if (currentSegment) {
        // Append to current segment
        currentSegment.content += "\n" + line;
      }
    }

    // Keep the last line as remaining if it's incomplete
    remaining = lines[lines.length - 1];

    // Finalize last segment if complete
    if (currentSegment && !remaining.includes("Me")) {
      segments.push(await this.finalizeSegment(currentSegment));
    }

    // Return parsed segments and remaining content
    return { parsedSegments: segments, remaining };
  }

  /**
   * Finalizes a chat segment by extracting metadata and returning the segment.
   *
   * @private
   * 
   * @param {Partial<ChatSegment>} segment
   * @returns {Promise<ChatSegment>}
   */ 
  private async finalizeSegment(segment: Partial<ChatSegment>): Promise<ChatSegment> {
    const metadata = await this.metadataExtractor.extract(segment.content!);
    return {
      id: segment.id!,
      sequenceId: segment.sequenceId ?? "pending", // Will be updated when added to a sequence
      startIndex: segment.startIndex!,
      endIndex: segment.startIndex! + segment.content!.length,
      content: segment.content!,
      metadata,
      timestamp: new Date(),
    };
  }
}
