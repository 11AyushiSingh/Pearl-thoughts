import { EmailService, EmailProvider, EmailStatus } from './EmailService';
import { MockEmailProvider } from './MockEmailProvider';

test('EmailService retries on failure and falls back to secondary provider', async () => {
    const primaryProvider = new MockEmailProvider('PrimaryProvider');
    const secondaryProvider = new MockEmailProvider('SecondaryProvider');
    const emailService = new EmailService(primaryProvider, secondaryProvider);

    await emailService.sendEmail('test@example.com', 'Subject', 'Body');
    const status = emailService.getStatus('test@example.com');

    expect(status).toBeDefined();
    expect(status?.attempts).toBeGreaterThan(0);
    expect(status?.success).toBe(true);
});

test('Circuit breaker opens after threshold failures', async () => {
    const primaryProvider = new MockEmailProvider('PrimaryProvider');
    jest.spyOn(primaryProvider, 'sendEmail').mockImplementation(async () => false);
    const secondaryProvider = new MockEmailProvider('SecondaryProvider');
    const emailService = new EmailService(primaryProvider, secondaryProvider, 3, 1000);

    await emailService.sendEmail('test@example.com', 'Subject', 'Body');
    const status = emailService.getStatus('test@example.com');

    expect(status).toBeDefined();
    expect(status?.provider).toBe('SecondaryProvider');
    expect(emailService['circuitBreakerOpen']).toBe(true);
});

test('Rate limiting enforces correct delay between requests', async () => {
    const primaryProvider = new MockEmailProvider('PrimaryProvider');
    const secondaryProvider = new MockEmailProvider('SecondaryProvider');
    const emailService = new EmailService(primaryProvider, secondaryProvider, 3, 1000, 1, 1000);

    await emailService.sendEmail('test1@example.com', 'Subject 1', 'Body 1');
    await emailService.sendEmail('test2@example.com', 'Subject 2', 'Body 2');

    const status1 = emailService.getStatus('test1@example.com');
    const status2 = emailService.getStatus('test2@example.com');

    expect(status1).toBeDefined();
    expect(status2).toBeDefined();
    expect(status1?.success).toBe(true);
    expect(status2?.success).toBe(true);
});
