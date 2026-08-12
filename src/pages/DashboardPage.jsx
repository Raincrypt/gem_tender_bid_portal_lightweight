import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
  FolderOpen,
  Building2,
  ListChecks,
  Pencil,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PdfModal from '../components/PdfModal';
import TenderSelector from '../components/TenderSelector';

import {
  API_ENDPOINTS,
  LOCAL_STORAGE_HISTORY_KEY,
  POSTGRES_CHUNK_SIZE,
  BULK_PROCESS_THROTTLE_MS,
  DATE_VERIFICATION_CUTOFF,
  RULE_CHECK_TIERS,
} from '../config/config';

import {
  naturalSort,
  verifyDateAfterCutoff,
  verifyMinistryDepartment,
  formatIndianCurrency,
  formatDateDisplay,
  formatDateObject,
  parseCurrencyToNumber,
  evaluateRuleCheck,
  computeRuleCheckByVendor,
  computeVendorSerialNumbers,
  groupRowsByVendor,
  sortExtractedData,
  extractPdfPagesText,
  extractPagesFromPdf,
  extractRecordsFromPages,
} from '../services/pdfProcessor';
import { savePdfBlob, getAllPdfBlobs } from '../services/pdfStore';

// ========== CLIENT LOGGER ==========
async function clientLogger(level, message, data = null) {
  try {
    await fetch(API_ENDPOINTS.logClient, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, data }),
    });
  } catch (err) {
    console.warn('Client logger fetch failed:', err.message);
  }
}

// ========== EXTRACTED TEXT LOGGER (per page) ==========
async function logExtractedText(fileName, pages, vendorName = null) {
  try {
    await fetch(API_ENDPOINTS.logExtractedText, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, pages, vendorName }),
    });
  } catch (err) {
    console.warn('Extracted text log fetch failed:', err.message);
  }
}

function EditableField({
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  displayContent,
  type = 'text',
  options = [],
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="relative group/field inline-block w-full">
      {!isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="absolute -top-3 right-0 p-1 text-gray-400 hover:text-[#003874] dark:text-gray-500 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm opacity-0 group-hover/field:opacity-100 transition z-10"
          title="Edit"
          aria-label="Edit field value"
        >
          <Pencil size={11} />
        </button>
      )}
      {isEditing ? (
        type === 'select' ? (
          <select
            ref={inputRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={handleKeyDown}
            aria-label="Edit select choice"
            className="text-xs border border-[#003874] dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#003874] dark:focus:ring-blue-500"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={handleKeyDown}
            aria-label="Edit text content"
            className="w-full text-xs border border-[#003874] dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#003874] dark:focus:ring-blue-500"
          />
        )
      ) : (
        displayContent
      )}
    </div>
  );
}

// ✨ SKELETON ROW — clean and contained
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-6"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10 mx-auto"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10 mx-auto"></div>
    </td>
    <td className="py-3 px-3">
      <div className="flex items-center justify-center space-x-1">
        <div className="h-4 w-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-4 w-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-4 w-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10 mx-auto"></div>
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10 mx-auto"></div>
    </td>
    <td className="py-3 px-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-6 mx-auto"></div>
    </td>
  </tr>
);

export default function Dashboard({
  selectedTenderId,
  setSelectedTenderId,
  tendersList = [],
  onCreateTender,
  onRecordsChange,
}) {
  const [extractedData, setExtractedData] = useState([]);

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmRowId, setDeleteConfirmRowId] = useState(null);

  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  const [modalPdfUrl, setModalPdfUrl] = useState('');
  const [modalEditData, setModalEditData] = useState({});
  const [pendingModalRow, setPendingModalRow] = useState(null);

  const fileInputRef = useRef(null);
  const activeTargetPageRef = useRef(null);
  const fileBlobsMapRef = useRef(new Map());
  const filePageCountMapRef = useRef(new Map()); // NEW: store total pages per file

  // --- NEW: Reference for the table container ---
  const tableContainerRef = useRef(null);

  const folderInputRef = useRef(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [rawFolderFiles, setRawFolderFiles] = useState([]);
  const [isReadingFolders, setIsReadingFolders] = useState(false);
  const [vendorFolders, setVendorFolders] = useState({});
  const [selectedVendors, setSelectedVendors] = useState({});
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    currentVendor: '',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFromPostgres = async () => {
      setIsTableLoading(true);
      try {
        const res = await fetch(API_ENDPOINTS.bids);
        if (!res.ok) throw new Error('API request failed');
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

        const sorted = sortExtractedData(Array.from(combinedMap.values()));
        if (isMounted) {
          setExtractedData(sorted);
          localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(sorted));
        }
        clientLogger('info', 'Fetched data from PostgreSQL', { count: data.length });
      } catch (err) {
        console.warn('PostgreSQL server offline, falling back to LocalStorage history:', err);
        clientLogger('warn', 'PostgreSQL fetch failed, using localStorage', { error: err.message });
        const savedData = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (savedData && isMounted) {
          try {
            const parsed = JSON.parse(savedData);
            setExtractedData(sortExtractedData(parsed));
          } catch (e) {
            console.warn('Failed to parse saved local history:', e.message);
          }
        }
      } finally {
        if (isMounted) {
          setIsTableLoading(false);
        }
      }
    };

    fetchFromPostgres();

    // Restore cached PDF blobs from IndexedDB
    getAllPdfBlobs().then((blobMap) => {
      if (!isMounted) return;
      Object.entries(blobMap).forEach(([key, blob]) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          fileBlobsMapRef.current.set(key, url);
        }
      });
    }).catch((e) => console.warn('Failed restoring PDF blobs from IndexedDB:', e));

    return () => {
      isMounted = false;
    };
  }, []);

  // --- NEW: Auto‑scroll to bottom whenever data changes ---
  useEffect(() => {
    if (tableContainerRef.current) {
      requestAnimationFrame(() => {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      });
    }
  }, [extractedData]);

  const serialNumbers = useMemo(() => computeVendorSerialNumbers(extractedData), [extractedData]);
  const ruleCheckByVendor = useMemo(() => computeRuleCheckByVendor(extractedData), [extractedData]);

  const saveToLocalStorage = (newData) => {
    const sorted = sortExtractedData(newData);
    setExtractedData(sorted);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(sorted));
    if (onRecordsChange) onRecordsChange();
  };

  const saveToPostgresInChunks = async (records, chunkSize = POSTGRES_CHUNK_SIZE) => {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        await fetch(`${API_ENDPOINTS.bids}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
      } catch (err) {
        console.error('Failed to push chunk to DB, saving locally:', err);
        clientLogger('error', 'DB bulk save failed', { error: err.message, chunkSize: chunk.length });
      }
    }
  };

  const handleSaveAllToDatabase = async () => {
    if (!selectedTenderId) {
      alert('Please select a tender from the dropdown menu before saving to database.');
      return;
    }
    setIsSavingToDb(true);
    setSaveSuccessMsg('');
    try {
      if (extractedData.length > 0) {
        await saveToPostgresInChunks(extractedData);
      }
      setSaveSuccessMsg('Changes and tenders saved to database successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      if (onRecordsChange) onRecordsChange();
    } catch (err) {
      console.error('Save to database error:', err);
      alert('Failed saving to database: ' + err.message);
    } finally {
      setIsSavingToDb(false);
    }
  };

  const exportToExcel = () => {
    if (!extractedData.length) return;

    const exportableData = extractedData.filter((row) => row.woNumber && row.woNumber !== 'Not Found');
    if (!exportableData.length) return;

    const groupedData = groupRowsByVendor(exportableData);
    const serialNumbers = computeVendorSerialNumbers(groupedData);
    const ruleCheckByVendor = computeRuleCheckByVendor(groupedData);
    const dateVerificationHeading = `WHETHER WO DATE DURING ${formatDateObject(DATE_VERIFICATION_CUTOFF)}`;

    const sheetData = groupedData.map((row, index) => {
      const vendorName = row.vendorFolder || '';
      const previousVendorName = index > 0 ? groupedData[index - 1].vendorFolder || '' : null;
      const displayVendorName = vendorName && vendorName !== previousVendorName ? vendorName : '';

      const dateVerified = row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
      const ministryVerified =
        row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);

      let ruleCheckLabel = 'R1(No) R2(No) R3(No)';
      if (row.vendorFolder) {
        if (displayVendorName) {
          const result = ruleCheckByVendor[row.vendorFolder];
          if (result) {
            ruleCheckLabel = `R1(${result.R1 ? 'Yes' : 'No'}) R2(${result.R2 ? 'Yes' : 'No'}) R3(${result.R3 ? 'Yes' : 'No'})`;
          }
        }
      } else {
        const numeric = parseCurrencyToNumber(row.woValue);
        const result = evaluateRuleCheck(numeric !== null ? [numeric] : []);
        ruleCheckLabel = `R1(${result.R1 ? 'Yes' : 'No'}) R2(${result.R2 ? 'Yes' : 'No'}) R3(${result.R3 ? 'Yes' : 'No'})`;
      }

      return {
        'S.No': serialNumbers[index],
        "BIDDER'S NAME": displayVendorName,
        'WO NUMBER': row.woNumber,
        'WO VALUE': row.woValue,
        DATE: row.date,
        [dateVerificationHeading]: dateVerified,
        'MINISTRY / DIVISION': row.ministry,
        'WO FOR PETROLEUM/PETROCHEMICAL REFINERY': ministryVerified,
        'RULE CHECK (R1,R2,R3)': ruleCheckLabel,
        'COMPLETION CERTIFICATE': row.completionCertificate || 'No',
        RECOMMENDATION: row.recommendation || 'No',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GeM Extraction');
    XLSX.writeFile(workbook, `GeM_Master_Report_${Date.now()}.xlsx`);
    clientLogger('info', 'Exported to Excel');
  };

  const startEditingCell = (row, field) => {
    let initialValue;
    if (field === 'dateVerified') {
      initialValue = row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
    } else if (field === 'ministryVerified') {
      initialValue = row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);
    } else if (field === 'completionCertificate' || field === 'recommendation') {
      initialValue = row[field] || 'No';
    } else {
      initialValue = row[field];
    }
    setEditingCell({ rowId: row.id, field });
    setEditValue(initialValue);
  };

  const cancelEditingCell = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEditingCell = async () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;

    try {
      await fetch(`${API_ENDPOINTS.bids}/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: editValue }),
      });
      clientLogger('info', `Updated cell ${field} for row ${rowId}`);
    } catch (e) {
      console.warn('Database sync failed, updating UI locally:', e);
      clientLogger('warn', `Failed to update cell ${field} in DB`, { error: e.message });
    }

    const updated = extractedData.map((r) => (r.id === rowId ? { ...r, [field]: editValue } : r));
    saveToLocalStorage(updated);
    setEditingCell(null);
    setEditValue('');
  };

  const requestDeleteRow = (rowId) => setDeleteConfirmRowId(rowId);
  const cancelDeleteRow = () => setDeleteConfirmRowId(null);

  const confirmDeleteRow = async () => {
    if (!deleteConfirmRowId) return;
    try {
      await fetch(`${API_ENDPOINTS.bids}/${deleteConfirmRowId}`, { method: 'DELETE' });
      clientLogger('info', `Deleted row ${deleteConfirmRowId}`);
    } catch (e) {
      console.warn('Database delete sync failed, updating locally:', e);
      clientLogger('warn', `Failed to delete row ${deleteConfirmRowId} in DB`, { error: e.message });
    }

    const updated = extractedData.filter((r) => r.id !== deleteConfirmRowId);
    saveToLocalStorage(updated);
    setDeleteConfirmRowId(null);
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to completely wipe all database and local records?')) {
      try {
        await fetch(API_ENDPOINTS.bids, { method: 'DELETE' });
        await fetch(API_ENDPOINTS.logExtractedText, { method: 'DELETE' });
        clientLogger('info', 'Cleared all history and extracted text log');
      } catch (e) {
        console.warn('Database truncate request failed:', e);
        clientLogger('error', 'Failed to clear history', { error: e.message });
      }
      fileBlobsMapRef.current.clear();
      filePageCountMapRef.current.clear(); // NEW: clear page count map
      saveToLocalStorage([]);
    }
  };

  // ----- PDF MODAL FUNCTIONS (modified) -----
  const openPdfModal = async (row) => {
    const cachedUrl = fileBlobsMapRef.current.get(row.fileName);
    if (!cachedUrl) {
      setPendingModalRow(row);
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    // ---- Compute page range ----
    const totalPages = filePageCountMapRef.current.get(row.fileName) || 0;
    if (totalPages === 0) {
      // fallback: just jump to the page
      setModalRow(row);
      setModalEditData({ ...row });
      setModalPdfUrl(cachedUrl + `#page=${row.pageIndex || 1}`);
      setIsPdfModalOpen(true);
      return;
    }

    // Find all records for this file
    const fileRecords = extractedData
      .filter((r) => r.fileName === row.fileName)
      .sort((a, b) => (a.pageIndex || 1) - (b.pageIndex || 1));

    const currentIndex = fileRecords.findIndex((r) => r.id === row.id);
    if (currentIndex === -1) {
      // fallback
      setModalRow(row);
      setModalEditData({ ...row });
      setModalPdfUrl(cachedUrl + `#page=${row.pageIndex || 1}`);
      setIsPdfModalOpen(true);
      return;
    }

    const startPage = row.pageIndex || 1;
    let endPage;
    if (currentIndex < fileRecords.length - 1) {
      // next record's page - 1
      endPage = fileRecords[currentIndex + 1].pageIndex - 1;
    } else {
      endPage = totalPages;
    }

    // Ensure endPage is not less than startPage
    if (endPage < startPage) endPage = startPage;

    // ---- Extract the pages ----
    const pageUrl = await extractPagesFromPdf(cachedUrl, startPage, endPage);
    const finalUrl = pageUrl || cachedUrl + `#page=${startPage}`; // fallback

    setModalRow(row);
    setModalEditData({ ...row });
    setModalPdfUrl(finalUrl);
    setIsPdfModalOpen(true);
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    setModalRow(null);
    setModalEditData({});
    setModalPdfUrl('');
  };

  const handleModalFieldChange = (field, value) => {
    setModalEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveModalChanges = async () => {
    if (!modalRow) return;
    const rowId = modalRow.id;
    const updatedFields = modalEditData;

    for (const [field, value] of Object.entries(updatedFields)) {
      if (value !== modalRow[field]) {
        try {
          await fetch(`${API_ENDPOINTS.bids}/${rowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value }),
          });
        } catch (e) {
          console.warn(`Failed to update ${field} in DB:`, e);
          clientLogger('warn', `Modal edit failed for ${field}`, { error: e.message });
        }
      }
    }

    const updatedData = extractedData.map((r) => (r.id === rowId ? { ...r, ...updatedFields } : r));
    saveToLocalStorage(updatedData);
    closePdfModal();
    clientLogger('info', `Saved modal changes for row ${rowId}`);
  };

  const verifyAndOpenPdf = (row) => {
    openPdfModal(row);
  };

  const handleVerifyFileRedirect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const blob = new Blob([file], { type: 'application/pdf' });
    const fileBlobUrl = URL.createObjectURL(blob);
    fileBlobsMapRef.current.set(file.name, fileBlobUrl);

    if (pendingModalRow) {
      const row = pendingModalRow;
      setPendingModalRow(null);
      // call openPdfModal again – now it will have the cached URL
      openPdfModal(row);
    } else {
      const targetPage = activeTargetPageRef.current || 1;
      window.open(`${fileBlobUrl}#page=${targetPage}`, '_blank', 'noopener,noreferrer');
    }

    e.target.value = null;
    activeTargetPageRef.current = null;
  };

  // ----- END PDF MODAL FUNCTIONS -----

  const callAiFallback = async () => {
    // AI fallback disabled per configuration
    return null;
  };

  const parsePdfFileContextAsync = async (file, vendorName = null) => {
    try {
      const { numPages, pagesData, globalText } = await extractPdfPagesText(file);
      filePageCountMapRef.current.set(file.name, numPages);

      const fileBlobUrl = URL.createObjectURL(file);
      fileBlobsMapRef.current.set(file.name, fileBlobUrl);

      // Save PDF blob persistently to IndexedDB for Manual Review page & reloads
      savePdfBlob(file.name, file);
      if (vendorName) {
        savePdfBlob(`${vendorName}::${file.name}`, file);
      }

      // Log the extracted text
      await logExtractedText(file.name, pagesData, vendorName);

      // Extract the records from the page texts
      const { localRecords } = await extractRecordsFromPages(pagesData, file.name, globalText, callAiFallback);

      // Map raw records to standard formatting
      const formattedRecords = localRecords.map((record) => ({
        ...record,
        woValue: formatIndianCurrency(record.woValue),
        date: formatDateDisplay(record.date),
        completionCertificate: record.completionCertificate || 'No',
        recommendation: record.recommendation || 'No',
      }));

      return formattedRecords;
    } catch (err) {
      console.error('PDF parsing/extraction failure:', err);
      clientLogger('error', 'PDF parsing failed', { error: err.message, fileName: file.name });
      throw err;
    }
  };

  const addRecordsToState = (newRecords) => {
    if (!newRecords.length) return;
    setExtractedData((prev) => {
      const updatedList = [...prev];
      newRecords.forEach((newRec) => {
        const recTender = newRec.tenderId || selectedTenderId;
        const recToSave = { ...newRec, tenderId: recTender };

        const existingIdx = updatedList.findIndex((item) => {
          if (item.id && recToSave.id && item.id === recToSave.id) return true;
          const sameTender = !item.tenderId || !recToSave.tenderId || item.tenderId === recToSave.tenderId;
          if (
            sameTender &&
            item.vendorFolder === recToSave.vendorFolder &&
            item.fileName === recToSave.fileName &&
            item.pageIndex === recToSave.pageIndex
          ) {
            return true;
          }
          if (
            sameTender &&
            item.vendorFolder === recToSave.vendorFolder &&
            item.woNumber &&
            recToSave.woNumber &&
            item.woNumber !== 'Not Found' &&
            item.woNumber === recToSave.woNumber
          ) {
            return true;
          }
          return false;
        });

        if (existingIdx !== -1) {
          const existingId = updatedList[existingIdx].id;
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            ...recToSave,
            id: recToSave.id || existingId,
          };
        } else {
          updatedList.push(recToSave);
        }
      });

      const sorted = sortExtractedData(updatedList);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(sorted));
      } catch (e) {
        console.warn('Failed saving history to localStorage:', e);
      }
      if (onRecordsChange) onRecordsChange();
      return sorted;
    });
  };

  const triggerFolderBrowse = () => {
    if (folderInputRef.current) folderInputRef.current.click();
  };

  const parseVendorFolders = (files) => {
    const grouped = {};
    files.forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) return;

      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');
      let vendor = 'General';
      if (parts.length > 2) {
        vendor = parts[1];
      } else if (parts.length === 2) {
        vendor = parts[0];
      }

      if (!grouped[vendor]) grouped[vendor] = [];
      grouped[vendor].push(file);
    });

    Object.keys(grouped).forEach((vendor) => {
      grouped[vendor].sort((a, b) => naturalSort(a.name, b.name));
    });
    return grouped;
  };

  const handleBrowseFolder = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const firstRelPath = files[0].webkitRelativePath || files[0].name;
    const rootFolderName = firstRelPath.split('/')[0] || 'Selected Folder';

    setRawFolderFiles(files);
    setSelectedFolderPath(`${rootFolderName} (${files.length} file${files.length === 1 ? '' : 's'} found)`);

    const grouped = parseVendorFolders(files);
    setVendorFolders(grouped);

    const initialSelection = {};
    Object.keys(grouped).forEach((v) => {
      initialSelection[v] = true;
    });
    setSelectedVendors(initialSelection);

    clientLogger('info', `Browsed folder: ${rootFolderName} (${files.length} files)`);
  };

  const readVendorFolders = () => {
    if (!rawFolderFiles.length) return;
    setIsReadingFolders(true);

    const grouped = parseVendorFolders(rawFolderFiles);

    setVendorFolders(grouped);
    const initialSelection = {};
    Object.keys(grouped).forEach((v) => {
      initialSelection[v] = true;
    });
    setSelectedVendors(initialSelection);
    setIsReadingFolders(false);
    clientLogger('info', `Read vendor folders: ${Object.keys(grouped).length} vendors found`);
  };

  const toggleVendorSelection = (vendor) => {
    setSelectedVendors((prev) => ({ ...prev, [vendor]: !prev[vendor] }));
  };

  const toggleSelectAllVendors = (checked) => {
    const updated = {};
    Object.keys(vendorFolders).forEach((v) => {
      updated[v] = checked;
    });
    setSelectedVendors(updated);
  };

  const processSelectedVendors = async () => {
    let activeFolders = vendorFolders;
    let activeSelections = selectedVendors;

    if (Object.keys(activeFolders).length === 0 && rawFolderFiles.length > 0) {
      activeFolders = parseVendorFolders(rawFolderFiles);
      setVendorFolders(activeFolders);
      activeSelections = {};
      Object.keys(activeFolders).forEach((v) => {
        activeSelections[v] = true;
      });
      setSelectedVendors(activeSelections);
    }

    const vendorsToProcess = Object.keys(activeFolders)
      .filter((v) => activeSelections[v])
      .sort(naturalSort);

    if (!vendorsToProcess.length) {
      alert('Please select at least one vendor folder to process.');
      return;
    }

    const queue = [];
    vendorsToProcess.forEach((vendor) => {
      if (activeFolders[vendor]) {
        activeFolders[vendor].forEach((file) => queue.push({ file, vendor }));
      }
    });
    if (!queue.length) {
      alert('No PDF files found in the selected vendor folders.');
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress({ currentFileIndex: 0, totalFiles: queue.length, currentFileName: '', currentVendor: '' });
    clientLogger('info', `Starting bulk processing: ${queue.length} files from ${vendorsToProcess.length} vendors`);

    let unwrittenBuffer = [];

    for (let idx = 0; idx < queue.length; idx++) {
      const { file, vendor } = queue[idx];

      setBulkProgress({
        currentFileIndex: idx + 1,
        totalFiles: queue.length,
        currentFileName: file.name,
        currentVendor: vendor,
      });

      try {
        const parsedResults = await parsePdfFileContextAsync(file, vendor);
        if (parsedResults.length) {
          const mappedRecords = parsedResults.map((r) => ({ ...r, vendorFolder: vendor }));
          addRecordsToState(mappedRecords);
          unwrittenBuffer.push(...mappedRecords);
          clientLogger('info', `Bulk: parsed ${file.name} (vendor: ${vendor}) -> ${mappedRecords.length} records`);
        }

        if (unwrittenBuffer.length >= 20 || idx === queue.length - 1) {
          saveToPostgresInChunks(unwrittenBuffer.slice()).catch((err) =>
            console.error('Background save failed:', err)
          );
          unwrittenBuffer = [];
        }

        if (idx % 3 === 0) {
          await new Promise((resolve) => setTimeout(resolve, BULK_PROCESS_THROTTLE_MS));
        }
      } catch (err) {
        console.error(`Failed to process "${file.name}" (vendor: ${vendor})`, err);
        clientLogger('error', `Bulk processing failed for ${file.name}`, { error: err.message });
      }
    }

    setIsBulkProcessing(false);
    clientLogger('info', 'Bulk processing completed');
  };

  return (
    <main className="w-full max-w-[98vw] mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleVerifyFileRedirect}
      />

      {/* Top Bar: Active Tender Selector & Save to Database Button */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm mb-6 max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block mb-1">
            Active Tender Evaluation
          </span>
          <TenderSelector
            selectedTenderId={selectedTenderId}
            setSelectedTenderId={setSelectedTenderId}
            tendersList={tendersList}
            showCreateOption={true}
            onCreateTender={onCreateTender}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 size={16} />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveAllToDatabase}
            disabled={isSavingToDb || !selectedTenderId}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#003874] hover:bg-[#002855] text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedTenderId ? 'Please select a tender from the dropdown first' : 'Save changes and tenders to PostgreSQL database'}
          >
            <Save size={16} />
            <span>{isSavingToDb ? 'Saving to DB...' : 'Save to Database'}</span>
          </button>
        </div>
      </div>

      {/* Vendor Folder Bulk Import Section */}
      <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 max-w-4xl mx-auto transition-colors duration-200">
        <header className="flex items-center space-x-2 mb-2 text-[#003874] dark:text-indigo-400">
          <FolderOpen size={20} className={isBulkProcessing ? 'animate-pulse' : ''} />
          <span className="text-xs font-bold uppercase tracking-wider">Vendor Folder Bulk Import</span>
        </header>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Import by Vendor Folder</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose a root folder. Folders will be naturally sorted (Folder 1, Folder 2, Folder 3...) and files inside will
          be read in order.
        </p>

        {!selectedTenderId && (
          <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-2xs">
            <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Please select a Tender from the top dropdown menu before uploading files to the database.</span>
          </div>
        )}

        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleBrowseFolder}
          disabled={isBulkProcessing || isReadingFolders}
        />

        <div className="flex items-center space-x-3 mb-4">
          <input
            type="text"
            readOnly
            value={selectedFolderPath}
            placeholder="No folder selected yet — click Browse to choose one"
            aria-label="Selected vendor folder path"
            className="flex-1 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 truncate focus:outline-none"
          />
          <button
            type="button"
            onClick={triggerFolderBrowse}
            disabled={isBulkProcessing || isReadingFolders}
            className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition flex-shrink-0"
          >
            <FolderOpen size={16} />
            <span>Browse</span>
          </button>
        </div>

        <nav aria-label="Vendor Folder Controls" className="flex items-center space-x-3 mb-6">
          <button
            type="button"
            onClick={readVendorFolders}
            disabled={!rawFolderFiles.length || isReadingFolders || isBulkProcessing}
            className="flex items-center space-x-2 text-sm font-semibold text-white bg-gray-700 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg transition"
          >
            {isReadingFolders ? <RefreshCw size={16} className="animate-spin" /> : <ListChecks size={16} />}
            <span>{isReadingFolders ? 'Reading...' : 'Read Folders / Vendors'}</span>
          </button>

          <button
            type="button"
            onClick={processSelectedVendors}
            disabled={
              !selectedTenderId ||
              isBulkProcessing ||
              (!rawFolderFiles.length && Object.keys(vendorFolders).length === 0) ||
              (Object.keys(vendorFolders).length > 0 && !Object.values(selectedVendors).some(Boolean))
            }
            className="flex items-center space-x-2 text-sm font-semibold text-white bg-[#003874] hover:bg-[#002855] dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg transition"
            title={!selectedTenderId ? 'Select a tender from the top dropdown menu to enable upload' : 'Upload files from selected vendor folders'}
          >
            <UploadCloud size={16} />
            <span>Upload Files from Selected Folders</span>
          </button>
        </nav>

        {Object.keys(vendorFolders).length > 0 && (
          <aside className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-2">
            <header className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center space-x-1.5">
                <Building2 size={14} />
                <span>{Object.keys(vendorFolders).length} Vendor Folder(s) Detected</span>
              </span>
              <nav aria-label="Selection options" className="flex items-center space-x-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => toggleSelectAllVendors(true)}
                  disabled={isBulkProcessing}
                  className="text-[#003874] dark:text-indigo-400 hover:text-[#002855] dark:hover:text-indigo-300 disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAllVendors(false)}
                  disabled={isBulkProcessing}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  Clear
                </button>
              </nav>
            </header>
            <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {Object.keys(vendorFolders)
                .sort(naturalSort)
                .map((vendor) => (
                  <li key={vendor}>
                    <label
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                        isBulkProcessing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={!!selectedVendors[vendor]}
                          onChange={() => toggleVendorSelection(vendor)}
                          disabled={isBulkProcessing}
                          className="h-4 w-4 text-[#003874] border-gray-300 dark:border-gray-700 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{vendor}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{vendorFolders[vendor].length} file(s)</span>
                    </label>
                  </li>
                ))}
            </ul>
          </aside>
        )}

        {isBulkProcessing && (
          <aside className="mt-6" aria-label="Bulk processing progress">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-[#003874] dark:text-indigo-400">Vendor: {bulkProgress.currentVendor || '—'}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {bulkProgress.currentFileIndex} / {bulkProgress.totalFiles}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#003874] dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${bulkProgress.totalFiles ? (bulkProgress.currentFileIndex / bulkProgress.totalFiles) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">Processing: {bulkProgress.currentFileName || 'Starting...'}</p>
          </aside>
        )}
      </section>

      {/* Extracted Data Table */}
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden w-full transition-colors duration-200">
        <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Extracted Bid Columns</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">High precision composite verification table entries.</p>
          </div>

          {extractedData.length > 0 && !isTableLoading && (
            <nav aria-label="Table Actions" className="flex items-center space-x-3">
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 px-3 py-2 rounded-lg transition"
              >
                Wipe History
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                className="flex items-center space-x-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2 transition shadow-xs"
              >
                <Download size={14} />
                <span>Export to Excel</span>
              </button>
            </nav>
          )}
        </header>

        {/* Table container with max-h-[80vh] and overflow */}
        <div
          ref={tableContainerRef}
          className="overflow-x-auto overflow-y-auto max-h-[80vh]"
        >
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <tr className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                <th scope="col" className="py-3 px-3 w-[4%] bg-gray-100 dark:bg-gray-800">
                  S.No
                </th>
                <th scope="col" className="py-3 px-3 w-[13%] bg-gray-100 dark:bg-gray-800">
                  WO Number
                </th>
                <th scope="col" className="py-3 px-3 w-[10%] bg-gray-100 dark:bg-gray-800">
                  WO Value
                </th>
                <th scope="col" className="py-3 px-3 w-[8%] bg-gray-100 dark:bg-gray-800">
                  Date
                </th>
                <th scope="col" className="py-3 px-3 w-[10%] bg-gray-100 dark:bg-gray-800">
                  {`Whether WO Date During ${formatDateObject(DATE_VERIFICATION_CUTOFF)}`}
                </th>
                <th scope="col" className="py-3 px-3 w-[20%] bg-gray-100 dark:bg-gray-800">
                  Ministry / Division
                </th>
                <th scope="col" className="py-3 px-3 w-[11%] bg-gray-100 dark:bg-gray-800">
                  WO for Petroleum/Petrochemical Refinery
                </th>
                <th scope="col" className="py-3 px-3 w-[11%] bg-gray-100 dark:bg-gray-800">
                  Rule Check
                </th>
                <th scope="col" className="py-3 px-3 w-[7%] bg-gray-100 dark:bg-gray-800">
                  Completion Certificate
                </th>
                <th scope="col" className="py-3 px-3 w-[7%] bg-gray-100 dark:bg-gray-800">
                  Recommendation
                </th>
                <th scope="col" className="py-3 px-2 w-[2%] bg-gray-100 dark:bg-gray-800">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
              {isTableLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : extractedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-gray-400 dark:text-gray-500">
                    <FileText size={40} className="mx-auto mb-2 stroke-1" />
                    <p className="text-sm">No processed records found.</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Import PDFs using the Vendor Folder section above.</p>
                  </td>
                </tr>
              ) : (
                extractedData.map((row, index) => {
                  const currentVendor =
                      row.vendorFolder && row.vendorFolder.trim() !== '' ? row.vendorFolder : 'Uncategorized Vendor';
                    const prevVendor =
                      index > 0
                        ? extractedData[index - 1].vendorFolder &&
                          extractedData[index - 1].vendorFolder.trim() !== ''
                          ? extractedData[index - 1].vendorFolder
                          : 'Uncategorized Vendor'
                        : null;

                    const showVendorHeader = index === 0 || currentVendor !== prevVendor;
                    const dateVerified =
                      row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
                    const ministryVerified =
                      row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);
                    const completionCertificate = row.completionCertificate || 'No';
                    const recommendation = row.recommendation || 'No';
                    const isCellEditing = (field) => editingCell?.rowId === row.id && editingCell?.field === field;

                    const woValueNumeric = parseCurrencyToNumber(row.woValue);
                    const isBelowR1Threshold =
                    woValueNumeric !== null &&
                    woValueNumeric < RULE_CHECK_TIERS.find((tier) => tier.id === 'R1').threshold;

                    const ruleCheckResult = row.vendorFolder
                      ? ruleCheckByVendor[row.vendorFolder] || { R1: false, R2: false, R3: false }
                      : evaluateRuleCheck(woValueNumeric !== null ? [woValueNumeric] : []);
                    const showRuleCheck = row.vendorFolder ? showVendorHeader : true;

                    return (
                      <React.Fragment key={row.id}>
                        {showVendorHeader && (
                          <tr className="bg-[#003874]/10 dark:bg-indigo-950/50 border-t-2 border-[#003874]/30 dark:border-indigo-900/80">
                            <td colSpan={11} className="py-2.5 px-3 text-xs font-bold uppercase tracking-wide text-[#003874] dark:text-indigo-300 bg-[#003874]/15 dark:bg-indigo-950/70">
                              📁 {currentVendor}
                            </td>
                          </tr>
                        )}
                        <tr className="group/row hover:bg-slate-50/80 dark:hover:bg-gray-800/60 transition-colors align-top">
                          <td className="py-3 px-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{serialNumbers[index]}</td>

                          <td className="py-3 px-3">
                            <EditableField
                              isEditing={isCellEditing('woNumber')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'woNumber')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-[11px] break-all">
                                    {row.woNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => verifyAndOpenPdf(row)}
                                    className="p-1 text-[#003874] hover:text-[#002855] dark:text-blue-400 dark:hover:text-blue-300 hover:bg-[#003874]/10 dark:hover:bg-blue-950/50 rounded transition flex-shrink-0"
                                    title="Open PDF in Modal"
                                    aria-label="Open PDF Document in Modal"
                                  >
                                    <ExternalLink size={13} />
                                  </button>
                                </div>
                              }
                            />
                          </td>

                          <td className="py-3 px-3">
                            <EditableField
                              isEditing={isCellEditing('woValue')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'woValue')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                <span
                                  className={`font-semibold break-words ${
                                    isBelowR1Threshold ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  {row.woValue}
                                </span>
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-gray-600 dark:text-gray-300 font-normal break-words">
                            <EditableField
                              isEditing={isCellEditing('date')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'date')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={row.date}
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={['Yes', 'No']}
                              isEditing={isCellEditing('dateVerified')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'dateVerified')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                dateVerified === 'Yes' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-gray-900 dark:text-gray-100 font-medium break-words">
                            <EditableField
                              isEditing={isCellEditing('ministry')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'ministry')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={row.ministry}
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={['Yes', 'No']}
                              isEditing={isCellEditing('ministryVerified')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'ministryVerified')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                ministryVerified === 'Yes' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            {showRuleCheck && (
                              <div className="inline-flex items-center space-x-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-bold border ${
                                    ruleCheckResult.R1
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                      : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                  }`}
                                >
                                  R1
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-bold border ${
                                    ruleCheckResult.R2
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                      : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                  }`}
                                >
                                  R2
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-bold border ${
                                    ruleCheckResult.R3
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                      : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                  }`}
                                >
                                  R3
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={['Yes', 'No']}
                              isEditing={isCellEditing('completionCertificate')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'completionCertificate')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                completionCertificate === 'Yes' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={['Yes', 'No']}
                              isEditing={isCellEditing('recommendation')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'recommendation')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                recommendation === 'Yes' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => requestDeleteRow(row.id)}
                              className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition opacity-0 group-hover/row:opacity-100"
                              title="Delete row"
                              aria-label="Delete entry row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PDF MODAL */}
      <PdfModal
        isOpen={isPdfModalOpen}
        modalRow={modalRow}
        modalEditData={modalEditData}
        modalPdfUrl={modalPdfUrl}
        handleModalFieldChange={handleModalFieldChange}
        saveModalChanges={saveModalChanges}
        closePdfModal={closePdfModal}
        verifyDateAfterCutoff={verifyDateAfterCutoff}
        verifyMinistryDepartment={verifyMinistryDepartment}
      />

      {/* Delete confirmation modal */}
      {deleteConfirmRowId &&
        (() => {
          const rowPendingDelete = extractedData.find((r) => r.id === deleteConfirmRowId);
          return (
            <aside className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-950/80 backdrop-blur-sm" onClick={cancelDeleteRow} />
              <article className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 mx-auto mb-4">
                  <Trash2 size={20} className="text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white text-center mb-1.5">Delete this record?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
                  {rowPendingDelete ? (
                    <>
                      WO Number <span className="font-mono text-gray-700 dark:text-gray-300 break-all">{rowPendingDelete.woNumber}</span> will
                      be permanently removed.{' '}
                    </>
                  ) : (
                    'This record will be permanently removed. '
                  )}
                  This action cannot be undone.
                </p>
                <footer className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={cancelDeleteRow}
                    className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteRow}
                    className="flex-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-lg transition"
                  >
                    Delete
                  </button>
                </footer>
              </article>
            </aside>
          );
        })()}
    </main>
  );
}