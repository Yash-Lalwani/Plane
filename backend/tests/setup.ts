import { vi } from "vitest";

// Runs before every test file. Tests never queue real emails or upload real files;
// they assert on calls to these mocks instead.
vi.mock("../src/queues/email.queue.js", () => ({ addEmailJob: vi.fn() }));
vi.mock("../src/utils/file-storage.js", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));
