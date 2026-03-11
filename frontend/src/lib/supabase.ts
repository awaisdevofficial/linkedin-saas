import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          hook: string;
          content: string;
          hashtags: string[];
          hashtags_raw: Record<string, unknown> | null;
          status: 'pending' | 'approved' | 'rejected' | 'ready_to_post' | 'posted';
          scheduled_at: string | null;
          posted_at: string | null;
          linkedin_post_id: string | null;
          engagement_count: number;
          has_media: boolean;
          media_type: 'image' | 'video' | null;
          suggested_comments: string[];
          visual_prompt: Record<string, unknown> | null;
          media_url: string | null;
          is_video: boolean;
          is_checked: boolean;
          posted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hook: string;
          content: string;
          hashtags?: string[];
          hashtags_raw?: Record<string, unknown> | null;
          status?: 'pending' | 'approved' | 'rejected' | 'ready_to_post' | 'posted';
          scheduled_at?: string | null;
          posted_at?: string | null;
          linkedin_post_id?: string | null;
          engagement_count?: number;
          has_media?: boolean;
          media_type?: 'image' | 'video' | null;
          suggested_comments?: string[];
          visual_prompt?: Record<string, unknown> | null;
          media_url?: string | null;
          is_video?: boolean;
          is_checked?: boolean;
          posted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hook?: string;
          content?: string;
          hashtags?: string[];
          hashtags_raw?: Record<string, unknown> | null;
          status?: 'pending' | 'approved' | 'rejected' | 'ready_to_post' | 'posted';
          scheduled_at?: string | null;
          posted_at?: string | null;
          linkedin_post_id?: string | null;
          engagement_count?: number;
          has_media?: boolean;
          media_type?: 'image' | 'video' | null;
          suggested_comments?: string[];
          visual_prompt?: Record<string, unknown> | null;
          media_url?: string | null;
          is_video?: boolean;
          is_checked?: boolean;
          posted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          enabled: boolean;
          time_slots: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          enabled?: boolean;
          time_slots?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day?: string;
          enabled?: boolean;
          time_slots?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      linkedin_connections: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          li_at_cookie: string | null;
          person_urn: string;
          is_active: boolean;
          last_connected_at: string;
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          li_at_cookie?: string | null;
          person_urn: string;
          is_active?: boolean;
          last_connected_at?: string;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          li_at_cookie?: string | null;
          person_urn?: string;
          is_active?: boolean;
          last_connected_at?: string;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      engagement_logs: {
        Row: {
          id: string;
          user_id: string;
          post_uri: string;
          activity_id: string | null;
          action: 'like' | 'comment' | 'reply';
          comment_text: string | null;
          status: 'pending' | 'completed' | 'failed';
          executed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_uri: string;
          activity_id?: string | null;
          action: 'like' | 'comment' | 'reply';
          comment_text?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          executed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_uri?: string;
          activity_id?: string | null;
          action?: 'like' | 'comment' | 'reply';
          comment_text?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          executed_at?: string | null;
          created_at?: string;
        };
      };
      engagement_settings: {
        Row: {
          id: string;
          user_id: string;
          auto_liking: boolean;
          auto_commenting: boolean;
          auto_replying: boolean;
          max_engagements_per_day: number;
          active_days: string[];
          active_start_time: string;
          active_end_time: string;
          /** Minutes between each engagement (like/comment). Min 5, max 1440 (1 day). */
          engagement_interval_minutes: number;
          /** Minutes between posts. Min 720 (12h), max 10080 (1 week). */
          post_interval_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          auto_liking?: boolean;
          auto_commenting?: boolean;
          auto_replying?: boolean;
          max_engagements_per_day?: number;
          active_days?: string[];
          active_start_time?: string;
          active_end_time?: string;
          engagement_interval_minutes?: number;
          post_interval_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          auto_liking?: boolean;
          auto_commenting?: boolean;
          auto_replying?: boolean;
          max_engagements_per_day?: number;
          active_days?: string[];
          active_start_time?: string;
          active_end_time?: string;
          engagement_interval_minutes?: number;
          post_interval_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_content_settings: {
        Row: {
          id: string;
          user_id: string;
          niche: string;
          custom_keywords: string[];
          topics_to_avoid: string[];
          post_tone: string;
          target_audience: string | null;
          custom_post_prompt: string | null;
          use_default_post_prompt: boolean;
          comment_tone: string;
          custom_comment_prompt: string | null;
          use_default_comment_prompt: boolean;
          custom_reply_prompt: string | null;
          use_default_reply_prompt: boolean;
          brand_voice_description: string | null;
          cta_style: string;
          custom_cta: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          niche?: string;
          custom_keywords?: string[];
          topics_to_avoid?: string[];
          post_tone?: string;
          target_audience?: string | null;
          custom_post_prompt?: string | null;
          use_default_post_prompt?: boolean;
          comment_tone?: string;
          custom_comment_prompt?: string | null;
          use_default_comment_prompt?: boolean;
          custom_reply_prompt?: string | null;
          use_default_reply_prompt?: boolean;
          brand_voice_description?: string | null;
          cta_style?: string;
          custom_cta?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          niche?: string;
          custom_keywords?: string[];
          topics_to_avoid?: string[];
          post_tone?: string;
          target_audience?: string | null;
          custom_post_prompt?: string | null;
          use_default_post_prompt?: boolean;
          comment_tone?: string;
          custom_comment_prompt?: string | null;
          use_default_comment_prompt?: boolean;
          custom_reply_prompt?: string | null;
          use_default_reply_prompt?: boolean;
          brand_voice_description?: string | null;
          cta_style?: string;
          custom_cta?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      prompt_templates: {
        Row: {
          id: string;
          name: string;
          type: string;
          niche: string;
          prompt: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'post' | 'comment' | 'reply';
          niche: string;
          is_default?: boolean;
          prompt: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'post' | 'comment' | 'reply';
          niche?: string;
          is_default?: boolean;
          prompt?: string;
          created_at?: string;
        };
      };
      user_rss_feeds: {
        Row: {
          id: string;
          user_id: string;
          feed_url: string;
          label: string;
          is_custom: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feed_url: string;
          label: string;
          is_custom?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          feed_url?: string;
          label?: string;
          is_custom?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      niche_rss_feeds: {
        Row: {
          id: string;
          niche: string;
          label: string;
          url: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          niche: string;
          label: string;
          url: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          niche?: string;
          label?: string;
          url?: string;
          is_active?: boolean;
        };
      };
      user_notification_settings: {
        Row: {
          id: string;
          user_id: string;
          approval_emails: boolean;
          publish_emails: boolean;
          weekly_summary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          approval_emails?: boolean;
          publish_emails?: boolean;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          approval_emails?: boolean;
          publish_emails?: boolean;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comment_replies: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          post_uri: string | null;
          comment_urn: string | null;
          comment_text: string | null;
          reply_text: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          post_uri: string;
          comment_urn: string;
          comment_text?: string | null;
          reply_text: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string | null;
          post_uri?: string;
          comment_urn?: string;
          comment_text?: string | null;
          reply_text?: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
      };
    };
  };
};
