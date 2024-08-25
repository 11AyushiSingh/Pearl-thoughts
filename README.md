# Email Service

A resilient email sending service in TypeScript that includes features like retry logic with exponential backoff, fallback between providers, idempotency, rate limiting, status tracking, and a circuit breaker pattern.

## Features

- **Retry Logic with Exponential Backoff**
- **Fallback Mechanism between Providers**
- **Idempotency to Prevent Duplicate Sends**
- **Rate Limiting**
- **Circuit Breaker Pattern**
- **Status Tracking**
- **Unit Tests with Jest**

## Getting Started

### Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/email-service.git
    cd email-service
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Compile TypeScript:
    ```bash
    npm run build
    ```

4. Run Tests:
    ```bash
    npm test
    ```

### Usage

1. Implement your email providers by extending the `EmailProvider` interface.

2. Create an instance of the `EmailService` by passing in the primary and secondary email providers:
    ```typescript
    import { EmailService } from './src/EmailService';
    import { MockEmailProvider } from './src/MockEmailProvider';

    const primaryProvider = new MockEmailProvider('PrimaryProvider');
    const secondaryProvider = new MockEmailProvider('SecondaryProvider');

    const emailService = new EmailService(primaryProvider, secondaryProvider);

    emailService.sendEmail('recipient@example.com', 'Subject', 'Email body content');
    ```

3. Monitor the status of email sends:
    ```typescript
    const status = emailService.getStatus('recipient@example.com');
    console.log(status);
    ```

### Configuration

You can configure the `EmailService` by passing optional parameters such as `maxRetries`, `retryDelay`, `rateLimitCount`, and `rateLimitWindowMs` when initializing the service.

### Testing

Run tests to ensure everything works as expected:

```bash
npm test
