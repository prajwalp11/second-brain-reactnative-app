  import { DOMAIN_TYPES, SKILL_LEVELS } from '@/constants/domains';

  export type DomainType = (typeof DOMAIN_TYPES)[number]['type'];
  export type SkillLevel = (typeof SKILL_LEVELS)[number]['value'];

  export interface CreateDomainRequest {
    domainType: DomainType;
    customName?: string;
    skillLevel: SkillLevel;
    linkedResourceUrl?: string;
  }

  export interface DomainResponse {
    id: string;
    domainType: DomainType;
    customName: string | null;
    skillLevel: SkillLevel;
    status: string;
    planDescription: string | null;
    weeklySchedule: string | null;
    linkedResourceUrl: string | null;
    linkedResourceTitle: string | null;
    currentStreak: number;
    longestStreak: number;
    lastLogDate: string | null;
  }