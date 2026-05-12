import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MicButton } from "@/components/common/MicButton";

// ─── 型 ──────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  webSearched?: boolean;
}

const STORAGE_KEY = "globehub_chat_history";
const MAX_HISTORY = 30;

const SUGGESTED = [
  "今度バルセロナに行くなら何がおすすめ？",
  "ヨーロッパで9月に行くべき国は？",
  "一人旅で安全な都市を教えて",
  "旅のパッキングで必須のアイテムは？",
];

// ─── 吹き出しコンポーネント ───────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C237D] to-amber-400 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[78%] space-y-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-[#3C237D] text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          }`}
        >
          {msg.content}
        </div>
        {msg.webSearched && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
            <Globe className="w-3 h-3" />Web検索済み
          </div>
        )}
      </div>
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────────
export default function TravelChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // メッセージが増えるたびにlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages]);

  // 末尾へ自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/travel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: nextMessages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error("応答の取得に失敗しました");
      const { reply, webSearched } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply, webSearched }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "申し訳ありません、エラーが発生しました。もう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C237D] to-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">GlobeHub AI</p>
            <p className="text-[10px] text-muted-foreground">あなたの旅行アシスタント</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearHistory} className="text-muted-foreground">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      {/* チャットエリア */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-36">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3C237D] to-amber-400 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">GlobeHub AI</h2>
            <p className="text-sm text-muted-foreground mb-6">旅について何でも聞いてみよう</p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:border-[#3C237D]/40 hover:bg-[#3C237D]/5 transition-colors text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C237D] to-amber-400 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 入力エリア（固定） */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t px-3 py-3">
        <div className="flex items-end gap-2">
          <MicButton
            onTranscribe={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
            disabled={loading}
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="旅について聞いてみよう..."
            className="flex-1 resize-none min-h-[44px] max-h-32 text-sm py-2.5"
            rows={1}
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-[#3C237D] hover:bg-[#2E1A64] flex-shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Enter で送信 • Shift+Enter で改行 • マイクで音声入力
        </p>
      </div>
    </div>
  );
}
