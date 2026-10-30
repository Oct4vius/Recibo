import { Component, type ReactNode } from 'react';

// Única clase de la app: React no ofrece error boundaries como función.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="splash offline">
        <p>Algo salió mal. Cierra Recibo y vuélvelo a abrir.</p>
      </div>
    );
  }
}
