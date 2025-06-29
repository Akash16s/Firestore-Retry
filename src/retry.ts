import * as admin from 'firebase-admin';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    jitterFactor?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds max delay
    jitterFactor: 0.1, // 10% jitter
};

/**
 * Helper function to detect retryable Firestore errors
 */
export const isRetryableFirestoreError = (error: any): boolean => {
    const errorMessage =
        error?.message?.toLowerCase() ||
        error?.details?.toLowerCase() ||
        error?.msg?.toLowerCase() ||
        '';
    const errorCode = error?.code;

    // RST_STREAM errors (specific case from the error stack)
    if (errorCode === 13 && errorMessage.includes('rst_stream')) {
        return true;
    }

    // Write quota exceeded errors
    if (
        errorMessage.includes('quota exceeded') ||
        errorMessage.includes('write limit')
    ) {
        return true;
    }

    // Connection and availability issues
    if (errorCode === 14 || errorMessage.includes('unavailable')) {
        return true;
    }

    // Timeout errors
    if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('deadline exceeded')
    ) {
        return true;
    }

    // Internal server errors
    if (errorCode === 13 || errorMessage.includes('internal server error')) {
        return true;
    }

    // Resource exhausted errors
    if (errorCode === 8 || errorMessage.includes('resource exhausted')) {
        return true;
    }

    return false;
};

/**
 * Helper function to sleep with Promise
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateDelay = (
    attempt: number,
    config: Required<RetryConfig>
): number => {
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;

    return Math.min(totalDelay, config.maxDelay);
};

/**
 * Retry any async operation with exponential backoff
 */
export const retryOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
    config: RetryConfig = {}
): Promise<T> => {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            // If it's the last attempt or error is not retryable, throw
            if (
                attempt === finalConfig.maxRetries ||
                !isRetryableFirestoreError(error)
            ) {
                throw error;
            }

            // Calculate delay for next attempt
            const delay = calculateDelay(attempt, finalConfig);

            console.warn(
                `${operationName} failed, retrying in ${Math.round(
                    delay
                )}ms. ` +
                    `Attempt ${attempt}/${finalConfig.maxRetries}. Error: ${error.message}`
            );

            await sleep(delay);
        }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(`Max retries exceeded for ${operationName}`);
};

/**
 * Retry Firestore batch commit with exponential backoff
 */
export const retryFirestoreBatchCommit = async (
    batch: admin.firestore.WriteBatch,
    config: RetryConfig = {}
): Promise<void> => {
    await retryOperation(
        () => batch.commit(),
        'Firestore batch commit',
        config
    );
};

/**
 * Retry any Firestore document operation
 */
export const retryFirestoreOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'document operation',
    config: RetryConfig = {}
): Promise<T> => {
    return retryOperation(operation, operationName, config);
};

/**
 * Batch operations with automatic retry
 */
export class RetryableBatch {
    private batch: admin.firestore.WriteBatch;
    private config: Required<RetryConfig>;
    private operationCount: number = 0;

    constructor(config: RetryConfig = {}) {
        this.batch = admin.firestore().batch();
        this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    }

    /**
     * Add a set operation to the batch
     */
    set(
        docRef: admin.firestore.DocumentReference,
        data: any,
        options?: admin.firestore.SetOptions
    ): this {
        if (options) {
            this.batch.set(docRef, data, options);
        } else {
            this.batch.set(docRef, data);
        }
        this.operationCount++;
        return this;
    }

    /**
     * Add an update operation to the batch
     */
    update(docRef: admin.firestore.DocumentReference, data: any): this {
        this.batch.update(docRef, data);
        this.operationCount++;
        return this;
    }

    /**
     * Add a delete operation to the batch
     */
    delete(docRef: admin.firestore.DocumentReference): this {
        this.batch.delete(docRef);
        this.operationCount++;
        return this;
    }

    /**
     * Commit the batch with retry logic
     */
    async commit(): Promise<void> {
        if (this.operationCount === 0) {
            console.warn('Attempting to commit empty batch');
            return;
        }

        return retryFirestoreBatchCommit(this.batch, this.config);
    }

    /**
     * Get the number of operations in the batch
     */
    getOperationCount(): number {
        return this.operationCount;
    }
}

/**
 * Create a new retryable batch
 */
export const createRetryableBatch = (
    config: RetryConfig = {}
): RetryableBatch => {
    return new RetryableBatch(config);
};

/**
 * Predefined retry configurations for different scenarios
 */
export const RetryConfigs = {
    /**
     * Fast retry for lightweight operations
     */
    FAST: {
        maxRetries: 3,
        baseDelay: 500,
        maxDelay: 5000,
    },

    /**
     * Standard retry for normal operations
     */
    STANDARD: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
    },

    /**
     * Aggressive retry for critical operations
     */
    AGGRESSIVE: {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 60000,
    },

    /**
     * Patient retry for large batch operations
     */
    PATIENT: {
        maxRetries: 7,
        baseDelay: 2000,
        maxDelay: 120000,
    },
} as const; 