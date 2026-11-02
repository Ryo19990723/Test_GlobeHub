import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export interface Journal {
  title: string;
  sections: { heading: string; entries: { spotId: string; text: string }[] }[];
  memo?: { label: string; text: string }[];
}

export function parseJournal(text?: string | null): Journal | null {
  if (!text) return null;
  try {
    const j = JSON.parse(text);
    return Array.isArray(j?.sections) ? j : null;
  } catch {
    return null;
  }
}

const dateFmt = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });

function dateRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  const s = dateFmt.format(new Date(start));
  const e = end ? dateFmt.format(new Date(end)) : s;
  return s === e ? s : `${s} – ${e.replace(/^\d{4}\//, "")}`;
}

interface JournalViewProps {
  trip: { title: string; startDate?: string | null; endDate?: string | null; heroUrl?: string | null; spots: any[]; author?: { displayName?: string | null } | null };
  journal: Journal;
  /** When set, the title and every paragraph become editable. */
  onEdit?: ((next: Journal & { tripTitle: string }) => void) | undefined;
  editingTitle?: string | undefined;
}

export function JournalView({ trip, journal, onEdit, editingTitle }: JournalViewProps) {
  const spotById = new Map(trip.spots.map((s: any) => [s.id, s]));
  const placeCount = journal.sections.reduce((n, s) => n + s.entries.length, 0);
  const title = onEdit ? editingTitle ?? trip.title : trip.title;
  // The cover is usually the first record's photo — don't show the same picture twice.
  const entryPhotos = new Set(journal.sections.flatMap((s) => s.entries.map((e) => spotById.get(e.spotId)?.photos?.[0]?.url)));
  const showCover = !!trip.heroUrl && !entryPhotos.has(trip.heroUrl);

  const setEntry = (si: number, ei: number, text: string) => {
    const sections = journal.sections.map((s, i) =>
      i !== si ? s : { ...s, entries: s.entries.map((e, j) => (j !== ei ? e : { ...e, text })) },
    );
    onEdit?.({ ...journal, sections, tripTitle: title });
  };

  const setMemo = (i: number, text: string) => {
    const memo = (journal.memo ?? []).map((m, j) => (j !== i ? m : { ...m, text }));
    onEdit?.({ ...journal, memo, tripTitle: title });
  };
  const memo = (journal.memo ?? []).filter((m) => onEdit || m.text.trim());

  return (
    <article className="pb-6">
      {showCover && <img src={trip.heroUrl!} alt="" className="w-full aspect-[4/3] object-cover" />}
      <header className="px-5 pt-5 pb-2 space-y-1">
        {onEdit ? (
          <Input value={title} maxLength={80} onChange={(e) => onEdit({ ...journal, tripTitle: e.target.value })} className="text-xl font-bold h-12" />
        ) : (
          <h1 className="text-2xl font-bold leading-snug">{title}</h1>
        )}
        <p className="text-sm text-muted-foreground">
          {dateRange(trip.startDate, trip.endDate)}
          {placeCount > 0 && ` ・ ${placeCount}の記録`}
          {trip.author?.displayName && ` ・ ${trip.author.displayName}`}
        </p>
      </header>

      {journal.sections.map((section, si) => (
        <section key={si} className="px-5 pt-4 space-y-5">
          {section.heading && <h2 className="text-sm font-bold text-[#3C237D] border-b border-[#EDE9FE] pb-1">{section.heading}</h2>}
          {section.entries.map((entry, ei) => {
            const spot = spotById.get(entry.spotId);
            const photo = spot?.photos?.[0]?.url;
            const place = spot?.placeName || spot?.name;
            if (!onEdit && !entry.text && !photo) return null;
            return (
              <div key={entry.spotId} className="space-y-2">
                {photo && <img src={photo} alt={place || ""} className="w-full rounded-2xl object-cover max-h-[420px]" />}
                {place && <p className="text-xs text-muted-foreground">📍 {place}</p>}
                {onEdit ? (
                  <Textarea value={entry.text} onChange={(e) => setEntry(si, ei, e.target.value)} className="text-[15px] leading-relaxed min-h-[72px]" />
                ) : (
                  entry.text && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {memo.length > 0 && (
        <section className="mx-5 mt-8 rounded-2xl bg-[#3C237D]/5 p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#3C237D]">旅のメモ</h2>
          <dl className="space-y-2.5">
            {memo.map((m, i) => (
              <div key={m.label + i} className="flex gap-3 text-[14px] leading-relaxed">
                <dt className="w-16 shrink-0 text-muted-foreground">{m.label}</dt>
                <dd className="flex-1">
                  {onEdit ? <Textarea value={m.text} onChange={(e) => setMemo(i, e.target.value)} className="min-h-[44px] text-[14px]" /> : m.text}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}
