import { ChatSegment, ChatSequence } from "./types";

/**
 * Data model event types.
 *
 * 
 * @enum {DataModelEventType}
 * 
 * @property {string} SequenceCreated - Sequence created event.
 * @property {string} SequenceUpdated - Sequence updated event.
 * @property {string} SequenceDeleted - Sequence deleted event.
 * @property {string} SegmentCreated - Segment created event.
 * @property {string} SegmentUpdated - Segment updated event.
 * @property {string} SegmentDeleted - Segment deleted event.
 * @property {string} MetadataUpdated - Metadata updated event.
 * @property {string} BoundaryChanged - Boundary changed event.
 */
export enum DataModelEventType {
  SequenceCreated = "sequence-created",
  SequenceUpdated = "sequence-updated",
  SequenceDeleted = "sequence-deleted",
  SegmentCreated = "segment-created",
  SegmentUpdated = "segment-updated",
  SegmentDeleted = "segment-deleted",
  MetadataUpdated = "metadata-updated",
  BoundaryChanged = "boundary-changed",
}

/**
 * Data model event.
 *
 * 
 * @interface DataModelEvent
 * @typedef {DataModelEvent}
 * 
 * @property {DataModelEventType} type - Event type.
 * @property {Date} timestamp - Event timestamp.
 * @property {any} data - Event data.
 */
export interface DataModelEvent {
  type: DataModelEventType;
  timestamp: Date;
  data: any;
}


/**
 * Sequence event.
 *
 * 
 * @interface SequenceEvent
 * @typedef {SequenceEvent}
 * @extends {DataModelEvent}
 * 
 * @property {{sequence: ChatSequence, changes?: string[]}} data - Sequence data.
 */
export interface SequenceEvent extends DataModelEvent {
  data: {
    sequence: ChatSequence;
    changes?: string[];
  };
}

/**
 * Segment event.
 *
 * 
 * @interface SegmentEvent
 * @typedef {SegmentEvent}
 * @extends {DataModelEvent}
 * 
 * @property {{segement: ChatSegement, sequenceId: string, changes?: string[]}} data - Sequence data
 */
export interface SegmentEvent extends DataModelEvent {
  data: {
    segment: ChatSegment;
    sequenceId: string;
    changes?: string[];
  };
}


/**
 * Metadata event.
 *
 * 
 * @interface MetadataEvent
 * @typedef {MetadataEvent}
 * @extends {DataModelEvent}
 * @returns {void}
 */
export type DataModelEventListener = (event: DataModelEvent) => void;

/** 
 * Data model event emitter.
 * @class DataModelEventEmitter
 * 
 * @typedef {DataModelEventEmitter}
 */
export class DataModelEventEmitter {
  private listeners: Map<DataModelEventType, Set<DataModelEventListener>>;

  /**
   * Creates an instance of DataModelEventEmitter.
   *  DataModelEventEmitter
   * @property {Map<DataModelEventType, Set<DataModelEventListener>} listeners - Event listeners.
   */
  constructor() {
    this.listeners = new Map();
  }

  /** 
   * Adds an event listener.
   * @param {DataModelEventType} eventType - Event type.
   * @param {DataModelEventListener} listener - Event listener.
  */
  public on(
    eventType: DataModelEventType,
    listener: DataModelEventListener
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /** 
   * Removes an event listener.
   * @param {DataModelEventType} eventType - Event type.
   * @param {DataModelEventListener} listener - Event listener.
  */
  public off(
    eventType: DataModelEventType,
    listener: DataModelEventListener
  ): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  /**
   * Emits an event to all listeners.
   * @param {DataModelEventType} eventType - Event type.
   * @param {DataModelEvent} event - Event data.
   */
  public emit(eventType: DataModelEventType, event: DataModelEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }
}
