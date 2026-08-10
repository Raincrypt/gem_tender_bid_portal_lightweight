import { useState, useRef, useEffect } from 'react';
import {
  FlaskConical,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Copy,
  Check,
  Eye,
  Code,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Layers,
  ExternalLink,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import {
  DATE_VERIFICATION_CUTOFF,
  VALID_MINISTRIES,
  VALID_MINISTRY_KEYWORDS,
  CURRENCY_LOCALE,
  CURRENCY_SYMBOL,
  DATE_DISPLAY_FORMAT,
  RULE_CHECK_TIERS,
  IOCL_DETECTION_MARKERS,
  IOCL_WORK_ORDER_MARKER,
  IOCL_GEMC_EXCLUSION_MARKER,
  IOCL_DEFAULT_MINISTRY,
  IOCL_WO_NUMBER_PATTERN,
  IOCL_WO_VALUE_PATTERNS,
  IOCL_WO_VALUE_FALLBACK_PATTERN,
  IOCL_DATE_PATTERNS,
  NEW_CONTRACT_START_PATTERN,
  WO_NUMBER_PATTERNS,
  WO_NUMBER_LABEL_STRIP_PATTERN,
  DATE_LABEL_PATTERNS,
  DATE_ANCHOR_SEARCH_PATTERN,
  DATE_FALLBACK_SNIPPET_WINDOW,
  DATE_FALLBACK_PATTERNS,
  WO_VALUE_TIER1_PATTERN,
  WO_VALUE_TIER2_PATTERN,
  WO_VALUE_MIN_DIGIT_LENGTH,
  WO_VALUE_ANCHOR_SEARCH_PATTERN,
  WO_VALUE_CONTEXT_WINDOW,
  WO_VALUE_FALLBACK_PATTERN,
  MINISTRY_PATTERNS,
  ORGANISATION_NAME_PATTERN,
  MINISTRY_KEYWORD_RULES,
} from '../config/config';

const MONTH_ABBR = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const parseExtractedDate = (dateStr) => {
  if (!dateStr || dateStr === 'Not Found') return null;
  const cleaned = dateStr.trim();

  let match = cleaned.match(/^(\d{2})[-/.]([A-Za-z]{3})[-/.](\d{4})$/);
  if (match && MONTH_ABBR[match[2].toLowerCase()] !== undefined) {
    return new Date(Number(match[3]), MONTH_ABBR[match[2].toLowerCase()], Number(match[1]));
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
  if (!parsed) return 'No';
  return parsed >= DATE_VERIFICATION_CUTOFF ? 'Yes' : 'No';
};

const verifyMinistryDepartment = (ministryStr) => {
  if (!ministryStr || ministryStr === 'Not Found') return 'No';
  const normalized = ministryStr.trim().toLowerCase();

  if (VALID_MINISTRIES.some((m) => m.trim().toLowerCase() === normalized)) return 'Yes';
  if (VALID_MINISTRY_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()))) return 'Yes';

  return 'No';
};

const formatIndianCurrency = (valueStr) => {
  if (!valueStr || valueStr === 'Not Found') return valueStr;

  const isIOCLFormat = valueStr.includes('including GST') || valueStr.startsWith('Rs.');
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

const parseCurrencyToNumber = (valueStr) => {
  if (!valueStr || valueStr === 'Not Found') return null;
  const cleaned = valueStr.toString().replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const formatAiModelName = (modelKey) => {
  if (!modelKey) return 'Gemini 2.5 Flash';
  const map = {
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  };
  return map[modelKey] || modelKey;
};

const evaluateRuleCheck = (values) => {
  const result = { satisfied: false, R1: false, R2: false, R3: false };
  RULE_CHECK_TIERS.forEach((tier) => {
    const meetsTier = values.filter((v) => v > tier.threshold).length >= tier.minCount;
    result[tier.id] = meetsTier;
    if (meetsTier) result.satisfied = true;
  });
  return result;
};

const renderHighlightedText = (text, record, filterSearch) => {
  if (!text) return 'No text extracted';

  const highlightTerms = [];

  if (filterSearch && filterSearch.trim().length >= 2) {
    highlightTerms.push({
      term: filterSearch.trim(),
      bgClass: 'bg-yellow-400 text-gray-950 font-bold px-1 rounded shadow-xs',
      label: 'Search Filter',
    });
  }

  if (record) {
    if (record.rawWoNumber && record.rawWoNumber !== 'Not Found' && record.rawWoNumber.length >= 3) {
      highlightTerms.push({
        term: record.rawWoNumber,
        bgClass: 'bg-emerald-500/40 text-emerald-200 font-bold px-1 rounded border border-emerald-400/50',
        label: 'WO Number',
      });
    }
    if (record.woNumber && record.woNumber !== 'Not Found' && record.woNumber.length >= 3) {
      highlightTerms.push({
        term: record.woNumber,
        bgClass: 'bg-emerald-500/40 text-emerald-200 font-bold px-1 rounded border border-emerald-400/50',
        label: 'WO Number',
      });
    }

    if (record.rawDate && record.rawDate !== 'Not Found' && record.rawDate.length >= 3) {
      highlightTerms.push({
        term: record.rawDate,
        bgClass: 'bg-cyan-500/40 text-cyan-200 font-bold px-1 rounded border border-cyan-400/50',
        label: 'Date',
      });
    }
    if (record.date && record.date !== 'Not Found' && record.date.length >= 3) {
      highlightTerms.push({
        term: record.date,
        bgClass: 'bg-cyan-500/40 text-cyan-200 font-bold px-1 rounded border border-cyan-400/50',
        label: 'Date',
      });
    }

    if (record.rawWoValue && record.rawWoValue !== 'Not Found' && record.rawWoValue.length >= 3) {
      highlightTerms.push({
        term: record.rawWoValue,
        bgClass: 'bg-amber-500/40 text-amber-200 font-bold px-1 rounded border border-amber-400/50',
        label: 'WO Value',
      });
    }
    if (record.woValue && record.woValue !== 'Not Found') {
      const numDigits = record.woValue.replace(/[^0-9.]/g, '');
      if (numDigits.length >= 4) {
        highlightTerms.push({
          term: numDigits,
          bgClass: 'bg-amber-500/40 text-amber-200 font-bold px-1 rounded border border-amber-400/50',
          label: 'WO Value Number',
        });
      }
    }

    if (record.rawMinistry && record.rawMinistry !== 'Not Found' && record.rawMinistry.length >= 3) {
      highlightTerms.push({
        term: record.rawMinistry,
        bgClass: 'bg-purple-500/40 text-purple-200 font-bold px-1 rounded border border-purple-400/50',
        label: 'Ministry',
      });
    }
    if (record.ministry && record.ministry !== 'Not Found' && record.ministry.length >= 3) {
      highlightTerms.push({
        term: record.ministry,
        bgClass: 'bg-purple-500/40 text-purple-200 font-bold px-1 rounded border border-purple-400/50',
        label: 'Ministry',
      });
      const cleanMin = record.ministry.replace(/^Ministry of\s+/i, '');
      if (cleanMin.length >= 4) {
        highlightTerms.push({
          term: cleanMin,
          bgClass: 'bg-purple-500/40 text-purple-200 font-bold px-1 rounded border border-purple-400/50',
          label: 'Ministry',
        });
      }
    }
  }

  const uniqueTerms = [];
  const seen = new Set();
  highlightTerms.sort((a, b) => b.term.length - a.term.length);

  for (const item of highlightTerms) {
    const trimmed = item.term.trim();
    if (!seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      uniqueTerms.push({ ...item, term: trimmed });
    }
  }

  if (uniqueTerms.length === 0) return text;

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${uniqueTerms.map((t) => escapeRegex(t.term)).join('|')})`, 'gi');

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;
    const match = uniqueTerms.find((t) => t.term.toLowerCase() === part.toLowerCase());
    if (match) {
      return (
        <mark key={index} className={match.bgClass} title={`Extracted: ${match.label}`}>
          {part}
        </mark>
      );
    }
    return part;
  });
};

export default function AdvancedTesting({ aiModel = 'gemini-2.5-flash' }) {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedPages, setExtractedPages] = useState([]);
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [docType, setDocType] = useState('Unknown');
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'text' | 'extracted-text' | 'json'
  const [selectedPageIdx, setSelectedPageIdx] = useState(1);
  const [textSearch, setTextSearch] = useState('');
  const [copied, setCopied] = useState(false);

  // Sliding resizer split ratio state
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef(null);

  const fileInputRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRatio = Math.min(Math.max((x / rect.width) * 100, 15), 85);
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Synchronized page selection handler (shifts selected record to match page view)
  const handleSelectPage = (pageIdx) => {
    setSelectedPageIdx(pageIdx);
    if (extractedRecords && extractedRecords.length > 0) {
      let matchIdx = extractedRecords.findIndex((r) => r.pageIndex === pageIdx);
      if (matchIdx === -1) {
        let closest = 0;
        for (let i = 0; i < extractedRecords.length; i++) {
          if (extractedRecords[i].pageIndex <= pageIdx) {
            closest = i;
          }
        }
        matchIdx = closest;
      }
      if (matchIdx !== selectedRecordIndex) {
        setSelectedRecordIndex(matchIdx);
      }
    }
  };

  // Synchronized record selection handler (shifts page view to match selected record)
  const handleSelectRecord = (recordIdx) => {
    setSelectedRecordIndex(recordIdx);
    const rec = extractedRecords[recordIdx];
    if (rec && rec.pageIndex) {
      setSelectedPageIdx(rec.pageIndex);
    }
  };

  const processSinglePdf = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsProcessing(true);
    const startTime = performance.now();

    const objectUrl = URL.createObjectURL(selectedFile);
    setPdfUrl(objectUrl);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: typedArray });
      const pdf = await loadingTask.promise;

      const numPages = pdf.numPages;
      const pagesData = [];
      let globalText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();

        pagesData.push({ pageIndex: i, text: pageText });
        globalText += ' ' + pageText;
        page.cleanup();
      }

      setExtractedPages(pagesData);

      // Determine classification & perform extraction logic
      const isIOCLDocument =
        globalText.includes(IOCL_DETECTION_MARKERS[0]) ||
        globalText.includes(IOCL_DETECTION_MARKERS[1]) ||
        (globalText.includes(IOCL_WORK_ORDER_MARKER) && !globalText.includes(IOCL_GEMC_EXCLUSION_MARKER));

      setDocType(isIOCLDocument ? 'IOCL / Haldia Refinery Work Order' : 'Standard GeM Contract');

      let localRecords = [];

      if (isIOCLDocument) {
        let woNumber = 'Not Found',
          woValue = 'Not Found',
          date = 'Not Found',
          ministry = IOCL_DEFAULT_MINISTRY;

        const woMatch = globalText.match(IOCL_WO_NUMBER_PATTERN);
        if (woMatch) woNumber = woMatch[1].trim();

        const valueMatch =
          globalText.match(IOCL_WO_VALUE_PATTERNS[0]) ||
          globalText.match(IOCL_WO_VALUE_PATTERNS[1]) ||
          globalText.match(IOCL_WO_VALUE_PATTERNS[2]);

        if (valueMatch) {
          woValue = 'Rs. ' + valueMatch[1].trim() + ' including GST';
        } else {
          const fallbackNumMatch = globalText.match(IOCL_WO_VALUE_FALLBACK_PATTERN);
          if (fallbackNumMatch) {
            woValue = 'Rs. ' + fallbackNumMatch[0].trim() + ' including GST';
          }
        }

        const dateMatch =
          globalText.match(IOCL_DATE_PATTERNS[0]) ||
          globalText.match(IOCL_DATE_PATTERNS[1]) ||
          globalText.match(IOCL_DATE_PATTERNS[2]);
        if (dateMatch) date = dateMatch[0].trim();

        localRecords.push({
          id: `test-rec-${Date.now()}-1`,
          createdAt: Date.now(),
          woNumber,
          woValue,
          date,
          ministry,
          fileName: selectedFile.name,
          pageIndex: 1,
          vendorFolder: 'Test Vendor',
        });
      } else {
        let currentRecord = null;

        for (let pageObj of pagesData) {
          const pageStr = pageObj.text;
          const isNewContractStart = NEW_CONTRACT_START_PATTERN.test(pageStr);

          if (isNewContractStart || (!currentRecord && localRecords.length === 0)) {
            if (currentRecord) localRecords.push(currentRecord);

            currentRecord = {
              id: `test-rec-${Date.now()}-${pageObj.pageIndex}`,
              createdAt: Date.now() + pageObj.pageIndex,
              woNumber: 'Not Found',
              woValue: 'Not Found',
              date: 'Not Found',
              ministry: 'Not Found',
              fileName: selectedFile.name,
              pageIndex: pageObj.pageIndex,
              vendorFolder: 'Test Vendor',
            };
          }

          if (currentRecord) {
            if (currentRecord.woNumber === 'Not Found') {
              const woMatch =
                pageStr.match(WO_NUMBER_PATTERNS[0]) ||
                pageStr.match(WO_NUMBER_PATTERNS[1]) ||
                pageStr.match(WO_NUMBER_PATTERNS[2]);
              if (woMatch) {
                const extractedWo = woMatch[1] || woMatch[0];
                currentRecord.woNumber = extractedWo.replace(WO_NUMBER_LABEL_STRIP_PATTERN, '').trim();
              }
            }

            if (currentRecord.date === 'Not Found') {
              const dateMatch =
                pageStr.match(DATE_LABEL_PATTERNS[0]) ||
                pageStr.match(DATE_LABEL_PATTERNS[1]) ||
                pageStr.match(DATE_LABEL_PATTERNS[2]);

              if (dateMatch && dateMatch[1] && /\d/.test(dateMatch[1])) {
                currentRecord.date = dateMatch[1].trim().replace(/[\]|]/g, '');
              } else {
                const dateAnchorIndex = pageStr.search(DATE_ANCHOR_SEARCH_PATTERN);
                if (dateAnchorIndex !== -1) {
                  const localSnippet = pageStr.substring(dateAnchorIndex, dateAnchorIndex + DATE_FALLBACK_SNIPPET_WINDOW);
                  const fallbackDate =
                    localSnippet.match(DATE_FALLBACK_PATTERNS[0]) || localSnippet.match(DATE_FALLBACK_PATTERNS[1]);
                  if (fallbackDate) {
                    currentRecord.date = fallbackDate[0].trim();
                  }
                }
              }
            }

            if (currentRecord.woValue === 'Not Found') {
              const tier1Match = pageStr.match(WO_VALUE_TIER1_PATTERN);

              if (tier1Match && tier1Match[1].replace(/[^0-9]/g, '').length >= WO_VALUE_MIN_DIGIT_LENGTH) {
                currentRecord.woValue = '₹ ' + tier1Match[1].replace(/\s+/g, '').trim();
              } else {
                const tier2Match = pageStr.match(WO_VALUE_TIER2_PATTERN);

                if (tier2Match && tier2Match[1].replace(/[^0-9]/g, '').length >= WO_VALUE_MIN_DIGIT_LENGTH) {
                  currentRecord.woValue = '₹ ' + tier2Match[1].replace(/\s+/g, '').trim();
                } else {
                  const valueAnchorIndex = pageStr.search(WO_VALUE_ANCHOR_SEARCH_PATTERN);
                  if (valueAnchorIndex !== -1) {
                    const contextWindowSnippet = pageStr.substring(valueAnchorIndex, valueAnchorIndex + WO_VALUE_CONTEXT_WINDOW);
                    const fallbackNumMatch = contextWindowSnippet.match(WO_VALUE_FALLBACK_PATTERN);
                    if (fallbackNumMatch) {
                      const cleanedFallback = fallbackNumMatch[0].replace(/\s+/g, '');
                      if (cleanedFallback.replace(/[^0-9]/g, '').length >= WO_VALUE_MIN_DIGIT_LENGTH) {
                        currentRecord.woValue = '₹ ' + cleanedFallback.trim();
                      }
                    }
                  }
                }
              }
            }

            if (currentRecord.ministry === 'Not Found') {
              const ministryMatch =
                pageStr.match(MINISTRY_PATTERNS[0]) ||
                pageStr.match(MINISTRY_PATTERNS[1]) ||
                pageStr.match(MINISTRY_PATTERNS[2]);

              if (ministryMatch && ministryMatch[1]) {
                currentRecord.ministry = 'Ministry of ' + ministryMatch[1].trim();
              } else {
                const orgMatch = pageStr.match(ORGANISATION_NAME_PATTERN);
                if (orgMatch && orgMatch[1] && !/Not Found/i.test(orgMatch[1])) {
                  currentRecord.ministry = orgMatch[1].trim();
                } else {
                  const matchedKeywordRule = MINISTRY_KEYWORD_RULES.find((rule) => rule.pattern.test(pageStr));
                  if (matchedKeywordRule) currentRecord.ministry = matchedKeywordRule.ministry;
                }
              }
            }
          }
        }

        if (currentRecord) localRecords.push(currentRecord);

        if (localRecords.length === 0) {
          localRecords.push({
            id: `test-rec-${Date.now()}-fallback`,
            createdAt: Date.now(),
            woNumber: 'Not Found',
            woValue: 'Not Found',
            date: 'Not Found',
            ministry: 'Not Found',
            fileName: selectedFile.name,
            pageIndex: 1,
            vendorFolder: 'Test Vendor',
          });
        }
      }

      const formattedRecords = localRecords.map((record) => {
        const displayWoValue = formatIndianCurrency(record.woValue);
        const displayDate = formatDateDisplay(record.date);

        const woNumberClause = isIOCLDocument
          ? 'IOCL Purchase Order Pattern (3xxxxxxxxx / 45xxxxxxxxx)'
          : 'GeM Contract No. Regex Pattern (GEM/...)';

        const woValueClause = isIOCLDocument
          ? 'IOCL Order Value Pattern (With GST)'
          : 'Tier 1 / Tier 2 Total Contract Value Clause';

        const dateClause = isIOCLDocument
          ? 'IOCL Order Date / Dated Anchor Search'
          : 'GeM Generated Date / Date Label Anchor Regex';

        const ministryClause = isIOCLDocument
          ? 'IOCL Haldia Refinery Default Ministry Rule'
          : 'Ministry Name Pattern (Ministry of ...) / Organisation Rule';

        return {
          ...record,
          rawWoNumber: record.woNumber,
          rawWoValue: record.woValue,
          rawDate: record.date,
          rawMinistry: record.ministry,
          woValue: displayWoValue,
          date: displayDate,
          dateVerified: verifyDateAfterCutoff(record.date),
          ministryVerified: verifyMinistryDepartment(record.ministry),
          completionCertificate: 'No',
          recommendation: 'No',
          clauseInfo: {
            woNumber: {
              label: 'WO / Contract Number',
              clause: woNumberClause,
              value: record.woNumber,
              raw: record.woNumber,
            },
            woValue: {
              label: 'WO / Contract Value',
              clause: woValueClause,
              value: displayWoValue,
              raw: record.woValue,
            },
            date: {
              label: 'Date & Cutoff Check',
              clause: dateClause,
              value: displayDate,
              raw: record.date,
            },
            ministry: {
              label: 'Ministry / Organisation',
              clause: ministryClause,
              value: record.ministry,
              raw: record.ministry,
            },
          },
        };
      });

      setExtractedRecords(formattedRecords);
      setSelectedRecordIndex(0);
      const duration = Math.round(performance.now() - startTime);
      setProcessingTimeMs(duration);
    } catch (err) {
      console.error('Advanced Testing PDF Extraction failed:', err);
      alert('Failed to extract PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      processSinglePdf(selected);
    } else if (selected) {
      alert('Please select a valid PDF file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type === 'application/pdf') {
      processSinglePdf(dropped);
    } else if (dropped) {
      alert('Please drop a valid PDF file.');
    }
  };

  const currentRecord = extractedRecords[selectedRecordIndex] || null;

  const numericVal = currentRecord ? parseCurrencyToNumber(currentRecord.woValue) : null;
  const ruleResult = evaluateRuleCheck(numericVal !== null ? [numericVal] : []);

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* Page Title & Context Header */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#003874]/10 dark:bg-blue-950/60 text-[#003874] dark:text-blue-400 flex items-center justify-center shrink-0">
              <FlaskConical size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Advanced Testing & Diagnostic Suite</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#003874] text-white uppercase tracking-wider">
                  Single PDF
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shadow-xs">
                  <Sparkles size={11} className="text-purple-500" />
                  <span>Portal AI Fallback: <strong>{formatAiModelName(aiModel)}</strong></span>
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Upload a single PDF document to inspect the PDF parsing, regex pattern matching, and rule evaluation engine in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#003874] hover:bg-[#002855] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>Select PDF File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Drag & Drop Area if no file loaded */}
      {!file && !isProcessing && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#003874] dark:hover:border-blue-500 bg-white dark:bg-gray-900 rounded-2xl p-12 text-center cursor-pointer transition duration-200 space-y-4"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 flex items-center justify-center">
            <UploadCloud size={32} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 dark:text-gray-200">
              Drag and drop a single PDF document here
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Supports IOCL Haldia Refinery Work Orders or standard GeM Contract PDFs (Up to 50MB)
            </p>
          </div>
          <button
            type="button"
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition"
          >
            <FileText size={16} />
            <span>Browse Local Drive</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {isProcessing && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-200 dark:border-gray-800 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#003874] border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Parsing PDF & Executing Patterns...</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Extracting text layout, applying detection heuristics, and evaluating rule check thresholds.
            </p>
          </div>
        </div>
      )}

      {/* Main Results View */}
      {file && !isProcessing && currentRecord && (
        <div className="space-y-6">
          {/* File Overview Bar */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FileText size={20} className="text-[#003874] dark:text-blue-400" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Size: {(file.size / 1024).toFixed(1)} KB • Pages: {extractedPages.length} • Format: <span className="font-semibold text-gray-700 dark:text-gray-300">{docType}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                <Sparkles size={14} />
                Processed in {processingTimeMs} ms
              </span>
            </div>
          </div>

          {/* Multiple Contract Records Selector if multi-record */}
          {extractedRecords.length > 1 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Layers size={16} />
                Multiple contract records detected in this PDF ({extractedRecords.length}):
              </span>
              <div className="flex gap-2">
                {extractedRecords.map((rec, idx) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => handleSelectRecord(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      selectedRecordIndex === idx
                        ? 'bg-amber-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Record #{idx + 1} (Pg {rec.pageIndex})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4 Extraction Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* WO Number */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                WO / Contract Number
              </span>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                {currentRecord.woNumber}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {currentRecord.woNumber !== 'Not Found' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Extracted
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <XCircle size={12} /> Not Found
                  </span>
                )}
              </div>
            </div>

            {/* WO Value */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                WO Value (INR)
              </span>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                {currentRecord.woValue}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {currentRecord.woValue !== 'Not Found' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Format Validated
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <XCircle size={12} /> Missing Value
                  </span>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Date & Cutoff Check
              </span>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                {currentRecord.date}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {currentRecord.dateVerified === 'Yes' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Post-Cutoff (Pass)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> Pre-Cutoff / Failed
                  </span>
                )}
              </div>
            </div>

            {/* Ministry */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Ministry / Organisation
              </span>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate" title={currentRecord.ministry}>
                {currentRecord.ministry}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {currentRecord.ministryVerified === 'Yes' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Refinery Approved
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <XCircle size={12} /> Unverified Org
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Side-by-Side Resizable Split View: PDF Viewer + Diagnostic Inspector */}
          <div
            ref={splitContainerRef}
            className="relative flex flex-col lg:flex-row w-full h-[calc(100vh-220px)] min-h-[550px] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm select-none"
          >
            {/* Overlay to prevent iframe capturing mouse events while resizing */}
            {isResizing && <div className="absolute inset-0 z-50 cursor-col-resize" />}

            {/* Left Section: PDF Viewer */}
            <div
              style={{ width: `${splitRatio}%` }}
              className="h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900 shrink-0"
            >
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 truncate">
                  <Eye size={15} className="text-[#003874] dark:text-blue-400 shrink-0" />
                  Live PDF Document Preview (Page {selectedPageIdx} of {extractedPages.length || 1})
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {extractedPages.length > 1 && (
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleSelectPage(Math.max(1, selectedPageIdx - 1))}
                        disabled={selectedPageIdx <= 1}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] font-bold px-1 text-gray-700 dark:text-gray-300">
                        {selectedPageIdx} / {extractedPages.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectPage(Math.min(extractedPages.length, selectedPageIdx + 1))}
                        disabled={selectedPageIdx >= extractedPages.length}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#003874] dark:text-blue-400 hover:underline flex items-center gap-1 ml-1"
                    >
                      <span>Open Full tab</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-950 relative h-full overflow-hidden">
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#page=${selectedPageIdx || currentRecord.pageIndex || 1}`}
                    className="w-full h-full border-0"
                    title="PDF Extraction Test Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    No PDF loaded
                  </div>
                )}
              </div>
            </div>

            {/* Sliding Resizer Handle */}
            <div
              onMouseDown={handleMouseDown}
              className="w-3 bg-gray-200 dark:bg-gray-800 hover:bg-orange-500 dark:hover:bg-orange-500 cursor-col-resize flex items-center justify-center transition-colors group shrink-0 z-10"
              title="Drag left or right to adjust panel widths"
            >
              <div className="h-10 w-1 bg-gray-400 dark:bg-gray-600 rounded-full group-hover:bg-white flex items-center justify-center">
                <GripVertical size={12} className="text-gray-500 group-hover:text-white shrink-0" />
              </div>
            </div>

            {/* Right Section: Inspection Tabs */}
            <div
              style={{ width: `${100 - splitRatio}%` }}
              className="h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900 shrink-0"
            >
              {/* Tab Nav Header */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeTab === 'summary'
                      ? 'bg-white dark:bg-gray-900 text-[#003874] dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck size={14} className="inline mr-1" />
                  Verification Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeTab === 'text'
                      ? 'bg-white dark:bg-gray-900 text-[#003874] dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileCheck2 size={14} className="inline mr-1" />
                  Raw Text ({extractedPages.length} Pgs)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('extracted-text')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeTab === 'extracted-text'
                      ? 'bg-white dark:bg-gray-900 text-[#003874] dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <AlignLeft size={14} className="inline mr-1" />
                  Extracted Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeTab === 'json'
                      ? 'bg-white dark:bg-gray-900 text-[#003874] dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Code size={14} className="inline mr-1" />
                  JSON Structure
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {/* TAB 1: Verification Rules */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Rule Verification Matrix
                    </h3>

                    <div className="space-y-3">
                      {/* Rule 1: Date Check */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Rule 1: Cutoff Date Verification
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              currentRecord.dateVerified === 'Yes'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {currentRecord.dateVerified === 'Yes' ? 'PASSED (>= 01-Jun-2019)' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Extracted Date: <strong className="text-gray-800 dark:text-gray-200">{currentRecord.date}</strong>
                        </p>
                      </div>

                      {/* Rule 2: Ministry Check */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Rule 2: Petroleum/Refinery Ministry Match
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              currentRecord.ministryVerified === 'Yes'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {currentRecord.ministryVerified === 'Yes' ? 'PASSED (Refinery Approved)' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Ministry / Org: <strong className="text-gray-800 dark:text-gray-200">{currentRecord.ministry}</strong>
                        </p>
                      </div>

                      {/* Rule 3: WO Value Tiers (R1, R2, R3) */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Rule 3: Value Tier Eligibility
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#003874]/10 text-[#003874] dark:bg-blue-950 dark:text-blue-300">
                            R1({ruleResult.R1 ? 'Yes' : 'No'}) R2({ruleResult.R2 ? 'Yes' : 'No'}) R3({ruleResult.R3 ? 'Yes' : 'No'})
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="block font-bold text-gray-700 dark:text-gray-300">R1 (&gt; ₹4.22L)</span>
                            <span className={`font-black ${ruleResult.R1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {ruleResult.R1 ? 'Eligible' : 'Below'}
                            </span>
                          </div>
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="block font-bold text-gray-700 dark:text-gray-300">R2 (&gt; ₹5.62L)</span>
                            <span className={`font-black ${ruleResult.R2 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {ruleResult.R2 ? 'Eligible' : 'Below'}
                            </span>
                          </div>
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="block font-bold text-gray-700 dark:text-gray-300">R3 (&gt; ₹7.20L)</span>
                            <span className={`font-black ${ruleResult.R3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {ruleResult.R3 ? 'Eligible' : 'Below'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Raw Text Inspector */}
                {activeTab === 'text' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {extractedPages.map((p) => (
                          <button
                            key={p.pageIndex}
                            type="button"
                            onClick={() => handleSelectPage(p.pageIndex)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                              selectedPageIdx === p.pageIndex
                                ? 'bg-[#003874] text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            Pg {p.pageIndex}
                          </button>
                        ))}
                      </div>

                      <div className="relative shrink-0 w-36">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter text..."
                          value={textSearch}
                          onChange={(e) => setTextSearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-[11px] border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Extraction Legend */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold bg-gray-950 p-2 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Extracted Highlights:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                        🟢 WO Number
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 border border-cyan-500/40">
                        🔵 Date
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                        🟡 WO Value
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40">
                        🟣 Ministry
                      </span>
                      {textSearch && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-gray-950 font-bold">
                          ⚡ Search Filter
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs font-mono overflow-x-auto h-[350px] leading-relaxed select-all whitespace-pre-wrap break-words">
                      {renderHighlightedText(
                        extractedPages.find((p) => p.pageIndex === selectedPageIdx)?.text,
                        currentRecord,
                        textSearch
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Extracted Text (Clause - Picked Value) */}
                {activeTab === 'extracted-text' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Exact Extraction Clauses & Picked Values
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#003874] dark:text-blue-300">
                        Record #{selectedRecordIndex + 1} (Page {currentRecord.pageIndex})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {currentRecord.clauseInfo &&
                        Object.entries(currentRecord.clauseInfo).map(([key, item]) => (
                          <div
                            key={key}
                            className="p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#003874] dark:text-blue-400 uppercase tracking-wide">
                                {item.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.value && item.value !== 'Not Found'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                }`}
                              >
                                {item.value && item.value !== 'Not Found' ? 'Extracted' : 'Not Found'}
                              </span>
                            </div>

                            {/* Format: Exact Clause Used - Picked Value */}
                            <div className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono leading-relaxed flex flex-wrap items-center justify-between gap-2 shadow-inner">
                              <div className="break-all flex-1">
                                <span className="text-yellow-300 font-semibold">{item.clause}</span>
                                <span className="text-gray-400 font-bold mx-2.5">-</span>
                                <span className="text-emerald-300 font-bold">{item.value}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${item.clause} - ${item.value}`);
                                }}
                                className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded shrink-0 transition cursor-pointer"
                                title="Copy clause and picked value"
                              >
                                Copy
                              </button>
                            </div>

                            {item.raw && item.raw !== item.value && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-1">
                                Raw match string: <code className="bg-gray-200 dark:bg-gray-900 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">{item.raw}</code>
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: JSON Output */}
                {activeTab === 'json' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Extracted Data Payload
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(JSON.stringify(currentRecord, null, 2))}
                        className="flex items-center gap-1 text-xs font-semibold text-[#003874] dark:text-blue-400 hover:underline"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="bg-gray-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto h-[420px]">
                      {JSON.stringify(currentRecord, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
