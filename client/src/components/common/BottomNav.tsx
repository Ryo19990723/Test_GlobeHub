
import { useLocation } from "wouter";
import { Home, Notebook, Search, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  testId: string;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: "ホーム",
    icon: Home,
    testId: "nav-home",
  },
  {
    path: "/record",
    label: "記録",
    icon: Notebook,
    testId: "nav-record",
  },
  {
    path: "/browse",
    label: "閲覧",
    icon: Search,
    testId: "nav-browse",
  },
  {
    path: "/mypage",
    label: "マイページ",
    icon: User,
    testId: "nav-mypage",
  },
];

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    if (path === "/browse") {
      return location === "/browse" || location.startsWith("/browse/");
    }
    if (path === "/record") {
      return location.startsWith("/record");
    }
    if (path === "/mypage") {
      return location === "/mypage" || location.startsWith("/mypage/");
    }
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 bg-white border-t border-[#E5E7EB] w-full max-w-[420px]"
      data-testid="bottom-nav"
      style={{ height: "60px" }}
    >
      <div className="flex justify-around items-center h-full px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 min-h-[48px] rounded-lg transition-colors",
                "hover:bg-gray-50 active:bg-gray-100"
              )}
              data-testid={item.testId}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  active ? "text-[#7C3AED]" : "text-[#9CA3AF]"
                )}
                strokeWidth={active ? 2.5 : 2}
                fill={active ? "currentColor" : "none"}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-[#7C3AED]" : "text-[#9CA3AF]"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
