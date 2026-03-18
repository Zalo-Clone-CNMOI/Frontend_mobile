export type ContactUser = {
  id: string;
  fullName: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastSeen: number | null;
};