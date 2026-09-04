function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function downloadTextFile(
  fileName: string,
  contents: string,
  mime = "text/csv;charset=utf-8",
) {
  downloadBlob(fileName, new Blob(["\ufeff", contents], { type: mime }));
}

export async function downloadElementAsPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const drawWidth = pageWidth - margin * 2;
  const drawHeight = pageHeight - margin * 2;
  const pixelsPerPage = Math.floor((canvas.width * drawHeight) / drawWidth);
  let offset = 0;
  let page = 0;

  while (offset < canvas.height) {
    const sliceHeight = Math.min(pixelsPerPage, canvas.height - offset);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const context = slice.getContext("2d");
    if (!context) throw new Error("PDF 페이지 캔버스를 만들 수 없습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) pdf.addPage();
    const renderedHeight = (sliceHeight * drawWidth) / canvas.width;
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, drawWidth, renderedHeight);
    offset += sliceHeight;
    page += 1;
  }

  pdf.save(fileName);
}

export interface PhotoArchiveItem {
  name: string;
  at: string;
  visibility?: string;
  movementId: string;
  kind: string;
  warehouse: string;
  containerNo: string;
}

async function createEvidenceJpeg(photo: PhotoArchiveItem): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 증빙 캔버스를 만들 수 없습니다.");

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#24364b");
  gradient.addColorStop(1, "#66819c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(80, 80, canvas.width - 160, canvas.height - 160);

  context.fillStyle = "#ffffff";
  context.font = "600 56px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("StoreDesk 현장 사진 증빙", 140, 190);
  context.font = "500 36px Pretendard, Apple SD Gothic Neo, sans-serif";
  [
    `${photo.kind} 작업 · ${photo.movementId}`,
    `${photo.warehouse} · ${photo.containerNo}`,
    `촬영 기록 ${photo.at}`,
    `공개 범위 ${photo.visibility ?? "내부 전용"}`,
  ].forEach((line, index) => context.fillText(line, 140, 350 + index * 86));
  context.font = "400 28px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.76)";
  context.fillText(`원본 파일명 ${photo.name}`, 140, 820);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("사진 증빙 파일 생성에 실패했습니다."))),
      "image/jpeg",
      0.9,
    );
  });
}

export async function downloadPhotoArchive(photos: PhotoArchiveItem[], fileName: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const manifest = [
    "StoreDesk 현장 사진 증빙 목록",
    ...photos.map(
      (photo) =>
        `${photo.movementId},${photo.kind},${photo.warehouse},${photo.containerNo},${photo.at},${photo.visibility ?? "내부 전용"},${photo.name}`,
    ),
  ].join("\n");
  zip.file("manifest.csv", `\ufeff${manifest}`);

  for (const [index, photo] of photos.entries()) {
    const blob = await createEvidenceJpeg(photo);
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    zip.file(`${String(index + 1).padStart(2, "0")}-${safeName}`, blob);
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(fileName, blob);
}
