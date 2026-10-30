import { useState, type FormEvent } from 'react';
import { signIn } from '@/features/auth/api';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const message = await signIn(email, password);
    setPending(false);
    // Si salió bien, SessionProvider recibe SIGNED_IN y cambia de pantalla.
    setError(message);
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Recibo</h1>
        <label className="field">
          Correo
          <input type="email" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
        {error ? <p role="alert" className="form-error">{error}</p> : null}
      </form>
    </div>
  );
}
