// Icon and colours for each kind of event (used where films show a poster)
import type { Component } from 'vue';
import { BriefcaseIcon, GraduationCapIcon, MicIcon, PartyPopperIcon, SparklesIcon, TrophyIcon, UsersIcon, WrenchIcon } from 'lucide-vue-next';
import type { EventType, FestivalEvent } from '@afriff/core/types/festival';
import { venueById } from '@afriff/core/data/programme';

export interface EventLook { icon: Component; a: string; b: string }

export const EVENT_LOOK: Record<EventType, EventLook> = {
  masterclass: { icon: GraduationCapIcon, a: '#DBA440', b: '#4A2A08' },
  workshop: { icon: WrenchIcon, a: '#E9C362', b: '#3A2A12' },
  market: { icon: BriefcaseIcon, a: '#8F84FF', b: '#1E1850' },
  panel: { icon: MicIcon, a: '#3CCFB8', b: '#0B3A3A' },
  gala: { icon: SparklesIcon, a: '#F07AB8', b: '#4A0F2E' },
  awards: { icon: TrophyIcon, a: '#E9C362', b: '#2A1F05' },
  party: { icon: PartyPopperIcon, a: '#F37B6B', b: '#40130E' },
  networking: { icon: UsersIcon, a: '#4DA6FF', b: '#0E2650' },
};

export const eventLook = (event: Pick<FestivalEvent, 'type'> | null | undefined): EventLook =>
  (event && EVENT_LOOK[event.type]) || EVENT_LOOK.networking;

export const eventWhere = (e: Pick<FestivalEvent, 'venue' | 'place'>) => (e.venue ? venueById(e.venue)?.name ?? '' : e.place);
