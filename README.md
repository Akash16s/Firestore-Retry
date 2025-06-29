# Firestore Retry

A robust retry mechanism for Firebase Firestore operations with exponential backoff and configurable retry strategies.

## Features

- ✅ **Exponential Backoff**: Intelligent retry delays that increase exponentially with jitter
- ✅ **Firestore Error Detection**: Automatically detects retryable Firestore errors
- ✅ **Configurable Retry Strategies**: Pre-defined configurations for different use cases
- ✅ **Batch Operations**: Retryable batch operations with built-in retry logic
- ✅ **TypeScript Support**: Full TypeScript support with proper type definitions
- ✅ **Zero Dependencies**: Only requires firebase-admin as a peer dependency

## Installation

```bash
npm install firestore-retry
# or
yarn add firestore-retry
```

**Peer Dependencies:**

```bash
npm install firebase-admin
```

## Quick Start

```typescript
import { retryFirestoreOperation, RetryConfigs } from 'firestore-retry';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (if not already done)
admin.initializeApp();

const db = admin.firestore();

// Retry a simple document operation
await retryFirestoreOperation(
    () => db.collection('users').doc('user1').get(),
    'Get user document',
    RetryConfigs.STANDARD
);
```

## Usage Examples

### Basic Retry Operation

```typescript
import { retryOperation, RetryConfigs } from 'firestore-retry';

// Retry any async operation
const result = await retryOperation(
    async () => {
        // Your async operation here
        const doc = await db.collection('users').doc('123').get();
        return doc.data();
    },
    'Fetch user data',
    RetryConfigs.FAST
);
```

### Firestore Document Operations

```typescript
import { retryFirestoreOperation } from 'firestore-retry';

// Create a document with retry
await retryFirestoreOperation(
    () =>
        db.collection('users').doc('user1').set({
            name: 'John Doe',
            email: 'john@example.com',
        }),
    'Create user document'
);

// Update a document with retry
await retryFirestoreOperation(
    () =>
        db.collection('users').doc('user1').update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        }),
    'Update user last login'
);

// Delete a document with retry
await retryFirestoreOperation(
    () => db.collection('users').doc('user1').delete(),
    'Delete user document'
);
```

### Batch Operations

```typescript
import { createRetryableBatch, RetryConfigs } from 'firestore-retry';

// Create a retryable batch
const batch = createRetryableBatch(RetryConfigs.PATIENT);

// Add operations to the batch
const userRef = db.collection('users').doc('user1');
const profileRef = db.collection('profiles').doc('user1');

batch
    .set(userRef, { name: 'John Doe', email: 'john@example.com' })
    .set(profileRef, { bio: 'Software developer', avatar: 'avatar.jpg' })
    .update(userRef, {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

// Commit with automatic retry
await batch.commit();

console.log(`Batch completed with ${batch.getOperationCount()} operations`);
```

### Custom Retry Configuration

```typescript
import { retryFirestoreOperation, RetryConfig } from 'firestore-retry';

const customConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 60000, // 1 minute max
    jitterFactor: 0.2, // 20% jitter
};

await retryFirestoreOperation(
    () => db.collection('logs').add({ message: 'Custom retry config' }),
    'Add log entry',
    customConfig
);
```

## API Reference

### Interfaces

#### `RetryConfig`

Configuration object for retry behavior.

```typescript
interface RetryConfig {
    maxRetries?: number; // Maximum number of retry attempts (default: 5)
    baseDelay?: number; // Base delay in milliseconds (default: 1000)
    maxDelay?: number; // Maximum delay in milliseconds (default: 30000)
    jitterFactor?: number; // Jitter factor for randomization (default: 0.1)
}
```

### Functions

#### `retryOperation<T>(operation, operationName?, config?): Promise<T>`

Retry any async operation with exponential backoff.

- `operation`: The async function to retry
- `operationName`: Optional name for logging purposes
- `config`: Optional retry configuration

#### `retryFirestoreOperation<T>(operation, operationName?, config?): Promise<T>`

Specialized retry function for Firestore operations.

#### `retryFirestoreBatchCommit(batch, config?): Promise<void>`

Retry a Firestore batch commit operation.

#### `isRetryableFirestoreError(error): boolean`

Determines if a Firestore error is retryable.

#### `createRetryableBatch(config?): RetryableBatch`

Creates a new RetryableBatch instance.

### Classes

#### `RetryableBatch`

A wrapper around Firestore WriteBatch with built-in retry logic.

**Methods:**

- `set(docRef, data, options?)`: Add a set operation
- `update(docRef, data)`: Add an update operation
- `delete(docRef)`: Add a delete operation
- `commit()`: Commit the batch with retry logic
- `getOperationCount()`: Get the number of operations in the batch

### Predefined Configurations

#### `RetryConfigs`

Pre-defined retry configurations for common scenarios:

```typescript
RetryConfigs.FAST; // Quick retries for lightweight operations
RetryConfigs.STANDARD; // Default configuration for most operations
RetryConfigs.AGGRESSIVE; // Aggressive retries for critical operations
RetryConfigs.PATIENT; // Patient retries for large batch operations
```

## Error Handling

The library automatically detects and retries the following Firestore errors:

- **RST_STREAM errors** (gRPC connection resets)
- **Quota exceeded errors** (write limits)
- **Unavailable errors** (service temporarily unavailable)
- **Timeout errors** (operation timeouts)
- **Internal server errors** (transient server issues)
- **Resource exhausted errors** (rate limiting)

Non-retryable errors (like permission denied, document not found, etc.) are immediately thrown without retry attempts.

## TypeScript Support

This package is written in TypeScript and includes complete type definitions. All functions and classes are fully typed for the best development experience.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### 1.0.0

- Initial release
- Basic retry functionality with exponential backoff
- Firestore-specific error detection
- RetryableBatch class for batch operations
- Pre-defined retry configurations
- Full TypeScript support
