/**
 * The DETAK wordmark: rounded heavy letters, cream fill, orange band, burnt outline and a short
 * downward extrusion. Drawn as stacked SVG text layers so it stays crisp at every size.
 */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  const W = 392;
  const H = 122;
  const text = (props: React.SVGProps<SVGTextElement>) => (
    <text x={196} y={98} textAnchor="middle" textLength={344} lengthAdjust="spacingAndGlyphs" fontSize={100} fontWeight={700} fontFamily="var(--font-wordmark)" strokeLinejoin="round" {...props}>
      DETAK
    </text>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} width={(height * W) / H} role="img" aria-label="DETAK" className={className}>
      <g transform="translate(0 7)">{text({ fill: "var(--color-ember)", stroke: "var(--color-ember)", strokeWidth: 26 })}</g>
      {text({ fill: "var(--color-ember)", stroke: "var(--color-ember)", strokeWidth: 26 })}
      {text({ fill: "var(--color-flame)", stroke: "var(--color-flame)", strokeWidth: 17 })}
      {text({ fill: "var(--color-ember)", stroke: "var(--color-ember)", strokeWidth: 6 })}
      {text({ fill: "var(--color-cream)" })}
    </svg>
  );
}
