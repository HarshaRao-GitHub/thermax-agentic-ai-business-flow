import type { Stage } from '@/data/stages';
import StageCard from './StageCard';

function HorizontalArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center w-8 shrink-0">
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 12H26"
          stroke="#E8792B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M20 6L28 12L20 18"
          stroke="#E8792B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function RowConnector() {
  return (
    <div className="hidden lg:block w-full py-1">
      <svg
        width="100%"
        height="48"
        viewBox="0 0 1000 48"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Path: down from right side, across the bottom, down into left side */}
        <path
          d="M920 0 V12 Q920 24 908 24 L92 24 Q80 24 80 36 V48"
          stroke="#E8792B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Arrowhead at bottom-left pointing down */}
        <path
          d="M74 40 L80 48 L86 40"
          stroke="#E8792B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

function MobileArrow() {
  return (
    <div className="flex lg:hidden items-center justify-center py-1">
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2V22"
          stroke="#E8792B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M6 17L12 24L18 17"
          stroke="#E8792B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function StageFlowGrid({ stages }: { stages: Stage[] }) {
  const rows = [
    stages.slice(0, 3),
    stages.slice(3, 6),
    stages.slice(6, 9),
  ];

  return (
    <div>
      {/* Desktop: 3-column rows with arrows */}
      <div className="hidden lg:block space-y-0">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx}>
            <div className="flex items-stretch">
              {row.map((stage, colIdx) => (
                <div key={stage.slug} className="contents">
                  <div className="flex-1 min-w-0">
                    <StageCard stage={stage} />
                  </div>
                  {colIdx < row.length - 1 && <HorizontalArrow />}
                </div>
              ))}
            </div>
            {rowIdx < rows.length - 1 && <RowConnector />}
          </div>
        ))}
      </div>

      {/* Mobile / Tablet: single column with down arrows */}
      <div className="lg:hidden">
        {stages.map((stage, idx) => (
          <div key={stage.slug}>
            <StageCard stage={stage} />
            {idx < stages.length - 1 && <MobileArrow />}
          </div>
        ))}
      </div>
    </div>
  );
}
