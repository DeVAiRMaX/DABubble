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
}
