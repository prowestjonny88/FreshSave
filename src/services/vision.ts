/**
 * Browser vision helpers: OCR (tesseract.js, pre-trained, on-device) and barcode scanning
 * (native BarcodeDetector, falling back to ZXing). Web equivalent of Google ML Kit
 * Text Recognition + Barcode Scanning. Libraries are loaded lazily.
 */
import { parseOcrDate, type OcrDate } from "../domain/ocr-date.ts";

export async function recognizeText(
  image: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const [{ default: workerPath }, { default: corePath }, { default: weightsPath }] =
    await Promise.all([
      import("tesseract.js/dist/worker.min.js?url"),
      import("tesseract.js-core/tesseract-core-lstm.wasm.js?url"),
      import("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url"),
    ]);
  let reportInitializationError: (reason: unknown) => void = () => {};
  const initializationError = new Promise<never>((_, reject) => {
    reportInitializationError = reject;
  });
  // The worker reports model initialization failures through errorHandler.
  const opening = createWorker("eng", 1, {
    workerPath: new URL(workerPath, document.baseURI).href,
    corePath: new URL(corePath, document.baseURI).href,
    langPath: new URL(".", new URL(weightsPath, document.baseURI)).href,
    workerBlobURL: false,
    errorHandler: reportInitializationError,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100));
    },
  });
  const worker = await Promise.race([opening, initializationError]);
  try {
    const { data } = await worker.recognize(image);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function readExpiry(
  image: string,
  onProgress?: (pct: number) => void,
): Promise<OcrDate> {
  return parseOcrDate(await recognizeText(image, onProgress));
}

export const cameraAvailable = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export async function openCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  const stop = () => {
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
  try {
    if (!video.isConnected) throw new Error("Camera view closed.");
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play();
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}

export function grabFrame(video: HTMLVideoElement): string {
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };

/** Start scanning barcodes from the camera. Returns a stop function. */
export async function scanBarcodes(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
): Promise<() => void> {
  const Native = (globalThis as unknown as { BarcodeDetector?: new (o: object) => Detector })
    .BarcodeDetector;
  if (Native) {
    let detector: Detector | undefined;
    try {
      detector = new Native({ formats: ["ean_13", "ean_8", "upc_a", "itf"] });
    } catch {
      /* use the library if native detection is unavailable */
    }
    if (detector) return startNativeBarcodeScan(video, detector, onCode);
  }
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const stopCamera = await openCamera(video);
  try {
    const stream = video.srcObject as MediaStream;
    const controls = await reader.decodeFromStream(stream, video, (result) => {
      if (result) onCode(result.getText());
    });
    return () => {
      controls.stop();
      stopCamera();
    };
  } catch (error) {
    stopCamera();
    throw error;
  }
}

async function startNativeBarcodeScan(
  video: HTMLVideoElement,
  detector: Detector,
  onCode: (code: string) => void,
) {
  const stopCamera = await openCamera(video);
  let live = true;
  const tick = async () => {
    if (!live) return;
    try {
      const found = await detector.detect(video);
      if (live && found[0]?.rawValue) onCode(found[0].rawValue);
    } catch {
      /* frame not ready */
    }
    if (live) setTimeout(tick, 250);
  };
  void tick();
  return () => {
    live = false;
    stopCamera();
  };
}
