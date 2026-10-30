import { useState } from 'react';
import { MonthScreen } from '../month/MonthScreen';
import { ComingSoon } from './ComingSoon';
import { Sidebar } from './Sidebar';
import { SECTIONS, type SectionId } from './sections';

export function Shell() {
  const [active, setActive] = useState<SectionId>('month');
  const label = SECTIONS.find((s) => s.id === active)?.label;

  return (
    <div className="shell">
      <Sidebar active={active} onSelect={setActive} />
      <main className="content">
        {active === 'month' ? (
          <MonthScreen />
        ) : (
          <>
            <h1>{label}</h1>
            <ComingSoon />
          </>
        )}
      </main>
    </div>
  );
}
