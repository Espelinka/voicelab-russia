import React, { useState, useRef } from 'react';
import { generateSpeechFromText } from './services/geminiService';
import { extractTextFromPdf } from './utils/pdfUtils';
import { pcmToWavBlob } from './utils/audioUtils';
import { Spinner } from './components/Spinner';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const MAX_CHARS = 100000; // Increased limit to 100k characters

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setText(val);
      setCharCount(val.length);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Пожалуйста, загрузите файл формата PDF.");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractTextFromPdf(file);
      let extractedText = result.text;
      if (extractedText.length > MAX_CHARS) {
        extractedText = extractedText.substring(0, MAX_CHARS);
        setError(`Текст был обрезан до ${MAX_CHARS} символов для быстрой обработки.`);
      }
      setText(extractedText);
      setCharCount(extractedText.length);
    } catch (err) {
      console.error(err);
      setError("Ошибка при чтении PDF. Проверьте файл.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Введите текст или загрузите PDF.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioBlobUrl(null);

    try {
      const base64Audio = await generateSpeechFromText(text);
      const blob = pcmToWavBlob(base64Audio);
      const url = URL.createObjectURL(blob);
      setAudioBlobUrl(url);
    } catch (err: any) {
      console.error("Generation failed", err);
      setError("Не удалось сгенерировать аудио. Пожалуйста, попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setText("");
    setCharCount(0);
    setAudioBlobUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-16 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blurred shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-3xl z-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
           <div className="inline-flex items-center justify-center p-2 bg-white/5 rounded-2xl mb-2 backdrop-blur-sm border border-white/10">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
           </div>
           <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-sm">
             VoiceLab
           </h1>
           <p className="text-lg text-gray-400 font-medium">
             Профессиональная русская озвучка
           </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
          
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
             <div className="flex items-center gap-2 text-xs font-mono text-indigo-300/80 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                Gemini 2.5 AI
             </div>
             
             <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting || isLoading}
                  className="text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border border-white/5"
                >
                   {isExtracting ? <Spinner /> : (
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                   )}
                   PDF
                </button>
                <button 
                  onClick={handleClear}
                  disabled={isLoading || !text}
                  className="text-xs font-medium bg-white/10 hover:bg-red-500/20 hover:text-red-200 text-gray-400 px-3 py-1.5 rounded-lg transition-all border border-white/5"
                >
                  Очистить
                </button>
             </div>
          </div>

          {/* Editor Area */}
          <div className="p-1">
             <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Введите текст или загрузите PDF файл для озвучивания..."
                className="w-full h-64 bg-[#0f172a]/40 text-lg text-gray-100 placeholder-gray-600 p-6 border-none focus:ring-0 resize-none outline-none leading-relaxed scrollbar-thin font-light"
                spellCheck={false}
             />
          </div>
          
          {/* Footer / Actions */}
          <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
             <div className="text-xs text-gray-500 font-medium">
               {charCount} / {MAX_CHARS} символов
             </div>
             
             <button
               onClick={handleGenerate}
               disabled={isLoading || !text}
               className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                  ${isLoading || !text 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                  }
               `}
             >
                {isLoading ? (
                   <>
                     <Spinner />
                     <span>Обработка...</span>
                   </>
                ) : (
                   <>
                     <span>Озвучить текст</span>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </>
                )}
             </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="animate-fade-in bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center gap-3 backdrop-blur-md">
             <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             {error}
          </div>
        )}

        {/* Result Player */}
        {audioBlobUrl && !isLoading && (
           <div className="animate-fade-in">
              <AudioPlayer blobUrl={audioBlobUrl} />
           </div>
        )}

      </div>
    </div>
  );
};

export default App;