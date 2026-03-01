/**
 * Main function to update schedules with show planning data.
 * 
 * Execution Flow:
 * 1. Configuration: Reads active schedule range from Config sheet and raw data from Integration sheet.
 * 2. Strict Validation: VALIDATES ALL rows first. If ANY row is invalid (missing IDs, bad dates), 
 *    it aborts immediately and writes errors to the user-facing sheet.
 * 3. Grouping: Groups valid rows by Schedule ID.
 * 4. Processing Strategy:
 *    - Process all selected schedules (`schedules!L = TRUE`) per iteration.
 *    - Continue on per-schedule failures so reruns can resume from partial progress.
 * 5. Optimistic Versioning: 
 *    - Reads initial versions from 'schedules' sheet.
 *    - Attempts to update via API (PATCH).
 *    - If API returns 409 (Version Mismatch), validates against server by fetching the latest version and RETRIES.
 * 6. Feedback: 
 *    - Marks rows as 'Synced' or 'Error' in the planning sheet.
 *    - Updates the 'schedules' sheet with the next version on success.
 * 7. Orphan Check: Scans selected schedules (Column L = true) that were NOT present in the
 *    planning data and marks them with a "No shows found" warning.
 */
function updateShowBySchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  if (!targetSheet) {
    Logger.log(`Target sheet '${TARGET_SHEET_NAME}' not found.`);
    return;
  }

  // Get ALL Data from Source Sheet (Integration Sheet)
  // Assuming Row 1 is header, data starts from Row 2
  const lastRow = sourceSheet.getLastRow();
  const lastCol = sourceSheet.getLastColumn();
  let rawData = [];
  if (lastRow >= 2) {
    rawData = sourceSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  }

  // 1. Validation (Strict Pre-flight)
  // Cleanup any "stale" status rows beyond the current data range (e.g. deleted rows)
  cleanupStaleRows(targetSheet, rawData.length);

  const validationErrors = validateRows(rawData);
  // If ANY error exists, deny the whole process
  if (Object.keys(validationErrors).length > 0) {
    Logger.log('Validation failed (Strict Mode). Writing errors and aborting...');
    writeValidationErrors(targetSheet, validationErrors, rawData.length); 
    return;
  }

  // 2. Parse & Group Data
  Logger.log('Validation passed. Processing schedules...');
  
  // Read current versions and metadata from Schedules Sheet (Source of Truth)
  const scheduleDefinitions = getScheduleDefinitions(schedulesSheet);
  const selectedScheduleIds = getSelectedScheduleIds(schedulesSheet);
  if (selectedScheduleIds.size === 0) {
    Logger.log('No schedules selected in Column L (active_schedule=true). Update skipped.');
    return;
  }

  const schedules = processSchedulesFromRows(
    rawData,
    scheduleDefinitions,
    selectedScheduleIds,
  );

  // 3. Process each selected schedule
  const processedIds = new Set();

  schedules.forEach(schedule => {
    processSingleSchedule(schedule, { targetSheet, schedulesSheet });
    processedIds.add(schedule.scheduleId);
  });
  
  // 4. Handle selected schedules that have no shows in planning data
  handleEmptySchedules(schedulesSheet, processedIds, selectedScheduleIds);
}

function handleEmptySchedules(schedulesSheet, processedIds, selectedScheduleIds) {
  const selectedRows = getSelectedScheduleRows(schedulesSheet);
  selectedRows.forEach(({ sheetRow, scheduleId }) => {
    if (selectedScheduleIds.has(scheduleId) && !processedIds.has(scheduleId)) {
      schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue('Warning: No shows found in planning');
    }
  });
}

function processSingleSchedule(schedule, { targetSheet, schedulesSheet }) {
  const { scheduleId, payload, version, rowIndices } = schedule;

  if (!payload.plan_document.shows.length) {
    Logger.log(`Skipping Schedule ${scheduleId}: No shows.`);
    return;
  }

  try {
    const runUpdate = (ver) => {
       const apiPayload = { ...payload, version: ver };
       const resRaw = updateSchedule(scheduleId, apiPayload);
       const res = JSON.parse(resRaw);
       if (res.error || (res.statusCode && res.statusCode >= 400)) {
         // Enhance error object with status code if missing/embedded
         const err = new Error(res.message || JSON.stringify(res));
         err.statusCode = res.statusCode || (res.error_code === 'CONFLICT' ? 409 : 500); 
         // Check for generic 409 or explicit CONFLICT code
         if (res.error_code === 'CONFLICT' || res.message?.includes('Version mismatch')) {
            err.statusCode = 409;
         }
         throw err;
       }
       return res;
    };

    let finalVersion = version;
    try {
      // Attempt 1: Use Sheet Version
      Logger.log(`Updating Schedule ${scheduleId} (v${version})...`);
      runUpdate(version);
    } catch (e) {
      if (e.statusCode === 409) {
        Logger.log(`Version Mismatch for ${scheduleId}. Fetching latest...`);
        // Retry: Fetch latest version
        const currentSchedule = getSchedule(scheduleId);
        if (currentSchedule && typeof currentSchedule.version === 'number') {
           finalVersion = currentSchedule.version;
           Logger.log(`Retrying ${scheduleId} with v${finalVersion}...`);
           runUpdate(finalVersion);
        } else {
           throw new Error("Could not fetch latest version for retry.");
        }
      } else {
        throw e; // Rethrow other errors
      }
    }

    // Success Updates
    markRowsSuccess(targetSheet, rowIndices);
    // Write back the NEXT version (current + 1) to the sheet
    updateParentScheduleSheet(schedulesSheet, scheduleId, finalVersion + 1);

  } catch (err) {
    Logger.log(`Failed Schedule ${scheduleId}: ${err.message}`);
    markRowsError(targetSheet, rowIndices, `[Schedule Error] ${err.message}`);
  }
}

// --- Data Processing Implementations ---

function processSchedulesFromRows(rows, scheduleDefinitions, selectedScheduleIds) {
  const groups = {};
  const platformMap = getPlatformMap();

  rows.forEach((row, index) => {
    // 1: schedule_id (Col B)
    const scheduleId = row[1] ? row[1].toString().trim() : '';
    if (!selectedScheduleIds.has(scheduleId)) return;
    
    // Version Lookup
    const def = scheduleDefinitions[scheduleId];
    const sheetVersion = def ? def.version : null;
    
    if (!groups[scheduleId]) {
      groups[scheduleId] = {
        scheduleId,
        rows: [],
        rawVersion: sheetVersion !== undefined ? sheetVersion : row[17], // Prefer map, fallback to row
        client: row[6],
        rawDate: row[3],
      };
    }
    groups[scheduleId].rows.push({ row, index });
  });

  return Object.values(groups).map(group => buildSchedulePayload(group, platformMap, scheduleDefinitions));
}

function buildSchedulePayload(group, platformMap, scheduleDefinitions) {
  const { scheduleId, rows, rawVersion, client, rawDate } = group;

  // 1. Determine Version & Metadata from Source of Truth
  let version = 1;
  let definedStart = null;
  let definedEnd = null;
  
  const def = scheduleDefinitions[scheduleId];
  if (def) {
     version = def.version;
     definedStart = def.startDate;
     definedEnd = def.endDate;
  } else if (rawVersion !== '' && rawVersion != null) {
      // Fallback if not in sheet but in row (unlikely for valid flow)
      const parsed = parseInt(rawVersion, 10);
      if (!isNaN(parsed)) version = parsed;
  }

  // 2. Determine Name (fallback logic)
  const d = rawDate ? new Date(rawDate) : new Date();
  const monthName = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const scheduleName = `${client} - ${monthName} ${year}`;
  
  // 3. Process Shows & Date Ranges
  // Note: We still calculate min/max of shows just in case, or if we want to fallback (though we prefer defined dates)
  let minDate = d;
  let maxDate = d;
  const shows = [];
  const rowIndices = [];

  rows.forEach(({ row, index }) => {
    // index is relative to rawData array (0-based)
    // we want absolute row index for the Sheet operations
    // rowIndices will store 0-based index relative to the START of the data range (not the sheet)
    // The consumer (markRowsSuccess) adds the getStartRowOffset().
    rowIndices.push(index); // This is correct if getStartRowOffset() returns 2 and index 0 is Row 2.
    const show = parseShowFromRow(row, platformMap);

    if (!show) return; // Should catch in validation, but safety check

    shows.push(show.data);

    // Date Range Logic
    if (show.dates.start) {
      if (show.dates.start < minDate) minDate = show.dates.start;
      // Note: Logic in original was checking date < existing min. 
      // If minDate init is "now", we might miss earlier dates? 
      // Original logic init with "date ? date : now". 
      // We'll stick to updating if we find valid dates.
    }
    if (show.dates.end) {
       if (show.dates.end > maxDate) maxDate = show.dates.end;
    }
  });

  // Determine final Start/End Dates
  // Priority: Schedules Sheet Definition > Calculated from Shows
  // Ensure we format as ISOString
  const finalStartDate = (definedStart && isValidDate(definedStart)) ? definedStart : minDate;
  const finalEndDate = (definedEnd && isValidDate(definedEnd)) ? definedEnd : maxDate;

  return {
    scheduleId,
    version,
    rowIndices,
    payload: {
      name: scheduleName,
      start_date: finalStartDate.toISOString(),
      end_date: finalEndDate.toISOString(),
      status: 'draft',
      client_id: client,
      created_by: GOOGLE_SHEET_USER_ID,
      plan_document: { shows }
    }
  };
}

function isValidDate(d) {
  return d && Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d.getTime());
}

function parseShowFromRow(row, platformMap) {
  const [
    master_plan_id,
    schedule_id,
    show_id,
    date,
    start_time,
    end_time,
    client,
    platforms,
    show_standard,
    show_type,
    shopee_ticket_id,
    lazada_ticket_id,
    tiktok_ticket_id,
    show_status,
    studio_rooms,
    mcs,
    note
  ] = row;

  // Time Parsing
  const { startAt, endAt } = parseTimeRange(date, start_time, end_time);

  // Platform Parsing
  const platformList = parsePlatforms({
    platformsStr: platforms, 
    platformMap, 
    ids: { tiktok: tiktok_ticket_id, shopee: shopee_ticket_id, lazada: lazada_ticket_id }
  });

  // Parse Lists (MC)
  const parseList = (str) => {
    if (!str) return [];
    return str.toString().split(',').map(s => s.trim()).filter(Boolean);
  };

  const mcList = parseList(mcs).map(uid => ({ mcId: uid }));
  
  // Helper to resolve UID from Map (Name -> UID) or use raw if it looks like a UID
  const resolveValue = (raw, map, defaultUid) => {
    if (!raw) return defaultUid;
    const str = raw.toString().trim();
    // Invert the map: Key=UID, Value=Name (from Constants) -> we need Name -> UID
    // Actually Constants are UID -> Name. 
    // If input is Name (e.g. "bau"), we need to find key where value == "bau".
    // If input is UID, we return it.
    
    // Check if it's already a UID (starts with prefix or matches key)
    if (map[str] !== undefined) return str; // It's a UID in the keys
    
    // Try to find by Value (Name)
    const lowerInput = str.toLowerCase();
    const foundEntry = Object.entries(map).find(([key, name]) => name.toLowerCase() === lowerInput);
    if (foundEntry) return foundEntry[0]; // Return UID
    
    return defaultUid;
  };

  const showTypeId = resolveValue(show_type, SHOW_TYPES, DEFAULTS.SHOW_TYPE_UID);
  const showStatusId = resolveValue(show_status, SHOW_STATUSES, DEFAULTS.SHOW_STATUS_UID);
  const showStandardId = resolveValue(show_standard, SHOW_STANDARDS, DEFAULTS.SHOW_STANDARD_UID);
  const showStudioId = DEFAULTS.STUDIO_UID;
  
  // Studio Room: Nullable
  let studioRoomId = undefined;
  if (studio_rooms) {
     studioRoomId = resolveValue(studio_rooms, STUDIO_ROOMS, undefined);
     // If resolveValue returns undefined (no match/default), ensure it stays undefined
  }

  // Defaults
  const showItem = {
      tempId: show_id || undefined,
      external_id: show_id || undefined,
      name: `${show_id || 'Untitled'}`, 
      startTime: startAt ? startAt.toISOString() : null,
      endTime: endAt ? endAt.toISOString() : null,
      clientId: client,
      studioId: showStudioId,
      studioRoomId: studioRoomId,
      showTypeId: showTypeId,
      showStatusId: showStatusId,
      showStandardId: showStandardId,
      mcs: mcList,
      platforms: platformList, 
      metadata: { note: note || '' }, 
    };

  return {
    data: showItem,
    dates: { start: startAt, end: endAt }
  };
}

// --- Helpers ---

function getPlatformMap() {
  return Object.entries(PLATFORMS).reduce((acc, [uid, name]) => {
    acc[name.toLowerCase()] = uid; 
    acc[name] = uid;
    return acc;
  }, {});
}

function parseTimeRange(dateVal, startVal, endVal) {
   if (!dateVal || !startVal || !endVal) return { startAt: null, endAt: null };
   
   const parse = (v) => {
     if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v.getTime()) ? null : v;
     const d = new Date(v);
     return isNaN(d.getTime()) ? null : d;
   };

   const dateObj = parse(dateVal);
   const startObj = parse(startVal);
   const endObj = parse(endVal);

   if (!dateObj || !startObj) return { startAt: null, endAt: null };

   const startAt = new Date(dateObj);
   startAt.setHours(startObj.getHours(), startObj.getMinutes(), 0, 0);

   let endAt = null;
   if (endObj) {
     endAt = new Date(dateObj);
     endAt.setHours(endObj.getHours(), endObj.getMinutes(), 0, 0);
     if (endAt < startAt) {
       endAt.setDate(endAt.getDate() + 1); // Overnight
     }
   }

   return { startAt, endAt };
}

function parsePlatforms({ platformsStr, platformMap, ids }) {
  if (!platformsStr) return [];
  
  return platformsStr.toString().split(',')
    .map(p => p.trim()).filter(Boolean)
    .map(pName => {
      const lower = pName.toLowerCase();
      const uid = platformMap[lower];
      
      // Determine Ticket ID based on platform name OR UID
      let platformShowId = '';

      // Reverse lookup to find name from UID if possible (e.g. if input is 'plt_...')
      // platformMap has name->uid. We need uid->name.
      // Or just check if the UID belongs to a known platform type.
      
      // 1. Resolve effective UID
      const effectiveUid = uid || (pName.startsWith('plt_') ? pName : null);
      if (!effectiveUid) return null;

      // 2. Identify Platform Type (Name)
      // If we found it via name map, we know the name (pName).
      // If we found it via UID, we need to see which platform name maps to this UID.
      const resolvedName = Object.keys(platformMap).find(key => platformMap[key] === effectiveUid) || lower;
      
      // 3. Check types
      const isTiktok = resolvedName.includes('tiktok');
      const isShopee = resolvedName.includes('shopee');
      const isLazada = resolvedName.includes('lazada');

      if (isTiktok && ids.tiktok) platformShowId = ids.tiktok.toString();
      if (isShopee && ids.shopee) platformShowId = ids.shopee.toString();
      if (isLazada && ids.lazada) platformShowId = ids.lazada.toString();

      return {
        platformId: effectiveUid,
        ...(platformShowId && { platformShowId }),
      };
    })
    .filter(Boolean);
}

// --- Sheet Ops (Keep mostly same or minor cleanup) ---

function validateRows(rows) {
  const errors = {};
  const platformMap = getPlatformMap();
  
  rows.forEach((row, index) => {
    // Row indices:
    // 0: master_plan_id
    // 1: schedule_id
    // 2: show_id
    // 3: date
    // 4: start_time
    // 5: end_time
    // 6: client
    // 7: platforms
    // 8: show_standard
    // 9: show_type
    // 10: shopee_ticket_id
    // 11: lazada_ticket_id
    // 12: tiktok_ticket_id
    // 13: show_status
    // 14: studio_room
    // 15: mcs
    // 16: note
    
    const scheduleId = row[1] ? row[1].toString().trim() : '';
    const showId = row[2] ? row[2].toString().trim() : '';
    const client = row[6];
    const date = row[3];
    const start = row[4];
    const end = row[5];
    const platforms = row[7];
    const showStandard = row[8];
    const showType = row[9];
    const shopeeTicketId = row[10];
    const lazadaTicketId = row[11];
    const tiktokTicketId = row[12];
    const showStatus = row[13];
    const studioRoom = row[14];
    // const mcs = row[15];
    // const note = row[16];

    const isEmptyRow = !scheduleId && !showId && !client && !platforms && !date;
    if (isEmptyRow) return;

    const missing = [];
    if (!scheduleId) missing.push('Schedule ID');
    if (!showId) missing.push('Show ID');
    if (!client) missing.push('Client ID');
    if (!date) missing.push('Date');
    if (!start) missing.push('Start Time');
    if (!end) missing.push('End Time');
    
    if (missing.length > 0) {
      errors[index] = `Missing: ${missing.join(', ')}`;
      return; 
    }

    if (date && isNaN(new Date(date).getTime())) {
       errors[index] = 'Invalid Date';
       return;
    }

    // Validation:
    // 1. End Time cannot equal Start Time (0 duration). 
    // 2. We ALLOW End < Start (implies overnight show).
    if (start && end) {
      const startTime = new Date(start);
      const endTime = new Date(end);
      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
        // Compare time values normalized to same day
        const s = new Date(2000, 0, 1, startTime.getHours(), startTime.getMinutes(), 0);
        const e = new Date(2000, 0, 1, endTime.getHours(), endTime.getMinutes(), 0);
        
        if (e.getTime() === s.getTime()) {
           errors[index] = 'End Time cannot be same as Start Time';
           return;
        }
      }
    }

    if (platforms) {
       const parts = platforms.toString().split(',').map(p => p.trim()).filter(Boolean);
       const invalid = parts.filter(p => {
         // Must be valid UID from map or start with plt_
         const lower = p.toLowerCase();
         // Check if it's a known name key OR a plt_ ID
         return !platformMap[lower] && !p.startsWith('plt_');
       });
       if (invalid.length > 0) {
         errors[index] = `Invalid Platform(s): ${invalid.join(', ')}`;
       }
    }
  });
  
  return errors;
}

function writeValidationErrors(sheet, errors, totalRows) {
  const offset = getStartRowOffset();
  
  // [Cleanup] Clear Status/Error for all currently loaded planning rows first.
  // This ensures we don't leave stale "Synced" statuses next to "Validation Error" statuses,
  // which implies the whole batch failed.
  if (totalRows > 0) {
    // Cols S (19) and T (20). 2 columns.
    sheet.getRange(offset, COLS.STATUS, totalRows, 2).clearContent();
  }

  // Write new errors
  Object.entries(errors).forEach(([idx, msg]) => {
     const r = parseInt(idx) + offset;
     sheet.getRange(r, COLS.ERROR_MSG).setValue(msg);
     sheet.getRange(r, COLS.STATUS).setValue('Validation Error');
  });
  SpreadsheetApp.flush();
}

function cleanupStaleRows(sheet, currentDataRowCount) {
  const lastRow = sheet.getLastRow();
  const offset = getStartRowOffset();
  const lastDataRow = offset + currentDataRowCount - 1; // e.g. Start 2, Count 1 -> Last Row 2.

  if (lastRow > lastDataRow) {
      const rowsToClear = lastRow - lastDataRow;
      // Clear Status and Error Msg columns for rows beyond data
      sheet.getRange(lastDataRow + 1, COLS.STATUS, rowsToClear, 2).clearContent();
      Logger.log(`Cleaned up ${rowsToClear} stale rows (beyond row ${lastDataRow}).`);
  }
}

function markRowsSuccess(sheet, rowIndices) {
  const offset = getStartRowOffset();
  rowIndices.forEach(idx => {
    const r = idx + offset;
    sheet.getRange(r, COLS.STATUS).setValue('Synced');
    sheet.getRange(r, COLS.ERROR_MSG).clearContent();
  });
  SpreadsheetApp.flush();
}

function markRowsError(sheet, rowIndices, msg) {
  const offset = getStartRowOffset();
  rowIndices.forEach(idx => {
    const r = idx + offset;
    sheet.getRange(r, COLS.STATUS).setValue('Error');
    sheet.getRange(r, COLS.ERROR_MSG).setValue(msg);
  });
  SpreadsheetApp.flush();
}

function updateParentScheduleSheet(schedulesSheet, scheduleId, newVersion) {
  const lastRow = schedulesSheet.getLastRow();
  // Read IDs (Col B is index 1 -> B2 is row 2, col 2)
  if (lastRow < 2) return; 

  const ids = schedulesSheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.findIndex(id => id === scheduleId);
  
  if (rowIndex !== -1) {
    const sheetRow = rowIndex + 2; 
    schedulesSheet.getRange(sheetRow, 7).setValue(newVersion); // Col G = 7
    // Update Status (Col D / 4) to 'draft'
    schedulesSheet.getRange(sheetRow, 4).setValue('draft');
    // Clear "No shows" warning if it exists (Col J / 10)
    schedulesSheet.getRange(sheetRow, 10).clearContent();
  }
}

function getStartRowOffset() {
   // Since we are now reading the whole sheet starting from Row 2:
   return 2;
}

function getSelectedScheduleIds(schedulesSheet) {
  const rows = getSelectedScheduleRows(schedulesSheet);
  const selected = new Set();
  rows.forEach(({ scheduleId }) => selected.add(scheduleId));
  return selected;
}

function getScheduleDefinitions(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  // We need ID (B), Start (E), End (F), Version (G).
  // B is col 2. G is col 7.
  // Range: Row 2, Col 2, (lastRow-1), 6  => Covers B, C, D, E, F, G
  // array indices: 0=B, 1=C, 2=D, 3=E, 4=F, 5=G
  const data = sheet.getRange(2, 2, lastRow - 1, 6).getValues(); 

  const map = {};
  data.forEach(row => {
    const id = row[0];
    if (id) {
       const cleanId = id.toString().trim();
       const v = parseInt(row[5], 10);
       map[cleanId] = {
         version: isNaN(v) ? 1 : v,
         startDate: row[3], // Col E
         endDate: row[4]    // Col F
       };
    }
  });
  return map;
}
