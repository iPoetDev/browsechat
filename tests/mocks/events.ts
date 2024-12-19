import { Stats } from 'fs';
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock event emitter for file system events
export class MockEventEmitter extends EventEmitter {
    private handlers: Map<string, Function[]> = new Map();

    on(event: string, handler: Function): this {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event)?.push(handler);
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        const handlers = this.handlers.get(event) || [];
        handlers.forEach(handler => handler(...args));
        return handlers.length > 0;
    }

    removeAllListeners(event?: string): this {
        if (event) {
            this.handlers.delete(event);
        } else {
            this.handlers.clear();
        }
        return this;
    }
}

// Mock file system watcher
export class MockFileSystemWatcher {
    private emitter: MockEventEmitter;
    public ignoreCreateEvents: boolean = false;
    public ignoreChangeEvents: boolean = false;
    public ignoreDeleteEvents: boolean = false;

    constructor() {
        this.emitter = new MockEventEmitter();
    }

    onDidCreate(handler: Function): { dispose: () => void } {
        this.emitter.on('create', handler);
        return {
            dispose: () => this.emitter.removeAllListeners('create')
        };
    }

    onDidChange(handler: Function): { dispose: () => void } {
        this.emitter.on('change', handler);
        return {
            dispose: () => this.emitter.removeAllListeners('change')
        };
    }

    onDidDelete(handler: Function): { dispose: () => void } {
        this.emitter.on('delete', handler);
        return {
            dispose: () => this.emitter.removeAllListeners('delete')
        };
    }

    dispose(): void {
        this.emitter.removeAllListeners();
    }

    // Helper methods for testing
    triggerCreate(uri: any): void {
        if (!this.ignoreCreateEvents) {
            this.emitter.emit('create', uri);
        }
    }

    triggerChange(uri: any): void {
        if (!this.ignoreChangeEvents) {
            this.emitter.emit('change', uri);
        }
    }

    triggerDelete(uri: any): void {
        if (!this.ignoreDeleteEvents) {
            this.emitter.emit('delete', uri);
        }
    }
}

// Base mock stats implementation
const baseMockStats: Stats = {
    isFile: () => false,
    isDirectory: () => true,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 0,
    blksize: 4096,
    blocks: 8,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date()
};

// Type for fs.promises functions
type FSPromisesFn<T> = (...args: any[]) => Promise<T>;

// Mock fs promises
export const mockEventFS = {
    promises: {
        stat: jest.fn().mockImplementation((() => Promise.resolve({ ...baseMockStats })) as FSPromisesFn<Stats>),
        readFile: jest.fn().mockImplementation((() => Promise.resolve(Buffer.from(''))) as FSPromisesFn<Buffer>),
        access: jest.fn().mockImplementation((() => Promise.resolve()) as FSPromisesFn<void>)
    }
};

// Helper for creating mock stats
export function createMockStats(options: Partial<Stats> = {}): Stats {
    return {
        ...baseMockStats,
        ...options
    };
}