/**
 * Synchronizes the active MC creator roster from the server to the Google Sheet.
 * 
 * Flow:
 * 1. Fetches the active roster from: GET /google-sheets/studios/:studioId/creators
 * 2. Overwrites the 'mc_users' sheet with detailed user & creator records.
 * 3. Overwrites the 'mcs' column (Column F) in the 'config' sheet with the sorted list of active MC names for dropdown validation.
 */
function syncMCRoster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get sheets
  const mcUsersSheet = ss.getSheetByName(MC_USERS_SHEET);
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  
  if (!mcUsersSheet) {
    Logger.log(`Error: Sheet '${MC_USERS_SHEET}' not found.`);
    return;
  }
  if (!configSheet) {
    Logger.log(`Error: Sheet '${CONFIG_SHEET}' not found.`);
    return;
  }

  Logger.log('--- Starting MC Roster Sync ---');

  try {
    // 2. Fetch roster from API
    const studioId = DEFAULTS.STUDIO_UID;
    const path = ROUTES.GET_MC_ROSTER(studioId);
    
    const responseRaw = apiClient({ path, options: { method: 'GET' } });
    if (!responseRaw) {
      throw new Error('Empty response from MC roster API');
    }
    
    const roster = JSON.parse(responseRaw);
    if (!Array.isArray(roster)) {
      throw new Error('MC roster API response is not an array');
    }

    Logger.log(`Successfully fetched ${roster.length} active MCs from server.`);

    // 3. Prepare data for 'mc_users' sheet
    const headers = [
      'ext_id', 'name', 'email', 'email_verified', 'image', 
      'created_at', 'updated_at', 'role', 'banned', 'ban_reason', 
      'ban_expires', 'mc_name', 'mc_id', 'user_id'
    ];
    
    const rows = [headers];
    const mcNames = [];

    roster.forEach(mc => {
      rows.push([
        mc.ext_id,
        mc.name,
        mc.email,
        mc.email_verified,
        mc.image,
        mc.created_at,
        mc.updated_at,
        mc.role,
        mc.banned,
        mc.ban_reason,
        mc.ban_expires,
        mc.mc_name,
        mc.mc_id,
        mc.user_id
      ]);

      if (mc.mc_name) {
        mcNames.push(mc.mc_name);
      }
    });

    // 4. Overwrite 'mc_users' sheet
    mcUsersSheet.clear();
    mcUsersSheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    Logger.log(`Updated '${MC_USERS_SHEET}' sheet with ${roster.length} rows.`);

    // 5. Overwrite 'mcs' column (Column F) in 'config' sheet
    // Sort names alphabetically (case-insensitive)
    const sortedMcNames = mcNames
      .filter((value, index, self) => self.indexOf(value) === index) // Unique values
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Clear existing config column F (from Row 2 downwards)
    const lastRowConfig = configSheet.getLastRow();
    if (lastRowConfig >= 2) {
      configSheet.getRange(2, 6, lastRowConfig - 1, 1).clearContent();
    }

    // Write new MC names to config column F
    if (sortedMcNames.length > 0) {
      const configValues = sortedMcNames.map(name => [name]);
      configSheet.getRange(2, 6, sortedMcNames.length, 1).setValues(configValues);
    }
    
    Logger.log(`Updated '${CONFIG_SHEET}' sheet Column F (mcs) with ${sortedMcNames.length} active names.`);
    Logger.log('--- MC Roster Sync Completed Successfully ---');

  } catch (e) {
    Logger.log(`Error syncing MC roster: ${e.message}`);
    throw e;
  }
}
