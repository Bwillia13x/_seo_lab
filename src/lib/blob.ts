// Blob and file utilities

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string) {
  saveBlob(blob, filename);
}

export function createCSVBlob(data: string | string[][]): Blob {
  if (typeof data === "string") {
    return new Blob([data], { type: "text/csv;charset=utf-8;" });
  }
  const csvContent = data.map((row) => row.join(",")).join("\n");
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
