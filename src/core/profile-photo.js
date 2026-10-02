export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const MAX_SIDE = 8192;
const PHOTO_SIDE = 256;
const MAX_SAVED_LENGTH = 150_000;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function invalidImage() {
  return new Error("Choose a valid JPEG, PNG, or WebP image.");
}

function checkDimensions(width, height) {
  if (!width || !height || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new Error("Use an image up to 20 megapixels and 8,192 pixels per side.");
  }
}

// Check actual file signatures and dimensions before invoking an image decoder.
export function inspectImage(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  let type, width, height;
  if (bytes.length >= 33 && bytes[0] === 137 && text(1, 7) === "PNG\r\n\x1a\n" && view.getUint32(8) === 13 && text(12, 4) === "IHDR") {
    type = "image/png";
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
    type = "image/jpeg";
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw invalidImage();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (offset + 2 > bytes.length) throw invalidImage();
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) throw invalidImage();
      if ([192, 193, 194].includes(marker)) {
        if (size < 8) throw invalidImage();
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += size;
    }
  } else if (bytes.length >= 30 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    type = "image/webp";
    const chunk = text(12, 4);
    if (chunk === "VP8X") {
      // Animated images are intentionally excluded from profile photos.
      if (bytes[20] & 2) throw new Error("Choose a still image instead of an animated image.");
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 16383;
      height = view.getUint16(28, true) & 16383;
    } else if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = (bits & 16383) + 1;
      height = ((bits >>> 14) & 16383) + 1;
    }
  }
  if (!type || !width || !height) throw invalidImage();
  checkDimensions(width, height);
  return { type, width, height };
}

export function validatePhotoUrl(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\x00-\x20\x7f\\]/.test(value)) {
    throw new Error("Enter a direct HTTPS image URL without spaces.");
  }
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid HTTPS image URL."); }
  // No embedded credentials, nonstandard ports, IP literals, or local hostnames.
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) || host.endsWith(".home.arpa")) {
    throw new Error("Use a public HTTPS image URL without login details or a custom port.");
  }
  url.hash = "";
  return url.href;
}

export async function downloadPhoto(value, signal) {
  const url = validatePhotoUrl(value);
  let response;
  try {
    response = await fetch(url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", cache: "no-store", signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not load that URL. Use a direct image link that permits cross-origin access, or upload the file instead.");
  }
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!response.ok || !TYPES.has(type) || !response.body) {
    await response.body?.cancel();
    throw invalidImage();
  }
  if (Number(response.headers.get("content-length")) > MAX_PHOTO_BYTES) {
    await response.body.cancel();
    throw new Error("Choose an image smaller than 8 MB.");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > MAX_PHOTO_BYTES) throw new Error("Choose an image smaller than 8 MB.");
      chunks.push(chunk);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return new Blob(chunks, { type });
}

// Only bounded JPEG data URLs can enter the rendered HTML, including after reload.
export function isSafePhoto(value) {
  return typeof value === "string" && value.length <= MAX_SAVED_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export async function preparePhoto(blob, signal) {
  if (!(blob instanceof Blob) || !blob.size) throw invalidImage();
  if (blob.size > MAX_PHOTO_BYTES) throw new Error("Choose an image smaller than 8 MB.");
  if (blob.type && !TYPES.has(blob.type.toLowerCase())) throw invalidImage();
  signal?.throwIfAborted();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const info = inspectImage(bytes);
  if (blob.type && blob.type.toLowerCase() !== info.type) throw invalidImage();
  signal?.throwIfAborted();
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: info.type }), { imageOrientation: "from-image" });
  } catch {
    throw invalidImage();
  }
  try {
    signal?.throwIfAborted();
    checkDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PHOTO_SIDE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#eaf8ed";
    context.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);
    // Save pixels only: original filenames, metadata, and source URLs are discarded.
    const photo = canvas.toDataURL("image/jpeg", 0.85);
    if (!isSafePhoto(photo)) throw new Error("Could not prepare this photo. Choose another image.");
    return photo;
  } finally {
    bitmap.close();
  }
}
