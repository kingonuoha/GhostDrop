/**
 * GhostDrop: Google Apps Script Feedback Web App Handler
 *
 * This standalone script receives user feedback and feature requests from the
 * GhostDrop web app modal and appends them as structured rows to a Google Sheet.
 *
 * Deployment Instructions:
 * 1. Open your target Google Sheet.
 * 2. In the top menu, go to: Extensions -> Apps Script.
 * 3. Delete any boilerplate in Code.gs and paste the contents of this file.
 * 4. Click Deploy -> New deployment.
 * 5. Select type: "Web app".
 * 6. Set Description: "GhostDrop Feedback Pipeline".
 * 7. Set "Execute as": "Me" (your Google account).
 * 8. Set "Who has access": "Anyone" (allows anonymous submissions from the app).
 * 9. Click Deploy, authorize permissions if prompted, and copy the Web App URL.
 * 10. Set VITE_FEEDBACK_SHEETS_URL=<your-web-app-url> in your web/.env file.
 *
 * Sheet Column Schema:
 * - Column A: Timestamp (ISO string or formatted date)
 * - Column B: Category (Feature Request or General Feedback)
 * - Column C: Message (User feedback text)
 * - Column D: App Version (e.g. 0.11 or 0.12)
 * - Column E: Device Type (desktop, mobile, or tablet)
 *
 * Zero emojis, zero em dashes.
 */

var SHEET_HEADERS = ['Timestamp', 'Category', 'Message', 'App Version', 'Device Type'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent writes to prevent sheet collisions
  var hasLock = lock.tryLock(10000);

  try {
    var rawContents = '';
    if (e && e.postData && e.postData.contents) {
      rawContents = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      rawContents = e.parameter.payload;
    }

    var payload = {};
    if (rawContents) {
      try {
        payload = JSON.parse(rawContents);
      } catch (jsonErr) {
        payload = { message: rawContents };
      }
    }

    var timestamp = payload.timestamp || new Date().toISOString();
    var category = payload.category || 'general_feedback';
    var message = payload.message || '';
    var version = payload.version || '';
    var device = payload.device || '';

    // Human readable category labels
    var categoryLabel = category === 'feature_request' ? 'Feature Request' : 'General Feedback';

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Initialize headers if sheet is brand new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SHEET_HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
      headerRange.setFontWeight('bold');
    }

    // Append the feedback row
    sheet.appendRow([timestamp, categoryLabel, message, version, device]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, timestamp: timestamp }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'GhostDrop Feedback Pipeline',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
