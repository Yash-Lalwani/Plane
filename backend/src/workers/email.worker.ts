import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { EmailJob } from "../queues/email.queue.js";

// A worker waits on Redis with blocking commands, which BullMQ only allows when
// ioredis retries forever (maxRetriesPerRequest: null) instead of giving up.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// env.ts only allows a missing key in development.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const sendEmail = async (email: EmailJob): Promise<void> => {
  if (!resend) {
    logger.info(
      { to: email.to, subject: email.subject, text: email.text },
      "RESEND_API_KEY not set, email logged instead of sent",
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  // Throwing marks the job as failed so BullMQ retries it.
  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
};

const worker = new Worker<EmailJob>("email", (job) => sendEmail(job.data), {
  connection,
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, to: job.data.to }, "Email job completed");
});

worker.on("failed", (job, error) => {
  logger.error(
    {
      jobId: job?.id,
      to: job?.data.to,
      attemptsMade: job?.attemptsMade,
      err: error,
    },
    "Email job failed",
  );
});

logger.info("Email worker started");

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, closing email worker`);
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
