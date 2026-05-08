export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          baseline_rhr: number
          mhr: number
          rhr: number
          ftp_watts: number
          weight_lbs: number | null
          height_inches: number
          timezone: string
          preferences: Json
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & { email: string }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      activities: {
        Row: {
          id: string
          user_id: string
          source: 'strava' | 'peloton' | 'manual'
          activity_type: string
          title: string | null
          activity_date: string
          start_time: string | null
          duration_seconds: number | null
          distance_miles: number | null
          elevation_feet: number | null
          calories: number | null
          avg_hr: number | null
          max_hr: number | null
          avg_pace_seconds_per_mile: number | null
          avg_watts: number | null
          total_output_kj: number | null
          tss: number | null
          strava_id: number | null
          peloton_id: string | null
          raw_json: Json | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      body_metrics: {
        Row: {
          id: string
          user_id: string
          measured_at: string
          source: 'withings' | 'manual'
          weight_lbs: number | null
          body_fat_pct: number | null
          muscle_mass_lbs: number | null
          muscle_mass_pct: number | null
          bone_mass_lbs: number | null
          water_pct: number | null
          bmi: number | null
          visceral_fat: number | null
          bmr: number | null
          withings_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['body_metrics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['body_metrics']['Insert']>
      }
      recovery_signals: {
        Row: {
          id: string
          user_id: string
          signal_date: string
          rhr: number | null
          hrv_ms: number | null
          sleep_score: number | null
          sleep_duration_hours: number | null
          drinks_consumed: number
          source: string
          recovery_score: number | null
          recovery_tier: 'go_hard' | 'moderate' | 'recovery' | 'unknown' | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recovery_signals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recovery_signals']['Insert']>
      }
      program_tracker: {
        Row: {
          id: string
          user_id: string
          program_name: string
          instructor: string | null
          current_week: number
          current_day: number
          total_weeks: number | null
          next_workout_title: string | null
          next_workout_url: string | null
          next_workout_type: string | null
          last_completed_date: string | null
          started_at: string | null
          notes: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['program_tracker']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['program_tracker']['Insert']>
      }
      daily_plans: {
        Row: {
          id: string
          user_id: string
          plan_date: string
          recovery_score: number | null
          recovery_tier: string | null
          recommended_workout_type: string | null
          recommended_intensity: string | null
          peloton_class_suggestion: string | null
          peloton_class_url: string | null
          reasoning: Json | null
          thinking_prompt: string | null
          thinking_prompt_answer: string | null
          actual_activity_id: string | null
          plan_status: string
          family_creative_done: boolean
          family_creative_note: string | null
          home_done: boolean
          home_note: string | null
          financial_done: boolean
          financial_note: string | null
          personal_done: boolean
          personal_note: string | null
          drinks_today: number
          mood_score: number | null
          morning_briefing: string | null
          briefing_generated_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_plans']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['daily_plans']['Insert']>
      }
      todos: {
        Row: {
          id: string
          user_id: string
          category: 'house' | 'truck'
          title: string
          notes: string | null
          weather_required: 'any' | 'dry' | 'sunny'
          effort: 'quick' | 'half_day' | 'full_day' | 'multi_day' | null
          who_required: string
          blocked_by: string | null
          priority_order: number
          status: 'todo' | 'in_progress' | 'done'
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['todos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['todos']['Insert']>
      }
      inbox_items: {
        Row: {
          id: string
          user_id: string
          content: string
          captured_at: string
          processed: boolean
          processed_at: string | null
          converted_to: string | null
          converted_id: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['inbox_items']['Row'], 'id' | 'captured_at'>
        Update: Partial<Database['public']['Tables']['inbox_items']['Insert']>
      }
      personal_tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string | null
          due_date: string | null
          priority_order: number
          status: 'todo' | 'done'
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['personal_tasks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['personal_tasks']['Insert']>
      }
      persistent_reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string | null
          urgency: 'low' | 'medium' | 'high'
          surfaces_daily: boolean
          snoozed_until: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['persistent_reminders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['persistent_reminders']['Insert']>
      }
      inspiration_photos: {
        Row: {
          id: string
          user_id: string
          storage_path: string
          thumbnail_path: string | null
          taken_at: string
          location: string | null
          activity_type: string | null
          caption: string | null
          people: string[] | null
          times_surfaced: number
          last_surfaced_at: string | null
          user_starred: boolean
          original_filename: string | null
          exif_data: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inspiration_photos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inspiration_photos']['Insert']>
      }
      annotations: {
        Row: {
          id: string
          user_id: string
          annotation_date: string
          label: string
          category: string | null
          note: string | null
          show_on_charts: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['annotations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['annotations']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
