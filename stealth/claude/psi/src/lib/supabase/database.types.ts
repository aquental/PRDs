export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          call_type: Database["public"]["Enums"]["ai_call_type"];
          characters: number;
          clinic_id: string;
          cost_usd: number;
          created_at: string;
          duration_ms: number | null;
          error_message: string | null;
          id: string;
          input_tokens: number;
          metadata: Json;
          model: string;
          output_tokens: number;
          provider: string;
          status: string;
          therapist_id: string | null;
        };
        Insert: {
          call_type: Database["public"]["Enums"]["ai_call_type"];
          characters?: number;
          clinic_id: string;
          cost_usd?: number;
          created_at?: string;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          input_tokens?: number;
          metadata?: Json;
          model: string;
          output_tokens?: number;
          provider: string;
          status?: string;
          therapist_id?: string | null;
        };
        Update: {
          call_type?: Database["public"]["Enums"]["ai_call_type"];
          characters?: number;
          clinic_id?: string | null;
          cost_usd?: number;
          created_at?: string;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          input_tokens?: number;
          metadata?: Json;
          model?: string | null;
          output_tokens?: number;
          provider?: string;
          status?: string;
          therapist_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_logs_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_conversations: {
        Row: {
          clinic_id: string;
          created_at: string;
          id: string;
          therapist_id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          clinic_id: string;
          created_at?: string;
          id?: string;
          therapist_id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          clinic_id?: string;
          created_at?: string;
          id?: string;
          therapist_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_conversations_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_conversations_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          role: Database["public"]["Enums"]["chat_message_role"];
          tts_audio_url: string | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role: Database["public"]["Enums"]["chat_message_role"];
          tts_audio_url?: string | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role?: Database["public"]["Enums"]["chat_message_role"];
          tts_audio_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "chat_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      clinics: {
        Row: {
          address: string | null;
          address_city: string | null;
          address_complement: string | null;
          address_number: string | null;
          address_state: string | null;
          address_street: string | null;
          address_zip: string | null;
          cancellation_window_hours: number;
          cnpj: string | null;
          created_at: string;
          id: string;
          min_therapists: number;
          name: string;
          repasse_fixo: number;
          repasse_percentual: number;
          timezone: string;
          updated_at: string;
          working_hours_end: number;
          working_hours_start: number;
        };
        Insert: {
          address?: string | null;
          address_city?: string | null;
          address_complement?: string | null;
          address_number?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          cancellation_window_hours?: number;
          cnpj?: string | null;
          created_at?: string;
          id?: string;
          min_therapists?: number;
          name: string;
          repasse_fixo?: number;
          repasse_percentual?: number;
          timezone?: string;
          updated_at?: string;
          working_hours_end?: number;
          working_hours_start?: number;
        };
        Update: {
          address?: string | null;
          address_city?: string | null;
          address_complement?: string | null;
          address_number?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          cancellation_window_hours?: number;
          cnpj?: string | null;
          created_at?: string;
          id?: string;
          min_therapists?: number;
          name?: string;
          repasse_fixo?: number;
          repasse_percentual?: number;
          timezone?: string;
          updated_at?: string;
          working_hours_end?: number;
          working_hours_start?: number;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          clinic_id: string;
          color: string | null;
          created_at: string;
          description: string;
          due_date: string | null;
          due_day: number | null;
          frequency: Database["public"]["Enums"]["expense_frequency"];
          id: string;
          is_active: boolean;
          month: number;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          clinic_id: string;
          color?: string | null;
          created_at?: string;
          description: string;
          due_date?: string | null;
          due_day?: number | null;
          frequency?: Database["public"]["Enums"]["expense_frequency"];
          id?: string;
          is_active?: boolean;
          month?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          clinic_id?: string;
          color?: string | null;
          created_at?: string;
          description?: string;
          due_date?: string | null;
          due_day?: number | null;
          frequency?: Database["public"]["Enums"]["expense_frequency"];
          id?: string;
          is_active?: boolean;
          month?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_entries: {
        Row: {
          amount: number;
          clinic_id: string;
          created_at: string;
          id: string;
          occurred_at: string;
          patient_id: string | null;
          therapist_id: string;
          type: Database["public"]["Enums"]["finance_entry_type"];
        };
        Insert: {
          amount: number;
          clinic_id: string;
          created_at?: string;
          id?: string;
          occurred_at: string;
          patient_id?: string | null;
          therapist_id: string;
          type: Database["public"]["Enums"]["finance_entry_type"];
        };
        Update: {
          amount?: number;
          clinic_id?: string;
          created_at?: string;
          id?: string;
          occurred_at?: string;
          patient_id?: string | null;
          therapist_id?: string;
          type?: Database["public"]["Enums"]["finance_entry_type"];
        };
        Relationships: [
          {
            foreignKeyName: "finance_entries_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          city: string | null;
          created_at: string;
          day: number;
          description: string | null;
          id: string;
          month: number;
          name: string;
          state: string | null;
          type: string;
          year: number | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          day: number;
          description?: string | null;
          id?: string;
          month: number;
          name: string;
          state?: string | null;
          type: string;
          year?: number | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          day?: number;
          description?: string | null;
          id?: string;
          month?: number;
          name?: string;
          state?: string | null;
          type?: string;
          year?: number | null;
        };
        Relationships: [];
      };
      month_closures: {
        Row: {
          clinic_id: string;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          id: string;
          log: Json;
          month_year: string;
          reopened_at: string | null;
          reopened_by: string | null;
          status: string;
          therapist_id: string;
          updated_at: string;
        };
        Insert: {
          clinic_id: string;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          id?: string;
          log?: Json;
          month_year: string;
          reopened_at?: string | null;
          reopened_by?: string | null;
          status?: string;
          therapist_id: string;
          updated_at?: string;
        };
        Update: {
          clinic_id?: string;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          id?: string;
          log?: Json;
          month_year?: string;
          reopened_at?: string | null;
          reopened_by?: string | null;
          status?: string;
          therapist_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "month_closures_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_closures_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_closures_reopened_by_fkey";
            columns: ["reopened_by"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_closures_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_addresses: {
        Row: {
          cep: string;
          cidade: string;
          complemento: string | null;
          created_at: string;
          estado: string;
          logradouro: string;
          numero: string | null;
          patient_id: string;
          updated_at: string;
        };
        Insert: {
          cep: string;
          cidade: string;
          complemento?: string | null;
          created_at?: string;
          estado: string;
          logradouro: string;
          numero?: string | null;
          patient_id: string;
          updated_at?: string;
        };
        Update: {
          cep?: string;
          cidade?: string;
          complemento?: string | null;
          created_at?: string;
          estado?: string;
          logradouro?: string;
          numero?: string | null;
          patient_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_addresses_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: true;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_relatives: {
        Row: {
          created_at: string;
          endereco: string | null;
          id: string;
          nome: string;
          patient_id: string;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          endereco?: string | null;
          id?: string;
          nome: string;
          patient_id: string;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          endereco?: string | null;
          id?: string;
          nome?: string;
          patient_id?: string;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_relatives_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          active: boolean;
          cancellation_policy: string;
          cancellation_window_hours: number | null;
          clinic_id: string;
          cpf: string;
          created_at: string;
          email: string;
          google_calendar_attendee_email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          session_fee: number | null;
          start_date: string | null;
          therapist_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          cancellation_policy?: string;
          cancellation_window_hours?: number | null;
          clinic_id: string;
          cpf: string;
          created_at?: string;
          email: string;
          google_calendar_attendee_email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          session_fee?: number | null;
          start_date?: string | null;
          therapist_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          cancellation_policy?: string;
          cancellation_window_hours?: number | null;
          clinic_id?: string;
          cpf?: string;
          created_at?: string;
          email?: string;
          google_calendar_attendee_email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          session_fee?: number | null;
          start_date?: string | null;
          therapist_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      schedules: {
        Row: {
          active: boolean;
          clinic_id: string;
          created_at: string;
          day_of_week: number;
          duration_minutes: number;
          fee: number | null;
          frequency: Database["public"]["Enums"]["schedule_frequency"];
          id: string;
          patient_id: string;
          start_time: string;
          therapist_id: string;
        };
        Insert: {
          active?: boolean;
          clinic_id: string;
          created_at?: string;
          day_of_week: number;
          duration_minutes?: number;
          fee?: number | null;
          frequency?: Database["public"]["Enums"]["schedule_frequency"];
          id?: string;
          patient_id: string;
          start_time: string;
          therapist_id: string;
        };
        Update: {
          active?: boolean;
          clinic_id?: string;
          created_at?: string;
          day_of_week?: number;
          duration_minutes?: number;
          fee?: number | null;
          frequency?: Database["public"]["Enums"]["schedule_frequency"];
          id?: string;
          patient_id?: string;
          start_time?: string;
          therapist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedules_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      service_switches: {
        Row: {
          enabled: boolean;
          id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          enabled?: boolean;
          id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          cancelled_at: string | null;
          clinic_id: string;
          created_at: string;
          duration_minutes: number;
          fee: number | null;
          frequency: Database["public"]["Enums"]["schedule_frequency"];
          id: string;
          paid: boolean;
          paid_at: string | null;
          patient_id: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["session_status"];
          therapist_id: string;
          updated_at: string;
        };
        Insert: {
          cancelled_at?: string | null;
          clinic_id: string;
          created_at?: string;
          duration_minutes?: number;
          fee?: number | null;
          frequency?: Database["public"]["Enums"]["schedule_frequency"];
          id?: string;
          paid?: boolean;
          paid_at?: string | null;
          patient_id: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["session_status"];
          therapist_id: string;
          updated_at?: string;
        };
        Update: {
          cancelled_at?: string | null;
          clinic_id?: string;
          created_at?: string;
          duration_minutes?: number;
          fee?: number | null;
          frequency?: Database["public"]["Enums"]["schedule_frequency"];
          id?: string;
          paid?: boolean;
          paid_at?: string | null;
          patient_id?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          therapist_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          body: string;
          category: Database["public"]["Enums"]["template_category"];
          clinic_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          media: Database["public"]["Enums"]["template_media"];
          patient_id: string | null;
          therapist_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          category?: Database["public"]["Enums"]["template_category"];
          clinic_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          media?: Database["public"]["Enums"]["template_media"];
          patient_id?: string | null;
          therapist_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: Database["public"]["Enums"]["template_category"];
          clinic_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          media?: Database["public"]["Enums"]["template_media"];
          patient_id?: string | null;
          therapist_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "templates_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "templates_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "therapists";
            referencedColumns: ["id"];
          },
        ];
      };
      therapists: {
        Row: {
          address: string | null;
          avatar_url: string | null;
          clinic_id: string;
          cnpj: string | null;
          created_at: string;
          crp: string;
          default_session_fee: number;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          avatar_url?: string | null;
          clinic_id: string;
          cnpj?: string | null;
          created_at?: string;
          crp: string;
          default_session_fee?: number | null;
          email: string;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          avatar_url?: string | null;
          clinic_id?: string;
          cnpj?: string | null;
          created_at?: string;
          crp?: string;
          default_session_fee?: number | null;
          email?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "therapists_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_clinic_id: { Args: never; Returns: string };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      ai_call_type: "llm_chat" | "tts_synthesis" | "stt_transcription";
      chat_message_role: "user" | "assistant" | "system" | "tool";
      expense_frequency:
        | "monthly"
        | "quarterly"
        | "annual"
        | "one_time"
        | "weekly"
        | "biweekly"
        | "semestral";
      finance_entry_type: "revenue" | "expense";
      schedule_frequency: "weekly" | "biweekly" | "monthly" | "detached";
      session_status: "scheduled" | "completed" | "cancelled" | "no_show";
      template_category: "evolucao" | "relatorio" | "outro";
      template_media: "whatsapp" | "email" | "print";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      ai_call_type: ["llm_chat", "tts_synthesis", "stt_transcription"],
      chat_message_role: ["user", "assistant", "system", "tool"],
      expense_frequency: [
        "monthly",
        "quarterly",
        "annual",
        "one_time",
        "weekly",
        "biweekly",
        "semestral",
      ],
      finance_entry_type: ["revenue", "expense"],
      schedule_frequency: ["weekly", "biweekly", "monthly", "detached"],
      session_status: ["scheduled", "completed", "cancelled", "no_show"],
      template_category: ["evolucao", "relatorio", "outro"],
      template_media: ["whatsapp", "email", "print"],
    },
  },
} as const;
