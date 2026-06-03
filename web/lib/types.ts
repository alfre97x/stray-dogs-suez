// Database row types — mirror supabase/migrations/001+002.
// Shared by client and server code.

export type UserRole = "rescuer" | "admin" | "coordinator";
export type DogSex = "male" | "female" | "unknown";
export type SightingUrgency = "low" | "medium" | "high" | "critical";

export interface Zone {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  zone_id: string | null;
  dogs_added: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: string;
  name: string | null;
  sex: DogSex;
  estimated_age: string | null;
  color: string | null;
  notes: string | null;
  zone_id: string;
  lat: number;
  lng: number;
  tnr_done: boolean;
  tnr_date: string | null;
  tnr_pending: boolean;
  vaccinated: boolean;
  vacc_date: string | null;
  vacc_type: string | null;
  is_injured: boolean;
  is_deceased: boolean;
  deceased_date: string | null;
  photo_urls: string[];
  thumbnail_url: string | null;
  added_by: string;
  caught_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_url"> | null;
  zones?: Pick<Zone, "name_en" | "name_ar"> | null;
}

export interface Sighting {
  id: string;
  zone_id: string;
  lat: number | null;
  lng: number | null;
  count: number;
  description: string | null;
  urgency: SightingUrgency;
  photo_url: string | null;
  reported_by: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_url"> | null;
  zones?: Pick<Zone, "name_en" | "name_ar"> | null;
}

export interface ZoneStat {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
  total_dogs: number;
  tnr_count: number;
  vaccinated_count: number;
  injured_count: number;
  pending_count: number;
  recent_sightings: number;
}

export interface DogEvent {
  id: string;
  dog_id: string;
  user_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name"> | null;
}
