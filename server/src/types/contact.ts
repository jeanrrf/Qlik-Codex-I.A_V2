export interface ContactRequest {
  name: string;
  email: string;
  company: string;
  message?: string;
}

export interface ContactRecord extends ContactRequest {
  id: string;
  createdAt: string;
}

export interface ContactApiResponse extends ContactRecord {
  status: "received";
}

