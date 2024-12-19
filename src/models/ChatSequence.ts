import {
  ChatSegment,
  ChatSequence,
  SequenceMetadata,
  ChatMetadata,
} from "./types";


/**
 * Represents a chat sequence, which consists of segments and metadata, providing methods for accessing and modifying them.
 *
 * 
 * @class ChatSequenceImpl
 * @typedef {ChatSequenceImpl}
 *  {ChatSequence}
 * 
 * @property {string} id - The unique identifier of the sequence.
 * @property {string} sourceFile - The source file of the sequence.
 * @property {ChatSegment[]} _segments - The segments of the sequence.
 * @property {SequenceMetadata} _metadata - The metadata associated with the sequence.
 * 
 *  constructor: Initializes a new sequence with a given source file and optional initial segments.
 *  segments: Returns a copy of the segments in the sequence to prevent direct modification.
 *  totalSegments: Returns the total number of segments in the sequence.
 *  metadata: Returns a copy of the sequence's metadata to prevent direct modification.
 *  addSegments: Adds new segments to the sequence, maintaining order by startIndex, and updates the metadata.
 *  getSegment: Returns a segment by its index in the sequence, or undefined if the index is out of range.
 *  findSegmentsByKeywords: Finds segments containing specific keywords.
 *  findSegmentsByParticipant: Finds segments by participant.
 *  withSegments: Creates a new sequence with updated segments.
 *  initializeMetadata: Initializes the sequence's metadata with default values.
 *  updateMetadata: Updates the sequence's metadata based on the current segments.
 *  validateSegments: Validates the segments in the sequence, ensuring they start with "Me" and do not overlap
 * 
 */
export class ChatSequenceImpl implements ChatSequence {
  public readonly id: string;
  public readonly sourceFile: string;
  private readonly _segments: ChatSegment[];
  private _metadata: SequenceMetadata;

  /**
   * Constructs a new sequence with the given source file and optional initial segments.
   * If initial segments are provided, they are added to the sequence in order.
   * @param sourceFile {string} The source file of the sequence
   * @param initialSegments {ChatSegment[]} An optional set of initial segments to add to the sequence
   */
  constructor(sourceFile: string, initialSegments: ChatSegment[] = []) {
    this.id = crypto.randomUUID();
    this.sourceFile = sourceFile;
    this._segments = [];
    this._metadata = {
        participants: [],
        length: 0,
        keywords: [],
        sourceFile: "",
        startTime: undefined,
        endTime: undefined,
        merge: function(): SequenceMetadata {
            throw new Error("Not implemented");
        },
        size: 0,
        lastModified: new Date().toISOString(),
        segmentCount: 0
    };

    // Add initial segments in order
    if (initialSegments.length > 0) {
      this.addSegments(initialSegments);
    }
  }

  /**
   * Gets the segments of the sequence. A copy is returned to prevent
   * direct modification of the internal segments array.
   * @returns {ChatSegment[]} A copy of the segments in the sequence
   */
  public get segments(): ChatSegment[] {
    return [...this._segments];
}

  /**
   * The total number of segments in the sequence
   * @returns {number} The total number of segments in the sequence
   */
  public get totalSegments(): number {
    return this._segments.length;
  }

  /**
   * The metadata of the sequence. A copy is returned to prevent
   * direct modification of the internal metadata object.
   * @returns {SequenceMetadata} The metadata of the sequence
   */
  public get metadata(): SequenceMetadata {
    return { ...this._metadata };
  }

  /**
   * Adds segments to the sequence, maintaining order by startIndex
   * @param newSegments The segments to add to the sequence
   * @type {ChatSegment[]}
   * @returns {void}
   */
  public addSegments(newSegments: ChatSegment[]): void {
    // Validate segments
    this.validateSegments(newSegments);

    // Add segments and sort by startIndex
    this._segments.push(...newSegments);
    this._segments.sort((a, b) => a.startIndex - b.startIndex);

    // Update metadata
    this.updateMetadata();
  }
 /**
  * Creates a new sequence with updated segments
  * @param newSegments The updated segments for the new sequence
  * @returns {ChatSequence} A new sequence with the updated segments
  * @type {ChatSegment[]}
  */
  public withSegments(newSegments: ChatSegment[]): ChatSequence {
    // validate segments
    this.validateSegments(newSegments);
    
    const sequence = new ChatSequenceImpl(this.id);
    sequence.addSegments(newSegments);
    
    // Update sequence 
    return sequence;
}

  /**
   * Gets a segment by its index in the sequence
   * @param index The index of the segment to get
   * @type {number}
   * @returns {ChatSegment | undefined} The segment at the given index, or undefined if the index is out of range
   */
  public getSegment(index: number): ChatSegment | undefined {
    if (index < 0 || index >= this._segments.length) {
      return undefined;
    }
    return { ...this._segments[index] }; // Return a copy
  }

  /**
   * Finds segments containing specific keywords
   * @param keywords {string[]} The keywords to search for
   * @returns {ChatSegment[]}
   */
  public findSegmentsByKeywords(keywords: string[]): ChatSegment[] {
    const normalizedKeywords = keywords.map((k) => k.toLowerCase());
    return this._segments.filter((segment) =>
      segment.metadata.keywords?.some((k) =>
        normalizedKeywords.includes(k.toLowerCase())
      )
    );
  }

  /**
   * Finds segments by participant
   * @param participant {string} The participant to search for
   * @returns {ChatSegment[]} The segments containing the specified participant
   */
  public findSegmentsByParticipant(participant: string): ChatSegment[] {
    const normalizedParticipant = participant.toLowerCase();
    return this._segments.filter((segment) =>
      segment.metadata.participants.some(
        (p) => p.toLowerCase() === normalizedParticipant
      )
    );
  }

  // /**
  //  * Creates a new sequence with updated segments
  //  * @param newSegments {ChatSegment[]} The updated segments for the new sequence
  //  * @returns {ChatSequence} A new sequence with the updated segments
  //  */
  // public withSegments(newSegments: ChatSegment[]): ChatSequenceImpl {
  //   const sequence = new ChatSequenceImpl(this.sourceFile);
  //   sequence.addSegments(newSegments);
  //   return sequence;
  // }

  /**
   * Initializes the sequence's metadata with default values
   * @param sourceFile {string} The source file of the sequence
   * @returns {SequenceMetadata} The initialized metadata
   * @private
   *   initializes a sequence's metadata with default values. It takes a sourceFile string as input and returns a SequenceMetadata object with default properties, including empty arrays for participants and keywords, and undefined or zero values for other fields. The merge function is defined but not implemented, throwing an error if called.
   */
  private initializeMetadata(sourceFile: string): SequenceMetadata {
    return {
      participants: [],
      length: 0,
      keywords: [],
      sourceFile,
      startTime: undefined,
      endTime: undefined,
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
      size: 0,
      lastModified: "",
      segmentCount: 0,
    };
  }

  /**
   * Updates the sequence's metadata with aggregated segment data
   * @private
   *   updates a sequence's metadata by aggregating data from its segments. It collects unique participants and keywords, calculates the total length, and updates the metadata object with these values.
   */
  private updateMetadata(): void {
    const participants = new Set<string>();
    const keywords = new Set<string>();
    let totalLength = 0;

    this._segments.forEach((segment) => {
      // Update participants
      segment.metadata.participants.forEach((p) => participants.add(p));

      // Update keywords
      segment.metadata.keywords?.forEach((k) => keywords.add(k));

      // Update length
      totalLength += segment.metadata.length;
    });

    this._metadata = {
      participants: Array.from(participants),
      length: totalLength,
      keywords: Array.from(keywords),
      sourceFile: this.sourceFile,
      startTime: (this._segments[0]?.metadata as any)?._timeInfo?.startTime,
      endTime: (this._segments[this._segments.length - 1]?.metadata as any)
        ?._timeInfo?.endTime,
      merge: this.metadata.merge,
      size: 0,
      lastModified: "",
      segmentCount: this._segments.length,
    };
  }

  /**
   * Validates the segments in the sequence, ensuring they start with "Me" and do not overlap
   * @param segments {ChatSegment[]} The segments to validate
   * @throws {Error} If any segment does not start with "Me" or overlaps with another segment
   * @private
   *   validates the segments in the sequence. It checks that all segments start with "Me" and do not overlap with each other, and throws an error if either condition is not met.
   */
  private validateSegments(segments: ChatSegment[]): void {
    // Ensure all segments start with "Me"
    const invalidSegments = segments.filter(
      (s) => !s.content.trim().startsWith("Me")
    );

    if (invalidSegments.length > 0) {
      throw new Error('All segments must start with "Me" keyword');
    }

    // Check for overlapping segments
    const sortedSegments = [...segments].sort(
      (a, b) => a.startIndex - b.startIndex
    );
    for (let i = 1; i < sortedSegments.length; i++) {
      if (sortedSegments[i].startIndex <= sortedSegments[i - 1].endIndex) {
        throw new Error("Segments cannot overlap");
      }
    }
  }
}
