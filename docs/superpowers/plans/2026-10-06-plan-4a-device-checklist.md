# Plan 4a — checklist en el dispositivo

Requisitos: Expo Go instalado en el Android; `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`; celular y computadora en la misma red. Ejecutar `bun run start`
y escanear el QR con Expo Go.

## Login
- [ ] La app abre en negro con el título RECIBO en nota de rescate sobre el panel rojo.
- [ ] Contraseña incorrecta → "Correo o contraseña incorrectos." en amarillo.
- [ ] Modo avión → "Sin conexión. Revisa tu internet y vuelve a intentarlo."
- [ ] Credenciales correctas → entra a Inicio.
- [ ] Escribe correo y contraseña y toca «Entrar» una sola vez con el teclado abierto: entra al primer toque.
- [ ] Cerrar Expo Go y volver a abrir → sigue con la sesión iniciada.

## Pestañas
- [ ] El bloque rojo salta a cada pestaña con un rebote corto y el celular vibra levemente.
- [ ] La forma roja del fondo cambia de lugar en cada pestaña.
- [ ] Cada título entra "de golpe" desde abajo a la izquierda.
- [ ] La forma roja del fondo sigue inclinada después de su animación de entrada (no se endereza).
- [ ] Ajustes muestra el correo y "Cerrar sesión" vuelve al login.

## Galería (Ajustes → Abrir galería)
- [ ] Los montos son rectos y las cifras no "bailan" al cambiar (los números de los montos no se mueven de
      lugar al cambiar: cada cifra ocupa el mismo ancho).
- [ ] La barra de presupuesto pasa por 45 %, 85 % (borde amarillo), 100 % y 123 % (extremo roto).
- [ ] Tocar una tira la vuelve blanca con texto negro.
- [ ] En "Paneles", el botón alterna el mismo panel rojo entre inclinado (lados en diagonal) y dentado
      (borde inferior en zigzag).
- [ ] Los títulos largos en nota de rescate se parten entre palabras, nunca a mitad de palabra.
- [ ] "Agregar gasto" abre el panel en diagonal; tocar fuera lo cierra.
- [ ] Dentro de "Agregar gasto", tocar el campo de monto muestra el teclado sin taparlo.
- [ ] El borde inferior del panel respeta la barra del sistema con navegación de 3 botones y con
      navegación por gestos.
- [ ] Las tarjetas de aviso entran inclinadas, se quedan inclinadas tras entrar, y "Entendido" las
      cierra.

## Accesibilidad
- [ ] En los **Ajustes del teléfono** (no de la app; la app no tiene este interruptor, respeta el del
      sistema): Accesibilidad → "Quitar animaciones" o «Eliminar animaciones» (Samsung: Accesibilidad →
      Mejoras de visibilidad; Pixel: Accesibilidad → Color y movimiento). Volver a la app y cambiar de
      pestaña: los movimientos se vuelven instantáneos o un fundido corto, sin rebotes.
- [ ] Con TalkBack, los títulos se leen como palabra completa y los montos como "4,275.72 pesos".
- [ ] Con TalkBack, una fila de lista que no se puede tocar NO se anuncia como "deshabilitado".

## Rendimiento
- [ ] Cambiar de pestaña rápido varias veces no se traba.
