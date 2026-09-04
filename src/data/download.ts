export function downloadTextFile(fileName: string, contents: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
