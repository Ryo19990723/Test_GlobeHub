import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export interface MyTrip {
  id: string;
  title: string;
  isPublic: boolean;
  status: "DRAFT" | "PUBLISHED";
  journalText: string | null;
  heroUrl: string | null;
  updatedAt: string;
  spots?: { photos?: { url: string }[] }[];
  _count?: { spots: number };
}

/** The signed-in user's trips, split into "still recording" and "journal made". */
export function useMyTrips() {
  const { isLoggedIn } = useAuth();
  const query = useQuery<{ items: MyTrip[] }>({
    queryKey: ["/api/trips", "mine"],
    queryFn: () => api.trips.getAll({ mine: "1", pageSize: 50 }),
    enabled: isLoggedIn,
  });
  const items = query.data?.items ?? [];
  return {
    ...query,
    active: items.filter((t) => !t.journalText),
    done: items.filter((t) => !!t.journalText),
  };
}

export const tripThumb = (t: MyTrip) => t.heroUrl || t.spots?.[0]?.photos?.[0]?.url;
