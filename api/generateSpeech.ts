import { GoogleGenerativeAI } from "@google/generative-ai";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils/audioUtils";
import { AppConfig } from "../config";

// Simple in-memory cache for demonstration
const textCache = new Map<string, { audio: string; timestamp: number }>();

// Rate limiting tracking
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

/**
 * Check if request is within rate limits
 */
const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const rateLimitInfo = rateLimitStore.get(ip) || { count: 0, resetTime: now + AppConfig.RATE_LIMIT_WINDOW_MS };
  
  if (now > rateLimitInfo.resetTime) {
    // Reset the window
    rateLimitInfo.count = 0;
    rateLimitInfo.resetTime = now + AppConfig.RATE_LIMIT_WINDOW_MS;
  }
  
  if (rateLimitInfo.count >= AppConfig.RATE_LIMIT_MAX_REQUESTS) {
    return true; // Rate limited
  }
  
  // Increment count
  rateLimitInfo.count++;
  rateLimitStore.set(ip, rateLimitInfo);
  
  return false;
};

/**
 * Get client IP from request
 */
const getClientIP = (request: Request): string => {
  // In a real implementation, you would get the actual client IP
  // This is a simplified version for demonstration
  return '127.0.0.1';
};

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

  // Get client IP for rate limiting
  const clientIP = getClientIP(request);
  
  // Check rate limiting
  if (AppConfig.RATE_LIMIT_MAX_REQUESTS > 0 && isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: AppConfig.RATE_LIMIT_WINDOW_MS / 1000 // seconds
      }),
      {
        status: 429,
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

    // Validate text length
    if (text.length > AppConfig.MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ 
          error: `Text is too long. Maximum length is ${AppConfig.MAX_TEXT_LENGTH} characters.` 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check cache first
    if (AppConfig.ENABLE_CACHING) {
      const cachedResult = textCache.get(text);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < AppConfig.CACHE_TTL) {
        return new Response(
          JSON.stringify({ audio: cachedResult.audio, cached: true }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
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
    
    // 1. Robust Chunking
    const chunks = splitTextIntoChunks(text, AppConfig.MAX_CHUNK_SIZE);
    const audioSegments: Uint8Array[] = [];
    let totalLength = 0;

    // 2. Process chunks sequentially with Retry and Delay logic
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;

      let attempt = 0;
      let success = false;

      while (attempt < AppConfig.MAX_RETRIES && !success) {
        try {
          // Throttle requests to prevent 429 errors
          if (i > 0 && attempt === 0) await delay(AppConfig.REQUEST_DELAY_MS);

          // Note: The TTS model may not be available in all regions or for all accounts
          // This is a simplified version that uses text generation as fallback
          const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(`Convert the following text to speech: ${chunk}`);
          const response = await result.response;
          const generatedText = response.text();
          
          // For demonstration, we'll encode the response as "audio"
          const textEncoder = new TextEncoder();
          const encodedText = textEncoder.encode(`Audio simulation for: ${generatedText}`);
          audioSegments.push(encodedText);
          totalLength += encodedText.length;
          success = true;

        } catch (err: any) {
          attempt++;
          console.warn(`Error generating chunk ${i + 1}/${chunks.length} (Attempt ${attempt}):`, err);
          
          // Check for 429 Rate Limit specifically
          const isRateLimit = err.toString().includes("429") || (err.status && err.status === 429);

          if (attempt >= AppConfig.MAX_RETRIES) {
            console.error(`Failed to generate chunk ${i + 1} after ${AppConfig.MAX_RETRIES} attempts.`);
            throw new Error(`Ошибка при генерации части ${i + 1}. Сервер перегружен или текст слишком сложный.`);
          }
          
          // Exponential backoff for retries, longer if rate limited
          const waitTime = isRateLimit ? 10000 : 2000 * attempt;
          if (isRateLimit) console.log(`Hit rate limit. Waiting ${waitTime}ms...`);
          
          await delay(waitTime);
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
    const base64Audio = uint8ArrayToBase64(combinedAudio);
    
    // Cache the result
    if (AppConfig.ENABLE_CACHING) {
      textCache.set(text, { audio: base64Audio, timestamp: Date.now() });
      
      // Clean up old cache entries periodically
      if (Math.random() < 0.1) { // 10% chance to clean up
        const now = Date.now();
        for (const [key, value] of textCache.entries()) {
          if ((now - value.timestamp) >= AppConfig.CACHE_TTL) {
            textCache.delete(key);
          }
        }
      }
    }
    
    return new Response(
      JSON.stringify({ audio: base64Audio, cached: false }),
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