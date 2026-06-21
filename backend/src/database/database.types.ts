/**
 * Tipo central de la base de datos.
 * Mapea cada tabla a sus tipos Row, Insert y Update.
 *
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          role: string;
          skin_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          role?: string;
          skin_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          role?: string;
          skin_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      routines: {
        Row: {
          id: string;
          user_id: string;
          assigned_by: string | null;
          name: string;
          description: string | null;
          time_of_day: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assigned_by?: string | null;
          name: string;
          description?: string | null;
          time_of_day?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          assigned_by?: string | null;
          description?: string | null;
          time_of_day?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      routine_steps: {
        Row: {
          id: string;
          routine_id: string;
          name: string;
          description: string | null;
          category: string | null;
          step_order: number;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          step_order?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: string | null;
          step_order?: number;
          is_required?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          category: string | null;
          notes: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          category?: string | null;
          notes?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          brand?: string | null;
          category?: string | null;
          notes?: string | null;
          image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      specialist_profiles: {
        Row: {
          id: string;
          user_id: string;
          specialty: string;
          license_number: string;
          dni_photo_url: string;
          title_photo_url: string;
          license_status: string;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          specialty: string;
          license_number: string;
          dni_photo_url: string;
          title_photo_url: string;
          license_status?: string;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          specialty?: string;
          license_number?: string;
          dni_photo_url?: string;
          title_photo_url?: string;
          license_status?: string;
          rejection_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      skin_profiles: {
        Row: {
          id: string;
          user_id: string;
          age_range: string | null;
          skin_type: string | null;
          imperfections: string | null;
          main_goal: string | null;
          routine_steps: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          age_range?: string | null;
          skin_type?: string | null;
          imperfections?: string | null;
          main_goal?: string | null;
          routine_steps?: string | null;
          created_at?: string;
        };
        Update: {
          age_range?: string | null;
          skin_type?: string | null;
          imperfections?: string | null;
          main_goal?: string | null;
          routine_steps?: string | null;
        };
        Relationships: [];
      };

      routine_step_products: {
        Row: {
          id: string;
          step_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: Record<string, never>; // join table: no se actualiza, solo insert/delete
        Relationships: [];
      };

      routine_logs: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          log_date: string;
          completed_at: string | null;
          completion_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          routine_id: string;
          log_date: string;
          completed_at?: string | null;
          completion_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          completion_percentage?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      routine_step_logs: {
        Row: {
          id: string;
          routine_log_id: string;
          step_id: string;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          routine_log_id: string;
          step_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_completed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_token: string;
          platform: 'ios' | 'android' | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_token: string;
          platform?: 'ios' | 'android' | null;
          updated_at?: string;
        };
        Update: {
          expo_token?: string;
          platform?: 'ios' | 'android' | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ─── Shortcuts para no escribir Database['public']['Tables']['x']['Row'] ───────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
