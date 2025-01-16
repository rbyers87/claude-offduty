// src/components/PDFViewerWrapper.tsx
import React from 'react';
import { PDFViewer } from './PDFViewer';
import { ErrorBoundary } from './ErrorBoundary';
import { PDFTemplate } from '../types';

interface PDFViewerWrapperProps {
  template: PDFTemplate;
  onSave?: () => void;
}

export function PDFViewerWrapper({ template, onSave }: PDFViewerWrapperProps) {
  const handleError = (error: Error) => {
    console.error('PDF Viewer Error:', error);
  };

  const fallback = (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-red-800 font-semibold">Failed to load PDF viewer</h2>
      <p className="text-red-600 mt-2">
        There was an error loading the PDF viewer. Please try refreshing the page.
      </p>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <PDFViewer 
        template={template} 
        onSave={onSave} 
        onError={handleError}
      />
    </ErrorBoundary>
  );
}
