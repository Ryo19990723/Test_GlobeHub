// API client helper functions
import { apiRequest } from "@/lib/queryClient";

// Save spot location with timeout and retry
export async function saveSpotLocation(
  payload: {
    spotId: string;
    lat: number;
    lng: number;
    name?: string;
    placeName?: string;
    address?: string;
    locationSource?: string;
    meta?: string;
  },
  signal?: AbortSignal
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/spots/${payload.spotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: payload.lat,
          lng: payload.lng,
          name: payload.name,
          placeName: payload.placeName,
          address: payload.address,
          locationSource: payload.locationSource,
          meta: payload.meta,
        }),
        signal: signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return res.json();
    } catch (e: any) {
      lastError = e;
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastError || new Error("Failed to save location");
}

export const api = {
  // Auth
  auth: {
    getAnonymousSession: () => apiRequest("POST", "/api/auth/anon", {}),
  },

  // Trips
  trips: {
    create: (data: { title: string }) =>
      apiRequest("POST", "/api/trips", data),

    getAll: (params?: Record<string, any>) =>
      apiRequest("GET", `/api/trips?${new URLSearchParams(params).toString()}`),

    getById: (id: string) =>
      apiRequest("GET", `/api/trips/${id}`),

    update: (id: string, data: any) =>
      apiRequest("PATCH", `/api/trips/${id}`, data),

    publish: (id: string) =>
      apiRequest("POST", `/api/trips/${id}/publish`, {}),

    like: (id: string) =>
      apiRequest("POST", `/api/trips/${id}/like`, {}),

    unlike: (id: string) =>
      apiRequest("DELETE", `/api/trips/${id}/like`),

    save: (id: string) =>
      apiRequest("POST", `/api/trips/${id}/save`, {}),

    unsave: (id: string) =>
      apiRequest("DELETE", `/api/trips/${id}/save`),
  },

  // Spots
  spots: {
    create: (tripId: string, data: any) =>
      apiRequest("POST", `/api/trips/${tripId}/spots`, data),

    update: (id: string, data: any) =>
      apiRequest("PATCH", `/api/spots/${id}`, data),

    delete: (id: string) =>
      apiRequest("DELETE", `/api/spots/${id}`),
  },

  // Photos
  photos: {
    upload: async (spotId: string, files: File[], captions?: string[]) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append("photos", file);
        if (captions && captions[index]) {
          formData.append(`caption_${index}`, captions[index]);
        }
      });

      const response = await fetch(`/api/spots/${spotId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "写真のアップロードに失敗しました");
      }

      return response.json();
    },

    delete: (id: string) =>
      apiRequest("DELETE", `/api/photos/${id}`),
  },

  // Search
  search: {
    trips: (params: Record<string, any>) =>
      apiRequest("GET", `/api/search/trips?${new URLSearchParams(params).toString()}`),
  },
};