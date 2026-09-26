import { vi } from "vitest";

// Runs before every test file. Tests never queue real emails; they assert on addEmailJob calls.
vi.mock("../src/queues/email.queue.js", () => ({ addEmailJob: vi.fn() }));
