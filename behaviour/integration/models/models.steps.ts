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
    testSequence = new ChatSequenceImpl('test-sequence', []);
    testSegments = new Array<ChatSegment>();
    testMetadata = new ChatMetadataImpl();
    eventLog = [];
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

//     Scenario: Create and manage chat sequences

Given("a new chat sequence is created", () => {
    testSequence = new ChatSequenceImpl("test-sequence", []);
    expect(testSequence.id).to.be.a("string");
  });
  
  When("multiple chat segments are added to the sequence", () => {
    const segment1 = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString() });
    const segment2 = new ChatSegmentImpl({ content: "World", timestamp: new Date().toISOString() });
    testSequence.addSegment(segment1);
    testSequence.addSegment(segment2);
    testSegments.push(segment1, segment2);
  });
  
  Then("the sequence should maintain correct order", () => {
    const segments = testSequence.getSegments();
    expect(segments[0].content).to.equal("Hello");
    expect(segments[1].content).to.equal("World");
  });
  
  Then("the sequence should emit appropriate events", () => {
    expect(eventLog).to.deep.include({ type: DataModelEventType.SequenceUpdated, data: testSequence });
    expect(eventLog).to.deep.include({ type: DataModelEventType.SegmentUpdated, data: testSegments[0] });
    expect(eventLog).to.deep.include({ type: DataModelEventType.SegmentUpdated, data: testSegments[1] });
  });
  
  Then("the sequence metadata should be updated", () => {
    const metadata = testSequence.getMetadata();
    expect(metadata.length).to.equal(2);
    expect(metadata.keywords).to.include.members(["Hello", "World"]);
  });

//    Scenario: Handle chat segment operations

Given("existing chat segments in the model", () => {
    const segment1 = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString() });
    const segment2 = new ChatSegmentImpl({ content: "World", timestamp: new Date().toISOString() });
    testSequence.addSegment(segment1);
    testSequence.addSegment(segment2);
    testSegments.push(segment1, segment2);
    dataModelManager.addSequence(testSequence);
  });
  
  When("a segment is updated with new content", () => {
    const segmentToUpdate = testSegments[0];
    segmentToUpdate.updateContent("Hello, updated");
    eventEmitter.emit(DataModelEventType.SegmentUpdated, segmentToUpdate);
  });
  
  Then("the segment should maintain its metadata", () => {
    const segment = testSegments[0];
    expect(segment.content).to.equal("Hello, updated");
    expect(segment.timestamp).to.not.be.undefined;
  });
  
  Then("related sequences should be updated", () => {
    const updatedSequence = dataModelManager.getSequenceById(testSequence.id);
    const segments = updatedSequence.getSegments();
    expect(segments[0].content).to.equal("Hello, updated");
  });
  
  Then("change events should be emitted", () => {
    expect(eventLog).to.deep.include({ type: DataModelEventType.SegmentUpdated, data: testSegments[0] });
  });

//     Scenario: Manage chat metadata across components

Given("chat segments with associated metadata", () => {
    const segment1 = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString(), metadata: testMetadata });
    const segment2 = new ChatSegmentImpl({ content: "World", timestamp: new Date().toISOString(), metadata: testMetadata });
    testSequence.addSegment(segment1);
    testSequence.addSegment(segment2);
    testSegments.push(segment1, segment2);
    dataModelManager.addSequence(testSequence);
  });
  
  When("metadata is updated for a segment", () => {
    const segmentToUpdate = testSegments[0];
    segmentToUpdate.updateMetadata({ participants: ["updated-user"], length: 200 });
    eventEmitter.emit(DataModelEventType.SegmentUpdated, segmentToUpdate);
  });
  
  Then("all related components should reflect the changes", () => {
    const updatedSegment = testSegments[0];
    expect(updatedSegment.metadata.participants).to.include("updated-user");
    expect(updatedSegment.metadata.length).to.equal(200);
  });
  
  Then("the data model should maintain consistency", () => {
    const updatedSequence = dataModelManager.getSequenceById(testSequence.id);
    const segments = updatedSequence.getSegments();
    expect(segments[0].metadata.participants).to.include("updated-user");
    expect(segments[0].metadata.length).to.equal(200);
  });
  
  Then("metadata events should be triggered", () => {
    expect(eventLog).to.deep.include({ type: DataModelEventType.SegmentUpdated, data: testSegments[0] });
  });

//     Scenario: Handle event propagation

Given("multiple subscribers to model events", () => {
    eventEmitter.on(DataModelEventType.SequenceUpdated, (data: any) => {
      subscriberLog.push({ subscriber: "subscriber1", event: data });
    });
    eventEmitter.on(DataModelEventType.SequenceUpdated, (data: any) => {
      subscriberLog.push({ subscriber: "subscriber2", event: data });
    });
  });
  
  When("a model change occurs", () => {
    const segment = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString() });
    testSequence.addSegment(segment);
    eventEmitter.emit(DataModelEventType.SequenceUpdated, testSequence);
  });
  
  Then("all subscribers should be notified", () => {
    expect(subscriberLog.length).to.equal(2);
    expect(subscriberLog[0].subscriber).to.equal("subscriber1");
    expect(subscriberLog[1].subscriber).to.equal("subscriber2");
  });
  
  Then("events should be delivered in correct order", () => {
    expect(subscriberLog[0].event).to.deep.equal(testSequence);
    expect(subscriberLog[1].event).to.deep.equal(testSequence);
  });
  
  Then("event payloads should be complete", () => {
    expect(subscriberLog[0].event.getSegments().length).to.equal(1);
    expect(subscriberLog[0].event.getSegments()[0].content).to.equal("Hello");
    expect(subscriberLog[1].event.getSegments().length).to.equal(1);
    expect(subscriberLog[1].event.getSegments()[0].content).to.equal("Hello");
  });

// Scenario: Data model state management

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

// Scenario: Type validation and enforcement

Given("chat data with various types", () => {
    const segment1 = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString(), metadata: testMetadata });
    const segment2 = new ChatSegmentImpl({ content: 12345, timestamp: new Date().toISOString(), metadata: testMetadata }); // Invalid type
    testSequence.addSegment(segment1);
    testSegments.push(segment1, segment2);
    dataModelManager.addSequence(testSequence);
  });
  
  When("data transformations occur", () => {
    try {
      testSegments.forEach(segment => {
        segment.transformData();
      });
    } catch (error) {
      eventLog.push({ type: "TypeError", data: error });
    }
  });
  
  Then("type safety should be maintained", () => {
    const validSegment = testSegments[0];
    expect(validSegment.content).to.be.a("string");
  });
  
  Then("invalid data should be rejected", () => {
    const invalidSegment = testSegments[1];
    expect(() => invalidSegment.transformData()).to.throw(TypeError);
  });
  
  Then("type errors should be properly reported", () => {
    const typeErrors = eventLog.filter(event => event.type === "TypeError");
    expect(typeErrors).to.not.be.empty;
    expect(typeErrors[0].data).to.be.instanceOf(TypeError);
  });

// Scenario: Handle model persistence

Given("chat data in the model", () => {
    const segment1 = new ChatSegmentImpl({ content: "Hello", timestamp: new Date().toISOString(), metadata: testMetadata });
    const segment2 = new ChatSegmentImpl({ content: "World", timestamp: new Date().toISOString(), metadata: testMetadata });
    testSequence.addSegment(segment1);
    testSequence.addSegment(segment2);
    testSegments.push(segment1, segment2);
    dataModelManager.addSequence(testSequence);
  });
  
  When("persistence operations are triggered", () => {
    serializedData = dataModelManager.serialize();
    dataModelManager.clear();
    dataModelManager.deserialize(serializedData);
  });
  
  Then("data should be properly serialized", () => {
    expect(serializedData).to.be.a("string");
    expect(serializedData).to.contain("Hello");
    expect(serializedData).to.contain("World");
  });
  
  Then("data should be retrievable after restart", () => {
    const retrievedSequence = dataModelManager.getSequenceById(testSequence.id);
    expect(retrievedSequence).to.not.be.undefined;
    const segments = retrievedSequence.getSegments();
    expect(segments[0].content).to.equal("Hello");
    expect(segments[1].content).to.equal("World");
  });
  
  Then("persistence should handle large datasets", () => {
    const largeSegments = [];
    for (let i = 0; i < 10000; i++) {
      largeSegments.push(new ChatSegmentImpl({ content: `Message ${i}`, timestamp: new Date().toISOString(), metadata: testMetadata }));
    }
    const largeSequence = new ChatSequenceImpl("large-sequence", largeSegments);
    dataModelManager.addSequence(largeSequence);
    const largeSerializedData = dataModelManager.serialize();
    dataModelManager.clear();
    dataModelManager.deserialize(largeSerializedData);
    const retrievedLargeSequence = dataModelManager.getSequenceById("large-sequence");
    expect(retrievedLargeSequence.getSegments().length).to.equal(10000);
  });