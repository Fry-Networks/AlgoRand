import * as XLSX from 'xlsx';
import axios from 'axios';

// Function to read an Excel file and return email addresses from column A
export async function readColumnAData(filePath: string): Promise<string[]> {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);

  // Get the first sheet in the workbook
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Extract data from the sheet in the A column
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).splice(1)
  // Remove the first row (header)
  const columnAData = data.filter((row: any) => row[0]).map((row: any) => row[0]);

  return columnAData;
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
export async function filterEmailAddresses(path: string): Promise<void> {
  const filePath = path || 'updated.xlsx';
  const emailAddressRows = await readColumnAData(filePath);
  console.log('Email Addresses:', emailAddressRows);

  // Get the email addresses for each row
  let toDelete: number[] = [];
  const emailMap = new Map<string, number>();
  for (let rowIndex = 0; rowIndex < emailAddressRows.length; rowIndex++) {
    const email = emailAddressRows[rowIndex];
  
    if (emailMap.has(email)) {
      const currentCount = emailMap.get(email) as number;
      if (currentCount >= 25) {
        toDelete.push(rowIndex);
      } else {
        emailMap.set(email, currentCount + 1);
      }
    } else {
      emailMap.set(email, 1);
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
