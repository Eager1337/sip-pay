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
      addresses: {
        Row: {
          address: string
          area: string | null
          created_at: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string | null
          landmark: string | null
          phone: string | null
          recipient_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          area?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          phone?: string | null
          recipient_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          phone?: string | null
          recipient_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          areas: string[]
          created_at: string
          eta_max_minutes: number
          eta_min_minutes: number
          fee_leones: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          areas?: string[]
          created_at?: string
          eta_max_minutes?: number
          eta_min_minutes?: number
          fee_leones?: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          areas?: string[]
          created_at?: string
          eta_max_minutes?: number
          eta_min_minutes?: number
          fee_leones?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          manual_transfer_at: string | null
          manual_transfer_number: string | null
          manual_transfer_ref: string | null
          monime_checkout_url: string | null
          monime_order_number: string | null
          monime_payment_code_id: string | null
          monime_payment_id: string | null
          monime_session_id: string | null
          monime_transaction_id: string | null
          monime_ussd_code: string | null
          notes: string | null
          out_for_delivery_at: string | null
          paid_at: string | null
          payment_code_expires_at: string | null
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
          manual_transfer_at?: string | null
          manual_transfer_number?: string | null
          manual_transfer_ref?: string | null
          monime_checkout_url?: string | null
          monime_order_number?: string | null
          monime_payment_code_id?: string | null
          monime_payment_id?: string | null
          monime_session_id?: string | null
          monime_transaction_id?: string | null
          monime_ussd_code?: string | null
          notes?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_code_expires_at?: string | null
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
          manual_transfer_at?: string | null
          manual_transfer_number?: string | null
          manual_transfer_ref?: string | null
          monime_checkout_url?: string | null
          monime_order_number?: string | null
          monime_payment_code_id?: string | null
          monime_payment_id?: string | null
          monime_session_id?: string | null
          monime_transaction_id?: string | null
          monime_ussd_code?: string | null
          notes?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_code_expires_at?: string | null
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
      payment_events: {
        Row: {
          applied: boolean
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          order_id: string | null
          payload: Json
          payment_id: string | null
          provider: string
          provider_event_id: string
          signature_verified: boolean
        }
        Insert: {
          applied?: boolean
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          provider: string
          provider_event_id: string
          signature_verified?: boolean
        }
        Update: {
          applied?: boolean
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          provider?: string
          provider_event_id?: string
          signature_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_leones: number
          checkout_reference: string | null
          created_at: string
          currency: string
          customer_id: string | null
          failure_reason: string | null
          id: string
          metadata: Json
          order_id: string | null
          paid_at: string | null
          payment_method: string
          provider: string
          provider_reference: string | null
          provider_transaction_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_leones: number
          checkout_reference?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payment_method: string
          provider: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_leones?: number
          checkout_reference?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          provider?: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
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
          address: string | null
          approved_at: string | null
          created_at: string
          display_name: string
          email: string | null
          emergency_contact: string | null
          first_name: string | null
          id: string
          is_online: boolean
          last_name: string | null
          national_id: string | null
          phone: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle: string | null
          vehicle_registration: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          approved_at?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          is_online?: boolean
          last_name?: string | null
          national_id?: string | null
          phone: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle?: string | null
          vehicle_registration?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          approved_at?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          is_online?: boolean
          last_name?: string | null
          national_id?: string | null
          phone?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
          vehicle_registration?: string | null
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
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "rider"
        | "customer"
        | "manager"
        | "dispatcher"
        | "support"
        | "finance"
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
      app_role: [
        "admin",
        "user",
        "rider",
        "customer",
        "manager",
        "dispatcher",
        "support",
        "finance",
      ],
    },
  },
} as const
