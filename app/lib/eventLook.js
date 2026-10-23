// Icon and colours for each kind of event (used where films show a poster)
import { BriefcaseIcon, GraduationCapIcon, MicIcon, PartyPopperIcon, SparklesIcon, TrophyIcon, UsersIcon, WrenchIcon } from 'lucide-vue-next';
import { venueById } from '../data/programme.js';

export const EVENT_LOOK = {
  masterclass: { icon: GraduationCapIcon, a: '#D9A441', b: '#4A2A08' },
  workshop: { icon: WrenchIcon, a: '#E9C262', b: '#3A2A12' },
  market: { icon: BriefcaseIcon, a: '#8F84FF', b: '#1E1850' },
  panel: { icon: MicIcon, a: '#3CCFB8', b: '#0B3A3A' },
  gala: { icon: SparklesIcon, a: '#F07AB8', b: '#4A0F2E' },
  awards: { icon: TrophyIcon, a: '#E9C262', b: '#2A1F05' },
  party: { icon: PartyPopperIcon, a: '#F47A6B', b: '#40130E' },
  networking: { icon: UsersIcon, a: '#4DA6FF', b: '#0E2650' },
};

export const eventLook = (event) => EVENT_LOOK[event?.type] || EVENT_LOOK.networking;

export const eventWhere = (e) => (e.venue ? venueById(e.venue)?.name : e.place);
