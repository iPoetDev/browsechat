import { ChatParser } from "../parser/ChatParser";
import { ChatSequenceImpl } from "./ChatSequence";
import { ChatSegmentImpl } from "./ChatSegment";
import { ChatMetadataImpl, SequenceMetadataImpl } from "./ChatMetadata";
import { ChatSegment, ChatSequence } from "./types";
import {
  DataModelEvent,
  DataModelEventEmitter,
  DataModelEventType,
} from "./events";
import * as fs from "fs/promises";
import * as path from "path";


/**
 * Data model options
 *
 * 
 * @interface DataModelOptions
 * @typedef {DataModelOptions}
 * 
 * @property {number} [maxFileSize] The maximum file size for parsing.
 * @property {number} [chunkSize] The chunk size for parsing.
 * @property {number} [parseTimeout] The timeout for parsing.
 */
export interface DataModelOptions {
  maxFileSize?: number;
  chunkSize?: number;
  parseTimeout?: number;
}

/**
 * Data Model Manager
 *
 * 
 * @class DataModelManager
 * @typedef {DataModelManager}
 * 
 * @property {Map<string, ChatSequence>} sequences The chat sequences in the data model.
 * @property {Map<string, ChatSegment>} segments The chat segments in the data model.
 * @property {ChatParser} parser The chat parser used to parse chat segments.
 * @property {DataModelEventEmitter} eventEmitter The event emitter for data model events.
 * 
 *  addSequence(sequence: ChatSequenceImpl): Throws an error, not implemented.
 *  addSegment(arg0: {...}): Throws an error, not implemented.
 *  isInitialized(): Throws an error, not implemented.
 *  getSegments(): Throws an error, not implemented.
 *  getExportData(): Throws an error, not implemented.
 *  processSegment(segment: ChatSegment): Processes a chat segment, adds it to the map, finds or creates a sequence, and emits events.
 *  processLogFile(filePath: string): Processes a log file, creates a chat sequence, and emits events.
 *  createSegment(parsedSegment: ChatSegment, sequenceId: string): Creates a new segment with proper metadata and emits events.
 *  updateSegmentBoundaries(segmentId: string, newStart: number, newEnd: number): Updates a segment's boundaries, checks for overlaps, and emits events.
 *  on(eventType: DataModelEventType, listener: (event: any) => void): Subscribes to data model events.
 *  getSequence(id: string): Gets a sequence by ID.
 *  getSegment(id: string): Gets a segment by ID.
 *  getAllSequences(): Gets all sequences.
 *  getSequenceSegments(sequenceId: string): Gets all segments for a sequence.
 *  getNextSegment(currentSegmentId: string): Gets the next segment in sequence.
 *  getPreviousSegment(currentSegmentId: string): Gets the previous segment in sequence.
 *  getAllSegments(): Gets all segments across all sequences.
 *  emitEvent(type: DataModelEventType, data: any): Emits a data model event.
 */
export class DataModelManager {

  private sequences: Map<string, ChatSequence>;
  private segments: Map<string, ChatSegment>;
  private parser: ChatParser;
  private eventEmitter: DataModelEventEmitter;

  /**
   * Creates a new data model manager with the given options. The options can include
   * a maximum file size, a chunk size for parsing, and a timeout for parsing.
   * @param {DataModelOptions} [options={}] Options for the data model manager.
   */
  constructor(options: DataModelOptions = {}) {
    this.sequences = new Map();
    this.segments = new Map();
    this.parser = new ChatParser(options);
    this.eventEmitter = new DataModelEventEmitter();
  }

  /**
   * Adds a chat sequence to the data model. Currently, this method is not
   * implemented and will throw an error.
   * #TODO: Implement this method
   * @param {ChatSequenceImpl} sequence The sequence to add.
   * @throws {Error} Always throws an error, not implemented.
   */
  addSequence(sequence: ChatSequenceImpl) {
    throw new Error("Method not implemented.");
  }
  
  /**
   * Adds a chat segment to the data model. Currently, this method is not
   * implemented and will throw an error.
   * #TODO: Implement this method
   * @param {{
   *   id: string;
   *   content: string;
   *   timestamp: Date;
   *   metadata: { model: string; conversationId: string; userId: string };
   * }} segment The segment to add.
   * @throws {Error} Always throws an error, not implemented.
   */
  addSegment(segment: {
    id: string;
    content: string;
    timestamp: Date;
    metadata: { model: string; conversationId: string; userId: string };
  }) {
    throw new Error("Method not implemented.");
  }
  
  /**
   * Determines if the data model is initialized.
   * #TODO: Implement this method
   * @returns {boolean} True if initialized, false otherwise.
   * @throws {Error} Always throws an error, not implemented.
   */
  isInitialized(): any {
    throw new Error("Method not implemented.");
  }
  
  /**
   * Returns all segments in the data model.
   * #TODO: Implement this method
   * @returns {ChatSegment[]} An array of all segments in the data model.
   * @throws {Error} Always throws an error, not implemented.
   */
  getSegments() {
    throw new Error("Method not implemented.");
  }

  /**
   * Gets the export data for the data model. This data can be used to persist
   * the data model to a file or database.
   * @returns {any} The export data.
   * @throws {Error} Always throws an error, not implemented.
   */
  getExportData(): any {
    throw new Error("Method not implemented.");
  }

  /**
   * Processes a segment, adding it to the data model and emitting events.
   * @param {ChatSegment} segment The segment to process.
   */
  processSegment(segment: ChatSegment) {
    // Add segment to the map
    this.segments.set(segment.id, segment);

    // Find or create sequence
    let sequence = this.sequences.get(segment.sequenceId);
    if (!sequence) {
      sequence = new ChatSequenceImpl(segment.sequenceId, []);
      this.sequences.set(segment.sequenceId, sequence);
      this.emitEvent(DataModelEventType.SequenceCreated, { sequence });
    }

    // Add segment to sequence
    sequence = sequence.withSegments([...sequence.segments, segment]);
    this.sequences.set(segment.sequenceId, sequence);

    // Emit events
    this.emitEvent(DataModelEventType.SegmentCreated, {
      segment,
      sequenceId: segment.sequenceId,
    });
    this.emitEvent(DataModelEventType.SequenceUpdated, {
      sequence,
      changes: ["segments"],
    });
  }


  /**
   * Processes a log file and creates a chat sequence
   * @param {string} filePath The path to the log file.
   * @returns {Promise<ChatSequence>} A promise that resolves to the created chat sequence.
   * @throws {Error} If the file cannot be read or parsed.
   */
  public async processLogFile(filePath: string): Promise<ChatSequence> {
    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      const sourceInfo = {
        filename: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };

      // Parse file into segments
      const parsedSegments = await this.parser.parseFile(filePath);

      // Create sequence
      const sequence = new ChatSequenceImpl(filePath, []);

      // Process segments
      for (const parsedSegment of parsedSegments) {
        const segment = await this.createSegment(parsedSegment, sequence.id);
        this.segments.set(segment.id, segment);
      }

      // Update sequence with segments
      const updatedSequence = sequence.withSegments(
        Array.from(this.segments.values()).filter(
          (s) => s.sequenceId === sequence.id
        )
      );

      this.sequences.set(updatedSequence.id, updatedSequence);

      // Emit events
      this.emitEvent(DataModelEventType.SequenceCreated, {
        sequence: updatedSequence,
      });
      this.emitEvent(DataModelEventType.SequenceUpdated, {
        sequence: updatedSequence,
        changes: ["segments"],
      });

      return updatedSequence;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to process log file: ${error.message}`);
      }
      throw new Error("Failed to process log file: Unknown error occurred");
    }
  }

  /**
   * Creates a new segment with proper metadata
   * @param {ChatSegment} parsedSegment The parsed segment.
   * @param {string} sequenceId The ID of the sequence to which the segment belongs.
   * @returns {Promise<ChatSegment>} A promise that resolves to the created chat segment.
   */
  private async createSegment(
    parsedSegment: ChatSegment,
    sequenceId: string
  ): Promise<ChatSegment> {
    const metadata = new ChatMetadataImpl({
      participants: ["Me"], // Assuming "Me" is always the speaker
      length: parsedSegment.content.length,
      keywords: parsedSegment.metadata.keywords,
      timestamp: new Date().toISOString(),
      contentType: "text/plain",
    });

    const segment = new ChatSegmentImpl(
      parsedSegment.content,
      parsedSegment.startIndex,
      parsedSegment.endIndex,
      metadata,
      { sequenceId, timestamp: new Date() }
    );

    this.emitEvent(DataModelEventType.SegmentCreated, { segment, sequenceId });

    return segment as ChatSegment;
  }

  /**
   * Updates a segment's boundaries
   * @param {string} segmentId The ID of the segment to update.
   * @param {number} newStart The new start index of the segment.
   * @param {number} newEnd The new end index of the segment.
   * @returns {Promise<void>} A promise that resolves when the segment boundaries have been updated.
   */
  public async updateSegmentBoundaries(
    segmentId: string,
    newStart: number,
    newEnd: number
  ): Promise<void> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error("Segment not found");
    }

    // Check for overlaps with other segments
    const sequence = this.sequences.get(segment.sequenceId);
    if (!sequence) {
      throw new Error("Parent sequence not found");
    }

    const overlapping = sequence.segments.find(
      (s) =>
        s.id !== segmentId &&
        ((newStart >= s.startIndex && newStart < s.endIndex) ||
          (newEnd > s.startIndex && newEnd <= s.endIndex))
    );

    if (overlapping) {
      throw new Error("New boundaries would overlap with existing segment");
    }

    // Create updated segment
    const updatedSegment = new ChatSegmentImpl(
      segment.content,
      newStart,
      newEnd,
      segment.metadata,
      { sequenceId: segment.sequenceId }
    );

    this.segments.set(segmentId, updatedSegment);

    // Update sequence
    const updatedSequence = sequence.withSegments(
      sequence.segments.map((s) => (s.id === segmentId ? updatedSegment : s))
    );

    this.sequences.set(updatedSequence.id, updatedSequence);

    // Emit events
    this.emitEvent(DataModelEventType.BoundaryChanged, {
      segment: updatedSegment,
      sequenceId: sequence.id,
      changes: ["boundaries"],
    });
    this.emitEvent(DataModelEventType.SequenceUpdated, {
      sequence: updatedSequence,
      changes: ["segments"],
    });
  }

  /**
   * Subscribes to data model events
   * @param {DataModelEventType} eventType The type of event to subscribe to.
   * @param {DataModelEventListener} listener The listener function to be called when the event occurs.
   */
  public on(
    eventType: DataModelEventType,
    listener: (event: any) => void
  ): void {
    this.eventEmitter.on(eventType, listener);
  }

  /**
   * Gets a sequence by ID
   * @param {string} id The ID of the sequence to retrieve.
   * @returns {ChatSequence | undefined} The sequence with the given ID, or undefined if not found.
   */
  public getSequence(id: string): ChatSequence | undefined {
    return this.sequences.get(id);
  }

  /**
   * Gets a segment by ID
   * @param {string} id The ID of the segment to retrieve.
   * @returns {ChatSegment | undefined} The segment with the given ID, or undefined if not found.
   */
  public getSegment(id: string): ChatSegment | undefined {
    return this.segments.get(id);
  }

  /**
   * Gets all sequences
   * @returns {ChatSequence[]} An array of all sequences.
   */
  public getAllSequences(): ChatSequence[] {
    return Array.from(this.sequences.values());
  }

  /**
   * Gets all segments for a sequence
   * @param {string} sequenceId The ID of the sequence.
   * @returns {ChatSegment[]} An array of all segments for the sequence.
   */
  public getSequenceSegments(sequenceId: string): ChatSegment[] {
    return Array.from(this.segments.values()).filter(
      (s) => s.sequenceId === sequenceId
    );
  }

  /**
   * Gets the next segment in sequence
   * @param {string} currentSegmentId The ID of the current segment.
   * @returns {ChatSegment | undefined} The next segment in the sequence, or undefined if the current segment is the last.
   */
  getNextSegment(currentSegmentId: string): ChatSegment | undefined {
    const currentSegment = this.getSegment(currentSegmentId);
    if (!currentSegment) {
      return undefined;
    }

    const sequence = this.sequences.get(currentSegment.sequenceId);
    if (!sequence) {
      return undefined;
    }

    const segments = sequence.segments;
    const currentIndex = segments.findIndex((s) => s.id === currentSegmentId);
    return currentIndex < segments.length - 1
      ? segments[currentIndex + 1]
      : undefined;
  }

  /**
   * Gets the previous segment in sequence
   * @param {string} currentSegmentId The ID of the current segment.
   * @returns {ChatSegment | undefined} The previous segment in the sequence, or undefined if the current segment is the first.
   */
  getPreviousSegment(currentSegmentId: string): ChatSegment | undefined {
    const currentSegment = this.getSegment(currentSegmentId);
    if (!currentSegment) {
      return undefined;
    }

    const sequence = this.sequences.get(currentSegment.sequenceId);
    if (!sequence) {
      return undefined;
    }

    const segments = sequence.segments;
    const currentIndex = segments.findIndex((s) => s.id === currentSegmentId);
    return currentIndex > 0 ? segments[currentIndex - 1] : undefined;
  }

  /**
   * Gets all segments across all sequences
   * @returns {ChatSegment[]} An array of all segments.
   */
  getAllSegments(): ChatSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Emits a data model event to all registered listeners.
   * @param {DataModelEventType} type The type of event to emit.
   * @param {any} data The event data.
   * @private
   */
  private emitEvent(type: DataModelEventType, data: any) {
    const event: DataModelEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.eventEmitter.emit(type, event);
  }
}
