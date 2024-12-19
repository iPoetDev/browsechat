import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { expect } from "chai";
import * as fs from "fs/promises";
import * as path from "path";
import { ChatParser } from "@parser/ChatParser";
import { MetadataExtractor } from "@parser/MetadataExtractor";
import { TestHelper } from "../command-integrations/command.helper";

let parser: ChatParser;
let metadataExtractor: MetadataExtractor;
let testDir: string;
let testFiles: string[] = [];
let parseResults: any[] = [];
let eventLog: any[] = [];

Before(async () => {
  parser = new ChatParser();
  metadataExtractor = new MetadataExtractor();
  testDir = await TestHelper.createTestDirectory();
});

After(async () => {
  await TestHelper.cleanup();
});

Given("the file system is accessible", async () => {
  const canAccess = await TestHelper.checkFileSystemAccess(testDir);
  expect(canAccess).to.be.true;
});

Given("the parser is initialized", () => {
  expect(parser).to.not.be.undefined;
  expect(parser.isInitialized()).to.be.true;
});

Given("the metadata extractor is ready", () => {
  expect(metadataExtractor).to.not.be.undefined;
  expect(metadataExtractor.isReady()).to.be.true;
});

Given("temporary test directories are created", async () => {
  testDir = await TestHelper.createTestDirectory();
});

// Scenario: Basic File Reading Integration

Given("a valid chat log file exists", async () => {
  const content = TestHelper.generateChatContent(5);
  const filePath = await TestHelper.createTestFile(content, testDir);
  testFiles.push(filePath);
});

  When("the parser reads the file", async () => {
    const filePath = testFiles[0];
    const content = await fs.readFile(filePath, "utf-8");
    parseResults = parser.parse(content);
    expect(parseResults).to.not.be.empty;
  });

  Then("the file should be read asynchronously", async () => {
    const filePath = testFiles[0];
    const wasRead = await TestHelper.wasFileReadAsync(filePath);
    expect(wasRead).to.be.true;
  });

  Then("the content should be parsed into segments", () => {
    expect(parseResults.length).to.be.greaterThan(0);
  });

  Then("file handles should be properly closed", async () => {
    const filePath = testFiles[0];
    const isClosed = await TestHelper.isFileClosed(filePath);
    expect(isClosed).to.be.true;
  });

  Then("system resources should be released", () => {
    const stats = TestHelper.getMemoryStats();
    expect(stats.heapUsed).to.be.lessThan(100 * 1024 * 1024); // Less than 100MB
  });

// Scenario: Large File Processing Integration

Given("a chat log file larger than 50MB exists", async () => {
  const filePath = await TestHelper.createLargeTestFile(testDir, 50);
  testFiles.push(filePath);
});
  
  When("the parser processes the large file", async () => {
    const filePath = testFiles[0];
    parseResults = await parser.parseLargeFile(filePath, (progress) => {
      eventLog.push({ type: "progress", progress });
    });
  });
  
  Then("the file should be read in chunks", async () => {
    const filePath = testFiles[0];
    const chunkCount = TestHelper.getChunkCount(filePath, 1024 * 1024); // 1MB chunks
    expect(chunkCount).to.be.greaterThan(1);
  });
  
  Then("memory usage should be monitored", () => {
    const stats = TestHelper.getMemoryStats();
    expect(stats.heapUsed).to.be.lessThan(200 * 1024 * 1024); // Less than 200MB
  });
  
  Then("parsing should not block the event loop", () => {
    const isBlocked = TestHelper.isEventLoopBlocked();
    expect(isBlocked).to.be.false;
  });
  
  Then("progress events should be emitted", () => {
    const progressEvents = eventLog.filter((e) => e.type === "progress");
    expect(progressEvents.length).to.be.greaterThan(0);
  });

// Scenario: Multiple File Processing Integration

Given("multiple chat log files exist", async () => {
  const files = await TestHelper.createMultipleTestFiles(testDir, 5);
  testFiles.push(...files);
});

  When("the parser processes files concurrently", async () => {
    const parsePromises = testFiles.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf-8");
      return parser.parse(content);
    });
    parseResults = await Promise.all(parsePromises);
  });

  Then("files should be read in parallel", () => {
    const concurrentOperations = TestHelper.getConcurrentOperations();
    expect(concurrentOperations).to.be.greaterThan(1);
  });

  Then("system resources should be managed", () => {
    const stats = TestHelper.getMemoryStats();
    expect(stats.heapUsed).to.be.lessThan(300 * 1024 * 1024); // Less than 300MB
  });

  Then("results should maintain file order", () => {
    const fileOrderMaintained = testFiles.every((file, index) => {
      return parseResults[index].filePath === file;
    });
    expect(fileOrderMaintained).to.be.true;
  });

  Then("parsing events should be coordinated", () => {
    const parseEvents = eventLog.filter((e) => e.type === "parse");
    expect(parseEvents.length).to.be.greaterThan(0);
  });

// Scenario: File System Event Integration

// Scenario: File System Error Handling

Given("various file system scenarios", async () => {
  await TestHelper.setupFileSystemScenarios(testDir);
});

  When("file system errors occur", async () => {
    try {
      await parser.processFilesWithErrors(testDir);
    } catch (error) {
      eventLog.push({ type: "error", error });
    }
  });

  Then("appropriate errors should be caught", () => {
    const errorEvents = eventLog.filter((e) => e.type === "error");
    expect(errorEvents.length).to.be.greaterThan(0);
  });

  Then("error details should be logged", () => {
    const errorEvents = eventLog.filter((e) => e.type === "error");
    errorEvents.forEach((event) => {
      expect(event.error).to.have.property("message");
      expect(event.error).to.have.property("stack");
    });
  });

  Then("resources should be cleaned up", async () => {
    const resourcesCleaned = await TestHelper.checkResourcesCleanedUp();
    expect(resourcesCleaned).to.be.true;
  });

  Then("error events should be emitted", () => {
    const errorEvents = eventLog.filter((e) => e.type === "error");
    expect(errorEvents.length).to.be.greaterThan(0);
  });

 // Scenario: File Change Monitoring Integration

  Given("chat log files are being monitored", async () => {
    await TestHelper.setupFileMonitoring(testDir);
  });
  
  When("file changes are detected", async () => {
    await TestHelper.simulateFileChange(testDir);
  });
  
  Then("change events should be emitted", () => {
    const changeEvents = eventLog.filter((e) => e.type === "change");
    expect(changeEvents.length).to.be.greaterThan(0);
  });
  
  Then("modified files should be reparsed", async () => {
    const reparsedFiles = await TestHelper.getReparsedFiles();
    expect(reparsedFiles.length).to.be.greaterThan(0);
  });
  
  Then("cached data should be updated", () => {
    const cacheUpdated = TestHelper.isCacheUpdated();
    expect(cacheUpdated).to.be.true;
  });
  
  Then("watchers should be properly managed", () => {
    const watchersManaged = TestHelper.areWatchersManaged();
    expect(watchersManaged).to.be.true;
  });

  // Scenario: File Access Permission Integration

Given("files with different permissions exist", async () => {
  await TestHelper.createFilesWithPermissions(testDir);
});

  When("the parser attempts to access files", async () => {
    try {
      await parser.accessFilesWithPermissions(testDir);
    } catch (error) {
      eventLog.push({ type: "accessError", error });
    }
  });

  Then("permission checks should occur", () => {
    const accessErrors = eventLog.filter((e) => e.type === "accessError");
    expect(accessErrors.length).to.be.greaterThan(0);
  });

  Then("access errors should be handled", () => {
    const accessErrors = eventLog.filter((e) => e.type === "accessError");
    accessErrors.forEach((event) => {
      expect(event.error).to.have.property("message");
      expect(event.error).to.have.property("code");
    });
  });

  Then("appropriate feedback should be given", () => {
    const feedbackGiven = TestHelper.isFeedbackGiven();
    expect(feedbackGiven).to.be.true;
  });

  Then("secure operations should be maintained", () => {
    const secureOperations = TestHelper.areOperationsSecure();
    expect(secureOperations).to.be.true;
  });

  
// Scenario: Metadata Extraction Integration

Given("files contain embedded metadata", async () => {
  await TestHelper.createFilesWithMetadata(testDir);
});

  When("the metadata extractor processes files", async () => {
    const metadataPromises = testFiles.map(async (filePath) => {
      const metadata = await metadataExtractor.extract(filePath);
      eventLog.push({ type: "metadataExtracted", metadata });
      return metadata;
    });
    parseResults = await Promise.all(metadataPromises);
  });

  Then("metadata should be extracted asynchronously", () => {
    const metadataExtracted = eventLog.filter((e) => e.type === "metadataExtracted");
    expect(metadataExtracted.length).to.be.greaterThan(0);
  });

  Then("file operations should be optimized", () => {
    const optimizedOperations = TestHelper.areFileOperationsOptimized();
    expect(optimizedOperations).to.be.true;
  });

  Then("metadata cache should be updated", () => {
    const cacheUpdated = TestHelper.isMetadataCacheUpdated();
    expect(cacheUpdated).to.be.true;
  });

  Then("extraction events should be emitted", () => {
    const extractionEvents = eventLog.filter((e) => e.type === "metadataExtracted");
    expect(extractionEvents.length).to.be.greaterThan(0);
  });

// Scenario: File System Event Integration

Given("file system events are monitored", async () => {
  await TestHelper.setupFileSystemEventMonitoring(testDir);
});

  When("file system changes occur", async () => {
    await TestHelper.simulateFileSystemChange(testDir);
  });

  Then("events should be properly queued", () => {
    const queuedEvents = TestHelper.getQueuedEvents();
    expect(queuedEvents.length).to.be.greaterThan(0);
  });

  Then("event processing should be throttled", () => {
    const throttled = TestHelper.isEventProcessingThrottled();
    expect(throttled).to.be.true;
  });

  Then("duplicate events should be filtered", () => {
    const duplicateEvents = TestHelper.getDuplicateEvents();
    expect(duplicateEvents.length).to.be.equal(0);
  });

  Then("event handlers should be coordinated", () => {
    const handlersCoordinated = TestHelper.areEventHandlersCoordinated();
    expect(handlersCoordinated).to.be.true;
  });

// Scenario: Parser Cache Integration

Given("parsed files are cached", async () => {
  await TestHelper.cacheParsedFiles(testDir);
});

  When("cached files are accessed", async () => {
    parseResults = await TestHelper.accessCachedFiles(testDir);
  });

  Then("file system reads should be minimized", () => {
    const readCount = TestHelper.getFileReadCount();
    expect(readCount).to.be.lessThan(testFiles.length);
  });

  Then("cache invalidation should work", async () => {
    await TestHelper.invalidateCache(testDir);
    const isCacheValid = TestHelper.isCacheValid();
    expect(isCacheValid).to.be.false;
  });

  Then("memory limits should be respected", () => {
    const memoryUsage = TestHelper.getMemoryUsage();
    expect(memoryUsage).to.be.lessThan(300 * 1024 * 1024); // Less than 300MB
  });

  Then("cache stats should be maintained", () => {
    const cacheStats = TestHelper.getCacheStats();
    expect(cacheStats).to.have.property("hits");
    expect(cacheStats).to.have.property("misses");
});

// Scenario: Cleanup and Resource Management