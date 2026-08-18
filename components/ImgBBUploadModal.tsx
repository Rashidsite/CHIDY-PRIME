'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle2, Image as ImageIcon, Loader2, Copy, X } from 'lucide-react';

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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setUploadedUrl(data.url);
      if (onUploadSuccess) onUploadSuccess(data.url);
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
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

  const handleCopy = () => {
    if (!uploadedUrl) return;
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all ${className}`}
      >
        <Upload className="w-4 h-4 text-accent-cyan" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[6px] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] space-y-4 overscroll-contain">
            
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-accent-cyan" />
              <span>Upload Image to ImgBB</span>
            </h3>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-500 transition-colors bg-slate-950/50">
              {previewUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">
                    Click to select PNG, JPG, WEBP image
                  </p>
                  <p className="text-xs text-slate-500">Max size 32MB • Direct ImgBB API</p>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-brand-glow">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading high-resolution image to ImgBB...</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 font-medium text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                {error}
              </p>
            )}

            {uploadedUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Uploaded Successfully!
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
                  <input
                    type="text"
                    readOnly
                    value={uploadedUrl}
                    className="bg-transparent text-xs text-slate-300 w-full focus:outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && <span className="text-[10px] text-accent-cyan block text-right">Copied!</span>}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
