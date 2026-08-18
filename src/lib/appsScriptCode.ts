/**
 * MICROMATE CLOUD GATEWAY - GOOGLE APPS SCRIPT (v2.0 - Canonical 10-Sheet Secure Gateway)
 * Menangani pembuatan tab sheet otomatis, simpan metadata ke Google Sheets,
 * serta upload file/foto dokumen ke Google Drive.
 * Dilengkapi pengamanan Opaque Bearer Token dengan hashing SHA-256 di sisi server,
 * mekanisme rate limit OTP, dan perlindungan lockout.
 */

export const APPS_SCRIPT_CODE = `/**
 * MICROMATE CLOUD GATEWAY - GOOGLE APPS SCRIPT (v2.0 - Canonical 10-Sheet Secure Gateway)
 * Menangani pembuatan tab sheet otomatis, simpan metadata ke Google Sheets,
 * serta upload file/foto dokumen ke Google Drive.
 */

const CONFIG = {
  ROOT_FOLDER_NAME: "MicroMate",
  SHEET_NAME_ASSETS: "Assets",
  SHEET_NAME_SERVICES: "Services",
  SHEET_NAME_REMINDERS: "Reminders",
  SHEET_NAME_DOCUMENTS: "Documents",
  SHEET_NAME_EXPENSES: "Expenses",
  SHEET_NAME_ASSET_HISTORY: "AssetHistory",
  SHEET_NAME_DELETED_ASSETS: "DeletedAssets",
  SHEET_NAME_SESSIONS: "Sessions",
  SHEET_NAME_LOG_SYNC: "LogSync",
  SHEET_NAME_SIM_CARDS: "SIMCards"
};

/** Menghitung SHA-256 hash dari string input */
function sha256(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var output = "";
  for (var i = 0; i < rawHash.length; i++) {
    var v = rawHash[i];
    if (v < 0) v += 256;
    var byteString = v.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    output += byteString;
  }
  return output;
}

/** Otomatis membuat seluruh Tab Sheet & Header Kolom jika belum ada */
function ensureSheetTabs(ss) {
  if (!ss) return;

  const tabsConfig = [
    {
      name: CONFIG.SHEET_NAME_ASSETS,
      headers: [
        "Asset ID", "Asset Code", "Category", "Name", "Brand", "Model", 
        "Serial Number", "Purchase Date", "Purchase Price", "Location", "Status", 
        "Notes", "Photo URL", "Assigned User", "Created At", "Updated At", 
        "Deleted", "Vehicle Details", "Device Details", "Warranty"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_SERVICES,
      headers: [
        "Maintenance ID", "Asset ID", "Type", "Date", "Mileage", 
        "Cost", "Provider", "Notes"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_REMINDERS,
      headers: [
        "Reminder ID", "Asset ID", "Type", "Title", "Due Date", 
        "Repeat Rule", "Status", "Created At", "Updated At"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_DOCUMENTS,
      headers: [
        "Document ID", "Asset ID", "Type", "Name", "File URL", "Created At", "Drive File ID", "Mutation ID", "Fingerprint", "File Size", "MIME Type"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_EXPENSES,
      headers: [
        "Expense ID", "Asset ID", "Type", "Amount", "Date", "Description"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_ASSET_HISTORY,
      headers: [
        "Event ID", "Asset ID", "Timestamp", "Action", "Field", 
        "Old Value", "New Value", "Performed By", "Notes"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_DELETED_ASSETS,
      headers: [
        "Asset ID", "Deleted At"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_SESSIONS,
      headers: [
        "Session Hash", "Created At", "Expires At", "Last Used At", "Device ID", 
        "Status", "Paired Email"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_LOG_SYNC,
      headers: [
        "Log ID", "Timestamp", "Session Hash", "Device ID", "Action", 
        "Status", "Payload Summary", "Error Details"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_SIM_CARDS,
      headers: [
        "SIM ID", "Asset ID", "Phone Number", "Provider", "Active Until", 
        "Registration Status", "Account Dependencies"
      ]
    }
  ];

  tabsConfig.forEach(function(tab) {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
      sheet.appendRow(tab.headers);
      sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight("bold").setBackground("#d1fae5");
      sheet.setFrozenRows(1);
    } else {
      var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(h) { return String(h).trim(); });
      var missingHeaders = [];
      tab.headers.forEach(function(h) {
        if (currentHeaders.indexOf(h) === -1) {
          missingHeaders.push(h);
        }
      });
      if (missingHeaders.length > 0) {
        var startCol = currentHeaders.length + 1;
        for (var m = 0; m < missingHeaders.length; m++) {
          sheet.getRange(1, startCol + m).setValue(missingHeaders[m]).setFontWeight("bold").setBackground("#d1fae5");
        }
      }
    }
  });

  // Hapus sheet default (Sheet1/Lembar1) jika ada & kosong
  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      if (defaultSheet.getLastRow() <= 1) {
        ss.deleteSheet(defaultSheet);
      }
    } catch(e) {}
  }
}

/** Helper untuk mendapatkan / membuat Google Spreadsheet & Folder Drive secara otomatis */
function ensureVaultFolder() {
  try {
    const rootFolders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    const rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
    const assetsFolders = rootFolder.getFoldersByName("Assets");
    if (!assetsFolders.hasNext()) {
      rootFolder.createFolder("Assets");
    }
    return rootFolder;
  } catch (err) {
    Logger.log("DriveApp Error: " + err);
    return null;
  }
}

function getSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {}

  if (!ss) {
    try {
      const files = DriveApp.getFilesByName("MicroMate Database");
      if (files.hasNext()) {
        ss = SpreadsheetApp.openById(files.next().getId());
      }
    } catch (err) {}
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.create("MicroMate Database");
    } catch (err) {}
  }

  if (ss) {
    try {
      ensureSheetTabs(ss);
      ensureVaultFolder();
    } catch (err) {}
  }
  return ss;
}

function getEffectiveOwnerEmail() {
  try {
    var email = Session.getEffectiveUser().getEmail();
    if (email && email.trim() !== "") {
      return email.trim();
    }
  } catch (err1) {
    Logger.log("getEffectiveUser error: " + err1);
  }
  try {
    var activeEmail = Session.getActiveUser().getEmail();
    if (activeEmail && activeEmail.trim() !== "") {
      return activeEmail.trim();
    }
  } catch (err2) {
    Logger.log("getActiveUser error: " + err2);
  }
  return "";
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
    return 'u••••@gmail.com';
  }
  var parts = email.split('@');
  var name = parts[0];
  var domain = parts[1];
  if (name.length <= 1) {
    return name + '••••@' + domain;
  } else if (name.length === 2) {
    return name[0] + '•@' + domain;
  } else {
    return name[0] + '••••' + name[name.length - 1] + '@' + domain;
  }
}

/** Memverifikasi kesahihan Opaque Bearer Token dengan mencocokkan SHA-256 hash di tab Sessions */
function validateSession(ss, token, deviceId) {
  if (!token) return { success: false, error: "SESSION_TOKEN_REQUIRED", message: "Token sesi diperlukan." };
  
  var hash = sha256(token);
  var sessionSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SESSIONS);
  if (!sessionSheet) return { success: false, error: "SESSIONS_SHEET_NOT_FOUND", message: "Gagal memuat basis data sesi." };
  
  var rows = sessionSheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: false, error: "SESSION_NOT_FOUND", message: "Sesi tidak ditemukan atau telah kedaluwarsa." };
  
  var headers = rows[0].map(function(h) { return String(h).trim(); });
  var idxHash = headers.indexOf("Session Hash");
  var idxCreated = headers.indexOf("Created At");
  var idxExpires = headers.indexOf("Expires At");
  var idxLastUsed = headers.indexOf("Last Used At");
  var idxStatus = headers.indexOf("Status");
  var idxEmail = headers.indexOf("Paired Email");
  
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[idxHash]) === hash) {
      var status = String(r[idxStatus]);
      if (status !== "ACTIVE") {
        return { success: false, error: "SESSION_REVOKED", message: "Sesi telah diputuskan. Harap hubungkan ulang." };
      }
      
      var expiresAt = new Date(r[idxExpires]).getTime();
      var now = new Date().getTime();
      if (now > expiresAt) {
        sessionSheet.getRange(i + 1, idxStatus + 1).setValue("EXPIRED");
        return { success: false, error: "SESSION_EXPIRED", message: "Sesi telah kedaluwarsa. Silakan lakukan pairing ulang." };
      }
      
      // Update last_used_at secara berkala untuk menjaga transparansi audit
      sessionSheet.getRange(i + 1, idxLastUsed + 1).setValue(new Date().toISOString());
      return { success: true, email: String(r[idxEmail]) };
    }
  }

  // Graceful fallback jika sesi belum dibuat atau lembar sesi masih kosong
  if (rows.length <= 1) {
    return { success: true, email: getEffectiveOwnerEmail(), fallback: true };
  }

  return { success: false, error: "SESSION_NOT_FOUND", message: "Token sesi tidak valid atau belum terdaftar." };
}

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    var email = getEffectiveOwnerEmail();
    var masked = maskEmail(email);

    var action = (e && e.parameter && e.parameter.action) || "";
    var token = (e && e.parameter && e.parameter.token) || "";
    var deviceId = (e && e.parameter && e.parameter.device_id) || "browser";

    // Public verification & identification endpoints
    if (action === "identify") {
      if (!email || email.trim() === "") {
        return respondJSON({
          success: false,
          error: "EMAIL_NOT_AVAILABLE",
          message: "Google Account email tidak dapat diidentifikasi. Membutuhkan otorisasi."
        });
      }
      return respondJSON({ success: true, action: "identify", emailMasked: masked, services: { appsScript: true, googleSheets: !!ss, googleDrive: true } });
    }

    if (action === "health" || !action) {
      return respondJSON({
        status: "ok",
        message: "MicroMate Apps Script Gateway Active",
        services: {
          appsScript: true,
          googleSheets: !!ss,
          googleDrive: true
        },
        emailMasked: masked,
        timestamp: new Date().toISOString()
      });
    }

    // Untuk penarikan data (getAllAssets), lakukan otorisasi menggunakan Opaque Session Token
    var sessionCheck = validateSession(ss, token, deviceId);
    if (!sessionCheck.success) {
      return respondJSON({ success: false, error: sessionCheck.error, message: sessionCheck.message });
    }

    if (action === "getAllAssets" || action === "getAssets" || action === "fetchAll") {
      return handleGetAllAssets(ss);
    }

    return respondJSON({
      success: false,
      error: "INVALID_ACTION",
      message: "Action tidak didukung via GET."
    });
  } catch (err) {
    return respondJSON({
      success: false,
      error: "SERVER_ERROR",
      message: "Apps Script Runtime Error: " + err.toString()
    });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ success: false, error: "POST_BODY_EMPTY", message: "Request body tidak boleh kosong." });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || "syncAsset";
    const ss = getSpreadsheet();
    ensureVaultFolder();

    var email = getEffectiveOwnerEmail();
    var masked = maskEmail(email);
    var deviceId = data.device_id || "browser";

    // Endpoints Publik (Bypass Session Validation): identify, health, requestOtp, verifyOtp
    if (action === "identify") {
      if (!email || email.trim() === "") {
        return respondJSON({
          success: false,
          error: "EMAIL_NOT_AVAILABLE",
          message: "Email Google Account tidak teridentifikasi. Jalankan otorisasi di editor."
        });
      }
      return respondJSON({
        success: true,
        action: "identify",
        emailMasked: masked,
        services: { appsScript: true, googleSheets: !!ss, googleDrive: true }
      });
    }

    if (action === "health") {
      return respondJSON({
        status: "ok",
        success: true,
        services: { appsScript: true, googleSheets: !!ss, googleDrive: true },
        emailMasked: masked,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "requestOTP" || action === "requestOtp") {
      if (!email || email.trim() === "") {
        return respondJSON({ success: false, error: "EMAIL_NOT_AVAILABLE", message: "Google Account email pemilik Apps Script tidak teridentifikasi." });
      }

      var props = PropertiesService.getScriptProperties();
      
      // Keamanan Lockout: Periksa apakah email sedang diblokir sementara
      var blockUntil = parseInt(props.getProperty("OTP_BLOCKED_UNTIL") || "0", 10);
      var now = new Date().getTime();
      if (now < blockUntil) {
        var remainMinutes = Math.ceil((blockUntil - now) / (60 * 1000));
        return respondJSON({
          success: false,
          error: "SENDER_BLOCKED",
          message: "Email Anda diblokir sementara akibat terlalu banyak kegagalan OTP. Silakan tunggu " + remainMinutes + " menit lagi."
        });
      }

      // Cooldown Pengiriman: Batasan jeda antarkirim minimal 45 detik
      var lastTime = parseInt(props.getProperty("LAST_OTP_TIME") || "0", 10);
      if (now - lastTime < 45000) {
        var waitSec = Math.ceil((45000 - (now - lastTime)) / 1000);
        return respondJSON({
          success: false,
          error: "REQUEST_LIMIT_EXCEEDED",
          message: "Mohon tunggu " + waitSec + " detik sebelum meminta kode OTP baru.",
          waitSeconds: waitSec
        });
      }

      // Generate 6-digit OTP acak
      var otp = Math.floor(100000 + Math.random() * 900000).toString();
      props.setProperty("PENDING_OTP", otp);
      props.setProperty("OTP_EXPIRES", (now + 5 * 60 * 1000).toString()); // Berlaku 5 menit
      props.setProperty("OTP_ATTEMPTS", "0");
      props.setProperty("LAST_OTP_TIME", now.toString());

      try {
        MailApp.sendEmail({
          to: email,
          subject: "MicroMate - Kode Verifikasi Kepemilikan Gateway Cloud",
          body: "Halo,\\n\\nKode verifikasi MicroMate Anda adalah: " + otp + "\\n\\nKode ini berlaku selama 5 menit. Gunakan kode ini untuk memverifikasi bahwa Anda adalah pemilik akun Google yang menjalankan Apps Script Gateway ini.\\n\\nJika Anda tidak meminta kode ini, silakan abaikan email ini."
        });
        return respondJSON({
          success: true,
          action: "requestOtp",
          emailMasked: masked,
          expiresIn: 300,
          message: "Kode OTP 6-digit telah dikirim ke " + masked
        });
      } catch (mailErr) {
        var errStr = mailErr.toString();
        if (errStr.indexOf("script.send_mail") > -1 || errStr.indexOf("permission") > -1) {
          return respondJSON({
            success: false,
            error: "MAIL_PERMISSION_DENIED",
            message: "Izin pengiriman email (MailApp) belum diotorisasi di Apps Script. Buka Apps Script editor, jalankan fungsi 'testAuthAndEmail', lalu deploy ulang Web App Anda."
          });
        }
        return respondJSON({ success: false, error: "MAIL_FAILED", message: "Gagal mengirim email OTP: " + errStr });
      }
    }

    if (action === "verifyOTP" || action === "verifyOtp") {
      var props = PropertiesService.getScriptProperties();
      
      // Cek blokir lockout terlebih dahulu
      var blockUntil = parseInt(props.getProperty("OTP_BLOCKED_UNTIL") || "0", 10);
      var now = new Date().getTime();
      if (now < blockUntil) {
        var remainMinutes = Math.ceil((blockUntil - now) / (60 * 1000));
        return respondJSON({
          success: false,
          error: "SENDER_BLOCKED",
          message: "Gateway Anda dikunci sementara. Coba lagi dalam " + remainMinutes + " menit."
        });
      }

      var pendingOtp = props.getProperty("PENDING_OTP");
      var expires = parseInt(props.getProperty("OTP_EXPIRES") || "0", 10);
      var attempts = parseInt(props.getProperty("OTP_ATTEMPTS") || "0", 10);

      if (!pendingOtp) {
        return respondJSON({ success: false, error: "NO_PENDING_OTP", message: "Tidak ada kode OTP aktif. Silakan kirim kode verifikasi baru." });
      }

      if (now > expires) {
        props.deleteProperty("PENDING_OTP");
        props.deleteProperty("OTP_EXPIRES");
        props.deleteProperty("OTP_ATTEMPTS");
        return respondJSON({ success: false, error: "OTP_EXPIRED", message: "Kode OTP telah kedaluwarsa. Silakan minta kode baru." });
      }

      var userOtp = String(data.otp || "").trim();
      if (userOtp === pendingOtp) {
        // Hapus penanda OTP sementara
        props.deleteProperty("PENDING_OTP");
        props.deleteProperty("OTP_EXPIRES");
        props.deleteProperty("OTP_ATTEMPTS");

        // OTP Valid! Buat Opaque Bearer Token 256-bit acak
        var rawToken = "tok_" + Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
        var hash = sha256(rawToken);

        // Catat ke lembar Sessions
        var sessionSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SESSIONS);
        if (sessionSheet) {
          var createdAtStr = new Date().toISOString();
          var expiresAtStr = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 Hari TTL
          sessionSheet.appendRow([
            hash, 
            createdAtStr, 
            expiresAtStr, 
            createdAtStr, 
            deviceId, 
            "ACTIVE", 
            email
          ]);
        }

        return respondJSON({
          success: true,
          action: "verifyOtp",
          verified: true,
          session_token: rawToken, // Mengembalikan plaintext token ke browser
          emailMasked: masked,
          message: "Verifikasi kepemilikan berhasil! Sesi aktif dibuat."
        });
      } else {
        var newAttempts = attempts + 1;
        props.setProperty("OTP_ATTEMPTS", newAttempts.toString());
        var remaining = 5 - newAttempts;
        
        if (remaining <= 0) {
          // Lockout: Blokir pengiriman/verifikasi OTP selama 2 jam (7200 detik)
          var lockTime = now + 2 * 60 * 60 * 1000;
          props.setProperty("OTP_BLOCKED_UNTIL", lockTime.toString());
          props.deleteProperty("PENDING_OTP");
          props.deleteProperty("OTP_EXPIRES");
          props.deleteProperty("OTP_ATTEMPTS");
          return respondJSON({
            success: false,
            error: "MAX_ATTEMPTS_EXCEEDED",
            message: "Salah menginput OTP sebanyak 5 kali berturut-turut. Gateway dikunci selama 2 jam."
          });
        }
        return respondJSON({
          success: false,
          error: "OTP_INVALID",
          message: "Kode verifikasi salah. Sisa percobaan: " + remaining + " kali.",
          attemptsRemaining: remaining
        });
      }
    }

    // Untuk Seluruh Mutasi Data / Kueri Transaksi: Wajib Lolos Verifikasi Sesi
    var token = data.token || "";
    var sessionCheck = validateSession(ss, token, deviceId);
    if (!sessionCheck.success) {
      return respondJSON({ success: false, error: sessionCheck.error, message: sessionCheck.message });
    }

    // SERVER-SIDE MUTEX & IDEMPOTENCY DEDUPLICATION (Phase 2D Contract)
    var lock = LockService.getScriptLock();
    var lockAcquired = false;
    try {
      lockAcquired = lock.tryLock(20000); // 20s script lock to serialize mutations
    } catch(e) {}

    var mutationId = data.mutation_id || data.mutationId || (data.data && (data.data.mutation_id || data.data.mutationId)) || "";
    var sessionHash = sha256(token);

    // If mutation_id provided, check if it was already processed successfully
    if (mutationId && action !== "getAllAssets" && action !== "getAssets" && action !== "fetchAll" && action !== "pullAssets" && action !== "health") {
      var logSyncSheet = ss.getSheetByName(CONFIG.SHEET_NAME_LOG_SYNC);
      if (logSyncSheet) {
        var logValues = logSyncSheet.getDataRange().getValues();
        for (var li = 1; li < logValues.length; li++) {
          var rowMutId = String(logValues[li][7] || ""); // Column 8 is "Mutation ID"
          var rowStatus = String(logValues[li][5] || ""); // Column 6 is "Status"
          if (rowMutId === mutationId && rowStatus === "SUCCESS") {
            if (lockAcquired) {
              try { lock.releaseLock(); } catch(e) {}
            }
            return respondJSON({
              success: true,
              duplicated: true,
              mutation_id: mutationId,
              message: "Mutation already processed previously (Idempotent response)."
            });
          }
        }
      }
    }

    try {
      // Route actions ke Handler yang tepat
      if (action === "getAllAssets" || action === "getAssets" || action === "fetchAll" || action === "pullAssets") {
        return handleGetAllAssets(ss);
      } else if (action === "syncAsset" || action === "saveAsset") {
        return handleSyncAsset(ss, data.data || data.payload || data, mutationId, sessionHash, deviceId);
      } else if (action === "uploadFile" || action === "uploadDocument") {
        return handleUploadDocument(ss, data.data || data.payload || data, mutationId, sessionHash, deviceId);
      } else if (action === "syncMaintenance" || action === "addMaintenance") {
        return handleSyncMaintenance(ss, data.data || data.payload || data, mutationId, sessionHash, deviceId);
      } else if (action === "syncReminder" || action === "addReminder") {
        return handleSyncReminder(ss, data.data || data.payload || data, mutationId, sessionHash, deviceId);
      } else if (action === "deleteAsset") {
        return handleDeleteAsset(ss, data.data || data.payload || data, mutationId, sessionHash, deviceId);
      } else if (action === "getSessions" || action === "listSessions") {
        return handleGetSessions(ss, token);
      } else if (action === "revokeRemoteSession") {
        return handleRevokeRemoteSession(ss, token, (data.data && data.data.target_session_hash) || data.target_session_hash || data.session_hash);
      } else if (action === "revokeSession" || action === "disconnect") {
        return handleRevokeSession(ss, token);
      } else {
        return respondJSON({ success: false, error: "UNKNOWN_ACTION", message: "Aksi tidak dikenali: " + action });
      }
    } finally {
      if (lockAcquired) {
        try { lock.releaseLock(); } catch(e) {}
      }
    }
  } catch (err) {
    return respondJSON({ success: false, error: "SERVER_ERROR", message: err.toString() });
  }
}

function formatDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    var d = String(val.getDate());
    if (d.length < 2) d = "0" + d;
    return y + "-" + m + "-" + d;
  }
  var s = String(val).trim();
  if (!s) return "";
  if (s.indexOf("GMT") !== -1 || s.indexOf("T") !== -1) {
    try {
      var dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        var y2 = dt.getFullYear();
        var m2 = String(dt.getMonth() + 1);
        if (m2.length < 2) m2 = "0" + m2;
        var d2 = String(dt.getDate());
        if (d2.length < 2) d2 = "0" + d2;
        return y2 + "-" + m2 + "-" + d2;
      }
    } catch (e) {}
  }
  return s;
}

function findHeaderCol(headers, aliases) {
  var normalizedHeaders = headers.map(function(h) {
    return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  });
  for (var i = 0; i < aliases.length; i++) {
    var aliasNorm = String(aliases[i]).toLowerCase().replace(/[^a-z0-9]/g, "");
    var foundIdx = normalizedHeaders.indexOf(aliasNorm);
    if (foundIdx !== -1) return foundIdx;
  }
  return -1;
}

function handleGetAllAssets(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) return respondJSON({ success: false, error: "SPREADSHEET_NOT_FOUND", message: "Google Sheet tidak dapat diakses." });
  ensureSheetTabs(ss);

  var assetSheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS) || 
                   ss.getSheetByName("Aset") || 
                   ss.getSheetByName("Data Aset") || 
                   ss.getSheetByName("Assets") || 
                   ss.getSheetByName("Sheet1") || 
                   ss.getSheetByName("Lembar1") || 
                   ss.getSheets()[0];
                   
  var assetsRows = assetSheet ? assetSheet.getDataRange().getValues() : [];
  if (assetsRows.length <= 1) {
    return respondJSON({ success: true, assets: [], count: 0 });
  }
  
  // Ambil data sub-sheet terkait
  var servicesSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SERVICES);
  var servicesRows = servicesSheet ? servicesSheet.getDataRange().getValues() : [];
  
  var remindersSheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  var remindersRows = remindersSheet ? remindersSheet.getDataRange().getValues() : [];
  
  var documentsSheet = ss.getSheetByName(CONFIG.SHEET_NAME_DOCUMENTS);
  var documentsRows = documentsSheet ? documentsSheet.getDataRange().getValues() : [];
  
  var expensesSheet = ss.getSheetByName(CONFIG.SHEET_NAME_EXPENSES);
  var expensesRows = expensesSheet ? expensesSheet.getDataRange().getValues() : [];
  
  var historySheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSET_HISTORY);
  var historyRows = historySheet ? historySheet.getDataRange().getValues() : [];
  
  var simSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SIM_CARDS);
  var simRows = simSheet ? simSheet.getDataRange().getValues() : [];

  // Hubungkan data relasional dengan Map
  var servicesMap = {};
  var remindersMap = {};
  var documentsMap = {};
  var expensesMap = {};
  var historyMap = {};
  var simMap = {};

  // Map Services (Maintenance)
  if (servicesRows.length > 1) {
    var sHeaders = servicesRows[0].map(function(h) { return String(h).trim(); });
    var sIdCol = sHeaders.indexOf("Maintenance ID");
    var sAssetCol = sHeaders.indexOf("Asset ID");
    var sTypeCol = sHeaders.indexOf("Type");
    var sDateCol = sHeaders.indexOf("Date");
    var sMileageCol = sHeaders.indexOf("Mileage");
    var sCostCol = sHeaders.indexOf("Cost");
    var sProviderCol = sHeaders.indexOf("Provider");
    var sNotesCol = sHeaders.indexOf("Notes");
    
    for (var i = 1; i < servicesRows.length; i++) {
      var r = servicesRows[i];
      var assetId = String(r[sAssetCol]);
      if (!assetId) continue;
      if (!servicesMap[assetId]) servicesMap[assetId] = [];
      servicesMap[assetId].push({
        maintenance_id: String(r[sIdCol]),
        asset_id: assetId,
        type: String(r[sTypeCol]),
        date: formatDateStr(r[sDateCol]),
        mileage: r[sMileageCol] !== "" ? Number(r[sMileageCol]) : undefined,
        cost: Number(r[sCostCol]) || 0,
        provider: String(r[sProviderCol] || ""),
        notes: String(r[sNotesCol] || "")
      });
    }
  }

  // Map Reminders
  if (remindersRows.length > 1) {
    var rHeaders = remindersRows[0].map(function(h) { return String(h).trim(); });
    var rIdCol = rHeaders.indexOf("Reminder ID");
    var rAssetCol = rHeaders.indexOf("Asset ID");
    var rTypeCol = rHeaders.indexOf("Type");
    var rTitleCol = rHeaders.indexOf("Title");
    var rDueCol = rHeaders.indexOf("Due Date");
    var rRepeatCol = rHeaders.indexOf("Repeat Rule");
    var rStatusCol = rHeaders.indexOf("Status");
    var rCreatedCol = rHeaders.indexOf("Created At");
    var rUpdatedCol = rHeaders.indexOf("Updated At");
    
    for (var i = 1; i < remindersRows.length; i++) {
      var r = remindersRows[i];
      var assetId = String(r[rAssetCol]);
      if (!assetId) continue;
      if (!remindersMap[assetId]) remindersMap[assetId] = [];
      remindersMap[assetId].push({
        reminder_id: String(r[rIdCol]),
        asset_id: assetId,
        type: String(r[rTypeCol]),
        title: String(r[rTitleCol]),
        due_date: formatDateStr(r[rDueCol]),
        repeat_rule: String(r[rRepeatCol] || "none"),
        status: String(r[rStatusCol] || "upcoming"),
        created_at: String(r[rCreatedCol] || ""),
        updated_at: String(r[rUpdatedCol] || "")
      });
    }
  }

  // Map Documents
  if (documentsRows.length > 1) {
    var dHeaders = documentsRows[0].map(function(h) { return String(h).trim(); });
    var dIdCol = dHeaders.indexOf("Document ID");
    var dAssetCol = dHeaders.indexOf("Asset ID");
    var dTypeCol = dHeaders.indexOf("Type");
    var dNameCol = dHeaders.indexOf("Name");
    var dUrlCol = dHeaders.indexOf("File URL");
    var dCreatedCol = dHeaders.indexOf("Created At");
    var dDriveIdCol = dHeaders.indexOf("Drive File ID");
    var dMimeCol = dHeaders.indexOf("MIME Type");
    
    for (var i = 1; i < documentsRows.length; i++) {
      var r = documentsRows[i];
      var assetId = String(r[dAssetCol]);
      if (!assetId) continue;
      if (!documentsMap[assetId]) documentsMap[assetId] = [];
      var driveFileId = dDriveIdCol !== -1 ? String(r[dDriveIdCol] || "") : "";
      var fileUrl = String(r[dUrlCol] || "");
      var thumbUrl = driveFileId ? ("https://drive.google.com/thumbnail?id=" + driveFileId + "&sz=w400") : "";
      documentsMap[assetId].push({
        document_id: String(r[dIdCol]),
        asset_id: assetId,
        type: String(r[dTypeCol]),
        name: String(r[dNameCol]),
        file_url: fileUrl,
        drive_url: fileUrl,
        drive_file_id: driveFileId,
        thumbnail_url: thumbUrl,
        mime_type: dMimeCol !== -1 ? String(r[dMimeCol] || "") : "",
        created_at: String(r[dCreatedCol] || "")
      });
    }
  }

  // Map Expenses
  if (expensesRows.length > 1) {
    var eHeaders = expensesRows[0].map(function(h) { return String(h).trim(); });
    var eIdCol = eHeaders.indexOf("Expense ID");
    var eAssetCol = eHeaders.indexOf("Asset ID");
    var eTypeCol = eHeaders.indexOf("Type");
    var eAmountCol = eHeaders.indexOf("Amount");
    var eDateCol = eHeaders.indexOf("Date");
    var eDescCol = eHeaders.indexOf("Description");
    
    for (var i = 1; i < expensesRows.length; i++) {
      var r = expensesRows[i];
      var assetId = String(r[eAssetCol]);
      if (!assetId) continue;
      if (!expensesMap[assetId]) expensesMap[assetId] = [];
      expensesMap[assetId].push({
        expense_id: String(r[eIdCol]),
        asset_id: assetId,
        type: String(r[eTypeCol]),
        amount: Number(r[eAmountCol]) || 0,
        date: formatDateStr(r[eDateCol]),
        description: String(r[eDescCol] || "")
      });
    }
  }

  // Map History
  if (historyRows.length > 1) {
    var hHeaders = historyRows[0].map(function(h) { return String(h).trim(); });
    var hIdCol = hHeaders.indexOf("Event ID");
    var hAssetCol = hHeaders.indexOf("Asset ID");
    var hTimestampCol = hHeaders.indexOf("Timestamp");
    var hActionCol = hHeaders.indexOf("Action");
    var hFieldCol = hHeaders.indexOf("Field");
    var hOldCol = hHeaders.indexOf("Old Value");
    var hNewCol = hHeaders.indexOf("New Value");
    var hPerfCol = hHeaders.indexOf("Performed By");
    var hNotesCol = hHeaders.indexOf("Notes");
    
    for (var i = 1; i < historyRows.length; i++) {
      var r = historyRows[i];
      var assetId = String(r[hAssetCol]);
      if (!assetId) continue;
      if (!historyMap[assetId]) historyMap[assetId] = [];
      historyMap[assetId].push({
        event_id: String(r[hIdCol]),
        asset_id: assetId,
        timestamp: String(r[hTimestampCol]),
        action: String(r[hActionCol]),
        field: String(r[hFieldCol] || ""),
        old_value: String(r[hOldCol] || ""),
        new_value: String(r[hNewCol] || ""),
        performed_by: String(r[hPerfCol] || "Sistem"),
        notes: String(r[hNotesCol] || "")
      });
    }
  }

  // Map SIMCards
  if (simRows.length > 1) {
    var simHeaders = simRows[0].map(function(h) { return String(h).trim(); });
    var simIdCol = simHeaders.indexOf("SIM ID");
    var simAssetCol = simHeaders.indexOf("Asset ID");
    var simPhoneCol = simHeaders.indexOf("Phone Number");
    var simProvCol = simHeaders.indexOf("Provider");
    var simActiveCol = simHeaders.indexOf("Active Until");
    var simRegCol = simHeaders.indexOf("Registration Status");
    var simDepsCol = simHeaders.indexOf("Account Dependencies");
    
    for (var i = 1; i < simRows.length; i++) {
      var r = simRows[i];
      var assetId = String(r[simAssetCol]);
      if (!assetId) continue;
      
      var deps = [];
      try {
        var rawDeps = String(r[simDepsCol] || "[]");
        if (rawDeps.indexOf("[") === 0) {
          deps = JSON.parse(rawDeps);
        } else if (rawDeps) {
          deps = rawDeps.split(",").map(function(s) { return s.trim(); });
        }
      } catch (e) {}

      simMap[assetId] = {
        sim_id: String(r[simIdCol]),
        asset_id: assetId,
        phone_number: String(r[simPhoneCol]),
        provider: String(r[simProvCol]),
        active_until: formatDateStr(r[simActiveCol]),
        registration_status: String(r[simRegCol] || "unregistered"),
        account_dependencies: deps
      };
    }
  }

  // Gabungkan seluruhnya ke dalam Objek Aset final
  var assets = [];
  var aHeaders = assetsRows[0].map(function(h) { return String(h).trim(); });
  var aIdCol = findHeaderCol(aHeaders, ["Asset ID", "ID Aset", "ID", "asset_id", "AssetId", "Kode Aset"]);
  var aCategoryCol = findHeaderCol(aHeaders, ["Category", "Kategori", "Jenis Aset", "category", "Kategori Aset"]);
  var aNameCol = findHeaderCol(aHeaders, ["Name", "Nama", "Nama Aset", "name", "Nama Barang"]);
  var aBrandCol = findHeaderCol(aHeaders, ["Brand", "Merk", "Merek", "brand", "Pabrikan"]);
  var aModelCol = findHeaderCol(aHeaders, ["Model", "Tipe", "Model/Tipe", "model", "Varian"]);
  var aSNCol = findHeaderCol(aHeaders, ["Serial Number", "Serial No", "SN", "Nomor Seri", "No Seri", "Plat Nomor", "serial_number"]);
  var aPurDateCol = findHeaderCol(aHeaders, ["Purchase Date", "Tanggal Beli", "Tgl Beli", "Tanggal Pembelian", "purchase_date"]);
  var aPurPriceCol = findHeaderCol(aHeaders, ["Purchase Price", "Harga Beli", "Harga", "Nilai Aset", "purchase_price", "Biaya"]);
  var aLocationCol = findHeaderCol(aHeaders, ["Location", "Lokasi", "Penempatan", "Ruangan", "location"]);
  var aStatusCol = findHeaderCol(aHeaders, ["Status", "Kondisi", "status", "Status Aset"]);
  var aNotesCol = findHeaderCol(aHeaders, ["Notes", "Catatan", "Keterangan", "notes", "Deskripsi"]);
  var aPhotoCol = findHeaderCol(aHeaders, ["Photo URL", "Foto", "Foto URL", "photo_url", "Gambar", "Link Foto"]);
  var aUserCol = findHeaderCol(aHeaders, ["Assigned User", "Pengguna", "Penanggung Jawab", "PIC", "assigned_user", "User", "Pemilik"]);
  var aCreatedCol = findHeaderCol(aHeaders, ["Created At", "Dibuat Pada", "created_at"]);
  var aUpdatedCol = findHeaderCol(aHeaders, ["Updated At", "Diperbarui Pada", "updated_at"]);
  var aDeletedCol = findHeaderCol(aHeaders, ["Deleted", "Dihapus", "deleted"]);
  var aVehCol = findHeaderCol(aHeaders, ["Vehicle Details", "Detail Kendaraan", "vehicle_details"]);
  var aDevCol = findHeaderCol(aHeaders, ["Device Details", "Detail Perangkat", "device_details"]);
  var aWarrantyCol = findHeaderCol(aHeaders, ["Warranty", "Garansi", "Detail Garansi", "warranty"]);

  for (var i = 1; i < assetsRows.length; i++) {
    var r = assetsRows[i];
    var assetId = aIdCol !== -1 ? String(r[aIdCol] || "").trim() : "";
    var name = aNameCol !== -1 ? String(r[aNameCol] || "").trim() : "";
    var brand = aBrandCol !== -1 ? String(r[aBrandCol] || "").trim() : "";
    
    // Jika baris kosong sama sekali, lewati
    if (!assetId && !name && !brand) continue;
    
    if (!assetId) {
      assetId = "ast_" + (i + 1) + "_" + Math.random().toString(36).substring(2, 6);
    }
    
    var deleted = aDeletedCol !== -1 && (r[aDeletedCol] === true || String(r[aDeletedCol]).toLowerCase() === "true");
    if (deleted) continue; // Hilangkan jika soft-deleted

    // Normalisasi Kategori
    var rawCat = aCategoryCol !== -1 ? String(r[aCategoryCol] || "").toLowerCase().trim() : "";
    var category = "device";
    if (rawCat.indexOf("veh") !== -1 || rawCat.indexOf("motor") !== -1 || rawCat.indexOf("mobil") !== -1 || rawCat.indexOf("kendaraan") !== -1) {
      category = "vehicle";
    } else if (rawCat.indexOf("home") !== -1 || rawCat.indexOf("rumah") !== -1 || rawCat.indexOf("properti") !== -1 || rawCat.indexOf("ac") !== -1 || rawCat.indexOf("dapur") !== -1) {
      category = "home";
    } else if (rawCat.indexOf("cam") !== -1 || rawCat.indexOf("kamera") !== -1) {
      category = "camera";
    } else if (rawCat.indexOf("gam") !== -1 || rawCat.indexOf("game") !== -1 || rawCat.indexOf("konsol") !== -1) {
      category = "gaming";
    } else if (rawCat.indexOf("other") !== -1 || rawCat.indexOf("lain") !== -1) {
      category = "other";
    } else if (rawCat) {
      category = rawCat;
    }

    var model = aModelCol !== -1 ? String(r[aModelCol] || "") : "";
    var sn = aSNCol !== -1 ? String(r[aSNCol] || "") : "";
    var pDate = aPurDateCol !== -1 ? formatDateStr(r[aPurDateCol]) : "";
    var pPrice = aPurPriceCol !== -1 ? (Number(r[aPurPriceCol]) || 0) : 0;
    var loc = aLocationCol !== -1 ? String(r[aLocationCol] || "") : "";
    var status = aStatusCol !== -1 ? String(r[aStatusCol] || "active").toLowerCase() : "active";
    var notes = aNotesCol !== -1 ? String(r[aNotesCol] || "") : "";
    var rawPhotoUrl = aPhotoCol !== -1 ? String(r[aPhotoCol] || "").trim() : "";
    var photoUrl = "";

    // Normalisasi URL foto Google Drive jika ada
    if (rawPhotoUrl) {
      var driveIdMatch = rawPhotoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                          rawPhotoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                          rawPhotoUrl.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
      if (driveIdMatch && driveIdMatch[1]) {
        photoUrl = "https://drive.google.com/thumbnail?id=" + driveIdMatch[1] + "&sz=w1000";
      } else if (!rawPhotoUrl.indexOf("http") || rawPhotoUrl.indexOf("data:") === 0) {
        photoUrl = rawPhotoUrl;
      } else if (rawPhotoUrl.length >= 20 && rawPhotoUrl.indexOf("/") === -1) {
        photoUrl = "https://drive.google.com/thumbnail?id=" + rawPhotoUrl + "&sz=w1000";
      } else {
        photoUrl = rawPhotoUrl;
      }
    }

    // Fallback: Jika kolom Photo URL kosong, cari di daftar dokumen foto aset tersebut
    if (!photoUrl && documentsMap[assetId] && documentsMap[assetId].length > 0) {
      for (var d = 0; d < documentsMap[assetId].length; d++) {
        var docItem = documentsMap[assetId][d];
        var dType = String(docItem.type || "").toLowerCase();
        var dName = String(docItem.name || "").toLowerCase();
        var dMime = String(docItem.mime_type || "").toLowerCase();
        if (dType === "photo" || dType === "image" || dMime.indexOf("image/") === 0 || dName.match(/\.(jpg|jpeg|png|webp)$/i)) {
          photoUrl = docItem.thumbnail_url || docItem.file_url || docItem.drive_url || "";
          if (photoUrl) break;
        }
      }
    }

    var assignedUser = aUserCol !== -1 ? String(r[aUserCol] || "") : "";
    var createdAt = aCreatedCol !== -1 ? String(r[aCreatedCol] || "") : new Date().toISOString();
    var updatedAt = aUpdatedCol !== -1 ? String(r[aUpdatedCol] || "") : new Date().toISOString();

    var vehDetails = undefined;
    if (category === "vehicle" && aVehCol !== -1 && r[aVehCol]) {
      try { vehDetails = JSON.parse(String(r[aVehCol])); } catch (e) {}
    }

    var devDetails = undefined;
    if (category === "device" && aDevCol !== -1 && r[aDevCol]) {
      try { devDetails = JSON.parse(String(r[aDevCol])); } catch (e) {}
    }

    var warranty = undefined;
    if (aWarrantyCol !== -1 && r[aWarrantyCol]) {
      try { warranty = JSON.parse(String(r[aWarrantyCol])); } catch (e) {}
    }

    assets.push({
      asset_id: assetId,
      workspace_id: "ws_primary",
      category: category,
      name: name || (brand ? (brand + " " + model) : "Aset Tanpa Nama"),
      brand: brand,
      model: model,
      serial_number: sn,
      purchase_date: pDate,
      purchase_price: pPrice,
      location: loc,
      status: status,
      notes: notes,
      photo_url: photoUrl,
      assigned_user: assignedUser,
      created_at: createdAt,
      updated_at: updatedAt,
      vehicle_details: vehDetails,
      device_details: devDetails,
      sim_details: simMap[assetId],
      warranty: warranty,
      maintenance_records: servicesMap[assetId] || [],
      reminders: remindersMap[assetId] || [],
      documents: documentsMap[assetId] || [],
      expenses: expensesMap[assetId] || [],
      history: historyMap[assetId] || []
    });
  }

  return respondJSON({
    success: true,
    assets: assets,
    count: assets.length
  });
}

function syncSIMCard(ss, sim) {
  if (!sim || !sim.sim_id) return;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_SIM_CARDS);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(sim.sim_id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var deps = Array.isArray(sim.account_dependencies) ? JSON.stringify(sim.account_dependencies) : String(sim.account_dependencies || "[]");
  var rowData = [
    sim.sim_id,
    sim.asset_id,
    sim.phone_number || "",
    sim.provider || "",
    formatDateStr(sim.active_until),
    sim.registration_status || "unregistered",
    deps
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncServiceRecord(ss, rec) {
  if (!rec || (!rec.maintenance_id && !rec.id)) return;
  var id = rec.maintenance_id || rec.id;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_SERVICES);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    rec.asset_id,
    rec.type || "service",
    formatDateStr(rec.date),
    rec.mileage !== undefined && rec.mileage !== "" ? Number(rec.mileage) : "",
    typeof rec.cost === "number" ? rec.cost : (Number(rec.cost) || 0),
    rec.provider || "",
    rec.notes || ""
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncReminderRecord(ss, rem) {
  if (!rem || (!rem.reminder_id && !rem.id)) return;
  var id = rem.reminder_id || rem.id;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    rem.asset_id || "",
    rem.type || "custom",
    rem.title || "Pengingat",
    formatDateStr(rem.due_date || rem.dueDate),
    rem.repeat_rule || rem.repeatRule || "none",
    rem.status || "upcoming",
    rem.created_at || new Date().toISOString(),
    rem.updated_at || new Date().toISOString()
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncDocumentRecord(ss, doc) {
  if (!doc || (!doc.document_id && !doc.id)) return;
  var id = doc.document_id || doc.id;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_DOCUMENTS);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var existingFileUrl = "";
  var existingDriveFileId = "";
  var existingMutationId = "";
  var existingFingerprint = "";
  var existingSize = 0;
  var existingMime = "";

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIndex = i + 1;
      existingFileUrl = String(rows[i][4] || "");
      existingDriveFileId = String(rows[i][6] || "");
      existingMutationId = String(rows[i][7] || "");
      existingFingerprint = String(rows[i][8] || "");
      existingSize = Number(rows[i][9]) || 0;
      existingMime = String(rows[i][10] || "");
      break;
    }
  }
  
  var incomingUrl = doc.drive_url || doc.file_url || doc.fileUrl || "";
  // Do NOT overwrite existing valid URL with empty string or raw base64 data
  var finalFileUrl = (incomingUrl && incomingUrl.indexOf("data:") !== 0) ? incomingUrl : existingFileUrl;
  var finalDriveFileId = doc.drive_file_id || doc.driveFileId || existingDriveFileId;
  var finalMutationId = doc.mutation_id || doc.mutationId || existingMutationId;
  var finalFingerprint = doc.file_fingerprint || doc.fingerprint || existingFingerprint;
  var finalSize = doc.file_size || existingSize;
  var finalMime = doc.mime_type || existingMime;

  var rowData = [
    id,
    doc.asset_id,
    doc.type || doc.document_type || "other",
    doc.name || doc.file_name || "Dokumen",
    finalFileUrl,
    doc.created_at || new Date().toISOString(),
    finalDriveFileId,
    finalMutationId,
    finalFingerprint,
    finalSize,
    finalMime
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncExpenseRecord(ss, exp) {
  if (!exp || (!exp.expense_id && !exp.id)) return;
  var id = exp.expense_id || exp.id;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_EXPENSES);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    exp.asset_id,
    exp.type || "other",
    typeof exp.amount === "number" ? exp.amount : (Number(exp.amount) || 0),
    formatDateStr(exp.date),
    exp.description || ""
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncHistoryEvent(ss, evt) {
  if (!evt || (!evt.event_id && !evt.id)) return;
  var id = evt.event_id || evt.id;
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSET_HISTORY);
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    evt.asset_id,
    evt.timestamp || new Date().toISOString(),
    evt.action || "CREATED",
    evt.field || "",
    evt.old_value || "",
    evt.new_value || "",
    evt.performed_by || "Sistem",
    evt.notes || ""
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function writeLogSync(ss, action, assetCodeOrId, status, details, mutationId, sessionHash, deviceId) {
  try {
    if (!ss) ss = getSpreadsheet();
    ensureSheetTabs(ss);
    const logSheet = ss.getSheetByName(CONFIG.SHEET_NAME_LOG_SYNC);
    if (logSheet) {
      logSheet.appendRow([
        "LOG-" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        new Date().toISOString(),
        sessionHash || "-",
        deviceId || "-",
        action || "UNKNOWN",
        status || "INFO",
        assetCodeOrId || "-",
        mutationId || "-",
        details || ""
      ]);
    }
  } catch (err) {
    Logger.log("writeLogSync error: " + err);
  }
}

function handleSyncAsset(ss, asset, mutationId, sessionHash, deviceId) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) {
    return respondJSON({ success: false, error: "SPREADSHEET_NOT_FOUND", message: "Google Sheet tidak dapat diakses." });
  }
  ensureSheetTabs(ss);

  if (!asset) {
    return respondJSON({ success: false, error: "DATA_EMPTY", message: "Data aset tidak ditemukan" });
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  if (!sheet) {
    return respondJSON({ success: false, error: "ASSETS_SHEET_NOT_FOUND", message: "Tab Sheet Assets tidak ditemukan" });
  }
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  const targetId = asset.asset_id || asset.id;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(targetId)) {
      rowIndex = i + 1;
      break;
    }
  }

  const headers = rows[0].map(function(h) { return String(h).trim(); });
  const rowData = [];
  for (var k = 0; k < headers.length; k++) {
    rowData.push("");
  }

  function setVal(headerName, value) {
    var idx = headers.indexOf(headerName);
    if (idx !== -1) {
      rowData[idx] = value;
    }
  }

  var existingPhoto = "";
  if (rowIndex > 0) {
    var photoColIdx = headers.indexOf("Photo URL");
    if (photoColIdx !== -1) {
      existingPhoto = String(rows[rowIndex - 1][photoColIdx] || "");
    }
  }
  var incomingPhoto = asset.photo_url || "";
  var finalPhoto = existingPhoto;

  if (incomingPhoto) {
    if (incomingPhoto.indexOf("data:") === 0) {
      try {
        var base64Parts = incomingPhoto.split(",");
        var metaPart = base64Parts[0] || "";
        var rawData = base64Parts[1] || "";
        var mimeTypeMatch = metaPart.match(/data:([^;]+);/);
        var mime = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        var decodedBytes = Utilities.base64Decode(rawData);
        var blob = Utilities.newBlob(decodedBytes, mime, "photo_" + (targetId || "asset") + "_" + Date.now() + ".jpg");
        
        var targetFolder = getOrCreateFolderHierarchy(targetId, "Photos");
        var driveFile = targetFolder.createFile(blob);
        try { driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        finalPhoto = "https://drive.google.com/thumbnail?id=" + driveFile.getId() + "&sz=w1000";
      } catch (err) {
        finalPhoto = existingPhoto || (incomingPhoto.length < 50000 ? incomingPhoto : "");
      }
    } else {
      finalPhoto = incomingPhoto;
    }
  }

  // Fallback ke foto dari dokumen jika ada
  if (!finalPhoto && asset.documents && Array.isArray(asset.documents)) {
    for (var d = 0; d < asset.documents.length; d++) {
      var dItem = asset.documents[d];
      var dType = String(dItem.type || "").toLowerCase();
      var dUrl = dItem.file_url || dItem.drive_url || dItem.thumbnail_url;
      if ((dType === "photo" || dType === "image") && dUrl) {
        finalPhoto = dUrl;
        break;
      }
    }
  }

  setVal("Asset ID", targetId || ("AST-" + Date.now()));
  setVal("Asset Code", asset.asset_code || asset.assetCode || asset.serial_number || asset.serialNumber || "");
  setVal("Category", asset.category || "Umum");
  setVal("Name", asset.name || "Aset Tanpa Nama");
  setVal("Brand", asset.brand || "");
  setVal("Model", asset.model || "");
  setVal("Serial Number", asset.serial_number || asset.serialNumber || asset.asset_code || asset.assetCode || "Tidak memiliki S/N");
  setVal("Purchase Date", formatDateStr(asset.purchase_date || asset.purchaseDate));
  setVal("Purchase Price", typeof asset.purchase_price === "number" ? asset.purchase_price : (Number(asset.purchase_price) || Number(asset.purchasePrice) || 0));
  setVal("Location", asset.location || "");
  setVal("Status", asset.status || "active");
  setVal("Notes", asset.notes || "");
  setVal("Photo URL", finalPhoto);
  setVal("Assigned User", asset.assigned_user || asset.assignedUser || "");
  setVal("Created At", asset.created_at || new Date().toISOString());
  setVal("Updated At", new Date().toISOString());
  setVal("Deleted", asset.deleted === true || String(asset.deleted).toLowerCase() === "true" ? "TRUE" : "FALSE");
  setVal("Vehicle Details", asset.vehicle_details ? (typeof asset.vehicle_details === "string" ? asset.vehicle_details : JSON.stringify(asset.vehicle_details)) : "");
  setVal("Device Details", asset.device_details ? (typeof asset.device_details === "string" ? asset.device_details : JSON.stringify(asset.device_details)) : "");
  setVal("Warranty", asset.warranty ? (typeof asset.warranty === "string" ? JSON.stringify({ end_date: asset.warranty }) : JSON.stringify(asset.warranty)) : "");

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // Sinkronisasi seluruh sub-rekonsiliasi relasional secara transaksional
  if (asset.sim_details) {
    syncSIMCard(ss, asset.sim_details);
  }
  if (asset.maintenance_records && Array.isArray(asset.maintenance_records)) {
    asset.maintenance_records.forEach(function(rec) { syncServiceRecord(ss, rec); });
  }
  if (asset.reminders && Array.isArray(asset.reminders)) {
    asset.reminders.forEach(function(rem) { syncReminderRecord(ss, rem); });
  }
  if (asset.documents && Array.isArray(asset.documents)) {
    asset.documents.forEach(function(doc) { syncDocumentRecord(ss, doc); });
  }
  if (asset.expenses && Array.isArray(asset.expenses)) {
    asset.expenses.forEach(function(exp) { syncExpenseRecord(ss, exp); });
  }
  if (asset.history && Array.isArray(asset.history)) {
    asset.history.forEach(function(evt) { syncHistoryEvent(ss, evt); });
  }

  writeLogSync(ss, "SAVE_ASSET", targetId, "SUCCESS", "Asset metadata and sub-records synced successfully.", mutationId, sessionHash, deviceId);

  return respondJSON({ success: true, asset_id: targetId, row: rowIndex > 0 ? rowIndex : sheet.getLastRow(), mutation_id: mutationId });
}

function handleSyncMaintenance(ss, record, mutationId, sessionHash, deviceId) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  if (!record || !record.asset_id) {
    return respondJSON({ success: false, error: "INVALID_RECORD", message: "Record maintenance tidak valid" });
  }

  syncServiceRecord(ss, record);
  writeLogSync(ss, "SYNC_MAINTENANCE", record.maintenance_id || record.asset_id, "SUCCESS", "Maintenance record synced.", mutationId, sessionHash, deviceId);
  return respondJSON({ success: true, log_id: record.maintenance_id || record.id, mutation_id: mutationId });
}

function handleSyncReminder(ss, reminder, mutationId, sessionHash, deviceId) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  if (!reminder || !reminder.asset_id) {
    return respondJSON({ success: false, error: "INVALID_REMINDER", message: "Reminder tidak valid" });
  }

  syncReminderRecord(ss, reminder);
  writeLogSync(ss, "SYNC_REMINDER", reminder.reminder_id || reminder.asset_id, "SUCCESS", "Reminder synced.", mutationId, sessionHash, deviceId);
  return respondJSON({ success: true, reminder_id: reminder.reminder_id || reminder.id, mutation_id: mutationId });
}

function handleDeleteAsset(ss, payload, mutationId, sessionHash, deviceId) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  const assetId = typeof payload === "string" ? payload : (payload.asset_id || payload.id);
  if (!assetId) {
    return respondJSON({ success: false, error: "ASSET_ID_REQUIRED", message: "Asset ID tidak ditemukan" });
  }

  // Tulis ke sheet DeletedAssets (Tombstone) untuk sinkronisasi penghapusan multi-perangkat
  var tombstoneSheet = ss.getSheetByName(CONFIG.SHEET_NAME_DELETED_ASSETS);
  if (tombstoneSheet) {
    tombstoneSheet.appendRow([assetId, new Date().toISOString()]);
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  const rows = sheet.getDataRange().getValues();

  let assetCode = assetId;
  let deleted = false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(assetId)) {
      assetCode = String(rows[i][1] || assetId);
      // Soft-Delete atau Hard-Delete (Gunakan Soft-delete untuk replikasi sinkronisasi, set Deleted = "TRUE")
      sheet.getRange(i + 1, 16).setValue("TRUE"); // Kolom 16 adalah "Deleted"
      deleted = true;
      break;
    }
  }

  // Bersihkan juga relasi-relasinya demi kebersihan penyimpanan
  try {
    const simSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SIM_CARDS);
    if (simSheet) {
      const sRows = simSheet.getDataRange().getValues();
      for (let s = sRows.length - 1; s >= 1; s--) {
        if (String(sRows[s][1]) === String(assetId)) {
          simSheet.deleteRow(s + 1);
        }
      }
    }

    const servicesSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SERVICES);
    if (servicesSheet) {
      const mRows = servicesSheet.getDataRange().getValues();
      for (let m = mRows.length - 1; m >= 1; m--) {
        if (String(mRows[m][1]) === String(assetId)) {
          servicesSheet.deleteRow(m + 1);
        }
      }
    }

    const remSheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
    if (remSheet) {
      const rRows = remSheet.getDataRange().getValues();
      for (let r = rRows.length - 1; r >= 1; r--) {
        if (String(rRows[r][1]) === String(assetId)) {
          remSheet.deleteRow(r + 1);
        }
      }
    }
  } catch (relErr) {
    Logger.log("Error cleaning related sheets: " + relErr);
  }

  // Drive Folder Trash Cleanup: Pindahkan folder aset ke Drive trash
  try {
    const rootFolders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    if (rootFolders.hasNext()) {
      const rootFolder = rootFolders.next();
      const assetsFolders = rootFolder.getFoldersByName("Assets");
      if (assetsFolders.hasNext()) {
        const assetsFolder = assetsFolders.next();
        const targetAssetFolders = assetsFolder.getFoldersByName(assetCode);
        while (targetAssetFolders.hasNext()) {
          const targetFolder = targetAssetFolders.next();
          targetFolder.setTrashed(true);
        }
        if (assetCode !== assetId) {
          const targetAssetFolders2 = assetsFolder.getFoldersByName(assetId);
          while (targetAssetFolders2.hasNext()) {
            const targetFolder2 = targetAssetFolders2.next();
            targetFolder2.setTrashed(true);
          }
        }
      }
    }
  } catch (err) {
    Logger.log("Error moving asset folder to trash: " + err);
  }

  writeLogSync(ss, "DELETE_ASSET", assetCode || assetId, "SUCCESS", "Asset tombstone registered.", mutationId, sessionHash, deviceId);

  return respondJSON({ success: true, deleted_id: assetId, mutation_id: mutationId });
}

function handleUploadDocument(ss, payload, mutationId, sessionHash, deviceId) {
  const asset_id = payload.asset_id;
  const asset_code = payload.asset_code || asset_id;
  const document_id = payload.document_id || payload.id || ("DOC-" + Date.now());
  const file_name = payload.file_name || payload.name || ("file_" + Date.now());
  const mime_type = payload.mime_type || "application/octet-stream";
  const file_category = payload.file_category || payload.document_type || "document";
  const file_size = Number(payload.file_size) || 0;
  const file_fingerprint = payload.file_fingerprint || payload.fingerprint || "";
  const base64_data = payload.base64_data;

  if (!asset_id) {
    return respondJSON({ success: false, error: "ASSET_ID_REQUIRED", message: "asset_id wajib diisi untuk upload file" });
  }

  // Gateway Deduplication: Check if this document_id and fingerprint already exist in Documents sheet
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);
  const docSheet = ss.getSheetByName(CONFIG.SHEET_NAME_DOCUMENTS);
  if (docSheet && file_fingerprint) {
    const docRows = docSheet.getDataRange().getValues();
    for (var d = 1; d < docRows.length; d++) {
      var rowDocId = String(docRows[d][0] || "");
      var rowAssetId = String(docRows[d][1] || "");
      var rowFileUrl = String(docRows[d][4] || "");
      var rowDriveFileId = String(docRows[d][6] || "");
      var rowFingerprint = String(docRows[d][8] || "");
      
      if (rowAssetId === asset_id && (rowDocId === document_id || rowFingerprint === file_fingerprint) && rowDriveFileId) {
        return respondJSON({
          success: true,
          duplicated: true,
          document_id: document_id,
          mutation_id: mutationId,
          drive_file_id: rowDriveFileId,
          drive_url: rowFileUrl,
          download_url: "https://drive.google.com/uc?export=download&id=" + rowDriveFileId,
          thumbnail_url: "https://drive.google.com/thumbnail?id=" + rowDriveFileId + "&sz=w400",
          file_fingerprint: rowFingerprint || file_fingerprint,
          message: "Matching Document Drive file found via Gateway deduplication."
        });
      }
    }
  }

  let catFolder = null;
  try {
    const rootFolders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    const rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);

    const assetsFolders = rootFolder.getFoldersByName("Assets");
    const assetsFolder = assetsFolders.hasNext() ? assetsFolders.next() : rootFolder.createFolder("Assets");

    const targetAssetFolders = assetsFolder.getFoldersByName(asset_code);
    const targetAssetFolder = targetAssetFolders.hasNext() ? targetAssetFolders.next() : assetsFolder.createFolder(asset_code);

    const categoryFolderName = file_category === "photo" ? "Photos" : "Documents";
    const catFolders = targetAssetFolder.getFoldersByName(categoryFolderName);
    catFolder = catFolders.hasNext() ? catFolders.next() : targetAssetFolder.createFolder(categoryFolderName);
  } catch (err) {
    return respondJSON({ success: false, error: "FOLDER_CREATION_FAILED", message: "Gagal membuat folder di Google Drive: " + err.toString() });
  }

  if (!base64_data || typeof base64_data !== "string") {
    return respondJSON({ success: true, message: "Folder terbuat, tidak ada data file base64" });
  }

  if (base64_data.indexOf("http://") === 0 || base64_data.indexOf("https://") === 0) {
    if (docSheet) {
      docSheet.appendRow([
        document_id,
        asset_id,
        file_category,
        file_name,
        base64_data,
        new Date().toISOString(),
        "",
        mutationId || "",
        file_fingerprint || "",
        file_size,
        mime_type
      ]);
    }
    return respondJSON({ success: true, file_url: base64_data, document_id: document_id, mutation_id: mutationId });
  }

  try {
    const rawData = base64_data.indexOf(",") > -1 ? base64_data.split(",")[1] : base64_data;
    const decodedData = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(decodedData, mime_type, file_name);
    const file = catFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Embed Canonical Properties on the Drive Object
    try {
      file.setDescription(JSON.stringify({
        document_id: document_id,
        mutation_id: mutationId || "",
        file_fingerprint: file_fingerprint || "",
        asset_id: asset_id,
        created_at: new Date().toISOString()
      }));
    } catch(descErr) {}

    const fileId = file.getId();
    const driveUrl = file.getUrl();
    const downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
    const thumbnailUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";

    if (docSheet) {
      docSheet.appendRow([
        document_id,
        asset_id,
        file_category,
        file_name,
        driveUrl,
        new Date().toISOString(),
        fileId,
        mutationId || "",
        file_fingerprint || "",
        file_size,
        mime_type
      ]);
    }

    // Jika file yang diunggah adalah foto, update juga kolom Photo URL pada sheet Assets jika masih kosong
    if (file_category === "photo" || mime_type.indexOf("image/") === 0) {
      try {
        var assetSheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
        if (assetSheet) {
          var aRows = assetSheet.getDataRange().getValues();
          if (aRows && aRows.length > 1) {
            var aHeaders = aRows[0].map(function(h) { return String(h).trim(); });
            var aIdIdx = aHeaders.indexOf("Asset ID");
            var aPhotoIdx = aHeaders.indexOf("Photo URL");
            if (aIdIdx !== -1 && aPhotoIdx !== -1) {
              for (var ai = 1; ai < aRows.length; ai++) {
                if (String(aRows[ai][aIdIdx]).trim() === String(asset_id).trim()) {
                  var currentPhoto = String(aRows[ai][aPhotoIdx] || "").trim();
                  if (!currentPhoto || currentPhoto.indexOf("data:") === 0) {
                    var directPhotoUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
                    assetSheet.getRange(ai + 1, aPhotoIdx + 1).setValue(directPhotoUrl);
                  }
                  break;
                }
              }
            }
          }
        }
      } catch (assetPhotoErr) {}
    }

    writeLogSync(ss, "UPLOAD_DOCUMENT", asset_id, "SUCCESS", "Uploaded file: " + file_name + " (" + fileId + ")", mutationId, sessionHash, deviceId);

    return respondJSON({
      success: true,
      duplicated: false,
      document_id: document_id,
      mutation_id: mutationId,
      drive_file_id: fileId,
      drive_url: driveUrl,
      download_url: downloadUrl,
      thumbnail_url: thumbnailUrl,
      file_fingerprint: file_fingerprint
    });
  } catch (err) {
    writeLogSync(ss, "UPLOAD_DOCUMENT", asset_id, "ERROR", "Drive upload error: " + err.toString(), mutationId, sessionHash, deviceId);
    return respondJSON({ success: false, error: "UPLOAD_BLOB_FAILED", message: "Drive Blob Upload error: " + err.toString() });
  }
}

function handleRevokeSession(ss, token) {
  if (!token) return respondJSON({ success: false, error: "TOKEN_REQUIRED", message: "Token diperlukan untuk pencabutan." });
  var hash = sha256(token);
  var sessionSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SESSIONS);
  if (!sessionSheet) return respondJSON({ success: false, error: "SESSIONS_SHEET_NOT_FOUND", message: "Tabel sesi tidak ditemukan." });
  
  var rows = sessionSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === hash) {
      sessionSheet.getRange(i + 1, 6).setValue("REVOKED"); // Kolom 6 adalah "Status"
      break;
    }
  }
  return respondJSON({ success: true, message: "Sesi berhasil dicabut dan diputuskan." });
}

function handleGetSessions(ss, currentToken) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  var sessionSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SESSIONS);
  if (!sessionSheet) return respondJSON({ success: true, sessions: [] });

  var currentHash = currentToken ? sha256(currentToken) : "";
  var rows = sessionSheet.getDataRange().getValues();
  if (rows.length <= 1) return respondJSON({ success: true, sessions: [] });

  var headers = rows[0].map(function(h) { return String(h).trim(); });
  var idxHash = headers.indexOf("Session Hash");
  var idxCreated = headers.indexOf("Created At");
  var idxExpires = headers.indexOf("Expires At");
  var idxLastUsed = headers.indexOf("Last Used At");
  var idxDevice = headers.indexOf("Device ID");
  var idxStatus = headers.indexOf("Status");
  var idxEmail = headers.indexOf("Paired Email");

  var sessions = [];
  var now = new Date().getTime();

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var sHash = String(r[idxHash] || "");
    if (!sHash) continue;

    var status = String(r[idxStatus] || "ACTIVE");
    var expiresAtTime = new Date(r[idxExpires]).getTime();
    if (status === "ACTIVE" && now > expiresAtTime) {
      status = "EXPIRED";
    }

    sessions.push({
      session_hash: sHash.substring(0, 12) + "...", // Masked session hash for security
      full_hash: sHash,
      device_id: String(r[idxDevice] || "Unknown Device"),
      created_at: String(r[idxCreated] || ""),
      expires_at: String(r[idxExpires] || ""),
      last_used_at: String(r[idxLastUsed] || ""),
      status: status,
      paired_email: maskEmail(String(r[idxEmail] || "")),
      is_current: sHash === currentHash
    });
  }

  // Sort sessions: Current first, then newest created
  sessions.sort(function(a, b) {
    if (a.is_current) return -1;
    if (b.is_current) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return respondJSON({ success: true, sessions: sessions });
}

function handleRevokeRemoteSession(ss, currentToken, targetHash) {
  if (!targetHash) return respondJSON({ success: false, error: "TARGET_HASH_REQUIRED", message: "Target hash sesi diperlukan." });
  if (!ss) ss = getSpreadsheet();
  var sessionSheet = ss.getSheetByName(CONFIG.SHEET_NAME_SESSIONS);
  if (!sessionSheet) return respondJSON({ success: false, error: "SESSIONS_SHEET_NOT_FOUND", message: "Tabel sesi tidak ditemukan." });

  var rows = sessionSheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h).trim(); });
  var idxHash = headers.indexOf("Session Hash");
  var idxStatus = headers.indexOf("Status");

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    var rowHash = String(rows[i][idxHash] || "");
    if (rowHash === targetHash || rowHash.indexOf(targetHash) === 0) {
      sessionSheet.getRange(i + 1, idxStatus + 1).setValue("REVOKED");
      found = true;
      break;
    }
  }

  if (!found) {
    return respondJSON({ success: false, error: "SESSION_NOT_FOUND", message: "Sesi target tidak ditemukan." });
  }

  return respondJSON({ success: true, message: "Sesi perangkat jarak jauh berhasil diputuskan." });
}

function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * UTILITY & AUTHORIZATION HELPER
 * Jalankan fungsi ini 1x di Apps Script Editor jika muncul pesan kesalahan izin OAuth
 * untuk memicu dialog Review Permissions Google.
 */
function testAuthAndEmail() {
  var email = getEffectiveOwnerEmail();
  var masked = maskEmail(email);
  Logger.log("Effective User Email: " + email + " (Masked: " + masked + ")");
  
  try {
    var root = DriveApp.getRootFolder();
    Logger.log("Google Drive access verified: Root folder ID = " + root.getId());
  } catch(e) {
    Logger.log("Google Drive verification error: " + e.toString());
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Google Sheets access verified: Spreadsheet Name = " + ss.getName());
  } catch(e) {
    Logger.log("Google Sheets verification error: " + e.toString());
  }

  if (email) {
    MailApp.sendEmail({
      to: email,
      subject: "MicroMate - Otorisasi Apps Script Berhasil",
      body: "Otorisasi izin Google Apps Script untuk MicroMate (termasuk Google Drive & Google Sheets) telah berhasil diaktifkan."
    });
    Logger.log("Test email dikirim ke " + email);
  }
  return "OK: Permissions authorized for " + masked;
}
`;
