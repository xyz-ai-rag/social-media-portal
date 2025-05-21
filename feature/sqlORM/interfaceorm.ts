import { Model } from "sequelize";

export interface BusinessPostInstance extends Model {
  platform: string;
  note_id: string;
  original_note_id: string; // uuid
  type: string;
  title: string;
  description: string;
  video_url: string;
  create_time: Date;
  last_update_time: Date;
  user_id: string;
  nickname: string;
  avatar: string;
  liked_count: number;
  collected_count: number;
  comment_count: number;
  share_count: number;
  ip_location: string;
  image_list: string;
  tag_list: string;
  last_modify_ts: Date;
  note_url: string;
  source_keyword: string;
  post_topic: string;
  post_language: string;
  english_title: string;
  english_desc: string;
  english_ip_location: string;
  english_summary: string;
  english_sentiment: string;
  english_positive_topics: string;
  english_negative_topics: string;
  business_id: string; // uuid
  is_relevant: boolean;
  cover_url: string;
  video_download_url: string;
  english_tag_list: string;
  hashtag_topic_category: string;
  english_desc_literal: string;
  relevance_percent: number;
  has_negative_or_critical_feedback: boolean;
  negative_feedback: string;
  is_wrong_relevancy: boolean;
  is_good_summary: boolean;
  is_good_negative_feedback: boolean;
  tiebreaker_in_relevancy: boolean;
  english_preview_text: string;
  last_modify_action: string;
  import_id: string; // uuid,
  is_official_post: boolean;
  post_category: string;
}

export interface BusinessInstance extends Model {
  business_id: string; // UUID
  business_name: string;
  search_keywords: string[]; // Array of text
  report_frequency: string; // Optional
  business_city: string; // Optional
  business_type: string; // Optional
  similar_businesses: string[]; // Optional
  total_relevant_posts: number; // Optional
}

export interface ClientInstance extends Model {
  id: string; // UUID
  client_name: string;
  send_email: boolean;
  emails_list: string[]; // Array of text
  business_mapping: string[]; // Array of text
  email_trigger_time?: string; // Optional (can be null)
  report_days?: number[]; // Optional (array of integers)
  registered_email: string;
}

export interface ClientUsersInstance extends Model {
  id: string; // UUID
  client_id: string;
  registered_email: string;
}

export interface ActiveSessionsInstance extends Model {
  id: number;
  user_id: number;
  session_id: string;
  browser_id?: string;
  created_at: Date;
  last_active: Date;
  user_agent?: string;
  ip_address?: string;
}

export interface BusinessTopicsInstance extends Model {
  id: string;
  business_id: string;
  topic_type: string;
  topic: string;
  note_id: string;
  created_at: Date;
}
