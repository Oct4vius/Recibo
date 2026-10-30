import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import './confirm-button.css';

interface ConfirmButtonProps {
  label: string;
  question: string;
  detail?: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
}

/** Acción que pide confirmación en el mismo lugar: el primer clic cambia el botón por la pregunta. */
export function ConfirmButton({ label, question, detail, confirmLabel, pending, onConfirm }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // El foco cae en la opción segura.
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)} disabled={pending}>
        {label}
      </Button>
    );
  }
  return (
    <div className="confirm" role="group" aria-label={question}>
      <p className="confirm-question">{question}</p>
      {detail && <p className="confirm-detail">{detail}</p>}
      <div className="confirm-actions">
        <Button variant="primary" onClick={onConfirm} disabled={pending}>
          {pending ? 'Un momento…' : confirmLabel}
        </Button>
        <Button ref={cancelRef} variant="secondary" onClick={() => setAsking(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
