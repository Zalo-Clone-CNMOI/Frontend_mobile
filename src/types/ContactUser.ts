export type ContactUser = {
  id: string;
  fullName: string;
  avatar: string | null;
  status: "online" | "offline" | "away";
  lastSeen: number | null;
};