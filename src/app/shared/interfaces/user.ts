export interface User {
  avatar?: string;
  uid: string;
  displayName: string | null;
  email: string | null;
  channelKeys?: string[];
}

export interface userData {
  avatar?: string;
  channelKeys: string[];
  displayName: string;
  email: string;
  password: string;
  uid: string;
}
