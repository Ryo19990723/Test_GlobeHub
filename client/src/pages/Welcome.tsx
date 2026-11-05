import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Camera, Mic, Sparkles, ArrowDown, Lock, Share2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/track";

/** Landing page for ads and social posts (/welcome?utm_...). */
export default function Welcome() {
  const [, setLocation] = useLocation();
  const { isLoggedIn } = useAuth();

  const start = (from: string) => {
    track("cta_click", { from: `lp-${from}` });
    setLocation(isLoggedIn ? "/record/new" : "/mypage/register");
  };

  return (
    <div className="bg-white text-[#1E1B4B]">
      {/* Hero */}
      <section className="relative">
        <img src="/lp/hero.jpg" alt="" className="w-full h-[460px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />
        <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <img src="/icon-192.png" alt="" className="w-full h-full rounded-[inherit]" />
          </div>
          <span className="text-lg font-bold">GlobeHub</span>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-6 text-white space-y-4">
          <h1 className="text-[28px] font-bold leading-tight">
            撮って、ひとこと
            <br />
            話すだけ。
          </h1>
          <p className="text-[15px] leading-relaxed text-white/90">旅が終わると、AIが旅行記にまとめます。</p>
          <Button onClick={() => start("hero")} className="w-full h-14 rounded-2xl bg-white text-[#3C237D] hover:bg-white/90 text-base font-bold" data-testid="button-lp-start">
            無料で始める
          </Button>
          <p className="text-xs text-white/75 text-center">アプリのインストール不要・メールアドレスで登録</p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 pt-12 space-y-6">
        <h2 className="text-xl font-bold text-center">旅先でやるのは、これだけ</h2>
        <Step n={1} icon={Camera} title="撮る">いいなと思ったら、アプリの「撮る」を押して撮影。場所と時刻は自動で記録されます。</Step>
        <Step n={2} icon={Mic} title="ひとこと話す">「人が少なくて鳥居がきれい」くらいで十分。マイクに話すだけで文字になります。</Step>
        <Step n={3} icon={Sparkles} title="旅行記をつくる">旅が終わったらボタンを押すだけ。AIが日記のような旅行記にまとめます。</Step>
      </section>

      {/* Before → after */}
      <section className="mt-12 px-5 py-10 bg-[#3C237D]/5 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-[#3C237D]">サンプル</p>
          <h2 className="text-xl font-bold">あなたが残すのは、これだけ</h2>
        </div>
        <div className="space-y-3">
          <Moment photo="/lp/torii.jpg" time="7:12" words="朝7時、人が少なくて鳥居がめっちゃきれい" />
          <Moment photo="/lp/soba.jpg" time="12:40" words="そばに目玉焼き。素朴でおいしい" />
          <Moment photo="/lp/river.jpg" time="17:05" words="鴨川を歩いた。風が気持ちいい" />
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center shrink-0 text-[11px] text-center text-muted-foreground leading-tight">旅の<br />あとに</div>
            <p className="inline-block rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">日帰り。伏見稲荷は朝イチがおすすめ</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#3C237D] py-1">
          <ArrowDown className="h-6 w-6" />
          <p className="text-sm font-bold">AIが旅行記に</p>
        </div>
        <article className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <img src="/lp/torii.jpg" alt="" className="w-full aspect-[16/9] object-cover" />
          <div className="p-5 space-y-3">
            <p className="text-lg font-bold leading-snug">朝の鳥居と鴨川の風、京都の一日</p>
            <p className="text-xs text-[#3C237D] font-bold border-b border-[#EDE9FE] pb-1">1日目 11月1日</p>
            <p className="text-[15px] leading-relaxed">朝7時の伏見稲荷は人が少なく、鳥居がとてもきれいだった。</p>
            <p className="text-[15px] leading-relaxed">昼はそばに目玉焼きがのった一杯。素朴でおいしい。</p>
            <p className="text-[15px] leading-relaxed">夕方は鴨川沿いを歩いた。風が気持ちいい。</p>
            <div className="rounded-xl bg-[#3C237D]/5 p-3 text-sm space-y-1.5">
              <p className="font-bold text-[#3C237D]">旅のメモ</p>
              <p><span className="text-muted-foreground mr-3">日程</span>日帰り</p>
              <p><span className="text-muted-foreground mr-3">旅のコツ</span>伏見稲荷は朝イチがおすすめ</p>
            </div>
          </div>
        </article>
        <p className="text-xs text-muted-foreground text-center">話していないことは書きません。できあがった文章は自由に直せます。</p>
      </section>

      {/* Points */}
      <section className="px-6 pt-12 space-y-5">
        <h2 className="text-xl font-bold text-center">安心して使えるように</h2>
        <Point icon={Lock} title="「自分だけ」か「公開」かを選べる">はじめは自分だけの記録に。公開したい旅行記だけを公開できます。</Point>
        <Point icon={Share2} title="LINEやXで、そのまま共有">リンクを送ると、写真とタイトルつきで表示されます。</Point>
        <Point icon={ShieldCheck} title="作り話をしない旅行記">AIは、あなたが撮った場所と話したことだけをもとに書きます。</Point>
        <Point icon={Smartphone} title="インストール不要">スマホのブラウザで使えます。ホーム画面に追加すればアプリのように開けます。</Point>
      </section>

      {/* FAQ */}
      <section className="px-6 pt-12 space-y-4">
        <h2 className="text-xl font-bold text-center">よくある質問</h2>
        <Faq q="料金はかかりますか？">現在、すべての機能を無料で使えます。</Faq>
        <Faq q="旅行中に毎回文章を書く必要はありますか？">ありません。写真を撮るだけでも記録になります。ひとことは、話せるときだけで大丈夫です。</Faq>
        <Faq q="昔の旅の写真でもつくれますか？">はい。カメラロールから写真を選ぶと、撮影した日時を読み取ります。写真に位置情報が残っていれば、場所の候補も出します。</Faq>
        <Faq q="公開した旅行記を非公開に戻せますか？">いつでも「自分だけ」に戻せます。</Faq>
      </section>

      {/* Final CTA */}
      <section className="px-6 pt-12 pb-10 text-center space-y-4">
        <p className="text-lg font-bold">次の旅は、撮って話すだけ。</p>
        <Button onClick={() => start("bottom")} className="w-full h-14 rounded-2xl bg-[#3C237D] hover:bg-[#3C237D]/90 text-base font-bold" data-testid="button-lp-start-bottom">
          無料で始める
        </Button>
        <div className="flex justify-center gap-4 pt-6 text-xs text-muted-foreground">
          <Link href="/terms" className="underline">利用規約</Link>
          <Link href="/privacy" className="underline">プライバシーポリシー</Link>
        </div>
        <p className="text-[11px] text-muted-foreground">写真: Pexels</p>
      </section>
    </div>
  );
}

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Camera; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-[#3C237D] text-white flex items-center justify-center">
        <Icon className="h-6 w-6" />
        <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-white border-2 border-[#3C237D] text-[11px] font-bold text-[#3C237D] flex items-center justify-center">{n}</span>
      </div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function Moment({ photo, time, words }: { photo: string; time: string; words: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1"><Mic className="h-3 w-3" /> {time}</p>
        <p className="inline-block rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">{words}</p>
      </div>
    </div>
  );
}

function Point({ icon: Icon, title, children }: { icon: typeof Camera; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="h-5 w-5 text-[#3C237D] shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-[15px]">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="rounded-2xl border border-[#EDE9FE] px-4 py-3 group">
      <summary className="font-semibold text-[15px] cursor-pointer list-none flex justify-between gap-2">
        {q}
        <span className="text-[#3C237D] group-open:rotate-45 transition-transform">＋</span>
      </summary>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">{children}</p>
    </details>
  );
}
