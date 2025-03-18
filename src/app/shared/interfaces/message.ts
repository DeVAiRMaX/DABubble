export interface Message {
  message: string;
  reactions?: string[];
  sender: string;
  time: number;
}
