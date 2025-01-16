import React, { useState, useEffect, useRef, useCallback } from 'react';
      import { PDFTemplate, PDFField } from '../types';
      import { createClient } from '@supabase/supabase-js';
      import { Pencil, Trash2, Plus } from 'lucide-react';
      import toast from 'react-hot-toast';
      import * as pdfjsLib from 'pdfjs-dist';
      import 'pdfjs-dist/web/pdf_viewer.css';
import { supabase, saveFields, loadFields, getPdfSignedUrl } from '../lib/supabase';

      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      interface PDFViewerProps {
        template: PDFTemplate;
      }

      export function PDFViewer({ template }: PDFViewerProps) {
        const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
        const [numPages, setNumPages] = useState(0);
        const [pageNumber, setPageNumber] = useState(1);
        const [fields, setFields] = useState<PDFField[]>([]);
        const [selectedField, setSelectedField] = useState<PDFField | null>(null);
        const [isEditing, setIsEditing] = useState(false);
        const [isUploading, setIsUploading] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [pdfUrl, setPdfUrl] = useState('');
        const [loadingPdf, setLoadingPdf] = useState(true);
        const [pdfError, setPdfError] = useState<string | null>(null);
        const [key, setKey] = useState(0);
        const [isDragging, setIsDragging] = useState(false);
        const [draggedField, setDraggedField] = useState<PDFField | null>(null);
        const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

useEffect(() => {
  const fetchFields = async () => {
    try {
      const data = await loadFields(template.id);
      setFields(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  fetchFields();
}, [template.id]);

       const fetchPdfUrl = async () => {
  if (!template?.file_url) {
    setPdfError('No PDF file URL provided');
    setLoadingPdf(false);
    return;
  }

  setLoadingPdf(true);
  setPdfError(null);

  try {
    const signedUrl = await getPdfSignedUrl(template.file_url);
    setPdfUrl(signedUrl);
  } catch (error: any) {
    console.error('Error fetching PDF:', error);
    setPdfError('Failed to load PDF file');
    toast.error('Failed to load PDF file');
  } finally {
    setLoadingPdf(false);
  }
};

            // Get a fresh download URL
            const { data, error } = await supabase.storage
              .from('pdf-templates')
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (error) throw error;
            
            if (data?.signedUrl) {
              setPdfUrl(data.signedUrl);
            } else {
              throw new Error('Failed to generate signed URL');
            }
          } catch (error: any) {
            console.error('Error fetching PDF:', error);
            setPdfError('Failed to load PDF file');
            toast.error('Failed to load PDF file');
          } finally {
            setLoadingPdf(false);
          }
        };

        const loadPdf = useCallback(async () => {
          if (!pdfUrl) return;
          setLoadingPdf(true);
          try {
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            renderPage(pdf, pageNumber);
          } catch (error: any) {
            console.error('Error loading PDF:', error);
            setPdfError('Failed to load PDF file');
            toast.error('Failed to load PDF file');
          } finally {
            setLoadingPdf(false);
          }
        }, [pdfUrl, pageNumber]);

        useEffect(() => {
          loadPdf();
        }, [loadPdf]);

        const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
          if (!canvasRef.current || !pdf) return;
          try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            const canvas = canvasRef.current;
            const canvasContext = canvas.getContext('2d');
            if (!canvasContext) return;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext,
              viewport,
            };
            await page.render(renderContext).promise;
          } catch (error: any) {
            console.error('Error rendering PDF page:', error);
            setPdfError('Failed to render PDF page');
            toast.error('Failed to render PDF page');
          }
        };

        const handleAddField = () => {
          if (!containerRef.current || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const x = rect.width / 2;
          const y = rect.height / 2;

          const newField: PDFField = {
            id: Math.random().toString(36).substring(2, 15),
            template_id: template.id,
            name: 'New Field',
            type: 'editable',
            x: x,
            y: y,
            width: 100,
            height: 20,
            page: pageNumber,
          };
          setFields([...fields, newField]);
          setSelectedField(newField);
          setIsEditing(true);
        };

        const handleFieldClick = (e: React.MouseEvent, field: PDFField) => {
          e.stopPropagation();
          setSelectedField(field);
          setIsEditing(true);
        };

        const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, fieldId: string, key: keyof PDFField) => {
          setFields(fields.map(field => {
            if (field.id === fieldId) {
              return { ...field, [key]: e.target.value };
            }
            return field;
          }));
        };

        const handleFieldDelete = (fieldId: string) => {
          setFields(fields.filter(field => field.id !== fieldId));
          setSelectedField(null);
          setIsEditing(false);
        };

   const handleSaveFields = async () => {
  setIsUploading(true);
  try {
    await saveFields(template.id, fields);
    toast.success('Fields saved successfully');
    onSave?.();
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setIsUploading(false);
  }
};

            // Insert new fields
            const { error: insertError } = await supabase
              .from('pdf_fields')
              .insert(fields.map(field => ({
                ...field,
                template_id: template.id,
              })));

            if (insertError) throw insertError;

            toast.success('Fields saved successfully');
            setKey(prevKey => prevKey + 1);
          } catch (error: any) {
            toast.error(error.message);
          } finally {
            setIsUploading(false);
          }
        };

        const handlePageChange = (newPage: number) => {
          if (newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage);
            if (pdfDoc) {
              renderPage(pdfDoc, newPage);
            }
          }
        };

        const handleDragStart = (e: React.MouseEvent, field: PDFField) => {
          setIsDragging(true);
          setDraggedField(field);
          const offsetX = e.clientX - field.x;
          const offsetY = e.clientY - field.y;
          setDragOffset({ x: offsetX, y: offsetY });
        };

        const handleDrag = (e: React.MouseEvent) => {
          if (!isDragging || !draggedField) return;
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;

          setFields(fields.map(field => {
            if (field.id === draggedField.id) {
              return { ...field, x: newX, y: newY };
            }
            return field;
          }));
        };

        const handleDragEnd = () => {
          setIsDragging(false);
          setDraggedField(null);
        };

        return (
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-3/4 relative">
              <div
                ref={containerRef}
                className="relative border border-gray-300 rounded-md overflow-hidden"
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
              >
                {loadingPdf ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : pdfError ? (
                  <div className="flex justify-center items-center h-64 text-red-600">
                    {pdfError}
                  </div>
                ) : (
                  <canvas ref={canvasRef} />
                )}
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="absolute"
                    style={{
                      left: field.x,
                      top: field.y,
                      width: field.width,
                      height: field.height,
                      pointerEvents: 'auto',
                    }}
                  >
                    {field.type === 'editable' ? (
                      <input
                        type="text"
                        value={field.value || ''}
                        placeholder={field.name}
                        onChange={(e) => handleFieldChange(e, field.id, 'value')}
                        className={`w-full h-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                    ) : (
                      <div
                        onMouseDown={(e) => handleDragStart(e, field)}
                        onClick={(e) => handleFieldClick(e, field)}
                        className={`w-full h-full border border-blue-500 rounded-md cursor-pointer transition-all duration-200 ${
                          selectedField?.id === field.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        {selectedField?.id === field.id && isEditing && (
                          <div className="absolute top-0 left-0 bg-white p-2 border border-blue-500 rounded-md shadow-md z-10">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-700">Edit Field</h4>
                              <button
                                onClick={() => handleFieldDelete(field.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs text-gray-600">Name</label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => handleFieldChange(e, field.id, 'name')}
                                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <label className="block text-xs text-gray-600">Type</label>
                              <select
                                value={field.type}
                                onChange={(e) => handleFieldChange(e, field.id, 'type')}
                                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="editable">Editable</option>
                                <option value="prefilled">Prefilled</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => handlePageChange(pageNumber - 1)}
                  disabled={pageNumber <= 1}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="mx-4 text-gray-600">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={() => handlePageChange(pageNumber + 1)}
                  disabled={pageNumber >= numPages}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="lg:w-1/4 p-4">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handleAddField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4 mr-2 inline-block" />
                  New Field
                </button>
                <button
                  onClick={handleSaveFields}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Saving...' : 'Save Fields'}
                </button>
              </div>
              <div className="bg-white rounded-md shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Instructions
                </h3>
                <p className="text-sm text-gray-600">
                  Click on a field to edit it. Use the "New Field" button to add a new text box.
                </p>
              </div>
            </div>
          </div>
        );
      }
export default PDFViewer;
