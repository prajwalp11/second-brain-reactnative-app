  import { DOMAIN_TYPES, SKILL_LEVELS } from '@/constants/domains';

  export type DomainType = (typeof DOMAIN_TYPES)[number]['type'];
  export type SkillLevel = (typeof SKILL_LEVELS)[number]['value'];

  export interface CreateDomainRequest {
    domainType: DomainType;
    customName?: string;
    context?: string;
    skillLevel: SkillLevel;
    linkedResourceUrl?: string;
    /** User-chosen training days, comma-separated 3-letter names (e.g. "Mon,Wed,Fri"). */
    weeklySchedule?: string;
  }

  export interface DomainResponse {
    id: string;
    domainType: DomainType;
    customName: string | null;
    skillLevel: SkillLevel;
    status: string;
    planDescription: string | null;
    context: string | null;
    weeklySchedule: string | null;
    currentStreak: number;
    longestStreak: number;
    lastLogDate: string | null;
  }