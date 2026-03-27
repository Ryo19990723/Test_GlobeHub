
import axios from "axios";

export interface SpotCandidate {
  placeId: string;
  name: string;
  category?: string;
  address?: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
  source: "current" | "photo" | "search";
  provider: "nominatim" | "overpass" | "photon";
  confidence: number;
}

export interface LocationProvider {
  searchPlaces(query: string, lat?: number, lng?: number, limit?: number): Promise<SpotCandidate[]>;
  nearbyPlaces(lat: number, lng: number, radius?: number, limit?: number): Promise<SpotCandidate[]>;
  reversePlace(lat: number, lng: number): Promise<SpotCandidate | null>;
}

class OSMLocationProvider implements LocationProvider {
  private nominatimBase = process.env.NOMINATIM_BASE || "https://nominatim.openstreetmap.org";
  private overpassBase = process.env.OVERPASS_BASE || "https://overpass-api.de/api/interpreter";
  private photonBase = "https://photon.komoot.io/api";
  private userAgent = "GlobeHub/1.0";

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calculateConfidence(distance: number, importance?: number, hasName?: boolean): number {
    const distanceScore = Math.max(0, 1 - distance / 500);
    const importanceScore = importance || 0;
    const nameScore = hasName ? 0.1 : 0;
    return 0.6 * distanceScore + 0.3 * importanceScore + nameScore;
  }

  private getCategoryFromTags(tags: any): string | undefined {
    if (tags.tourism) return tags.tourism;
    if (tags.amenity) return tags.amenity;
    if (tags.shop) return tags.shop;
    if (tags.leisure) return tags.leisure;
    if (tags.historic) return tags.historic;
    return undefined;
  }

  async searchPlaces(query: string, lat?: number, lng?: number, limit = 20): Promise<SpotCandidate[]> {
    const results: SpotCandidate[] = [];

    // ── 1. Photon (primary: excellent Japanese/multilingual support) ──
    try {
      const photonParams: Record<string, any> = {
        q: query,
        limit: Math.min(limit, 15),
      };
      // Use as location bias (not strict bounding)
      if (lat !== undefined && lng !== undefined) {
        photonParams.lat = lat;
        photonParams.lon = lng;
      }

      const photonRes = await axios.get(`${this.photonBase}/`, {
        params: photonParams,
        headers: { "User-Agent": this.userAgent },
        timeout: 6000,
      });

      for (const feature of photonRes.data?.features ?? []) {
        const [featureLng, featureLat] = feature.geometry.coordinates as [number, number];
        const p = feature.properties;
        const name: string =
          p.name || p.street || p.city || "";
        if (!name) continue;

        const distance =
          lat !== undefined && lng !== undefined
            ? this.calculateDistance(lat, lng, featureLat, featureLng)
            : undefined;

        const addressParts = [p.street, p.city, p.state, p.country].filter(Boolean);

        const photonCandidate: SpotCandidate = {
          placeId: `photon:${p.osm_type ?? ""}${p.osm_id ?? ""}`,
          name,
          source: "search" as const,
          provider: "photon" as const,
          lat: featureLat,
          lng: featureLng,
          confidence: this.calculateConfidence(distance ?? 0, 1, true),
        };
        if (p.osm_value || p.osm_key) photonCandidate.category = p.osm_value || p.osm_key;
        const addr = addressParts.join(", ");
        if (addr) photonCandidate.address = addr;
        if (distance !== undefined) photonCandidate.distanceMeters = distance;
        results.push(photonCandidate);
      }
    } catch (photonError) {
      console.error("Photon search error:", photonError);
    }

    // ── 2. Nominatim (supplement: wider coverage for areas where Photon is weak) ──
    try {
      const nomParams: Record<string, any> = {
        q: query,
        format: "json",
        addressdetails: 1,
        namedetails: 1,
        limit: Math.min(limit, 10),
        "accept-language": "ja,en",
      };
      // Wider viewbox as preference only (no bounded=1)
      if (lat !== undefined && lng !== undefined) {
        nomParams.viewbox = `${lng - 1},${lat - 1},${lng + 1},${lat + 1}`;
      }

      const nomRes = await axios.get(`${this.nominatimBase}/search`, {
        params: nomParams,
        headers: {
          "User-Agent": this.userAgent,
          "Accept-Language": "ja,en",
        },
        timeout: 6000,
      });

      for (const item of nomRes.data ?? []) {
        const itemLat = parseFloat(item.lat);
        const itemLng = parseFloat(item.lon);

        // Skip duplicates already found via Photon (within 50m)
        const isDupe = results.some(
          (r) =>
            Math.abs(r.lat - itemLat) < 0.0005 &&
            Math.abs(r.lng - itemLng) < 0.0005
        );
        if (isDupe) continue;

        const distance =
          lat !== undefined && lng !== undefined
            ? this.calculateDistance(lat, lng, itemLat, itemLng)
            : undefined;

        const name =
          item.namedetails?.["name:ja"] ||
          item.namedetails?.name ||
          item.display_name.split(",")[0];

        const nomCandidate: SpotCandidate = {
          placeId: `nominatim:${item.place_id}`,
          name,
          source: "search" as const,
          provider: "nominatim" as const,
          lat: itemLat,
          lng: itemLng,
          confidence: this.calculateConfidence(distance ?? 0, item.importance, !!item.namedetails?.name),
        };
        if (item.type) nomCandidate.category = item.type;
        if (item.display_name) nomCandidate.address = item.display_name;
        if (distance !== undefined) nomCandidate.distanceMeters = distance;
        results.push(nomCandidate);
      }
    } catch (nomError) {
      console.error("Nominatim search error:", nomError);
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, limit);
  }

  async nearbyPlaces(lat: number, lng: number, radius = 200, limit = 20): Promise<SpotCandidate[]> {
    try {
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node(around:${radius},${lat},${lng})[~"^(amenity|tourism|shop|leisure|historic)$"~".*"]["name"];
          way(around:${radius},${lat},${lng})[~"^(amenity|tourism|shop|leisure|historic)$"~".*"]["name"];
          relation(around:${radius},${lat},${lng})[~"^(amenity|tourism|shop|leisure|historic)$"~".*"]["name"];
        );
        out center ${limit};
      `;

      const response = await axios.post(
        this.overpassBase,
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": this.userAgent,
          },
          timeout: 10000,
        }
      );

      const candidates: SpotCandidate[] = response.data.elements.map((element: any) => {
        const elementLat = element.center?.lat || element.lat;
        const elementLng = element.center?.lon || element.lon;
        const distance = this.calculateDistance(lat, lng, elementLat, elementLng);

        return {
          placeId: `overpass:${element.type}/${element.id}`,
          name: element.tags.name,
          category: this.getCategoryFromTags(element.tags),
          address: element.tags["addr:full"] || element.tags["addr:street"],
          lat: elementLat,
          lng: elementLng,
          distanceMeters: distance,
          source: "current" as const,
          provider: "overpass" as const,
          confidence: this.calculateConfidence(distance, undefined, true),
        };
      });

      // Add reverse geocoding result as fallback
      const reverseResult = await this.reversePlace(lat, lng);
      if (reverseResult) {
        candidates.push(reverseResult);
      }

      candidates.sort((a, b) => {
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
      });

      return candidates.slice(0, limit);
    } catch (error) {
      console.error("Overpass nearby error:", error);
      // Fallback to Photon reverse geocode
      try {
        const photonRes = await axios.get(`${this.photonBase}/reverse`, {
          params: { lat, lon: lng, limit: 5 },
          headers: { "User-Agent": this.userAgent },
          timeout: 5000,
        });
        return (photonRes.data?.features ?? []).slice(0, limit).map((feature: any) => {
          const [fLng, fLat] = feature.geometry.coordinates;
          const p = feature.properties;
          const distance = this.calculateDistance(lat, lng, fLat, fLng);
          return {
            placeId: `photon:${p.osm_type ?? ""}${p.osm_id ?? ""}`,
            name: p.name || p.street || "現在地付近",
            category: p.osm_value || p.osm_key,
            address: [p.street, p.city, p.state, p.country].filter(Boolean).join(", ") || undefined,
            lat: fLat,
            lng: fLng,
            distanceMeters: distance,
            source: "current" as const,
            provider: "photon" as const,
            confidence: 0.8,
          };
        });
      } catch {
        return [];
      }
    }
  }

  async reversePlace(lat: number, lng: number): Promise<SpotCandidate | null> {
    try {
      const response = await axios.get(`${this.nominatimBase}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: "json",
          addressdetails: 1,
          namedetails: 1,
        },
        headers: {
          "User-Agent": this.userAgent,
          "Accept-Language": "ja,en",
        },
        timeout: 5000,
      });

      const item = response.data;
      return {
        placeId: `nominatim:${item.place_id}`,
        name:
          item.namedetails?.["name:ja"] ||
          item.namedetails?.name ||
          "現在地",
        category: item.type,
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        distanceMeters: 0,
        source: "current" as const,
        provider: "nominatim" as const,
        confidence: 1.0,
      };
    } catch (error) {
      console.error("Nominatim reverse error:", error);
      return null;
    }
  }
}

export const locationProvider: LocationProvider = new OSMLocationProvider();
