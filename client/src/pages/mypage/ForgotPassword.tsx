import { Link } from "wouter";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center h-14 px-4 border-b sticky top-0 bg-white z-10">
        <Link href="/mypage/login">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold ml-2">パスワード再発行</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-gray-400" />
        </div>

        <h2 className="text-xl font-bold mb-2 text-center">準備中</h2>

        <Alert className="mt-4 max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            パスワード再発行機能は現在準備中です。
            <br />
            お手数ですが、しばらくお待ちください。
          </AlertDescription>
        </Alert>

        <Link href="/mypage/login" className="mt-6">
          <Button variant="outline" data-testid="button-back-to-login">
            ログインに戻る
          </Button>
        </Link>
      </main>
    </div>
  );
}
