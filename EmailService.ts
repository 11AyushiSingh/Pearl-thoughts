type EmailProvider = {
    name: string;
    sendEmail: (recipient: string, subject: string, body: string) => Promise<boolean>;
};

interface EmailStatus {
    recipient: string;
    subject: string;
    attempts: number;
    provider: string;
    success: boolean;
    error?: string;
}

class EmailService {
    private primaryProvider: EmailProvider;
    private secondaryProvider: EmailProvider;
    private maxRetries: number;
    private retryDelay: number;
    private statusTracker: Map<string, EmailStatus>;
    private rateLimitCount: number;
    private rateLimitWindowMs: number;
    private requestQueue: (() => Promise<void>)[];
    private primaryProviderFailures: number = 0;
    private circuitBreakerThreshold: number = 3;
    private circuitBreakerTimeout: number = 30000; // 30 seconds
    private circuitBreakerOpen: boolean = false;

    constructor(
        primaryProvider: EmailProvider,
        secondaryProvider: EmailProvider,
        maxRetries = 3,
        retryDelay = 1000,
        rateLimitCount = 5,
        rateLimitWindowMs = 60000
    ) {
        this.primaryProvider = primaryProvider;
        this.secondaryProvider = secondaryProvider;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.statusTracker = new Map();
        this.rateLimitCount = rateLimitCount;
        this.rateLimitWindowMs = rateLimitWindowMs;
        this.requestQueue = [];
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async rateLimiter() {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                await request();
                await this.sleep(this.rateLimitWindowMs / this.rateLimitCount);
            }
        }
    }

    private async sendWithRetry(
        provider: EmailProvider,
        recipient: string,
        subject: string,
        body: string
    ): Promise<boolean> {
        if (provider === this.primaryProvider && this.circuitBreakerOpen) {
            console.log(`Circuit breaker open for ${this.primaryProvider.name}. Using secondary provider.`);
            return false;
        }

        let attempts = 0;
        while (attempts < this.maxRetries) {
            try {
                const success = await provider.sendEmail(recipient, subject, body);
                if (success) {
                    if (provider === this.primaryProvider) {
                        this.primaryProviderFailures = 0; // Reset failures on success
                    }
                    return true;
                }
            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed: ${(error as Error).message}`);
                await this.sleep(this.retryDelay * 2 ** attempts);
            }
            attempts++;
        }

        if (provider === this.primaryProvider) {
            this.primaryProviderFailures++;
            if (this.primaryProviderFailures >= this.circuitBreakerThreshold) {
                this.circuitBreakerOpen = true;
                setTimeout(() => {
                    this.circuitBreakerOpen = false;
                    console.log(`Circuit breaker reset for ${this.primaryProvider.name}`);
                }, this.circuitBreakerTimeout);
            }
        }

        return false;
    }

    public async sendEmail(recipient: string, subject: string, body: string): Promise<void> {
        if (this.statusTracker.has(recipient)) {
            console.log('Email already sent or being sent to this recipient.');
            return;
        }

        this.statusTracker.set(recipient, {
            recipient,
            subject,
            attempts: 0,
            provider: '',
            success: false,
        });

        const sendRequest = async () => {
            let success = await this.sendWithRetry(this.primaryProvider, recipient, subject, body);
            if (!success) {
                console.log('Primary provider failed, switching to secondary.');
                success = await this.sendWithRetry(this.secondaryProvider, recipient, subject, body);
            }

            const status = this.statusTracker.get(recipient);
            if (status) {
                status.success = success;
                status.provider = success ? this.primaryProvider.name : this.secondaryProvider.name;
                status.attempts++;
                this.statusTracker.set(recipient, status);
            }
        };

        this.requestQueue.push(sendRequest);
        this.rateLimiter();
    }

    public getStatus(recipient: string): EmailStatus | undefined {
        return this.statusTracker.get(recipient);
    }
}

export { EmailService, EmailProvider, EmailStatus };
