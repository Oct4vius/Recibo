/** Imprime la hoja; el título del documento (nombre sugerido al guardar) dura lo que dura el diálogo. */
export function printReport(title: string): void {
  const previous = document.title;
  document.title = title;
  window.addEventListener(
    'afterprint',
    () => {
      document.title = previous;
    },
    { once: true },
  );
  window.print();
}
