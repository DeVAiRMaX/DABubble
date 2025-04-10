import { Message } from './message';
export interface Thread {
  key?: string;
  originalMessageKey: string;
  channelKey: string;
  creatorUid: string;
  createdAt: number;
  lastReplyAt?: number;
  replyCount?: number;
  threadMsg?: { [key: string]: ThreadMessage };
}

export interface ThreadMessage extends Message {
  threadKey: string;
}
