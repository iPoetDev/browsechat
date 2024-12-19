import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { ChatParser } from "@parser/ChatParser";
import { MetadataExtractor } from "@parser/MetadataExtractor";
import { DataModelManager } from "@models/DataModelManager";
import { ChatSegment, ChatMetadata } from "@models/types";
import { expect } from "chai";
import * as fs from "fs/promises";
import * as path from "path";

let chatParser: ChatParser;
let metadataExtractor: MetadataExtractor;
let dataModelManager: DataModelManager;
let testFilePath: string;
let parsedSegments: ChatSegment[];
let extractedMetadata: ChatMetadata;

Before(async () => {
  chatParser = new ChatParser();
  metadataExtractor = new MetadataExtractor();
  dataModelManager = new DataModelManager();
  // Create test directory if it doesn't exist
  await fs.mkdir(path.join(__dirname, "test-data"), { recursive: true });
});

Given("the chat parser is initialized", () => {
  expect(chatParser).to.not.be.undefined;
});

Given("the data model manager is ready", () => {
  expect(dataModelManager).to.not.be.undefined;
});

Given("a valid chat log file with multiple conversations", async () => {
  const testContent = `
Me: Test message 1
Assistant: Response 1

Me: Test message 2
Assistant: Response 2
`;
  testFilePath = path.join(__dirname, "test-data", "test-chat.log");
  await fs.writeFile(testFilePath, testContent);
});

When("the parser processes the file", async () => {
  parsedSegments = await chatParser.parseFile(testFilePath);
});

Then("chat segments should be created", () => {
  expect(parsedSegments).to.be.an("array");
  expect(parsedSegments.length).to.be.greaterThan(0);
});

Then("each segment should have correct metadata", () => {
  parsedSegments.forEach((segment: ChatSegment) => {
    expect(segment).to.have.property("id");
    expect(segment).to.have.property("content");
    expect(segment).to.have.property("timestamp");
  });
});

Then("segments should be stored in the data model", async () => {
  const segment = parsedSegments[0];
  await dataModelManager.processSegment(segment);
  const storedSegment = await dataModelManager.getSegment(segment.id);
  if (!storedSegment) {
    throw new Error(`Segment with id ${segment.id} not found`);
  }
  expect(storedSegment).to.deep.equal(segment);
});

Given("a chat log file with conversation metadata", async () => {
  const testContent = `
[timestamp=2024-12-16T23:24:54Z]
[model=gpt-4]
Me: Test message with metadata
Assistant: Response with metadata
`;
  testFilePath = path.join(__dirname, "test-data", "metadata-chat.log");
  await fs.writeFile(testFilePath, testContent);
});

When("the metadata extractor processes the file", async () => {
  extractedMetadata = await metadataExtractor.extract(testFilePath);
});

Then("chat metadata should be extracted", () => {
  expect(extractedMetadata).to.not.be.undefined;
  expect(extractedMetadata).to.have.property("timestamp");
  expect(extractedMetadata).to.have.property("model");
});

Then("metadata should be associated with correct chat segments", async () => {
  const segments = await chatParser.parseFile(testFilePath);
  segments.forEach((segment: ChatSegment) => {
    expect(segment.metadata).to.deep.include(extractedMetadata);
  });
});

Then("the data model should be updated with metadata", async () => {
  const segments = await chatParser.parseFile(testFilePath);
  if (!segments || segments.length === 0) {
    throw new Error("No segments found");
  }
  const segment = segments[0];
  await dataModelManager.processSegment(segment);
  const storedSegment = await dataModelManager.getSegment(segment.id);
  if (!storedSegment) {
    throw new Error(`Segment with id ${segment.id} not found`);
  }
  expect(storedSegment.metadata).to.deep.include(extractedMetadata);
});

// Large file handling scenario
Given("a chat log file larger than 50MB", async () => {
  const largeContent = "Me: Test\nAssistant: Response\n".repeat(1000000);
  testFilePath = path.join(__dirname, "test-data", "large-chat.log");
  await fs.writeFile(testFilePath, largeContent);
});

Then("memory usage should stay within limits", () => {
  const memoryUsage = process.memoryUsage();
  expect(memoryUsage.heapUsed).to.be.lessThan(500 * 1024 * 1024); // 500MB limit
});

// Cleanup after tests
After(async () => {
  await fs.rm(path.join(__dirname, "test-data"), {
    recursive: true,
    force: true,
  });
});
