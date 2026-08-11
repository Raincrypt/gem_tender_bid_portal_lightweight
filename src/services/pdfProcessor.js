import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

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

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const MONTH_ABBR = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses raw extracted date string into a JS Date object.
 */
export const parseExtractedDate = (dateStr) => {
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

/**
 * Verifies if an extracted date is on or after the rule cutoff.
 */
export const verifyDateAfterCutoff = (dateStr) => {
  const parsed = parseExtractedDate(dateStr);
  if (!parsed) return 'No';
  return parsed >= DATE_VERIFICATION_CUTOFF ? 'Yes' : 'No';
};

/**
 * Checks whether an extracted ministry matches valid keywords.
 */
export const verifyMinistryDepartment = (ministryStr) => {
  if (!ministryStr || ministryStr === 'Not Found') return 'No';
  const normalized = ministryStr.trim().toLowerCase();

  if (VALID_MINISTRIES.some((m) => m.trim().toLowerCase() === normalized)) return 'Yes';
  if (VALID_MINISTRY_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()))) return 'Yes';

  return 'No';
};

/**
 * Formats a raw numeric/string value to standard Indian Currency representation.
 */
export const formatIndianCurrency = (valueStr) => {
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

/**
 * Formats date display based on standard format.
 */
export const formatDateDisplay = (dateStr) => {
  if (!dateStr || dateStr === 'Not Found') return dateStr;
  const parsed = parseExtractedDate(dateStr);
  if (!parsed) return dateStr;
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return DATE_DISPLAY_FORMAT.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);
};

export const formatDateObject = (dateObj) => {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return DATE_DISPLAY_FORMAT.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);
};

export const parseCurrencyToNumber = (valueStr) => {
  if (!valueStr || valueStr === 'Not Found') return null;
  const cleaned = valueStr.toString().replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

export const evaluateRuleCheck = (values) => {
  const result = { satisfied: false };
  RULE_CHECK_TIERS.forEach((tier) => {
    const meetsTier = values.filter((v) => v > tier.threshold).length >= tier.minCount;
    result[tier.id] = meetsTier;
    if (meetsTier) result.satisfied = true;
  });
  return result;
};

export const computeRuleCheckByVendor = (data) => {
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

export const computeVendorSerialNumbers = (data) => {
  const serials = [];
  let currentKey = null;
  let counter = 0;
  data.forEach((row) => {
    const key = row.vendorFolder && row.vendorFolder.trim() !== '' ? row.vendorFolder : 'Uncategorized Vendor';
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

export const groupRowsByVendor = (data) => {
  const groups = new Map();
  data.forEach((row) => {
    const key = row.vendorFolder && row.vendorFolder.trim() !== '' ? row.vendorFolder : 'Uncategorized Vendor';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, vendorFolder: key });
  });
  return Array.from(groups.values()).flat();
};

export const sortExtractedData = (data) => {
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

/**
 * Extracts page text arrays from a PDF File object using PDF.js
 */
export async function extractPdfPagesText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;

  const pagesData = [];
  let globalText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();

    pagesData.push({ pageIndex: i, text: pageText });
    globalText += ' ' + pageText;
    page.cleanup();
  }

  return { numPages: pdf.numPages, pagesData, globalText: globalText.trim() };
}

/**
 * Extracts a page range from a PDF Blob URL using pdf-lib
 */
export async function extractPagesFromPdf(blobUrl, startPage, endPage) {
  try {
    const response = await fetch(blobUrl);
    const existingPdfBytes = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const from = Math.max(1, startPage) - 1; // 0-based
    const to = Math.min(totalPages, endPage) - 1;

    if (from > to || from >= totalPages || to < 0) {
      throw new Error('Invalid page range');
    }

    const pageIndices = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to extract page range:', error);
    return null;
  }
}

/**
 * Extracts raw records from parsed page text array.
 * Throws an Error if preconditions are not met.
 * 
 * @param {Array<{pageIndex: number, text: string}>} pagesData - Array of page texts
 * @param {string} fileName - Name of the PDF file
 * @param {string} globalText - Full combined text of the PDF
 * @param {Function} [aiFallbackFn] - Optional async callback to resolve AI fallbacks
 */
export async function extractRecordsFromPages(pagesData, fileName, globalText, aiFallbackFn = null) {
  if (!pagesData || !Array.isArray(pagesData)) {
    throw new Error('Invalid input: pagesData must be an array.');
  }
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid input: fileName must be a string.');
  }
  if (typeof globalText !== 'string') {
    throw new Error('Invalid input: globalText must be a string.');
  }

  const isIOCLDocument =
    globalText.includes(IOCL_DETECTION_MARKERS[0]) ||
    globalText.includes(IOCL_DETECTION_MARKERS[1]) ||
    (globalText.includes(IOCL_WORK_ORDER_MARKER) && !globalText.includes(IOCL_GEMC_EXCLUSION_MARKER));

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
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      woNumber,
      woValue,
      date,
      ministry,
      fileName,
      pageIndex: 1,
    });
  } else {
    let currentRecord = null;

    for (let pageObj of pagesData) {
      const pageIndex = pageObj.pageIndex || pageObj.index || 1;
      const pageStr = pageObj.text || '';
      const isNewContractStart = NEW_CONTRACT_START_PATTERN.test(pageStr);

      if (isNewContractStart || (!currentRecord && localRecords.length === 0)) {
        if (currentRecord) localRecords.push(currentRecord);

        currentRecord = {
          id: `rec-${Date.now()}-${pageIndex}-${Math.random().toString(36).substr(2, 6)}`,
          createdAt: Date.now() + pageIndex,
          woNumber: 'Not Found',
          woValue: 'Not Found',
          date: 'Not Found',
          ministry: 'Not Found',
          fileName,
          pageIndex,
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
            currentRecord.woNumber = extractedWo
              .replace(WO_NUMBER_LABEL_STRIP_PATTERN, '')
              .trim();
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

        if (currentRecord.woNumber === 'Not Found' && currentRecord.woValue === 'Not Found') {
          if (aiFallbackFn) {
            const aiResult = await aiFallbackFn(pageStr);
            if (aiResult) {
              if (currentRecord.woNumber === 'Not Found' && aiResult.woNumber)
                currentRecord.woNumber = aiResult.woNumber;
              if (currentRecord.woValue === 'Not Found' && aiResult.woValue)
                currentRecord.woValue = aiResult.woValue;
              if (currentRecord.date === 'Not Found' && aiResult.date) currentRecord.date = aiResult.date;
              if (currentRecord.ministry === 'Not Found' && aiResult.ministry)
                currentRecord.ministry = aiResult.ministry;
            }
          }
        }
      }
    }

    if (currentRecord) localRecords.push(currentRecord);

    if (localRecords.length === 0) {
      if (aiFallbackFn) {
        const aiResult = await aiFallbackFn(globalText);
        if (aiResult) {
          localRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            createdAt: Date.now(),
            woNumber: aiResult.woNumber || 'Not Found',
            woValue: aiResult.woValue || 'Not Found',
            date: aiResult.date || 'Not Found',
            ministry: aiResult.ministry || 'Not Found',
            fileName,
            pageIndex: 1,
          });
        }
      }
    }
  }

  // Deduplicate records to find the best candidate for each unique WO Number on the same page
  const fieldScore = (r) =>
    ['woNumber', 'woValue', 'date', 'ministry'].filter((f) => r[f] && r[f] !== 'Not Found').length;

  const bestByWo = new Map();
  localRecords.forEach((record) => {
    const key =
      record.woNumber !== 'Not Found' ? `${record.woNumber}-p${record.pageIndex}` : record.id;

    if (!bestByWo.has(key) || fieldScore(record) > fieldScore(bestByWo.get(key))) {
      bestByWo.set(key, record);
    }
  });

  localRecords = Array.from(bestByWo.values());

  return { isIOCLDocument, localRecords };
}
