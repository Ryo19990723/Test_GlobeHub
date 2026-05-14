
import { useLocation } from "wouter";
import { Home, Notebook, Search, User, Map } from "lucide-react";
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
    path: "/trip-planner",
    label: "旅行計画",
    icon: Map,
    testId: "nav-trip-planner",
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
    if (path === "/trip-planner") {
      return location === "/trip-planner" || location.startsWith("/plan");
    }
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px]"
      data-testid="bottom-nav"
      style={{ height: "64px" }}
    >
      {/* frosted glass panel */}
      <div
        className="absolute inset-0 bg-white/90 backdrop-blur-md border-t border-[#EDE9FE]"
        style={{ boxShadow: "0 -1px 16px hsl(257 56% 31% / 0.08)" }}
      />

      <div className="relative flex justify-around items-center h-full px-1 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-all duration-200",
                "active:scale-95"
              )}
              data-testid={item.testId}
            >
              {/* active pill background */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  active
                    ? "bg-[#3C237D]/10"
                    : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all duration-200",
                    active ? "text-[#3C237D]" : "text-[#9CA3AF]"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active ? "currentColor" : "none"}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-tight transition-all duration-200",
                    active ? "text-[#3C237D]" : "text-[#9CA3AF]"
                  )}
                >
                  {item.label}
                </span>
              </div>

              {/* active dot indicator */}
              <div
                className={cn(
                  "w-1 h-1 rounded-full transition-all duration-200",
                  active ? "bg-[#3C237D]" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
