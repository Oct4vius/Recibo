import { invoke } from '@tauri-apps/api/core';

// Rust abre "Guardar como" y escribe el PDF; JS solo sugiere el nombre, nunca la ruta.
export async function saveReportPdf(fileName: string): Promise<'saved' | 'cancelled'> {
  const saved = await invoke<boolean>('save_report_pdf', { fileName });
  return saved ? 'saved' : 'cancelled';
}
