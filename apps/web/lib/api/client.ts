/**
 * HTTP client for API calls.
 * - Base URL from NEXT_PUBLIC_API_BASE_URL
 * - Auth: Authorization: Bearer <token> or X-Dev-User-Id (dev)
 */

export interface ApiClientOptions {
  baseUrl: string;
  getAuth?: () => Promise<{ token?: string | null; userId?: string | null }>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private getAuth?: () => Promise<{ token?: string | null; userId?: string | null }>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAuth = options.getAuth;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.getAuth) {
      const auth = await this.getAuth();
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.userId) {
        headers['X-Dev-User-Id'] = auth.userId;
      }
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const headers = await this.getHeaders();
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }
    if (!res.ok) {
      const msg =
        (body && typeof body === 'object' && 'message' in body
          ? String((body as { message?: string }).message)
          : null) || res.statusText || `HTTP ${res.status}`;
      throw new ApiClientError(msg, res.status, body);
    }
    return body as T;
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  async post<T>(path: string, body?: unknown, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('POST', path, { body, query });
  }

  async put<T>(path: string, body?: unknown, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('PUT', path, { body, query });
  }

  async patch<T>(path: string, body?: unknown, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('PATCH', path, { body, query });
  }

  async delete<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>('DELETE', path, { query, body });
  }
}
