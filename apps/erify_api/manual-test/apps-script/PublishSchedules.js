function publishSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  // Get active range from config (e.g., J4 -> A2:T20)
  const rangeString = configSheet.getRange(CONFIG_ACTIVE_SCHEDULE_RANGE).getValue();
  if (!rangeString) {
    Logger.log('No active schedule range defined in Config sheet.');
    return;
  }

  const match = rangeString.match(/[A-Z]+(\d+):/);
  const startRowOffset = match ? parseInt(match[1], 10) : 2; 

  const rows = schedulesSheet.getRange(rangeString).getValues();

  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  Logger.log('--- Starting Publish Process ---');

  // --- Pre-flight Strict Validation ---
  Logger.log('Processing Pre-flight Validation...');
  
  // 1. Check consistency of ALL rows in the active range first.
  // If ANY row is not ready ('review') or has version mismatch, we abort EVERYTHING.
  // This prevents partial publishing where some are published and others are left behind.
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const scheduleId = row[1];
    const status = row[3];
    const sheetVersion = row[6];
    
    if (!scheduleId) continue; // Skip empty rows

    // Check Status
    if (!status || status.toLowerCase() !== 'review') {
      const msg = `Pre-flight Failed: Schedule ${scheduleId} is in status '${status}' (expected 'review'). Aborting all.`;
      Logger.log(msg);
      // Write error to the specific row so user knows which one blocked it
      const sheetRow = startRowOffset + i;
      schedulesSheet.getRange(sheetRow, 10).setValue(msg);
      
      const e = new Error(msg);
      e.name = 'FatalError';
      throw e;
    }

    // Check Version Mismatch
    try {
      const serverSchedule = getSchedule(scheduleId);
      if (!serverSchedule || typeof serverSchedule.version === 'undefined') {
         throw new Error(`Could not fetch version for ${scheduleId}`);
      }
      if (serverSchedule.version != sheetVersion) {
        const msg = `Pre-flight Failed: Version mismatch for ${scheduleId} (Sheet: ${sheetVersion}, Server: ${serverSchedule.version}). Sync required.`;
        Logger.log(msg);
        const sheetRow = startRowOffset + i;
        schedulesSheet.getRange(sheetRow, 10).setValue(msg);
        
        const e = new Error(msg);
        e.name = 'FatalError';
        throw e;
      }
    } catch (e) {
      if (e.name === 'FatalError') throw e;
      const msg = `Pre-flight Check Error for ${scheduleId}: ${e.message}`;
      Logger.log(msg);
      const err = new Error(msg);
      err.name = 'FatalError';
      throw err;
    }
  }

  Logger.log('Pre-flight Validation Passed. Proceeding to Publish...');

  // --- Execution Loop ---

  rows.forEach((row, index) => {
    const scheduleId = row[1]; // Col B
    const rawVersion = row[6]; // Col G (Version)

    if (!scheduleId) return;

    // determine version
    let version = 1; 
    if (rawVersion !== '' && rawVersion != null) {
      const parsed = parseInt(rawVersion, 10);
      if (!isNaN(parsed)) version = parsed;
    }

    stats.total++;
    try {
      Logger.log(`Publishing Schedule ${scheduleId} (v${version})...`);
      const result = publishSchedule(scheduleId, version);
      
      // CRITICAL: Check for API error response
      if (result.statusCode && result.statusCode >= 400) {
        throw new Error(result.message || `API Error ${result.statusCode}`);
      }
      if (result.error) {
         throw new Error(result.message || result.error);
      }
      
      const sheetRow = startRowOffset + index;
      const statusCell = schedulesSheet.getRange(sheetRow, 4);  // Col D
      const noteCell = schedulesSheet.getRange(sheetRow, 10);   // Col J
      
      Logger.log(`Schedule ${scheduleId} PUBLISHED.`);
      statusCell.setValue('published');
      noteCell.setValue(`Published at ${new Date().toLocaleTimeString()}`);
      stats.success++;

    } catch (e) {
      Logger.log(`Error publishing ${scheduleId}: ${e.message}`);
      const sheetRow = startRowOffset + index;
      schedulesSheet.getRange(sheetRow, 10).setValue(`Publish Error: ${e.message}`);
      stats.failed++;
    }
  });

  Logger.log('--- Publish Summary ---');
  Logger.log(`Total Processed: ${stats.total}`);
  Logger.log(`Success: ${stats.success}`);
  Logger.log(`Failed: ${stats.failed}`);
  Logger.log('-----------------------');
}

