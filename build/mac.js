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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMacAddresses = exports.getMacAddressData = exports.readColumnBData = void 0;
const XLSX = __importStar(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
// Function to read an Excel file and return MAC addresses from column B
function readColumnBData(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        // Get the first sheet in the workbook
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Extract data from the sheet in the B column
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).splice(1);
        // Remove the first row (header)
        const columnBData = data.filter((row) => row[1]).map((row) => row[1]);
        return columnBData;
    });
}
exports.readColumnBData = readColumnBData;
// Function to get the MAC address vendor using mac-address API
function getMacAddressData(mac) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const baseUrl = "https://mac-address.alldatafeeds.com/api/v1";
            const params = {
                output: 'json',
                search: mac,
                apiKey: 'REDACTED_ROTATE_ME'
            };
            const response = yield axios_1.default.get(baseUrl, { params });
            if (response.status !== 200)
                throw new Error(`Invalid response status ${response.status}`);
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching MAC address data for ${mac}:`, error.message);
            return 'Unknown';
        }
    });
}
exports.getMacAddressData = getMacAddressData;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
function filterMacAddresses(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path || 'fry.xlsx';
        const macAddressRows = yield readColumnBData(filePath);
        console.log('MAC Addresses:', macAddressRows);
        // Get the MAC address vendor for each MAC address
        let toDelete = [];
        for (let rowIndex = 0; rowIndex < macAddressRows.length; rowIndex++) {
            const mac = macAddressRows[rowIndex];
            console.log(`Fetching data for MAC address ${mac} (${rowIndex + 1}/${macAddressRows.length})`);
            const data = yield getMacAddressData(mac);
            console.log('Data:', data);
            yield wait(2000);
            if (!data)
                toDelete.push(rowIndex + 2); // +2 because the row numbers are 1-based and we skip the header
            else if (data === "Unknown")
                toDelete.push(rowIndex + 2);
            else {
                if (data.macAddressDetails.virtualMachine !== "Not detected")
                    toDelete.push(rowIndex + 2);
            }
        }
        // Delete the rows
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
exports.filterMacAddresses = filterMacAddresses;
;
