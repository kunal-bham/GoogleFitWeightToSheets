// add your Google API Project OAuth client ID and client secret here

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Google Fit')
      .addItem('Authorize if needed (does nothing if already authorized)', 'showSidebar')
      .addItem('Get Weight for Yesterday', 'getMetrics')
      .addItem('Get Weight History (600 days)', 'getHistory')
      .addItem('Reset Settings', 'clearProps')
      .addToUi();
}

function getMetrics() {
  getMetricsForDays(1, 1, 'History');
}

function getHistory() {
  getMetricsForDays(1, 600, 'History');
}

// see step count example at https://developers.google.com/fit/scenarios/read-daily-step-total
// adapted below to handle multiple metrics (steps, weight, distance), only logged if present for day
function getMetricsForDays(fromDaysAgo, toDaysAgo, tabName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  var fitService = getFitService();
  
  // Process in 30-day chunks, but start from oldest data
  const CHUNK_SIZE = 30;
  // Start from the oldest data (toDaysAgo) and move towards newer data
  for (let i = toDaysAgo; i >= fromDaysAgo; i -= CHUNK_SIZE) {
    const chunkStart = Math.max(i - CHUNK_SIZE + 1, fromDaysAgo);
    
    var start = new Date();
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() - i);  // Start from older date

    var end = new Date();
    end.setHours(23,59,59,999);
    end.setDate(end.getDate() - chunkStart);  // End at newer date
    
    var request = {
      "aggregateBy": [
        {
          "dataTypeName": "com.google.weight.summary",
          "dataSourceId": "derived:com.google.weight:com.google.android.gms:merge_weight"
        }
      ],
      "bucketByTime": { "durationMillis": 86400000 },
      "startTimeMillis": start.getTime(),
      "endTimeMillis": end.getTime()
    };
    
    try {
      var response = UrlFetchApp.fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        headers: {
          Authorization: 'Bearer ' + fitService.getAccessToken()
        },
        'method' : 'post',
        'contentType' : 'application/json',
        'payload' : JSON.stringify(request, null, 2)
      });
      
      var json = JSON.parse(response.getContentText());
      
      for(var b = 0; b < json.bucket.length; b++) {
        // Only process if there's weight data
        if (json.bucket[b].dataset[0].point.length > 0) {
          var bucketDate = new Date(parseInt(json.bucket[b].startTimeMillis, 10));
          var formattedDate = Utilities.formatDate(bucketDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          var weight = (json.bucket[b].dataset[0].point[0].value[0].fpVal * 2.20462).toFixed(1);
          sheet.appendRow([formattedDate, weight]);
        }
      }
      
      // Add a small delay to avoid hitting rate limits
      Utilities.sleep(1000);
      
    } catch (error) {
      console.error('Error fetching data for chunk:', i, 'to', chunkStart, error);
      // Continue with next chunk even if this one fails
      continue;
    }
  }
}

// functions below adapted from Google OAuth example at https://github.com/googlesamples/apps-script-oauth2

function getFitService() {
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.
  return OAuth2.createService('fit')

      // Set the endpoint URLs, which are the same for all Google services.
      .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')

      // Set the client ID and secret, from the Google Developers Console.
      .setClientId(ClientID)
      .setClientSecret(ClientSecret)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request (space-separated for Google services).
      // see https://developers.google.com/fit/rest/v1/authorization for a list of Google Fit scopes
      .setScope('https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.location.read')

      // Below are Google-specific OAuth2 parameters.

      // Sets the login hint, which will prevent the account chooser screen
      // from being shown to users logged in with multiple accounts.
      .setParam('login_hint', Session.getActiveUser().getEmail())

      // Requests offline access.
      .setParam('access_type', 'offline')

      // Forces the approval prompt every time. This is useful for testing,
      // but not desirable in a production application.
      //.setParam('approval_prompt', 'force');
}

function showSidebar() {
  var fitService = getFitService();
  if (!fitService.hasAccess()) {
    var authorizationUrl = fitService.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Close this after you have finished.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  } else {
  // ...
  }
}

function authCallback(request) {
  var fitService = getFitService();
  var isAuthorized = fitService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}

function clearProps() {
  PropertiesService.getUserProperties().deleteAllProperties();
}