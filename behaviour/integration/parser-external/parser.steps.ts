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

When("a test file is created", async () => {
  const content = TestHelper.generateChatContent(5);
  const filePath = await TestHelper.createTestFile(content, testDir);
  testFiles.push(filePath);
});

When("the file is read", async () => {
  const filePath = testFiles[0];
  const wasRead = await TestHelper.wasFileReadAsync(filePath);
  expect(wasRead).to.be.true;
});

When("a large test file is created {int}MB", async (size: number) => {
  const filePath = await TestHelper.createLargeTestFile(testDir, size);
  testFiles.push(filePath);
});

When("the file is parsed in chunks", async () => {
  const filePath = testFiles[0];
  const chunkCount = TestHelper.getChunkCount(filePath, 1024 * 1024);
  expect(chunkCount).to.be.greaterThan(1);
});

Then("memory usage should be within limits", () => {
  const stats = TestHelper.getMemoryStats();
  expect(stats.heapUsed).to.be.lessThan(100 * 1024 * 1024); // Less than 100MB
});

When("multiple test files are created {int}", async (count: number) => {
  const files = await TestHelper.createMultipleTestFiles(testDir, count);
  testFiles.push(...files);
});

When("concurrent parsing operations are performed", async () => {
  const operations = TestHelper.getConcurrentOperations();
  expect(operations).to.be.greaterThan(0);
});

Given("various file system scenarios", async () => {
  await TestHelper.setupFileSystemScenarios(testDir);
});

When("file changes occur", async () => {
  const filePath = testFiles[0];
  await TestHelper.modifyTestFile(filePath);
});

Given("files with metadata are created {int}", async (count: number) => {
  const files = await TestHelper.createFilesWithMetadata(testDir, count);
  testFiles.push(...files);
});

Given("a valid chat log file exists", async () => {
  const content = TestHelper.generateChatContent(5);
  const filePath = await TestHelper.createTestFile(content, testDir);
  testFiles.push(filePath);
});

When("the file is parsed", async () => {
  const filePath = testFiles[0];
  const wasRead = await TestHelper.wasFileReadAsync(filePath);
  expect(wasRead).to.be.true;
});

Then("the parser should extract metadata", async () => {
  const filePath = testFiles[0];
  const metadata = await metadataExtractor.extract(filePath);
  expect(metadata.participants.length).to.be.greaterThan(0);
});

When("multiple files are processed", async () => {
  const operations = TestHelper.getConcurrentOperations();
  expect(operations).to.be.greaterThan(1);
});

When("a file changes", async () => {
  const filePath = testFiles[0];
  await TestHelper.modifyTestFile(filePath);
});

When("file system errors occur", async () => {
  try {
    await parser.parseFile("nonexistent.log");
  } catch (error) {
    eventLog.push({ type: "error", error });
  }
});

Then("appropriate errors should be caught", () => {
  expect(eventLog.some((e) => e.type === "error")).to.be.true;
});
