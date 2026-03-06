
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Image as ImageIcon, XCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ImageUploaderProps {
  initialImage?: string;
  onImageChange: (base64: string) => void;
  className?: string;
}

const isValidImageUrl = (url?: string): url is string => {
    return !!url && url.startsWith('data:image/');
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ initialImage, onImageChange, className = '' }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { addToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isValidImageUrl(initialImage)) {
        setImagePreview(initialImage);
    } else {
        setImagePreview(null);
    }
  }, [initialImage]);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) {
        addToast({ type: 'error', message: 'Please select a valid image file.' });
        return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        addToast({ type: 'error', message: 'Image size should not exceed 2MB.' });
        return;
    }
    
    const reader = new FileReader();

    reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
            addToast({ type: 'error', message: 'Failed to read file.' });
            return;
        }
        const dataUrl = reader.result;
        setImagePreview(dataUrl);
        onImageChange(dataUrl);
    };

    reader.onerror = () => {
        addToast({ type: 'error', message: 'Could not read the selected file.' });
        setImagePreview(null);
        onImageChange('');
    };

    reader.readAsDataURL(file);
}, [onImageChange, addToast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);
  
  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const removeImage = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setImagePreview(null);
      onImageChange('');
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const triggerFileSelect = () => {
    if(!imagePreview && fileInputRef.current) {
        fileInputRef.current.click();
    }
  }

  return (
    <div className={`w-full ${className}`}>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Photos (Optional)</label>
        <div 
            className={`relative w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground transition-colors duration-200
            ${imagePreview ? 'border-solid p-0 cursor-default' : 'p-4 cursor-pointer'}
            ${isDragging ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/50'}
            `}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
        >
            <input 
                type="file" 
                id="image-upload"
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={onFileChange}
            />
            {imagePreview ? (
                <>
                    <img src={imagePreview} alt="Product Preview" className="object-cover w-full h-full rounded-lg" />
                    <button 
                        type="button" 
                        onClick={removeImage} 
                        className="absolute top-2 right-2 bg-background/70 rounded-full text-muted-foreground hover:text-red-500 transition-colors"
                        aria-label="Remove image"
                    >
                        <XCircle className="h-6 w-6"/>
                    </button>
                </>
            ) : (
                <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12"/>
                    <p className="mt-2 text-sm">
                        <span className="font-semibold text-primary">Upload a file</span> or drag and drop
                    </p>
                    <p className="text-xs mt-1">PNG, JPG, GIF up to 2MB</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageUploader;
