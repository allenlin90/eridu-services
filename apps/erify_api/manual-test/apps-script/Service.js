function bulkUpdateSchedules(payload) {
  const options = {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  const response = apiClient({
    path: ROUTES.BULK_UPDATE_SCHEDULE,
    options: options
  });
  
  return response;
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
    
    // Debug Logging
    Logger.log(`Fetch completed. Res type: ${Object.prototype.toString.call(res)}`);
    try {
       Logger.log(`Res keys: ${Object.keys(res).join(',')}`);
    } catch(e) {}

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
