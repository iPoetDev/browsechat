import { ChatSegment, ChatMetadata, ChatSequence } from '@models/types';
import { DataModelManager } from '@models/DataModelManager';
import { ChatSegmentImpl } from '@models/ChatSegment';
import { ChatSequenceImpl } from '@models/ChatSequence';
import { ChatMetadataImpl } from '@models/ChatMetadata';
import { DataModelEventType } from '@models/events';

export class ModelsTestHelper {
    static createTestMetadata(overrides: Partial<ChatMetadata> = {}): ChatMetadata {
        return new ChatMetadataImpl({
            participants: ["test-user"],
            length: 100,
            keywords: ["test"],
            timestamp: new Date().toISOString(),
            contentType: "text/plain",
            ...overrides
        });
    }

    static createTestSegment(
        content: string,
        sequenceId: string,
        metadata: ChatMetadata = this.createTestMetadata()
    ): ChatSegment {
        return new ChatSegmentImpl(
            content,
            0,
            content.length,
            metadata,
            { sequenceId, timestamp: Date }
        );
    }

    static createTestSequence(
        filePath: string,
        segments: ChatSegment[] = []
    ): ChatSequence {
        return new ChatSequenceImpl(filePath, segments);
    }

    static async setupTestDataModel(): Promise<DataModelManager> {
        const manager = new DataModelManager();
        const metadata = this.createTestMetadata();
        
        // Create test segments
        const sequence = this.createTestSequence('test-file.log', []);
        const segments = [
            this.createTestSegment('content 1', sequence.id, metadata),
            this.createTestSegment('content 2', sequence.id, metadata)
        ];

        // Process segments
        for (const segment of segments) {
            await manager.processSegment(segment);
        }

        return manager;
    }

    static createEventLogger() {
        const events: any[] = [];
        return {
            log: (event: any) => events.push(event),
            getEvents: () => events,
            clear: () => events.length = 0,
            getEventsByType: (type: DataModelEventType) => 
                events.filter(e => e.type === type)
        };
    }

    static async validateModelConsistency(manager: DataModelManager): Promise<boolean> {
        const sequences = manager.getAllSequences();
        const segments = manager.getAllSegments();

        // Check all segments are properly linked
        const allSegmentsLinked = segments.every((segment: ChatSegment) => 
            sequences.some((seq: ChatSequence) => 
                seq.segments.some((s: ChatSegment) => s.id === segment.id)
            )
        );

        // Check all metadata is valid
        const allMetadataValid = segments.every((segment: ChatSegment) => {
            const metadata = segment.metadata;
            return metadata && 
                   typeof metadata.timestamp === 'string' &&
                   metadata.participants.length > 0 &&
                   typeof metadata.length === 'number';
        });

        return allSegmentsLinked && allMetadataValid;
    }

    static generateConcurrentOperations(manager: DataModelManager, count: number) {
        const sequence = this.createTestSequence('concurrent-test.log', []);
        return Array(count).fill(null).map((_, index) => {
            const segment = this.createTestSegment(
                `content ${index}`,
                sequence.id,
                this.createTestMetadata()
            );
            return manager.processSegment(segment);
        });
    }
}
