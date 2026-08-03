import { useI18n } from '../context/I18nContext';

const SIZE_ROWS = [
  { size: 'S', shoulder: '39', bust: '100', sleeve: '22.5', length: '67' },
  { size: 'M', shoulder: '40', bust: '105', sleeve: '23', length: '68' },
  { size: 'L', shoulder: '41', bust: '110', sleeve: '23.5', length: '69' },
  { size: 'XL', shoulder: '42', bust: '115', sleeve: '24', length: '70' },
  { size: '2XL', shoulder: '43', bust: '120', sleeve: '24.5', length: '71' },
  { size: '3XL', shoulder: '44', bust: '125', sleeve: '25', length: '72' },
  { size: '4XL', shoulder: '45', bust: '130', sleeve: '25.5', length: '73' },
  { size: '5XL', shoulder: '46', bust: '135', sleeve: '26', length: '74' },
];

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="var(--accent)" />
      <text x={x} y={y} dy=".34em" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{n}</text>
    </g>
  );
}

export function SizeChart() {
  const { t } = useI18n();

  return (
    <div className="size-chart">
      <div className="size-chart-figure">
        <svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('measurement')}>
          <defs>
            <marker id="size-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>

          {/* garment outline */}
          <path
            d="M 100 58 C 112 74, 148 74, 160 58 L 175 62 L 218 92 L 232 200 L 200 208 L 182 120 L 182 250 L 78 250 L 78 120 L 60 208 L 28 200 L 42 92 L 85 62 Z"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <g stroke="var(--accent)" strokeWidth="1.5" fill="none">
            {/* 1 shoulder */}
            <line x1="85" y1="38" x2="85" y2="62" />
            <line x1="175" y1="38" x2="175" y2="62" />
            <line x1="85" y1="44" x2="116" y2="44" markerStart="url(#size-chart-arrow)" />
            <line x1="144" y1="44" x2="175" y2="44" markerEnd="url(#size-chart-arrow)" />

            {/* 2 bust */}
            <line x1="78" y1="130" x2="116" y2="130" markerStart="url(#size-chart-arrow)" />
            <line x1="144" y1="130" x2="182" y2="130" markerEnd="url(#size-chart-arrow)" />

            {/* 3 length */}
            <line x1="250" y1="62" x2="266" y2="62" />
            <line x1="250" y1="250" x2="266" y2="250" />
            <line x1="258" y1="62" x2="258" y2="146" markerStart="url(#size-chart-arrow)" />
            <line x1="258" y1="166" x2="258" y2="250" markerEnd="url(#size-chart-arrow)" />

            {/* 4 sleeve length */}
            <line x1="73" y1="56" x2="54" y2="102" markerStart="url(#size-chart-arrow)" />
            <line x1="38" y1="148" x2="16" y2="194" markerEnd="url(#size-chart-arrow)" />
          </g>

          <Marker x={130} y={44} n={1} />
          <Marker x={130} y={130} n={2} />
          <Marker x={258} y={156} n={3} />
          <Marker x={46} y={125} n={4} />
        </svg>

        <ol className="size-chart-legend">
          <li><b>1</b>{t('shoulder')}</li>
          <li><b>2</b>{t('bust')}</li>
          <li><b>3</b>{t('length')}</li>
          <li><b>4</b>{t('sleeve')}</li>
        </ol>
      </div>

      <div>
        <p className="size-chart-heading">{t('measurement')}</p>
        <div className="size-chart-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('asianSize')}</th>
                <th>{t('shoulder')} CM</th>
                <th>{t('bust')} CM</th>
                <th>{t('sleeve')} CM</th>
                <th>{t('length')} CM</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map(row => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  <td>{row.shoulder}</td>
                  <td>{row.bust}</td>
                  <td>{row.sleeve}</td>
                  <td>{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
