// Bu dosya `pnpm db:types` komutuyla Supabase'den otomatik üretilir.
// Supabase Cloud bağlandıktan sonra Faz 16'da çalıştırın:
//   pnpm db:types
// Manuel düzenleme yapmayın.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlatformType = 'shopify' | 'trendyol' | 'amazon' | 'etsy' | 'ebay' | 'hepsiburada' | 'aliexpress'
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type AlertChannel = 'email' | 'slack' | 'telegram' | 'sms' | 'webhook' | 'n8n'
export type ThresholdType = 'absolute' | 'percentage' | 'days_of_supply'
export type AlertStatus = 'pending' | 'delivered' | 'failed' | 'suppressed'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
export type PlanName = 'starter' | 'business' | 'enterprise'
export type AiProvider = 'anthropic' | 'openai' | 'statistical'

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: PlanName
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan?: PlanName
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan?: PlanName
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: TeamRole
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: TeamRole
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: TeamRole
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      team_invitations: {
        Row: {
          id: string
          team_id: string
          email: string
          role: TeamRole
          token: string
          invited_by: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role?: TeamRole
          token?: string
          invited_by: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          role?: TeamRole
          token?: string
          invited_by?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_invitations_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      connected_stores: {
        Row: {
          id: string
          team_id: string
          platform: PlatformType
          store_name: string
          store_domain: string | null
          is_active: boolean
          last_sync_at: string | null
          sync_error: string | null
          encrypted_creds: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          platform: PlatformType
          store_name: string
          store_domain?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          sync_error?: string | null
          encrypted_creds?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          platform?: PlatformType
          store_name?: string
          store_domain?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          sync_error?: string | null
          encrypted_creds?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'connected_stores_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      products: {
        Row: {
          id: string
          store_id: string
          team_id: string
          external_id: string
          title: string
          sku: string | null
          barcode: string | null
          image_url: string | null
          product_url: string | null
          is_tracked: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          team_id: string
          external_id: string
          title: string
          sku?: string | null
          barcode?: string | null
          image_url?: string | null
          product_url?: string | null
          is_tracked?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          team_id?: string
          external_id?: string
          title?: string
          sku?: string | null
          barcode?: string | null
          image_url?: string | null
          product_url?: string | null
          is_tracked?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'connected_stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      product_variants: {
        Row: {
          id: string
          product_id: string
          external_id: string
          title: string
          sku: string | null
          barcode: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          external_id: string
          title: string
          sku?: string | null
          barcode?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          external_id?: string
          title?: string
          sku?: string | null
          barcode?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }

      inventory_snapshots: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          team_id: string
          quantity: number
          location_id: string | null
          location_name: string | null
          source: string
          recorded_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_id?: string | null
          team_id: string
          quantity: number
          location_id?: string | null
          location_name?: string | null
          source?: string
          recorded_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          variant_id?: string | null
          team_id?: string
          quantity?: number
          location_id?: string | null
          location_name?: string | null
          source?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_snapshots_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }

      notification_channels: {
        Row: {
          id: string
          team_id: string
          name: string
          channel_type: AlertChannel
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          channel_type: AlertChannel
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          channel_type?: AlertChannel
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_channels_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      alert_rules: {
        Row: {
          id: string
          team_id: string
          name: string
          is_active: boolean
          scope_product_ids: string[] | null
          scope_tags: string[] | null
          threshold_type: ThresholdType
          threshold_value: number
          channel_ids: string[]
          cooldown_minutes: number
          quiet_hours: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          is_active?: boolean
          scope_product_ids?: string[] | null
          scope_tags?: string[] | null
          threshold_type?: ThresholdType
          threshold_value: number
          channel_ids?: string[]
          cooldown_minutes?: number
          quiet_hours?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          is_active?: boolean
          scope_product_ids?: string[] | null
          scope_tags?: string[] | null
          threshold_type?: ThresholdType
          threshold_value?: number
          channel_ids?: string[]
          cooldown_minutes?: number
          quiet_hours?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alert_rules_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      alerts: {
        Row: {
          id: string
          team_id: string
          rule_id: string | null
          product_id: string
          snapshot_id: string | null
          channel_id: string | null
          channel_type: AlertChannel
          status: AlertStatus
          quantity: number
          threshold_value: number
          payload: Json | null
          error_message: string | null
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          rule_id?: string | null
          product_id: string
          snapshot_id?: string | null
          channel_id?: string | null
          channel_type: AlertChannel
          status?: AlertStatus
          quantity: number
          threshold_value: number
          payload?: Json | null
          error_message?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          rule_id?: string | null
          product_id?: string
          snapshot_id?: string | null
          channel_id?: string | null
          channel_type?: AlertChannel
          status?: AlertStatus
          quantity?: number
          threshold_value?: number
          payload?: Json | null
          error_message?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alerts_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      ai_predictions: {
        Row: {
          id: string
          product_id: string
          team_id: string
          provider: AiProvider
          days_until_stockout: number | null
          predicted_at: string
          valid_until: string
          confidence: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          product_id: string
          team_id: string
          provider: AiProvider
          days_until_stockout?: number | null
          predicted_at?: string
          valid_until?: string
          confidence?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          product_id?: string
          team_id?: string
          provider?: AiProvider
          days_until_stockout?: number | null
          predicted_at?: string
          valid_until?: string
          confidence?: number | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_predictions_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }

      subscriptions: {
        Row: {
          id: string
          team_id: string
          ls_subscription_id: string | null
          ls_customer_id: string | null
          ls_variant_id: string | null
          plan: PlanName
          status: SubscriptionStatus
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          ls_subscription_id?: string | null
          ls_customer_id?: string | null
          ls_variant_id?: string | null
          plan?: PlanName
          status?: SubscriptionStatus
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          ls_subscription_id?: string | null
          ls_customer_id?: string | null
          ls_variant_id?: string | null
          plan?: PlanName
          status?: SubscriptionStatus
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      usage_metrics: {
        Row: {
          id: string
          team_id: string
          store_count: number
          product_count: number
          rule_count: number
          alerts_this_month: number
          members_count: number
          month_start: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          store_count?: number
          product_count?: number
          rule_count?: number
          alerts_this_month?: number
          members_count?: number
          month_start?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          store_count?: number
          product_count?: number
          rule_count?: number
          alerts_this_month?: number
          members_count?: number
          month_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_metrics_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      api_keys: {
        Row: {
          id: string
          team_id: string
          provider: AiProvider
          encrypted_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          provider: AiProvider
          encrypted_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          provider?: AiProvider
          encrypted_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      team_notes: {
        Row: {
          id: string
          team_id: string
          title: string
          content: string
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title?: string
          content?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          content?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_notes_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }

      audit_logs: {
        Row: {
          id: string
          team_id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform_type: PlatformType
      team_role: TeamRole
      alert_channel: AlertChannel
      threshold_type: ThresholdType
      alert_status: AlertStatus
      subscription_status: SubscriptionStatus
      plan_name: PlanName
      ai_provider: AiProvider
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
