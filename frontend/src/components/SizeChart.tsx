import { useI18n } from '../context/I18nContext';

type Column = 'chest' | 'waist' | 'hips' | 'shoulders' | 'sleeve';

/** Garment measurements in centimetres, from the shop's women's size guide. */
const WOMEN = {
  columns: ['chest', 'waist', 'hips'] as Column[],
  rows: [
    { size: 'XS', chest: '80', waist: '62', hips: '90' },
    { size: 'S', chest: '86', waist: '66', hips: '94' },
    { size: 'M', chest: '90', waist: '70', hips: '98' },
    { size: 'L', chest: '96', waist: '76', hips: '104' },
    { size: 'XL', chest: '102', waist: '82', hips: '110' },
    { size: 'XXL', chest: '108', waist: '88', hips: '116' },
  ] as Record<string, string>[],
};

/** Garment measurements in centimetres, from the shop's men's size guide. */
const MEN = {
  columns: ['chest', 'waist', 'shoulders', 'sleeve'] as Column[],
  rows: [
    { size: 'S', chest: '104', waist: '90', shoulders: '44', sleeve: '62' },
    { size: 'M', chest: '112', waist: '98', shoulders: '47', sleeve: '64' },
    { size: 'L', chest: '118', waist: '104', shoulders: '47', sleeve: '64' },
    { size: 'XL', chest: '126', waist: '112', shoulders: '49', sleeve: '65' },
    { size: '2XL', chest: '134', waist: '120', shoulders: '50', sleeve: '65' },
    { size: '3XL', chest: '150', waist: '142', shoulders: '52', sleeve: '67' },
    { size: '4XL', chest: '156', waist: '148', shoulders: '54', sleeve: '70' },
  ] as Record<string, string>[],
};

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="var(--accent)" />
      <text x={x} y={y} dy=".34em" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{n}</text>
    </g>
  );
}

/** A measuring line across the body at height y, split around its numbered marker at x = 130. */
function Across({ from, to, y }: { from: number; to: number; y: number }) {
  return (
    <>
      <line x1={from} y1={y} x2={116} y2={y} markerStart="url(#size-chart-arrow)" />
      <line x1={144} y1={y} x2={to} y2={y} markerEnd="url(#size-chart-arrow)" />
    </>
  );
}

const Arrowhead = () => (
  <defs>
    <marker id="size-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
    </marker>
  </defs>
);

/** Dress silhouette: 1 chest, 2 waist, 3 hips. */
function WomenFigure() {
  return (
    <>
      <path
        d="M 112 30 C 120 42, 140 42, 148 30 L 172 38 L 178 70 C 182 100, 176 120, 168 140 C 164 150, 166 160, 176 175 L 196 250 L 64 250 L 84 175 C 94 160, 96 150, 92 140 C 84 120, 78 100, 82 70 L 88 38 Z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke="var(--accent)" strokeWidth="1.5" fill="none">
        <Across from={80} to={180} y={95} />
        <Across from={92} to={168} y={142} />
        <Across from={82} to={178} y={185} />
      </g>
      <Marker x={130} y={95} n={1} />
      <Marker x={130} y={142} n={2} />
      <Marker x={130} y={185} n={3} />
    </>
  );
}

/** Shirt outline: 1 chest, 2 waist, 3 shoulders, 4 sleeve. */
function MenFigure() {
  return (
    <>
      <path
        d="M 100 58 C 112 74, 148 74, 160 58 L 175 62 L 218 92 L 232 200 L 200 208 L 182 120 L 182 250 L 78 250 L 78 120 L 60 208 L 28 200 L 42 92 L 85 62 Z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke="var(--accent)" strokeWidth="1.5" fill="none">
        {/* 1 chest */}
        <Across from={78} to={182} y={130} />
        {/* 2 waist */}
        <Across from={78} to={182} y={210} />
        {/* 3 shoulders */}
        <line x1="85" y1="38" x2="85" y2="62" />
        <line x1="175" y1="38" x2="175" y2="62" />
        <Across from={85} to={175} y={44} />
        {/* 4 sleeve */}
        <line x1="73" y1="56" x2="54" y2="102" markerStart="url(#size-chart-arrow)" />
        <line x1="38" y1="148" x2="16" y2="194" markerEnd="url(#size-chart-arrow)" />
      </g>
      <Marker x={130} y={130} n={1} />
      <Marker x={130} y={210} n={2} />
      <Marker x={130} y={44} n={3} />
      <Marker x={46} y={125} n={4} />
    </>
  );
}

/**
 * The size guide for one collection: a numbered drawing, its legend, and the table.
 * Every number is a measurement of the garment, not of the body.
 */
export function SizeChart({ gender }: { gender: 'women' | 'men' }) {
  const { t } = useI18n();
  const chart = gender === 'women' ? WOMEN : MEN;

  return (
    <div className="size-chart">
      <div className="size-chart-figure">
        <svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${t(gender)} - ${t('measurement')}`}>
          <Arrowhead />
          {gender === 'women' ? <WomenFigure /> : <MenFigure />}
        </svg>

        <ol className="size-chart-legend">
          {chart.columns.map((column, index) => (
            <li key={column}><b>{index + 1}</b>{t(column)}</li>
          ))}
        </ol>
      </div>

      <div>
        <p className="size-chart-heading">{t(gender)}</p>
        <div className="size-chart-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('size')}</th>
                {chart.columns.map(column => (
                  <th key={column}>{t(column)} {t('cm')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map(row => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  {chart.columns.map(column => <td key={column}>{row[column]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
