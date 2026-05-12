export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SupportTicketParams {
  subject: string;
  description: string;
  category: string;
  deviceId?: string;
}

export interface SupportTicket {
  id: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export async function getHelpFaq(): Promise<FaqItem[]> {
  throw new Error('not implemented');
}

export async function submitSupportTicket(_params: SupportTicketParams): Promise<SupportTicket> {
  throw new Error('not implemented');
}
