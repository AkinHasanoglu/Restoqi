export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          confidence: number | null
          days_until_stockout: number | null
          id: string
          metadata: Json | null
          predicted_at: string
          product_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          team_id: string
          valid_until: string
        }
        Insert: {
          confidence?: number | null
          days_until_stockout?: number | null
          id?: string
          metadata?: Json | null
          predicted_at?: string
          product_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          team_id: string
          valid_until?: string
        }
        Update: {
          confidence?: number | null
          days_until_stockout?: number | null
          id?: string
          metadata?: Json | null
          predicted_at?: string
          product_id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          team_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_deliveries: {
        Row: {
          alert_id: string
          attempts: number
          channel_id: string | null
          channel_type: Database["public"]["Enums"]["alert_channel"]
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          status: Database["public"]["Enums"]["alert_status"]
          team_id: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          channel_id?: string | null
          channel_type: Database["public"]["Enums"]["alert_channel"]
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          team_id: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          channel_id?: string | null
          channel_type?: Database["public"]["Enums"]["alert_channel"]
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          channel_ids: string[]
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          quiet_hours: Json | null
          scope_product_ids: string[] | null
          scope_store_ids: string[] | null
          scope_tags: string[] | null
          silence_window_minutes: number
          team_id: string
          threshold_type: Database["public"]["Enums"]["threshold_type"]
          threshold_value: number
          updated_at: string
        }
        Insert: {
          channel_ids?: string[]
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          quiet_hours?: Json | null
          scope_product_ids?: string[] | null
          scope_store_ids?: string[] | null
          scope_tags?: string[] | null
          silence_window_minutes?: number
          team_id: string
          threshold_type?: Database["public"]["Enums"]["threshold_type"]
          threshold_value: number
          updated_at?: string
        }
        Update: {
          channel_ids?: string[]
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          quiet_hours?: Json | null
          scope_product_ids?: string[] | null
          scope_store_ids?: string[] | null
          scope_tags?: string[] | null
          silence_window_minutes?: number
          team_id?: string
          threshold_type?: Database["public"]["Enums"]["threshold_type"]
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          channel_id: string | null
          channel_type: Database["public"]["Enums"]["alert_channel"] | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          product_id: string
          quantity: number
          rule_id: string | null
          snapshot_id: string | null
          status: Database["public"]["Enums"]["alert_status"]
          store_id: string | null
          team_id: string
          threshold_value: number
        }
        Insert: {
          channel_id?: string | null
          channel_type?: Database["public"]["Enums"]["alert_channel"] | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          product_id: string
          quantity: number
          rule_id?: string | null
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          store_id?: string | null
          team_id: string
          threshold_value: number
        }
        Update: {
          channel_id?: string | null
          channel_type?: Database["public"]["Enums"]["alert_channel"] | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          product_id?: string
          quantity?: number
          rule_id?: string | null
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          store_id?: string | null
          team_id?: string
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "alerts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "connected_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          is_active: boolean
          provider: Database["public"]["Enums"]["ai_provider"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_active?: boolean
          provider: Database["public"]["Enums"]["ai_provider"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["ai_provider"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          team_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          team_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          team_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_stores: {
        Row: {
          created_at: string
          external_store_id: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          store_domain: string | null
          store_name: string
          suspended_at: string | null
          sync_error: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_store_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          store_domain?: string | null
          store_name: string
          suspended_at?: string | null
          sync_error?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_store_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          store_domain?: string | null
          store_name?: string
          suspended_at?: string | null
          sync_error?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_stores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      store_secrets: {
        Row: {
          encrypted_creds: string | null
          store_id: string
          webhook_secret: string
        }
        Insert: {
          encrypted_creds?: string | null
          store_id: string
          webhook_secret?: string
        }
        Update: {
          encrypted_creds?: string | null
          store_id?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "connected_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          id: string
          location_id: string | null
          location_name: string | null
          product_id: string
          quantity: number
          recorded_at: string
          source: string
          team_id: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          location_id?: string | null
          location_name?: string | null
          product_id: string
          quantity: number
          recorded_at?: string
          source?: string
          team_id: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          location_id?: string | null
          location_name?: string | null
          product_id?: string
          quantity?: number
          recorded_at?: string
          source?: string
          team_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_type: Database["public"]["Enums"]["alert_channel"]
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["alert_channel"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["alert_channel"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string
          external_id: string
          id: string
          image_url: string | null
          product_id: string
          sku: string | null
          title: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          external_id: string
          id?: string
          image_url?: string | null
          product_id: string
          sku?: string | null
          title: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          external_id?: string
          id?: string
          image_url?: string | null
          product_id?: string
          sku?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          created_at: string
          current_quantity: number | null
          external_id: string
          id: string
          image_url: string | null
          is_tracked: boolean
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["platform_type"] | null
          product_url: string | null
          sku: string | null
          store_id: string
          tags: string[] | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          current_quantity?: number | null
          external_id: string
          id?: string
          image_url?: string | null
          is_tracked?: boolean
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          product_url?: string | null
          sku?: string | null
          store_id: string
          tags?: string[] | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          current_quantity?: number | null
          external_id?: string
          id?: string
          image_url?: string | null
          is_tracked?: boolean
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          product_url?: string | null
          sku?: string | null
          store_id?: string
          tags?: string[] | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "connected_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"] | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_portal_url: string | null
          id: string
          paddle_customer_id: string | null
          paddle_price_id: string | null
          paddle_subscription_id: string | null
          plan: Database["public"]["Enums"]["plan_name"]
          status: Database["public"]["Enums"]["subscription_status"]
          team_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_portal_url?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_name"]
          status?: Database["public"]["Enums"]["subscription_status"]
          team_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_portal_url?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_name"]
          status?: Database["public"]["Enums"]["subscription_status"]
          team_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          team_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_id: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          locale: string
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["plan_name"]
          slug: string
          updated_at: string
          weekly_digest_opt_out: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["plan_name"]
          slug: string
          updated_at?: string
          weekly_digest_opt_out?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_name"]
          slug?: string
          updated_at?: string
          weekly_digest_opt_out?: boolean
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          alerts_this_month: number
          id: string
          members_count: number
          month_start: string
          product_count: number
          rule_count: number
          store_count: number
          team_id: string
          updated_at: string
        }
        Insert: {
          alerts_this_month?: number
          id?: string
          members_count?: number
          month_start?: string
          product_count?: number
          rule_count?: number
          store_count?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          alerts_this_month?: number
          id?: string
          members_count?: number
          month_start?: string
          product_count?: number
          rule_count?: number
          store_count?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_role: {
        Args: {
          p_team_id: string
        }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      has_team_role: {
        Args: {
          p_team_id: string
          min_role: Database["public"]["Enums"]["team_role"]
        }
        Returns: boolean
      }
      purge_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          deleted_count: number
        }[]
      }
      refresh_usage_metrics: {
        Args: {
          p_team_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ai_provider: "anthropic" | "openai" | "statistical"
      alert_channel: "email" | "slack" | "telegram" | "sms" | "webhook" | "n8n"
      alert_status: "pending" | "delivered" | "failed" | "suppressed"
      audit_action:
        | "team.created"
        | "team.updated"
        | "team.deleted"
        | "member.invited"
        | "member.joined"
        | "member.removed"
        | "member.role_changed"
        | "store.connected"
        | "store.disconnected"
        | "store.updated"
        | "rule.created"
        | "rule.updated"
        | "rule.deleted"
        | "rule.toggled"
        | "channel.created"
        | "channel.updated"
        | "channel.deleted"
        | "subscription.changed"
        | "api_key.updated"
        | "settings.updated"
        | "note.created"
        | "note.updated"
        | "note.deleted"
        | "store.synced"
        | "alert.dispatched"
      billing_interval: "monthly" | "yearly"
      plan_name: "starter" | "growth" | "scale"
      platform_type:
        | "shopify"
        | "trendyol"
        | "amazon"
        | "etsy"
        | "ebay"
        | "hepsiburada"
        | "aliexpress"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
        | "trial_expired"
      team_role: "owner" | "admin" | "editor" | "viewer"
      threshold_type: "absolute" | "percentage" | "days_of_supply"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

