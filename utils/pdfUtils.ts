import { PdfExtractResult } from "../types";

export const extractTextFromPdf = async (file: File): Promise<PdfExtractResult> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
  
  let fullText = "";
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + "\n\n";
  }

  return {
    text: fullText.trim(),
    pageCount: totalPages,
  };
};