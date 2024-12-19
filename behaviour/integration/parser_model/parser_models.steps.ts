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

//  Scenario: Parse single chat log file into chat segments

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

// Scenario: Handle metadata extraction during parsing

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

// Scenario: Process multiple chat files sequentially

Given("multiple chat log files in the workspace", async () => {
    const testContent1 = `
  Me: Test message 1 from file 1
  Assistant: Response 1 from file 1
  `;
    const testContent2 = `
  Me: Test message 1 from file 2
  Assistant: Response 1 from file 2
  `;
    const testDir = path.join(__dirname, "test-data");
    await fs.writeFile(path.join(testDir, "test-chat1.log"), testContent1);
    await fs.writeFile(path.join(testDir, "test-chat2.log"), testContent2);
  });

  When("the parser processes each file", async () => {
    const testDir = path.join(__dirname, "test-data");
    const files = await fs.readdir(testDir);
    parsedSegments = [];
    for (const file of files) {
      const filePath = path.join(testDir, file);
      const segments = await chatParser.parseFile(filePath);
      parsedSegments.push(...segments);
    }
  });

  Then("each file should create separate chat sequences", () => {
    const file1Segments = parsedSegments.filter(segment => segment.content.includes("file 1"));
    const file2Segments = parsedSegments.filter(segment => segment.content.includes("file 2"));
    expect(file1Segments.length).to.be.greaterThan(0);
    expect(file2Segments.length).to.be.greaterThan(0);
  });

  Then("all sequences should be stored in the data model", async () => {
    for (const segment of parsedSegments) {
      await dataModelManager.processSegment(segment);
      const storedSegment = await dataModelManager.getSegment(segment.id);
      if (!storedSegment) {
        throw new Error(`Segment with id ${segment.id} not found`);
      }
      expect(storedSegment).to.deep.equal(segment);
    }
  });

  Then("the model should maintain correct file references", async () => {
    const testDir = path.join(__dirname, "test-data");
    const files = await fs.readdir(testDir);
    for (const file of files) {
      const filePath = path.join(testDir, file);
      const segments = await chatParser.parseFile(filePath);
      for (const segment of segments) {
        const storedSegment = await dataModelManager.getSegment(segment.id);
        expect(storedSegment.filePath).to.equal(filePath);
      }
    }
  });

// Scenario: Handle invalid chat log format

Given("a malformed chat log file", async () => {
  const malformedContent = `
  Me: Test message 1
  Assistant: Response 1
  INVALID LINE
  Me: Test message 2
  Assistant: Response 2
  `;
    testFilePath = path.join(__dirname, "test-data", "malformed-chat.log");
    await fs.writeFile(testFilePath, malformedContent);
  });

  When("the parser attempts to process the file", async () => {
    try {
      parsedSegments = await chatParser.parseFile(testFilePath);
    } catch (error) {
      this.error = error;
    }
  });

  Then("appropriate error should be captured", () => {
    expect(this.error).to.not.be.undefined;
    expect(this.error.message).to.include("Invalid chat log format");
  });

  Then("the data model should not be corrupted", async () => {
    const segments = await dataModelManager.getAllSegments();
    expect(segments).to.be.an("array").that.is.empty;
  });

  Then("error status should be properly reported", () => {
    expect(this.error).to.have.property("status", "error");
  });

// Scenario: Update existing chat segments

Given("a previously parsed chat log file", async () => {
  const initialContent = `
  Me: Initial message 1
  Assistant: Initial response 1
  `;
    testFilePath = path.join(__dirname, "test-data", "update-chat.log");
    await fs.writeFile(testFilePath, initialContent);
    parsedSegments = await chatParser.parseFile(testFilePath);
    for (const segment of parsedSegments) {
      await dataModelManager.processSegment(segment);
    }
  });

  When("the file content is modified", async () => {
    const updatedContent = `
  Me: Updated message 1
  Assistant: Updated response 1
  `;
    await fs.writeFile(testFilePath, updatedContent);
  });

  When("the parser reprocesses the file", async () => {
    parsedSegments = await chatParser.parseFile(testFilePath);
    for (const segment of parsedSegments) {
      await dataModelManager.processSegment(segment);
    }
  });

  Then("existing chat segments should be updated", async () => {
    const segments = await dataModelManager.getAllSegments();
    expect(segments).to.be.an("array").that.is.not.empty;
    const updatedSegment = segments.find(segment => segment.content.includes("Updated message 1"));
    expect(updatedSegment).to.not.be.undefined;
  });

  Then("the data model should reflect the changes", async () => {
    const segments = await dataModelManager.getAllSegments();
    const updatedSegment = segments.find(segment => segment.content.includes("Updated message 1"));
    expect(updatedSegment).to.not.be.undefined;
    expect(updatedSegment.content).to.include("Updated message 1");
    expect(updatedSegment.content).to.include("Updated response 1");
  });

// Scenario: Handle large chat log files

Given("a chat log file larger than 50MB", async () => {
  const largeContent = "Me: Large message\nAssistant: Large response\n".repeat(500000); // Approx 50MB
  testFilePath = path.join(__dirname, "test-data", "large-chat.log");
  await fs.writeFile(testFilePath, largeContent);
});

  When("the parser processes the large file", async () => {
    const initialMemoryUsage = process.memoryUsage().heapUsed;
    parsedSegments = await chatParser.parseFile(testFilePath);
    const finalMemoryUsage = process.memoryUsage().heapUsed;
    this.memoryUsageDifference = finalMemoryUsage - initialMemoryUsage;
  });

  Then("memory usage should stay within limits", () => {
    const memoryLimit = 100 * 1024 * 1024; // 100MB
    expect(this.memoryUsageDifference).to.be.lessThan(memoryLimit);
  });

  Then("all chat segments should be correctly parsed", () => {
    expect(parsedSegments).to.be.an("array");
    expect(parsedSegments.length).to.be.greaterThan(0);
  });

  Then("the data model should handle the large dataset efficiently", async () => {
    for (const segment of parsedSegments) {
      await dataModelManager.processSegment(segment);
      const storedSegment = await dataModelManager.getSegment(segment.id);
      if (!storedSegment) {
        throw new Error(`Segment with id ${segment.id} not found`);
      }
      expect(storedSegment).to.deep.equal(segment);
    }
  });

