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
      asaas_webhook_events: {
        Row: {
          asaas_payment_id: string | null
          event_id: string | null
          event_name: string
          external_reference: string | null
          id: string
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          raw_payload: Json
          received_at: string
          saque_id: string | null
        }
        Insert: {
          asaas_payment_id?: string | null
          event_id?: string | null
          event_name: string
          external_reference?: string | null
          id?: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          raw_payload: Json
          received_at?: string
          saque_id?: string | null
        }
        Update: {
          asaas_payment_id?: string | null
          event_id?: string | null
          event_name?: string
          external_reference?: string | null
          id?: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          raw_payload?: Json
          received_at?: string
          saque_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_webhook_events_saque_id_fkey"
            columns: ["saque_id"]
            isOneToOne: false
            referencedRelation: "saques"
            referencedColumns: ["id"]
          },
        ]
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
          click_id: string | null
          clicked_at: string | null
          id: string
          influencer_id: string | null
          ip_address: string | null
          is_demo: boolean
          landing_page_id: string | null
          landing_page_instance_id: string | null
          referrer: string | null
          route: string | null
          source: string | null
          template_id: string | null
          tracking_link_id: string | null
          user_agent: string | null
          utm_id: string | null
        }
        Insert: {
          click_id?: string | null
          clicked_at?: string | null
          id?: string
          influencer_id?: string | null
          ip_address?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          referrer?: string | null
          route?: string | null
          source?: string | null
          template_id?: string | null
          tracking_link_id?: string | null
          user_agent?: string | null
          utm_id?: string | null
        }
        Update: {
          click_id?: string | null
          clicked_at?: string | null
          id?: string
          influencer_id?: string | null
          ip_address?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          referrer?: string | null
          route?: string | null
          source?: string | null
          template_id?: string | null
          tracking_link_id?: string | null
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
            foreignKeyName: "clicks_landing_page_instance_id_fkey"
            columns: ["landing_page_instance_id"]
            isOneToOne: false
            referencedRelation: "landing_page_instances"
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
            foreignKeyName: "clicks_tracking_link_id_fkey"
            columns: ["tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
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
      commercial_card_checklist: {
        Row: {
          card_id: string
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          item_id: string
          updated_at: string
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          card_id: string
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          updated_at?: string
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          card_id?: string
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          updated_at?: string
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_card_checklist_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "commercial_pipeline_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_card_checklist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "commercial_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_card_history: {
        Row: {
          actor_user_id: string | null
          card_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["commercial_stage"] | null
          id: string
          payload: Json | null
          reason: string | null
          to_stage: Database["public"]["Enums"]["commercial_stage"]
        }
        Insert: {
          actor_user_id?: string | null
          card_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["commercial_stage"] | null
          id?: string
          payload?: Json | null
          reason?: string | null
          to_stage: Database["public"]["Enums"]["commercial_stage"]
        }
        Update: {
          actor_user_id?: string | null
          card_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["commercial_stage"] | null
          id?: string
          payload?: Json | null
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["commercial_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "commercial_pipeline_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_checklist_items: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["commercial_checklist_field_type"]
          group_label: string
          id: string
          label: string
          options: Json | null
          position: number
          required: boolean
          template_id: string
        }
        Insert: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["commercial_checklist_field_type"]
          group_label: string
          id?: string
          label: string
          options?: Json | null
          position?: number
          required?: boolean
          template_id: string
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["commercial_checklist_field_type"]
          group_label?: string
          id?: string
          label?: string
          options?: Json | null
          position?: number
          required?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commercial_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_required_pct: number
          name: string
          notes: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_required_pct?: number
          name: string
          notes?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_required_pct?: number
          name?: string
          notes?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      commercial_pipeline_cards: {
        Row: {
          approved_at: string | null
          checklist_progress: number
          city: string | null
          completed_at: string | null
          content_info: Json | null
          created_at: string
          created_by: string | null
          credentials_generated_at: string | null
          document: string | null
          documents: Json | null
          email: string | null
          financial_info: Json | null
          generated_email: string | null
          generated_password: string | null
          generated_user_id: string | null
          handle: string | null
          id: string
          influencer_id: string | null
          is_active: boolean
          manager_id: string | null
          name: string
          niche: string | null
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          position: number
          primary_channel: string | null
          responded_at: string | null
          role_type: string | null
          social_profiles: Json | null
          source: string | null
          squad_id: string | null
          squad_ids: string[]
          stage: Database["public"]["Enums"]["commercial_stage"]
          stage_moved_at: string
          tags: string[] | null
          template_id: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          checklist_progress?: number
          city?: string | null
          completed_at?: string | null
          content_info?: Json | null
          created_at?: string
          created_by?: string | null
          credentials_generated_at?: string | null
          document?: string | null
          documents?: Json | null
          email?: string | null
          financial_info?: Json | null
          generated_email?: string | null
          generated_password?: string | null
          generated_user_id?: string | null
          handle?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          manager_id?: string | null
          name: string
          niche?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          position?: number
          primary_channel?: string | null
          responded_at?: string | null
          role_type?: string | null
          social_profiles?: Json | null
          source?: string | null
          squad_id?: string | null
          squad_ids?: string[]
          stage?: Database["public"]["Enums"]["commercial_stage"]
          stage_moved_at?: string
          tags?: string[] | null
          template_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          checklist_progress?: number
          city?: string | null
          completed_at?: string | null
          content_info?: Json | null
          created_at?: string
          created_by?: string | null
          credentials_generated_at?: string | null
          document?: string | null
          documents?: Json | null
          email?: string | null
          financial_info?: Json | null
          generated_email?: string | null
          generated_password?: string | null
          generated_user_id?: string | null
          handle?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          manager_id?: string | null
          name?: string
          niche?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          position?: number
          primary_channel?: string | null
          responded_at?: string | null
          role_type?: string | null
          social_profiles?: Json | null
          source?: string | null
          squad_id?: string | null
          squad_ids?: string[]
          stage?: Database["public"]["Enums"]["commercial_stage"]
          stage_moved_at?: string
          tags?: string[] | null
          template_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_pipeline_cards_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_pipeline_cards_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_pipeline_cards_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_pipeline_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commercial_checklist_templates"
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
      directors: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          monthly_goal: number | null
          name: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_goal?: number | null
          name: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_goal?: number | null
          name?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string
          title?: string
          updated_at?: string
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
          career_label: string | null
          career_level: number
          category: string
          commission_percent: number | null
          created_at: string | null
          followers: number | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_demo: boolean
          manager_id: string | null
          monthly_goal_brl: number | null
          name: string
          notes: string | null
          slug: string
          squad_id: string | null
          team_label: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_link?: string | null
          career_label?: string | null
          career_level?: number
          category?: string
          commission_percent?: number | null
          created_at?: string | null
          followers?: number | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          manager_id?: string | null
          monthly_goal_brl?: number | null
          name: string
          notes?: string | null
          slug: string
          squad_id?: string | null
          team_label?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_link?: string | null
          career_label?: string | null
          career_level?: number
          category?: string
          commission_percent?: number | null
          created_at?: string | null
          followers?: number | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          manager_id?: string | null
          monthly_goal_brl?: number | null
          name?: string
          notes?: string | null
          slug?: string
          squad_id?: string | null
          team_label?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencers_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_instances: {
        Row: {
          affiliate_link: string
          auto_generated: boolean
          created_at: string | null
          game_ids: string[]
          game_slugs: string[]
          hype_copy: Json
          id: string
          influencer_id: string
          is_active: boolean | null
          is_demo: boolean
          landing_page_id: string
          layout_config: Json
          lp_mode: string
          notes: string | null
          slug: string
          source_tracking_link_id: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_link: string
          auto_generated?: boolean
          created_at?: string | null
          game_ids?: string[]
          game_slugs?: string[]
          hype_copy?: Json
          id?: string
          influencer_id: string
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id: string
          layout_config?: Json
          lp_mode?: string
          notes?: string | null
          slug: string
          source_tracking_link_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_link?: string
          auto_generated?: boolean
          created_at?: string | null
          game_ids?: string[]
          game_slugs?: string[]
          hype_copy?: Json
          id?: string
          influencer_id?: string
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string
          layout_config?: Json
          lp_mode?: string
          notes?: string | null
          slug?: string
          source_tracking_link_id?: string | null
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
          {
            foreignKeyName: "landing_page_instances_source_tracking_link_id_fkey"
            columns: ["source_tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
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
      link_materials: {
        Row: {
          created_at: string
          error: string | null
          format: string
          game_name: string | null
          game_slug: string | null
          id: string
          image_url: string | null
          influencer_id: string | null
          meta: Json
          platform_id: string | null
          status: string
          style: string
          thumbnail_url: string | null
          tracking_link_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          format: string
          game_name?: string | null
          game_slug?: string | null
          id?: string
          image_url?: string | null
          influencer_id?: string | null
          meta?: Json
          platform_id?: string | null
          status?: string
          style: string
          thumbnail_url?: string | null
          tracking_link_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          format?: string
          game_name?: string | null
          game_slug?: string | null
          id?: string
          image_url?: string | null
          influencer_id?: string | null
          meta?: Json
          platform_id?: string | null
          status?: string
          style?: string
          thumbnail_url?: string | null
          tracking_link_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_materials_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_materials_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_materials_tracking_link_id_fkey"
            columns: ["tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_events: {
        Row: {
          away_team: string
          away_team_logo_url: string | null
          created_at: string
          event_image_url: string | null
          external_ref: string | null
          home_team: string
          home_team_logo_url: string | null
          id: string
          is_active: boolean
          league: string | null
          metadata: Json
          notes: string | null
          source: string
          sport: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          away_team: string
          away_team_logo_url?: string | null
          created_at?: string
          event_image_url?: string | null
          external_ref?: string | null
          home_team: string
          home_team_logo_url?: string | null
          id?: string
          is_active?: boolean
          league?: string | null
          metadata?: Json
          notes?: string | null
          source?: string
          sport?: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          away_team?: string
          away_team_logo_url?: string | null
          created_at?: string
          event_image_url?: string | null
          external_ref?: string | null
          home_team?: string
          home_team_logo_url?: string | null
          id?: string
          is_active?: boolean
          league?: string | null
          metadata?: Json
          notes?: string | null
          source?: string
          sport?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lp_opportunities: {
        Row: {
          away_team_logo_url: string | null
          badge: string | null
          campanha_id: string | null
          category: string
          created_at: string
          cta_label: string
          destination_url: string
          ends_at: string | null
          event_id: string | null
          event_image_url: string | null
          event_name: string | null
          game_thumb_url: string | null
          home_team_logo_url: string | null
          id: string
          is_active: boolean
          landing_page_id: string | null
          market_name: string | null
          market_type: string | null
          metadata: Json
          odd_label: string | null
          platform_id: string | null
          provider_logo_url: string | null
          recommendation_reason: string | null
          recommendation_score: number | null
          signal_confidence: string | null
          signal_id: string | null
          signal_source: string | null
          sort_order: number
          starts_at: string | null
          stats_summary: string | null
          subtitle: string | null
          title: string
          tracking_link_id: string | null
          updated_at: string
        }
        Insert: {
          away_team_logo_url?: string | null
          badge?: string | null
          campanha_id?: string | null
          category?: string
          created_at?: string
          cta_label?: string
          destination_url: string
          ends_at?: string | null
          event_id?: string | null
          event_image_url?: string | null
          event_name?: string | null
          game_thumb_url?: string | null
          home_team_logo_url?: string | null
          id?: string
          is_active?: boolean
          landing_page_id?: string | null
          market_name?: string | null
          market_type?: string | null
          metadata?: Json
          odd_label?: string | null
          platform_id?: string | null
          provider_logo_url?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          signal_confidence?: string | null
          signal_id?: string | null
          signal_source?: string | null
          sort_order?: number
          starts_at?: string | null
          stats_summary?: string | null
          subtitle?: string | null
          title: string
          tracking_link_id?: string | null
          updated_at?: string
        }
        Update: {
          away_team_logo_url?: string | null
          badge?: string | null
          campanha_id?: string | null
          category?: string
          created_at?: string
          cta_label?: string
          destination_url?: string
          ends_at?: string | null
          event_id?: string | null
          event_image_url?: string | null
          event_name?: string | null
          game_thumb_url?: string | null
          home_team_logo_url?: string | null
          id?: string
          is_active?: boolean
          landing_page_id?: string | null
          market_name?: string | null
          market_type?: string | null
          metadata?: Json
          odd_label?: string | null
          platform_id?: string | null
          provider_logo_url?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          signal_confidence?: string | null
          signal_id?: string | null
          signal_source?: string | null
          sort_order?: number
          starts_at?: string | null
          stats_summary?: string | null
          subtitle?: string | null
          title?: string
          tracking_link_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_opportunities_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_opportunities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lp_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_opportunities_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_opportunities_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_opportunities_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "lp_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_opportunities_tracking_link_id_fkey"
            columns: ["tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_signals: {
        Row: {
          confidence: string
          created_at: string
          draft_opportunity_id: string | null
          event_id: string | null
          external_id: string | null
          house_url: string | null
          id: string
          market_name: string | null
          market_type: string | null
          metadata: Json
          odd_label: string | null
          platform_id: string | null
          raw_text: string
          received_at: string
          source_channel: string
          source_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          draft_opportunity_id?: string | null
          event_id?: string | null
          external_id?: string | null
          house_url?: string | null
          id?: string
          market_name?: string | null
          market_type?: string | null
          metadata?: Json
          odd_label?: string | null
          platform_id?: string | null
          raw_text: string
          received_at?: string
          source_channel?: string
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          draft_opportunity_id?: string | null
          event_id?: string | null
          external_id?: string | null
          house_url?: string | null
          id?: string
          market_name?: string | null
          market_type?: string | null
          metadata?: Json
          odd_label?: string | null
          platform_id?: string | null
          raw_text?: string
          received_at?: string
          source_channel?: string
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_signals_draft_opportunity_id_fkey"
            columns: ["draft_opportunity_id"]
            isOneToOne: false
            referencedRelation: "lp_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lp_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_signals_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_squads: {
        Row: {
          created_at: string
          manager_id: string
          squad_id: string
        }
        Insert: {
          created_at?: string
          manager_id: string
          squad_id: string
        }
        Update: {
          created_at?: string
          manager_id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_squads_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_squads_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          career_label: string | null
          career_level: number
          commission_percent: number | null
          compensation_mode: Database["public"]["Enums"]["manager_compensation_mode"]
          created_at: string
          hierarchy_role: Database["public"]["Enums"]["manager_hierarchy_role"]
          id: string
          influencer_id: string | null
          is_active: boolean
          monthly_goal: number | null
          name: string
          notes: string | null
          origin_type: Database["public"]["Enums"]["manager_origin_type"]
          pix_key: string | null
          pix_key_type: string | null
          share_url: string | null
          slug: string
          socio_id: string | null
          squad_id: string | null
          team_color: string
          team_name: string
          updated_at: string
        }
        Insert: {
          career_label?: string | null
          career_level?: number
          commission_percent?: number | null
          compensation_mode?: Database["public"]["Enums"]["manager_compensation_mode"]
          created_at?: string
          hierarchy_role?: Database["public"]["Enums"]["manager_hierarchy_role"]
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          monthly_goal?: number | null
          name: string
          notes?: string | null
          origin_type?: Database["public"]["Enums"]["manager_origin_type"]
          pix_key?: string | null
          pix_key_type?: string | null
          share_url?: string | null
          slug: string
          socio_id?: string | null
          squad_id?: string | null
          team_color?: string
          team_name: string
          updated_at?: string
        }
        Update: {
          career_label?: string | null
          career_level?: number
          commission_percent?: number | null
          compensation_mode?: Database["public"]["Enums"]["manager_compensation_mode"]
          created_at?: string
          hierarchy_role?: Database["public"]["Enums"]["manager_hierarchy_role"]
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          monthly_goal?: number | null
          name?: string
          notes?: string | null
          origin_type?: Database["public"]["Enums"]["manager_origin_type"]
          pix_key?: string | null
          pix_key_type?: string | null
          share_url?: string | null
          slug?: string
          socio_id?: string | null
          squad_id?: string | null
          team_color?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          meta: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_accounts: {
        Row: {
          account_external_id: string | null
          cpa_value: number | null
          created_at: string | null
          dashboard_url: string | null
          hybrid_details: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          login_url: string | null
          manager_email: string | null
          manager_name: string | null
          manager_telegram: string | null
          manager_whatsapp: string | null
          modelo_comissao: string | null
          moeda: string | null
          nome_conta: string
          notes: string | null
          platform_id: string
          revshare_percent: number | null
          updated_at: string | null
        }
        Insert: {
          account_external_id?: string | null
          cpa_value?: number | null
          created_at?: string | null
          dashboard_url?: string | null
          hybrid_details?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          login_url?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_telegram?: string | null
          manager_whatsapp?: string | null
          modelo_comissao?: string | null
          moeda?: string | null
          nome_conta: string
          notes?: string | null
          platform_id: string
          revshare_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          account_external_id?: string | null
          cpa_value?: number | null
          created_at?: string | null
          dashboard_url?: string | null
          hybrid_details?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          login_url?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_telegram?: string | null
          manager_whatsapp?: string | null
          modelo_comissao?: string | null
          moeda?: string | null
          nome_conta?: string
          notes?: string | null
          platform_id?: string
          revshare_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_event_mappings: {
        Row: {
          amount_field: string | null
          canonical_event_name: string
          country_field: string | null
          created_at: string | null
          currency_field: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          notes: string | null
          platform_account_id: string | null
          platform_id: string
          raw_event_name: string
          status_field: string | null
          sub1_field: string | null
          sub10_field: string | null
          sub2_field: string | null
          sub3_field: string | null
          sub4_field: string | null
          sub5_field: string | null
          sub6_field: string | null
          sub7_field: string | null
          sub8_field: string | null
          sub9_field: string | null
          transaction_id_field: string | null
          updated_at: string | null
          user_id_field: string | null
        }
        Insert: {
          amount_field?: string | null
          canonical_event_name: string
          country_field?: string | null
          created_at?: string | null
          currency_field?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          notes?: string | null
          platform_account_id?: string | null
          platform_id: string
          raw_event_name: string
          status_field?: string | null
          sub1_field?: string | null
          sub10_field?: string | null
          sub2_field?: string | null
          sub3_field?: string | null
          sub4_field?: string | null
          sub5_field?: string | null
          sub6_field?: string | null
          sub7_field?: string | null
          sub8_field?: string | null
          sub9_field?: string | null
          transaction_id_field?: string | null
          updated_at?: string | null
          user_id_field?: string | null
        }
        Update: {
          amount_field?: string | null
          canonical_event_name?: string
          country_field?: string | null
          created_at?: string | null
          currency_field?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          notes?: string | null
          platform_account_id?: string | null
          platform_id?: string
          raw_event_name?: string
          status_field?: string | null
          sub1_field?: string | null
          sub10_field?: string | null
          sub2_field?: string | null
          sub3_field?: string | null
          sub4_field?: string | null
          sub5_field?: string | null
          sub6_field?: string | null
          sub7_field?: string | null
          sub8_field?: string | null
          sub9_field?: string | null
          transaction_id_field?: string | null
          updated_at?: string | null
          user_id_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_event_mappings_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_event_mappings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_hyped_games: {
        Row: {
          category: string | null
          created_at: string
          game_name: string
          game_slug: string
          hype_reason: string | null
          hype_score: number | null
          icon_url: string | null
          id: string
          is_active: boolean
          platform_id: string
          priority: number
          refreshed_at: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          game_name: string
          game_slug: string
          hype_reason?: string | null
          hype_score?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          platform_id: string
          priority?: number
          refreshed_at?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          game_name?: string
          game_slug?: string
          hype_reason?: string | null
          hype_score?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          platform_id?: string
          priority?: number
          refreshed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_hyped_games_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_material_rules: {
        Row: {
          auto_on_new_link: boolean
          created_at: string
          enabled: boolean
          format: string
          id: string
          platform_id: string
          style: string
          updated_at: string
        }
        Insert: {
          auto_on_new_link?: boolean
          created_at?: string
          enabled?: boolean
          format: string
          id?: string
          platform_id: string
          style: string
          updated_at?: string
        }
        Update: {
          auto_on_new_link?: boolean
          created_at?: string
          enabled?: boolean
          format?: string
          id?: string
          platform_id?: string
          style?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_material_rules_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
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
          domain_patterns: string[] | null
          domains: string[]
          hybrid: boolean | null
          icon_base_url: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          name: string
          notes: string | null
          payout_method: string | null
          revshare: number | null
          slug: string | null
          smartico_brand_id: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_manager?: string | null
          commission_type?: string | null
          cpa?: number | null
          created_at?: string | null
          currency?: string | null
          domain_patterns?: string[] | null
          domains?: string[]
          hybrid?: boolean | null
          icon_base_url?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          notes?: string | null
          payout_method?: string | null
          revshare?: number | null
          slug?: string | null
          smartico_brand_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_manager?: string | null
          commission_type?: string | null
          cpa?: number | null
          created_at?: string | null
          currency?: string | null
          domain_patterns?: string[] | null
          domains?: string[]
          hybrid?: boolean | null
          icon_base_url?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          notes?: string | null
          payout_method?: string | null
          revshare?: number | null
          slug?: string | null
          smartico_brand_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          allowed_modules: string[]
          avatar_url: string | null
          city: string | null
          created_at: string | null
          denied_modules: string[]
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string | null
          id: string
          influencer_id: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          legal_name: string | null
          manager_id: string | null
          notes: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          trade_name: string | null
          updated_at: string | null
          withdrawal_terms_accepted_at: string | null
          withdrawal_terms_version: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allowed_modules?: string[]
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          denied_modules?: string[]
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          influencer_id?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          legal_name?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          trade_name?: string | null
          updated_at?: string | null
          withdrawal_terms_accepted_at?: string | null
          withdrawal_terms_version?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allowed_modules?: string[]
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          denied_modules?: string[]
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          legal_name?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          trade_name?: string | null
          updated_at?: string | null
          withdrawal_terms_accepted_at?: string | null
          withdrawal_terms_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      saques: {
        Row: {
          asaas_fee: number | null
          asaas_gross_value: number | null
          asaas_net_value: number | null
          asaas_payment_id: string | null
          asaas_status: string | null
          asaas_synced_at: string | null
          codigo: string
          conta: string | null
          created_at: string | null
          cycle_id: string | null
          data: string | null
          divergence_reason: string | null
          id: string
          influencer_id: string | null
          is_demo: boolean
          manager_id: string | null
          nome: string
          nota_fiscal_number: string | null
          nota_fiscal_uploaded_at: string | null
          nota_fiscal_url: string | null
          origem: string | null
          paid_at: string | null
          pix_key: string | null
          pix_key_type: string | null
          requester_user_id: string | null
          responsavel: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
          value_divergence: boolean
        }
        Insert: {
          asaas_fee?: number | null
          asaas_gross_value?: number | null
          asaas_net_value?: number | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_synced_at?: string | null
          codigo: string
          conta?: string | null
          created_at?: string | null
          cycle_id?: string | null
          data?: string | null
          divergence_reason?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          manager_id?: string | null
          nome: string
          nota_fiscal_number?: string | null
          nota_fiscal_uploaded_at?: string | null
          nota_fiscal_url?: string | null
          origem?: string | null
          paid_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          requester_user_id?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
          value_divergence?: boolean
        }
        Update: {
          asaas_fee?: number | null
          asaas_gross_value?: number | null
          asaas_net_value?: number | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_synced_at?: string | null
          codigo?: string
          conta?: string | null
          created_at?: string | null
          cycle_id?: string | null
          data?: string | null
          divergence_reason?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          manager_id?: string | null
          nome?: string
          nota_fiscal_number?: string | null
          nota_fiscal_uploaded_at?: string | null
          nota_fiscal_url?: string | null
          origem?: string | null
          paid_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          requester_user_id?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
          value_divergence?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "saques_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saques_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
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
      squad_activity: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          payload: Json
          squad_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          squad_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_activity_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          color: string
          created_at: string
          director_id: string | null
          goal_distribution_mode: string
          goal_last_distributed_at: string | null
          id: string
          is_active: boolean
          manager_goal_brl: number | null
          manager_id: string | null
          monthly_goal: number | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          director_id?: string | null
          goal_distribution_mode?: string
          goal_last_distributed_at?: string | null
          id?: string
          is_active?: boolean
          manager_goal_brl?: number | null
          manager_id?: string | null
          monthly_goal?: number | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          director_id?: string | null
          goal_distribution_mode?: string
          goal_last_distributed_at?: string | null
          id?: string
          is_active?: boolean
          manager_goal_brl?: number | null
          manager_id?: string | null
          monthly_goal?: number | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squads_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
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
      tracking_events: {
        Row: {
          amount: number | null
          campanha_id: string | null
          canonical_event_name: string
          click_id: string | null
          commission_amount: number | null
          conteudo_id: string | null
          converted_amount_brl: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          event_timestamp: string
          exchange_rate: number | null
          exchange_rate_timestamp: string | null
          id: string
          influencer_id: string | null
          is_demo: boolean
          is_duplicate: boolean | null
          landing_page_id: string | null
          landing_page_instance_id: string | null
          original_amount: number | null
          original_currency: string | null
          platform_account_id: string | null
          platform_id: string | null
          platform_user_id: string | null
          processed_at: string | null
          raw_event_name: string
          raw_payload: Json | null
          source_type: string
          status: string | null
          tracking_link_id: string | null
          transaction_id: string | null
          updated_at: string | null
          utm_id: string | null
        }
        Insert: {
          amount?: number | null
          campanha_id?: string | null
          canonical_event_name: string
          click_id?: string | null
          commission_amount?: number | null
          conteudo_id?: string | null
          converted_amount_brl?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_timestamp?: string
          exchange_rate?: number | null
          exchange_rate_timestamp?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          is_duplicate?: boolean | null
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          original_amount?: number | null
          original_currency?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          platform_user_id?: string | null
          processed_at?: string | null
          raw_event_name: string
          raw_payload?: Json | null
          source_type?: string
          status?: string | null
          tracking_link_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          utm_id?: string | null
        }
        Update: {
          amount?: number | null
          campanha_id?: string | null
          canonical_event_name?: string
          click_id?: string | null
          commission_amount?: number | null
          conteudo_id?: string | null
          converted_amount_brl?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_timestamp?: string
          exchange_rate?: number | null
          exchange_rate_timestamp?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          is_duplicate?: boolean | null
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          original_amount?: number | null
          original_currency?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          platform_user_id?: string | null
          processed_at?: string | null
          raw_event_name?: string
          raw_payload?: Json | null
          source_type?: string
          status?: string | null
          tracking_link_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          utm_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_landing_page_instance_id_fkey"
            columns: ["landing_page_instance_id"]
            isOneToOne: false
            referencedRelation: "landing_page_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_tracking_link_id_fkey"
            columns: ["tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_utm_id_fkey"
            columns: ["utm_id"]
            isOneToOne: false
            referencedRelation: "utms"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_links: {
        Row: {
          base_url: string | null
          campanha_id: string | null
          click_id_param_name: string | null
          commission_percent: number | null
          conteudo_id: string | null
          created_at: string | null
          final_url: string | null
          game_icon_url: string | null
          game_name: string | null
          game_slug: string | null
          hype_priority: number | null
          hype_reason: string | null
          id: string
          influencer_id: string | null
          is_demo: boolean
          landing_page_id: string | null
          landing_page_instance_id: string | null
          link_category: string | null
          lp_auto_generated: boolean
          notes: string | null
          parent_link_id: string | null
          platform_account_id: string | null
          short_url: string | null
          status: string | null
          tracking_code: string
          tracking_role: string | null
          updated_at: string | null
          use_lp: boolean
          utm_id: string | null
        }
        Insert: {
          base_url?: string | null
          campanha_id?: string | null
          click_id_param_name?: string | null
          commission_percent?: number | null
          conteudo_id?: string | null
          created_at?: string | null
          final_url?: string | null
          game_icon_url?: string | null
          game_name?: string | null
          game_slug?: string | null
          hype_priority?: number | null
          hype_reason?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          link_category?: string | null
          lp_auto_generated?: boolean
          notes?: string | null
          parent_link_id?: string | null
          platform_account_id?: string | null
          short_url?: string | null
          status?: string | null
          tracking_code?: string
          tracking_role?: string | null
          updated_at?: string | null
          use_lp?: boolean
          utm_id?: string | null
        }
        Update: {
          base_url?: string | null
          campanha_id?: string | null
          click_id_param_name?: string | null
          commission_percent?: number | null
          conteudo_id?: string | null
          created_at?: string | null
          final_url?: string | null
          game_icon_url?: string | null
          game_name?: string | null
          game_slug?: string | null
          hype_priority?: number | null
          hype_reason?: string | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          link_category?: string | null
          lp_auto_generated?: boolean
          notes?: string | null
          parent_link_id?: string | null
          platform_account_id?: string | null
          short_url?: string | null
          status?: string | null
          tracking_code?: string
          tracking_role?: string | null
          updated_at?: string | null
          use_lp?: boolean
          utm_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_links_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_landing_page_instance_id_fkey"
            columns: ["landing_page_instance_id"]
            isOneToOne: false
            referencedRelation: "landing_page_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_parent_link_id_fkey"
            columns: ["parent_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_utm_id_fkey"
            columns: ["utm_id"]
            isOneToOne: false
            referencedRelation: "utms"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_metrics: {
        Row: {
          avg_ticket: number | null
          campanha_id: string | null
          cliques: number | null
          conteudo_id: string | null
          converted_amount: number | null
          converted_currency: string | null
          cost_amount: number | null
          created_at: string | null
          custo_influencer: number | null
          custo_trafego: number | null
          data_ref: string
          depositos_total: number | null
          deposits_count: number | null
          epc: number | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_timestamp: string | null
          ftd: number | null
          ftd_cr: number | null
          id: string
          influencer_id: string | null
          is_demo: boolean
          landing_page_id: string | null
          landing_page_instance_id: string | null
          observacoes: string | null
          origem_importacao: string | null
          original_amount: number | null
          original_currency: string | null
          platform_account_id: string | null
          platform_id: string | null
          profit_amount: number | null
          redeposit_amount: number | null
          redepositos: number | null
          redeposits_count: number | null
          registration_cr: number | null
          registros: number | null
          rev_per_ftd: number | null
          rev_per_registration: number | null
          revenue: number | null
          revenue_liquido: number | null
          roi: number | null
          saque_disponivel: number | null
          updated_at: string | null
          utm_id: string | null
        }
        Insert: {
          avg_ticket?: number | null
          campanha_id?: string | null
          cliques?: number | null
          conteudo_id?: string | null
          converted_amount?: number | null
          converted_currency?: string | null
          cost_amount?: number | null
          created_at?: string | null
          custo_influencer?: number | null
          custo_trafego?: number | null
          data_ref: string
          depositos_total?: number | null
          deposits_count?: number | null
          epc?: number | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_timestamp?: string | null
          ftd?: number | null
          ftd_cr?: number | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          observacoes?: string | null
          origem_importacao?: string | null
          original_amount?: number | null
          original_currency?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          profit_amount?: number | null
          redeposit_amount?: number | null
          redepositos?: number | null
          redeposits_count?: number | null
          registration_cr?: number | null
          registros?: number | null
          rev_per_ftd?: number | null
          rev_per_registration?: number | null
          revenue?: number | null
          revenue_liquido?: number | null
          roi?: number | null
          saque_disponivel?: number | null
          updated_at?: string | null
          utm_id?: string | null
        }
        Update: {
          avg_ticket?: number | null
          campanha_id?: string | null
          cliques?: number | null
          conteudo_id?: string | null
          converted_amount?: number | null
          converted_currency?: string | null
          cost_amount?: number | null
          created_at?: string | null
          custo_influencer?: number | null
          custo_trafego?: number | null
          data_ref?: string
          depositos_total?: number | null
          deposits_count?: number | null
          epc?: number | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_timestamp?: string | null
          ftd?: number | null
          ftd_cr?: number | null
          id?: string
          influencer_id?: string | null
          is_demo?: boolean
          landing_page_id?: string | null
          landing_page_instance_id?: string | null
          observacoes?: string | null
          origem_importacao?: string | null
          original_amount?: number | null
          original_currency?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          profit_amount?: number | null
          redeposit_amount?: number | null
          redepositos?: number | null
          redeposits_count?: number | null
          registration_cr?: number | null
          registros?: number | null
          rev_per_ftd?: number | null
          rev_per_registration?: number | null
          revenue?: number | null
          revenue_liquido?: number | null
          roi?: number | null
          saque_disponivel?: number | null
          updated_at?: string | null
          utm_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_metrics_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_landing_page_instance_id_fkey"
            columns: ["landing_page_instance_id"]
            isOneToOne: false
            referencedRelation: "landing_page_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_metrics_utm_id_fkey"
            columns: ["utm_id"]
            isOneToOne: false
            referencedRelation: "utms"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_snapshots: {
        Row: {
          cliques: number | null
          created_at: string | null
          data_snapshot: string
          depositos_total: number | null
          ftd: number | null
          hora_snapshot: string | null
          id: string
          is_demo: boolean
          notes: string | null
          period_end: string | null
          period_start: string | null
          platform_account_id: string | null
          platform_id: string | null
          raw_payload: Json | null
          redepositos: number | null
          registros: number | null
          revenue: number | null
          saque_disponivel: number | null
          snapshot_type: string | null
        }
        Insert: {
          cliques?: number | null
          created_at?: string | null
          data_snapshot: string
          depositos_total?: number | null
          ftd?: number | null
          hora_snapshot?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          raw_payload?: Json | null
          redepositos?: number | null
          registros?: number | null
          revenue?: number | null
          saque_disponivel?: number | null
          snapshot_type?: string | null
        }
        Update: {
          cliques?: number | null
          created_at?: string | null
          data_snapshot?: string
          depositos_total?: number | null
          ftd?: number | null
          hora_snapshot?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_account_id?: string | null
          platform_id?: string | null
          raw_payload?: Json | null
          redepositos?: number | null
          registros?: number | null
          revenue?: number | null
          saque_disponivel?: number | null
          snapshot_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_snapshots_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_snapshots_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
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
          campanha_id: string | null
          codigo_referencia: string | null
          conteudo_id: string | null
          created_at: string | null
          game_id: string | null
          id: string
          influencer_id: string | null
          is_active: boolean | null
          is_demo: boolean
          landing_page_id: string | null
          link_base: string | null
          link_curto: string | null
          link_final: string | null
          nome: string | null
          notes: string | null
          platform_id: string | null
          subid: string | null
          template_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campanha_id?: string | null
          codigo_referencia?: string | null
          conteudo_id?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string | null
          link_base?: string | null
          link_curto?: string | null
          link_final?: string | null
          nome?: string | null
          notes?: string | null
          platform_id?: string | null
          subid?: string | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campanha_id?: string | null
          codigo_referencia?: string | null
          conteudo_id?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          is_demo?: boolean
          landing_page_id?: string | null
          link_base?: string | null
          link_curto?: string | null
          link_final?: string | null
          nome?: string | null
          notes?: string | null
          platform_id?: string | null
          subid?: string | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utms_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utms_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudo"
            referencedColumns: ["id"]
          },
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
      withdrawal_cycles: {
        Row: {
          amount: number
          available_at: string
          consumed_amount: number
          created_at: string
          created_by: string | null
          id: string
          landed_at: string
          notes: string | null
          notified_available_at: string | null
          notified_landed_at: string | null
          reference: string | null
          source: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          available_at: string
          consumed_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          landed_at?: string
          notes?: string | null
          notified_available_at?: string | null
          notified_landed_at?: string | null
          reference?: string | null
          source?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          available_at?: string
          consumed_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          landed_at?: string
          notes?: string | null
          notified_available_at?: string | null
          notified_landed_at?: string | null
          reference?: string | null
          source?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_influencer_id: { Args: never; Returns: string }
      current_manager_id: { Args: never; Returns: string }
      current_manager_squad_id: { Args: never; Returns: string }
      distribute_squad_goal: {
        Args: { _mode?: string; _overrides?: Json; _squad_id: string }
        Returns: Json
      }
      generate_api_key: { Args: { _name?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      lp_opp_slugify: { Args: { txt: string }; Returns: string }
      notify_target: {
        Args: {
          _action_url: string
          _body: string
          _meta: Json
          _target_id: string
          _target_type: string
          _title: string
          _type: string
        }
        Returns: string
      }
      pick_manager_for_squad: { Args: { _squad_id: string }; Returns: string }
      playbet_append_url_param: {
        Args: {
          _overwrite?: boolean
          _param: string
          _url: string
          _value: string
        }
        Returns: string
      }
      playbet_public_lp_url: {
        Args: {
          _campanha_id: string
          _domain: string
          _influencer_id: string
          _instance_slug: string
          _lp_mode: string
          _route: string
        }
        Returns: string
      }
      playbet_tracked_affiliate_url: {
        Args: {
          _base_url: string
          _campanha_id: string
          _click_param: string
          _influencer_id: string
          _tracking_code: string
        }
        Returns: string
      }
      playbet_url_has_param: {
        Args: { _param: string; _url: string }
        Returns: boolean
      }
      recalc_manager_hierarchy: {
        Args: { _manager_id: string }
        Returns: undefined
      }
      release_available_withdrawal_cycles: { Args: never; Returns: number }
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
        | "gerente"
        | "influencer"
      commercial_checklist_field_type:
        | "boolean"
        | "text"
        | "number"
        | "link"
        | "file"
        | "select"
      commercial_stage:
        | "em_contato"
        | "respondeu"
        | "checklist"
        | "cadastro"
        | "analise"
        | "aprovado"
        | "concluido"
        | "standby"
        | "desqualificado"
      manager_compensation_mode: "manager" | "socio_only" | "influencer_only"
      manager_hierarchy_role: "gerente" | "gerente_diretor" | "diretor_squads"
      manager_origin_type: "influencer" | "socio" | "standalone"
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
        "gerente",
        "influencer",
      ],
      commercial_checklist_field_type: [
        "boolean",
        "text",
        "number",
        "link",
        "file",
        "select",
      ],
      commercial_stage: [
        "em_contato",
        "respondeu",
        "checklist",
        "cadastro",
        "analise",
        "aprovado",
        "concluido",
        "standby",
        "desqualificado",
      ],
      manager_compensation_mode: ["manager", "socio_only", "influencer_only"],
      manager_hierarchy_role: ["gerente", "gerente_diretor", "diretor_squads"],
      manager_origin_type: ["influencer", "socio", "standalone"],
    },
  },
} as const
