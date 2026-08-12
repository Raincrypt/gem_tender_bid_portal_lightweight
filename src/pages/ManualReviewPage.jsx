import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileSearch,
  Save,
  CheckCircle2,
  Upload,
  RefreshCw,
  PlusCircle,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  FileUp,
} from 'lucide-react';
import { savePdfBlob, getAllPdfBlobs } from '../services/pdfStore';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import {
  API_ENDPOINTS,
  LOCAL_STORAGE_HISTORY_KEY,
  DATE_VERIFICATION_CUTOFF,
  VALID_MINISTRIES,
  VALID_MINISTRY_KEYWORDS,
} from '../config/config';

const LOCAL_STORAGE_PDF_READ_KEY = 'portal_pdf_read_progress';

// Helper date cutoff verification
const verifyDateAfterCutoff = (dateStr) => {
  if (!dateStr || dateStr === 'Not Found') return 'No';
  try {
    const cleaned = dateStr.trim();
    let d = null;
    const match1 = cleaned.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (match1) {
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      if (months[match1[2]] !== undefined) {
        d = new Date(Number(match1[3]), months[match1[2]], Number(match1[1]));
      }
    }
    if (!d) {
      const match2 = cleaned.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
      if (match2) {
        d = new Date(Number(match2[3]), Number(match2[2]) - 1, Number(match2[1]));
      }
    }
    if (!d || isNaN(d.getTime())) d = new Date(cleaned);
    if (isNaN(d.getTime())) return 'No';
    return d >= DATE_VERIFICATION_CUTOFF ? 'Yes' : 'No';
  } catch {
    return 'No';
  }
};

// Helper ministry verification
const verifyMinistryDepartment = (ministryStr) => {
  if (!ministryStr || ministryStr === 'Not Found') return 'No';
  const upper = ministryStr.toUpperCase();
  const directMatch = VALID_MINISTRIES.some((valid) => upper.includes(valid.toUpperCase()));
  if (directMatch) return 'Yes';
  const keywordMatch = VALID_MINISTRY_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()));
  return keywordMatch ? 'Yes' : 'No';
};

const sortExtractedData = (data) => {
  return [...data].sort((a, b) => {
    const vendorA = (a.vendorFolder || '').toLowerCase();
    const vendorB = (b.vendorFolder || '').toLowerCase();
    if (vendorA === '' && vendorB !== '') return 1;
    if (vendorA !== '' && vendorB === '') return -1;
    if (vendorA < vendorB) return -1;
    if (vendorA > vendorB) return 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
};

const groupRowsByVendor = (data) => {
  const groups = new Map();
  data.forEach((row) => {
    const key = row.vendorFolder && row.vendorFolder.trim() !== '' ? row.vendorFolder : 'Uncategorized Vendor';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, vendorFolder: key });
  });
  return Array.from(groups.values()).flat();
};

// Canvas-based interactive PDF Viewer sub-component
function PdfCanvasViewer({ pdfUrl, activePage, onPageChange, onTotalPagesKnown, onMarkPageRead }) {
  const [numPages, setNumPages] = useState(0);
  const [pageInput, setPageInput] = useState(activePage);
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(1.25);
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'embed'

  const [prevActivePage, setPrevActivePage] = useState(activePage);
  if (prevActivePage !== activePage) {
    setPrevActivePage(activePage);
    setPageInput(activePage);
  }

  useEffect(() => {
    if (!pdfUrl) return;
    let isCancelled = false;

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(
      (doc) => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setPdfError(null);
        setNumPages(doc.numPages);
        if (onTotalPagesKnown) onTotalPagesKnown(doc.numPages);
      },
      (err) => {
        if (isCancelled) return;
        console.warn('PDF loading error:', err);
        setPdfError('Canvas viewer encountered an issue loading this PDF. Try switching to Embedded mode.');
      }
    );
    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, onTotalPagesKnown]);

  useEffect(() => {
    if (!pdfDoc || !activePage || !canvasRef.current || viewMode !== 'canvas') return;
    let isCancelled = false;
    let currentRenderTask = null;

    const pageToRender = Math.max(1, Math.min(numPages || 1, activePage));
    setIsRendering(true);

    pdfDoc.getPage(pageToRender).then((page) => {
      if (isCancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = { canvasContext: context, viewport };
      currentRenderTask = page.render(renderContext);
      currentRenderTask.promise.then(() => {
        if (isCancelled) return;
        setIsRendering(false);
        if (onMarkPageRead) onMarkPageRead(pageToRender);
      }).catch((err) => {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.warn('Canvas render error:', err);
          setIsRendering(false);
        }
      });
    }).catch(() => {
      if (!isCancelled) setIsRendering(false);
    });

    return () => {
      isCancelled = true;
      if (currentRenderTask) {
        try {
          currentRenderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, activePage, numPages, scale, viewMode, onMarkPageRead]);

  const handleGoToPage = (newPage) => {
    const p = Math.max(1, Math.min(numPages || 1, newPage));
    setPageInput(p);
    onPageChange(p);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Viewer Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGoToPage(activePage - 1)}
            disabled={activePage <= 1}
            className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition"
          >
            Prev Page
          </button>
          <span className="text-gray-700 dark:text-gray-300 font-mono">
            Page {activePage} / {numPages || '--'}
          </span>
          <button
            type="button"
            onClick={() => handleGoToPage(activePage + 1)}
            disabled={activePage >= numPages}
            className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition"
          >
            Next Page
          </button>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'canvas' && (
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(1)))}
                className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[11px] font-mono text-gray-500 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(3.0, +(s + 0.2).toFixed(1)))}
                className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-500 font-normal">Go pg:</span>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageInput}
              onChange={(e) => setPageInput(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage(pageInput)}
              className="w-12 text-center text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 px-1 py-0.5 text-gray-800 dark:text-gray-200"
            />
          </div>

          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'canvas' ? 'embed' : 'canvas'))}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-[11px] font-medium hover:bg-gray-300 transition"
          >
            {viewMode === 'canvas' ? 'Embedded Mode' : 'Canvas Mode'}
          </button>
        </div>
      </div>

      {/* Viewer Canvas Container */}
      <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-950 p-4 flex items-center justify-center min-h-[450px]">
        {viewMode === 'embed' ? (
          <embed
            src={`${pdfUrl}#page=${activePage}`}
            type="application/pdf"
            className="w-full h-full rounded border border-gray-300 dark:border-gray-800 min-h-[500px]"
          />
        ) : pdfError ? (
          <div className="text-center p-6 text-xs text-red-500 font-semibold max-w-xs space-y-3">
            <p>{pdfError}</p>
            <button
              type="button"
              onClick={() => setViewMode('embed')}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition"
            >
              Switch to Embedded Browser Viewer
            </button>
          </div>
        ) : (
          <div className="relative shadow-lg rounded border border-gray-300 dark:border-gray-800 bg-white">
            <canvas ref={canvasRef} className="max-w-full h-auto block" />
            {isRendering && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center text-xs font-bold text-gray-800 dark:text-gray-200">
                Loading page {activePage}...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManualReview({ selectedTenderId = '' }) {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [uploadedPdfUrls, setUploadedPdfUrls] = useState({});

  // PDF read tracking state: { [pdfKey]: { viewedPages: number[], totalPages: number } }
  const [pdfReadProgress, setPdfReadProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PDF_READ_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Selected PDF key state (vendorFolder::fileName)
  const [selectedPdfKey, setSelectedPdfKey] = useState('');
  const [activePageNumber, setActivePageNumber] = useState(1);

  // Modal State for adding a new row
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowFields, setNewRowFields] = useState({
    woNumber: '',
    itemDescription: '',
    qty: '1',
    unit: 'LOT',
    rate: '0',
    amount: '0',
    date: new Date().toISOString().split('T')[0],
    ministry: 'Ministry of Petroleum & Natural Gas',
    pageStart: '1',
    pageEnd: '1',
  });

  // Editable Form State for selected record
  const [formData, setFormData] = useState({
    woNumber: '',
    woValue: '',
    date: '',
    ministry: '',
    dateVerified: 'No',
    ministryVerified: 'No',
    completionCertificate: 'No',
    recommendation: 'No',
    vendorFolder: '',
    fileName: '',
    pageIndex: 1,
  });

  // Persist PDF read progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PDF_READ_KEY, JSON.stringify(pdfReadProgress));
    } catch {
      // ignore
    }
  }, [pdfReadProgress]);

  // Handle selecting a record and setting form data
  const handleSelectRecord = useCallback((record) => {
    if (!record) return;
    setSelectedRecordId(record.id);
    setFormData({
      woNumber: record.woNumber || '',
      woValue: record.woValue || (record.amount ? `₹ ${record.amount}` : ''),
      date: record.date || '',
      ministry: record.ministry || '',
      dateVerified: record.dateVerified || verifyDateAfterCutoff(record.date),
      ministryVerified: record.ministryVerified || verifyMinistryDepartment(record.ministry),
      completionCertificate: record.completionCertificate || 'No',
      recommendation: record.recommendation || 'No',
      vendorFolder: record.vendorFolder || '',
      fileName: record.fileName || '',
      pageIndex: record.pageIndex || record.pageStart || 1,
    });
  }, []);

  // Fetch bids from backend or local storage
  useEffect(() => {
    let isMounted = true;
    const fetchBids = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(API_ENDPOINTS.bids);
        if (!res.ok) throw new Error('Failed to fetch bids');
        const data = await res.json();

        let localData = [];
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
          if (saved) localData = JSON.parse(saved);
        } catch {
          // ignore
        }

        const combinedMap = new Map();
        if (Array.isArray(localData)) {
          localData.forEach((item) => {
            if (item && item.id) combinedMap.set(item.id, item);
          });
        }
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item && item.id) combinedMap.set(item.id, item);
          });
        }

        const merged = Array.from(combinedMap.values());
        if (isMounted) {
          setRecords(merged);
          localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(merged));
        }
      } catch (err) {
        console.warn('Backend fetch offline, using local storage history:', err);
        const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (saved && isMounted) {
          try {
            const parsed = JSON.parse(saved);
            setRecords(parsed);
          } catch (e) {
            console.error('Failed parsing localStorage:', e);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBids();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sorted records matching Dashboard table vendor grouping & order
  const sortedRecords = useMemo(() => {
    return groupRowsByVendor(sortExtractedData(records));
  }, [records]);

  // Derive unique PDF list grouped by Vendor
  const pdfListByVendor = useMemo(() => {
    const map = new Map();

    sortedRecords.forEach((r) => {
      const vendor = r.vendorFolder && r.vendorFolder.trim() ? r.vendorFolder : 'Uncategorized Vendor';
      const file = r.fileName && r.fileName.trim() ? r.fileName : 'Document.pdf';
      const key = `${vendor}::${file}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          vendorFolder: vendor,
          fileName: file,
          url: uploadedPdfUrls[key] || uploadedPdfUrls[file] || null,
        });
      }
    });

    // Add any uploaded PDFs not yet in records
    Object.keys(uploadedPdfUrls).forEach((key) => {
      if (!map.has(key) && key.includes('::')) {
        const [vendor, file] = key.split('::');
        map.set(key, {
          key,
          vendorFolder: vendor || 'Uploaded Vendor',
          fileName: file || 'Uploaded.pdf',
          url: uploadedPdfUrls[key],
        });
      }
    });

    const list = Array.from(map.values());

    const vendorMap = new Map();
    list.forEach((pdf) => {
      if (!vendorMap.has(pdf.vendorFolder)) vendorMap.set(pdf.vendorFolder, []);
      vendorMap.get(pdf.vendorFolder).push(pdf);
    });

    return Array.from(vendorMap.entries()).map(([vendorFolder, files]) => ({
      vendorFolder,
      files,
    }));
  }, [sortedRecords, uploadedPdfUrls]);

  // Flattened PDF files list for easy lookup
  const allPdfFiles = useMemo(() => {
    return pdfListByVendor.flatMap((v) => v.files);
  }, [pdfListByVendor]);

  // Derived effective selected PDF key
  const effectiveSelectedPdfKey = selectedPdfKey || (allPdfFiles[0] ? allPdfFiles[0].key : '');

  // Selected PDF object
  const selectedPdf = useMemo(() => {
    return allPdfFiles.find((p) => p.key === effectiveSelectedPdfKey) || allPdfFiles[0] || null;
  }, [allPdfFiles, effectiveSelectedPdfKey]);

  // Filter rows belonging ONLY to the selected PDF
  const rowsForSelectedPdf = useMemo(() => {
    if (!selectedPdf) return [];
    return sortedRecords.filter((r) => {
      const vMatch = (r.vendorFolder || 'Uncategorized Vendor') === selectedPdf.vendorFolder;
      const fMatch = (r.fileName || 'Document.pdf') === selectedPdf.fileName;
      return vMatch && fMatch;
    });
  }, [sortedRecords, selectedPdf]);

  // Derived active record ID
  const effectiveRecordId = useMemo(() => {
    if (selectedRecordId && rowsForSelectedPdf.some((r) => r.id === selectedRecordId)) {
      return selectedRecordId;
    }
    return rowsForSelectedPdf[0] ? rowsForSelectedPdf[0].id : null;
  }, [selectedRecordId, rowsForSelectedPdf]);

  const selectedRecord = useMemo(() => {
    return sortedRecords.find((r) => r.id === effectiveRecordId) || null;
  }, [sortedRecords, effectiveRecordId]);

  const prevRecordIdRef = useRef(null);
  useEffect(() => {
    if (selectedRecord && selectedRecord.id !== prevRecordIdRef.current) {
      prevRecordIdRef.current = selectedRecord.id;
      setFormData({
        woNumber: selectedRecord.woNumber || '',
        woValue: selectedRecord.woValue || (selectedRecord.amount ? `₹ ${selectedRecord.amount}` : ''),
        date: selectedRecord.date || '',
        ministry: selectedRecord.ministry || '',
        dateVerified: selectedRecord.dateVerified || verifyDateAfterCutoff(selectedRecord.date),
        ministryVerified: selectedRecord.ministryVerified || verifyMinistryDepartment(selectedRecord.ministry),
        completionCertificate: selectedRecord.completionCertificate || 'No',
        recommendation: selectedRecord.recommendation || 'No',
        vendorFolder: selectedRecord.vendorFolder || '',
        fileName: selectedRecord.fileName || '',
        pageIndex: selectedRecord.pageIndex || selectedRecord.pageStart || 1,
      });
    }
  }, [selectedRecord]);

  // Handle PDF page change & auto-activate corresponding row
  const handlePageChange = useCallback(
    (pageNumber) => {
      setActivePageNumber(pageNumber);

      const matchingRow = rowsForSelectedPdf.find((r) => {
        const start = Number(r.pageStart) || Number(r.pageIndex) || 1;
        const end = Number(r.pageEnd) || start;
        return start <= pageNumber && pageNumber <= end;
      });

      if (matchingRow && matchingRow.id !== effectiveRecordId) {
        handleSelectRecord(matchingRow);
      }
    },
    [rowsForSelectedPdf, effectiveRecordId, handleSelectRecord]
  );

  // Mark page read in pdfReadProgress
  const handleMarkPageRead = useCallback(
    (pageNumber) => {
      if (!effectiveSelectedPdfKey) return;
      setPdfReadProgress((prev) => {
        const current = prev[effectiveSelectedPdfKey] || { viewedPages: [], totalPages: 1 };
        const viewedSet = new Set(current.viewedPages || []);
        viewedSet.add(pageNumber);
        return {
          ...prev,
          [effectiveSelectedPdfKey]: {
            ...current,
            viewedPages: Array.from(viewedSet),
          },
        };
      });
    },
    [effectiveSelectedPdfKey]
  );

  // Update total pages for selected PDF
  const handleTotalPagesKnown = useCallback(
    (totalPages) => {
      if (!effectiveSelectedPdfKey) return;
      setPdfReadProgress((prev) => {
        const current = prev[effectiveSelectedPdfKey] || { viewedPages: [], totalPages: 1 };
        return {
          ...prev,
          [effectiveSelectedPdfKey]: {
            ...current,
            totalPages,
          },
        };
      });
    },
    [effectiveSelectedPdfKey]
  );

  // Calculate PDF read status (Green = entire, Yellow = partial, Red = not opened)
  const getPdfReadStatus = (pdfKey) => {
    const prog = pdfReadProgress[pdfKey];
    if (!prog || !prog.viewedPages || prog.viewedPages.length === 0) {
      return { status: 'red', label: 'Not Opened', color: 'bg-red-500', bg: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300' };
    }
    const viewedCount = prog.viewedPages.length;
    const total = prog.totalPages || 1;
    if (viewedCount >= total) {
      return { status: 'green', label: 'Read Entirely', color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    return { status: 'yellow', label: `Read ${viewedCount}/${total} pgs`, color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
  };

  // Load stored PDF blobs from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadStoredPdfs() {
      try {
        const storedMap = await getAllPdfBlobs();
        if (!isMounted) return;
        const urls = {};
        Object.entries(storedMap).forEach(([k, blob]) => {
          if (blob) {
            urls[k] = URL.createObjectURL(blob);
          }
        });
        if (Object.keys(urls).length > 0) {
          setUploadedPdfUrls((prev) => ({ ...urls, ...prev }));
        }
      } catch (e) {
        console.warn('Failed loading stored PDFs from IndexedDB:', e);
      }
    }
    loadStoredPdfs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Upload Local PDF File(s)
  const processUploadedFiles = async (files) => {
    if (!files || files.length === 0) return;
    const newUrls = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.name) continue;

      const vendor = selectedPdf ? selectedPdf.vendorFolder : 'Uploaded Vendor';
      const fileName = file.name;
      const key = `${vendor}::${fileName}`;
      const url = URL.createObjectURL(file);

      await savePdfBlob(key, file);
      await savePdfBlob(fileName, file);

      newUrls[key] = url;
      newUrls[fileName] = url;

      if (i === 0) {
        setSelectedPdfKey(key);
        setActivePageNumber(1);
      }
    }

    setUploadedPdfUrls((prev) => ({ ...prev, ...newUrls }));
  };

  const handlePdfUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(Array.from(e.target.files));
    }
  };

  // Form Change Handler
  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'date') {
        updated.dateVerified = verifyDateAfterCutoff(value);
      }
      if (field === 'ministry') {
        updated.ministryVerified = verifyMinistryDepartment(value);
      }
      return updated;
    });
  };

  // Save changes to state, localStorage & backend
  const handleSaveChanges = async () => {
    if (!effectiveRecordId) return;

    const updatedRecords = records.map((r) => {
      if (r.id === effectiveRecordId) {
        return {
          ...r,
          ...formData,
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updatedRecords));

    try {
      await fetch(`${API_ENDPOINTS.bids}/${effectiveRecordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setSaveStatus('Record updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.warn('Backend sync offline, saved locally:', err);
      setSaveStatus('Saved locally to browser storage');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Add Row Handler
  const handleCreateNewRow = async (e) => {
    e.preventDefault();
    if (!selectedPdf) return;

    const pStart = Number(newRowFields.pageStart) || activePageNumber || 1;
    const pEnd = Number(newRowFields.pageEnd) || pStart;
    const numAmt = Number(newRowFields.amount) || 0;

    const newRow = {
      id: `ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenderId: selectedTenderId || 'GEM/2026/B/884190',
      vendorFolder: selectedPdf.vendorFolder,
      fileName: selectedPdf.fileName,
      woNumber: newRowFields.woNumber || 'WO-MANUAL-01',
      itemDescription: newRowFields.itemDescription || 'Manual Item',
      qty: Number(newRowFields.qty) || 1,
      unit: newRowFields.unit || 'LOT',
      rate: Number(newRowFields.rate) || numAmt,
      amount: numAmt,
      woValue: `₹ ${numAmt.toLocaleString('en-IN')}`,
      date: newRowFields.date || new Date().toISOString().split('T')[0],
      ministry: newRowFields.ministry || 'Ministry of Petroleum & Natural Gas',
      dateVerified: verifyDateAfterCutoff(newRowFields.date),
      ministryVerified: verifyMinistryDepartment(newRowFields.ministry),
      completionCertificate: 'Yes',
      recommendation: 'Yes',
      pageStart: pStart,
      pageEnd: pEnd,
      pageIndex: pStart,
      status: 'Extracted',
      clientName: selectedPdf.vendorFolder,
      createdAt: Date.now(),
      extractedAt: new Date().toISOString(),
    };

    const updated = [newRow, ...records];
    setRecords(updated);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));

    try {
      await fetch(API_ENDPOINTS.bids, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow),
      });
    } catch (err) {
      console.warn('Save new row to backend offline:', err);
    }

    handleSelectRecord(newRow);
    setIsAddRowModalOpen(false);
    setNewRowFields({
      woNumber: '',
      itemDescription: '',
      qty: '1',
      unit: 'LOT',
      rate: '0',
      amount: '0',
      date: new Date().toISOString().split('T')[0],
      ministry: 'Ministry of Petroleum & Natural Gas',
      pageStart: String(activePageNumber),
      pageEnd: String(activePageNumber),
    });
  };

  const handleSyncRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.bids);
      if (!res.ok) throw new Error('Failed to fetch bids');
      const data = await res.json();
      setRecords(data);
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Backend fetch offline, using local storage history:', err);
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRecords(parsed);
        } catch (e) {
          console.error('Failed parsing localStorage:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-1">
            <FileSearch size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Verification Inspector</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manual Review &amp; Side-by-Side PDF Audit</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Select an uploaded PDF from the left vendor list to audit pages, view extracted rows, and verify compliance rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Sync</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[720px]">
        {/* Left Column: Uploaded PDFs by Vendor (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col h-[750px] shadow-sm">
          <div className="space-y-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Uploaded PDFs ({allPdfFiles.length})
              </h3>
              <label
                htmlFor="pdf-file-upload-sidebar"
                className="cursor-pointer text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
              >
                <Upload size={12} />
                <span>Upload PDF</span>
              </label>
              <input
                id="pdf-file-upload-sidebar"
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handlePdfUpload}
              />
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Color status indicates document read progress. Click to inspect.
            </p>
          </div>

          {/* PDF Files List Grouped by Vendor */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {pdfListByVendor.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                No uploaded vendor PDFs found. Import folders from Dashboard.
              </div>
            ) : (
              pdfListByVendor.map(({ vendorFolder, files }) => (
                <div key={vendorFolder} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 py-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <FolderOpen size={14} className="text-orange-500" />
                    <span className="truncate">{vendorFolder}</span>
                  </div>

                  <div className="space-y-1 pl-2">
                    {files.map((pdf) => {
                      const isSelected = pdf.key === effectiveSelectedPdfKey;
                      const statusInfo = getPdfReadStatus(pdf.key);

                      return (
                        <button
                          key={pdf.key}
                          type="button"
                          onClick={() => {
                            setSelectedPdfKey(pdf.key);
                            setActivePageNumber(1);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition border text-xs flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-800 shadow-xs'
                              : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                              {pdf.fileName}
                            </span>
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.color}`} />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`px-1.5 py-0.2 rounded font-bold ${statusInfo.bg}`}>
                              {statusInfo.label}
                            </span>
                            <span className="text-gray-400 font-mono">PDF Source</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle Column: Extracted Rows & Field Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col h-[750px] overflow-y-auto shadow-sm">
          {/* Header & Add Row Button */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                PDF Extracted Rows ({rowsForSelectedPdf.length})
              </span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {selectedPdf ? selectedPdf.fileName : 'Select PDF'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRowModalOpen(true)}
              disabled={!selectedPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              title="Add a new extracted row for this PDF"
            >
              <PlusCircle size={14} />
              <span>Add Row</span>
            </button>
          </div>

          {/* Rows List inside selected PDF */}
          <div className="mb-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {rowsForSelectedPdf.length === 0 ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800">
                No extracted rows for this PDF yet. Click <strong>Add Row</strong> to insert one manually.
              </div>
            ) : (
              rowsForSelectedPdf.map((r) => {
                const isSelected = r.id === effectiveRecordId;
                const startPg = r.pageStart || r.pageIndex || 1;
                const endPg = r.pageEnd || startPg;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRecord(r)}
                    className={`w-full text-left p-2.5 rounded-xl transition border text-xs ${
                      isSelected
                        ? 'bg-orange-100/70 dark:bg-orange-950/80 border-orange-400 dark:border-orange-700 ring-2 ring-orange-500/30'
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400 truncate">
                        {r.woNumber || 'No WO Number'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-semibold">
                        Pg {startPg === endPg ? startPg : `${startPg}-${endPg}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
                      <span className="truncate max-w-[170px]">{r.itemDescription || r.ministry || 'Work Order'}</span>
                      <span className="font-bold text-gray-900 dark:text-white font-mono">{r.woValue || `₹ ${r.amount || 0}`}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Form Fields for Active Record */}
          {selectedRecord && (
            <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Field Inspector &amp; Audit
                </span>
                {saveStatus && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{saveStatus}</span>
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Work Order Number
                  </label>
                  <input
                    type="text"
                    value={formData.woNumber}
                    onChange={(e) => handleFieldChange('woNumber', e.target.value)}
                    className="w-full text-xs font-mono border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Work Order Value / Amount
                  </label>
                  <input
                    type="text"
                    value={formData.woValue}
                    onChange={(e) => handleFieldChange('woValue', e.target.value)}
                    className="w-full text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Date of Issue
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Buyer Ministry / Department
                  </label>
                  <input
                    type="text"
                    value={formData.ministry}
                    onChange={(e) => handleFieldChange('ministry', e.target.value)}
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Verification Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-0.5">
                      Rule 1: Post-Cutoff Date
                    </label>
                    <select
                      value={formData.dateVerified}
                      onChange={(e) => handleFieldChange('dateVerified', e.target.value)}
                      className="w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 text-gray-900 dark:text-white"
                    >
                      <option value="Yes">Yes (Valid)</option>
                      <option value="No">No (Expired)</option>
                    </select>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-0.5">
                      Rule 2: Ministry Match
                    </label>
                    <select
                      value={formData.ministryVerified}
                      onChange={(e) => handleFieldChange('ministryVerified', e.target.value)}
                      className="w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 text-gray-900 dark:text-white"
                    >
                      <option value="Yes">Yes (Approved)</option>
                      <option value="No">No (Unmatched)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveChanges}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs mt-2"
              >
                <Save size={15} />
                <span>Save Field Edits</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive PDF Viewer Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col h-[750px] shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                PDF Page Viewer
              </span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {selectedPdf ? selectedPdf.fileName : 'No PDF selected'}
              </h3>
            </div>

            {selectedPdf && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40">
                {selectedPdf.vendorFolder}
              </span>
            )}
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950 flex flex-col">
            {selectedPdf && selectedPdf.url ? (
              <PdfCanvasViewer
                pdfUrl={selectedPdf.url}
                activePage={activePageNumber}
                onPageChange={handlePageChange}
                onTotalPagesKnown={handleTotalPagesKnown}
                onMarkPageRead={handleMarkPageRead}
              />
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processUploadedFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-xl m-4 bg-white/50 dark:bg-gray-900/50 hover:border-orange-400 transition"
              >
                <div className="p-3 bg-orange-100 dark:bg-orange-950/60 rounded-full text-orange-600 dark:text-orange-400">
                  <FileUp size={36} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    Attach PDF Document Stream
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    No local PDF stream attached for <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedPdf ? selectedPdf.fileName : 'this document'}</span> ({selectedPdf ? selectedPdf.vendorFolder : 'Vendor'}).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="viewer-pdf-file-upload"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition"
                  >
                    <Upload size={14} />
                    <span>Browse & Attach PDF</span>
                  </label>
                  <input
                    id="viewer-pdf-file-upload"
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Or drag and drop your PDF file(s) directly here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Adding a Row */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <PlusCircle size={18} />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Extracted Row</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRowModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRow} className="space-y-3 text-xs">
              <p className="text-[11px] text-gray-500">
                Target PDF: <strong>{selectedPdf?.fileName}</strong> ({selectedPdf?.vendorFolder})
              </p>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Work Order Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WO/2025/1042"
                  value={newRowFields.woNumber}
                  onChange={(e) => setNewRowFields({ ...newRowFields, woNumber: e.target.value })}
                  className="w-full font-mono border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valve Supply &amp; Installation"
                  value={newRowFields.itemDescription}
                  onChange={(e) => setNewRowFields({ ...newRowFields, itemDescription: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1500000"
                    value={newRowFields.amount}
                    onChange={(e) => setNewRowFields({ ...newRowFields, amount: e.target.value })}
                    className="w-full font-mono border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newRowFields.date}
                    onChange={(e) => setNewRowFields({ ...newRowFields, date: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    PDF Start Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRowFields.pageStart}
                    onChange={(e) => setNewRowFields({ ...newRowFields, pageStart: e.target.value })}
                    className="w-full font-mono border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    PDF End Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRowFields.pageEnd}
                    onChange={(e) => setNewRowFields({ ...newRowFields, pageEnd: e.target.value })}
                    className="w-full font-mono border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs"
                >
                  Add Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
