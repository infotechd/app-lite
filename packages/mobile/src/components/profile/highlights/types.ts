// packages/mobile/src/components/profile/highlights/types.ts
export interface Badge {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: string; // ISO 8601
}

export interface Interest {
  id: string;
  name: string;
}
