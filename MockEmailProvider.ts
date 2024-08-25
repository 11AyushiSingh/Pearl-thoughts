
class MockEmailProvider implements EmailProvider {
    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    async sendEmail(recipient: string, subject: string, body: string): Promise<boolean> {
        console.log(`Sending email to ${recipient} via ${this.name}`);
        return Math.random() > 0.5; // Simulate random failure
    }
}
