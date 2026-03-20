'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export function DragDropOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on the upload page itself
  const isUploadPage = pathname === '/upload';

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (isUploadPage) return;
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, [isUploadPage]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    // Only hide if leaving the window
    if (e.relatedTarget === null || !(e.relatedTarget instanceof Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploadPage) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      // Store files in sessionStorage for the upload page to pick up
      const fileNames = Array.from(files).map(f => f.name);
      sessionStorage.setItem('draggedFiles', JSON.stringify(fileNames));
      // Navigate to upload page
      router.push('/upload');
    }
  }, [isUploadPage, router]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  if (!isDragging || isUploadPage) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-ono-green/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 border-2 border-dashed border-ono-green text-center max-w-md mx-4">
        <Upload className="w-16 h-16 text-ono-green mx-auto mb-4 animate-bounce" />
        <p className="text-xl font-bold text-ono-gray-dark dark:text-white mb-2">שחררו כאן להעלאה</p>
        <p className="text-sm text-ono-gray dark:text-gray-400">הקבצים יועברו לדף ההעלאה</p>
      </div>
    </div>
  );
}
