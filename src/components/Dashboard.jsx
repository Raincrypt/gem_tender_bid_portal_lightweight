import React, { useState, useEffect, useRef } from 'react';
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
  Trash2 
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { 
  DATE_VERIFICATION_CUTOFF, 
  VALID_MINISTRIES,
  VALID_MINISTRY_KEYWORDS,
  CURRENCY_LOCALE, 
  CURRENCY_SYMBOL, 
  DATE_DISPLAY_FORMAT, 
  RULE_CHECK_R1_MIN_COUNT, 
  RULE_CHECK_R1_THRESHOLD, 
  RULE_CHECK_R2_MIN_COUNT, 
  RULE_CHECK_R2_THRESHOLD, 
  RULE_CHECK_R3_MIN_COUNT, 
  RULE_CHECK_R3_THRESHOLD,
} from '../config/config';

const API_BASE_URL = 'http://localhost:5000/api/bids';

// 🧠 VERIFICATION HELPERS
const MONTH_ABBR = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

const parseExtractedDate = (dateStr) => {
  if (!dateStr || dateStr === 'Not Found') return null;
  const cleaned = dateStr.trim();

  let match = cleaned.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (match && MONTH_ABBR[match[2]] !== undefined) {
    return new Date(Number(match[3]), MONTH_ABBR[match[2]], Number(match[1]));
  }

  match = cleaned.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  match = cleaned.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const verifyDateAfterCutoff = (dateStr) => {
  const parsed = parseExtractedDate(dateStr);
  if (!parsed) return "No";
  return parsed >= DATE_VERIFICATION_CUTOFF ? "Yes" : "No";
};

const verifyMinistryDepartment = (ministryStr) => {
  if (!ministryStr || ministryStr === 'Not Found') return "No";
  const normalized = ministryStr.trim().toLowerCase();

  // Tier 1: exact match
  if (VALID_MINISTRIES.some((m) => m.trim().toLowerCase() === normalized)) return "Yes";

  // Tier 2: keyword/substring match
  if (VALID_MINISTRY_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()))) return "Yes";

  return "No";
};

const formatIndianCurrency = (valueStr) => {
  if (!valueStr || valueStr === 'Not Found') return valueStr;
  
  const isIOCLFormat = valueStr.includes("including GST") || valueStr.startsWith("Rs.");
  const cleaned = valueStr.toString().replace(/[^0-9.]/g, '');
  if (!cleaned) return valueStr;

  const numericValue = parseFloat(cleaned);
  if (isNaN(numericValue)) return valueStr;

  const formatted = numericValue.toLocaleString(CURRENCY_LOCALE, { maximumFractionDigits: 2 });
  if (isIOCLFormat) return `Rs. ${formatted} including GST`;

  return `${CURRENCY_SYMBOL} ${formatted}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr || dateStr === 'Not Found') return dateStr;
  const parsed = parseExtractedDate(dateStr);
  if (!parsed) return dateStr;
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return DATE_DISPLAY_FORMAT.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);
};

const formatDateObject = (dateObj) => {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return DATE_DISPLAY_FORMAT.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);
};

const parseCurrencyToNumber = (valueStr) => {
  if (!valueStr || valueStr === 'Not Found') return null;
  const cleaned = valueStr.toString().replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const evaluateRuleCheck = (values) => {
  const meetsR1 = values.filter((v) => v > RULE_CHECK_R1_THRESHOLD).length >= RULE_CHECK_R1_MIN_COUNT;
  const meetsR2 = values.filter((v) => v > RULE_CHECK_R2_THRESHOLD).length >= RULE_CHECK_R2_MIN_COUNT;
  const meetsR3 = values.filter((v) => v > RULE_CHECK_R3_THRESHOLD).length >= RULE_CHECK_R3_MIN_COUNT;
  
  return {
    R1: meetsR1,
    R2: meetsR2,
    R3: meetsR3,
    satisfied: meetsR1 || meetsR2 || meetsR3
  };
};

const computeRuleCheckByVendor = (data) => {
  const valuesByVendor = {};
  data.forEach((row) => {
    if (!row.vendorFolder) return;
    const numeric = parseCurrencyToNumber(row.woValue);
    if (numeric === null) return;
    if (!valuesByVendor[row.vendorFolder]) valuesByVendor[row.vendorFolder] = [];
    valuesByVendor[row.vendorFolder].push(numeric);
  });

  const resultByVendor = {};
  Object.keys(valuesByVendor).forEach((vendor) => {
    resultByVendor[vendor] = evaluateRuleCheck(valuesByVendor[vendor]);
  });
  return resultByVendor;
};

const computeVendorSerialNumbers = (data) => {
  const serials = [];
  let currentKey;
  let counter = 0;
  data.forEach((row) => {
    const key = row.vendorFolder || null;
    if (key !== currentKey) {
      currentKey = key;
      counter = 1;
    } else {
      counter += 1;
    }
    serials.push(counter);
  });
  return serials;
};

const groupRowsByVendor = (data) => {
  const groups = new Map();
  data.forEach((row) => {
    const key = row.vendorFolder || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return Array.from(groups.values()).flat();
};

function EditableField({
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  displayContent,
  type = 'text',
  options = []
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  return (
    <div className="relative group/field inline-block w-full">
      {!isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="absolute -top-3 right-0 p-1 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 rounded shadow-sm opacity-0 group-hover/field:opacity-100 transition z-10"
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
            className="text-xs border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
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
            className="w-full text-xs border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )
      ) : (
        displayContent
      )}
    </div>
  );
}

export default function Dashboard() {
  const [extractedData, setExtractedData] = useState([]);

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmRowId, setDeleteConfirmRowId] = useState(null);

  const fileInputRef = useRef(null);
  const activeTargetPageRef = useRef(null);
  const fileBlobsMapRef = useRef(new Map());

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
    currentVendor: ''
  });

  useEffect(() => {
    fetchFromPostgres();
  }, []);

  const fetchFromPostgres = async () => {
    try {
      const res = await fetch(API_BASE_URL);
      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      setExtractedData(data);
      localStorage.setItem('gem_portal_history', JSON.stringify(data));
    } catch (err) {
      console.warn("PostgreSQL server offline, falling back to LocalStorage history:", err);
      const savedData = localStorage.getItem('gem_portal_history');
      if (savedData) {
        try { setExtractedData(JSON.parse(savedData)); } catch (e) {}
      }
    }
  };

  const saveToLocalStorage = (newData) => {
    setExtractedData(newData);
    localStorage.setItem('gem_portal_history', JSON.stringify(newData));
  };

  // ⚡ Chunked saver to handle thousands of records cleanly without payload limits
  const saveToPostgresInChunks = async (records, chunkSize = 100) => {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        await fetch(`${API_BASE_URL}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk)
        });
      } catch (err) {
        console.error("Failed to push chunk to DB, saving locally:", err);
      }
    }
    await fetchFromPostgres();
  };

  const exportToExcel = () => {
    if (!extractedData.length) return;

    const exportableData = extractedData.filter((row) => row.woNumber && row.woNumber !== "Not Found");
    if (!exportableData.length) return;

    const groupedData = groupRowsByVendor(exportableData);
    const serialNumbers = computeVendorSerialNumbers(groupedData);
    const ruleCheckByVendor = computeRuleCheckByVendor(groupedData);
    const dateVerificationHeading = `WHETHER WO DATE DURING ${formatDateObject(DATE_VERIFICATION_CUTOFF)}`;

    const sheetData = groupedData.map((row, index) => {
      const vendorName = row.vendorFolder || '';
      const previousVendorName = index > 0 ? (groupedData[index - 1].vendorFolder || '') : null;
      const displayVendorName = vendorName && vendorName !== previousVendorName ? vendorName : '';

      const dateVerified = row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
      const ministryVerified = row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);

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
        "S.No": serialNumbers[index],
        "BIDDER'S NAME": displayVendorName,
        "WO NUMBER": row.woNumber,
        "WO VALUE": row.woValue,
        "DATE": row.date,
        [dateVerificationHeading]: dateVerified,
        "MINISTRY / DIVISION": row.ministry,
        "WO FOR PETROLEUM/PETROCHEMICAL REFINERY": ministryVerified,
        "RULE CHECK (R1,R2,R3)": ruleCheckLabel,
        "COMPLETION CERTIFICATE": row.completionCertificate || "No",
        "RECOMMENDATION": row.recommendation || "No"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GeM Extraction");
    XLSX.writeFile(workbook, `GeM_Master_Report_${Date.now()}.xlsx`);
  };

  const startEditingCell = (row, field) => {
    let initialValue;
    if (field === 'dateVerified') {
      initialValue = row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
    } else if (field === 'ministryVerified') {
      initialValue = row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);
    } else if (field === 'completionCertificate' || field === 'recommendation') {
      initialValue = row[field] || "No";
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
      await fetch(`${API_BASE_URL}/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: editValue })
      });
    } catch (e) {
      console.warn("Database sync failed, updating UI locally:", e);
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
      await fetch(`${API_BASE_URL}/${deleteConfirmRowId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Database delete sync failed, updating locally:", e);
    }
    
    const updated = extractedData.filter((r) => r.id !== deleteConfirmRowId);
    saveToLocalStorage(updated);
    setDeleteConfirmRowId(null);
  };

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to completely wipe all database and local records?")) { 
      try {
        await fetch(API_BASE_URL, { method: 'DELETE' });
      } catch (e) {
        console.warn("Database truncate request failed:", e);
      }
      fileBlobsMapRef.current.clear();
      saveToLocalStorage([]);
    }
  };

  const verifyAndOpenPdf = (row) => {
    const cachedUrl = fileBlobsMapRef.current.get(row.fileName);
    if (cachedUrl) {
      window.open(`${cachedUrl}#page=${row.pageIndex || 1}`, '_blank', 'noopener,noreferrer');
    } else {
      activeTargetPageRef.current = row.pageIndex || 1;
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const handleVerifyFileRedirect = (e) => {
    const file = e.target.files[0];
    if (!file || !activeTargetPageRef.current) return;

    const targetPage = activeTargetPageRef.current;
    const fileBlobUrl = URL.createObjectURL(file);
    
    window.open(`${fileBlobUrl}#page=${targetPage}`, '_blank', 'noopener,noreferrer');
    
    e.target.value = null;
    activeTargetPageRef.current = null;
  };

  // 🤖 AI FALLBACK API CALL
  const callAiFallback = async (pageText) => {
    try {
      const res = await fetch('http://localhost:5000/api/extract-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pageText })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("AI Fallback failed to respond:", e);
      return null;
    }
  };

  const parsePdfFileContextAsync = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onerror = () => reject(new Error("FileReader runtime stream execution failure."));
      reader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target.result);
          const loadingTask = pdfjsLib.getDocument({ data: typedarray });
          const pdf = await loadingTask.promise;
          
          const totalPages = pdf.numPages;
          const fileBlobUrl = URL.createObjectURL(file);
          fileBlobsMapRef.current.set(file.name, fileBlobUrl);
          
          let filePagesData = [];
          let globalText = "";

          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const textLayout = await page.getTextContent();
            const pageStr = textLayout.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
            
            filePagesData.push({ index: i, text: pageStr });
            globalText += " " + pageStr;
          }

          let localRecords = [];

          const isIOCLDocument = globalText.includes("INDIAN OIL") || 
                                 globalText.includes("Haldia Refinery") || 
                                 (globalText.includes("Work Order") && !globalText.includes("GEMC"));

          if (isIOCLDocument) {
            let woNumber = "Not Found", woValue = "Not Found", date = "Not Found", ministry = "INDIAN OIL CORPORATION LIMITED, Haldia Refinery";
            
            const woMatch = globalText.match(/(?:Work Order Number|Work Order No|Work Order No\.|WO No|WO Number)[:\s]*([0-9/A-Z\-]+)/i);
            if (woMatch) woNumber = woMatch[1].trim();

            const valueMatch = globalText.match(/Rs\.\s*([\d,]+(?:\.\d{1,2})?)\s*including GST/i) || 
                               globalText.match(/Executed Value of the Contract:\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                               globalText.match(/(?:Rs\.?\s*)([\d,]{5,}(?:\.\d{1,2})?)/i);
            
            if (valueMatch) {
              woValue = "Rs. " + valueMatch[1].trim() + " including GST";
            } else {
              const fallbackNumMatch = globalText.match(/[\d]{1,3}(?:,[\d]{2,3})+(?:\.[\d]{2})?/);
              if (fallbackNumMatch) {
                woValue = "Rs. " + fallbackNumMatch[0].trim() + " including GST";
              }
            }

            const dateMatch = globalText.match(/(?:of Commencement|Date of Issue|WO Date)[:\s]*([0-9.]+)/i) || 
                              globalText.match(/(?:Date|Dated)[:\s]*([0-9.]+)/i) || 
                              globalText.match(/\d{2}\.\d{2}\.\d{4}/);
            if (dateMatch) date = dateMatch[0].trim();

            localRecords.push({ id: `rec-${Date.now()}`, woNumber, woValue, date, ministry, fileName: file.name, pageIndex: 1 });
          } 
          else {
            // UNIVERSAL & GeM CONTRACT SCANNER
            let currentRecord = null;

            for (let pageObj of filePagesData) {
              const pageStr = pageObj.text;

              // Broadened Contract Boundary Signals so no contract page is skipped
              const isNewContractStart = /(?:Contract No|अनुबंध क्रमांक|GEMC|Work Order No|Sanction No|Order No|PO No|GEM[\/])/i.test(pageStr);

              if (isNewContractStart || (!currentRecord && localRecords.length === 0)) {
                if (currentRecord) {
                  localRecords.push(currentRecord);
                }

                currentRecord = {
                  id: `rec-${Date.now()}-${pageObj.index}-${Math.random().toString(36).substr(2, 5)}`,
                  woNumber: "Not Found",
                  woValue: "Not Found",
                  date: "Not Found",
                  ministry: "Not Found",
                  fileName: file.name,
                  pageIndex: pageObj.index
                };
              }

              if (currentRecord) {
                // 1. WO NUMBER EXTRACTION
                if (currentRecord.woNumber === "Not Found") {
                  const woMatch = pageStr.match(/GEMC\s*[-–—]?\s*[\w\-]+/i) ||
                                  pageStr.match(/GEM\s*[\/\-]\s*\d+[\/\-A-Z0-9\-_]+/i) ||
                                  pageStr.match(/(?:Contract No|Work Order No|Order No|PO No|Sanction No|अनुबंध क्रमांक|GEM[- ]?No|Bid Number)[:\s|]*([A-Z0-9\/\-_]{5,})/i);
                  
                  if (woMatch) {
                    const extractedWo = woMatch[1] || woMatch[0];
                    currentRecord.woNumber = extractedWo.replace(/^(?:Contract No|Work Order No|Order No|PO No|Sanction No|अनुबंध क्रमांक|GEM[- ]?No|Bid Number)[:\s|]*/i, '').trim();
                  }
                }

                // 2. DATE EXTRACTION
                if (currentRecord.date === "Not Found") {
                  const dateMatch = pageStr.match(/(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9]{2}-[A-Za-z]{3}-[0-9]{4})/i) || 
                                    pageStr.match(/(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9]{2}[-/.]\d{2}[-/.]\d{4})/i) ||
                                    pageStr.match(/(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9A-Za-z\-./]{10,12})/i);
                  
                  if (dateMatch && dateMatch[1] && /\d/.test(dateMatch[1])) {
                    currentRecord.date = dateMatch[1].trim().replace(/[\]|]/g, '');
                  } else {
                    const dateAnchorIndex = pageStr.search(/(?:Generated Date|अनुबंध तिथि|Dated)/i);
                    if (dateAnchorIndex !== -1) {
                      const localSnippet = pageStr.substring(dateAnchorIndex, dateAnchorIndex + 120);
                      const fallbackDate = localSnippet.match(/\d{2}-[A-Za-z]{3}-\d{4}/) || localSnippet.match(/\d{2}[-/.]\d{2}[-/.]\d{4}/);
                      if (fallbackDate) {
                        currentRecord.date = fallbackDate[0].trim();
                      }
                    }
                  }
                }

                // 3. FULL HIGH-PRECISION 3-TIER VALUE EXTRACTION
                if (currentRecord.woValue === "Not Found") {
                  // TIER 1: Total Contract Value Including All Duties and Taxes(INR) / Hindi
                  const tier1Match = pageStr.match(
                    /(?:Total\s*Contract\s*Value\s*Including\s*All\s*Duties\s*and\s*Taxes(?:\s*\(\s*INR\s*\))?|सभी\s*शुल्क\s*और\s*करों\s*सहित\s*कुल\s*अनुबंध\s*मूल्य)[:\s|]*([0-9](?:[0-9.,]|\s(?=[0-9.,]))*[0-9])/i
                  );

                  if (tier1Match && tier1Match[1].replace(/[^0-9]/g, '').length >= 4) {
                    currentRecord.woValue = "₹ " + tier1Match[1].replace(/\s+/g, '').trim();
                  } else {
                    // TIER 2: Total Amount Including All Duties and Taxes in INR
                    const tier2Match = pageStr.match(
                      /(?:Total\s*Amount\s*Including\s*All\s*Duties\s*and\s*Taxes\s*in\s*INR)[:\s|]*([0-9](?:[0-9.,]|\s(?=[0-9.,]))*[0-9])/i
                    );

                    if (tier2Match && tier2Match[1].replace(/[^0-9]/g, '').length >= 4) {
                      currentRecord.woValue = "₹ " + tier2Match[1].replace(/\s+/g, '').trim();
                    } else {
                      // TIER 3: CONTEXT WINDOW FALLBACK SCANNER
                      const valueAnchorIndex = pageStr.search(/(?:Duties and Taxes|कुल अनुबंध मूल्य|Contract Value|Original Value|Total Amount|Order Value)/i);
                      if (valueAnchorIndex !== -1) {
                        const contextWindowSnippet = pageStr.substring(valueAnchorIndex, valueAnchorIndex + 200);
                        const fallbackNumMatch = contextWindowSnippet.match(/[0-9](?:[0-9,]|\s(?=[0-9,]))*(?:\s?\.\s?[0-9]+)?/);
                        if (fallbackNumMatch) {
                          const cleanedFallback = fallbackNumMatch[0].replace(/\s+/g, '');
                          if (cleanedFallback.replace(/[^0-9]/g, '').length >= 4) {
                            currentRecord.woValue = "₹ " + cleanedFallback.trim();
                          }
                        }
                      }
                    }
                  }
                }

                // 4. MINISTRY EXTRACTION
                if (currentRecord.ministry === "Not Found") {
                  const ministryMatch = pageStr.match(/Ministry\s?of\s?([A-Za-z\s]{3,40})(?=\s?Department|\s?महानिदेशालय|\s?\||$)/i) || 
                                        pageStr.match(/Ministry\s?of\s?([A-Za-z\s]{3,40})/i) ||
                                        pageStr.match(/(?:Organization Details|संगठन विवरण|Buyer Details)[:\s|]*Ministry\s?of\s?([A-Za-z\s]{3,40})/i);
                  
                  if (ministryMatch && ministryMatch[1]) {
                    currentRecord.ministry = "Ministry of " + ministryMatch[1].trim();
                  } else {
                    const orgMatch = pageStr.match(/(?:Organisation Name|संगठन का नाम)[:\s|]*([A-Za-z\s]{4,40})(?=\s?Type|\||$)/i);
                    if (orgMatch && orgMatch[1] && !/Not Found/i.test(orgMatch[1])) {
                      currentRecord.ministry = orgMatch[1].trim();
                    } else {
                      if (/Defence|Defense/i.test(pageStr)) currentRecord.ministry = "Ministry of Defence";
                      else if (/Finance/i.test(pageStr)) currentRecord.ministry = "Ministry of Finance";
                      else if (/Railways/i.test(pageStr)) currentRecord.ministry = "Ministry of Railways";
                      else if (/Textiles/i.test(pageStr)) currentRecord.ministry = "Ministry of Textiles";
                      else if (/Communications/i.test(pageStr)) currentRecord.ministry = "Ministry of Communications";
                      else if (/Labour/i.test(pageStr)) currentRecord.ministry = "Ministry of Labour and Employment";
                    }
                  }
                }

                // 5. AI Fallback trigger if missing WO Number or WO Value
                if (currentRecord.woNumber === "Not Found" || currentRecord.woValue === "Not Found") {
                  const aiResult = await callAiFallback(pageStr);
                  if (aiResult) {
                    if (currentRecord.woNumber === "Not Found" && aiResult.woNumber && aiResult.woNumber !== "Not Found") {
                      currentRecord.woNumber = aiResult.woNumber;
                    }
                    if (currentRecord.woValue === "Not Found" && aiResult.woValue && aiResult.woValue !== "Not Found") {
                      currentRecord.woValue = aiResult.woValue;
                    }
                    if (currentRecord.date === "Not Found" && aiResult.date && aiResult.date !== "Not Found") {
                      currentRecord.date = aiResult.date;
                    }
                    if (currentRecord.ministry === "Not Found" && aiResult.ministry && aiResult.ministry !== "Not Found") {
                      currentRecord.ministry = aiResult.ministry;
                    }
                  }
                }
              }
            }

            // Push last record
            if (currentRecord) {
              localRecords.push(currentRecord);
            }

            // Global fallback if zero records extracted
            if (localRecords.length === 0) {
              const aiResult = await callAiFallback(globalText);
              if (aiResult) {
                localRecords.push({
                  id: `rec-${Date.now()}`,
                  woNumber: aiResult.woNumber || "Not Found",
                  woValue: aiResult.woValue || "Not Found",
                  date: aiResult.date || "Not Found",
                  ministry: aiResult.ministry || "Not Found",
                  fileName: file.name,
                  pageIndex: 1
                });
              }
            }
          }

          localRecords = localRecords.map((record) => ({
            ...record,
            woValue: formatIndianCurrency(record.woValue),
            date: formatDateDisplay(record.date),
            completionCertificate: record.completionCertificate || "No",
            recommendation: record.recommendation || "No"
          }));

          // Safe Deduplication by Page Index to keep all work orders intact
          const fieldScore = (r) =>
            ['woNumber', 'woValue', 'date', 'ministry']
              .filter((f) => r[f] && r[f] !== 'Not Found').length;

          const bestByWo = new Map();
          localRecords.forEach((record) => {
            const key = record.woNumber !== "Not Found" 
              ? `${record.woNumber}-p${record.pageIndex}` 
              : record.id;

            if (!bestByWo.has(key) || fieldScore(record) > fieldScore(bestByWo.get(key))) {
              bestByWo.set(key, record);
            }
          });

          localRecords = Array.from(bestByWo.values());

          resolve(localRecords);
        } catch (err) { reject(err); }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const triggerFolderBrowse = () => {
    if (folderInputRef.current) folderInputRef.current.click();
  };

  const handleBrowseFolder = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const firstRelPath = files[0].webkitRelativePath || files[0].name;
    const rootFolderName = firstRelPath.split('/')[0] || 'Selected Folder';

    setRawFolderFiles(files);
    setSelectedFolderPath(`${rootFolderName} (${files.length} file${files.length === 1 ? '' : 's'} found)`);

    setVendorFolders({});
    setSelectedVendors({});
  };

  const readVendorFolders = () => {
    if (!rawFolderFiles.length) return;
    setIsReadingFolders(true);

    const grouped = {};
    rawFolderFiles.forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) return;

      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');
      const vendor = parts.length > 2 ? parts[1] : 'Uncategorized';

      if (!grouped[vendor]) grouped[vendor] = [];
      grouped[vendor].push(file);
    });

    setVendorFolders(grouped);
    const initialSelection = {};
    Object.keys(grouped).forEach((v) => { initialSelection[v] = true; });
    setSelectedVendors(initialSelection);
    setIsReadingFolders(false);
  };

  const toggleVendorSelection = (vendor) => {
    setSelectedVendors((prev) => ({ ...prev, [vendor]: !prev[vendor] }));
  };

  const toggleSelectAllVendors = (checked) => {
    const updated = {};
    Object.keys(vendorFolders).forEach((v) => { updated[v] = checked; });
    setSelectedVendors(updated);
  };

  const processSelectedVendors = async () => {
    const vendorsToProcess = Object.keys(vendorFolders).filter((v) => selectedVendors[v]);
    if (!vendorsToProcess.length) return;

    const queue = [];
    vendorsToProcess.forEach((vendor) => {
      vendorFolders[vendor].forEach((file) => queue.push({ file, vendor }));
    });
    if (!queue.length) return;

    setIsBulkProcessing(true);
    setBulkProgress({ currentFileIndex: 0, totalFiles: queue.length, currentFileName: '', currentVendor: '' });

    let unwrittenBuffer = [];

    for (let idx = 0; idx < queue.length; idx++) {
      const { file, vendor } = queue[idx];

      setBulkProgress({
        currentFileIndex: idx + 1,
        totalFiles: queue.length,
        currentFileName: file.name,
        currentVendor: vendor
      });

      try {
        const parsedResults = await parsePdfFileContextAsync(file);
        const mappedRecords = parsedResults.map((r) => ({ ...r, vendorFolder: vendor }));
        unwrittenBuffer.push(...mappedRecords);

        // Flush buffer to DB every 50 records or on the last file
        if (unwrittenBuffer.length >= 50 || idx === queue.length - 1) {
          await saveToPostgresInChunks(unwrittenBuffer);
          unwrittenBuffer = [];
        }

        // Clean up Blob URLs to keep memory lean
        if (fileBlobsMapRef.current.has(file.name)) {
          const blobUrl = fileBlobsMapRef.current.get(file.name);
          URL.revokeObjectURL(blobUrl);
          fileBlobsMapRef.current.delete(file.name);
        }

        // Allow UI progress bar to repaint smoothly every 5 items
        if (idx % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      } catch (err) {
        console.error(`Failed to process "${file.name}" (vendor: ${vendor})`, err);
      }
    }

    setIsBulkProcessing(false);
  };

  return (
    <main className="w-full max-w-[98vw] mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={handleVerifyFileRedirect} />

      <div className="max-w-4xl mx-auto">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <header className="flex items-center space-x-2 mb-2 text-indigo-600">
            <FolderOpen size={20} className={isBulkProcessing ? "animate-pulse" : ""} />
            <span className="text-xs font-bold uppercase tracking-wider">Vendor Folder Bulk Import</span>
          </header>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Import by Vendor Folder</h2>
          <p className="text-sm text-gray-500 mb-6">
            Choose a root folder. Every sub-folder inside it is treated as a vendor, and the PDF files inside each
            sub-folder are grouped under that vendor's name. Select which vendors to process, then run the import.
          </p>

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
              className="flex-1 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 truncate focus:outline-none"
            />
            <button
              type="button"
              onClick={triggerFolderBrowse}
              disabled={isBulkProcessing || isReadingFolders}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition flex-shrink-0"
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
              className="flex items-center space-x-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg transition"
            >
              {isReadingFolders ? <RefreshCw size={16} className="animate-spin" /> : <ListChecks size={16} />}
              <span>{isReadingFolders ? 'Reading...' : 'Read Folders / Vendors'}</span>
            </button>

            <button
              type="button"
              onClick={processSelectedVendors}
              disabled={isBulkProcessing || Object.keys(vendorFolders).length === 0 || !Object.values(selectedVendors).some(Boolean)}
              className="flex items-center space-x-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg transition"
            >
              <UploadCloud size={16} />
              <span>Upload Files from Selected Folders</span>
            </button>
          </nav>

          {Object.keys(vendorFolders).length > 0 && (
            <aside className="border border-gray-200 rounded-lg overflow-hidden mb-2">
              <header className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1.5">
                  <Building2 size={14} />
                  <span>{Object.keys(vendorFolders).length} Vendor Folder(s) Detected</span>
                </span>
                <nav aria-label="Selection options" className="flex items-center space-x-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSelectAllVendors(true)}
                    disabled={isBulkProcessing}
                    className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectAllVendors(false)}
                    disabled={isBulkProcessing}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </nav>
              </header>
              <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                {Object.keys(vendorFolders).sort().map((vendor) => (
                  <li key={vendor}>
                    <label
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${isBulkProcessing ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={!!selectedVendors[vendor]}
                          onChange={() => toggleVendorSelection(vendor)}
                          disabled={isBulkProcessing}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{vendor}</span>
                      </div>
                      <span className="text-xs text-gray-400">{vendorFolders[vendor].length} file(s)</span>
                    </label>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {isBulkProcessing && (
            <aside className="mt-6" aria-label="Bulk processing progress">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-indigo-600">
                  Vendor: {bulkProgress.currentVendor || '—'}
                </span>
                <span className="text-xs text-gray-400">
                  {bulkProgress.currentFileIndex} / {bulkProgress.totalFiles}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${bulkProgress.totalFiles ? (bulkProgress.currentFileIndex / bulkProgress.totalFiles) * 100 : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 truncate">
                Processing: {bulkProgress.currentFileName || 'Starting...'}
              </p>
            </aside>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
        <header className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Extracted Bid Columns</h2>
            <p className="text-xs text-gray-400 mt-0.5">High precision composite verification table entries.</p>
          </div>
          
          {extractedData.length > 0 && (
            <nav aria-label="Table Actions" className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={clearHistory} 
                className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg transition"
              >
                Wipe History
              </button>
              <button 
                type="button"
                onClick={exportToExcel} 
                className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition"
              >
                <Download size={14} />
                <span>Export to Excel</span>
              </button>
            </nav>
          )}
        </header>

        {extractedData.length === 0 ? (
          <article className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
            <FileText size={40} className="mb-2 stroke-1" />
            <p className="text-sm">No processed records found.</p>
          </article>
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 shadow-sm">
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th scope="col" className="py-3 px-3 w-[4%] bg-gray-100">S.No</th>
                  <th scope="col" className="py-3 px-3 w-[13%] bg-gray-100">WO Number</th>
                  <th scope="col" className="py-3 px-3 w-[10%] bg-gray-100">WO Value</th>
                  <th scope="col" className="py-3 px-3 w-[8%] bg-gray-100">Date</th>
                  <th scope="col" className="py-3 px-3 w-[10%] bg-gray-100">{`Whether WO Date During ${formatDateObject(DATE_VERIFICATION_CUTOFF)}`}</th>
                  <th scope="col" className="py-3 px-3 w-[20%] bg-gray-100">Ministry / Division</th>
                  <th scope="col" className="py-3 px-3 w-[11%] bg-gray-100">WO for Petroleum/Petrochemical Refinery</th>
                  <th scope="col" className="py-3 px-3 w-[11%] bg-gray-100">Rule Check</th>
                  <th scope="col" className="py-3 px-3 w-[7%] bg-gray-100">Completion Certificate</th>
                  <th scope="col" className="py-3 px-3 w-[7%] bg-gray-100">Recommendation</th>
                  <th scope="col" className="py-3 px-2 w-[2%] bg-gray-100"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                {(() => {
                  const serialNumbers = computeVendorSerialNumbers(extractedData);
                  const ruleCheckByVendor = computeRuleCheckByVendor(extractedData);
                  return extractedData.map((row, index) => {
                    const showVendorHeader = row.vendorFolder && (index === 0 || extractedData[index - 1].vendorFolder !== row.vendorFolder);
                    const dateVerified = row.dateVerified !== undefined ? row.dateVerified : verifyDateAfterCutoff(row.date);
                    const ministryVerified = row.ministryVerified !== undefined ? row.ministryVerified : verifyMinistryDepartment(row.ministry);
                    const completionCertificate = row.completionCertificate || "No";
                    const recommendation = row.recommendation || "No";
                    const isCellEditing = (field) => editingCell?.rowId === row.id && editingCell?.field === field;

                    const woValueNumeric = parseCurrencyToNumber(row.woValue);
                    const isBelowR1Threshold = woValueNumeric !== null && woValueNumeric < RULE_CHECK_R1_THRESHOLD;

                    const ruleCheckResult = row.vendorFolder
                      ? ruleCheckByVendor[row.vendorFolder] || { R1: false, R2: false, R3: false }
                      : evaluateRuleCheck(woValueNumeric !== null ? [woValueNumeric] : []);
                    const showRuleCheck = row.vendorFolder ? showVendorHeader : true;

                    return (
                      <React.Fragment key={row.id}>
                        {showVendorHeader && (
                          <tr className="bg-indigo-50/70">
                            <td colSpan={11} className="py-2 px-3 text-xs font-bold uppercase tracking-wide text-indigo-700">
                              {row.vendorFolder}
                            </td>
                          </tr>
                        )}
                        <tr className="group/row hover:bg-slate-50/80 transition-colors align-top">
                          <td className="py-3 px-3 text-gray-400 font-mono text-xs">
                            {serialNumbers[index]}
                          </td>

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
                                  <span className="font-mono text-gray-900 bg-gray-50 px-1.5 py-0.5 border border-gray-200 rounded text-[11px] break-all">{row.woNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => verifyAndOpenPdf(row)}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition flex-shrink-0"
                                    title="Open PDF Page Mapping Location"
                                    aria-label="Open PDF Document Page"
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
                              displayContent={<span className={`font-semibold break-words ${isBelowR1Threshold ? "text-red-600" : "text-emerald-700"}`}>{row.woValue}</span>}
                            />
                          </td>

                          <td className="py-3 px-3 text-gray-600 font-normal break-words">
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
                              options={["Yes", "No"]}
                              isEditing={isCellEditing('dateVerified')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'dateVerified')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                dateVerified === "Yes" ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-gray-900 font-medium break-words">
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
                              options={["Yes", "No"]}
                              isEditing={isCellEditing('ministryVerified')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'ministryVerified')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                ministryVerified === "Yes" ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            {showRuleCheck && (
                              <div className="inline-flex items-center space-x-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${ruleCheckResult.R1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                  R1
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${ruleCheckResult.R2 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                  R2
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${ruleCheckResult.R3 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                  R3
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={["Yes", "No"]}
                              isEditing={isCellEditing('completionCertificate')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'completionCertificate')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                completionCertificate === "Yes" ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                    No
                                  </span>
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            <EditableField
                              type="select"
                              options={["Yes", "No"]}
                              isEditing={isCellEditing('recommendation')}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditingCell(row, 'recommendation')}
                              onSave={saveEditingCell}
                              onCancel={cancelEditingCell}
                              displayContent={
                                recommendation === "Yes" ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
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
                              className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition opacity-0 group-hover/row:opacity-100"
                              title="Delete row"
                              aria-label="Delete entry row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteConfirmRowId && (() => {
        const rowPendingDelete = extractedData.find((r) => r.id === deleteConfirmRowId);
        return (
          <aside className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={cancelDeleteRow} />
            <article className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center mb-1.5">Delete this record?</h3>
              <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                {rowPendingDelete ? (
                  <>WO Number <span className="font-mono text-gray-700 break-all">{rowPendingDelete.woNumber}</span> will be permanently removed. </>
                ) : (
                  'This record will be permanently removed. '
                )}
                This action cannot be undone.
              </p>
              <footer className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={cancelDeleteRow}
                  className="flex-1 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg transition"
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