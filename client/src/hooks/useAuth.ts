import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";

interface User {
  id: string;
  email?: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  snsUrl: string | null;
  location: string | null;
  isRegistered: boolean;
  tripCount?: number;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  message: string;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  agreeToTerms: boolean;
}

interface LoginData {
  email: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);

  const { mutate: initSession } = useMutation({
    mutationFn: api.auth.getAnonymousSession,
    onSuccess: () => setSessionReady(true),
    onError: () => {
      setTimeout(() => initSession(), 1000);
    },
  });

  useEffect(() => {
    initSession();
  }, []);

  const { data: meData, isLoading, refetch } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: 2,
    staleTime: 1000 * 60 * 5,
    enabled: sessionReady,
  });

  const user = meData?.user;
  const isLoggedIn = !!user?.isRegistered;

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      return apiRequest("POST", "/api/auth/register", data) as Promise<AuthResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      return apiRequest("POST", "/api/auth/login", data) as Promise<AuthResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      setSessionReady(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      initSession();
    },
  });

  return {
    user,
    isLoggedIn,
    isLoading,
    refetch,
    register: registerMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    registerError: registerMutation.error,
    loginError: loginMutation.error,
  };
}

export type { User, RegisterData, LoginData };
