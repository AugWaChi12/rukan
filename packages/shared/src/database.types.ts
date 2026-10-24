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
      get_my_profile: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_status: { Args: Record<PropertyKey, never>; Returns: Json };
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
      record_consent: { Args: { p_doc: string; p_version: string }; Returns: undefined };
      remove_photo: { Args: { p_photo_id: string }; Returns: string };
      set_interests: { Args: { p_interest_ids: string[] }; Returns: undefined };
      set_prompt_answer: { Args: { p_answer: string; p_prompt_id: string }; Returns: undefined };
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
