
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Calendar, MapPin } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { fetchPostDetail, type Post } from "./api";

export default function PostDetail() {
  const [, params] = useRoute("/discover/:cityId/post/:postId");
  const postId = params?.postId || "";
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPostDetail(postId).then((data) => {
        setPost(data);
        setLoading(false);
      });
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>投稿が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title={post.title}
        showBack
        backPath={`/discover/${post.cityId}`}
      />

      <main className="flex-1">
        <div className="relative h-64 md:h-96">
          <img
            src={post.heroUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{post.cityId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-3">
            <img
              src={post.user.avatar}
              alt={post.user.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-semibold">{post.user.name}</p>
              <p className="text-sm text-muted-foreground">投稿者</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">訪れたスポット</h2>
            <div className="space-y-6">
              {post.spots.map((spot) => (
                <div
                  key={spot.id}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    {spot.photos.length === 1 ? (
                      <img
                        src={spot.photos[0]}
                        alt={spot.name}
                        className="w-full aspect-square object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1 aspect-square">
                        {spot.photos.slice(0, 4).map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`${spot.name} ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-semibold mb-2">{spot.name}</h3>
                    <p className="text-muted-foreground">{spot.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {post.qas && post.qas.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">旅の一問一答</h2>
              <div className="space-y-4">
                {post.qas.map((qa, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4">
                    <h6 className="font-semibold mb-2">{qa.q}</h6>
                    <p className="text-muted-foreground">{qa.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
