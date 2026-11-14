export interface ImageOrientation {
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

/** Bake orientation into pixels so preview, upload and public image agree. */
export async function orientImage(source: string, orientation: ImageOrientation): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load photo'));
    img.src = source;
  });
  // Browser image decoding applies EXIF before drawing to canvas. Re-encoding
  // strips the old metadata so the corrected upload cannot be oriented twice.
  const quarterTurn = orientation.rotation % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = quarterTurn ? image.naturalHeight : image.naturalWidth;
  canvas.height = quarterTurn ? image.naturalWidth : image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare photo');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(orientation.flipHorizontal ? -1 : 1, orientation.flipVertical ? -1 : 1);
  ctx.rotate(orientation.rotation * Math.PI / 180);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas.toDataURL('image/png');
}
