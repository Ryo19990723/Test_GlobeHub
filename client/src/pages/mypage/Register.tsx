import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  displayName: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
  agreeToTerms: z.boolean().refine((v) => v === true, "利用規約への同意が必要です"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get("redirect") || "/mypage";
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { register, isRegistering } = useAuth();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
      toast({ title: "登録が完了しました" });
      setLocation("/onboarding/quiz");
    } catch (error: any) {
      const message = error?.message || "登録に失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Brand header */}
      <div
        className="px-4 pt-5 pb-6 relative"
        style={{
          background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)",
        }}
      >
        <Link href="/mypage">
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 mb-4 active:scale-95 transition-transform"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GlobeHub</span>
        </div>
        <p className="text-sm text-white/70 mt-1 ml-0.5">アカウントを作成して旅を記録しよう</p>
      </div>

      <main className="flex-1 px-4 pt-6 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1E1B4B] font-medium">表示名 *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50" />
                      <Input
                        placeholder="表示名を入力"
                        className="pl-10 h-12 rounded-xl border-[#EDE9FE] bg-[#FAF9FF] focus-visible:ring-[#3C237D] focus-visible:border-[#3C237D]"
                        data-testid="input-displayname"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1E1B4B] font-medium">メールアドレス *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50" />
                      <Input
                        type="email"
                        placeholder="mail@example.com"
                        className="pl-10 h-12 rounded-xl border-[#EDE9FE] bg-[#FAF9FF] focus-visible:ring-[#3C237D] focus-visible:border-[#3C237D]"
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
                  <FormLabel className="text-[#1E1B4B] font-medium">パスワード *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="8文字以上"
                        className="pl-10 pr-10 h-12 rounded-xl border-[#EDE9FE] bg-[#FAF9FF] focus-visible:ring-[#3C237D] focus-visible:border-[#3C237D]"
                        data-testid="input-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3C237D]/40 hover:text-[#3C237D] transition-colors"
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

            <FormField
              control={form.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 p-3 rounded-xl bg-[#FAF9FF] border border-[#EDE9FE]">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-terms"
                      className="data-[state=checked]:bg-[#3C237D] data-[state=checked]:border-[#3C237D]"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      <span className="text-gray-700">
                        <Link href="/terms" className="text-[#3C237D] underline font-medium">
                          利用規約
                        </Link>
                        に同意します *
                      </span>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-white font-semibold text-base transition-opacity disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)",
                boxShadow: "0 4px 14px hsl(257 56% 31% / 0.35)",
              }}
              disabled={isRegistering}
              data-testid="button-register"
            >
              {isRegistering ? "登録中..." : "アカウントを作成"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t border-[#EDE9FE] text-center">
          <p className="text-sm text-gray-500 mb-4">すでにアカウントをお持ちの方</p>
          <Link href={`/mypage/login${redirectTo !== "/mypage" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-[#3C237D] text-[#3C237D] font-semibold hover:bg-[#EDE9FE]"
              data-testid="link-login"
            >
              ログインする
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
