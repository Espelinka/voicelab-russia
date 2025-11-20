import { GoogleGenAI, Modality } from "@google/genai";

export const generateSpeechFromText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Using the specific TTS model as instructed
  const modelId = "gemini-2.5-flash-preview-tts";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // "Kore" is a balanced voice, often perceived as female in current checkpoints.
            // "Zephyr" is also an option, but we'll stick to Kore for consistency.
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error("No candidates returned from Gemini API");
    }

    const audioPart = candidates[0]?.content?.parts?.find(part => part.inlineData);

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data found in the response.");
    }

    return audioPart.inlineData.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};