import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

export class TestHelper {
    private static fileOperations: Map<string, OperationStats> = new Map();
    private static memoryStats: MemoryStats = {
        initialUsage: 0,
        maxUsage: 0,
        currentUsage: 0
    };
    private static concurrentOps: number = 0;
    private static maxConcurrentOps: number = 0;

    static async createTestDirectory(): Promise<string> {
        const testDir = path.join(__dirname, 'test-data');
        await fs.mkdir(testDir, { recursive: true });
        return testDir;
    }

    static async cleanup(directory: string): Promise<void> {
        await fs.rm(directory, { recursive: true, force: true });
        this.fileOperations.clear();
        this.resetMemoryStats();
        this.concurrentOps = 0;
        this.maxConcurrentOps = 0;
    }

    static async checkFileSystemAccess(): Promise<boolean> {
        try {
            const testDir = await this.createTestDirectory();
            await fs.access(testDir);
            return true;
        } catch {
            return false;
        }
    }

    static async createTestFile(
        directory: string,
        filename: string,
        content: string
    ): Promise<string> {
        const filePath = path.join(directory, filename);
        const startTime = performance.now();
        await fs.writeFile(filePath, content);
        this.fileOperations.set(filePath, {
            startTime,
            endTime: performance.now(),
            isAsync: true
        });
        return filePath;
    }

    static generateChatContent(messageCount: number = 10): string {
        let content = '';
        for (let i = 0; i < messageCount; i++) {
            content += `Me: Test message ${i}\n`;
            content += `Assistant: Test response ${i}\n\n`;
        }
        return content;
    }

    static async createLargeTestFile(directory: string): Promise<string> {
        const filePath = path.join(directory, 'large-chat.log');
        const writeStream = require('fs').createWriteStream(filePath);
        const chunkSize = 1024 * 1024; // 1MB chunks
        let writtenSize = 0;
        const targetSize = 51 * 1024 * 1024; // 51MB

        while (writtenSize < targetSize) {
            const chunk = this.generateChatContent(100);
            writeStream.write(chunk);
            writtenSize += chunk.length;
            this.updateMemoryStats();
        }

        await new Promise(resolve => writeStream.end(resolve));
        return filePath;
    }

    static async createMultipleTestFiles(
        directory: string,
        count: number
    ): Promise<string[]> {
        const files: string[] = [];
        for (let i = 0; i < count; i++) {
            this.concurrentOps++;
            this.maxConcurrentOps = Math.max(this.maxConcurrentOps, this.concurrentOps);
            const file = await this.createTestFile(
                directory,
                `chat-${i}.log`,
                this.generateChatContent()
            );
            files.push(file);
            this.concurrentOps--;
        }
        return files;
    }

    static async setupFileSystemScenarios(directory: string): Promise<void> {
        // Create various file system scenarios
        await this.createTestFile(directory, 'readonly.log', 'readonly content');
        await fs.chmod(path.join(directory, 'readonly.log'), 0o444);

        await this.createTestFile(directory, 'empty.log', '');

        const lockedFile = path.join(directory, 'locked.log');
        await this.createTestFile(directory, 'locked.log', 'locked content');
        // Simulate file lock
        const handle = await fs.open(lockedFile, 'r');
        await handle.close();
    }

    static async modifyTestFile(filePath: string): Promise<void> {
        const content = await fs.readFile(filePath, 'utf-8');
        await fs.writeFile(filePath, content + '\nMe: Modified message\n');
    }

    static async createFilesWithMetadata(directory: string): Promise<string[]> {
        const files: string[] = [];
        for (let i = 0; i < 3; i++) {
            const content = `
[timestamp=2024-12-16T23:51:07Z]
[model=gpt-4]
[conversation_id=test-${i}]
Me: Test message with metadata ${i}
Assistant: Response with metadata ${i}
`;
            const file = await this.createTestFile(directory, `metadata-${i}.log`, content);
            files.push(file);
        }
        return files;
    }

    static wasFileReadAsync(): boolean {
        return Array.from(this.fileOperations.values()).every(op => op.isAsync);
    }

    static getChunkCount(): number {
        return Math.ceil(this.memoryStats.maxUsage / (1024 * 1024));
    }

    static getMemoryStats(): MemoryStats {
        return this.memoryStats;
    }

    static getConcurrentOperations(): number {
        return this.maxConcurrentOps;
    }

    private static updateMemoryStats(): void {
        const usage = process.memoryUsage();
        this.memoryStats.currentUsage = usage.heapUsed;
        this.memoryStats.maxUsage = Math.max(
            this.memoryStats.maxUsage,
            usage.heapUsed
        );
    }

    private static resetMemoryStats(): void {
        this.memoryStats = {
            initialUsage: 0,
            maxUsage: 0,
            currentUsage: 0
        };
    }

    static async simulateFileSystemError(operation: string): Promise<Error> {
        switch (operation) {
            case 'access':
                return await fs.access('nonexistent.log')
                    .then(() => new Error('Expected error did not occur'))
                    .catch(error => error);
            case 'read':
                return await fs.readFile('nonexistent.log')
                    .then(() => new Error('Expected error did not occur'))
                    .catch(error => error);
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    static validateFileOperation(filePath: string): boolean {
        const stats = this.fileOperations.get(filePath);
        return stats !== undefined && stats.endTime > stats.startTime;
    }
}

interface OperationStats {
    startTime: number;
    endTime: number;
    isAsync: boolean;
}

interface MemoryStats {
    initialUsage: number;
    maxUsage: number;
    currentUsage: number;
}
