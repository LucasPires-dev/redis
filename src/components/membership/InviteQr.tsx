import { useRef, useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// Always black on white, whatever the theme: phone cameras read it best.
const QR_COLORS = { fgColor: "#000000", bgColor: "#ffffff" };

/** The invite link as a QR: small in the card, full screen to show at a service,
 *  and as a PNG for slides or printed material. */
export function InviteQr({
  url,
  code,
  campusName,
}: {
  url: string;
  code: string;
  campusName: string;
}) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `convite-${campusName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
    link.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mx-auto flex flex-col items-center gap-2"
        aria-label="Ampliar QR code do convite"
      >
        <span className="rounded-lg bg-white p-2 ring-1 ring-border">
          <QRCodeSVG value={url} size={160} marginSize={1} level="M" {...QR_COLORS} />
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
          <Maximize2 className="h-3 w-3" /> Toque para ampliar
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-dvh max-w-none flex-col items-center justify-center gap-6 rounded-none border-0 sm:h-auto sm:max-w-lg sm:rounded-lg sm:border">
          <div className="text-center">
            <DialogTitle className="text-2xl">{campusName}</DialogTitle>
            <DialogDescription className="mt-2">
              Aponte a câmera do celular para entrar no campus
            </DialogDescription>
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-border">
            <QRCodeCanvas
              ref={canvasRef}
              value={url}
              size={1024}
              marginSize={2}
              level="M"
              {...QR_COLORS}
              style={{ width: "min(80vw, 22rem)", height: "auto" }}
            />
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Ou use o código
            </div>
            <div className="font-mono text-3xl font-semibold tracking-[0.25em]">{code}</div>
          </div>
          <Button variant="outline" className="h-11 w-full max-w-xs" onClick={download}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar imagem
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
