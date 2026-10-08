'use client';

/** Fotoğrafı tarayıcıda küçültüp JPEG data URL'e çevirir (Firestore'a sığsın diye) */
export async function compressImage(file: File, maxSide: number, quality: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Sadece fotoğraf yükleyebilirsin.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Bu fotoğraf okunamadı. JPEG ya da PNG dene (iPhone’da HEIC yerine “En Uyumlu” biçimi seç).');
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Galeri için büyük, kapak için küçük sürüm */
export const toPhoto = (f: File) => compressImage(f, 1280, 0.72);
export const toCover = (f: File | string) =>
  typeof f === 'string' ? recompress(f, 560, 0.7) : compressImage(f, 560, 0.7);

async function recompress(dataUrl: string, maxSide: number, quality: number) {
  const blob = await (await fetch(dataUrl)).blob();
  return compressImage(new File([blob], 'x.jpg', { type: blob.type }), maxSide, quality);
}
