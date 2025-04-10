export interface Message {
  key?: string;
  message: string;
  senderUid: string;
  senderDisplayName: string;
  senderAvatar?: string;
  time: number;
  reactions?: any[];
  threadKey?: string;
  threadReplyCount?: number;
  threadLastReplyAt?: number;
}
