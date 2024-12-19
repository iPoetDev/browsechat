import { ChatMetadata, SequenceMetadata } from './types';

/**
 * Interface representing source information for a chat sequence.
 *
 * 
 * @interface SourceInfo
 * 
 * @property {string} filename - The filename of the source
 * @property {number} size - The size of the source
 * @property {string} lastModified - The last modified date of the source
 */
export interface SourceInfo {
    filename: string;
    size: number;
    lastModified: string;
}

/**
 * Interface representing options for creating a new chat segment.
 *
 * 
 * @interface SegmentMetadataOptions
 * @typedef {SegmentMetadataOptions}
 * 
 * @property {string[]} participants - The participants in the chat segment
 * @property {number} length - The length of the chat segment
 * @property {string[]} keywords - The keywords associated with the chat segment
 * @property {string} timestamp - The timestamp of the chat segment
 * @property {string} contentType - The content type of the chat segment
 */
export interface SegmentMetadataOptions {
    participants: string[];
    length: number;
    keywords?: string[];
    timestamp?: string;
    contentType?: string;
}

/**
 * Interface representing options for creating a new sequence metadata.
 *
 * 
 * @interface SequenceMetadataOptions
 * @typedef {SequenceMetadataOptions}
 * 
 * @property {number} segmentCount - The number of segments in the sequence
 * @property {number} totalLength - The total length of the sequence
 */
export interface SequenceMetadataOptions extends SourceInfo {
    segmentCount: number;
    totalLength: number;
}

/**
 * Class representing metadata for a chat segment.
 * 
 *  
 * @class ChatMetadataImpl
 *  {ChatMetadata}
 * @typedef {ChatMetadataImpl}
 * @extends {ChatMetadata}
 * 
 * @property {string[]} participants - The participants in the chat segment
 * @property {number} length - The length of the chat segment
 * @property {string[]} keywords - The keywords associated with the chat segment
 * @property {string} speaker - The speaker in the chat segment
 * @property {number} position - The position of the speaker in the chat segment
 * @property {string | undefined} timestamp - The timestamp of the chat segment
 * 
 *  Constructor: Initializes a new ChatMetadataImpl instance with the given options, validating the participants and length.
 *  fromParser: Creates a new ChatMetadataImpl instance from parser results, allowing empty participants.
 *  setLength: Creates a new metadata instance with an updated length.
 *  addParticipants: Creates a new metadata instance with additional participants.
 *  addKeywords: Creates a new metadata instance with additional keywords.
 *  merge: Merges this metadata with another metadata instance, creating a new instance with merged data.
 *  validateOptions: Validates the options passed to the constructor, throwing errors for invalid participants or length.
 *  fromContent: Creates metadata from a chat segment content, extracting the speaker, keywords, and timestamp.
 *  extractSpeaker: Extracts the speaker from a chat segment content.
 *  extractKeywords: Extracts keywords from a chat segment content.
 *  extractTimestamp: Extracts the timestamp from a chat segment content.
 */
export class ChatMetadataImpl implements ChatMetadata {
    public readonly participants: string[];
    public readonly length: number;
    public readonly keywords: string[];
    public readonly speaker: string;
    public readonly position: number;
    public readonly timestamp?: string;

    /**
     * Constructor: Initializes a new ChatMetadataImpl instance with the given options, validating the participants and length.
     * @param {SegmentMetadataOptions} options The options to create the metadata from
     */
    constructor(options: SegmentMetadataOptions) {
        this.validateOptions(options);
        
        this.speaker = options.participants[0];
        this.position = 0; // Will be set by setLength
        this.participants = options.participants;
        this.length = options.length; 
        this.keywords = options.keywords || [];
        this.timestamp = options.timestamp;
    }

    /**
     * Creates a ChatMetadataImpl instance from parser results, allowing empty participants
     * 
     * @param options {SegmentMetadataOptions} The options to create the metadata from
     * @returns {ChatMetadataImpl} A new ChatMetadataImpl instance
     */
    static fromParser(options: SegmentMetadataOptions): ChatMetadataImpl {
        const metadata = Object.create(ChatMetadataImpl.prototype);
        metadata.speaker = options.participants?.[0] || '';
        metadata.position = 0;
        metadata.participants = options.participants || [];
        metadata.length = options.length;
        metadata.keywords = options.keywords || [];
        metadata.timestamp = options.timestamp;

        if (metadata.length < 0) {
            throw new Error('Invalid length');
        }

        return metadata;
    }

    /**
     * Creates a new metadata instance with updated length
     * @param length {number} The new length to set
     * @returns {ChatMetadataImpl} A new metadata instance with updated length
     */
    public setLength(length: number): ChatMetadataImpl {
        if (length < 0) {
            throw new Error('Invalid length');
        }

        const metadata = new ChatMetadataImpl({
            participants: this.participants,
            length: length,
            keywords: this.keywords,
            timestamp: this.timestamp
        });

        return metadata;
    }

    /**
     * Creates a new metadata instance with additional participants
     * @param newParticipants {string[]} The new participants to add
     * @returns {ChatMetadataImpl} A new metadata instance with additional participants
     */
    public addParticipants(newParticipants: string[]): ChatMetadataImpl {
        const uniqueParticipants = [...new Set([...this.participants, ...newParticipants])];
        
        const metadata = new ChatMetadataImpl({
            participants: uniqueParticipants,
            length: this.length,
            keywords: this.keywords,
            timestamp: this.timestamp
        });
        
        return metadata;
    }

    /**
     * Creates a new metadata instance with additional keywords
     * @param newKeywords {string[]} The new keywords to add
     * @returns {ChatMetadataImpl} A new metadata instance with additional keywords
     */
    public addKeywords(newKeywords: string[]): ChatMetadataImpl {
        const uniqueKeywords = new Set([...this.keywords, ...newKeywords]);
        
        return new ChatMetadataImpl({
            participants: this.participants,
            length: this.length,
            keywords: Array.from(uniqueKeywords),
            timestamp: this.timestamp
        });
    }

    /**
     * Merges this metadata with another metadata instance
     * @param other The other metadata to merge with
     * @returns A new metadata instance with merged data
     */
    public merge(other: ChatMetadata): ChatMetadataImpl {
        const mergedParticipants = Array.from(new Set([...this.participants, ...other.participants]));
        const mergedKeywords = Array.from(new Set([...this.keywords, ...(other.keywords || [])]));
        const mergedLength = this.length + other.length;
        
        // Use the latest timestamp if available
        const timestamp = this.timestamp && other.timestamp 
            ? new Date(this.timestamp) > new Date(other.timestamp) ? this.timestamp : other.timestamp
            : this.timestamp || other.timestamp;

        return new ChatMetadataImpl({
            participants: mergedParticipants,
            length: mergedLength,
            keywords: mergedKeywords,
            timestamp: timestamp
        });
    }

    /**
     * Validates the options passed to the constructor, throwing errors for invalid participants or length
     * @param options {SegmentMetadataOptions} The options to validate
     * @throws {Error} If the options are invalid
     * @private
     */
    private validateOptions(options: SegmentMetadataOptions): void {
        if (!options.participants || options.participants.length === 0) {
            throw new Error('Invalid participants');
        }

        if (options.length < 0) {
            throw new Error('Invalid length');
        }
    }

    /**
     * Creates metadata from a chat segment content
     * @public
     * 
     * @param content {string} The content to create metadata from
     * @param position {number} The position of the segment in the chat
     * @returns {ChatMetadataImpl} A new metadata instance created from the content
     */
    public static fromContent(content: string, position: number): ChatMetadataImpl {
        const speaker = ChatMetadataImpl.extractSpeaker(content);
        const keywords = ChatMetadataImpl.extractKeywords(content);
        
        return new ChatMetadataImpl({
            participants: [speaker],
            length: 0,
            keywords,
            timestamp: ChatMetadataImpl.extractTimestamp(content)
        });
    }

    /**
     * Extracts the speaker name from the given chat content
     * @private
     * 
     * @param content {string} The content to extract the speaker from
     * @returns {string} The speaker name, 'Me'
     * @throws {Error} If no speaker is found
     */
    private static extractSpeaker(content: string): string {
        const match = content.match(/^Me:|\n(Me:)/);
        if (!match) {
            throw new Error('No speaker found in content');
        }
        return 'Me';
    }

    /**
     * Extracts keywords from the given chat content
     * @private
     * 
     * @param {string} content
     * @returns {string[]}
     */
    private static extractKeywords(content: string): string[] {
        const keywords = new Set<string>();
        const matches = content.matchAll(/#(\w+)/g);
        for (const match of matches) {
            keywords.add(match[1].toLowerCase());
        }
        return Array.from(keywords);
    }

    
    /**
     * Extracts the timestamp from the given chat content
     *
     * @private
     * 
     * @param {string} content
     * @returns {(string | undefined)}
     */
    private static extractTimestamp(content: string): string | undefined {
        const match = content.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\]/);
        return match ? match[1] : undefined;
    }
}


/**
 * Sequence metadata implementation.
 *
 * 
 * @class SequenceMetadataImpl
 * @typedef {SequenceMetadataImpl}
 *  {SequenceMetadata}
 * 
 *  Constructor: Initializes a new SequenceMetadataImpl instance with the given options, validating the filename, size, segment count, and total length.
 *  withSegmentData: Creates a new metadata instance with aggregated segment data, populating participants and keywords arrays.
 *  merge: Merges this metadata with another metadata instance, creating a new instance with merged data. If merging with another SequenceMetadata, it also merges sequence-specific properties.
 *  validateOptions: Validates the options passed to the constructor, throwing errors for invalid filename, size, segment count, or total length.
 */
export class SequenceMetadataImpl implements SequenceMetadata {
    public readonly participants: string[];
    public readonly length: number;
    public readonly keywords: string[];
    public readonly sourceFile: string;
    public readonly startTime?: Date;
    public readonly endTime?: Date;
    public readonly size: number;
    public readonly lastModified: string;
    public readonly segmentCount: number;

    constructor(options: SequenceMetadataOptions) {
        this.validateOptions(options);
        
        this.sourceFile = options.filename;
        this.size = options.size;
        this.lastModified = options.lastModified;
        this.segmentCount = options.segmentCount;
        this.length = options.totalLength;
        
        // Initialize empty arrays (will be populated later)
        this.participants = [];
        this.keywords = [];
    }

    /**
     * Creates a new metadata instance with aggregated segment data
     * @public
     * @param segments {ChatMetadata[]} The segments to aggregate
     * @returns {SequenceMetadataImpl} A new metadata instance with aggregated data
     */
    public withSegmentData(segments: ChatMetadata[]): SequenceMetadataImpl {
        const allParticipants = segments.flatMap(s => s.participants);
        const allKeywords = segments.flatMap(s => s.keywords || []);
        
        const metadata = new SequenceMetadataImpl({
            filename: this.sourceFile,
            size: this.size,
            lastModified: this.lastModified,
            segmentCount: segments.length,
            totalLength: segments.reduce((sum, s) => sum + s.length, 0)
        });

        metadata.participants.push(...Array.from(new Set(allParticipants)));
        metadata.keywords.push(...Array.from(new Set(allKeywords)));

        return metadata;
    }

    /**
     * Merges this metadata with another metadata instance
     * @param other {ChatMetadata} The other metadata to merge with
     * @returns {ChatMetadata} A new metadata instance with merged data
     */
    public merge(other: ChatMetadata): ChatMetadata {
        const mergedParticipants = Array.from(new Set([...this.participants, ...other.participants]));
        const mergedKeywords = Array.from(new Set([...this.keywords, ...(other.keywords || [])]));
        const mergedLength = this.length + other.length;

        // If the other metadata is a SequenceMetadata, merge sequence-specific properties
        if ('sourceFile' in other && 'size' in other && 'lastModified' in other) {
            const otherSeq = other as SequenceMetadata;
            const size = Math.max(this.size, otherSeq.size);
            const lastModified = this.lastModified && otherSeq.lastModified
                ? new Date(this.lastModified) > new Date(otherSeq.lastModified)
                    ? this.lastModified
                    : otherSeq.lastModified
                : this.lastModified || otherSeq.lastModified;

            const metadata = new SequenceMetadataImpl({
                filename: this.sourceFile,
                size: size,
                lastModified: lastModified,
                segmentCount: this.segmentCount + otherSeq.segmentCount,
                totalLength: mergedLength
            });

            metadata.participants.push(...mergedParticipants);
            metadata.keywords.push(...mergedKeywords);

            return metadata;
        }

        // If merging with regular ChatMetadata, preserve sequence properties
        const metadata = new SequenceMetadataImpl({
            filename: this.sourceFile,
            size: this.size,
            lastModified: this.lastModified,
            segmentCount: this.segmentCount,
            totalLength: mergedLength
        });

        metadata.participants.push(...mergedParticipants);
        metadata.keywords.push(...mergedKeywords);

        return metadata;
    }

    /**
     * Validates the options passed to the constructor, throwing errors for invalid filename, size, segment count, or total length.
     * @param options {SequenceMetadataOptions} The options to validate
     * @throws {Error} If the options are invalid
     */
    private validateOptions(options: SequenceMetadataOptions): void {
        if (!options.filename) {
            throw new Error('Filename is required');
        }

        if (options.size < 0) {
            throw new Error('Size cannot be negative');
        }

        if (options.segmentCount < 0) {
            throw new Error('Segment count cannot be negative');
        }

        if (options.totalLength < 0) {
            throw new Error('Total length cannot be negative');
        }
    }
}
