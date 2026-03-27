
// Discover API functionality
export type City = {
  id: string;
  name: string;
  country: string;
  tagline: string;
  tripCount: number;
  heroUrl: string;
};

export type Post = {
  id: string;
  cityId: string;
  title: string;
  summary: string;
  heroUrl: string;
  user: {
    name: string;
    avatar: string;
  };
  createdAt: string;
  spotCount?: number;
  likeCount?: number;
  spots?: Array<{
    id: string;
    name: string;
    photos: string[];
    note: string;
  }>;
  qas?: Array<{
    q: string;
    a: string;
  }>;
};

export type Spot = {
  id: string;
  cityId: string;
  name: string;
  category: string;
  summary: string;
  photos: string[];
  mapUrl?: string;
};

// API functions
export async function fetchCitiesBySections(): Promise<{
  recent: City[];
  recommended: City[];
  campaign: City[];
}> {
  const response = await fetch('/api/discover/cities');
  if (!response.ok) {
    throw new Error('Failed to fetch cities');
  }
  return response.json();
}

export async function fetchCityPosts(cityId: string): Promise<Post[]> {
  const response = await fetch(`/api/discover/cities/${encodeURIComponent(cityId)}/posts`);
  if (!response.ok) {
    throw new Error('Failed to fetch city posts');
  }
  return response.json();
}

export async function fetchPostDetail(postId: string): Promise<Post | null> {
  const response = await fetch(`/api/discover/posts/${encodeURIComponent(postId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch post detail');
  }
  return response.json();
}

export async function fetchCitySpots(cityId: string): Promise<Spot[]> {
  const response = await fetch(`/api/discover/cities/${encodeURIComponent(cityId)}/spots`);
  if (!response.ok) {
    throw new Error('Failed to fetch city spots');
  }
  return response.json();
}

export async function fetchSpotDetail(spotId: string): Promise<Spot | null> {
  const response = await fetch(`/api/discover/spots/${encodeURIComponent(spotId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch spot detail');
  }
  return response.json();
}
