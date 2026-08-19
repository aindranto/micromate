/**
 * MicroMate Automatic Client-Side Image Compressor
 * Kompresi foto & dokumen gambar secara cepat di browser menggunakan Canvas API
 * Mengurangi ukuran file dari ~5-8 MB menjadi <250-400 KB tanpa mengurangi kejelasan visual.
 */

export interface CompressionOptions {
  maxDimension?: number; // Lebar/tinggi maksimum dalam pixel (default: 1200px)
  quality?: number;      // Kualitas JPEG (0.1 - 1.0, default: 0.80)
  mimeType?: string;     // Format output: 'image/jpeg' atau 'image/webp'
}

/**
 * Kompresi file gambar (File) menjadi Base64 Data URL
 */
export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Jika bukan file gambar (misal: PDF, DOCX), langsung kembalikan FileReader biasa
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Gagal membaca file gambar'));
        return;
      }
      compressBase64Image(dataUrl, options).then(resolve).catch(reject);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Kompresi data gambar Base64 menjadi Data URL terkompresi
 */
export function compressBase64Image(
  base64DataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve) => {
    // Jika bukan gambar base64 atau ukurannya sudah sangat kecil (<50KB), kembalikan langsung
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image/') || base64DataUrl.length < 70000) {
      resolve(base64DataUrl);
      return;
    }

    const {
      maxDimension = 1200,
      quality = 0.80,
      mimeType = 'image/jpeg'
    } = options;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Hitung dimensi skenario rasio aspek
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64DataUrl);
        return;
      }

      // Gunakan penajaman latar belakang putih untuk transparansi PNG -> JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      
      // Jika hasil kompresi ternyata lebih besar dari versi asli, gunakan versi asli
      if (compressedDataUrl.length < base64DataUrl.length) {
        resolve(compressedDataUrl);
      } else {
        resolve(base64DataUrl);
      }
    };

    img.onerror = () => {
      resolve(base64DataUrl);
    };

    img.src = base64DataUrl;
  });
}
