"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDuplicates = exports.readData = void 0;
const XLSX = __importStar(require("xlsx"));
// Function to read an Excel file and return MAC and IP addresses from column B and E
function readData(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        // Get the first sheet in the workbook
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Extract data from the sheet in the B (MAC) and E (IP) columns
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).splice(1);
        // Remove the first row (header) and get MAC and IP addresses
        const addresses = data.filter((row) => row[1] && row[4]).map((row) => ({ mac: row[1], ip: row[4] }));
        return addresses;
    });
}
exports.readData = readData;
function removeRow(sheet, row) {
    //@ts-ignore
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let rowNum = row; rowNum < range.e.r; ++rowNum) {
        for (let colNum = range.s.c; colNum <= range.e.c; ++colNum) {
            const nextCellAddress = XLSX.utils.encode_cell({ r: rowNum + 1, c: colNum });
            const currCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
            if (sheet[nextCellAddress]) {
                sheet[currCellAddress] = sheet[nextCellAddress];
            }
            else {
                delete sheet[currCellAddress];
            }
        }
    }
    range.e.r--;
    sheet['!ref'] = XLSX.utils.encode_range(range);
    return sheet;
}
// Usage
function filterDuplicates(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path || 'updated.xlsx';
        const dataRows = yield readData(filePath);
        console.log('Data Rows:', dataRows);
        let toDelete = [];
        const macMap = new Map();
        const ipMap = new Map();
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const { mac, ip } = dataRows[rowIndex];
            if (macMap.has(mac) || ipMap.has(ip)) {
                toDelete.push(rowIndex);
            }
            else {
                macMap.set(mac, rowIndex);
                ipMap.set(ip, rowIndex);
            }
        }
        // Delete the rows
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // We reverse the array to delete rows from the bottom up to avoid row index changes affecting the remaining rows
        toDelete.reverse().forEach(row => {
            removeRow(sheet, row);
        });
        // Save the modified workbook
        yield writeFileAsync(workbook, 'updated.xlsx');
        function writeFileAsync(workbook, path) {
            return new Promise((resolve, reject) => {
                try {
                    XLSX.writeFile(workbook, path);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
        }
    });
}
exports.filterDuplicates = filterDuplicates;
;
