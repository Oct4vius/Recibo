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
      budget_alerts: {
        Row: {
          budget_id: string
          id: string
          period_start: string
          sent_at: string
          threshold: number
          user_id: string
        }
        Insert: {
          budget_id: string
          id?: string
          period_start: string
          sent_at?: string
          threshold: number
          user_id: string
        }
        Update: {
          budget_id?: string
          id?: string
          period_start?: string
          sent_at?: string
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          is_active: boolean
          limit_amount: number
          period: Database["public"]["Enums"]["budget_period"]
          thresholds: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          is_active?: boolean
          limit_amount: number
          period: Database["public"]["Enums"]["budget_period"]
          thresholds?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          is_active?: boolean
          limit_amount?: number
          period?: Database["public"]["Enums"]["budget_period"]
          thresholds?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          counts_as_spending: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          counts_as_spending?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          counts_as_spending?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      linked_accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["mail_provider"]
          status: Database["public"]["Enums"]["account_status"]
          sync_cursor: string | null
          updated_at: string
          user_id: string
          vault_secret_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["mail_provider"]
          status?: Database["public"]["Enums"]["account_status"]
          sync_cursor?: string | null
          updated_at?: string
          user_id: string
          vault_secret_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["mail_provider"]
          status?: Database["public"]["Enums"]["account_status"]
          sync_cursor?: string | null
          updated_at?: string
          user_id?: string
          vault_secret_id?: string | null
        }
        Relationships: []
      }
      merchant_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          pattern: string
          priority: number
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          pattern: string
          priority?: number
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          pattern?: string
          priority?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          primary_currency: Database["public"]["Enums"]["currency_code"]
          timezone: string
          updated_at: string
          usd_rate: number
          user_id: string
        }
        Insert: {
          created_at?: string
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          timezone?: string
          updated_at?: string
          usd_rate?: number
          user_id: string
        }
        Update: {
          created_at?: string
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          timezone?: string
          updated_at?: string
          usd_rate?: number
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          expo_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          expo_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          expo_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          error: string | null
          fetched: number
          finished_at: string | null
          id: string
          linked_account_id: string
          parsed: number
          started_at: string
          unparsed: number
          user_id: string
        }
        Insert: {
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          linked_account_id: string
          parsed?: number
          started_at?: string
          unparsed?: number
          user_id: string
        }
        Update: {
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          linked_account_id?: string
          parsed?: number
          started_at?: string
          unparsed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "linked_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_code: Database["public"]["Enums"]["bank_code"] | null
          card_last4: string | null
          category_id: string | null
          counterparty_last4: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          ignored_reason: Database["public"]["Enums"]["ignored_reason"] | null
          is_ignored: boolean
          linked_account_id: string | null
          merchant: string | null
          message_id: string | null
          occurred_at: string
          raw_snippet: string | null
          reference: string | null
          reversed_by: string | null
          source: Database["public"]["Enums"]["tx_source"]
          template_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_code?: Database["public"]["Enums"]["bank_code"] | null
          card_last4?: string | null
          category_id?: string | null
          counterparty_last4?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          ignored_reason?: Database["public"]["Enums"]["ignored_reason"] | null
          is_ignored?: boolean
          linked_account_id?: string | null
          merchant?: string | null
          message_id?: string | null
          occurred_at: string
          raw_snippet?: string | null
          reference?: string | null
          reversed_by?: string | null
          source?: Database["public"]["Enums"]["tx_source"]
          template_id?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_code?: Database["public"]["Enums"]["bank_code"] | null
          card_last4?: string | null
          category_id?: string | null
          counterparty_last4?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          ignored_reason?: Database["public"]["Enums"]["ignored_reason"] | null
          is_ignored?: boolean
          linked_account_id?: string | null
          merchant?: string | null
          message_id?: string | null
          occurred_at?: string
          raw_snippet?: string | null
          reference?: string | null
          reversed_by?: string | null
          source?: Database["public"]["Enums"]["tx_source"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "linked_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      unparsed_emails: {
        Row: {
          bank_code: Database["public"]["Enums"]["bank_code"] | null
          created_at: string
          id: string
          linked_account_id: string
          message_id: string
          received_at: string | null
          resolved: boolean
          snippet: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          bank_code?: Database["public"]["Enums"]["bank_code"] | null
          created_at?: string
          id?: string
          linked_account_id: string
          message_id: string
          received_at?: string | null
          resolved?: boolean
          snippet?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          bank_code?: Database["public"]["Enums"]["bank_code"] | null
          created_at?: string
          id?: string
          linked_account_id?: string
          message_id?: string
          received_at?: string | null
          resolved?: boolean
          snippet?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unparsed_emails_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "linked_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      spending_transactions: {
        Row: {
          amount: number | null
          amount_dop: number | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          occurred_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_history: {
        Args: { p_from: string; p_granularity: string; p_to: string }
        Returns: {
          bucket_start: string
          total_dop: number
          tx_count: number
        }[]
      }
      get_spending_summary: {
        Args: {
          p_period: Database["public"]["Enums"]["budget_period"]
          p_ref_date?: string
        }
        Returns: {
          by_currency: Json
          period_end: string
          period_start: string
          previous_total_dop: number
          total_dop: number
          tx_count: number
        }[]
      }
    }
    Enums: {
      account_status: "active" | "error" | "revoked" | "paused"
      bank_code: "bhd" | "banreservas" | "popular" | "apap"
      budget_period: "week" | "month"
      currency_code: "DOP" | "USD"
      ignored_reason: "user" | "reversed" | "unmatched_reversal"
      mail_provider: "gmail" | "outlook"
      tx_source: "email" | "manual"
      tx_type:
        | "card_purchase"
        | "card_reversal"
        | "atm_withdrawal"
        | "transfer_out"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "error", "revoked", "paused"],
      bank_code: ["bhd", "banreservas", "popular", "apap"],
      budget_period: ["week", "month"],
      currency_code: ["DOP", "USD"],
      ignored_reason: ["user", "reversed", "unmatched_reversal"],
      mail_provider: ["gmail", "outlook"],
      tx_source: ["email", "manual"],
      tx_type: [
        "card_purchase",
        "card_reversal",
        "atm_withdrawal",
        "transfer_out",
      ],
    },
  },
} as const

