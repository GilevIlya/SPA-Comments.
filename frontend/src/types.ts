export interface Comment {
  id: number;
  discussion: number;
  author: string;
  author_name: string;
  parent_author_name: string | null;
  text: string;
  parent: number | null;
  file: string | null;
  file_url: string | null;
  replies: Comment[];
  created_at: string;
}

export interface Discussion {
  id: number;
  title: string;
  description: string;
  author: string;
  author_name: string;
  comment_count: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CaptchaResponse {
  token: string;
  image_url: string; // URL to CAPTCHA image
}
