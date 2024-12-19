import { ChatMetadata } from "../models/types";
import { ChatMetadataImpl } from "../models/ChatMetadata";


/**
 * MetadataExtractor is responsible for extracting metadata from chat content.
 *
 * 
 * @class MetadataExtractor
 * @typedef {MetadataExtractor}
 * 
 * @property initialized: A boolean indicating whether the MetadataExtractor is ready to use.
 * 
 *  constructor: Initializes the MetadataExtractor instance and sets the initialized flag to true.
 *  isReady: Returns a boolean indicating whether the MetadataExtractor is ready to use.
*  extract {string}: Extracts metadata from the given chat content and returns a ChatMetadata object. If the content is empty, it returns a default ChatMetadata object.
*  extractParticipants {string}: Extracts participant names from the chat content and returns an array of unique participant names.
*  normalizeParticipantName {string}: Normalizes a participant name by removing leading/trailing whitespace, zero-width spaces, and replacing multiple spaces with a single space.
*  extractKeywords {string}: Extracts keywords from the chat content and returns an array of unique keywords in lowercase.
 */
export class MetadataExtractor {
  private initialized: boolean = false;
  private static readonly PARTICIPANT_PATTERN = /^([^:]+):/;
  private static readonly KEYWORD_PATTERN = /#(\w+)/g;
  // Zero-width spaces and other invisible characters
  private static readonly INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

  
  /**
   * Creates an instance of MetadataExtractor.
   *
   * 
   */
  constructor() {
    this.initialized = true;
  }

  
  /**
   * Is the MetadataExtractor ready to use?
   *
   * @returns {boolean}
   */
  isReady(): boolean {
    return this.initialized;
  }


  /**
   * Extracts metadata from the given chat content and returns a ChatMetadata object.
   * @public
   * @param {string} content - The chat content to extract metadata from.
   * @returns {ChatMetadata} - The extracted metadata.
   */
  public extract(content: string): ChatMetadata {
    if (!this.initialized) {
      throw new Error("MetadataExtractor is not ready");
    }

    if (!content.trim()) {
      return ChatMetadataImpl.fromParser({
        participants: [],
        keywords: [],
        length: content.length,
        timestamp: new Date().toISOString(),
        contentType: "text/plain"
      });
    }

    const participants = this.extractParticipants(content);
    const keywords = this.extractKeywords(content);

    return ChatMetadataImpl.fromParser({
      participants: participants,
      keywords: keywords,
      length: content.length,
      timestamp: new Date().toISOString(),
      contentType: "text/plain"
    });
  }

  /**
   * Extracts participants from the chat content.
   * 
   * @private
   * @param {string} content - The chat content to extract participants from.
   * @returns {string[]} - The extracted participants.
   */
  private extractParticipants(content: string): string[] {
    if (!content.trim()) {
      return [];
    }

    const participants = new Set<string>();
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(MetadataExtractor.PARTICIPANT_PATTERN);
      if (match) {
        const normalizedName = this.normalizeParticipantName(match[1]);
        if (normalizedName) {
          participants.add(normalizedName);
        }
      }
    }

    return Array.from(participants);
  }

  /**
   * Normalizes a participant name by removing leading/trailing whitespace, zero-width spaces, and replacing multiple spaces with a single space.
   * 
   * @private
   * @param {string} name - The participant name to normalize.
   * @returns {string} - The normalized participant name.*/
  private normalizeParticipantName(name: string): string {
    return name
      // Remove leading/trailing whitespace
      .trim()
      // Remove zero-width spaces and other invisible characters
      .replace(MetadataExtractor.INVISIBLE_CHARS, '')
      // Replace multiple spaces with a single space
      .replace(/\s+/g, ' ');
  }

  /**
   * Extracts keywords from the chat content.
   * @private
   * @param {string} content - The chat content to extract keywords from.
   * @returns {string[]} - The extracted keywords.*/
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    let match;

    while ((match = MetadataExtractor.KEYWORD_PATTERN.exec(content)) !== null) {
      keywords.add(match[1].toLowerCase());
    }

    return Array.from(keywords);
  }
}
