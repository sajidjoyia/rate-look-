
export type Category = 'Dating' | 'Professional' | 'Fashion' | 'Social' | 'Lifestyle';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  interests: Category[] | null;
  total_confidence: number;
  total_style: number;
  total_approachability: number;
  review_count: number;
  posts_remaining_to_unlock: number;
}

export interface Post {
  id: string;
  user_id: string;
  categories: Category[];
  image_urls: string[];
  questions: string[];
  is_live: boolean;
  reviews_required: number;
  reviews_received: number;
  created_at: string;
  // Join data
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export interface Review {
  id: string;
  post_id: string;
  reviewer_id: string;
  confidence_score: number;
  style_score: number;
  approachability_score: number;
  answers: string[];
  general_feedback: string;
  is_anonymous: boolean;
  created_at: string;
  // Join data
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export interface RatingMetric {
  label: string;
  key: 'confidence' | 'style' | 'approachability';
  description: string;
}

export const CATEGORIES: Category[] = ['Dating', 'Professional', 'Fashion', 'Social', 'Lifestyle'];

export const RATING_METRICS: RatingMetric[] = [
  { label: 'Confidence', key: 'confidence', description: 'How confident does the subject look?' },
  { label: 'Style', key: 'style', description: 'Sense of fashion and presentation' },
  { label: 'Approachability', key: 'approachability', description: 'How friendly/inviting is the vibe?' }
];
