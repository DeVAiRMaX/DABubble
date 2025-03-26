export interface Channel {
  channelName: string;
  members: string[];
  description: string;
  messages: [
    {
      message: string;
      reactions?: string[];
      sender: string;
      time: number;
    }
  ];
  private: boolean;
}

export type ChannelWithKey = Channel & { key: string };
