/** Pure route selection: scanning a valid room QR opens the join UI immediately. */
export type Page = 'room' | 'lab' | 'rooms' | 'check';
export function initialPage(search: string): Page {
  const params = new URLSearchParams(search);
  const code = params.get('join')?.trim().toUpperCase() ?? '';
  return /^[A-Z0-9]{8,16}$/.test(code) ? 'rooms' : 'room';
}
