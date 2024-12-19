/** 
 * This is a TypeScript declaration file for a chat application.
 * It defines the interfaces and types used in the application.
 */


/**
 * Describes the metadata associated with a chat segment.
 *
 * 
 * @interface ChatMetadata
 * @typedef {ChatMetadata}
 * 
 * @property {string[]} participants - The participants in the chat.
 * @property {string[]} keywords - The keywords associated with the chat.
 * @property {string} timestamp - The timestamp of the chat.
 * @property {number} length - The length of the chat.
 * @property {string} [contentType] - The content type of the chat.
 *  merge - Merges the metadata with another metadata object.
 */
export interface ChatMetadata {
  participants: string[];
  keywords?: string[];
  timestamp?: string;
  length: number;
  contentType?: string;
  merge(other: ChatMetadata): ChatMetadata;
}


/**
 * Contains the information about a chat segment.
 *
 * 
 * @interface ChatSegment
 * @typedef {ChatSegment}
 * 
 * @property {Date} timestamp - The timestamp of the chat segment.
 * @property {string} id - The ID of the chat segment.
 * @property {string} sequenceId - The ID of the chat sequence to which the segment belongs.
 * @property {number} startIndex - The start index of the chat segment.
 * @property {number} endIndex - The end index of the chat segment.
 * @property {string} content - The content of the chat segment.
 * @property {ChatMetadata} metadata - The metadata associated with the chat segment.
 */
export interface ChatSegment {
  timestamp: Date;
  id: string;
  sequenceId: string;
  startIndex: number;
  endIndex: number;
  content: string;
  metadata: ChatMetadata;
}

/** 
 * Describes the metadata associated with a chat sequence.
 * 
 * @interface SequenceMetadata
 * @typedef {SequenceMetadata}
 * 
 * @property {Date} [startTime] - The start time of the chat sequence.
 * @property {Date} [endTime] - The end time of the chat sequence.
 * @property {string} sourceFile - The source file of the chat sequence.
 * @property {number} size - The size of the chat sequence.
 * @property {string} lastModified - The last modified time of the chat sequence.
 * @property {number} segmentCount - The number of segments in the chat sequence.
 */
export interface SequenceMetadata extends ChatMetadata {
  startTime?: Date;
  endTime?: Date;
  sourceFile: string;
  size: number;
  lastModified: string;
  segmentCount: number;
}


/**
 * Represents a chat sequence with its segments and metadata.
 *
 * 
 * @interface ChatSequence
 * @typedef {ChatSequence}
 * 
 * @property {string} id - The ID of the chat sequence.
 * @property {string} sourceFile - The source file of the chat sequence.
 * @property {ChatSegment[]} segments - The segments of the chat sequence.
 * @property {number} totalSegments - The total number of segments in the chat sequence.
 * @property {SequenceMetadata} metadata - The metadata associated with the chat sequence.
 *  withSegments - Returns a new chat sequence with the given segments.
 */
export interface ChatSequence {
  id: string;
  sourceFile: string;
  segments: ChatSegment[];
  totalSegments: number;
  metadata: SequenceMetadata;
  withSegments(newSegments: ChatSegment[]): ChatSequence;
}
