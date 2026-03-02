export interface Workspace {
  id: string;
  name: string;
  slug_prefix: string;
  drive_root_folder_id: string | null;
  created_at: string;
}

export interface Slug {
  id: string;
  workspace_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  drive_folder_id: string | null;
  is_archived: boolean;
  created_at: string;
  asset_count?: number;
  initiative_count?: number;
  children?: Slug[];
}

export interface Initiative {
  id: string;
  workspace_id: string;
  slug_id: string | null;
  name: string;
  short_code: string;
  status: 'active' | 'ongoing' | 'ended' | 'archived';
  start_date: string | null;
  end_date: string | null;
  drive_folder_id: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  slug?: Slug;
  asset_count?: number;
}

export interface Asset {
  id: string;
  workspace_id: string;
  slug_id: string;
  initiative_id: string | null;
  original_filename: string;
  stored_filename: string | null;
  file_type: 'image' | 'video' | 'pdf' | 'newsletter' | 'other';
  mime_type: string | null;
  file_size_bytes: number | null;
  file_size_label: string | null;
  width_px: number | null;
  height_px: number | null;
  dimensions_label: string | null;
  aspect_ratio: string | null;
  duration_seconds: number | null;
  domain_context: 'social' | 'display' | 'print' | 'branding' | 'internal' | null;
  asset_type: 'production' | 'source' | 'draft';
  platforms: string[] | null;
  drive_file_id: string | null;
  drive_view_url: string | null;
  upload_date: string;
  uploaded_by: string | null;
  tags: string[] | null;
  is_archived: boolean;
  notes: string | null;
  // Version control
  parent_asset_id: string | null;
  version: number;
  // Expiry & license
  expires_at: string | null;
  license_notes: string | null;
  // Archive tracking
  archived_at: string | null;
  // Duplicate detection
  file_hash: string | null;
  // Joined relations
  slug?: Slug;
  initiative?: Initiative;
  // Version children (from query)
  versions?: Asset[];
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  role: 'admin' | 'initiative_manager' | 'media_buyer' | 'viewer';
  workspace_ids: string[] | null;
  permissions: UserPermissions;
  is_active: boolean;
  invited_by: string | null;
  invited_by_name?: string | null;
  view_filters: Record<string, string | string[]> | null;
  created_at?: string;
  last_sign_in_at?: string | null;
}

export interface UserPermissions {
  can_upload?: boolean;
  can_view?: boolean;
  can_manage_initiatives?: boolean;
  can_view_filtered?: boolean;
}

export interface UploadToken {
  id: string;
  workspace_id: string;
  slug_id: string;
  initiative_id: string | null;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ExportLog {
  id: string;
  workspace_id: string;
  platform: string;
  asset_count: number;
  exported_by: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, string | string[]>;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  asset_count?: number;
}

export interface AssetComment {
  id: string;
  asset_id: string;
  user_id: string | null;
  user_name: string | null;
  content: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  workspace_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
