// Animated circular SVG budget ring
// Colour shifts: green → amber → red as budget depletes

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRingColor(pct) {
    if (pct > 50) return '#22c55e';
    if (pct > 20) return '#f59e0b';
    return '#ef4444';
}

export default function BudgetRing({ spent = 0, total = 1, size = 120, strokeWidth = 8, label }) {
    const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
    const leftPct = 100 - pct;
    const offset = CIRCUMFERENCE - (leftPct / 100) * CIRCUMFERENCE;
    const color = getRingColor(leftPct);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle
                    cx="50" cy="50" r={RADIUS}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx="50" cy="50" r={RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={pct === 0 ? CIRCUMFERENCE : offset}
                    style={{
                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s',
                        filter: `drop-shadow(0 0 6px ${color}88)`,
                    }}
                />
                {/* Centre text */}
                <g style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>
                    <text x="50" y="47" textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="700" fontFamily="var(--font-heading)">
                        {Math.round(leftPct)}%
                    </text>
                    <text x="50" y="60" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-heading)">
                        left
                    </text>
                </g>
            </svg>
            {label && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>}
        </div>
    );
}
