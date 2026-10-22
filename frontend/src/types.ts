export type TransactionType = "income" | "expense";
export type TransactionStatus = "pending_review" | "confirmed" | "rejected";
export type TransactionSource = "manual" | "line_ocr" | "web_ocr";

export interface Transaction {
  id: number;
  type: TransactionType | null;
  amount: string | null;
  currency: string;
  category: string | null;
  transaction_date: string | null;
  note: string | null;
  source: TransactionSource;
  status: TransactionStatus;
  external_message_id: string | null;
  raw_ocr_text: string | null;
  party_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionPayload {
  type?: TransactionType | null;
  amount?: string | null;
  currency?: string;
  category?: string | null;
  transaction_date?: string | null;
  note?: string | null;
  source?: TransactionSource;
  status?: TransactionStatus;
}

export interface DashboardSummary {
  income_total: string;
  expense_total: string;
  balance: string;
  pending_review_count: number;
  confirmed_count: number;
  expense_by_category: { category: string; total: string }[];
  currency: string;
}

export interface LineStatus {
  status: "Connected" | "Not configured" | "Error" | "Mock mode";
  configured: boolean;
  mock_mode: boolean;
  ocr_provider: string;
  message: string;
  bot_display_name: string | null;
}
