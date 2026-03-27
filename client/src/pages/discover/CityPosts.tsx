
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { PostCard } from "./components/PostCard";
import { fetchCityPosts, type Post } from "./api";

export default function CityPosts() {
  const [, params] = useRoute("/discover/:cityId");
  const [, setLocation] = useLocation();
  const cityId = params?.cityId || "";
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (cityId) {
      fetchCityPosts(cityId).then((data) => {
        setPosts(data);
        setLoading(false);
      });
    }
  }, [cityId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title={cityId}
        showBack
        backPath="/discover"
      />

      <main className="flex-1 px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{posts.length}件の旅記録</h1>
            <Button
              variant="outline"
              onClick={() => setLocation(`/discover/spot/${cityId}`)}
            >
              スポットを見つける
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
