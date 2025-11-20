import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils/audioUtils";

// Configuration
const MAX_CHUNK_SIZE = 2000; // Safe limit for TTS models
const REQUEST_DELAY_MS = 500; // Delay between chunks to avoid Rate Limits (429)
const MAX_RETRIES = 3;

/**
 * Splits text into chunks that strictly respect the MAX_CHUNK_SIZE.
 * Prioritizes splitting by sentence, then by word, then by character.
 */
const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  
  // 1. Split by rough sentence boundaries first (keeping delimiters)
  // Includes newlines, dots, exclamation, question marks
  const sentenceParts = text.split(/([.?!:\n]+)/);
  
  let currentChunk = "";

  for (const part of sentenceParts) {
    // Check if adding this part would exceed the limit
    if ((currentChunk + part).length > maxChunkSize) {
      
      // If currentChunk is not empty, push it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Now analyze 'part'. Is 'part' itself bigger than the limit?
      // (e.g. a huge paragraph with no punctuation)
      if (part.length > maxChunkSize) {
        // Fallback: Split by spaces (words)
        const words = part.split(/(\s+)/);
        let subChunk = "";
        
        for (const word of words) {
           if ((subChunk + word).length > maxChunkSize) {
              if (subChunk.trim()) chunks.push(subChunk.trim());
              subChunk = "";
              
              // If a single word is somehow gigantic (e.g. a base64 string in text), hard chop it
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

export const generateSpeechFromText = async (text: string): Promise<string> => {
  // Ensure API Key is available
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash-preview-tts";
  
  // 1. Robust Chunking
  const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
  const audioSegments: Uint8Array[] = [];
  let totalLength = 0;

  console.log(`Starting TTS generation. Total chars: ${text.length}. Chunks: ${chunks.length}`);

  // 2. Process chunks sequentially with Retry and Delay logic
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.trim()) continue;

    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        // Throttle requests to prevent 429 errors
        if (i > 0) await delay(REQUEST_DELAY_MS);

        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ parts: [{ text: chunk }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is often good for neutral/female-ish tones in Gemini, though 'Puck'/'Charon' exist.
              },
            },
          },
        });

        const candidates = response.candidates;
        const audioPart = candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
          const chunkAudioBytes = base64ToUint8Array(audioPart.inlineData.data);
          audioSegments.push(chunkAudioBytes);
          totalLength += chunkAudioBytes.length;
          success = true;
        } else {
           throw new Error("No audio data in response");
        }

      } catch (err) {
        attempt++;
        console.warn(`Error generating chunk ${i + 1}/${chunks.length} (Attempt ${attempt}):`, err);
        
        if (attempt >= MAX_RETRIES) {
          console.error(`Failed to generate chunk ${i + 1} after ${MAX_RETRIES} attempts.`);
          // We throw here to fail the whole process, or we could continue with a gap.
          // Failing is safer for data integrity.
          throw new Error(`Failed to generate audio for part ${i + 1}. Please try again.`);
        }
        
        // Exponential backoff for retries
        await delay(1000 * attempt);
      }
    }
  }

  if (audioSegments.length === 0) {
    throw new Error("Failed to generate any audio data.");
  }

  // 3. Concatenate all audio segments
  const combinedAudio = new Uint8Array(totalLength);
  let offset = 0;
  for (const segment of audioSegments) {
    combinedAudio.set(segment, offset);
    offset += segment.length;
  }

  // 4. Return combined base64
  return uint8ArrayToBase64(combinedAudio);
};