export const BARBER_STATUSES = [
  "AVAILABLE",
  "BUSY_WAITLIST_OPEN",
  "BUSY_WAITLIST_FULL",
  "OFFLINE",
] as const;

export type BarberStatus = (typeof BARBER_STATUSES)[number];

export type PublicLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  sort_order: number;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  photo_url: string;
  tags: string[];
  sort_order: number;
};

export type OpeningRange = {
  open: string;
  close: string;
};

export type OpeningHours = {
  mon: OpeningRange[];
  tue: OpeningRange[];
  wed: OpeningRange[];
  thu: OpeningRange[];
  fri: OpeningRange[];
  sat: OpeningRange[];
  sun: OpeningRange[];
};

export type StationCapabilities = {
  appointments: boolean;
  public_booking: boolean;
  walk_in: boolean;
};

export type PublicStation = {
  barber_id: string;
  barber_name: string;
  barber_avatar_url: string | null;
  barber_bio: string | null;
  branch_id: string;
  branch_name: string;
  branch_address: string | null;
  branch_phone_number: string | null;
  branch_latitude: number | null;
  branch_longitude: number | null;
  branch_timezone: string;
  opening_hours: OpeningHours | null;
  organization_name: string;
  organization_logo_url: string | null;
  current_status: BarberStatus;
  status_updated_at: string;
  barber_links: PublicLink[];
  branch_links: PublicLink[];
  portfolio: PortfolioItem[];
  capabilities: StationCapabilities;
};

export type BranchBarber = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  current_status: BarberStatus;
  status_updated_at: string;
};

export type PublicService = {
  id: string;
  name: string;
  duration_minutes: number;
};

export type TimeSlot = {
  starts_at: string;
  ends_at: string;
};

export type SlotDay = {
  date: string;
  timezone: string;
  service_id: string;
  duration_minutes: number;
  opening_hours_set: boolean;
  slots: TimeSlot[];
};

export type PublicAppointmentCreated = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  barber_name: string;
  manage_token: string;
};

export type LoyaltyCard = {
  barber_id: string;
  branch_id: string;
  organization_name: string;
  barber_name: string;
  phone_number: string;
  subprofile_id: string;
  alias_name: string;
  current_streak: number;
  target_haircut_count: number;
  next_haircut_reward_unlocked: boolean;
  reward_banner: string | null;
  reward_description: string | null;
};

export type LogbookEntry = {
  completed_at: string;
  barber_name: string;
  photo_urls: string[];
};

export type PublicLogbook = {
  organization_name: string;
  alias_name: string;
  current_streak: number;
  target_haircut_count: number;
  reward_banner: string | null;
  history: LogbookEntry[];
};

export type StatusUpdate = {
  status: BarberStatus;
  updated_at: string;
};
