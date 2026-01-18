const GOOGLE_SHEET_KEY = 'ae63f8e9ddff01029ef2bb13a0dc105ce7d08e4aec56dd9d'; 
const HOST = 'https://erify-api.eridu.co.th/google-sheets';
const GOOGLE_SHEET_USER_ID = 'user_x2ooAy1O3NKiyaKqhCKX';

const ROUTES = { 
  BULK_CREATE_SCHEDULE: '/schedules/bulk',
  BULK_UPDATE_SCHEDULE: '/schedules/bulk', 
}

const PLATFORMS = {
  'plt_Z9Flkouqz0V1idiKQiEh': 'tiktok',
  'plt_P9Y_gVTYE68KgGkR3hpO': 'shopee',
  'plt_E4UWCFvqQ4UZAZyy_Kf2': 'lazada',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Fallback Defaults
const DEFAULTS = {
  // Use generic UIDs or placeholder values that the backend accepts
  // You might need to replace these with actual UIDs from your database
  SHOW_TYPE_UID: 'sht_X7czbuD84flXOcf_hj0K', // show_type bau
  SHOW_STATUS_UID: 'shst_F6LbjLg5DdDD6ubUdk5a', // show_status draft
  SHOW_STANDARD_UID: 'shsd_0Okt_vla8ABX9zDVBWrd', // show_standard standard
}

// Column Configurations
const COLS = {
  VERSION: 18, // Column R
  STATUS: 19, // Column S
  ERROR_MSG: 20 // Column T
}
