export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_time: string
          hex_color: string | null
          id: string
          is_all_day: boolean | null
          memo: string | null
          start_time: string
          template_id: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"] | null
          updated_at: string
          upload_history_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_time: string
          hex_color?: string | null
          id?: string
          is_all_day?: boolean | null
          memo?: string | null
          start_time: string
          template_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["activity_type"] | null
          updated_at?: string
          upload_history_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_time?: string
          hex_color?: string | null
          id?: string
          is_all_day?: boolean | null
          memo?: string | null
          start_time?: string
          template_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"] | null
          updated_at?: string
          upload_history_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_upload_history_id_fkey"
            columns: ["upload_history_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_category_map: {
        Row: {
          activity_id: string
          category_id: string
        }
        Insert: {
          activity_id: string
          category_id: string
        }
        Update: {
          activity_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_category_map_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          category_id: string
          created_at: string
          duration_minutes: number
          hex_color: string | null
          id: string
          memo: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          duration_minutes?: number
          hex_color?: string | null
          id?: string
          memo?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          duration_minutes?: number
          hex_color?: string | null
          id?: string
          memo?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          expected_duration_minutes: number | null
          id: string
          linked_event_id: string | null
          priority: string | null
          source_note_id: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_duration_minutes?: number | null
          id?: string
          linked_event_id?: string | null
          priority?: string | null
          source_note_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_duration_minutes?: number | null
          id?: string
          linked_event_id?: string | null
          priority?: string | null
          source_note_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_tasks_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      anniversaries: {
        Row: {
          base_date: string
          calculation_rule: Json
          created_at: string
          deleted_at: string | null
          id: string
          is_lunar: boolean
          preset_type: Database["public"]["Enums"]["anniversary_preset_type"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_date: string
          calculation_rule: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_lunar?: boolean
          preset_type: Database["public"]["Enums"]["anniversary_preset_type"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_date?: string
          calculation_rule?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_lunar?: boolean
          preset_type?: Database["public"]["Enums"]["anniversary_preset_type"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      archive_tabs: {
        Row: {
          board_type: string
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_secure: boolean | null
          name: string
          position: number
          user_id: string
        }
        Insert: {
          board_type: string
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_secure?: boolean | null
          name: string
          position?: number
          user_id: string
        }
        Update: {
          board_type?: string
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_secure?: boolean | null
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          hex_color: string
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hex_color: string
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          hex_color?: string
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      category_presets: {
        Row: {
          category_ids: Json
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          category_ids?: Json
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          category_ids?: Json
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content_data: Json | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_pinned: boolean | null
          tab_id: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          tab_id: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          tab_id?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "archive_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_history: {
        Row: {
          added_count: number
          added_items: Json | null
          created_at: string | null
          duplicate_count: number
          file_name: string
          id: string
          record_type: string
          user_id: string | null
        }
        Insert: {
          added_count: number
          added_items?: Json | null
          created_at?: string | null
          duplicate_count: number
          file_name: string
          id?: string
          record_type: string
          user_id?: string | null
        }
        Update: {
          added_count?: number
          added_items?: Json | null
          created_at?: string | null
          duplicate_count?: number
          file_name?: string
          id?: string
          record_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_security_pin: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          hashed_pin: string
          id: string
          security_answer: string | null
          security_question: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          hashed_pin: string
          id?: string
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          hashed_pin?: string
          id?: string
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          show_korean_holidays: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          show_korean_holidays?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          show_korean_holidays?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          recovery_email: string | null
          username: string | null
          google_refresh_token: string | null
          google_channel_id: string | null
          google_resource_id: string | null
          google_channel_expiration: string | null
          google_sync_token: string | null
          google_sync_calendar_id: string | null
          google_sync_calendar_name: string | null
          google_sync_settings: Json | null
          neis_office_code: string | null
          neis_school_code: string | null
          neis_school_name: string | null
          neis_sync_category_id: string | null
          neis_sync_enabled: boolean | null
          neis_schools_config: Json | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          recovery_email?: string | null
          username?: string | null
          google_refresh_token?: string | null
          google_channel_id?: string | null
          google_resource_id?: string | null
          google_channel_expiration?: string | null
          google_sync_token?: string | null
          google_sync_calendar_id?: string | null
          google_sync_calendar_name?: string | null
          google_sync_settings?: Json | null
          neis_office_code?: string | null
          neis_school_code?: string | null
          neis_school_name?: string | null
          neis_sync_category_id?: string | null
          neis_sync_enabled?: boolean | null
          neis_schools_config?: Json | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          recovery_email?: string | null
          username?: string | null
          google_refresh_token?: string | null
          google_channel_id?: string | null
          google_resource_id?: string | null
          google_channel_expiration?: string | null
          google_sync_token?: string | null
          google_sync_calendar_id?: string | null
          google_sync_calendar_name?: string | null
          google_sync_settings?: Json | null
          neis_office_code?: string | null
          neis_school_code?: string | null
          neis_school_name?: string | null
          neis_sync_category_id?: string | null
          neis_sync_enabled?: boolean | null
          neis_schools_config?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_activity_insights: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          activity_count: number
          category_id: string
          template_id: string
          total_minutes: number
        }[]
      }
    }
    Enums: {
      activity_type: "EVENT" | "TASK"
      anniversary_preset_type:
        | "COUPLE"
        | "BIRTHDAY"
        | "LUNAR_BIRTHDAY"
        | "EXAM"
        | "PAYDAY"
        | "CUSTOM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: ["EVENT", "TASK"],
      anniversary_preset_type: [
        "COUPLE",
        "BIRTHDAY",
        "LUNAR_BIRTHDAY",
        "EXAM",
        "PAYDAY",
        "CUSTOM",
      ],
    },
  },
} as const

