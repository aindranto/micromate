import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { formatImageUrl } from '../lib/utils';

export interface MediaItem {
  url: string;
  title?: string;
  category?: string;
  type?: 'image' | 'pdf' | 'document';
}

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  initialIndex?: number;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  items,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync index when modal opens with initialIndex
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, items.length]);

  // Reset zoom & pan when active item changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Handle Keyboard Navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < items.length - 1) setCurrentIndex((prev) => prev + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === '-') {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length, onClose]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const formattedUrl = formatImageUrl(currentItem.url);

  // Detect if url or item is PDF
  const isPdf =
    currentItem.type === 'pdf' ||
    currentItem.url?.toLowerCase().endsWith('.pdf') ||
    currentItem.url?.includes('application/pdf');

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.2, 4));
    } else {
      setZoom((prev) => {
        const next = Math.max(prev - 0.2, 0.5);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Dragging / Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md text-stone-100 flex flex-col justify-between select-none animate-fade-in">
      
      {/* Top Header Controls */}
      <div className="p-4 bg-stone-900/80 border-b border-stone-800/80 flex items-center justify-between gap-4 z-20">
        
        {/* Item Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-stone-800 rounded-xl text-emerald-400 shrink-0">
            {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
              {currentItem.title || 'Preview Gambar'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              {currentItem.category && (
                <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold uppercase text-[10px]">
                  {currentItem.category}
                </span>
              )}
              {items.length > 1 && (
                <span>
                  {currentIndex + 1} dari {items.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Zoom Controls */}
        {!isPdf && (
          <div className="hidden md:flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-emerald-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Reset Zoom (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={formattedUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-medium text-xs rounded-xl border border-stone-700 transition-colors"
            title="Buka / Unduh File Original"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-stone-800 hover:bg-rose-900/60 hover:text-rose-200 text-stone-300 rounded-xl transition-all cursor-pointer border border-stone-700/80"
            title="Tutup Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 flex items-center justify-center p-4 overflow-hidden ${
          isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'
        }`}
      >
        {/* Left Arrow Navigation */}
        {items.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="absolute left-4 z-30 p-3 bg-stone-900/80 hover:bg-emerald-600 text-stone-200 hover:text-white rounded-2xl border border-stone-700 transition-all shadow-xl cursor-pointer"
            title="Gambar Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image or PDF Content */}
        {isPdf ? (
          <div className="w-full h-full max-w-4xl max-h-[80vh] bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
            <FileText className="w-16 h-16 text-emerald-500" />
            <h4 className="text-base font-bold text-white">{currentItem.title || 'Dokumen PDF'}</h4>
            <p className="text-xs text-stone-400 max-w-md">
              Dokumen ini diformat sebagai PDF atau tautan berkas eksternal.
            </p>
            <a
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Dokumen / PDF di Tab Baru</span>
            </a>
          </div>
        ) : (
          <div
            className="transition-transform duration-100 ease-out flex items-center justify-center w-full h-full"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`
            }}
          >
            <img
              src={formattedUrl}
              alt={currentItem.title || 'Gambar Aset'}
              referrerPolicy="no-referrer"
              draggable={false}
              className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl pointer-events-auto transition-all"
            />
          </div>
        )}

        {/* Right Arrow Navigation */}
        {items.length > 1 && currentIndex < items.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="absolute right-4 z-30 p-3 bg-stone-900/80 hover:bg-emerald-600 text-stone-200 hover:text-white rounded-2xl border border-stone-700 transition-all shadow-xl cursor-pointer"
            title="Gambar Selanjutnya (Panah Kanan)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Mobile Zoom Floating Indicator */}
        {!isPdf && (
          <div className="md:hidden absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-xl">
            <button type="button" onClick={handleZoomOut} className="p-1 text-stone-300">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" onClick={handleZoomIn} className="p-1 text-stone-300">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Gallery Thumbnails Bar */}
      {items.length > 1 && (
        <div className="p-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-center gap-2 overflow-x-auto z-20">
          {items.map((item, idx) => {
            const thumbUrl = formatImageUrl(item.url);
            const isSelected = idx === currentIndex;
            return (
              <button
                key={`gallery-thumb-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-950'
                    : 'border-stone-700 opacity-60 hover:opacity-100 hover:border-stone-500'
                }`}
              >
                {item.type === 'pdf' || item.url?.endsWith('.pdf') ? (
                  <div className="w-full h-full bg-stone-800 flex items-center justify-center text-emerald-400">
                    <FileText className="w-6 h-6" />
                  </div>
                ) : (
                  <img
                    src={thumbUrl}
                    alt={item.title || `Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
