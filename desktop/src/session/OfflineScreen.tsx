import icon from '../../src-tauri/icons/128x128@2x.png';

export function OfflineScreen() {
  return (
    <div className="splash offline">
      <img src={icon} alt="Recibo" />
      <h1>No hay internet</h1>
      <p>Recibo se abrirá solo cuando vuelva la conexión.</p>
    </div>
  );
}
