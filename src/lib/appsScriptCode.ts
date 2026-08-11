/**
 * MICROMATE CLOUD GATEWAY - GOOGLE APPS SCRIPT (v1.3 - Enterprise Sync)
 * Menangani pembuatan tab sheet otomatis, simpan metadata ke Google Sheets,
 * serta upload file/foto dokumen ke Google Drive.
 */

export const APPS_SCRIPT_CODE = `/**
 * MICROMATE CLOUD GATEWAY - GOOGLE APPS SCRIPT (v1.3 - Enterprise Sync)
 * Menangani pembuatan tab sheet otomatis, simpan metadata ke Google Sheets,
 * serta upload file/foto dokumen ke Google Drive.
 */

const CONFIG = {
  ROOT_FOLDER_NAME: "MicroMate",
  SHEET_NAME_ASSETS: "Assets",
  SHEET_NAME_FILES: "AssetFiles",
  SHEET_NAME_MAINTENANCE: "Maintenance",
  SHEET_NAME_REMINDERS: "Reminders"
};

/** Otomatis membuat seluruh Tab Sheet & Header Kolom jika belum ada */
function ensureSheetTabs(ss) {
  if (!ss) return;

  const tabsConfig = [
    {
      name: CONFIG.SHEET_NAME_ASSETS,
      headers: [
        "Asset ID", 
        "Asset Code", 
        "Name", 
        "Category", 
        "Brand", 
        "Model", 
        "Serial Number", 
        "Purchase Date", 
        "Purchase Price", 
        "Status", 
        "Warranty End Date", 
        "Warranty Provider", 
        "Assigned User", 
        "Purchase Location", 
        "Notes", 
        "Device Details", 
        "Vehicle Details", 
        "Updated At"
      ]
    },
    {
      name: CONFIG.SHEET_NAME_FILES,
      headers: ["File ID", "Asset ID", "File Name", "File Type", "Category", "File Size", "Drive File ID", "View URL", "Download URL", "Uploaded At"]
    },
    {
      name: CONFIG.SHEET_NAME_MAINTENANCE,
      headers: ["Log ID", "Asset ID", "Service Type", "Service Date", "Cost", "Provider", "Notes", "Created At"]
    },
    {
      name: CONFIG.SHEET_NAME_REMINDERS,
      headers: ["Reminder ID", "Asset ID", "Title", "Due Date", "Status", "Notes", "Created At"]
    }
  ];

  tabsConfig.forEach(function(tab) {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
      sheet.appendRow(tab.headers);
      sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight("bold").setBackground("#d1fae5");
      sheet.setFrozenRows(1);
    } else if (tab.name === CONFIG.SHEET_NAME_ASSETS) {
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
    ss = SpreadsheetApp.create("MicroMate Database");
  }

  ensureSheetTabs(ss);
  ensureVaultFolder();
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

function doGet(e) {
  const ss = getSpreadsheet();
  ensureVaultFolder();

  if (!validateAccessToken(e, null)) {
    return respondJSON({ success: false, error: "Unauthorized: Access Token tidak valid" });
  }

  var email = getEffectiveOwnerEmail();
  var masked = maskEmail(email);

  if (e && e.parameter && e.parameter.action === "identify") {
    if (!email || email.trim() === "") {
      return respondJSON({
        success: false,
        error: "EMAIL_NOT_AVAILABLE",
        message: "Google Account email tidak dapat diidentifikasi. Membutuhkan izin 'https://www.googleapis.com/auth/userinfo.email'. Pastikan Anda menguji/menjalankan script minimal sekali di Editor dan meng-authorize izin saat deploy."
      });
    }
    return respondJSON({ success: true, action: "identify", emailMasked: masked, services: { appsScript: true, googleSheets: !!ss, googleDrive: true } });
  }

  if (e && e.parameter && (e.parameter.action === "getAllAssets" || e.parameter.action === "getAssets" || e.parameter.action === "fetchAll")) {
    return handleGetAllAssets(ss);
  }

  if (e && e.parameter && e.parameter.action === "getOwnerInfo") {
    return respondJSON({ success: true, ownerEmail: email, emailMasked: masked });
  }

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

function validateAccessToken(e, postData) {
  var secretToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
  if (!secretToken || secretToken.trim() === "") {
    return true;
  }
  var providedToken = "";
  if (e && e.parameter && e.parameter.token) {
    providedToken = e.parameter.token;
  } else if (postData && postData.token) {
    providedToken = postData.token;
  }
  return providedToken === secretToken;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ success: false, error: "POST body kosong atau request tidak valid" });
    }

    const data = JSON.parse(e.postData.contents);
    
    if (!validateAccessToken(e, data)) {
      return respondJSON({ success: false, error: "Unauthorized: Access Token tidak valid" });
    }

    const action = data.action || "syncAsset";
    const ss = getSpreadsheet();
    ensureVaultFolder();

    var email = getEffectiveOwnerEmail();
    var masked = maskEmail(email);

    if (action === "identify") {
      if (!email || email.trim() === "") {
        return respondJSON({
          success: false,
          error: "EMAIL_NOT_AVAILABLE",
          message: "Google Account email pemilik Apps Script tidak dapat diidentifikasi (Izin userinfo.email diperlukan). Silakan jalankan salah satu fungsi di Apps Script Editor & berikan otorisasi akses."
        });
      }
      return respondJSON({
        success: true,
        action: "identify",
        emailMasked: masked,
        services: {
          appsScript: true,
          googleSheets: !!ss,
          googleDrive: true
        }
      });
    }

    if (action === "health") {
      return respondJSON({
        status: "ok",
        success: true,
        services: {
          appsScript: true,
          googleSheets: !!ss,
          googleDrive: true
        },
        emailMasked: masked,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "requestOTP" || action === "requestOtp") {
      if (!email || email.trim() === "") {
        return respondJSON({ success: false, error: "EMAIL_NOT_AVAILABLE", message: "Google Account email pemilik Apps Script tidak teridentifikasi." });
      }

      var props = PropertiesService.getScriptProperties();
      var lastTime = parseInt(props.getProperty("LAST_OTP_TIME") || "0", 10);
      var now = new Date().getTime();
      if (now - lastTime < 45000) {
        var waitSec = Math.ceil((45000 - (now - lastTime)) / 1000);
        return respondJSON({
          success: false,
          error: "REQUEST_LIMIT_EXCEEDED",
          message: "Harap tunggu " + waitSec + " detik sebelum meminta kode OTP baru.",
          waitSeconds: waitSec
        });
      }

      var otp = Math.floor(100000 + Math.random() * 900000).toString();
      props.setProperty("PENDING_OTP", otp);
      props.setProperty("OTP_EXPIRES", (now + 5 * 60 * 1000).toString());
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
            message: "Izin pengiriman email (MailApp) belum diotorisasi di Apps Script. Silakan buka Apps Script Editor, pilih & jalankan fungsi 'testAuthAndEmail', klik 'Review Permissions', lalu deploy Web App Anda."
          });
        }
        return respondJSON({
          success: false,
          error: "MAIL_FAILED",
          message: "Gagal mengirim email OTP: " + errStr
        });
      }
    }

    if (action === "verifyOTP" || action === "verifyOtp") {
      var props = PropertiesService.getScriptProperties();
      var pendingOtp = props.getProperty("PENDING_OTP");
      var expires = parseInt(props.getProperty("OTP_EXPIRES") || "0", 10);
      var attempts = parseInt(props.getProperty("OTP_ATTEMPTS") || "0", 10);
      var now = new Date().getTime();

      if (!pendingOtp) {
        return respondJSON({
          success: false,
          error: "NO_PENDING_OTP",
          message: "Tidak ada kode OTP aktif. Silakan minta kode verifikasi baru."
        });
      }

      if (now > expires) {
        props.deleteProperty("PENDING_OTP");
        props.deleteProperty("OTP_EXPIRES");
        props.deleteProperty("OTP_ATTEMPTS");
        return respondJSON({
          success: false,
          error: "OTP_EXPIRED",
          message: "Kode OTP telah kedaluwarsa (berlaku 5 menit). Silakan minta kode baru."
        });
      }

      if (attempts >= 5) {
        props.deleteProperty("PENDING_OTP");
        props.deleteProperty("OTP_EXPIRES");
        props.deleteProperty("OTP_ATTEMPTS");
        return respondJSON({
          success: false,
          error: "MAX_ATTEMPTS_EXCEEDED",
          message: "Batas percobaan OTP terlampaui (maksimal 5x). Silakan minta kode OTP baru."
        });
      }

      var userOtp = String(data.otp || "").trim();
      if (userOtp === pendingOtp) {
        props.deleteProperty("PENDING_OTP");
        props.deleteProperty("OTP_EXPIRES");
        props.deleteProperty("OTP_ATTEMPTS");
        return respondJSON({
          success: true,
          action: "verifyOtp",
          verified: true,
          emailMasked: masked,
          message: "Verifikasi kepemilikan email berhasil!"
        });
      } else {
        var newAttempts = attempts + 1;
        props.setProperty("OTP_ATTEMPTS", newAttempts.toString());
        var remaining = 5 - newAttempts;
        if (remaining <= 0) {
          props.deleteProperty("PENDING_OTP");
          props.deleteProperty("OTP_EXPIRES");
          props.deleteProperty("OTP_ATTEMPTS");
          return respondJSON({
            success: false,
            error: "MAX_ATTEMPTS_EXCEEDED",
            message: "Batas percobaan OTP terlampaui. Silakan minta kode OTP baru."
          });
        }
        return respondJSON({
          success: false,
          error: "OTP_INVALID",
          message: "Kode OTP 6 digit tidak sesuai. Sisa percobaan: " + remaining + "x.",
          attemptsRemaining: remaining
        });
      }
    }

    if (action === "getAllAssets" || action === "getAssets" || action === "fetchAll" || action === "pullAssets") {
      return handleGetAllAssets(ss);
    } else if (action === "syncAsset" || action === "saveAsset") {
      return handleSyncAsset(ss, data.data || data.payload || data);
    } else if (action === "uploadFile") {
      return handleUploadFile(ss, data.data || data.payload || data);
    } else if (action === "syncMaintenance" || action === "addMaintenance") {
      return handleSyncMaintenance(ss, data.data || data.payload || data);
    } else if (action === "syncReminder" || action === "addReminder") {
      return handleSyncReminder(ss, data.data || data.payload || data);
    } else if (action === "deleteAsset") {
      return handleDeleteAsset(ss, data.data || data.payload || data);
    } else {
      return respondJSON({ success: false, error: "Action tidak dikenal: " + action });
    }
  } catch (err) {
    return respondJSON({ success: false, error: err.toString() });
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

function handleGetAllAssets(ss) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  const assetSheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  if (!assetSheet) {
    return respondJSON({ success: true, assets: [], count: 0 });
  }

  const assetRows = assetSheet.getDataRange().getValues();
  if (assetRows.length <= 1) {
    return respondJSON({ success: true, assets: [], count: 0 });
  }

  const headers = assetRows[0].map(function(h) { return String(h).trim(); });
  const colAssetId = headers.indexOf("Asset ID") !== -1 ? headers.indexOf("Asset ID") : 0;
  const colAssetCode = headers.indexOf("Asset Code") !== -1 ? headers.indexOf("Asset Code") : 1;
  const colName = headers.indexOf("Name") !== -1 ? headers.indexOf("Name") : 2;
  const colCategory = headers.indexOf("Category") !== -1 ? headers.indexOf("Category") : 3;
  const colBrand = headers.indexOf("Brand") !== -1 ? headers.indexOf("Brand") : 4;
  const colModel = headers.indexOf("Model") !== -1 ? headers.indexOf("Model") : 5;
  const colSN = headers.indexOf("Serial Number") !== -1 ? headers.indexOf("Serial Number") : 6;
  const colPurDate = headers.indexOf("Purchase Date") !== -1 ? headers.indexOf("Purchase Date") : 7;
  const colPurPrice = headers.indexOf("Purchase Price") !== -1 ? headers.indexOf("Purchase Price") : 8;
  const colStatus = headers.indexOf("Status") !== -1 ? headers.indexOf("Status") : 9;
  const colWarEnd = headers.indexOf("Warranty End Date");
  const colWarProv = headers.indexOf("Warranty Provider");
  const colAssignedUser = headers.indexOf("Assigned User");
  const colPurchaseLocation = headers.indexOf("Purchase Location");
  const colNotes = headers.indexOf("Notes");
  const colDeviceDetails = headers.indexOf("Device Details");
  const colVehicleDetails = headers.indexOf("Vehicle Details");
  const colUpdated = headers.indexOf("Updated At") !== -1 ? headers.indexOf("Updated At") : (headers.length - 1);

  const maintSheet = ss.getSheetByName(CONFIG.SHEET_NAME_MAINTENANCE);
  const maintRows = maintSheet ? maintSheet.getDataRange().getValues() : [];

  const remSheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  const remRows = remSheet ? remSheet.getDataRange().getValues() : [];

  const fileSheet = ss.getSheetByName(CONFIG.SHEET_NAME_FILES);
  const fileRows = fileSheet ? fileSheet.getDataRange().getValues() : [];

  const assets = [];

  for (let i = 1; i < assetRows.length; i++) {
    const row = assetRows[i];
    const assetId = String(row[colAssetId] || "");
    if (!assetId) continue;

    const assetCode = String(row[colAssetCode] || "");
    const name = String(row[colName] || "Aset Tanpa Nama");
    const category = String(row[colCategory] || "Umum");
    const brand = String(row[colBrand] || "");
    const model = String(row[colModel] || "");
    const serialNumber = String(row[colSN] || "");
    const purchaseDate = formatDateStr(row[colPurDate]);
    const purchasePrice = Number(row[colPurPrice]) || 0;
    const status = String(row[colStatus] || "active");
    const updatedAt = String(row[colUpdated] || new Date().toISOString());

    let warranty = undefined;
    if (colWarEnd !== -1 && row[colWarEnd]) {
      warranty = {
        warranty_id: "war_" + assetId,
        asset_id: assetId,
        end_date: formatDateStr(row[colWarEnd]),
        provider: colWarProv !== -1 ? String(row[colWarProv] || "") : "Garansi Resmi",
        type: "Official"
      };
    }

    const assignedUser = colAssignedUser !== -1 ? String(row[colAssignedUser] || "") : "";
    const purchaseLocation = colPurchaseLocation !== -1 ? String(row[colPurchaseLocation] || "") : "";
    const notes = colNotes !== -1 ? String(row[colNotes] || "") : "";

    let deviceDetails = undefined;
    if (colDeviceDetails !== -1 && row[colDeviceDetails]) {
      try {
        deviceDetails = JSON.parse(String(row[colDeviceDetails]));
      } catch (e) {}
    }

    let vehicleDetails = undefined;
    if (colVehicleDetails !== -1 && row[colVehicleDetails]) {
      try {
        vehicleDetails = JSON.parse(String(row[colVehicleDetails]));
      } catch (e) {}
    }

    const maintenanceRecords = [];
    for (let m = 1; m < maintRows.length; m++) {
      const mRow = maintRows[m];
      if (String(mRow[1]) === assetId) {
        maintenanceRecords.push({
          log_id: String(mRow[0]),
          asset_id: assetId,
          type: String(mRow[2] || "service"),
          date: formatDateStr(mRow[3]),
          cost: Number(mRow[4]) || 0,
          provider: String(mRow[5] || ""),
          notes: String(mRow[6] || ""),
          created_at: String(mRow[7] || new Date().toISOString())
        });
      }
    }

    const reminders = [];
    for (let r = 1; r < remRows.length; r++) {
      const rRow = remRows[r];
      if (String(rRow[1]) === assetId) {
        reminders.push({
          reminder_id: String(rRow[0]),
          asset_id: assetId,
          title: String(rRow[2] || "Pengingat Aset"),
          due_date: formatDateStr(rRow[3]),
          status: String(rRow[4] || "pending"),
          notes: String(rRow[5] || ""),
          created_at: String(rRow[6] || new Date().toISOString())
        });
      }
    }

    const documents = [];
    let photoUrl = "";

    for (let f = 1; f < fileRows.length; f++) {
      const fRow = fileRows[f];
      if (String(fRow[1]) === assetId) {
        const fileCat = String(fRow[4] || "document");
        const fileUrl = String(fRow[7] || fRow[8] || "");
        
        if (fileCat === "photo") {
          photoUrl = fileUrl;
        } else {
          documents.push({
            doc_id: String(fRow[0]),
            asset_id: assetId,
            name: String(fRow[2] || "Dokumen"),
            type: fileCat,
            file_url: fileUrl,
            uploaded_at: String(fRow[9] || new Date().toISOString())
          });
        }
      }
    }

    assets.push({
      asset_id: assetId,
      asset_code: assetCode,
      name: name,
      category: category,
      brand: brand,
      model: model,
      serial_number: serialNumber,
      purchase_date: purchaseDate,
      purchase_price: purchasePrice,
      status: status,
      warranty: warranty,
      updated_at: updatedAt,
      maintenance_records: maintenanceRecords,
      reminders: reminders,
      documents: documents,
      photo_url: photoUrl,
      assigned_user: assignedUser,
      purchase_location: purchaseLocation,
      notes: notes,
      device_details: deviceDetails,
      vehicle_details: vehicleDetails
    });
  }

  return respondJSON({
    success: true,
    assets: assets,
    count: assets.length
  });
}

function handleSyncAsset(ss, asset) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  if (!asset) {
    return respondJSON({ success: false, error: "Data aset tidak ditemukan" });
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  const targetId = asset.asset_id || asset.id;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(targetId)) {
      rowIndex = i + 1;
      break;
    }
  }

  const pDate = formatDateStr(asset.purchase_date || asset.purchaseDate);
  let warEnd = "";
  let warProv = "";

  if (asset.warranty) {
    if (typeof asset.warranty === "object") {
      warEnd = formatDateStr(asset.warranty.end_date || asset.warranty.endDate || asset.warranty.end);
      warProv = String(asset.warranty.provider || asset.warranty.providerName || asset.warranty.provider_name || "");
    } else if (typeof asset.warranty === "string") {
      warEnd = formatDateStr(asset.warranty);
    }
  }
  if (!warEnd && (asset.warranty_end_date || asset.warrantyEndDate)) {
    warEnd = formatDateStr(asset.warranty_end_date || asset.warrantyEndDate);
  }
  if (!warProv && (asset.warranty_provider || asset.warrantyProvider)) {
    warProv = String(asset.warranty_provider || asset.warrantyProvider);
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

  setVal("Asset ID", targetId || ("AST-" + Date.now()));
  setVal("Asset Code", asset.asset_code || asset.assetCode || "");
  setVal("Name", asset.name || "Aset Tanpa Nama");
  setVal("Category", asset.category || "Umum");
  setVal("Brand", asset.brand || "");
  setVal("Model", asset.model || "");
  setVal("Serial Number", asset.serial_number || asset.serialNumber || "Tidak memiliki S/N");
  setVal("Purchase Date", pDate);
  setVal("Purchase Price", typeof asset.purchase_price === "number" ? asset.purchase_price : (Number(asset.purchase_price) || Number(asset.purchasePrice) || 0));
  setVal("Status", asset.status || "active");
  setVal("Warranty End Date", warEnd);
  setVal("Warranty Provider", warProv);
  setVal("Assigned User", asset.assigned_user || asset.assignedUser || "");
  setVal("Purchase Location", asset.purchase_location || asset.purchaseLocation || "");
  setVal("Notes", asset.notes || "");
  setVal("Device Details", asset.device_details ? (typeof asset.device_details === "string" ? asset.device_details : JSON.stringify(asset.device_details)) : "");
  setVal("Vehicle Details", asset.vehicle_details ? (typeof asset.vehicle_details === "string" ? asset.vehicle_details : JSON.stringify(asset.vehicle_details)) : "");
  setVal("Updated At", new Date().toISOString());

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  if (asset.warranty && asset.warranty.end_date) {
    try {
      handleSyncReminder(ss, {
        id: "war_rem_" + targetId,
        asset_id: targetId,
        title: "Masa Garansi Berakhir: " + (asset.name || "Aset"),
        due_date: formatDateStr(asset.warranty.end_date),
        status: "pending",
        notes: "Penyedia Garansi: " + (asset.warranty.provider || "Garansi Resmi")
      });
    } catch (e) {}
  }

  return respondJSON({ success: true, asset_id: targetId, row: rowIndex > 0 ? rowIndex : sheet.getLastRow() });
}

function handleSyncMaintenance(ss, record) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  if (!record || !record.asset_id) {
    return respondJSON({ success: false, error: "Record maintenance tidak valid" });
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MAINTENANCE);
  const logId = record.log_id || record.id || ("LOG-" + Date.now());

  sheet.appendRow([
    logId,
    record.asset_id,
    record.type || "service",
    formatDateStr(record.date),
    typeof record.cost === "number" ? record.cost : (Number(record.cost) || 0),
    record.provider || "",
    record.notes || "",
    new Date().toISOString()
  ]);

  return respondJSON({ success: true, log_id: logId });
}

function handleSyncReminder(ss, reminder) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  if (!reminder || !reminder.asset_id) {
    return respondJSON({ success: false, error: "Reminder tidak valid" });
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  const remId = reminder.reminder_id || reminder.id || ("REM-" + Date.now());

  sheet.appendRow([
    remId,
    reminder.asset_id,
    reminder.title || "Pengingat Aset",
    formatDateStr(reminder.due_date || reminder.dueDate),
    reminder.status || "pending",
    reminder.notes || "",
    new Date().toISOString()
  ]);

  return respondJSON({ success: true, reminder_id: remId });
}

function handleDeleteAsset(ss, payload) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  const assetId = typeof payload === "string" ? payload : (payload.asset_id || payload.id);
  if (!assetId) {
    return respondJSON({ success: false, error: "Asset ID tidak ditemukan" });
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(assetId)) {
      sheet.deleteRow(i + 1);
      return respondJSON({ success: true, deleted_id: assetId });
    }
  }

  return respondJSON({ success: false, error: "Asset ID tidak ditemukan di Sheets" });
}

function handleUploadFile(ss, payload) {
  const asset_id = payload.asset_id;
  const asset_code = payload.asset_code || asset_id;
  const file_name = payload.file_name || "file_" + Date.now();
  const mime_type = payload.mime_type || "application/octet-stream";
  const file_category = payload.file_category || "document";
  const file_size = payload.file_size || 0;
  const base64_data = payload.base64_data;

  if (!asset_id) {
    return respondJSON({ success: false, error: "asset_id wajib diisi untuk upload file" });
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
    return respondJSON({ success: false, error: "Gagal membuat folder di Google Drive: " + err.toString() });
  }

  if (!base64_data || typeof base64_data !== "string") {
    return respondJSON({ success: true, message: "Folder terbuat, tidak ada data file base64" });
  }

  if (base64_data.indexOf("http://") === 0 || base64_data.indexOf("https://") === 0) {
    if (!ss) ss = getSpreadsheet();
    ensureSheetTabs(ss);
    const fileSheet = ss.getSheetByName(CONFIG.SHEET_NAME_FILES);
    if (fileSheet) {
      fileSheet.appendRow([
        "DOC-" + Date.now(),
        asset_id,
        file_name,
        mime_type,
        file_category,
        file_size,
        "-",
        base64_data,
        base64_data,
        new Date().toISOString()
      ]);
    }
    return respondJSON({ success: true, file_url: base64_data });
  }

  try {
    const rawData = base64_data.indexOf(",") > -1 ? base64_data.split(",")[1] : base64_data;
    const decodedData = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(decodedData, mime_type, file_name);
    const file = catFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    if (!ss) ss = getSpreadsheet();
    ensureSheetTabs(ss);
    const fileSheet = ss.getSheetByName(CONFIG.SHEET_NAME_FILES);
    if (fileSheet) {
      fileSheet.appendRow([
        "DOC-" + Date.now(),
        asset_id,
        file_name,
        mime_type,
        file_category,
        file_size,
        file.getId(),
        file.getUrl(),
        "https://drive.google.com/uc?export=download&id=" + file.getId(),
        new Date().toISOString()
      ]);
    }

    return respondJSON({
      success: true,
      file_id: file.getId(),
      file_url: file.getUrl(),
      download_url: "https://drive.google.com/uc?export=download&id=" + file.getId()
    });
  } catch (err) {
    return respondJSON({ success: false, error: "Drive Blob Upload error: " + err.toString() });
  }
}

function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * UTILITY & AUTHORIZATION HELPER
 * Jalankan fungsi ini 1x di Apps Script Editor jika muncul pesan kesalahan izin OAuth
 * (seperti userinfo.email atau script.send_mail) untuk memicu dialog Review Permissions Google.
 */
function testAuthAndEmail() {
  var email = getEffectiveOwnerEmail();
  var masked = maskEmail(email);
  Logger.log("Effective User Email: " + email + " (Masked: " + masked + ")");
  
  if (email) {
    MailApp.sendEmail({
      to: email,
      subject: "MicroMate - Otorisasi Apps Script Berhasil",
      body: "Otorisasi izin Google Apps Script untuk MicroMate telah berhasil diaktifkan."
    });
    Logger.log("Test email dikirim ke " + email);
  }
  return "OK: Permissions authorized for " + masked;
}
`;
