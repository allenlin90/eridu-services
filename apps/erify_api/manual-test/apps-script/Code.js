const START_ROW = 2;
const START_COLUMN = 'A';
const END_COLUMN = 'T'; // Extended to capture Status/Version columns
const SHEET_NAME = 'show_planning_integration';
const TARGET_SHEET_NAME = 'show_planning'; // User facing sheet

function updateShowBySchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sourceSheet = ss.getSheetByName(SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!targetSheet) {
    Logger.log(`Target sheet '${TARGET_SHEET_NAME}' not found.`);
    return;
  }

  const lastRow = sourceSheet.getLastRow();
  
  if (lastRow < START_ROW) {
    Logger.log('No data found');
    return;
  }

  const range = `${START_COLUMN}${START_ROW}:${END_COLUMN}${lastRow}`;
  const rawData = sourceSheet.getRange(range).getValues();

  // 0. Pre-flight Validation
  const validationErrors = validateRows(rawData);
  if (Object.keys(validationErrors).length > 0) {
    Logger.log('Validation failed. Writing errors to sheet...');
    writeValidationErrors(targetSheet, validationErrors); // Write to target
    return;
  }

  // 1. Create Store (User's pattern)
  const store = createUpdateSchedulesStore({ inputs: rawData });

  Logger.log('Store generated (Debug):');
  Logger.log(JSON.stringify(store, null, 2));

  // 2. Adapter: Transform Store to API Payload
  // Returns { payload: {...}, mapping: { schedule_id: [rowIndices] } }
  // We need the mapping to write back results to the correct rows
  const { payload, scheduleRowMapping } = adapterStoreToPayload(store);

  Logger.log('Payload for API:');
  Logger.log(JSON.stringify(payload, null, 2));

  if (!payload.schedules || payload.schedules.length === 0) {
    Logger.log('No valid schedules to update. Aborting API call.');
    return;
  }

  // 3. Call API with Chunking
  const CHUNK_SIZE = 1; // Strict limit to avoid 413
  const allResults = { results: [], successful_schedules: [] };
  const schedules = payload.schedules;
  
  for (let i = 0; i < schedules.length; i += CHUNK_SIZE) {
    const chunk = schedules.slice(i, i + CHUNK_SIZE);
    Logger.log(`Sending chunk ${i/CHUNK_SIZE + 1} of ${Math.ceil(schedules.length/CHUNK_SIZE)}...`);
    
    try {
      const responseJson = bulkUpdateSchedules({ schedules: chunk });
      const response = JSON.parse(responseJson);
      
      if (response.results) allResults.results.push(...response.results);
      if (response.successful_schedules) allResults.successful_schedules.push(...response.successful_schedules);
      
    } catch (e) {
      Logger.log(`Error sending chunk: ${e.message}`);
      // Create fake error results for this chunk's schedules so we can write back the error
      chunk.forEach(sch => {
        allResults.results.push({
           schedule_id: sch.schedule_id,
           success: false,
           error: `API Call Failed: ${e.message}`
        });
      });
    }
  }

  // 4. Process Response & Write Back
  writeBackResults(targetSheet, allResults, scheduleRowMapping); // Write to target
}

function validateRows(rows) {
  const errors = {};
  
  // Create Lookup Map (Name -> UID)
  const PLATFORM_NAME_TO_UID = Object.entries(PLATFORMS).reduce((acc, [uid, name]) => {
    acc[name.toLowerCase()] = uid; // normalize to lower case for check
    acc[name] = uid;
    return acc;
  }, {});
  
  rows.forEach((row, index) => {
    // Indices:
    // 0: master_plan_id
    // 1: schedule_id (Col B)
    // 6: client_id (Col G)
    // 7: platforms (Col H)
    const scheduleId = row[1];
    const clientId = row[6];
    const platforms = row[7];
    const showId = row[2]; 

    // Skip completely empty rows
    if (!showId && !scheduleId && !clientId && !platforms) return;

    const missingFields = [];
    if (!scheduleId) missingFields.push('Schedule ID');
    if (!clientId) missingFields.push('Client ID');
    
    if (missingFields.length > 0) {
      errors[index] = `Missing Data: ${missingFields.join(', ')} required`;
      return; // Stop checking this row if basic data missing
    }

    // Strict Platform Check
    if (platforms) {
      const platformNames = platforms.toString().split(',').map(p => p.trim()).filter(p => p);
      const invalidPlatforms = [];
      
      platformNames.forEach(pName => {
        const lowerName = pName.toLowerCase();
        // Check if name exists in map OR if it's already a UID (starts with plt_)
        if (!PLATFORM_NAME_TO_UID[lowerName] && !pName.startsWith('plt_')) {
          invalidPlatforms.push(pName);
        }
      });
      
      if (invalidPlatforms.length > 0) {
        errors[index] = `Values Error: Invalid Platform(s) '${invalidPlatforms.join(', ')}'`;
      }
    }
  });
  
  return errors;
}

function writeValidationErrors(sheet, errors) {
  // Batch write or individual? Individual for now as errors might be sparse
  Object.entries(errors).forEach(([rowIndex, message]) => {
     // Row Index from rawData (0-based) -> Sheet Row (1-based + START_ROW offset)
     // rawData started at START_ROW. 
     // e.g., START_ROW=2. Index 0 is Row 2.
     const sheetRow = parseInt(rowIndex) + START_ROW;
     sheet.getRange(sheetRow, COLS.ERROR_MSG).setValue(message);
     sheet.getRange(sheetRow, COLS.STATUS).setValue('Validation Error');
  });
  SpreadsheetApp.flush();
}

function writeBackResults(sheet, response, scheduleRowMapping) {
  // Response structure: { results: [ { schedule_id: "...", success: true, error: "..." } ], successful_schedules: [ { id: "...", version: 2 } ] }
  
  // Create a map for quick lookup of results and new versions
  const resultMap = {};
  
  if (response.results) {
    response.results.forEach(res => {
      resultMap[res.schedule_id] = { ...res };
    });
  }
  
  if (response.successful_schedules) {
    response.successful_schedules.forEach(sch => {
      if (resultMap[sch.id]) {
        resultMap[sch.id].new_version = sch.version;
      }
    });
  }

  // Batch updates for efficiency? 
  // For simplicity implementation, we'll iterate. For 1000 rows, batch is better.
  // Here we just write cell by cell or build a huge array.
  // Given we need to update discontinuous rows, individual writes or creating a full mapping array is needed.
  
  // Let's assume we want to update the Status (Col R), Version (Col S), Message (Col T)
  const data = sheet.getDataRange().getValues(); // Get all data to map row indices correctly
  // Note: scheduleRowMapping contains INDICES from the `inputs` array which started at START_ROW.
  // So Sheet Row = Index + START_ROW.

  Object.entries(scheduleRowMapping).forEach(([scheduleId, rowIndices]) => {
    const result = resultMap[scheduleId];
    if (!result) return;

    rowIndices.forEach(rowIndex => {
      const sheetRow = rowIndex + START_ROW;
      
      // Update Status column
      sheet.getRange(sheetRow, COLS.STATUS).setValue(result.success ? 'Success' : 'Error');
      
      // Update Version column if success
      if (result.success && result.new_version) {
        sheet.getRange(sheetRow, COLS.VERSION).setValue(result.new_version);
      }
      
      // Update Error Message
      if (!result.success && result.error) {
        sheet.getRange(sheetRow, COLS.ERROR_MSG).setValue(result.error);
      } else {
         sheet.getRange(sheetRow, COLS.ERROR_MSG).setValue('');
      }
    });
  });
  
  SpreadsheetApp.flush();
}


function createUpdateSchedulesStore({ inputs }) {
  const PLATFORM_NAME_TO_UID = Object.entries(PLATFORMS).reduce((acc, [uid, name]) => {
    acc[name] = uid;
    return acc;
  }, {});

  // We need to track which original rows belong to which schedule for write-back
  // Adding a hidden `_rowIndices` array to the store entries
  return inputs.reduce((store, row, index) => {
      const [
        master_plan_id, // A
        schedule_id,    // B
        show_id,        // C
        date,           // D
        start_time,     // E
        end_time,       // F
        client,         // G
        platforms,      // H
        show_standard,  // I
        show_type,      // J
        shopee_ticket_id, // K
        lazada_ticket_id, // L
        tiktok_ticket_id, // M
        show_status,       // N
        studio_rooms,      // O
        mcs,      // P
        note,     // Q
        current_version,   // R
      ] = row;

    const key = schedule_id; // Grouping by Schedule ID now
    if (!key) return store; 

    if (!store[key]) {
      // Robust version parsing: default to 1 if missing/invalid
      let version = 1;
      if (current_version !== '' && current_version !== undefined && current_version !== null) {
         const parsed = parseInt(current_version, 10);
         if (!isNaN(parsed)) {
            version = parsed;
         }
      }
      
      // Determine Schedule Name based on Date
      // e.g., "ClientName - January 2026"
      const d = date ? new Date(date) : new Date();
      const monthName = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      const scheduleName = `${client} - ${monthName} ${year}`;
      
      store[key] = {
        schedule_id, 
        name: scheduleName,
        start_date: date ? new Date(date).toISOString() : new Date().toISOString(), 
        end_date: date ? new Date(date).toISOString() : new Date().toISOString(),
        status: 'draft',
        client_id: client, // Use client for client_id
        created_by: GOOGLE_SHEET_USER_ID,
        plan_document: {
          shows: []
        },
        version: version, 
        _minDate: date ? new Date(date) : new Date(),
        _maxDate: date ? new Date(date) : new Date(),
        _rowIndices: [] // Track row indices
      };
    }

    const entry = store[key];
    entry._rowIndices.push(index); // Save index

    if (date) {
      const d = new Date(date);
      if (d < entry._minDate) {
        entry._minDate = d;
        entry.start_date = d.toISOString();
      }
      if (d > entry._maxDate) {
        entry._maxDate = d;
        entry.end_date = d.toISOString();
      }
    }

    // mcs is no longer in the row destructuring
    // studio_room_id is no longer in the row destructuring

    const platformList = (platforms || '')
      .toString()
      .split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(platformName => {
        const lowerName = platformName.toLowerCase();
        const uid = PLATFORM_NAME_TO_UID[lowerName] || PLATFORM_NAME_TO_UID[platformName];
        
        let platformShowId = '';
        if (lowerName === 'tiktok' && tiktok_ticket_id) platformShowId = tiktok_ticket_id;
        if (lowerName === 'shopee' && shopee_ticket_id) platformShowId = shopee_ticket_id;
        if (lowerName === 'lazada' && lazada_ticket_id) platformShowId = lazada_ticket_id;

        const effectiveUid = uid || (platformName.startsWith('plt_') ? platformName : null);

        if (!effectiveUid) return null;

        return {
          platformUid: effectiveUid,
          ...(platformShowId && { platformShowId }),
        };
      })
      .filter(Boolean);

    let startTimeIso = null;
    let endTimeIso = null;

    if (date && start_time && end_time) {
      // Helper to safely parse dates that might be strings or Date objects
      const parseDate = (val) => {
        if (!val) return null;
        if (Object.prototype.toString.call(val) === "[object Date]") {
          if (isNaN(val.getTime())) return null;
          return val;
        }
        // If it's a string, try to construct a date (simple case)
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const dateObj = parseDate(date);
      const startObj = parseDate(start_time);
      const endObj = parseDate(end_time);
      
      let startAt = null;
      let endAt = null;

      if (dateObj && startObj) {
        startAt = new Date(dateObj);
        startAt.setHours(startObj.getHours(), startObj.getMinutes(), 0, 0);
      }
      
      if (dateObj && endObj) {
        endAt = new Date(dateObj);
        endAt.setHours(endObj.getHours(), endObj.getMinutes(), 0, 0);
        // Handle overnight shows if end time is before start time (simple heuristic)
        if (startAt && endAt < startAt) {
          endAt.setDate(endAt.getDate() + 1);
        }
      }
      
      if (startAt) startTimeIso = startAt.toISOString();
      if (endAt) endTimeIso = endAt.toISOString();
    }

    // Apply Defaults for Missing Fields
    const finalShowTypeUid = show_type || DEFAULTS.SHOW_TYPE_UID;
    const finalShowStatusUid = show_status || DEFAULTS.SHOW_STATUS_UID;
    const finalShowStandardUid = show_standard || DEFAULTS.SHOW_STANDARD_UID;

    const showItem = {
      ...(show_id && { tempId: show_id }),
      name: `${show_id || 'Untitled'}`,
      startTime: startTimeIso,
      endTime: endTimeIso,
      clientUid: client, // Use client for clientUid
      showTypeUid: finalShowTypeUid,
      showStatusUid: finalShowStatusUid,
      showStandardUid: finalShowStandardUid,
      note: note || '',
      ...(platformList.length && { platforms: platformList }),
    };

    entry.plan_document.shows.push(showItem);

    return store;
  }, {});
}

function adapterStoreToPayload(store) {
  const scheduleRowMapping = {};

  const schedules = Object.values(store).map(item => {
    // Save mapping for write-back
    // Assuming schedule_id is unique per store entry
    scheduleRowMapping[item.schedule_id] = item._rowIndices;

    return {
      schedule_id: item.schedule_id,
      name: item.name,
      start_date: item.start_date,
      end_date: item.end_date,
      status: item.status,
      plan_document: item.plan_document,
      version: item.version,
    };
  });

  return { 
    payload: { schedules },
    scheduleRowMapping
  };
}
