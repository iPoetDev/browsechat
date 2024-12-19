import { ChatMetadata } from '../../src/models/types';

export class MockChatMetadata implements ChatMetadata {
    constructor(
        public participants: string[] = [],
        public length: number = 0,
        public keywords: string[] = []
    ) {}

    merge(other: ChatMetadata): ChatMetadata {
        return new MockChatMetadata(
            [...new Set([...this.participants, ...(other.participants || [])])],
            this.length + other.length,
            [...new Set([...this.keywords, ...(other.keywords || [])])]
        );
    }
}

export const createMockMetadata = (
    participants: string[] = [],
    length: number = 0,
    keywords: string[] = []
): ChatMetadata => {
    return new MockChatMetadata(participants, length, keywords);
}
