// tests/mocks/fs.ts
import { FileHandle } from "fs/promises";

export class MockStats {
  size: number;

  constructor(size: number = 1024) {
    this.size = size;
  }

  isFile() {
    return true;
  }
  isDirectory() {
    return false;
  }
}

export const mockFileHandle: jest.Mocked<Partial<FileHandle>> = {
  read: jest
    .fn()
    .mockImplementation(
      (buffer: Buffer, offset: number, length: number, position: number) => {
        return Promise.resolve({
          bytesRead: buffer.length,
          buffer: buffer,
        });
      }
    ),
  close: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from("")),
};

export const mockFsPromises = {
  stat: jest.fn().mockImplementation((path: string) => {
    return Promise.resolve(new MockStats());
  }),

  open: jest.fn().mockImplementation(() => {
    return Promise.resolve(mockFileHandle);
  }),

  readFile: jest.fn().mockImplementation(() => {
    return Promise.resolve(Buffer.from(""));
  }),

  readdir: jest.fn().mockResolvedValue(["test.txt"]),
  access: jest.fn().mockResolvedValue(undefined),
};

export default mockFsPromises;

export type MockFS = typeof mockFsPromises;
