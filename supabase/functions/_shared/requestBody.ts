/** Bound bytes while streaming, including bodies with no Content-Length. */
export async function readLimitedText(req: Request, maxBytes: number): Promise<string> {
  if (Number(req.headers.get('content-length') || 0) > maxBytes) throw new Error('Request too large');
  const reader = req.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
