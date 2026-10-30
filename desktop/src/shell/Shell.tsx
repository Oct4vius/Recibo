import { useState } from 'react';
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
        <h1>{label}</h1>
        {/* La Task 5 reemplaza este espacio con "Este mes". */}
        {active === 'month' ? null : <ComingSoon />}
      </main>
    </div>
  );
}
