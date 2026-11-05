import { Button } from '../ui/Button';

interface MonthNavProps {
  title: string;
  /** `h1` donde el mes es el título de la pantalla; `h2` donde hay otro título arriba. */
  heading: 'h1' | 'h2';
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel?: string;
  nextLabel?: string;
}

/** Flechas de mes (o de año, con sus rótulos) y su título. */
export function MonthNav({
  title,
  heading: Heading,
  canGoNext,
  onPrevious,
  onNext,
  previousLabel = 'Mes anterior',
  nextLabel = 'Mes siguiente',
}: MonthNavProps) {
  return (
    <div className="month-nav">
      <Button variant="icon" aria-label={previousLabel} onClick={onPrevious}>
        ‹
      </Button>
      <Heading className="month-nav-title">{title}</Heading>
      <Button variant="icon" aria-label={nextLabel} onClick={onNext} disabled={!canGoNext}>
        ›
      </Button>
    </div>
  );
}
