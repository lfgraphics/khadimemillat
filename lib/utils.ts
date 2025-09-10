import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import xlsx from "json-as-xlsx";
import moment from 'moment';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const downloadExcel = (data: any[], fileName: string) => {
  const settings = {
    fileName: fileName,
    extraLength: 3,
    writeOptions: {},
  };
  console.log("Downloading Excel file:", fileName);
  console.log("Data to be exported:", data);
  console.log(data.length)
  xlsx(data, settings);
};

export const formatDate = (dateInput: string | Date | null): string => {
  if (dateInput == null) return ""
  const date = moment(dateInput);
  if (!date || !date.isValid()) return "no date provided";
  return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};

export function camelToWords(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")   // insert space before capital letters
    .replace(/^./, (s) => s.toUpperCase()); // capitalize first letter
}