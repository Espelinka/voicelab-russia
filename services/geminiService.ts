import { AppConfig } from "../config";

/**
 * Response from the generate speech API
 */
interface GenerateSpeechResponse {
  audio: string;
  cached?: boolean;
}

/**
 * Generates speech from text by calling our Vercel backend API.
 * @param text The text to speak
 * @param onProgress Optional callback to report progress (current chunk, total chunks)
 */
export const generateSpeechFromText = async (
  text: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> => {
  try {
    // More realistic progress reporting
    if (onProgress) {
      onProgress(1, 4); // Connecting
      setTimeout(() => onProgress(2, 4), AppConfig.PROGRESS_UPDATE_INTERVAL); // Processing
    }

    const response = await fetch('/api/generateSpeech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (onProgress) {
      onProgress(3, 4); // Receiving
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: GenerateSpeechResponse = await response.json();
    
    if (onProgress) {
      onProgress(4, 4); // Completed
    }
    
    // In a real implementation, we would return both the audio and cache information
    // For now, we'll just return the audio
    return data.audio;
  } catch (error: any) {
    console.error("Generation failed", error);
    throw new Error(error.message || "Не удалось сгенерировать аудио. Пожалуйста, попробуйте еще раз.");
  }
};