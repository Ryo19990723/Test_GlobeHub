import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get("redirect") || "/mypage";
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { login, isLoggingIn } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast({
        title: "ログインしました",
      });
      setLocation(redirectTo);
    } catch (error: any) {
      const message = error?.message || "ログインに失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center h-14 px-4 border-b sticky top-0 bg-white z-10">
        <Link href="/mypage">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold ml-2">ログイン</h1>
      </header>

      <main className="flex-1 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="mail@example.com"
                        className="pl-10"
                        data-testid="input-email"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワード"
                        className="pl-10 pr-10"
                        data-testid="input-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9]"
              disabled={isLoggingIn}
              data-testid="button-login"
            >
              {isLoggingIn ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link href="/mypage/forgot-password">
            <span className="text-sm text-[#7C3AED]" data-testid="link-forgot-password">
              パスワードをお忘れですか？
            </span>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-gray-600 mb-4">アカウントをお持ちでない方</p>
          <Link href={`/mypage/register${redirectTo !== "/mypage" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}>
            <Button
              variant="outline"
              className="w-full h-12"
              data-testid="link-register"
            >
              新規登録
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
