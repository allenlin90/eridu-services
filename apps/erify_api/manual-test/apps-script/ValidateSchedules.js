function validateSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  // Get active range from config (e.g., J4 -> A2:T20)
  const rangeString = configSheet.getRange(CONFIG_ACTIVE_SCHEDULE_RANGE).getValue();
  if (!rangeString) {
    Logger.log('No active schedule range defined in Config sheet.');
    return;
  }

  // Parse start row offset for correct writing back
  // Assuming rangeString is like "A2:T20"
  const match = rangeString.match(/[A-Z]+(\d+):/);
  const startRowOffset = match ? parseInt(match[1], 10) : 2; 

  const rows = schedulesSheet.getRange(rangeString).getValues();

  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  rows.forEach((row, index) => {
    const scheduleId = row[1]; // Col B
    const status = row[3];     // Col D (Status)
    const sheetVersion = row[6]; // Col G (Version)
    
    if (!scheduleId) return;

    // Strict filter: Only process 'draft' schedules.
    // If status is missing or not 'draft', skip it.
    if (!status || status.toLowerCase() !== 'draft') {
      Logger.log(`Skipping ${scheduleId} (Status: ${status || 'empty'}) - Only 'draft' schedules are validated.`);
      stats.skipped++;
      return;
    }

    stats.total++;
    const sheetRow = startRowOffset + index;
    const noteCell = schedulesSheet.getRange(sheetRow, 10);   // Col J

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
        
        const e = new Error(msg);
        e.name = 'FatalError';
        throw e;
      }

      const result = validateSchedule(scheduleId);

      // CRITICAL: Check for API error response (e.g. 500 or 404)
      if (result.statusCode && result.statusCode >= 400) {
        throw new Error(result.message || `API Error ${result.statusCode}`);
      }
      
      const statusCell = schedulesSheet.getRange(sheetRow, 4);  // Col D

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
      if (e.name === 'FatalError') {
         // Stop the entire process
         throw new Error(`Execution Stopped: ${e.message}`);
      }
      
      Logger.log(`Error validating ${scheduleId}: ${e.message}`);
      schedulesSheet.getRange(sheetRow, 10).setValue(`System Error: ${e.message}`);
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
