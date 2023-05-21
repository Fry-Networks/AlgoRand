import * as XLSX from 'xlsx';

// Function to read an Excel file and return MAC and IP addresses from column B and E
export async function readData(filePath: string): Promise<Array<{mac: string, ip: string}>> {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);

  // Get the first sheet in the workbook
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Extract data from the sheet in the B (MAC) and E (IP) columns
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).splice(1)

  // Remove the first row (header) and get MAC and IP addresses
  const addresses = data.filter((row: any) => row[1] && row[4]).map((row: any) => ({ mac: row[1], ip: row[4] }));

  return addresses;
}

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
export async function filterDuplicates(path: string): Promise<void> {
  const filePath = path || 'updated.xlsx';
  const dataRows = await readData(filePath);
  console.log('Data Rows:', dataRows);

  let toDelete: number[] = [];
  const macMap = new Map<string, number>();
  const ipMap = new Map<string, number>();

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const { mac, ip } = dataRows[rowIndex];

    if (macMap.has(mac) || ipMap.has(ip)) {
      toDelete.push(rowIndex);
    } else {
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
