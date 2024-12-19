import * as fs from "fs/promises";
import * as path from "path";
import { ChatSegment, ChatMetadata } from '@models/types';

export class ParserModelsTestHelper {
  static async createTestFile(
    content: string,
    fileName: string,
    testDataDir: string
  ): Promise<string> {
    await fs.mkdir(testDataDir, { recursive: true });
    const filePath = path.join(testDataDir, fileName);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  static async createMultipleTestFiles(
    count: number,
    testDataDir: string
  ): Promise<string[]> {
    const files: string[] = [];
    for (let i = 0; i < count; i++) {
      const content = `
Me: Test message ${i}
Assistant: Response ${i}
`;
      const filePath = await this.createTestFile(
        content,
        `chat-${i}.log`,
        testDataDir
      );
      files.push(filePath);
    }
    return files;
  }

  static generateTestMetadata(): ChatMetadata {
    return {
      timestamp: new Date("2024-12-16T23:24:54Z").toISOString(),
      participants: ["test-user"],
      length: 100,
      keywords: ["test"],
      contentType: "text/plain"
    };
  }

  static validateSegment(segment: ChatSegment): boolean {
    return (
      typeof segment.id === "string" &&
      typeof segment.content === "string" &&
      segment.timestamp instanceof Date &&
      segment.metadata !== undefined
    );
  }

  static async cleanupTestFiles(testDataDir: string): Promise<void> {
    await fs.rm(testDataDir, { recursive: true, force: true });
  }
}
