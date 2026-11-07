import { getToken, ApiError } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface DownloadPdfResult extends Blob {
  filename?: string;
}

export async function downloadExecutivePdfReport(sections?: string[]): Promise<DownloadPdfResult> {
  let endpoint = '/reports/executive-pdf';
  if (sections && sections.length > 0) {
    const encoded = encodeURIComponent(sections.join(','));
    endpoint += `?sections=${encoded}`;
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const message = errorData.detail || `HTTP Error ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  // Parse filename from Content-Disposition header
  const disposition = response.headers.get('content-disposition');
  let filename = 'PS105_Executive_Cyber_Risk_Report.pdf';
  if (disposition) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
    if (match && match[1]) {
      filename = match[1].trim();
    }
  }

  const blob = (await response.blob()) as DownloadPdfResult;
  blob.filename = filename;
  return blob;
}
