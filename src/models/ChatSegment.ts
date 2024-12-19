import { ChatSegment, ChatMetadata } from "./types";

/**
 * Options for creating a chat segment
 *  interface ChatSegmentOptions
 * @interface ChatSegmentOptions
 * @type ChatSegmentOptions
 * 
 * @property sequenceId - ID of the chat sequence
 * @property order - Order of the chat segment
 * @property startTime - Start time of the chat segment
 * @property endTime - End time of the chat segment
 * @property timestamp - Timestamp of the chat segment
 */
export interface ChatSegmentOptions {
  sequenceId: string;
  order?: number;
  startTime?: Date;
  endTime?: Date;
  timestamp?: Date;
}


/**
 * Implementation of a chat segment
 *
 * 
 * @class ChatSegmentImpl
 * @typedef {ChatSegmentImpl}
 *  {ChatSegment}
 * 
 * @property {string} id - The unique identifier of the segment.
 * @property {string} sequenceId - The ID of the sequence to which the segment belongs.
 * @property {Date} timestamp - The timestamp of the segment.
 * @property @readonly {number} _startIndex - The start index of the segment.
 * @property @readonly {number} _endIndex - The end index of the segment.
 * @property @readonly {string} _content - The sanitized content of the segment.
 * @property @readonly {ChatMetadata} _metadata - The metadata associated with the segment.
 * @property @readonly{number} _order - The order of the segment within the sequence.
 * 
 *  Constructor: Initializes a new ChatSegmentImpl instance with the given content, start and end indices, metadata, and options. It validates the content and boundaries, generates a unique ID, and sets the sequence ID, timestamp, and order.
 *  startIndex: Returns the start index of the chat segment.
 *  endIndex: Returns the end index of the chat segment.
 *  content: Returns the sanitized content of the chat segment.
 *  metadata: Returns a copy of the chat segment's metadata.
 *  order: Returns the order of the chat segment.
 *  overlaps: Checks if this segment overlaps with another segment.
 *  containsIndex: Checks if this segment contains the given index.
 *  withOrder: Creates a new segment with updated order.
 *  validateContent: Validates the content of the chat segment, ensuring it's not empty and starts with the "Me" keyword.
 *  validateBoundaries: Validates the start and end indices of the chat segment, ensuring they're non-negative and the end index is greater than the start index.
 *  sanitizeContent: Sanitizes the content of the chat segment by removing invisible characters and normalizing whitespace.
 *  initializeMetadata: Initializes the metadata of the chat segment by cloning the given metadata and adding time-related properties if needed.
 *  fromLogContent: Creates a new ChatSegmentImpl instance from raw log content, start and end indices, metadata, and options.
 */
export class ChatSegmentImpl implements ChatSegment {
  public readonly id: string;
  public readonly sequenceId: string;
  public readonly timestamp: Date;
  private readonly _startIndex: number;
  private readonly _endIndex: number;
  private readonly _content: string;
  private readonly _metadata: ChatMetadata;
  private readonly _order: number;

  /**
   * Initializes a new ChatSegmentImpl instance with the given content, start and end indices, metadata, and options.
   * It validates the content and boundaries, generates a unique ID, and sets the sequence ID, timestamp, and order.
   * @param content - Raw content of the chat segment
   * @param startIndex - Start index of the chat segment
   * @param endIndex - End index of the chat segment
   * @param metadata - Metadata of the chat segment
   * @param options - Options for creating the chat segment
   */
  constructor(
    content: string,
    startIndex: number,
    endIndex: number,
    metadata: ChatMetadata,
    options: ChatSegmentOptions
  ) {
    this.validateContent(content, startIndex);
    this.validateBoundaries(startIndex, endIndex);

    this.id = crypto.randomUUID();
    this.sequenceId = options.sequenceId;
    this.timestamp = options.timestamp || new Date();
    this._startIndex = startIndex;
    this._endIndex = endIndex;
    this._content = this.sanitizeContent(content);
    this._metadata = this.initializeMetadata(metadata, options);
    this._order = options.order ?? -1;
  }

  /**
   * Returns the start index of the chat segment
   */
  public get startIndex(): number {
    return this._startIndex;
  }

  /**
   * Returns the end index of the chat segment
   */
  public get endIndex(): number {
    return this._endIndex;
  }

  /**
   * Returns the sanitized content of the chat segment
   */
  public get content(): string {
    return this._content;
  }

  /**
   * Validates the content of the chat segment, ensuring it's not empty and starts with the "Me" keyword
   */
  public get metadata(): ChatMetadata {
    return { ...this._metadata };
  }

  /**
   * Returns the order of the chat segment
   */
  public get order(): number {
    return this._order;
  }

  /**
   * Checks if this segment overlaps with another segment
   * @public
   * @param other - The other chat segment to check
   * @returns {boolean} True if this segment overlaps with the other segment, false otherwise
   */
  public overlaps(other: ChatSegment): boolean {
    return this.startIndex < other.endIndex && this.endIndex > other.startIndex;
  }

  /**
   * Checks if this segment contains the given index
   * @public
   * @param index - The index to check
   * @returns {boolean} True if this segment contains the index, false otherwise
   */
  public containsIndex(index: number): boolean {
    return index >= this.startIndex && index < this.endIndex;
  }

  /**
   * Creates a new segment with updated order
   * @public
   * @param newOrder - The new order of the segment
   * @returns {ChatSegmentImpl} A new chat segment with the updated order
   */
  public withOrder(newOrder: number): ChatSegmentImpl {
    return new ChatSegmentImpl(
      this._content,
      this._startIndex,
      this._endIndex,
      this._metadata,
      {
        sequenceId: this.sequenceId,
        order: newOrder,
        startTime: (this._metadata as any)?._timeInfo?.startTime,
        endTime: (this._metadata as any)?._timeInfo?.endTime,
      }
    );
  }

  /**
   * Validates the content of the chat segment, ensuring it's not empty and starts with the "Me" keyword
   * @private
   * @param content - The content to validate
   * @param startIndex - The start index of the content
   * @returns {void}
   */
  private validateContent(content: string, startIndex: number): void {
    if (!content) {
      throw new Error("Segment content cannot be empty");
    }

    const trimmedContent = content.trim();
    const meIndex = trimmedContent.indexOf("Me");

    if (meIndex !== 0) {
      throw new Error('Segment must start with "Me" keyword');
    }

    // Validate that the "Me" keyword is at the correct position in the original content
    const contentBeforeMe = content.substring(0, content.indexOf("Me"));
    if (startIndex + contentBeforeMe.length !== startIndex) {
      throw new Error('startIndex must point to the "Me" keyword');
    }
  }

  /**
   * Validates the boundaries of the chat segment, ensuring they're non-negative and the end index is greater than the start index
   * @private
   * @param startIndex - The start index of the segment
   * @param endIndex - The end index of the segment
   * @returns {void}
   */
  private validateBoundaries(startIndex: number, endIndex: number): void {
    if (startIndex < 0) {
      throw new Error("startIndex cannot be negative");
    }

    if (endIndex <= startIndex) {
      throw new Error("endIndex must be greater than startIndex");
    }
  }

  /**
   * Sanitizes the content of the chat segment by removing invisible characters and normalizing whitespace
   * @private
   * @param content - The content to sanitize
   * @returns {string} The sanitized content  */
  private sanitizeContent(content: string): string {
    // Remove zero-width spaces and other invisible characters
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Normalize whitespace while preserving newlines
    const lines = content.split("\n");
    const sanitizedLines = lines.map((line) =>
      line.trim().replace(/\s+/g, " ")
    );

    return sanitizedLines.join("\n").trim();
  }

  /**
   * Initializes the metadata of the chat segment by cloning the given metadata and adding time-related properties if needed
   * @private
   * @param metadata - The metadata to initialize
   * @param options - The options for initializing the metadata
   * @returns {ChatMetadata} The initialized metadata
   */
  private initializeMetadata(
    metadata: ChatMetadata,
    options: ChatSegmentOptions
  ): ChatMetadata {
    const baseMetadata = {
      participants: [...metadata.participants],
      keywords: metadata.keywords ? [...metadata.keywords] : [],
      length: metadata.length,
      merge: metadata.merge,
    };

    // Store time-related properties in a separate field if needed
    if (options.startTime || options.endTime) {
      (baseMetadata as any)._timeInfo = {
        startTime: options.startTime,
        endTime: options.endTime,
      };
    }

    return baseMetadata;
  }

  /**
   * Creates a segment from raw log content
   * @public
   * 
   * @param logContent - The raw log content
   * @param startIndex - The start index of the segment
   * @param endIndex - The end index of the segment
   * @param metadata - The metadata of the segment
   * @param options - The options for creating the segment
   * @returns {ChatSegmentImpl} A new chat segment created from the raw log content
   */
  public static fromLogContent(
    logContent: string,
    startIndex: number,
    endIndex: number,
    metadata: ChatMetadata,
    options: ChatSegmentOptions
  ): ChatSegmentImpl {
    return new ChatSegmentImpl(
      logContent,
      startIndex,
      endIndex,
      metadata,
      options
    );
  }
}
