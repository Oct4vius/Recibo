/** Franja breve arriba. La región `aria-live` existe siempre; solo cambia su texto. */
export function Notice({ message }: { message: string | null }) {
  return (
    <div className="notice-slot" aria-live="polite">
      {message !== null && <p className="notice">{message}</p>}
    </div>
  );
}
