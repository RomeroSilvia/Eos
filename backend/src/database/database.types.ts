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
          center_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          specialty: string;
          license_number?: string;
          dni_photo_url: string;
          title_photo_url: string;
          license_status?: string;
          rejection_reason?: string | null;
          center_id?: string | null;
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
          center_id?: string | null;
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

      client_specialist_relations: {
        Row: {
          id: string;
          client_id: string;
          specialist_id: string;
          status: 'active' | 'inactive';
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          specialist_id: string;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
        Update: {
          status?: 'active' | 'inactive';
        };
        Relationships: [];
      };

      chat_messages: {
        Row: {
          id: string;
          relation_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'image';
          media_path: string | null;
          media_mime_type: string | null;
          media_size: number | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          relation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'image';
          media_path?: string | null;
          media_mime_type?: string | null;
          media_size?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };

      notification_history: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          kind: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          kind: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };

      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          level: string;
          features: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          level: string;
          features?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          price?: number;
          level?: string;
          features?: Record<string, unknown>;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string;
          owner_type: 'user' | 'center';
          owner_id: string;
          plan_id: string;
          status: 'active' | 'pending' | 'canceled' | 'expired' | 'past_due';
          started_at: string;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_type: 'user' | 'center';
          owner_id: string;
          plan_id: string;
          status?: 'active' | 'pending' | 'canceled' | 'expired' | 'past_due';
          started_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'pending' | 'canceled' | 'expired' | 'past_due';
          ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      centers: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          city: string | null;
          province: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          city?: string | null;
          province?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          phone?: string | null;
          city?: string | null;
          province?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      center_admins: {
        Row: {
          id: string;
          user_id: string;
          center_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          center_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          entity: string;
          entity_id: string;
          before: unknown;
          after: unknown;
          metadata: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          before?: unknown;
          after?: unknown;
          metadata?: unknown;
          created_at?: string;
        };
        Update: {
          metadata?: unknown;
          created_at?: string;
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
