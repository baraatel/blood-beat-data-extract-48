
import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Loader2, Smartphone, Camera, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  processing: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, processing }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detect mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth <= 768 ||
                    ('ontouchstart' in window);
      setIsMobile(mobile);
      console.log('Mobile detected:', mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const processFiles = useCallback((files: File[]) => {
    console.log('Processing files:', files.length, 'files received');
    const imageFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      console.log('File:', file.name, 'Type:', file.type, 'Is image:', isImage);
      return isImage;
    });
    
    console.log('Image files filtered:', imageFiles.length);
    
    if (imageFiles.length > 0) {
      console.log('Calling onUpload with', imageFiles.length, 'image files');
      onUpload(imageFiles);
    } else {
      console.warn('No valid image files found');
    }
  }, [onUpload]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCameraOptions(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraOptions(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            processFiles([file]);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Desktop dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: true,
    disabled: processing || isMobile, // Disable dropzone for mobile
    noClick: isMobile, // Prevent dropzone clicks on mobile
  });

  // Handle mobile file input with proper event handling
  const handleMobileFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Mobile file input triggered');
    event.stopPropagation();
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('Files selected on mobile:', fileArray.length);
      processFiles(fileArray);
    }
    // Reset the input so the same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  }, [processFiles]);

  // Handle mobile upload button click with proper event handling
  const handleMobileClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    console.log('Mobile upload button clicked/touched');
    event.preventDefault();
    event.stopPropagation();
    
    if (processing) {
      console.log('Processing in progress, ignoring click');
      return;
    }
    
    if (fileInputRef.current) {
      console.log('Triggering file input click');
      // Use setTimeout to ensure the click happens after event handling
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 50);
    }
  }, [processing]);

  // Camera UI
  if (showCameraOptions) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed border-red-200 rounded-lg p-6 text-center bg-red-50">
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md mx-auto rounded-lg"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button
                onClick={capturePhoto}
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={processing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Cancel
              </Button>
            </div>
            
            <p className="text-sm text-gray-600">
              Position your blood pressure monitor in the camera view and tap "Capture Photo"
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mobile UI with camera option
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed border-red-200 rounded-lg p-6 text-center bg-red-50">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleMobileFileSelect}
            disabled={processing}
          />
          
          <div className="flex flex-col items-center space-y-4">
            {processing ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
                <p className="text-red-600 font-medium text-center">Processing images...</p>
                <p className="text-sm text-gray-500 text-center">This may take a few moments</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-red-100 rounded-full">
                  <Smartphone className="h-8 w-8 text-red-600" />
                </div>
                
                <div className="space-y-2 text-center">
                  <p className="text-lg font-medium text-gray-900">
                    Capture or Select Blood Pressure Images
                  </p>
                  <p className="text-sm text-gray-600 px-2">
                    Use camera or select from your device
                  </p>
                  <p className="text-xs text-gray-500 px-2">
                    Supports: PNG, JPG, JPEG, GIF, BMP, WebP
                  </p>
                </div>
                
                <div className="flex flex-col space-y-3 w-full max-w-xs">
                  <button
                    type="button"
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3 text-base min-h-[48px] rounded-lg font-medium touch-manipulation select-none"
                    disabled={processing}
                    onClick={startCamera}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none'
                    }}
                  >
                    <Camera className="h-5 w-5 mr-2 inline-block" />
                    Use Camera
                  </button>
                  
                  <button
                    type="button"
                    className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-6 py-3 text-base min-h-[48px] rounded-lg font-medium touch-manipulation select-none"
                    disabled={processing}
                    onClick={handleMobileClick}
                    onTouchEnd={handleMobileClick}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none'
                    }}
                  >
                    <FileImage className="h-5 w-5 mr-2 inline-block" />
                    Select from Gallery
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {processing && (
          <div className="text-center px-4">
            <p className="text-sm text-gray-600">
              Using AI to extract data from your images...
            </p>
          </div>
        )}
      </div>
    );
  }

  // Desktop UI with drag & drop and camera option
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-red-400 bg-red-50' 
            : 'border-red-200 hover:border-red-300 hover:bg-red-50'
          }
          ${processing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {processing ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
              <p className="text-red-600 font-medium">Processing images...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-red-100 rounded-full">
                {isDragActive ? (
                  <Upload className="h-8 w-8 text-red-600" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-red-600" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive
                    ? "Drop your blood pressure monitor images here" 
                    : "Upload Blood Pressure Monitor Images"
                  }
                </p>
                <p className="text-sm text-gray-600">
                  Drag & drop images here, or use the options below
                </p>
                <p className="text-xs text-gray-500">
                  Supports: PNG, JPG, JPEG, GIF, BMP, WebP (Multiple files allowed)
                </p>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={startCamera}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={processing}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Use Camera
                </Button>
                <Button
                  type="button"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={processing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {processing && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Using AI to extract data from your images...
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
