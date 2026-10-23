// FESTIVAL DATA (temporary, until the admin console in step 2).
// Films, sections, venues, day themes and partners: taken from afriff.com
// on 18 Oct 2026. Synopses are short summaries written for this app.
// SCREENING TIMES ARE SAMPLES: AFRIFF hasn't published the timetable yet.

import type { Film, HowToSection, NewsItem, PosterStyle, PublishedSnapshot, Screening, Sponsor, Tag, Venue } from '~/types/festival';

export const FESTIVAL = {
  name: 'AFRIFF',
  year: 2026,
  // Opening night start, Lagos time (WAT = UTC+1). Drives the countdown.
  openingNight: '2026-11-01T19:00:00+01:00',
  days: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'],
  ticketsUrl: 'https://afriff.com/tickets',
  filmUrl: (id: string) => `https://afriff.com/program/${id}`,
};

// Theme of each festival day (from afriff.com/program/schedule)
export const DAY_THEMES: Record<string, string> = {
  '2026-11-01': 'Opening Night',
  '2026-11-02': 'Cinema Across Borders',
  '2026-11-03': 'New Voices',
  '2026-11-04': 'Women in Film',
  '2026-11-05': 'Made in Africa',
  '2026-11-06': 'AFRIFF x CANEX WKND',
  '2026-11-07': 'Globe Awards',
};

// Each venue has its own dot colour, used everywhere that venue appears.
export let VENUES: Venue[] = [
  { id: 'landmark', name: 'Filmhouse Landmark', area: 'Victoria Island', address: 'Landmark Village, 4 Water Corporation Drive, Victoria Island, Lagos', color: '#3CCFB8' },
  { id: 'twinwaters', name: 'Filmhouse Twinwaters', area: 'Oniru, Lekki', address: 'Twinwaters Entertainment Centre, Okunde Blue Water Scheme, off Remi Olowude Street, Lekki, Lagos', color: '#8F84FF' },
  { id: 'palms', name: 'Filmhouse The Palms', area: 'Lekki', address: 'The Palms Shopping Mall, Bisway Street, Lekki, Lagos', color: '#4DA6FF' },
];

// Programme sections, in the order they appear on the "All films" tab.
export const SECTIONS = ['Opening Movie', 'Special Presentations', 'Features', 'Documentary', 'Jury Selection', 'Audience', 'Shorts'];
const SECTION_CODES: Record<string, string> = { OPEN: 'Opening Movie', SP: 'Special Presentations', FEAT: 'Features', DOC: 'Documentary', JURY: 'Jury Selection', AUD: 'Audience', SHORTS: 'Shorts' };

const POSTER_BASE = 'https://afriff-revival.lovable.app/__l5e/assets-v1/';

// id | title | section | country | minutes | year | director | language | genre | trailer | poster | synopsis
const RAW = `
lady|Lady|OPEN|United Kingdom, Nigeria|93|2026|Olive Nwosu|English, Nigerian Pidgin|Drama||18dac569-2235-4fae-8126-d538f8f2490b/lady.jpg|A Lagos night-cab driver saving to escape the city is pulled into driving her returning childhood friend's wild crew, and finds an unexpected sisterhood.
its-the-blackness|It's the Blackness|SP|United Kingdom|135|2026|Hakeem Kae-Kazim|English|Comedy||54ee00ba-166a-4638-a57c-d8c380cf1f0f/its-the-blackness.jpg|Two overqualified Black graduates juggle unemployment, messy romances and family pressure in a comedy about a rigged system.
the-traitor|The Traitor|SP|Italy, France, Germany, Brazil|153|2019|Marco Bellocchio|Italian, Portuguese|Drama|||The true story of Tommaso Buscetta, the Mafia insider whose testimony to Judge Falcone shook Sicily's crime families.
sentimental-value|Sentimental Value|SP|Norway, France, Germany, Denmark, Sweden|135|2025|Joachim Trier|Norwegian, English|Drama|||Two sisters reconnect with their once-famous director father, whose comeback film reopens old family wounds.
if-i-go-will-they-miss-me|If I Go Will They Miss Me|SP|United States|90|2026|Walter Thompson-Hernandez|English|Drama|||A 12-year-old in Watts reaches for his newly released father while strange visions follow him through the day.
the-spectacular-death-of-prisca|The Spectacular Death of Prisca|SP|Nigeria|23|2026|Kaelo Iyizoba|English, Yoruba|Comedy|||A mother's frantic wedding-day quest to save her daughter, in a gleeful tribute to 2000s Nollywood.
the-trouble-with-us-all|The Trouble With Us All|SP|Nigeria, South Africa|89|2026|Ted Magerman|English, Zulu|Drama|||Ruth flees an abusive marriage in Nigeria to build a new life for her baby daughter in Johannesburg.
a-common-story|A Common Story|FEAT|Italy|107|2026|Anna Foglietta||Drama|||A couple facing an empty nest rediscover old desires as they search for new meaning.
a-girl-unknown|A Girl Unknown|FEAT|China|128|2025|Zou Jing||Drama|||A girl is passed through three families and identities under China's one-child policy in this coming-of-age debut.
abeni|Abeni|FEAT|Nigeria|110|2026|Esse Akwawa & Samuel Olasehinde||Drama||d56422d8-e788-44a8-ba16-467f81251002/abeni.jpg|In a tradition-bound village, a young woman secretly masters blacksmithing, a craft forbidden to women.
hadda|Hadda|FEAT|Algeria|78|2026|Ahmed Riad|Arabic, French|Drama||26498e75-4747-4301-a0a6-fa638d072359/hadda.jpg|During Algeria's war of liberation, a nurse runs a hidden mountain clinic and a secret network of young women.
which-way|Which Way|FEAT|Nigeria, United Kingdom|113|2026|Jide Okeke|English|Musical drama|||A Lagos mechanic haunted by his past finds a voice for his trauma through music.
slum-bomber|Slum Bomber|FEAT|Uganda|114|2026|Maureen Jolly Nankya||Drama||3a220ae2-fc75-4399-a1f1-ace7a69d995d/slum-bomber.jpg|Inspired by Ugandan boxer Julie Aloyo, a young woman fights her way from the slums toward change.
variations-on-a-theme|Variations on a Theme|FEAT|South Africa|65|2025|Devon Delmar & Jason Jacobs|Afrikaans|Drama||7cf05dee-ccb5-4912-acc4-56bc07309c38/variations-on-a-theme.jpg|An 80-year-old goat herder waits for war reparations promised by a scam while her family upends her routine.
one-woman-one-bra|One Woman One Bra|FEAT|Kenya, Nigeria|79|2025|Vincho Nchogu||Drama||d1f7b6c5-2e81-4b53-a645-a7aa9bb69965/one-woman-one-bra.jpg|As her village prepares to receive land title deeds, one woman fights not to lose her home.
riverstone|Riverstone|FEAT|Sri Lanka|120|2025|Lalith Rathnayake|Sinhala|Drama||4bcc10f2-a7f2-4714-bf8a-8307ecdb06c1/riverstone.jpg|A Sri Lankan drama about suspects killed in police custody and the uneasy rule of law.
zjili-a-story-of-sisterhood-and-the-burdens-of-excess|Zjili: A Story of Sisterhood and the Burdens of Excess|FEAT|Ghana|119|2026|Christine Boateng & Hajara Musah Chambas||Drama||79e91a0b-6d55-43d8-9944-8e4b00704275/zjili-a-story-of-sisterhood-and-the-burdens-of-excess.jpg|Three women on the edge of the world's largest second-hand clothing market find strength in each other.
her-daughters-mother|Her Daughters' Mother|FEAT|Nigeria|109|2026|Chinàzaēkpērē Chukwu|English|Drama|||Widowed and back home with two daughters, Ejiro is married off again and fights for her girls' futures.
where-the-sun-shines-bright|Where the Sun Shines Bright|FEAT|Bulgaria, Canada, China, Malaysia, Switzerland|67|2026|LAM Can-zhao|Min Nan, Mandarin, Cantonese, German|Coming of age|https://www.youtube.com/watch?v=FCAUmvDYDNA|80c66c42-7a73-4bc1-842d-e1e66d41985b/where-the-sun-shines-bright.jpg|An 18-year-old sees his own story in four left-behind children in his village.
noahs-daughter|Noah's Daughter|FEAT|Iran|80|2025|Amirreza Jalalian|Persian|Drama||b5e77cc8-94d2-4f2c-ae34-b8c2f421cf0b/noahs-daughter.jpg|A dreamlike journey from Iran's southern coast to Tehran with a young woman living alone on an island.
mabanda|Mabanda|FEAT|United States|150|2025|Kang Quintus|Afrikaans, English|Drama||05a637ed-4069-46f3-abdc-6149bdeb7b6e/mabanda.jpg|A grieving pregnant teenager escaping an abusive father is drawn into a dangerous underworld.
the-tropic-sun-and-his-eyes|The Tropic Sun and His Eyes|FEAT|Haiti|80|2026|Elisee Junior St Preux|Haitian Creole|Coming of age|https://youtu.be/6fCFT9D6siE|dcf4b668-a340-4144-99fb-c02ca0016617/the-tropic-sun-and-his-eyes.jpg|A young man and a curious street kid race to reach his estranged father before it's too late.
2-6-seconds-death-in-the-outback|2.6 Seconds: Death in the Outback|DOC|Australia|118|2026|Darren Dale||Documentary|||A documentary series revisiting a death in the Australian outback and what it reveals about race, justice and policing.
concrete-moves|Concrete Moves|DOC|Senegal|12|2025|Fagamou Fama Ndiaye|French, Wolof|Documentary|||Through dance, a filmmaker revisits a Dakar hillside from her childhood, now reshaped by the growing city.
meanwhile-in-namibia|Meanwhile in Namibia|DOC|Germany, Namibia|112|2026|Jonas Spriestersbach|Afrikaans, English, German|Documentary|||A critical look at Germany's aid programme in Namibia in place of reparations for colonial genocide.
mi-tazi|Mi Tazi|DOC|Nigeria|17|2026|Blessing Bulus||Documentary||067b61bc-4896-4a2a-bd44-abe402bf42cf/mi-tazi.jpg|A young artist returns to her ancestral home in Nok, Kaduna State, to hold on to her late father through clay.
taste-of-the-land|Taste of the Land|DOC|South Africa|15|2026|Nondumiso Masache|English|Documentary||ea766a60-1802-4a95-9369-0b0cce329f7b/taste-of-the-land.jpg|A Johannesburg love story rooted in urban farming, indigenous food and care.
three-black-men|Three Black Men|DOC|United States|99|2026|Sienna McLean-LoGreco|English|Documentary||7b0da78f-0a0f-448b-8262-583356bb7931/three-black-men.jpg|Three men retrace the transatlantic slave route in reverse, searching for a new understanding of Blackness.
hope-is-a-word|Hope is a Word|DOC|Italy, Nigeria, Norway|82|2026|Maria Galliani Dyrvik|English|Documentary||3b218465-e9ba-461d-8d97-417dc0198d25/hope-is-a-word.jpg|Poet and activist Nnimmo Bassey brings young people together to confront what oil has done to the Niger Delta.
mon-taxi|Mon Taxi|DOC|Morocco, United States|8|2026|Meriem Sakrouhi|Arabic, French, Spanish|Documentary|||After her father's death, a Moroccan filmmaker keeps their daily phone call going in her own way.
eseuseu|Eseuseu|DOC|Kenya, United States|61|2026|Zaya Benazzo & Maurizio Benazzo|English|Documentary|||Documentary. Synopsis coming soon.
suya-a-spicy-piece-of-home|Suya: A Spicy Piece of Home|DOC|Nigeria|60|2026|Daro Umaigba|English, French|Documentary||e841e0c4-ac0b-4366-b46b-8f39670140b3/suya-a-spicy-piece-of-home.jpg|A seven-year, twelve-country journey following suya from Nigeria into the diaspora, and what it means to belong.
jarabi|Jarabi|DOC|Austria, Germany|30|2026|Maik Proessler|English|Documentary|||Three men in The Gambia who chose to stay, or come back, offer a different view of migration.
we-are-hadza|We Are Hadza|DOC|United States|84|2026|Hannah Otsuka|English, Swahili|Documentary|||Life among the Hadza of northern Tanzania, one of the world's last hunter-gatherer communities.
miss-jobson|Miss Jobson|DOC|Jamaica, Spain|80|2025|Amanda Sans Pantling|English|Documentary||26a4b192-aa63-468d-8aa2-53288c6e4864/miss-jobson.jpg|The life of Diane Jobson, Bob Marley's friend and lawyer, who became a champion of Jamaica's poorest communities.
shared-space|Shared Space|DOC|Netherlands|26|2026|Donal Boyd & Emma Romeijn|English, Hindi, Swahili|Documentary|||From Cape Cod to Assam to Kenya, people learning to live alongside wildlife in a changing world.
colors-curves|Colors & Curves|DOC|United States|58|2026|Walter Johnson Jr.|English|Documentary|||A documentary arguing that creativity belongs to everyone, not a gifted few.
volat|Volat|DOC|Iran|25|2026|Zahra Bagheri||Documentary|||A 94-year-old man returns alone to the homeland a dam flooded fifty years ago.
throne-of-wood|Throne of Wood|DOC||30|2025|Sadegh Kazemi|Persian|Documentary|||A 100-year-old villager keeps stacking firewood long after the gas arrives, to her neighbours' amusement.
dreaming-of-serenada|Dreaming of Serenada|DOC|Denmark|73|2026|Katrine Weber|Danish, English|Documentary||7c330f27-0f62-4013-b6c1-93abb22a5c90/dreaming-of-serenada.jpg|Back at her father's Lake Victoria resort, Luba faces rising floods and the old distance between them.
his-story|His Story|DOC|India|68|2026|Shibaji Gupta|Bengali, English, Hindi|Documentary||0aeb1732-5eed-4a12-9868-bfa811d1dc9c/his-story.jpg|An archive-led investigation that challenges an accepted story of India's independence.
kubana|Kubana|DOC|Canada|99|2026|Alunaya|English, French, Kinyarwanda, Swahili|Documentary|https://vimeo.com/alunaya/kubana-trailer-en|f544f3af-2c10-4d67-95ef-64b48a766778/kubana.jpg|A poetic look at how Rwandans choose to live together.
a-gram-of-deception|A Gram of Deception|DOC|India, United States|21|2026|Rintu Thomas & Sushmit Ghosh|English, Spanish|Documentary|||Two filmmakers trace the hidden power networks behind a small but deadly everyday object.
for-life|For Life|DOC|Türkiye|90|2026|Ahmet Seven|Arabic|Documentary||96df235c-ee96-4be1-815f-510652f1de11/for-life.jpg|A Palestinian woman risks a secret journey to have a child with her imprisoned husband.
soul-catcher|Soul Catcher|SHORTS|Canada|15|2026|Amanda Strong & Pamela Post||Short|||Short film. Synopsis coming soon.
2-love|2:Love|SHORTS|Belgium, France, Israel|11||Ronni Shalev||Short|||Short film. Synopsis coming soon.
in-the-shadows-75|In the Shadows 75|SHORTS|United Kingdom|18|2025|Zubayr Zubayr|English|Drama|https://vimeo.com/1234971996|409ae995-baeb-46e8-96fa-30f684e41749/in-the-shadows-75.jpg|In 1970s Libya, two migrants hiding on the road to Europe share confessions before a knock at the door.
serubawon|Serubawon|SHORTS|United Kingdom|19|2026|Samuel Adeoye|English|Thriller|||A first-date conversation about the meaning of a name spirals into paranoia and a dangerous misunderstanding.
leopard-of-congo|Leopard of Congo|SHORTS|United Kingdom|10|2025|Kiosa Sukami|French, Swahili|Sports drama||895e3510-efff-48a9-bb6c-1df7dd6171b5/leopard-of-congo.jpg|How a gifted Congolese team under Mobutu won the 1974 Africa Cup of Nations and reached the World Cup.
on-the-backburner|On the Backburner|SHORTS|United Kingdom|11|2025|Krisztián Kajtár|English|Drama||cf816c0c-81b3-45b9-9e01-3c959c2dcdc0/on-the-backburner.jpg|Two undocumented kitchen workers create a winning dish, then lose their jobs but not each other.
lalela|Lalela|SHORTS|South Africa|30|2026|Reabetswe Moeti|English, Xhosa|Drama|||A teenager who loved to sing loses her hearing after an accident and starts again with her father in a farm town.
maktoub|Maktoub|SHORTS|United States|27|2026|Kunle Fasasi|English, French|Romance||83aa0be1-14b0-456e-99dc-bc8d1891bb82/maktoub.jpg|Short drama. Synopsis coming soon.
lice-n-shine|Lice n' Shine|SHORTS|Uganda|5|2026|Maria Byoma||Comedy||a8b958c7-2d9f-4822-bc8c-30073bda3e6e/lice-n-shine.jpg|Boarding-school girls rush through a chaotic morning with the holidays almost in sight.
rain|Rain|SHORTS|Zambia, Zimbabwe|4|2026|Tabitha Mwale|English|Sci-fi|||On a dying Earth, a girl escapes into a stolen celestial drug and is forced to face what she's running from.
goat|GOAT|SHORTS|Kenya|28|2025|Judith Nini Kibinge|English, Swahili|Drama|||A city couple's romantic getaway to a remote goat farm turns out to be something else entirely.
wasabi|Wasabi|SHORTS|United States|15|2025|Uhoman Blonded Baby Moltok|English|Drama||ba8f0263-c88b-45f3-808f-b6f9811d7870/wasabi.jpg|A pregnant Senegalese widow moves in with her estranged Japanese mother-in-law, and old wounds surface.
stay|Stay|SHORTS|Nigeria|10|2026|Onyinye Blessing|English|Drama|||A couple's quiet walk through a pine forest holds more than one of them is saying.
on-or-before-two-weeks|On or Before Two Weeks|SHORTS|Jamaica|25|2026|Eliyahu Rochester||Drama||3d7917f9-7a39-4107-bd62-b0c42a4e1312/on-or-before-two-weeks.jpg|An engineer replaced by AI leans on his faith while his wife's life depends on an experimental AI treatment.
a-tray-of-locust-beans-aka-atolb|A Tray of Locust Beans|SHORTS|Nigeria|42|2026|Orobosa Ikponmwen|English|Drama||f12a5101-90f4-4608-a49d-69c468e38158/a-tray-of-locust-beans-aka-atolb.jpg|An orphaned 13-year-old hawking locust beans faces poverty and exploitation. Contains themes of abuse.
little-soldier|Little Soldier|SHORTS|Iran|13|2026|Roxan Karami|Kurdish|Drama|||A mother hiding from ISIS with her newborn faces an impossible choice.
obe-soup|Obe (Soup)|SHORTS|Nigeria|21|2025|Horla Manuvor||Drama||37152ec3-600b-44b2-b2af-451c5f3a537c/obe-soup.jpg|A 12-year-old must choose which language to recite her poem in, caught between her father and grandmother.
ife-ati-iku-love-and-death|Ìfẹ́ àti Ikú (Love and Death)|SHORTS|Nigeria|12|2026|Favour Babalola|English|Epic|||A myth of twin gods of lightning and fire, bound by one soul under an ancient law.
the-lion-of-gwoza|The Lion of Gwoza|SHORTS|Nigeria|4|2026|Adeoye Adetunji|English|Animation||0ca44998-8801-4916-899e-10a41a59827b/the-lion-of-gwoza.jpg|A stop-motion tribute to soldier Abu Ali's stand against insurgency.
ramat|Ramat|SHORTS|Nigeria|8|2026|Steve Babaeko|English|Drama||1ba50f81-23af-42d0-b873-e250d942669a/ramat.jpg|A five-year-old in an army barracks on the morning General Murtala Mohammed is assassinated in 1976.
waiting-for-my-sister|Waiting for My Sister|SHORTS|Nigeria|16|2026|Chimereogo Chiagozie Nwoke-Chima||Drama||86f89d01-7efc-445a-a8fd-7df1878c6e72/waiting-for-my-sister.jpg|A quick-witted teenager survives on his wits in a busy riverside market.
rooted|Rooted|SHORTS|Oman|20|2026|Sultan Ali Al Qamshouai|Arabic|Drama|||Back from the mountains, Salim learns his ailing mother has returned to the family's old village home.
sinai-america|Sinai America|SHORTS|Egypt|14|2025|Rewan Mousa|Arabic|Drama|||Two people, two ideas of home: the Sinai desert and America.
dawayer-the-fallen-angel|Dawayer: The Fallen Angel|SHORTS|Egypt|17|2024|Kerolous Gamal Kamel|Arabic|Drama|||A respected village sheikh in Upper Egypt is exposed, and his past catches up with him as he flees.
`;

// Placeholder poster colours for films without a poster image yet
const PALETTE: [string, string][] = [
  ['#E0479E', '#5B1A8C'], ['#E8C04A', '#B8321F'], ['#2FB5C9', '#0B2B57'], ['#F2A33A', '#1C7A55'],
  ['#E9A15A', '#6B2E1A'], ['#3E8EF7', '#14234F'], ['#6FD08C', '#123A2A'], ['#E36B5A', '#3A2A7A'],
];
const STYLES: PosterStyle[] = ['glow', 'stripes', 'split'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// colour art for a film without a poster image, always the same for the same film
function posterArt(id: string) {
  const h = hash(id);
  const [a, b] = PALETTE[h % PALETTE.length]!;
  return { style: STYLES[h % STYLES.length]!, a, b };
}

export let FILMS: Film[] = RAW.trim().split('\n').map((line): Film => {
  const [id = '', title = '', code = '', country = '', runtime, year, director = '', language = '', genre = '', trailer = '', poster, synopsis = ''] = line.split('|');
  return {
    id, title, section: SECTION_CODES[code] ?? '', country, runtime: Number(runtime), year: year ? Number(year) : null,
    director, language, genre, trailer, synopsis,
    image: poster ? POSTER_BASE + poster : '',
    poster: posterArt(id),
  };
});

// ---------- SAMPLE timetable (replace when AFRIFF publishes times) ----------

const ROOMS: [string, string, number][] = [
  ['landmark', 'Screen 1', 180], ['landmark', 'Screen 2', 120],
  ['twinwaters', 'Screen 1', 140], ['twinwaters', 'Screen 2', 90],
  ['palms', 'Screen 1', 160],
];
const SLOTS = ['11:00', '13:30', '16:00', '18:30', '21:00'];
// Opening day has afternoon screenings before the gala; closing day ends before the awards.
const DAY_SLOTS: Record<string, string[]> = { '2026-11-01': ['13:30', '16:00'], '2026-11-07': ['11:00', '13:30', '16:00'] };
const AFCM_DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];

function buildTimetable(): Screening[] {
  const list: Screening[] = [];
  let n = 0;
  const add = (film: string, venue: string, screen: string, date: string, time: string, capacity: number, tag: Tag) =>
    list.push({ id: `s${++n}`, film, venue, screen, date, time, tag, capacity });

  add('lady', 'landmark', 'Screen 1', '2026-11-01', '19:00', 180, 'Public');
  add('lady', 'twinwaters', 'Screen 1', '2026-11-01', '19:30', 140, 'Public');

  const others = FILMS.filter((f) => f.id !== 'lady');
  const twice = others.filter((f) => f.section === 'Special Presentations' || f.section === 'Features');
  const showings = [...others, ...twice];

  // every free (day, slot, room), filled evenly across the days
  const free = FESTIVAL.days.map((d) => {
    const cells: [string, string, [string, string, number]][] = [];
    for (const t of DAY_SLOTS[d] || SLOTS) for (const r of ROOMS) cells.push([d, t, r]);
    return cells;
  });
  showings.forEach((film, i) => {
    const repeat = i >= others.length;
    let day = (i + (repeat ? 3 : 0)) % free.length;
    while (free[day]!.length === 0) day = (day + 1) % free.length;
    const [d, t, [venue, screen, cap]] = free[day]!.shift()!;
    const industry = venue === 'twinwaters' && AFCM_DAYS.includes(d) && (t === '11:00' || t === '13:30');
    add(film.id, venue, screen, d, t, cap, industry ? 'Industry' : 'Public');
  });

  return list;
}

export let SCREENINGS: Screening[] = buildTimetable();

export let NEWS: NewsItem[] = [
  { id: 'n1', urgent: true, time: '2026-10-18T09:00:00+01:00', title: 'Times are samples for now', body: 'AFRIFF has not published times for screenings, masterclasses or events yet. The times in this app are placeholders until the official schedule is out.' },
  { id: 'n2', urgent: false, time: '2026-10-15T10:00:00+01:00', title: 'AFRIFF 2026 announces its international jury', body: 'Voices from filmmaking, criticism, production and entertainment strategy make up this year\'s jury.', url: 'https://afriff.com/news/afriff-2026-international-jury' },
  { id: 'n3', urgent: false, time: '2026-10-10T10:00:00+01:00', title: 'AFRIFF 15: Lagos awaits', body: 'The fifteenth edition runs 1–7 November 2026, with the AFCM market at Twinwaters from 2–5 November.', url: 'https://afriff.com/news/afriff-15-lagos-awaits' },
];

// "How to attend" sheet. Editable in the admin console later (item 31).
// Sections marked CONFIRM are placeholders AFRIFF hasn't published yet.
export let HOW_TO_ATTEND: HowToSection[] = [
  {
    id: 'tickets', title: 'Tickets',
    body: 'Get a Festival Access pass. It\'s open to everyone and covers screenings from 1–7 November at all three Filmhouse cinemas. Book your seats once the programme opens. Prices and sale dates are coming soon.',
    link: { label: 'Tickets on afriff.com', url: 'https://afriff.com/tickets' },
  },
  {
    id: 'sold-out', title: 'If a screening is sold out', // CONFIRM with AFRIFF
    body: 'Check the Queues tab before you travel. Door volunteers post how many people are waiting and how many seats are left, so you can judge your chances.',
  },
  {
    id: 'refunds', title: 'Refunds',
    body: 'Refunds are possible up to 24 hours before the festival begins. There are no refunds from 1–7 November.',
  },
  {
    id: 'qa', title: 'Q&A sessions', // CONFIRM with AFRIFF
    body: 'Some screenings are followed by a Q&A with the director or cast. These are announced under News & alerts (the bell) and can change at short notice.',
  },
  {
    id: 'masterclasses', title: 'Masterclasses',
    body: 'All masterclasses and workshops are free, but you need to register to confirm your seat.',
    link: { label: 'Masterclasses on afriff.com', url: 'https://afriff.com/program/masterclasses' },
  },
  {
    id: 'industry', title: 'Industry screenings', // CONFIRM with AFRIFF
    body: 'Screenings tagged Industry are part of the AFCM film and content market (2–5 November at Twinwaters) and need a Market Badge.',
  },
];

// Partners from afriff.com/partners (20 Oct 2026). Logos are linked from
// AFRIFF's site. Host the files ourselves before launch.
// logoStyle: 'white' (default; dark artwork shown as white on navy),
// 'original' (keeps its colours; already works on dark), 'knockout'
// (a picture with a white background: the white is dropped).
// Keep names stable: they become the database IDs.
const LOGO_BASE = 'https://afriff-revival.lovable.app/__l5e/assets-v1/';
export let SPONSORS: Sponsor[] = [
  { name: 'MTN', logo: `${LOGO_BASE}2ff9abc3-f2d4-4ce5-b405-2e79443f0e78/mtn.png`, logoStyle: 'original' },
  { name: 'Filmhouse Group', logo: `${LOGO_BASE}f20b24e7-e2ab-4e76-a61e-f013c21d4f58/filmhouse-group.png` },
  { name: 'Martell', logo: `${LOGO_BASE}0a69fcb3-0dd0-4d67-92c7-a99dee17c23f/martell.png` },
  { name: 'Mikano', logo: `${LOGO_BASE}ea89f8e2-1534-4c9d-927b-f1b5ff0aa118/mikano.png` },
  { name: 'Nigerian Breweries', logo: `${LOGO_BASE}f8d3c956-82f8-49e1-86eb-f18d75c9471f/nigerian-breweries.png` },
  { name: 'Afreximbank · CANEX', logo: `${LOGO_BASE}f92e7450-271c-4935-bbc2-7b204431854c/canex-wknd-afreximbank.png`, logoStyle: 'original' },
  { name: 'Dentsu', logo: `${LOGO_BASE}ba4d870b-7d4b-49fa-823c-42f7a505dca0/dentsu.png` },
  { name: 'GIZ', logo: `${LOGO_BASE}e5185120-8c4e-4b96-a5a0-0cde9e9481ef/giz.jpg`, logoStyle: 'knockout' },
  { name: 'Federal Ministry of Art, Culture, Tourism & the Creative Economy', logo: 'https://afriff.com/assets/fmactce-BfXnsMTF.png', logoStyle: 'original' },
];

// Helpers -----------------------------------------------------------------

export const filmById = (id: string | null | undefined) => FILMS.find((f) => f.id === id);
export const venueById = (id: string | null | undefined) => VENUES.find((v) => v.id === id);


// ---------- Live data (build step 3) ----------
// The lists above start as the built-in copy (from afriff.com). When the app
// receives the version an admin published from the console, replaceProgramme()
// swaps them in; every screen reads these lists, so they all update.
export const BUILT_IN = { films: FILMS, screenings: SCREENINGS, venues: VENUES, news: NEWS, sponsors: SPONSORS, howToAttend: HOW_TO_ATTEND };

const byOrder = (a: { order?: number }, b: { order?: number }) => (a.order ?? 99) - (b.order ?? 99);

export function replaceProgramme(d: PublishedSnapshot) {
  if (d.venues?.length) {
    VENUES = d.venues
      .filter((v) => v.id && v.name)
      .map((v) => ({ ...v, id: v.id!, name: v.name!, address: v.address || '', color: v.color || '#DBA440' }));
  }
  if (d.films?.length) {
    FILMS = d.films.filter((f) => f.id && f.title).map((f): Film => ({
      ...f,
      id: f.id!, title: f.title!, country: f.country || '', language: f.language || '', genre: f.genre || '',
      year: f.year ?? null, runtime: Number(f.runtime) || 0, image: f.image || '', trailer: f.trailer || '',
      synopsis: f.synopsis || '', director: f.director || '', section: f.section || '',
      // films added in the console get placeholder poster colours like the rest
      poster: f.poster?.style ? f.poster : posterArt(f.id!),
    }));
  }
  const filmIds = new Set(FILMS.map((f) => f.id));
  const venueIds = new Set(VENUES.map((v) => v.id));
  // a screening whose film or venue was deleted is left out rather than breaking the page
  if (d.screenings) {
    SCREENINGS = d.screenings
      .filter((s) => s.id && s.film && s.venue && filmIds.has(s.film) && venueIds.has(s.venue) && s.date && s.time)
      .map((s): Screening => ({
        ...s, id: s.id!, film: s.film!, venue: s.venue!, date: s.date!, time: s.time!,
        capacity: Number(s.capacity) || 0, tag: s.tag || 'Public', screen: s.screen || '',
      }));
  }
  if (d.news) NEWS = [...d.news].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  if (d.sponsors) SPONSORS = [...d.sponsors].sort(byOrder);
  if (d.howToAttend) HOW_TO_ATTEND = [...d.howToAttend].sort(byOrder);
}
