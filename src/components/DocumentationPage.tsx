import React, { useState } from 'react';
import { 
  BookOpen, 
  Check, 
  Copy, 
  Database, 
  FileText, 
  HardDrive, 
  Wrench, 
  PieChart, 
  Plus, 
  Code2, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  UserCheck,
  Shield,
  HelpCircle,
  Download,
  UploadCloud,
  FileCheck2,
  FolderTree,
  Terminal,
  Settings
} from 'lucide-react';

interface DocumentationPageProps {
  onOpenSettings: () => void;
  onQuickAddAsset: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({
  onOpenSettings,
  onQuickAddAsset,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [docTab, setDocTab] = useState<'user' | 'system'>('user');

  const appsScriptCode = `/**
 * MICROMATE CLOUD GATEWAY - GOOGLE APPS SCRIPT (v1.2)
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
      headers: ["Asset ID", "Asset Code", "Name", "Category", "Brand", "Model", "Serial Number", "Purchase Date", "Purchase Price", "Status", "Warranty End Date", "Warranty Provider", "Updated At"]
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
      if (currentHeaders.indexOf("Warranty End Date") === -1) {
        var updatedAtIdx = currentHeaders.indexOf("Updated At");
        if (updatedAtIdx !== -1) {
          sheet.insertColumnsBefore(updatedAtIdx + 1, 2);
        } else if (sheet.getLastColumn() > 0) {
          sheet.insertColumnsAfter(sheet.getLastColumn(), 2);
        }
        sheet.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]);
        sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight("bold").setBackground("#d1fae5");
        sheet.setFrozenRows(1);
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

/** Helper untuk mendapatkan / membuat Google Spreadsheet secara otomatis */
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

  // Otomatis pastikan semua tab sheet dan folder MicroMate_Vault tersedia
  ensureSheetTabs(ss);
  ensureVaultFolder();
  return ss;
}

function doGet(e) {
  const ss = getSpreadsheet();
  ensureVaultFolder();

  if (e && e.parameter && (e.parameter.action === "getAllAssets" || e.parameter.action === "getAssets" || e.parameter.action === "fetchAll")) {
    return handleGetAllAssets(ss);
  }

  return respondJSON({
    status: "ok",
    message: "MicroMate Apps Script Gateway Active",
    services: {
      appsScript: true,
      googleSheets: !!ss,
      googleDrive: true
    },
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ success: false, error: "POST body kosong atau request tidak valid" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || "syncAsset";
    const ss = getSpreadsheet();
    ensureVaultFolder();

    if (action === "health") {
      return respondJSON({
        status: "ok",
        success: true,
        services: {
          appsScript: true,
          googleSheets: !!ss,
          googleDrive: true
        },
        timestamp: new Date().toISOString()
      });
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

// Helper untuk Format Tanggal agar selalu YYYY-MM-DD
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

// Handler untuk Mengambil Seluruh Data Aset dari Google Sheets (Pull / Sync Down)
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
  const colUpdated = headers.indexOf("Updated At") !== -1 ? headers.indexOf("Updated At") : (headers.length - 1);

  const maintSheet = ss.getSheetByName(CONFIG.SHEET_NAME_MAINTENANCE);
  const maintRows = maintSheet ? maintSheet.getDataRange().getValues() : [];

  const reminderSheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  const reminderRows = reminderSheet ? reminderSheet.getDataRange().getValues() : [];

  const fileSheet = ss.getSheetByName(CONFIG.SHEET_NAME_FILES);
  const fileRows = fileSheet ? fileSheet.getDataRange().getValues() : [];

  const assets = [];

  for (let i = 1; i < assetRows.length; i++) {
    const row = assetRows[i];
    if (!row[colAssetId] || String(row[colAssetId]) === "Asset ID") continue;

    const assetId = String(row[colAssetId]);
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

    let warrantyEndDate = colWarEnd !== -1 ? formatDateStr(row[colWarEnd]) : "";
    let warrantyProvider = colWarProv !== -1 ? String(row[colWarProv] || "") : "";

    let warranty = undefined;
    if (warrantyEndDate && warrantyEndDate !== "-" && warrantyEndDate.length >= 8) {
      warranty = {
        warranty_id: "war_" + assetId,
        asset_id: assetId,
        start_date: purchaseDate || new Date().toISOString().split("T")[0],
        end_date: warrantyEndDate,
        provider: warrantyProvider || "Garansi Resmi"
      };
    }

    const maintenanceRecords = [];
    for (let m = 1; m < maintRows.length; m++) {
      const mRow = maintRows[m];
      if (String(mRow[1]) === assetId) {
        maintenanceRecords.push({
          record_id: String(mRow[0]),
          asset_id: assetId,
          type: String(mRow[2] || "Perawatan"),
          date: formatDateStr(mRow[3]),
          cost: Number(mRow[4]) || 0,
          provider: String(mRow[5] || "-"),
          notes: String(mRow[6] || ""),
          created_at: String(mRow[7] || new Date().toISOString())
        });
      }
    }

    const reminders = [];
    for (let r = 1; r < reminderRows.length; r++) {
      const rRow = reminderRows[r];
      if (String(rRow[1]) === assetId) {
        reminders.push({
          reminder_id: String(rRow[0]),
          asset_id: assetId,
          title: String(rRow[2] || ""),
          due_date: formatDateStr(rRow[3]),
          recurring: String(rRow[4] || "none"),
          status: String(rRow[5] || "pending"),
          notes: String(rRow[6] || "")
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
      photo_url: photoUrl
    });
  }

  return respondJSON({
    success: true,
    assets: assets,
    count: assets.length
  });
}

// Handler untuk Menyimpan/Update Asset Metadata (Tab "Assets")
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

  const rowData = [
    targetId || ("AST-" + Date.now()),
    asset.asset_code || asset.assetCode || "",
    asset.name || "Aset Tanpa Nama",
    asset.category || "Umum",
    asset.brand || "",
    asset.model || "",
    asset.serial_number || asset.serialNumber || "Tidak memiliki S/N",
    pDate,
    typeof asset.purchase_price === "number" ? asset.purchase_price : (Number(asset.purchase_price) || Number(asset.purchasePrice) || 0),
    asset.status || "active",
    warEnd,
    warProv,
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // Jika aset membawa informasi garansi, simpan pengingat garansi secara otomatis
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

  // Jika aset membawa foto base64, unggah ke Google Drive
  if (asset.photo_url && typeof asset.photo_url === "string" && asset.photo_url.indexOf("data:") === 0) {
    try {
      handleUploadFile(ss, {
        asset_id: targetId,
        asset_code: asset.asset_code || targetId,
        file_category: "photo",
        file_name: "Photo_" + (asset.asset_code || targetId) + ".jpg",
        mime_type: "image/jpeg",
        base64_data: asset.photo_url,
        file_size: Math.round(asset.photo_url.length * 0.75)
      });
    } catch (e) {}
  }

  // Jika aset membawa dokumen base64, unggah ke Google Drive
  if (asset.documents && Array.isArray(asset.documents)) {
    asset.documents.forEach(function(doc) {
      if (doc.file_url && typeof doc.file_url === "string" && doc.file_url.indexOf("data:") === 0) {
        try {
          handleUploadFile(ss, {
            asset_id: targetId,
            asset_code: asset.asset_code || targetId,
            file_category: doc.type || "document",
            file_name: doc.name || ("Doc_" + targetId),
            mime_type: doc.file_url.indexOf("image/") > -1 ? "image/jpeg" : "application/pdf",
            base64_data: doc.file_url,
            file_size: Math.round(doc.file_url.length * 0.75)
          });
        } catch (e) {}
      }
    });
  }

  // Jika aset membawa riwayat perawatan, simpan juga ke tab Maintenance
  if (asset.maintenance_records && Array.isArray(asset.maintenance_records)) {
    asset.maintenance_records.forEach(function(rec) {
      handleSyncMaintenance(ss, {
        id: rec.record_id || rec.id,
        asset_id: targetId,
        service_type: rec.type || rec.service_type || "Perawatan",
        service_date: rec.date || rec.service_date,
        cost: rec.cost || 0,
        provider: rec.provider || "-",
        notes: rec.notes || ""
      });
    });
  }

  // Jika aset membawa pengingat, simpan juga ke tab Reminders
  if (asset.reminders && Array.isArray(asset.reminders)) {
    asset.reminders.forEach(function(rem) {
      handleSyncReminder(ss, {
        id: rem.reminder_id || rem.id,
        asset_id: targetId,
        title: rem.title,
        due_date: rem.due_date,
        status: rem.status || "pending",
        notes: rem.notes || ""
      });
    });
  }

  return respondJSON({ success: true, message: "Asset saved to Google Sheets Assets tab", asset_id: targetId });
}

// Handler untuk Hapus Asset (Menghapus row di Assets, Maintenance, Reminders, AssetFiles, serta file & folder di Google Drive)
function handleDeleteAsset(ss, payload) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);
  const targetId = typeof payload === "string" ? payload : (payload.assetId || payload.asset_id || payload.id);
  if (!targetId) return respondJSON({ success: false, error: "ID Aset tidak ditemukan" });

  let assetCode = targetId;

  // 1. Hapus dari Tab "Assets"
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ASSETS);
  if (sheet) {
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]) === String(targetId)) {
        if (rows[i][1]) assetCode = String(rows[i][1]);
        sheet.deleteRow(i + 1);
      }
    }
  }

  // 2. Hapus dari Tab "Maintenance"
  const maintSheet = ss.getSheetByName(CONFIG.SHEET_NAME_MAINTENANCE);
  if (maintSheet) {
    const mRows = maintSheet.getDataRange().getValues();
    for (let i = mRows.length - 1; i >= 1; i--) {
      if (String(mRows[i][1]) === String(targetId)) {
        maintSheet.deleteRow(i + 1);
      }
    }
  }

  // 3. Hapus dari Tab "Reminders"
  const remSheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  if (remSheet) {
    const rRows = remSheet.getDataRange().getValues();
    for (let i = rRows.length - 1; i >= 1; i--) {
      if (String(rRows[i][1]) === String(targetId)) {
        remSheet.deleteRow(i + 1);
      }
    }
  }

  // 4. Hapus File di Google Drive & Data di Tab "AssetFiles"
  const fileSheet = ss.getSheetByName(CONFIG.SHEET_NAME_FILES);
  if (fileSheet) {
    const fRows = fileSheet.getDataRange().getValues();
    for (let i = fRows.length - 1; i >= 1; i--) {
      if (String(fRows[i][1]) === String(targetId)) {
        const driveFileId = fRows[i][6]; // Kolom index 6 adalah drive_file_id
        if (driveFileId && String(driveFileId) !== "-") {
          try {
            DriveApp.getFileById(String(driveFileId)).setTrashed(true);
          } catch (e) {
            // File mungkin sudah dihapus
          }
        }
        fileSheet.deleteRow(i + 1);
      }
    }
  }

  // 5. Hapus folder spesifik Aset di Google Drive jika ada
  try {
    const rootFolders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    if (rootFolders.hasNext()) {
      const rootFolder = rootFolders.next();
      const assetsFolders = rootFolder.getFoldersByName("Assets");
      if (assetsFolders.hasNext()) {
        const assetsFolder = assetsFolders.next();
        const targetFolders = assetsFolder.getFoldersByName(assetCode);
        while (targetFolders.hasNext()) {
          targetFolders.next().setTrashed(true);
        }
      }
    }
  } catch (err) {}

  return respondJSON({ success: true, message: "Asset dan seluruh berkas/data terkait berhasil dihapus dari Google Sheets & Google Drive" });
}

// Handler untuk Menyimpan Riwayat Perawatan (Tab "Maintenance")
function handleSyncMaintenance(ss, record) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MAINTENANCE);
  const rowData = [
    record.id || ("MNT-" + Date.now()),
    record.asset_id || "",
    record.service_type || "Perawatan",
    record.service_date || new Date().toISOString().split("T")[0],
    record.cost || 0,
    record.provider || "-",
    record.notes || "",
    new Date().toISOString()
  ];
  sheet.appendRow(rowData);
  return respondJSON({ success: true, message: "Maintenance log saved to Google Sheets Maintenance tab" });
}

// Handler untuk Menyimpan Pengingat (Tab "Reminders")
function handleSyncReminder(ss, reminder) {
  if (!ss) ss = getSpreadsheet();
  ensureSheetTabs(ss);

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_REMINDERS);
  const rowData = [
    reminder.id || ("REM-" + Date.now()),
    reminder.asset_id || "",
    reminder.title || "Pengingat",
    reminder.due_date || "",
    reminder.status || "pending",
    reminder.notes || "",
    new Date().toISOString()
  ];
  sheet.appendRow(rowData);
  return respondJSON({ success: true, message: "Reminder saved to Google Sheets Reminders tab" });
}

// Handler untuk Upload File ke Google Drive & simpan metadata di Tab "AssetFiles"
function handleUploadFile(ss, payload) {
  if (!payload) return respondJSON({ success: false, error: "Payload file kosong" });
  const asset_id = payload.asset_id || payload.assetId || "";
  const asset_code = payload.asset_code || payload.assetCode || asset_id || "General";
  const file_category = payload.file_category || payload.fileCategory || "document";
  const file_name = payload.file_name || payload.fileName || ("File_" + Date.now());
  const mime_type = payload.mime_type || payload.mimeType || "application/octet-stream";
  const base64_data = payload.base64_data || payload.base64Data || payload.file_url || "";
  const file_size = payload.file_size || 0;

  let catFolder;
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
        file.getDownloadUrl(),
        new Date().toISOString()
      ]);
    }

    return respondJSON({
      success: true,
      file_id: file.getId(),
      file_url: file.getUrl(),
      download_url: file.getDownloadUrl()
    });
  } catch (err) {
    return respondJSON({ success: false, error: "Drive Blob Upload error: " + err.toString() });
  }
}

function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-emerald-200 border border-white/15">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pusat Informasi & Dokumen MicroMate</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Panduan & Dokumentasi Sistem
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Panduan lengkap penggunaan aplikasi MicroMate bagi pengguna harian serta dokumentasi arsitektur sistem dan skrip Google Apps Script untuk pengembang.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onQuickAddAsset}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrasi Aset Baru</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-4 py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-white/20 cursor-pointer transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Sync API Gateway</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Selector (User Guide vs System Architecture) */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200 w-fit">
        <button
          type="button"
          onClick={() => setDocTab('user')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            docTab === 'user'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>📘 Panduan Penggunaan (User Guide)</span>
        </button>

        <button
          type="button"
          onClick={() => setDocTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            docTab === 'system'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>⚙️ Dokumentasi Sistem & Developer</span>
        </button>
      </div>

      {/* TAB 1: USER GUIDE */}
      {docTab === 'user' && (
        <div className="space-y-6">
          
          {/* 1. Quick Start */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Cara Tambah Aset Baru (&lt; 60 Detik)</h2>
                <p className="text-xs text-stone-500">Alur pengisian cepat untuk mendaftarkan aset baru</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="font-bold text-emerald-800 block text-sm">Langkah 1: Informasi Utama</span>
                <p className="text-stone-600 leading-relaxed">
                  Isikan Nama Aset, Kategori (Elektronik, Kendaraan, Rumah, Hobi), Merk, serta Serial Number (S/N) jika tersedia.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="font-bold text-emerald-800 block text-sm">Langkah 2: Garansi & Pajak</span>
                <p className="text-stone-600 leading-relaxed">
                  Pilih durasi garansi (misal 1 tahun AppleCare / iBox) atau tanggal berakhir manual. Untuk kendaraan, masukkan tanggal pajak STNK tahunan.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="font-bold text-emerald-800 block text-sm">Langkah 3: Foto & Invoice</span>
                <p className="text-stone-600 leading-relaxed">
                  Upload foto aset dan nota/bukti pembelian. File otomatis tersimpan di Vault lokal dan diunggah ke Google Drive bila terhubung.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Document Vault & Service */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Document Vault & Catatan Servis</h2>
                <p className="text-xs text-stone-500">Pengelolaan invoice, garansi, dan kalkulasi Total Cost of Ownership (TCO)</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-700" />
                  <span>Document Vault & Google Drive Gateway</span>
                </h3>
                <p className="leading-relaxed">
                  Setiap aset memiliki folder khusus di Document Vault. Saat Anda mengunggah file nota pembelian atau foto aset, MicroMate akan menyimpan salinan resolusi penuh secara offline dan mengirimkannya ke Google Drive personal Anda dalam folder yang terorganisir:
                  <code className="block mt-1 p-2 bg-white rounded-lg border border-stone-200 text-[11px] font-mono text-stone-800">
                    MicroMate / Assets / AST-2026-000124 / [Photos | Documents]
                  </code>
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>Riwayat Servis & Perhitungan TCO</span>
                </h3>
                <p className="leading-relaxed">
                  Catat setiap pergantian oli, perawatan berkala AC, atau perbaikan sparepart. MicroMate secara otomatis menghitung <strong>Total Cost of Ownership (TCO)</strong> = <em>(Harga Beli + Total Biaya Perawatan + Aksesori)</em> untuk memberi Anda gambaran utuh biaya kepemilikan aset.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Export / Import Backup */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Backup Data & Keamanan Pribadi</h2>
                <p className="text-xs text-stone-500">Milik Anda sepenuhnya tanpa kunci vendor (Zero Vendor Lock-in)</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Data aset Anda tersimpan secara aman di peramban (browser) lokal Anda (IndexedDB). Anda dapat melakukan backup data kapan saja dalam format JSON melalui menu Pengaturan, atau menyinkronkannya secara otomatis ke akun Google Sheets milik Anda sendiri.
            </p>
          </section>

        </div>
      )}

      {/* TAB 2: SYSTEM ARCHITECTURE & DEVELOPER DOCS */}
      {docTab === 'system' && (
        <div className="space-y-6">
          
          {/* Architecture Overview */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                <Database className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Cetak Biru Arsitektur System</h2>
                <p className="text-xs text-stone-500">Offline-First Client Engine + Google Apps Script Web App API Gateway</p>
              </div>
            </div>

            <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl font-mono text-xs space-y-3 overflow-x-auto">
              <span className="text-[11px] text-emerald-400 font-bold block">// DIAGRAM INTEGRASI CLOUD GATEWAY</span>
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[11px]">
                <div className="p-3 bg-stone-800 border border-stone-700 rounded-xl text-center w-full md:w-auto">
                  📱 Frontend MicroMate
                  <div className="text-[10px] text-stone-400">React + IndexedDB Storage</div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 hidden md:block" />
                <div className="p-3 bg-emerald-950 border border-emerald-700/80 text-emerald-300 rounded-xl text-center w-full md:w-auto">
                  ⚙️ Google Apps Script
                  <div className="text-[10px] text-emerald-400/80">API Gateway Web App</div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 hidden md:block" />
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <div className="p-2 bg-stone-800 border border-stone-700 rounded-lg text-center text-[10px]">
                    📂 Google Drive (Foto & Nota)
                  </div>
                  <div className="p-2 bg-stone-800 border border-stone-700 rounded-lg text-center text-[10px]">
                    📊 Google Sheets (Database Metadata)
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Apps Script Code Box */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-700" />
                  <span>Kode Google Apps Script Gateway</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Salin kode di bawah ke <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">script.google.com</a> lalu Deploy sebagai Web App (Access: Anyone).
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95 shadow-2xs"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-stone-950 text-stone-200 text-xs font-mono rounded-2xl overflow-x-auto max-h-96 border border-stone-800 leading-relaxed scrollbar-thin">
                <code>{appsScriptCode}</code>
              </pre>
            </div>
          </section>

          {/* Folder Hierarchy Specification */}
          <section className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-emerald-700" />
              <span>Spesifikasi Struktur Folder Google Drive</span>
            </h2>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 font-mono text-xs space-y-2 text-stone-800">
              <div>📁 MicroMate /</div>
              <div className="pl-4">└── 📁 Assets /</div>
              <div className="pl-8">└── 📁 AST-2026-000124 /</div>
              <div className="pl-12">├── 📁 Photos / (Foto fisik produk, tampak depan, serial number)</div>
              <div className="pl-12">└── 📁 Documents / (Invoice nota pembelian, kartu garansi, STNK)</div>
            </div>
          </section>

        </div>
      )}

    </div>
  );
};
