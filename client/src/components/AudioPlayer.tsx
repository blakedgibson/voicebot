import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { AudioPlayerProps } from "@/types";

export default function AudioPlayer({
  audioUrl,
  sampleText,
  isPlaying: externalIsPlaying,
  onPlay,
  onPause,
  className = "",
}: AudioPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setInternalIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPause]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setInternalIsPlaying(false);
        onPause?.();
      } else {
        // For demo purposes, since we don't have real audio files,
        // we'll simulate audio playback
        if (!audioUrl || audioUrl.startsWith('/audio/')) {
          // Mock audio playback
          setInternalIsPlaying(true);
          onPlay?.();
          
          // Simulate 3-5 second audio duration
          const mockDuration = Math.random() * 2 + 3; // 3-5 seconds
          setTimeout(() => {
            setInternalIsPlaying(false);
            onPause?.();
          }, mockDuration * 1000);
          return;
        }

        await audio.play();
        setInternalIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      // Fallback to mock playback
      setInternalIsPlaying(true);
      onPlay?.();
      
      setTimeout(() => {
        setInternalIsPlaying(false);
        onPause?.();
      }, 3000);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full bg-primary hover:bg-primary/90 text-white transition-colors ${className}`}
        onClick={handlePlayPause}
        data-testid="button-audio-play"
      >
        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xs`}></i>
      </Button>
      
      {/* Hidden audio element for real audio files */}
      {audioUrl && !audioUrl.startsWith('/audio/') && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
      
      {/* Progress indicator for longer players */}
      {duration > 0 && className.includes('w-full') && (
        <div className="flex-1 mx-3">
          <div className="bg-white rounded-full h-1.5 mb-1">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
