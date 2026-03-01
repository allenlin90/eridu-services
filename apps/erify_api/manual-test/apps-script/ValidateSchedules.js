function validateSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);
  const selectedRows = getSelectedScheduleRows(schedulesSheet);

  if (selectedRows.length === 0) {
    Logger.log('No schedules selected in Column L (active_schedule=true). Validate skipped.');
    return;
  }

  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  selectedRows.forEach(({ row, sheetRow, scheduleId }) => {
    const status = row[SCHEDULE_COLS.STATUS - 1]; // Col D (Status)
    const sheetVersion = row[SCHEDULE_COLS.VERSION - 1]; // Col G (Version)
    
    if (!scheduleId) return;

    // Strict filter: Only process 'draft' schedules.
    // If status is missing or not 'draft', skip it.
    if (!status || status.toLowerCase() !== 'draft') {
      Logger.log(`Skipping ${scheduleId} (Status: ${status || 'empty'}) - Only 'draft' schedules are validated.`);
      stats.skipped++;
      return;
    }

    stats.total++;
    const noteCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE); // Col J

    try {
      // Version Check: Stop execution if version mismatch
      const serverSchedule = getSchedule(scheduleId);
      if (!serverSchedule || typeof serverSchedule.version === 'undefined') {
         throw new Error("Could not fetch schedule version from server.");
      }

      // Allow loose comparison (string vs number)
      if (serverSchedule.version != sheetVersion) {
        const msg = `Version Mismatch! Sheet: ${sheetVersion}, Server: ${serverSchedule.version}. Sync required.`;
        Logger.log(msg);
        noteCell.setValue(msg);
        stats.failed++;
        return;
      }

      const result = validateSchedule(scheduleId);

      // CRITICAL: Check for API error response (e.g. 500 or 404)
      if (result.statusCode && result.statusCode >= 400) {
        throw new Error(result.message || `API Error ${result.statusCode}`);
      }
      
      const statusCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.STATUS); // Col D

      if (result.isValid) {
        Logger.log(`Schedule ${scheduleId} is VALID.`);
        statusCell.setValue('review');
        noteCell.setValue(`Validated ok at ${new Date().toLocaleTimeString()}`);
        stats.success++;
      } else {
        Logger.log(`Schedule ${scheduleId} is INVALID.`);
        
        // Format errors
        const errorMsg = result.errors.map(e => e.message).join('; ');
        noteCell.setValue(`Validation Failed: ${errorMsg}. Please fix data and re-sync.`);
        stats.failed++;
      }
    } catch (e) {
      Logger.log(`Error validating ${scheduleId}: ${e.message}`);
      schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue(`System Error: ${e.message}`);
      stats.failed++;
    }
  });

  Logger.log('--- Validation Summary ---');
  Logger.log(`Total Processed: ${stats.total}`);
  Logger.log(`Success (Valid): ${stats.success}`);
  Logger.log(`Failed (Invalid/Error): ${stats.failed}`);
  Logger.log(`Skipped: ${stats.skipped}`);
  Logger.log('--------------------------');
}
