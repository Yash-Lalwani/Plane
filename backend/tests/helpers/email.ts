import { vi } from "vitest";
import { addEmailJob } from "../../src/queues/email.queue.js";
import { testEnv } from "./test-env.js";

// Reads the raw token from the link in the most recent queued email, e.g. path "verify-email".
export const getTokenFromLastEmail = (path: string): string => {
  const email = vi.mocked(addEmailJob).mock.lastCall?.[0];
  const pattern = new RegExp(`${testEnv.CLIENT_URL}/${path}/([a-f0-9]{64})`);
  const match = email?.text.match(pattern);
  if (!match) {
    throw new Error(`No ${path} link found in the last email`);
  }
  return match[1];
};
