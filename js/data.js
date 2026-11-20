/* CHI 2027 prototype — sample content.
   Conference facts (dates, city, venue, theme, programs) follow chi2027.acm.org / chi2026.acm.org.
   Sessions, people and rooms are illustrative placeholders. */
(function () {
  const BRAND = { g: '#00FF00', r: '#FF0000', b: '#0000FF' };

  // mix = [communities, new methods, human behaviors] — from the brand colour study.
  const CATS = [
    { id: 'ai',       name: 'AI + Human Interaction',            mix: [5, 65, 30] },
    { id: 'access',   name: 'Accessibility',                     mix: [30, 15, 55] },
    { id: 'health',   name: 'Health + Wellbeing',                mix: [20, 5, 75] },
    { id: 'edu',      name: 'Education',                         mix: [55, 20, 25] },
    { id: 'social',   name: 'Social Computing',                  mix: [75, 5, 20] },
    { id: 'design',   name: 'Design + Experience',               mix: [20, 45, 35] },
    { id: 'physical', name: 'Physical Interaction',              mix: [15, 75, 10] },
    { id: 'spatial',  name: 'Spatial Interaction',               mix: [40, 50, 10] },
    { id: 'dataviz',  name: 'Data Visualization',                mix: [5, 40, 55] },
    { id: 'playful',  name: 'Playful Interaction',               mix: [40, 20, 40] },
    { id: 'privacy',  name: 'Privacy + Security',                mix: [5, 25, 70] },
    { id: 'society',  name: 'Society, Ethics & Sustainability',  mix: [50, 0, 50] },
  ];
  CATS.forEach(c => { c.color = window.CHI_ICONS[c.id].fill; });
  const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

  const PILLARS = [
    { id: 'g', name: 'Communities',     color: BRAND.g, line: 'How people gather, organise and belong.' },
    { id: 'r', name: 'New methods',     color: BRAND.r, line: 'New tools, techniques and ways of making.' },
    { id: 'b', name: 'Human behaviors', color: BRAND.b, line: 'Why people do what they do with technology.' },
  ];

  const DAYS = [
    { dow: 'Mon', d: 10 }, { dow: 'Tue', d: 11 }, { dow: 'Wed', d: 12 }, { dow: 'Thu', d: 13 }, { dow: 'Fri', d: 14 },
  ];

  const TYPES = {
    keynote: 'Keynote', papers: 'Papers', posters: 'Posters', demos: 'Interactive Demos', panel: 'Panel',
    workshop: 'Workshop', meetup: 'Meet-up', src: 'Student Research Competition', journals: 'Journals', social: 'Social',
  };

  const PROGRAMS = [
    { type: 'keynote',  name: 'Keynotes',                     line: 'Opening and closing plenaries that frame the week.' },
    { type: 'papers',   name: 'Papers',                       line: 'Long and short archival research, from design to systems.' },
    { type: 'posters',  name: 'Posters',                      line: 'Late-breaking work and shorter presentations of new ideas and findings.' },
    { type: 'demos',    name: 'Interactive Demos',            line: 'Research and technology in action — hands-on, creative and fun.' },
    { type: 'panel',    name: 'Panels',                       line: 'Expert-led debate with audience questions, endorsements and rebuttals.' },
    { type: 'workshop', name: 'Workshops',                    line: 'Focused sessions on an established or emerging research theme.' },
    { type: 'meetup',   name: 'Meet-ups',                     line: 'Birds-of-a-feather and meet-and-greets that grow community.' },
    { type: 'src',      name: 'Student Research Competition', line: 'Students present original research to a panel of judges.' },
    { type: 'journals', name: 'Journals',                     line: 'Recently published journal articles, presented live.' },
  ];

  // Venue — floors and rooms are a simplified, illustrative model of the convention center.
  // Room rects are in floor units: x,y,w,h on a 100 × 64 plate.
  const FLOORS = [
    { id: 'L1', name: 'Level 1', label: 'Street level', rooms: [
      { id: 'lobby', code: 'REG', name: 'Lobby & Registration', x: 6, y: 34, w: 40, h: 24 },
      { id: 'info',  code: 'INFO', name: 'Info Desk & Coat Check', x: 52, y: 40, w: 20, h: 18 },
      { id: 'cafe',  code: 'CAFÉ', name: 'Riverside Café', x: 6, y: 6, w: 28, h: 20 },
    ] },
    { id: 'L2', name: 'Level 2', label: 'Exhibit level', rooms: [
      { id: 'hallA', code: 'A', name: 'Hall A · Posters', x: 5, y: 6, w: 28, h: 52 },
      { id: 'hallB', code: 'B', name: 'Hall B · Interactive Demos', x: 36, y: 6, w: 28, h: 52 },
      { id: 'hallC', code: 'C', name: 'Hall C · Exhibits & Job Fair', x: 67, y: 6, w: 28, h: 52 },
    ] },
    { id: 'L3', name: 'Level 3', label: 'Ballroom level', rooms: [
      { id: 'ballroom', code: 'BALLROOM', name: 'Spirit of Pittsburgh Ballroom', x: 5, y: 6, w: 46, h: 30 },
      { id: 'r301', code: '301', name: 'Room 301', x: 55, y: 6, w: 18, h: 14 },
      { id: 'r302', code: '302', name: 'Room 302', x: 76, y: 6, w: 19, h: 14 },
      { id: 'r303', code: '303', name: 'Room 303', x: 55, y: 23, w: 18, h: 14 },
      { id: 'r304', code: '304', name: 'Room 304', x: 76, y: 23, w: 19, h: 14 },
      { id: 'r305', code: '305', name: 'Room 305', x: 5, y: 42, w: 28, h: 16 },
      { id: 'r306', code: '306', name: 'Room 306', x: 36, y: 42, w: 28, h: 16 },
    ] },
    { id: 'L4', name: 'Level 4', label: 'Terrace level', rooms: [
      { id: 'r401', code: '401', name: 'Room 401', x: 5, y: 6, w: 20, h: 16 },
      { id: 'r402', code: '402', name: 'Room 402', x: 28, y: 6, w: 20, h: 16 },
      { id: 'r403', code: '403', name: 'Room 403', x: 5, y: 26, w: 20, h: 16 },
      { id: 'r404', code: '404', name: 'Room 404', x: 28, y: 26, w: 20, h: 16 },
      { id: 'terrace', code: 'TERRACE', name: 'Rooftop Terrace', x: 54, y: 6, w: 41, h: 52 },
    ] },
  ];
  const ROOM = {};
  FLOORS.forEach((f, i) => f.rooms.forEach(r => { r.floor = f.id; r.floorIndex = i; ROOM[r.id] = r; }));

  // [id, day, start, end, type, cat, room, title, blurb, people, openToVisitors]
  const E = [
    ['e01', 0, '08:30', '10:00', 'keynote', 'design', 'ballroom', 'Opening Plenary & Keynote: Bridges We Haven’t Built Yet', 'The chairs open CHI 2027, followed by a keynote on what it takes to connect research, practice and the public.', 'General Chairs · Keynote speaker TBA', 1],
    ['e02', 0, '11:15', '12:45', 'papers', 'ai', 'r301', 'Conversational Agents & Trust', 'Six papers on how people calibrate trust in assistants that talk back.', 'Chair: N. Okafor', 0],
    ['e03', 0, '11:15', '12:45', 'papers', 'access', 'r302', 'Accessible Navigation', 'Wayfinding, transit and maps designed with blind and low-vision travellers.', 'Chair: L. Haddad', 0],
    ['e04', 0, '11:15', '12:45', 'papers', 'health', 'r303', 'Wellbeing at Work', 'Breaks, boundaries and burnout: technology in the working day.', 'Chair: S. Lindqvist', 0],
    ['e05', 0, '14:15', '15:45', 'workshop', 'social', 'r401', 'Designing With Communities, Not For Them', 'A hands-on session on participatory methods that share power as well as sticky notes.', 'Organisers: M. Tavares, J. Oyelaran', 0],
    ['e06', 0, '14:15', '15:45', 'papers', 'dataviz', 'r304', 'Visualization for the Public', 'Charts in newsrooms, museums and city halls — and how people really read them.', 'Chair: H. Brandt', 0],
    ['e07', 0, '16:30', '18:00', 'panel', 'privacy', 'ballroom', 'Who Owns the Interaction? AI, Agency & Consent', 'Researchers, designers and policy folk argue it out. Bring questions and rebuttals.', 'Moderator: R. Castellanos', 1],
    ['e08', 0, '18:00', '20:00', 'demos', 'playful', 'hallB', 'Reception: Demos, Exhibits, Food & Drinks', 'Try this year’s interactive demos with a drink in hand. Everything is meant to be touched.', '60+ demo teams', 1],

    ['e09', 1, '09:00', '10:30', 'papers', 'edu', 'r301', 'Learning With AI Tutors', 'What helps, what hinders and what students do when nobody is looking.', 'Chair: P. Ramanathan', 0],
    ['e10', 1, '09:00', '10:30', 'papers', 'physical', 'r304', 'Hands, Skin & Haptics', 'New actuators and the sensations they make possible.', 'Chair: K. Ishida', 0],
    ['e11', 1, '11:15', '12:45', 'papers', 'physical', 'r304', 'Wearables & E-Textiles', 'Knitted, woven and stitched interfaces that live on the body.', 'Chair: D. Achterberg', 0],
    ['e12', 1, '11:15', '12:45', 'papers', 'social', 'r302', 'Moderation & Online Communities', 'Volunteer moderators, community norms and the tools between them.', 'Chair: A. Mbeki', 0],
    ['e13', 1, '11:15', '12:45', 'papers', 'privacy', 'r303', 'Usable Privacy', 'Consent flows, permission prompts and the gap between policy and practice.', 'Chair: E. Novak', 0],
    ['e14', 1, '14:15', '15:45', 'posters', 'design', 'hallA', 'Posters: Session A', 'Late-breaking work across design, health and accessibility. Authors at their boards.', '120 posters', 1],
    ['e15', 1, '14:15', '15:45', 'workshop', 'spatial', 'r402', 'Prototyping Mixed Reality on a Budget', 'Cardboard, phones and open tools: get a spatial idea standing in ninety minutes.', 'Organisers: T. Nakamura, B. Ferreira', 0],
    ['e16', 1, '16:30', '18:00', 'papers', 'playful', 'r305', 'Games for Change', 'Play as a method for civic, health and climate questions.', 'Chair: I. Sørensen', 0],
    ['e17', 1, '18:30', '20:00', 'meetup', 'social', 'terrace', 'First-Timers at CHI', 'New here? Meet other first-timers and a few veterans who remember how it felt.', 'Hosted by the Student Mentoring Program', 1],

    ['e18', 2, '09:00', '10:30', 'papers', 'ai', 'r301', 'Human–AI Co-Creation', 'Writing, drawing and composing with generative systems.', 'Chair: C. Dlamini', 0],
    ['e19', 2, '09:00', '10:30', 'papers', 'access', 'r302', 'Aging & Assistive Technology', 'Designing with older adults for independence, not surveillance.', 'Chair: F. Morales', 0],
    ['e20', 2, '11:15', '12:45', 'papers', 'spatial', 'r305', 'Spatial Interfaces & XR', 'Input, locomotion and comfort in headsets and rooms.', 'Chair: V. Petrov', 0],
    ['e21', 2, '11:15', '12:45', 'papers', 'health', 'r303', 'Digital Mental Health', 'Peer support, self-tracking and the limits of an app.', 'Chair: G. Adeyemi', 0],
    ['e22', 2, '12:45', '14:15', 'social', 'design', 'hallC', 'Job Fair', 'Labs, studios and companies hiring across HCI. Bring a portfolio link.', '40+ organisations', 1],
    ['e23', 2, '14:15', '15:45', 'src', 'edu', 'r306', 'Student Research Competition: Finals', 'Finalists present to the judges. Quick talks, sharp questions.', 'Undergraduate and graduate finalists', 1],
    ['e24', 2, '14:15', '15:45', 'panel', 'society', 'ballroom', 'Sustainable HCI: Beyond the Carbon Footprint', 'What responsible computing asks of researchers, conferences and products.', 'Moderator: O. Lindgren', 1],
    ['e25', 2, '16:30', '18:00', 'posters', 'ai', 'hallA', 'Posters: Session B', 'Late-breaking work across AI, visualization and social computing.', '120 posters', 1],
    ['e26', 2, '18:30', '20:00', 'meetup', 'physical', 'r403', 'Craft, Textiles & Making', 'Bring something you made. Swap techniques, materials and failures.', 'Community-run', 1],

    ['e27', 3, '09:00', '10:30', 'papers', 'design', 'r301', 'Design Methods & Speculation', 'Futures, fictions and the methods that make them useful.', 'Chair: W. Achebe', 0],
    ['e28', 3, '09:00', '10:30', 'papers', 'dataviz', 'r304', 'Data Physicalization', 'Data you can hold, wear and walk through.', 'Chair: Y. Tanaka', 0],
    ['e29', 3, '11:15', '12:45', 'papers', 'society', 'r302', 'Civic Tech & Policy', 'Public services, participation and the politics of interfaces.', 'Chair: Z. Rahman', 0],
    ['e30', 3, '11:15', '12:45', 'journals', 'design', 'r306', 'Journals: Recent Articles, Live', 'Authors of recently published journal articles present and take questions.', '6 articles', 0],
    ['e31', 3, '14:15', '15:45', 'workshop', 'playful', 'r401', 'Playful Research Methods', 'Card decks, improv and toys as serious instruments.', 'Organisers: Q. Lemaire, U. Baptiste', 0],
    ['e32', 3, '14:15', '15:45', 'papers', 'privacy', 'r303', 'Security Behaviors in the Wild', 'Passwords, scams and the workarounds people actually use.', 'Chair: X. Volkov', 0],
    ['e40', 3, '14:15', '15:45', 'papers', 'dataviz', 'r304', 'Visualization Literacy', 'How people learn to read, question and make charts.', 'Chair: A. Lindholm', 0],
    ['e33', 3, '16:30', '18:00', 'meetup', 'access', 'r404', 'Accessibility Community Mixer', 'Open to everyone working on or curious about access. Quiet room next door.', 'Community-run', 1],
    ['e34', 3, '19:00', '22:00', 'social', 'playful', 'terrace', 'Conference Night on the Riverfront', 'Music, food and a view of the bridges at dusk.', 'All badges welcome', 1],

    ['e35', 4, '09:00', '10:30', 'papers', 'edu', 'r301', 'Classrooms of the Future', 'Teachers, tablets and the things that survive a real school day.', 'Chair: J. Mwangi', 0],
    ['e36', 4, '09:00', '10:30', 'papers', 'playful', 'r305', 'Embodied Play', 'Moving bodies, shared spaces and games without screens.', 'Chair: R. Halloran', 0],
    ['e37', 4, '11:15', '12:45', 'papers', 'health', 'r303', 'Health Tracking & Self-Care', 'Living with data about your own body.', 'Chair: M. Eze', 0],
    ['e38', 4, '11:15', '12:45', 'papers', 'spatial', 'r302', 'AR for Collaboration', 'Shared views, remote hands and co-located teams.', 'Chair: S. Kowalczyk', 0],
    ['e39', 4, '13:15', '15:00', 'keynote', 'society', 'ballroom', 'Keynote & Closing Plenary', 'A closing keynote, awards and the hand-over to CHI 2028.', 'Keynote speaker TBA', 1],
  ];
  const EVENTS = E.map(([id, day, start, end, type, cat, room, title, blurb, people, open]) =>
    ({ id, day, start, end, type, cat, room, title, blurb, people, open: !!open }));
  const EVENT = Object.fromEntries(EVENTS.map(e => [e.id, e]));

  // Invited presenters — an email match fills "My Presentations" and the schedule.
  const PRESENTERS = {
    'alex.rivera@example.org': {
      name: 'Alex Rivera',
      presentations: [
        { id: 'p1', kind: 'Paper', event: 'e11', slot: '11:39 – 11:52',
          title: 'Soft Signals: Knitted Haptic Sleeves for Remote Co-Presence',
          needs: ['10-minute talk + 3 minutes of Q&A', 'Upload slides (16:9, PDF or PPTX) by May 3', 'Meet your session chair in the room 15 minutes early', 'Caption any video and describe key figures aloud'] },
        { id: 'p2', kind: 'Demo', event: 'e08', slot: '18:00 – 20:00 · Booth D-14',
          title: 'Soft Signals — try the sleeve',
          needs: ['Set-up window: Monday 14:00 – 17:00, Hall B', 'One table (180 × 75 cm) and two power outlets provided', 'Keep the booth staffed for the whole reception', 'Tear-down by Tuesday 10:00'] },
      ],
    },
    'sam.okonkwo@example.org': {
      name: 'Sam Okonkwo',
      presentations: [
        { id: 'p3', kind: 'Poster', event: 'e25', slot: '16:30 – 18:00 · Board B-072',
          title: 'Reading the Room: How Students Describe AI Feedback to Each Other',
          needs: ['A0 portrait, printed — pins are provided', 'Mount between 08:00 and 10:00 on Wednesday', 'Stand at your board for the full session', 'Remove your poster by 19:00'] },
      ],
    },
  };

  const ROLES = [
    { id: 'researcher',   name: 'I do research',            tag: 'Researcher' },
    { id: 'student',      name: 'I’m a student',            tag: 'Student' },
    { id: 'practitioner', name: 'I design or build products', tag: 'Practitioner' },
    { id: 'educator',     name: 'I teach',                  tag: 'Educator' },
    { id: 'curious',      name: 'I’m here out of curiosity', tag: 'Explorer' },
  ];

  // Topic chips → [primary domain, secondary domain]
  const TOPICS = [
    ['Generative AI', 'ai', 'design'], ['Chatbots & agents', 'ai', 'social'], ['Wearables', 'physical', 'health'],
    ['Haptics', 'physical', 'spatial'], ['Textiles & craft', 'physical', 'design'], ['AR / VR', 'spatial', 'playful'],
    ['3D printing', 'spatial', 'physical'], ['Maps & graphs', 'dataviz', 'spatial'], ['Dashboards', 'dataviz', 'design'],
    ['Games & play', 'playful', 'edu'], ['Mental health', 'health', 'society'], ['Assistive tech', 'access', 'health'],
    ['Classrooms', 'edu', 'social'], ['Online communities', 'social', 'society'], ['Collaboration', 'social', 'design'],
    ['Data privacy', 'privacy', 'society'], ['Scams & security', 'privacy', 'ai'], ['Ethics & policy', 'society', 'privacy'],
    ['Climate', 'society', 'dataviz'], ['Speculative design', 'design', 'society'], ['Everyday experience', 'design', 'health'],
    ['Aging', 'access', 'health'],
  ].map(([name, a, b]) => ({ name, a, b }));

  // Crowd map — clusters in map units (see map.js), people are generated around them.
  const CLUSTERS = [
    { cat: 'access',   n: 8,  x: 285, y: 500 },
    { cat: 'edu',      n: 6,  x: 650, y: 400 },
    { cat: 'ai',       n: 13, x: 560, y: 640 },
    { cat: 'privacy',  n: 6,  x: 740, y: 860 },
    { cat: 'health',   n: 11, x: 290, y: 870 },
    { cat: 'design',   n: 9,  x: 700, y: 1110 },
    { cat: 'physical', n: 5,  x: 270, y: 1160 },
    { cat: 'social',   n: 7,  x: 500, y: 1270 },
  ];
  const FIRST = ['Ines', 'Tomás', 'Aiko', 'Farah', 'Jonas', 'Priya', 'Kwame', 'Lena', 'Mateo', 'Noor', 'Oskar', 'Wei', 'Zara', 'Emeka', 'Hana', 'Rafael', 'Sofia', 'Yusuf', 'Mira', 'Dao'];
  const LAST = ['A.', 'B.', 'C.', 'D.', 'F.', 'G.', 'H.', 'K.', 'L.', 'M.', 'N.', 'O.', 'P.', 'R.', 'S.', 'T.', 'V.', 'W.'];
  const LOOKING = ['Looking for collaborators', 'Happy to chat over coffee', 'First CHI — say hi', 'Hiring this year', 'Presenting on Wednesday', 'Here for the demos'];

  window.CHI = {
    BRAND, CATS, CAT, PILLARS, DAYS, TYPES, PROGRAMS, FLOORS, ROOM, EVENTS, EVENT, PRESENTERS, ROLES, TOPICS,
    CLUSTERS, FIRST, LAST, LOOKING,
    INFO: {
      dates: 'May 10–14, 2027', city: 'Pittsburgh, PA', venue: 'David L. Lawrence Convention Center',
      address: '1000 Fort Duquesne Blvd, Pittsburgh, PA 15222', start: '2027-05-10T08:30:00-04:00',
    },
  };
})();
