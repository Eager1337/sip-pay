export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          path: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          path?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          path?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          meta: Json
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          meta?: Json
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          meta?: Json
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address: string
          admin_notes: string | null
          buyer_user_id: string | null
          cancelled_at: string | null
          city: string | null
          client_checkout_id: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_email: string | null
          customer_name: string
          delivered_at: string | null
          delivery_code: string | null
          delivery_fee_leones: number
          discount_leones: number
          district: string | null
          id: string
          items: Json
          monime_order_number: string | null
          monime_payment_id: string | null
          monime_session_id: string | null
          monime_transaction_id: string | null
          notes: string | null
          out_for_delivery_at: string | null
          paid_at: string | null
          payment_failure_reason: string | null
          payment_method: string | null
          payment_provider: string | null
          phone: string
          rider_commission_leones: number | null
          rider_commission_pct: number | null
          rider_id: string | null
          status: string
          total_leones: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address: string
          admin_notes?: string | null
          buyer_user_id?: string | null
          cancelled_at?: string | null
          city?: string | null
          client_checkout_id?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_name: string
          delivered_at?: string | null
          delivery_code?: string | null
          delivery_fee_leones?: number
          discount_leones?: number
          district?: string | null
          id?: string
          items: Json
          monime_order_number?: string | null
          monime_payment_id?: string | null
          monime_session_id?: string | null
          monime_transaction_id?: string | null
          notes?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          phone: string
          rider_commission_leones?: number | null
          rider_commission_pct?: number | null
          rider_id?: string | null
          status?: string
          total_leones: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: string
          admin_notes?: string | null
          buyer_user_id?: string | null
          cancelled_at?: string | null
          city?: string | null
          client_checkout_id?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_name?: string
          delivered_at?: string | null
          delivery_code?: string | null
          delivery_fee_leones?: number
          discount_leones?: number
          district?: string | null
          id?: string
          items?: Json
          monime_order_number?: string | null
          monime_payment_id?: string | null
          monime_session_id?: string | null
          monime_transaction_id?: string | null
          notes?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          phone?: string
          rider_commission_leones?: number | null
          rider_commission_pct?: number | null
          rider_id?: string | null
          status?: string
          total_leones?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string
          drink_slug: string
          hidden: boolean
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          drink_slug: string
          hidden?: boolean
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          drink_slug?: string
          hidden?: boolean
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      rider_locations: {
        Row: {
          id: string
          lat: number
          lng: number
          order_id: string | null
          rider_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          order_id?: string | null
          rider_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          order_id?: string | null
          rider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_payouts: {
        Row: {
          amount_leones: number
          created_at: string
          id: string
          order_id: string
          rider_id: string
          status: string
        }
        Insert: {
          amount_leones: number
          created_at?: string
          id?: string
          order_id: string
          rider_id: string
          status?: string
        }
        Update: {
          amount_leones?: number
          created_at?: string
          id?: string
          order_id?: string
          rider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          id?: string
          phone: string
          updated_at?: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          applied: boolean
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          order_id: string | null
          payload: Json
          provider: string
          verified: boolean
        }
        Insert: {
          applied?: boolean
          created_at?: string
          error?: string | null
          event_type?: string | null
          id: string
          order_id?: string | null
          payload?: Json
          provider?: string
          verified?: boolean
        }
        Update: {
          applied?: boolean
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_leads: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          estimated_quantity: string | null
          full_name: string
          id: string
          message: string | null
          phone: string
          region: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          estimated_quantity?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone: string
          region?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          estimated_quantity?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          region?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          drink_slug: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drink_slug: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drink_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "rider"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "rider"],
    },
  },
} as const
