export type Role = "admin" | "customer";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  created_at: string;
};

export type Listing = {
  id: string;
  name: string;
  type: "Group" | "Channel";
  description: string;
  price: number;
  currency: string;
  category: string | null;
  access_link: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
};

export type Order = {
  id: string;
  order_id: string;
  user_id: string;
  whatsapp_number: string;
  customer_email: string | null;
  listing_id: string | null;
  payment_reference: string | null;
  payment_status: "pending" | "success" | "failed";
  order_status: "pending" | "processing" | "completed" | "failed";
  access_link: string | null;
  created_at: string;
};

export type AdminInvite = {
  id: string;
  token: string;
  invited_email: string | null;
  created_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};
