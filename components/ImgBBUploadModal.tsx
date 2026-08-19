'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, Image as ImageIcon, Loader2, Copy, Check, X, RefreshCw } from 'lucide-react';

interface ImgBBUploadModalProps {
  onUploadSuccess?: (url: string) => void;
  buttonLabel?: string;
  className?: string;
}

export default function ImgBBUploadModal({
  onUploadSuccess,
  buttonLabel = 'Upload to ImgBB',
  className = '',
}: ImgBBUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setCopied(false);
    setIsOpen(true);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/imgbb', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to upload image to ImgBB');
      }

      setUploadedUrl(data.url);
      if (onUploadSuccess) {
        onUploadSuccess(data.url);
      }
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadedUrl) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(uploadedUrl);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = uploadedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadedUrl && onUploadSuccess) {
      onUploadSuccess(uploadedUrl);
    }
    setIsOpen(false);
  };

  const triggerFileSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-all cursor-pointer touch-manipulation shrink-0 ${className}`}
      >
        <Upload className="w-4 h-4 text-cyan-400" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div 
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Modal Container: Stops event bubbling to backdrop */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] space-y-5"
          >
            
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>Upload Image to ImgBB</span>
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden native input, activated strictly via ref */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />

            {/* Isolated Dashed Upload Dropzone */}
            <div 
              onClick={triggerFileSelect}
              className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all bg-slate-950/60 hover:bg-slate-950/90 group"
            >
              {previewUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  {!uploading && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-extrabold text-white">
                      <RefreshCw className="w-4 h-4 text-cyan-400" />
                      <span>Click to Change Image</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                      Click to choose image file
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP, GIF (Max 32MB)</p>
                  </div>
                </>
              )}
            </div>

            {/* Uploading Spinner */}
            {uploading && (
              <div className="flex items-center justify-center gap-2.5 py-2 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Uploading high-resolution image to ImgBB...</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-xs text-red-400 font-semibold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}

            {/* Upload Success & Copy URL Box */}
            {uploadedUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Uploaded Successfully!
                  </span>
                  {copied && (
                    <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> Copied to Clipboard!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={uploadedUrl}
                    className="bg-transparent text-xs font-mono text-slate-300 w-full focus:outline-none truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      copied 
                        ? 'bg-emerald-500 text-slate-950 shadow-md' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Done / Close Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDone}
                className={`w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
                  uploadedUrl
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {uploadedUrl ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Done & Apply Image</span>
                  </>
                ) : (
                  <span>Close</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

