import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  console.log(`[API Request] ${method} ${url}`, { body: data });
  const res = await fetch(url, options);

  console.log(`[API Response] ${method} ${url} ${res.status}`, {
    url: res.url,
    status: res.status,
    contentType: res.headers.get("content-type"),
  });

  await throwIfResNotOk(res);
  
  // Check content-type before parsing JSON
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await res.text();
    console.error(`[API Error] Non-JSON response from ${method} ${url}:`, {
      url: res.url,
      status: res.status,
      contentType,
      body: text.substring(0, 200),
    });
    throw new Error(`Invalid response format: expected JSON but got ${contentType}`);
  }
  
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Check content-type before parsing JSON
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await res.text();
      console.error(`[API] Non-JSON response from GET ${url}:`, { contentType, text: text.substring(0, 500) });
      throw new Error(`Invalid response format: expected JSON but got ${contentType}`);
    }
    
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
