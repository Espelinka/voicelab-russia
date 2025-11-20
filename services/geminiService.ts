import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils/audioUtils";

// Helper to split text into safe chunks
const splitTextIntoChunks = (text: string, maxChunkSize: number = 3000): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";

  // Split by common sentence terminators to avoid cutting words
  // Using a regex that keeps the delimiter
  const sentences = text.split(/([.?!]+[\s\n]+)/);

  for (const part of sentences) {
    if ((currentChunk + part).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

export const generateSpeechFromText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash-preview-tts";
  
  // 1. Split text if it's too long
  const chunks = splitTextIntoChunks(text);
  const audioSegments: Uint8Array[] = [];
  let totalLength = 0;

  try {
    // 2. Process chunks sequentially to avoid rate limits and maintain order
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text: chunk }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
         // Skip empty chunks or log warning
         console.warn("Empty response for chunk", chunk.substring(0, 20));
         continue;
      }

      const audioPart = candidates[0]?.content?.parts?.find(part => part.inlineData);

      if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
        const chunkAudioBytes = base64ToUint8Array(audioPart.inlineData.data);
        audioSegments.push(chunkAudioBytes);
        totalLength += chunkAudioBytes.length;
      }
    }

    if (audioSegments.length === 0) {
      throw new Error("Failed to generate any audio data.");
    }

    // 3. Concatenate all audio segments into one Uint8Array
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const segment of audioSegments) {
      combinedAudio.set(segment, offset);
      offset += segment.length;
    }

    // 4. Convert back to base64 string
    return uint8ArrayToBase64(combinedAudio);

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};