import { Queue } from "bullmq";
import { redis } from "../config/redis.js";
import type { EmailContent } from "../utils/email-templates.js";

export type EmailJob = EmailContent & { to: string };

export const emailQueue = new Queue<EmailJob>("email", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const addEmailJob = async (email: EmailJob): Promise<void> => {
  await emailQueue.add("send-email", email);
};
