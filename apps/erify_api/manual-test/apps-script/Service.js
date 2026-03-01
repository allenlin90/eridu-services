function updateSchedule(scheduleId, payload) {
  const options = {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  const response = apiClient({
    path: ROUTES.UPDATE_SCHEDULE(scheduleId),
    options: options
  });
  
  return response;
}

function getSchedule(scheduleId) {
  const responseRaw = apiClient({
    path: ROUTES.UPDATE_SCHEDULE(scheduleId), // Re-using route which is /schedules/:id
    options: { method: 'get' }
  });
  return JSON.parse(responseRaw);
}

function validateSchedule(scheduleId) {
  const responseRaw = apiClient({
    path: ROUTES.VALIDATE_SCHEDULE(scheduleId),
    options: { method: 'post' }
  });
  return JSON.parse(responseRaw);
}

function publishSchedule(scheduleId, version) {
  const responseRaw = apiClient({
    path: ROUTES.PUBLISH_SCHEDULE(scheduleId),
    options: { 
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ version: version })
    }
  });
  return JSON.parse(responseRaw);
}

function apiClient({ path = '/', options = {} } = {}) {
  const url = `${HOST}${path}`;
  Logger.log(`Calling API: ${url}`);
  
  try {
    const res = UrlFetchApp.fetch(url, {
      ...options,
      muteHttpExceptions: true,
      headers: {
        ...options.headers,
        'X-API-KEY': GOOGLE_SHEET_KEY
      },
    });
    
    const responseCode = res.getResponseCode();
    const responseBody = res.getContentText();
    
    if (responseCode >= 400) {
      Logger.log(`Error ${responseCode}: ${responseBody}`);
    }
    
    return responseBody;
  } catch (e) {
    Logger.log(`Exception: ${e.toString()}`);
    throw e;
  }
}

function bulkCreateSchedules({ schedules = [] }) {
  const refinedSchedule = schedules.map(schedule => ({ ...schedule, created_by: GOOGLE_SHEET_USER_ID }));

  const serializedPayload = JSON.stringify({ schedules: refinedSchedule });

  const res = apiClient({ 
    path: ROUTES.BULK_CREATE_SCHEDULE, 
    options: { 
      method: 'POST',
      contentType: 'application/json',
      payload: serializedPayload
    }
  });

  return res;
}

function isCheckedCell(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

function getSelectedScheduleRows(schedulesSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const lastRow = schedulesSheet.getLastRow();
  if (lastRow < 2) return [];

  let startRow = 2;
  let endRow = lastRow;

  // Use config cache (J4/J5) as a performance hint window.
  // Fall back to full scan if cache is missing/invalid/stale.
  if (configSheet) {
    const cachedStart = Number(configSheet.getRange(CONFIG_SELECTED_START_ROW_RANGE).getValue());
    const cachedEnd = Number(configSheet.getRange(CONFIG_SELECTED_END_ROW_RANGE).getValue());
    const hasValidCache = Number.isFinite(cachedStart)
      && Number.isFinite(cachedEnd)
      && cachedStart >= 2
      && cachedEnd >= cachedStart
      && cachedEnd <= lastRow;

    if (hasValidCache) {
      startRow = cachedStart;
      endRow = cachedEnd;
    }
  }

  const numRows = endRow - startRow + 1;
  // Read A:L so we can access schedule_id and active_schedule in one fetch.
  const rows = schedulesSheet.getRange(startRow, 1, numRows, SCHEDULE_COLS.ACTIVE_SCHEDULE).getValues();

  return rows
    .map((row, index) => ({
      row,
      sheetRow: index + startRow,
      scheduleId: row[SCHEDULE_COLS.SCHEDULE_ID - 1]
        ? row[SCHEDULE_COLS.SCHEDULE_ID - 1].toString().trim()
        : '',
      isSelected: isCheckedCell(row[SCHEDULE_COLS.ACTIVE_SCHEDULE - 1]),
    }))
    .filter((item) => item.scheduleId && item.isSelected);
}
