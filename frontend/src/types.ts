export interface Comment {
  id: string | number;
  author: string;
  authorInitial: string;
  text: string;
  likes?: number;
  replies?: Comment[];
}

export interface Discussion {
  id: string;
  title: string;
  author: string;
  authorInitial: string;
  date: string;
  commentCount: number;
}