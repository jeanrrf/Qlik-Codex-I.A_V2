export interface ContactRequest {
  name: string;
  email: string;
  company: string;
  message?: string;
}

export interface ContactResponse extends ContactRequest {
  id: string;
  createdAt: string;
  status: "received";
}

