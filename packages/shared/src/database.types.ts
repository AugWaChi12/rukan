export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          active: boolean;
          city: string;
          created_at: string;
          id: string;
          name_en: string;
          name_th: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          city?: string;
          created_at?: string;
          id: string;
          name_en: string;
          name_th: string;
          sort?: number;
        };
        Update: {
          active?: boolean;
          city?: string;
          created_at?: string;
          id?: string;
          name_en?: string;
          name_th?: string;
          sort?: number;
        };
        Relationships: [];
      };
      interests: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          id: string;
          name_en: string;
          name_th: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          id: string;
          name_en: string;
          name_th: string;
          sort?: number;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          id?: string;
          name_en?: string;
          name_th?: string;
          sort?: number;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          created_at: string;
          id: string;
          moderation_status: string;
          position: number;
          storage_path: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          moderation_status?: string;
          position: number;
          storage_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          moderation_status?: string;
          position?: number;
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_interests: {
        Row: {
          created_at: string;
          interest_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          interest_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          interest_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_interests_interest_id_fkey';
            columns: ['interest_id'];
            isOneToOne: false;
            referencedRelation: 'interests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_interests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_prompts: {
        Row: {
          answer: string;
          created_at: string;
          prompt_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answer: string;
          created_at?: string;
          prompt_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          prompt_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_prompts_prompt_id_fkey';
            columns: ['prompt_id'];
            isOneToOne: false;
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_prompts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          area_id: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          last_active_at: string | null;
          locale: string;
          modes: string[];
          occupation: string | null;
          onboarded_at: string | null;
          org_badge: string | null;
          theme: string;
          updated_at: string;
          verification_level: Database['public']['Enums']['verification_level'];
        };
        ComputedFields: never;
        Insert: {
          area_id?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          last_active_at?: string | null;
          locale?: string;
          modes?: string[];
          occupation?: string | null;
          onboarded_at?: string | null;
          org_badge?: string | null;
          theme?: string;
          updated_at?: string;
          verification_level?: Database['public']['Enums']['verification_level'];
        };
        Update: {
          area_id?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          last_active_at?: string | null;
          locale?: string;
          modes?: string[];
          occupation?: string | null;
          onboarded_at?: string | null;
          org_badge?: string | null;
          theme?: string;
          updated_at?: string;
          verification_level?: Database['public']['Enums']['verification_level'];
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
        ];
      };
      prompts: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          sort: number;
          text_en: string;
          text_th: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id: string;
          sort?: number;
          text_en: string;
          text_th: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          sort?: number;
          text_en?: string;
          text_th?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_photo: { Args: { p_position: number; p_storage_path: string }; Returns: string };
      block_user_from: { Args: { p_target_id: string; p_target_type: string }; Returns: undefined };
      can_access_realtime_topic: { Args: { p_topic: string }; Returns: boolean };
      checkin_mood: { Args: { p_mood: string }; Returns: Json };
      complete_onboarding: {
        Args: {
          p_area_id?: string;
          p_birthdate: string;
          p_display_name: string;
          p_modes: string[];
          p_occupation?: string;
        };
        Returns: undefined;
      };
      create_post: {
        Args: { p_body: string; p_media_url?: string; p_mood?: string };
        Returns: Json;
      };
      create_story: { Args: { p_caption?: string; p_media_url: string }; Returns: Json };
      create_topup_order: {
        Args: { p_package_id: string; p_slip_url?: string; p_target_user_id?: string };
        Returns: Json;
      };
      delete_my_post: { Args: { p_post_id: string }; Returns: undefined };
      delete_my_reply: { Args: { p_reply_id: string }; Returns: undefined };
      delete_my_story: { Args: { p_story_id: string }; Returns: boolean };
      exchange_coins_for_pass: { Args: { p_duration?: string; p_tier: string }; Returns: Json };
      get_active_stories: { Args: Record<PropertyKey, never>; Returns: Json };
      get_conversation: { Args: { p_conversation_id: string }; Returns: Json };
      get_conversations: { Args: Record<PropertyKey, never>; Returns: Json };
      get_feed: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: string;
          p_hashtag?: string;
          p_limit?: number;
          p_sort?: string;
          p_tab?: string;
        };
        Returns: Json;
      };
      get_messages: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: string;
          p_conversation_id: string;
          p_limit?: number;
        };
        Returns: Json;
      };
      get_my_blocks: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_bubbles: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_deck: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_matches: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_moderation_history: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_profile: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_status: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_subscription: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_topup_orders: { Args: Record<PropertyKey, never>; Returns: Json };
      get_profile_card: { Args: { p_user_id: string }; Returns: Json };
      get_replies: { Args: { p_post_id: string }; Returns: Json };
      get_tier_configs: { Args: Record<PropertyKey, never>; Returns: Json };
      get_trending_hashtags: { Args: { p_hours?: number; p_limit?: number }; Returns: Json };
      get_user_topup_info: { Args: { p_user_id: string }; Returns: Json };
      health: { Args: Record<PropertyKey, never>; Returns: Json };
      join_waitlist: {
        Args: {
          p_age_band?: string;
          p_area: string;
          p_consent_version: string;
          p_email: string;
          p_intents?: string[];
          p_locale?: string;
          p_utm?: Json;
        };
        Returns: Json;
      };
      like_post: { Args: { p_post_id: string }; Returns: undefined };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      mod_approve_topup_order: { Args: { p_order_id: string }; Returns: Json };
      mod_get_dashboard_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      mod_get_report: { Args: { p_report_id: string }; Returns: Json };
      mod_get_waitlist_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      mod_grant_user_coins: {
        Args: { p_amount: number; p_note?: string; p_user_id: string };
        Returns: Json;
      };
      mod_list_appeals: { Args: { p_limit?: number; p_status?: string }; Returns: Json };
      mod_list_reports: { Args: { p_limit?: number; p_status?: string }; Returns: Json };
      mod_list_users: {
        Args: {
          p_filter_state?: string;
          p_filter_tier?: string;
          p_limit?: number;
          p_offset?: number;
          p_search?: string;
        };
        Returns: Json;
      };
      mod_list_waitlist: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string };
        Returns: {
          age_band: string;
          area: string;
          consented_at: string;
          created_at: string;
          email: string;
          id: string;
          intents: string[];
          locale: string;
        }[];
      };
      mod_reveal_author: {
        Args: { p_reason: string; p_target_id: string; p_target_type: string };
        Returns: Json;
      };
      mod_review_appeal: { Args: { p_action_id: string; p_decision: string }; Returns: undefined };
      mod_set_user_modes: { Args: { p_modes: string[]; p_user_id: string }; Returns: Json };
      mod_set_user_subscription: {
        Args: { p_expires_at?: string; p_source?: string; p_tier: string; p_user_id: string };
        Returns: Json;
      };
      mod_set_user_verification: {
        Args: { p_level: Database['public']['Enums']['verification_level']; p_user_id: string };
        Returns: Json;
      };
      mod_take_action: {
        Args: {
          p_action: string;
          p_level: number;
          p_reason: string;
          p_report_id?: string;
          p_target_id?: string;
          p_target_type?: string;
          p_until?: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      mod_update_tier_config: { Args: { p_config: Json; p_tier: string }; Returns: Json };
      polite_close: { Args: { p_match_id: string; p_template_id?: string }; Returns: undefined };
      record_consent: { Args: { p_doc: string; p_version: string }; Returns: undefined };
      remove_photo: { Args: { p_photo_id: string }; Returns: string };
      reply_post: { Args: { p_body: string; p_post_id: string }; Returns: Json };
      report_target: {
        Args: { p_details?: string; p_reason: string; p_target_id: string; p_target_type: string };
        Returns: Json;
      };
      request_photo_unlock: { Args: { p_conversation_id: string }; Returns: Json };
      request_reveal: { Args: { p_conversation_id: string }; Returns: Json };
      respond_bubble: { Args: { p_accept: boolean; p_bubble_id: string }; Returns: Json };
      send_bubble: { Args: { p_message: string; p_post_id: string }; Returns: Json };
      send_message: { Args: { p_body: string; p_conversation_id: string }; Returns: Json };
      set_interests: { Args: { p_interest_ids: string[] }; Returns: undefined };
      set_prompt_answer: { Args: { p_answer: string; p_prompt_id: string }; Returns: undefined };
      submit_appeal: { Args: { p_action_id: string; p_appeal_text: string }; Returns: undefined };
      swipe: { Args: { p_candidate_id: string; p_direction: string }; Returns: Json };
      unblock_user: { Args: { p_block_id: string }; Returns: undefined };
      unlike_post: { Args: { p_post_id: string }; Returns: undefined };
      unmatch: { Args: { p_match_id: string }; Returns: undefined };
      update_my_profile: {
        Args: {
          p_area_id?: string;
          p_bio?: string;
          p_display_name?: string;
          p_locale?: string;
          p_modes?: string[];
          p_occupation?: string;
          p_theme?: string;
        };
        Returns: undefined;
      };
      use_ai_wingman: { Args: { p_context_text?: string; p_context_type?: string }; Returns: Json };
    };
    Enums: {
      verification_level: 'none' | 'phone' | 'selfie';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      verification_level: ['none', 'phone', 'selfie'],
    },
  },
} as const;
