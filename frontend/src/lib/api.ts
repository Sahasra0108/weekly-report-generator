const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** FastAPI returns 422 with a list of per-field problems. Flatten it for form display. */
function parseValidationErrors(detail: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  let message = "Please check the highlighted fields";

  if (Array.isArray(detail)) {
    for (const item of detail) {
      const loc = Array.isArray(item?.loc) ? item.loc : [];
      // loc looks like ["body", "tasks", 0, "task_name"] - drop the "body" prefix
      const path = loc.slice(1).join(".");
      const msg = typeof item?.msg === "string" ? item.msg : "Invalid value";
      if (path) {
        fieldErrors[path] = msg;
      } else {
        message = msg;
      }
    }
  }

  return { message, fieldErrors };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Is the backend running?");
  }

  if (res.status === 204) {
    return null as T;
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 422 && body?.detail) {
      const { message, fieldErrors } = parseValidationErrors(body.detail);
      throw new ApiError(422, message, fieldErrors);
    }
    const detail =
      typeof body?.detail === "string" ? body.detail : "Something went wrong";
    throw new ApiError(res.status, detail);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  put: <T>(path: string, data: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

/** Build a query string, skipping null and undefined values. */
export function qs(params: Record<string, string | number | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}