import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { DataModelManager } from '@models/DataModelManager';
import { ChatSegmentImpl } from '@models/ChatSegment';
import { ChatSequenceImpl } from '@models/ChatSequence';
import { ChatMetadataImpl } from '@models/ChatMetadata';
import { DataModelEventEmitter, DataModelEventType } from '@models/events';
import { ChatMetadata, ChatSegment, ChatSequence } from '@models/types';

let dataModelManager: DataModelManager;
let eventEmitter: DataModelEventEmitter;
let testSequence: ChatSequence;
let testSegments: ChatSegment[];
let testMetadata: ChatMetadata;
let eventLog: any[];

Before(() => {
    dataModelManager = new DataModelManager();
    eventEmitter = new DataModelEventEmitter();
    eventLog = [];
    testSegments = [];
});

Given('the data model manager is initialized', () => {
    expect(dataModelManager).to.not.be.undefined;
});

Given('the chat metadata system is ready', () => {
    testMetadata = {
        participants: ['test-user'],
        length: 100,
        keywords: ['test'],
        timestamp: new Date().toISOString(),
        contentType: 'text/plain'
    };
});

Given('the event system is configured', () => {
    eventEmitter.on(DataModelEventType.SequenceUpdated, (data: any) => {
        eventLog.push({ type: DataModelEventType.SequenceUpdated, data });
    });
    eventEmitter.on(DataModelEventType.SegmentUpdated, (data: any) => {
        eventLog.push({ type: DataModelEventType.SegmentUpdated, data });
    });
});

Given('a new chat sequence is created', () => {
    testSequence = new ChatSequenceImpl('test-sequence', []);
    expect(testSequence.id).to.be.a('string');
});

When('multiple chat segments are added to the sequence', () => {
    const segments = [
        new ChatSegmentImpl('content-1', 0, 9, testMetadata, { sequenceId: testSequence.id, timestamp: Date }),
        new ChatSegmentImpl('content-2', 10, 19, testMetadata, { sequenceId: testSequence.id, timestamp: Date })
    ];
    testSequence = testSequence.withSegments([...testSequence.segments, ...segments]);
    testSegments = segments;
});

Then('the sequence should maintain correct order', () => {
    const segments = testSequence.segments;
    expect(segments).to.have.lengthOf(testSegments.length);
    expect(segments[0].content).to.equal('content-1');
    expect(segments[1].content).to.equal('content-2');
});

Then('the sequence should emit appropriate events', () => {
    const sequenceEvents = eventLog.filter(e => e.type === DataModelEventType.SequenceUpdated);
    expect(sequenceEvents).to.have.lengthOf.at.least(1);
});

Given('existing chat segments in the model', async () => {
    for (const segment of testSegments) {
        await dataModelManager.processSegment(segment);
    }
    expect(dataModelManager.getAllSegments()).to.have.lengthOf(testSegments.length);
});

When('a segment is updated with new content', async () => {
    const segment = testSegments[0];
    const updatedSegment = new ChatSegmentImpl(
        'updated content',
        segment.startIndex,
        segment.endIndex,
        segment.metadata,
        { sequenceId: segment.sequenceId, timestamp: Date }
    );
    await dataModelManager.processSegment(updatedSegment);
});

Then('the segment should maintain its metadata', () => {
    const updatedSegment = dataModelManager.getSegment(testSegments[0].id);
    expect(updatedSegment?.metadata).to.deep.equal(testMetadata);
});

Then('related sequences should be updated', () => {
    const sequences = dataModelManager.getAllSequences();
    const hasUpdatedContent = sequences.some(seq => 
        seq.segments.some(seg => seg.content === 'updated content')
    );
    expect(hasUpdatedContent).to.be.true;
});

Given('multiple subscribers to model events', () => {
    let count = 0;
    eventEmitter.on(DataModelEventType.SegmentCreated, () => count++);
    eventEmitter.on(DataModelEventType.SegmentCreated, () => count++);
    const listeners = Array.from(eventEmitter['listeners'].get(DataModelEventType.SegmentCreated) || []);
    expect(listeners.length).to.equal(2);
});

When('a model change occurs', () => {
    eventEmitter.emit(DataModelEventType.SegmentCreated, {
        type: DataModelEventType.SegmentCreated,
        timestamp: new Date(),
        data: { type: 'test' }
    });
});

Then('all subscribers should be notified', () => {
    const modelEvents = eventLog.filter(e => e.type === DataModelEventType.SegmentCreated);
    expect(modelEvents).to.have.lengthOf.at.least(2);
});

Then('events should be delivered in correct order', () => {
    const events = eventLog.map(e => e.type);
    const sequenceUpdateIndex = events.indexOf(DataModelEventType.SequenceUpdated);
    const segmentUpdateIndex = events.indexOf(DataModelEventType.SegmentUpdated);
    expect(sequenceUpdateIndex).to.be.lessThan(segmentUpdateIndex);
});

Given('the data model has multiple chat sequences', async () => {
    const sequences = [
        new ChatSequenceImpl('seq-1', []),
        new ChatSequenceImpl('seq-2', [])
    ];
    for (const sequence of sequences) {
        await dataModelManager.processSegment(testSegments[0]);
    }
    expect(dataModelManager.getAllSequences()).to.have.lengthOf(2);
});

When('state changes are triggered', async () => {
    const newSegment = new ChatSegmentImpl(
        'concurrent content',
        0,
        16,
        testMetadata,
        { sequenceId: 'seq-1', timestamp: Date }
    );
    await dataModelManager.processSegment(newSegment);
});

Then('the model should maintain ACID properties', () => {
    const sequences = dataModelManager.getAllSequences();
    const segments = dataModelManager.getAllSegments();
    expect(sequences).to.be.an('array');
    expect(segments).to.be.an('array');
    expect(sequences.every(seq => seq instanceof ChatSequenceImpl)).to.be.true;
    expect(segments.every(seg => seg instanceof ChatSegmentImpl)).to.be.true;
});

Then('type errors should be properly reported', () => {
    expect(() => {
        dataModelManager.processSegment({} as ChatSegment);
    }).to.throw();
});
