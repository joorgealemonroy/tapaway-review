/**
 * Extracts the average color from the bottom portion of an image.
 * Used for creating smooth fade transitions from banner images.
 */
export async function extractBottomColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          resolve("#1a1a1a");
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Sample bottom 10% of image for color extraction
        const sampleHeight = Math.max(1, Math.floor(img.height * 0.1));
        const imageData = ctx.getImageData(
          0,
          img.height - sampleHeight,
          img.width,
          sampleHeight
        );
        
        // Calculate average color from sampled pixels
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          r += imageData.data[i];
          g += imageData.data[i + 1];
          b += imageData.data[i + 2];
          count++;
        }
        
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
        }
        
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch {
        // Canvas security error or other issues - fallback to dark
        resolve("#1a1a1a");
      }
    };
    
    img.onerror = () => resolve("#1a1a1a");
    img.src = imageUrl;
  });
}
