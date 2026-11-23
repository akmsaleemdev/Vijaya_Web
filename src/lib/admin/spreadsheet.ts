import { strToU8, zipSync } from "fflate";

const ns = "http://schemas.openxmlformats.org";
const rel = ns + "/officeDocument/2006/relationships";
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXML = (value: string) => Array.from(value)
  .filter((char) => char.charCodeAt(0) >= 32 || char === "\n" || char === "\r" || char === "\t")
  .map((char) => entities[char] ?? char).join("");

export function spreadsheet(rows: (string | number)[][]) {
  const table = rows.map((row, index) => `<row r="${index + 1}">${row.map((cell) => typeof cell === "number"
    ? `<c><v>${cell}</v></c>`
    : `<c t="inlineStr"><is><t xml:space="preserve">${escapeXML(cell)}</t></is></c>`).join("")}</row>`).join("");
  const items: Record<string, string> = {
    "[Content_Types].xml": `<Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${rel}"><sheets><sheet name="Bookings" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${ns}/spreadsheetml/2006/main"><sheetData>${table}</sheetData></worksheet>`,
  };
  return new Uint8Array(zipSync(Object.fromEntries(Object.entries(items).map(([name, xml]) => [name, strToU8(declaration + xml)]))));
}
