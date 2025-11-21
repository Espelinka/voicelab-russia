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
    // Simulate progress reporting since we don't have chunk information on client
    if (onProgress) {
      onProgress(1, 3);
      setTimeout(() => onProgress(2, 3), 500);
    }

    const response = await fetch('/api/generateSpeech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (onProgress) {
      onProgress(3, 3);
    }
    
    return data.audio;
  } catch (error: any) {
    console.error("Generation failed", error);
    throw new Error(error.message || "Не удалось сгенерировать аудио. Пожалуйста, попробуйте еще раз.");
  }
};