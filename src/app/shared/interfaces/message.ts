export interface Message {
  key?: string;
  message: string;
  senderUid: string;
  senderDisplayName: string;
  senderAvatar?: string;
  time: number;
  reactions?: Reaction[];
  threadKey?: string;
  threadReplyCount?: number;
  threadLastReplyAt?: number;
  editedAt?: number;
}


export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  userNames: string[];
  reactedByUser: boolean;
}
