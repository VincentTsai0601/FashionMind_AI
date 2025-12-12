import React, { useCallback, useRef } from 'react';

interface FileUploadProps {
  onImageSelect: (base64: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className="w-full h-80 border-2 border-dashed border-neutral-300 hover:border-fashion-accent transition-colors duration-500 cursor-pointer flex flex-col items-center justify-center group bg-white relative overflow-hidden"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className="mb-4 p-4 rounded-full bg-fashion-bg group-hover:bg-orange-50 transition-colors duration-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fashion-subtext group-hover:text-fashion-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      
      <p className="font-serif text-2xl italic text-fashion-text mb-2">Upload Photo</p>
      <p className="text-fashion-subtext text-xs tracking-[0.2em] uppercase">Drag & Drop or Select</p>
    </div>
  );
};

export default FileUpload;