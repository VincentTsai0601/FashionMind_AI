import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Unable to access camera. Please ensure permissions are granted.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run once on mount

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        // Note: If we mirrored the preview with CSS, we might want to mirror the capture too
        // or keep it raw. Usually raw is better for AI analysis, but mirroring is better for UX.
        // Let's capture raw (non-mirrored) for accuracy, but the user sees mirrored.
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(base64);
      }
    }
  };

  if (error) {
    return (
      <div className="w-full h-80 border-2 border-dashed border-red-200 bg-red-50 flex items-center justify-center text-red-500 p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-black relative overflow-hidden group">
      {/* Video Feed - Mirrored for natural feel */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={handleCapture}
          className="w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full border-2 border-fashion-text bg-transparent"></div>
        </button>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/80 text-[10px] uppercase tracking-[0.2em] shadow-black drop-shadow-md">Tap to Capture</p>
      </div>
    </div>
  );
};

export default CameraCapture;