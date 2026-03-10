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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_endpoints: {
        Row: {
          created_at: string
          description: string | null
          id: string
          integration_id: string
          is_active: boolean
          method: string
          path: string
          request_example: string | null
          response_example: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          method?: string
          path: string
          request_example?: string | null
          response_example?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          method?: string
          path?: string
          request_example?: string | null
          response_example?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_endpoints_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          api_key_encrypted: string | null
          auth_type: string
          base_url: string
          created_at: string
          description: string | null
          header_name: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          auth_type?: string
          base_url?: string
          created_at?: string
          description?: string | null
          header_name?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          auth_type?: string
          base_url?: string
          created_at?: string
          description?: string | null
          header_name?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          created_at: string | null
          fim: string | null
          id: string
          influencer: string | null
          inicio: string | null
          is_demo: boolean
          jogo: string | null
          nome: string
          objetivo: string | null
          plataforma: string | null
          resultado: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fim?: string | null
          id?: string
          influencer?: string | null
          inicio?: string | null
          is_demo?: boolean
          jogo?: string | null
          nome: string
          objetivo?: string | null
          plataforma?: string | null
          resultado?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fim?: string | null
          id?: string
          influencer?: string | null
          inicio?: string | null
          is_demo?: boolean
          jogo?: string | null
          nome?: string
          objetivo?: string | null
          plataforma?: string | null
          resultado?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clicks: {
        Row: {
          clicked_at: string | null
          id: string
          influencer_id: string | null
          ip_address: string | null
          is_demo: boolean
          landing_page_id: string | null
          referrer: string | null
          route: string | null
          source: string | null
          template_id: string | null
          user_agent: string | null
          utm_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          influencer_id?: string | null
          ip_address?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          referrer?: string | null
          route?: string | null
          source?: string | null
          template_id?: string | null
          user_agent?: string | null
          utm_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          influencer_id?: string | null
          ip_address?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          referrer?: string | null
          route?: string | null
          source?: string | null
          template_id?: string | null
          user_agent?: string | null
          utm_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_utm_id_fkey"
            columns: ["utm_id"]
            isOneToOne: false
            referencedRelation: "utms"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo: {
        Row: {
          campanha: string | null
          canal: string | null
          created_at: string | null
          cta: string | null
          data: string | null
          data_publicacao: string | null
          formato: string | null
          id: string
          influencer: string | null
          is_demo: boolean
          jogo: string | null
          lp: string | null
          objetivo: string | null
          observacoes: string | null
          prioridade: string | null
          responsavel: string | null
          roteiro: string | null
          status: string | null
          tema: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          campanha?: string | null
          canal?: string | null
          created_at?: string | null
          cta?: string | null
          data?: string | null
          data_publicacao?: string | null
          formato?: string | null
          id?: string
          influencer?: string | null
          is_demo?: boolean
          jogo?: string | null
          lp?: string | null
          objetivo?: string | null
          observacoes?: string | null
          prioridade?: string | null
          responsavel?: string | null
          roteiro?: string | null
          status?: string | null
          tema: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          campanha?: string | null
          canal?: string | null
          created_at?: string | null
          cta?: string | null
          data?: string | null
          data_publicacao?: string | null
          formato?: string | null
          id?: string
          influencer?: string | null
          is_demo?: boolean
          jogo?: string | null
          lp?: string | null
          objetivo?: string | null
          observacoes?: string | null
          prioridade?: string | null
          responsavel?: string | null
          roteiro?: string | null
          status?: string | null
          tema?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_platforms: {
        Row: {
          game_id: string
          is_demo: boolean
          platform_id: string
        }
        Insert: {
          game_id: string
          is_demo?: boolean
          platform_id: string
        }
        Update: {
          game_id?: string
          is_demo?: boolean
          platform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_platforms_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_platforms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          name: string
          trend_status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          trend_status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          trend_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      influencers: {
        Row: {
          affiliate_link: string | null
          commission_percent: number | null
          created_at: string | null
          followers: number | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_demo: boolean
          name: string
          notes: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          affiliate_link?: string | null
          commission_percent?: number | null
          created_at?: string | null
          followers?: number | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          notes?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          affiliate_link?: string | null
          commission_percent?: number | null
          created_at?: string | null
          followers?: number | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          notes?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_page_instances: {
        Row: {
          affiliate_link: string
          created_at: string | null
          id: string
          influencer_id: string
          is_active: boolean | null
          is_demo: boolean
          landing_page_id: string
          notes: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          affiliate_link: string
          created_at?: string | null
          id?: string
          influencer_id: string
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id: string
          notes?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          affiliate_link?: string
          created_at?: string | null
          id?: string
          influencer_id?: string
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string
          notes?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_instances_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_instances_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string | null
          domain: string | null
          game_id: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          name: string
          platform_id: string | null
          route: string
          slug: string
          template_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          platform_id?: string | null
          route: string
          slug: string
          template_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          platform_id?: string | null
          route?: string
          slug?: string
          template_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          affiliate_manager: string | null
          commission_type: string | null
          cpa: number | null
          created_at: string | null
          currency: string | null
          hybrid: boolean | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          name: string
          notes: string | null
          payout_method: string | null
          revshare: number | null
          updated_at: string | null
        }
        Insert: {
          affiliate_manager?: string | null
          commission_type?: string | null
          cpa?: number | null
          created_at?: string | null
          currency?: string | null
          hybrid?: boolean | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          notes?: string | null
          payout_method?: string | null
          revshare?: number | null
          updated_at?: string | null
        }
        Update: {
          affiliate_manager?: string | null
          commission_type?: string | null
          cpa?: number | null
          created_at?: string | null
          currency?: string | null
          hybrid?: boolean | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          notes?: string | null
          payout_method?: string | null
          revshare?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saques: {
        Row: {
          codigo: string
          conta: string | null
          created_at: string | null
          data: string | null
          id: string
          is_demo: boolean
          nome: string
          origem: string | null
          responsavel: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          codigo: string
          conta?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          is_demo?: boolean
          nome: string
          origem?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          codigo?: string
          conta?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          is_demo?: boolean
          nome?: string
          origem?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      socios: {
        Row: {
          created_at: string | null
          disponivel: number
          ganhos: number
          id: string
          is_demo: boolean
          nome: string
          participacao: number
          status: string | null
          ultimo_saque: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disponivel?: number
          ganhos?: number
          id?: string
          is_demo?: boolean
          nome: string
          participacao?: number
          status?: string | null
          ultimo_saque?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disponivel?: number
          ganhos?: number
          id?: string
          is_demo?: boolean
          nome?: string
          participacao?: number
          status?: string | null
          ultimo_saque?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          main_game: string | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          main_game?: string | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          main_game?: string | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utms: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          influencer_id: string | null
          is_active: boolean | null
          is_demo: boolean
          landing_page_id: string | null
          notes: string | null
          platform_id: string | null
          subid: string | null
          template_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string | null
          notes?: string | null
          platform_id?: string | null
          subid?: string | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string | null
          notes?: string | null
          platform_id?: string | null
          subid?: string | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utms_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utms_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utms_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_api_key: { Args: { _name?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      validate_api_key: { Args: { _key: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin_master"
        | "socio"
        | "financeiro"
        | "operacao"
        | "conteudo"
        | "visualizacao"
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
        "admin_master",
        "socio",
        "financeiro",
        "operacao",
        "conteudo",
        "visualizacao",
      ],
    },
  },
} as const
