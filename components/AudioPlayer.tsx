import React, { useRef, useEffect, useState } from 'react';

interface AudioPlayerProps {
  blobUrl: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ blobUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("00:00");
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
    }
  }, [blobUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    
    setCurrentTime(formatTime(curr));
    if (!isNaN(dur) && dur > 0) {
        setProgress((curr / dur) * 100);
        setDuration(formatTime(dur));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("00:00");
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!audioRef.current) return;
    const val = Number(e.target.value);
    const dur = audioRef.current.duration;
    if(!isNaN(dur)) {
        audioRef.current.currentTime = (val / 100) * dur;
        setProgress(val);
    }
  };

  return (
    <div className="bg-[#1e293b]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      <audio
        ref={audioRef}
        src={blobUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />
      
      {/* Player Controls Row */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-indigo-900 hover:bg-gray-200 transition-transform hover:scale-105 flex-shrink-0 shadow-lg shadow-white/10"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex flex-col justify-center gap-1.5">
           <div className="relative w-full h-1.5 bg-gray-700/50 rounded-full cursor-pointer group">
              {/* Custom styled range input for better click targets */}
              <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full pointer-events-none transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="absolute top-[-6px] left-0 w-full h-4 opacity-0 cursor-pointer z-10"
              />
           </div>
           <div className="flex justify-between text-[10px] font-bold tracking-widest text-gray-500 uppercase">
             <span>{currentTime}</span>
             <span>{duration}</span>
           </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/5"></div>

      {/* Actions Row */}
      <div className="flex justify-between items-center">
         <span className="text-xs text-gray-400 font-medium">Готово к скачиванию</span>
         <a 
          href={blobUrl} 
          download="voicelab_output.wav"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-white transition-all group"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3.75-3.75M12 12.75l3.75-3.75M12 12.75V3" />
          </svg>
           Скачать WAV
        </a>
      </div>
    </div>
  );
};