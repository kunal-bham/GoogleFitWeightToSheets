# Google Fit Weight Tracker

Automatically imports your weight data from Google Fit into Google Sheets.

## Setup

1. Create a new Google Apps Script project
2. Copy the contents of `main.js` into your project
3. Create a `config.js` file with your Google OAuth credentials:
```

4. Set up Google Cloud Project:
   - Create a new project at [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google Fit API and Google Sheets API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs from your Apps Script project

5. Run the script from your Google Sheet
   - A new menu item "Google Fit" will appear
   - Click "Authorize if needed" and follow the prompts
   - Use "Get Weight for Yesterday" or "Get Weight History" to import data

## Features
- Imports weight data from Google Fit
- Converts weight from kg to lb
- Stores data in Google Sheets
- Can fetch up to 600 days of historical data

## Configuration
- Edit the CHUNK_SIZE constant to adjust how many days are processed at once
- Weight is stored with 1 decimal place precision
- Data is only added when weight measurements exist

## License
MIT