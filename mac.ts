import * as XLSX from 'xlsx';
import axios from 'axios';

// Function to read an Excel file and return MAC addresses from column B
export async function readColumnBData(filePath: string): Promise<string[]> {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);

  // Get the first sheet in the workbook
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Extract data from the sheet in the B column
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).splice(1)
  // Remove the first row (header)
  const columnBData = data.filter((row: any) => row[1]).map((row: any) => row[1]);

  return columnBData;
}

// Function to get the MAC address vendor using mac-address API
export async function getMacAddressData(mac: string): Promise<MacAddressApiResponse | 'Unknown'> {
  try {
    const baseUrl = "https://mac-address.alldatafeeds.com/api/v1";
    const params = {
      output: 'json',
      search: mac,
      apiKey: 'REDACTED_ROTATE_ME'
    };
    const response = await axios.get(baseUrl, { params });
    if (response.status !== 200) throw new Error(`Invalid response status ${response.status}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching MAC address data for ${mac}:`, error.message);
    return 'Unknown';
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function removeRow(sheet: XLSX.WorkSheet, row: number): XLSX.WorkSheet {
    //@ts-ignore
  const range = XLSX.utils.decode_range(sheet['!ref']);

  for (let rowNum = row; rowNum < range.e.r; ++rowNum) {
    for (let colNum = range.s.c; colNum <= range.e.c; ++colNum) {
      const nextCellAddress = XLSX.utils.encode_cell({ r: rowNum + 1, c: colNum });
      const currCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });

      if (sheet[nextCellAddress]) {
        sheet[currCellAddress] = sheet[nextCellAddress];
      } else {
        delete sheet[currCellAddress];
      }
    }
  }

  range.e.r--;
  sheet['!ref'] = XLSX.utils.encode_range(range);
  return sheet;
}

// Usage
export async function filterMacAddresses(path: string): Promise<void> {
  const filePath = path || 'fry.xlsx';
  const macAddressRows = await readColumnBData(filePath);
  console.log('MAC Addresses:', macAddressRows);

  // Get the MAC address vendor for each MAC address
  let toDelete: number[] = [];
  for (let rowIndex = 0; rowIndex < macAddressRows.length; rowIndex++) {
    const mac = macAddressRows[rowIndex];
    console.log(`Fetching data for MAC address ${mac} (${rowIndex + 1}/${macAddressRows.length})`);
    const data = await getMacAddressData(mac);
    console.log('Data:', data);
    await wait(2000);
    if (!data) toDelete.push(rowIndex + 2); // +2 because the row numbers are 1-based and we skip the header
    else if (data === "Unknown") toDelete.push(rowIndex + 2);
    else {
      if (data.macAddressDetails.virtualMachine !== "Not detected") toDelete.push(rowIndex + 2);
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
    await writeFileAsync(workbook, 'updated.xlsx');
  
  function writeFileAsync(workbook: XLSX.WorkBook, path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        XLSX.writeFile(workbook, path);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  
};

interface MacAddressApiResponse {
  vendorDetails: {
    oui: string;
    isPrivate: boolean;
    companyName: string;
    companyAddress: string;
    countryCode: string;
  };
  blockDetails: {
    blockFound: boolean;
    borderLeft: string;
    borderRight: string;
    blockSize: number;
    assignmentBlockSize: string;
    dateCreated: string;
    dateUpdated: string;
  };
  macAddressDetails: {
    searchTerm: string;
    isValid: boolean;
    virtualMachine: string;
    applications: string[];
    transmissionType: string;
    administrationType: string;
    wiresharkNotes: string;
    comment: string;
  };
}

