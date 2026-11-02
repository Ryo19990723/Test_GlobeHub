// Fields of another user that are safe to send to any visitor.
// Never use `author: true` / `user: true` — that leaks email and passwordHash.
export const publicAuthor = {
  select: {
    id: true,
    displayName: true,
    avatarUrl: true,
    bio: true,
    location: true,
    instagramUrl: true,
    xUrl: true,
  },
} as const;
