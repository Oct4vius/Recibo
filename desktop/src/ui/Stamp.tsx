import './stamp.css';

/** Sello sobre el ticket. Es solo adorno: `Notice` ya anuncia el aviso a los lectores de pantalla. */
export function Stamp() {
  return (
    <div className="stamp" aria-hidden="true">
      Anotado
    </div>
  );
}
