export interface User {
  avatar?: string;
  uid: string;
  displayName: string | null;
  email: string | null;
  channelKeys?: string[];
}

export interface userData {
  channelKeys: string[];
  displayName: string;
  email: string;
  password: string;
  uid: string;
}
