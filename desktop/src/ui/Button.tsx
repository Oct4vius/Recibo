import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Único botón de la app; el estilo sale de las clases `btn-*` de base.css. */
export function Button({ variant = 'primary', className, disabled, type = 'button', ...rest }: ButtonProps) {
  const classes = [`btn-${variant}`, className].filter(Boolean).join(' ');
  return <button {...rest} type={type} className={classes} disabled={disabled} aria-disabled={disabled || undefined} />;
}
