export type TriggerBrowserDownloadParams = {
  content: BlobPart;
  mimeType: string;
  filename: string;
};

export function triggerBrowserDownload({ content, mimeType, filename }: TriggerBrowserDownloadParams): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
