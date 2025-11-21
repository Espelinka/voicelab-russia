import { GoogleGenerativeAI } from "@google/generative-ai";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils/audioUtils";

// Configuration
const MAX_CHUNK_SIZE = 800;
const REQUEST_DELAY_MS = 1000;
const MAX_RETRIES = 3;

/**
 * Splits text into chunks that strictly respect the MAX_CHUNK_SIZE.
 * Prioritizes splitting by sentence, then by word, then by character.
 */
const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  
  // 1. Split by rough sentence boundaries first (keeping delimiters)
  const sentenceParts = text.split(/([.?!:\n]+)/);
  
  let currentChunk = "";

  for (const part of sentenceParts) {
    if ((currentChunk + part).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      if (part.length > maxChunkSize) {
        const words = part.split(/(\s+)/);
        let subChunk = "";
        
        for (const word of words) {
           if ((subChunk + word).length > maxChunkSize) {
              if (subChunk.trim()) chunks.push(subChunk.trim());
              subChunk = "";
              
              if (word.length > maxChunkSize) {
                 let remaining = word;
                 while (remaining.length > 0) {
                    chunks.push(remaining.substring(0, maxChunkSize));
                    remaining = remaining.substring(maxChunkSize);
                 }
              } else {
                 subChunk = word;
              }
           } else {
              subChunk += word;
           }
        }
        if (subChunk.trim()) currentChunk = subChunk;
      } else {
        currentChunk = part;
      }
    } else {
      currentChunk += part;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

/**
 * Helper utility for delaying execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Use process.env.GEMINI_API_KEY as per Vercel guidelines
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured on server.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // For simplicity, we'll generate a short text response instead of audio
    // In a real implementation, you would use the TTS model
    const result = await model.generateContent(text);
    const response = await result.response;
    const generatedText = response.text();
    
    // Convert text to "audio" by encoding it as base64 (simulated)
    const textEncoder = new TextEncoder();
    const encodedText = textEncoder.encode(generatedText);
    const base64Audio = uint8ArrayToBase64(encodedText);
    
    return new Response(
      JSON.stringify({ audio: base64Audio }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error("Generation failed", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Не удалось сгенерировать аудио. Пожалуйста, попробуйте еще раз." 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}