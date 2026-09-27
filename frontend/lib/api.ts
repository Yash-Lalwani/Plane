export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.plane.yashlalwani.info/api/v1";

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  fields: FieldError[];

  constructor(status: number, message: string, fields: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// A 401 from these endpoints means wrong credentials or no session, so refreshing can't help.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh-token"];

// Every refresh rotates the refresh token, so only one may run at a time.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
};

export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { method = "GET", body, query } = options;

  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const isFormData = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      // Never set Content-Type for FormData: the browser adds it with the multipart boundary.
      headers: body !== undefined && !isFormData ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can’t reach Plane right now. Check your connection and try again.");
  }

  if (response.status === 401 && retry && !NO_REFRESH_PATHS.includes(path)) {
    await refreshSession();
    // Retry once even if this tab's refresh failed: another tab may have just refreshed the
    // shared cookie. A second 401 is final.
    return api<T>(path, options, false);
  }

  let payload: { data?: T; message?: string; errors?: FieldError[] } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Something went wrong (${response.status}). Please try again.`,
      payload?.errors ?? [],
    );
  }
  return payload?.data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
