import { SECTIONS, type SectionId } from './sections';

type Props = { active: SectionId; onSelect: (id: SectionId) => void };

export function Sidebar({ active, onSelect }: Props) {
  return (
    <nav className="sidebar" aria-label="Secciones">
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="nav-item"
              aria-current={s.id === active ? 'page' : undefined}
              onClick={() => onSelect(s.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={s.icon} />
              </svg>
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
