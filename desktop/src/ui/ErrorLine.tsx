import { Button } from './Button';

export function ErrorLine({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-line" role="alert">
      <p>No se pudo cargar. Revisa tu internet.</p>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
