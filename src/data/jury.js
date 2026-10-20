// AFRIFF 15 jury, from afriff.com/festival/jury (20 Oct 2026).
// Names, roles, countries and photos are AFRIFF's; the short bios are
// written for the app. Photos are linked from AFRIFF's site: host them
// ourselves before launch. The database (console → Jury) is the master
// copy once published; this file is the starting point.

export const JURY_LINKS = {
  pressRelease: 'https://afriff.com/news/afriff-2026-international-jury',
  pastJuries: 'https://afriff.com/festival/past-juries',
};

const PHOTO = 'https://afriff-revival.lovable.app/__l5e/assets-v1/';
const INTL = 'International Jury';

export let JURY = [
  {
    id: 'tshepiso-chikapa-phiri', name: 'Tshepiso Chikapa Phiri', roles: 'Producer · Media executive', country: 'South Africa', jury: INTL, order: 0,
    photo: `${PHOTO}7d7331d6-f9ea-45ba-b030-1958f19a6f16/jury-2026-tshepiso.jpg`,
    bio: 'Leads Known Associates Group and chairs the Independent Producers\' Organisation. She has produced uBettina Wethu, Wild Is the Wind and The Umbrella Men, and worked as a production executive on Beast and The Woman King.',
  },
  {
    id: 'blessing-uzzi', name: 'Blessing Uzzi', roles: 'Filmmaker · Writer · Producer', country: 'Nigeria', jury: INTL, order: 1,
    photo: `${PHOTO}496f626c-840f-4ec6-9c86-c1dacd2e4855/jury-2026-blessing.jpeg`,
    bio: 'Founder of Bluhouse Studios. Her film Freedom Way premiered at Toronto in 2024, won the AFRIFF Jury Prize, and took Best Movie and Best Writing at the 2025 AMVCAs. She also ran the Zikoko Life Series.',
  },
  {
    id: 'keith-shiri', name: 'Keith Shiri', roles: 'Festival programmer · Jury coordinator', country: 'Zimbabwe', jury: INTL, order: 2,
    photo: `${PHOTO}773becb6-4271-4047-b4bb-13efeb9fb097/jury-2026-keith.jpg`,
    bio: 'A curator and writer devoted to African cinema, who founded Africa at the Pictures and the London African Film Festival and has advised the BFI London Film Festival and Venice.',
  },
  {
    id: 'ahmed-al-othman', name: 'Dr Ahmed Al Othman', roles: 'Journalist · Film industry professional', country: 'Oman', jury: INTL, order: 3,
    photo: `${PHOTO}b4917069-d9ce-4ff8-99f6-3e092f733b14/jury-2025-ahmad.jpg`,
    bio: 'Returns after serving on the AFRIFF 2025 jury. A member of the Oman Film Society who works to connect Omani filmmakers with the wider film world.',
  },
  {
    id: 'jean-pierre-bekolo', name: 'Jean-Pierre Bekolo', roles: 'Filmmaker · Author · Educator', country: 'Cameroon', jury: INTL, order: 4,
    photo: `${PHOTO}f1ecdc84-6026-4f6d-8900-ac57461c3074/jury-2026-bekolo.jpeg`,
    bio: 'Director of Quartier Mozart and Les Saignantes, working across fiction, documentary and experimental film. He has taught at Duke University and was a Harvard fellow in 2024.',
  },
  {
    id: 'fibby-kioria', name: 'Fibby Kioria', roles: 'Producer · Creative leader', country: 'Kenya', jury: INTL, order: 5,
    photo: `${PHOTO}90135633-fe77-4aea-a285-72e9050b1c07/jury-2026-fibby.jpg`,
    bio: 'Founder of Mucii Pictures and former programme director of Maisha Film Lab, where she oversaw more than thirty short films. She sits on the Locarno Open Doors selection committee.',
  },
  {
    id: 'jerry-chiemeke', name: 'Jerry Chiemeke', roles: 'Writer · Film critic · Journalist', country: 'Nigeria', jury: INTL, order: 6,
    photo: `${PHOTO}8584513e-01c2-4dfc-a0bf-7b89e1b53940/jury-2026-jerry.jpg`,
    bio: 'Founding editor-in-chief of Afrocritik and winner of the Ken Saro-Wiwa Prize for Criticism. An alumnus of Berlinale Talents and Talents Durban.',
  },
  {
    id: 'michel-tabet', name: 'Michel Tabet', roles: 'Filmmaker · Anthropologist', country: 'France / Lebanon', jury: INTL, order: 7,
    photo: `${PHOTO}fcbff460-1c76-48cf-a970-07cbf2e4cba9/jury-2026-michel.jpg`,
    bio: 'A documentary maker linked to CNRS and the French Institute for the Near East, exploring memory and identity in films such as Voices from Kasserine and Habiter Beyrouth.',
  },
  {
    id: 'femi-elufowoju-jr', name: 'Femi Elufowoju Jr. OBE', roles: 'Playwright · Actor · Director · Producer', country: 'Nigeria / United Kingdom', jury: INTL, order: 8,
    photo: `${PHOTO}b589c337-6ab6-4336-85a0-095107013898/jury-2026-femi.jpg`,
    bio: 'Founder of Tiata Fahodzi, working across theatre, film, TV and opera, including The Secret Lives of Baba Segi\'s Wives. Awarded an OBE for services to drama in 2023.',
  },
  {
    id: 'jemilah-alghali', name: 'Jemilah Alghali', roles: 'Entertainment marketing · Brand strategy', country: 'Sierra Leone / United States', jury: INTL, order: 9,
    photo: `${PHOTO}3837c3cf-5dfb-46a7-ba22-4a9933043077/jury-2026-jemilah.jpg`,
    bio: 'A BET Media Group executive behind campaigns for the BET Awards, NAACP Image Awards and Tyler Perry productions.',
  },
];

export const BUILT_IN_JURY = JURY;

// Swap in the jury an admin published from the console.
export function replaceJury(list) {
  JURY = list
    .filter((j) => j.id && j.name)
    .map((j) => ({ ...j, jury: j.jury || INTL, roles: j.roles || '', country: j.country || '', bio: j.bio || '', photo: j.photo || '' }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

// Jury members grouped under their jury's heading, in order of first appearance
export function juryGroups() {
  const groups = [];
  for (const j of JURY) {
    let g = groups.find((x) => x.name === j.jury);
    if (!g) groups.push((g = { name: j.jury, members: [] }));
    g.members.push(j);
  }
  return groups;
}
