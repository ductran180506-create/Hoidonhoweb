/**
 * Tiện ích nén & tối ưu ảnh phía trình duyệt (Client-side WebP Compressor)
 * Giảm 80% - 95% dung lượng file trước khi tải lên máy chủ.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxWidth: number = 1080,
  quality: number = 0.82
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // Nếu là file không phải ảnh thì giữ nguyên
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File không phải định dạng ảnh'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Giới hạn chiều ngang tối đa (chuẩn Full HD / TikTok 9:16 max width 1080px)
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Không thể khởi tạo Canvas 2D'));
        }

        // Vẽ ảnh lên canvas với chế độ làm mịn
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ảnh sang chuẩn WebP hiện đại
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Lỗi chuyển đổi Blob'));
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const reductionPercentage = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSize,
              compressedSize,
              reductionPercentage,
              width,
              height,
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Lỗi khi tải dữ liệu ảnh'));
    };

    reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
  });
}

/**
 * Định dạng dung lượng byte sang KB / MB dễ đọc
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
