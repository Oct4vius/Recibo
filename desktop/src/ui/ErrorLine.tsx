import { Button } from './Button';

export function ErrorLine({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="error-line" role="alert">
      <p>No se pudo cargar. Revisa tu internet.</p>
      <Button variant="secondary" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Reintentando…' : 'Reintentar'}
      </Button>
    </div>
  );
}
