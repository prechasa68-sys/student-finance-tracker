export function formatMoney(value: string | number | null | undefined, currency = "THB") {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function statusLabel(status: string) {
  if (status === "pending_review") return "รอตรวจสอบ";
  if (status === "confirmed") return "ยืนยันแล้ว";
  if (status === "rejected") return "ปฏิเสธ";
  return status;
}

export function sourceLabel(source: string) {
  if (source === "line_ocr") return "จาก LINE OCR";
  if (source === "web_ocr") return "อัปโหลดสลิปเว็บ";
  return "เพิ่มเอง";
}

