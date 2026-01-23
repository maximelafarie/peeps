export type Status =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "failed"
  | "error"
  | "disconnected";

export interface TenorResponse {
  results: TenorResult[];
  next: string;
}

export interface TenorResult {
  id: string;
  description: string;
  width: number;
  height: number;
  gif: string;
  loaded?: boolean;
}

export interface RichMessage<T> {
  type: "gif";
  content: T;
}
