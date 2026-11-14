// Reads QR codes from the camera (back camera on phones). Uses the browser's
// BarcodeDetector when there is one (Chrome on Android) and jsQR elsewhere
// (iPhone, desktop browsers). Needs https (or localhost) for the camera.
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (options: { formats: string[] }) => Detector;

const SCAN_EVERY_MS = 250;
// The same code isn't reported again within this time (it stays in front of the camera).
const REPEAT_AFTER_MS = 3000;

export function QrScanner({
  onCode,
  paused = false,
}: {
  onCode: (text: string) => void;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const pausedRef = useRef(paused);
  onCodeRef.current = onCode;
  pausedRef.current = paused;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    let last = { text: "", at: 0 };
    const canvas = document.createElement("canvas");
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    const detector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;

    async function read(video: HTMLVideoElement): Promise<string | null> {
      if (detector) {
        const found = await detector.detect(video);
        return found[0]?.rawValue ?? null;
      }
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return null;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      return jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Câmera indisponível neste navegador (é preciso abrir o app por https).");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(
          name === "NotAllowedError"
            ? "Permita o uso da câmera para ler os ingressos."
            : "Não foi possível abrir a câmera.",
        );
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      let busy = false;
      timer = setInterval(async () => {
        if (busy || pausedRef.current || video.readyState < 2) return;
        busy = true;
        try {
          const text = await read(video);
          const now = Date.now();
          if (text && (text !== last.text || now - last.at > REPEAT_AFTER_MS)) {
            last = { text, at: now };
            onCodeRef.current(text);
          }
        } catch {
          // a frame that couldn't be read: try the next one
        } finally {
          busy = false;
        }
      }, SCAN_EVERY_MS);
    }

    void start();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <p
        className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground"
        data-testid="scanner-error"
      >
        {error}
      </p>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover sm:aspect-video"
        muted
        playsInline
      />
      <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80" />
    </div>
  );
}
