import type { BattleQuestionReview } from '@/lib/db/battles';

export default function BattleReview({
  review,
  opponentName,
}: {
  review: BattleQuestionReview[];
  opponentName: string;
}) {
  if (!review || review.length === 0) return null;
  return (
    <div className="mt-5 flex flex-col gap-3 text-left">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Détail des réponses
      </div>
      {review.map((r, i) => (
        <div key={i} className="card-hard p-3">
          <div className="text-[14px] font-bold leading-snug">
            Q{i + 1}. {r.prompt}
          </div>
          <div className="mt-2 text-[13px]">
            <span className="text-ink-3">Bonne réponse : </span>
            <span className="font-semibold text-success">{r.correctAnswer}</span>
          </div>
          <div className="mt-2 flex flex-col gap-1 border-t-2 border-[#e4dac6] pt-2 text-[13px]">
            <div>
              <span className="text-ink-3">Toi : </span>
              <span className={r.myCorrect ? 'font-semibold text-success' : 'font-semibold text-fail'}>
                {r.myAnswer || '—'}
              </span>{' '}
              {r.myCorrect ? '✓' : '✗'}
            </div>
            <div>
              <span className="text-ink-3">{opponentName} : </span>
              <span
                className={
                  r.opponentCorrect ? 'font-semibold text-success' : 'font-semibold text-fail'
                }
              >
                {r.opponentAnswer || '—'}
              </span>{' '}
              {r.opponentCorrect ? '✓' : '✗'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
