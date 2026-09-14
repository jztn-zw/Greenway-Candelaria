const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
const SKIP_COMPRESSION_BELOW_BYTES = 1.5 * 1024 * 1024;

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("Unable to read image"));
  };
  image.src = objectUrl;
});

const canvasToBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => {
  canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
});

export const compressReportImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/") || file.size <= SKIP_COMPRESSION_BELOW_BYTES) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);
    const compressedBlob = await canvasToBlob(canvas);
    if (!compressedBlob || compressedBlob.size >= file.size) return file;

    const filename = `${file.name.replace(/\.[^/.]+$/, "") || "report-photo"}.jpg`;
    return new File([compressedBlob], filename, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // A failed optimization must never prevent the original evidence photo from uploading.
    return file;
  }
};

export const compressReportImages = async (
  files: File[],
  onProgress?: (completed: number, total: number) => void,
): Promise<File[]> => {
  const compressed: File[] = [];

  for (const [index, file] of files.entries()) {
    compressed.push(await compressReportImage(file));
    onProgress?.(index + 1, files.length);
  }

  return compressed;
};
