const RECENT_TRIPS_KEY = "globehub_recent_trips";

export function getRecentTripIds(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_TRIPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToRecentTrips(tripId: string) {
  try {
    const current = getRecentTripIds().filter((id) => id !== tripId);
    const updated = [tripId, ...current].slice(0, 20);
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}
