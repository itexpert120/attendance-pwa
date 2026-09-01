const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}

export async function resizeImageFile(file: File, maxDimension = 512) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is not available in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.88,
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
