
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface PostCardProps {
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
}

export function PostCard({
  id,
  cityId,
  title,
  summary,
  heroUrl,
  user,
  createdAt,
}: PostCardProps) {
  return (
    <Link href={`/discover/${cityId}/post/${id}`}>
      <Card className="overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <img
          src={heroUrl}
          alt={title}
          className="w-full aspect-square object-cover"
        />
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {summary}
          </p>
          <div className="flex items-center gap-2">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-xs text-muted-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), {
                addSuffix: true,
                locale: ja,
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
