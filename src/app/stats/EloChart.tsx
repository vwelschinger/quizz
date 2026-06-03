// Graphe ELO (SVG pur, rendu serveur) : ELO en fonction du nombre de questions.
// series[i] = ELO après i questions ; series[0] = ELO de départ.
export default function EloChart({ series }: { series: number[] }) {
  const n = series.length - 1;
  if (n < 1) return null;

  const W = 360;
  const H = 190;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 24;

  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const pad = Math.max(15, Math.round((hi - lo) * 0.12));
  const yMin = lo - pad;
  const yMax = hi + pad;

  const px = (i: number) => padL + (i / n) * (W - padL - padR);
  const py = (e: number) => padT + (1 - (e - yMin) / (yMax - yMin)) * (H - padT - padB);

  const pts = series.map((e, i) => `${px(i).toFixed(1)},${py(e).toFixed(1)}`).join(' ');
  const baseline = py(yMin).toFixed(1);
  const areaPts = `${px(0).toFixed(1)},${baseline} ${pts} ${px(n).toFixed(1)},${baseline}`;

  const gridYs = [yMax, (yMin + yMax) / 2, yMin];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution de l'ELO">
      {gridYs.map((g, idx) => (
        <g key={idx}>
          <line
            x1={padL}
            y1={py(g)}
            x2={W - padR}
            y2={py(g)}
            stroke="#d8cdb6"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text x={padL - 5} y={py(g) + 3} textAnchor="end" fontSize="9" fill="#79705f">
            {Math.round(g)}
          </text>
        </g>
      ))}

      <polygon points={areaPts} fill="#DBE8F4" opacity="0.7" />
      <polyline
        points={pts}
        fill="none"
        stroke="#1E6499"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle cx={px(0)} cy={py(series[0])} r="3" fill="#1A1611" />
      <circle
        cx={px(n)}
        cy={py(series[n])}
        r="3.6"
        fill="#1E6499"
        stroke="#1A1611"
        strokeWidth="1.5"
      />

      <text x={padL} y={H - 7} textAnchor="start" fontSize="9" fill="#79705f">
        0
      </text>
      <text x={W - padR} y={H - 7} textAnchor="end" fontSize="9" fill="#79705f">
        {n} questions
      </text>
    </svg>
  );
}
