// Saves a QR code drawn by qrCodeSvg (lib/qr-code.ts) as a file, in the
// browser. The file is drawn from scratch rather than copied from the page,
// so it never carries the on-screen animation's hidden dots.

function save(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

export function downloadQrSvg(svg: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  save(url, filename);
  URL.revokeObjectURL(url);
}

/** Renders at `scale`× the code's own size, so it stays sharp when printed. */
export async function downloadQrPng(
  svg: string,
  size: number,
  filename: string,
  scale = 2,
) {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size * scale;
    canvas.height = size * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    save(canvas.toDataURL("image/png"), filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
