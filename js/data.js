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
    papers: 'Paper Talk', keynote: 'Keynote', panel: 'Panel', workshop: 'Workshop', posters: 'Posters',
    demos: 'Interactive Demos', meetup: 'Meet-up', social: 'Reception / Networking', mentoring: 'Student Mentoring',
  };

  // Verified activity types. All are open to attendees and visitors; Student Mentoring needs a separate application.
  // `short` is the one-line version used on the About page.
  const PROGRAMS = [
    { type: 'papers',    name: 'Paper Talks',              short: 'Authors present peer-reviewed research, then take questions.', line: 'Authors present peer-reviewed papers in themed sessions, with time for questions.' },
    { type: 'keynote',   name: 'Keynotes',                 short: 'Plenary talks that open and close the week.', line: 'Opening and closing plenaries that frame the week.' },
    { type: 'panel',     name: 'Panels',                   short: 'Experts debate a question, and the audience joins in.', line: 'Expert-led debate with audience questions, endorsements and rebuttals.' },
    { type: 'workshop',  name: 'Workshops',                short: 'Small, hands-on sessions on a focused theme.', line: 'Focused, hands-on sessions on an established or emerging research theme.' },
    { type: 'posters',   name: 'Posters',                  short: 'New work on boards, with the authors beside them.', line: 'Late-breaking work and shorter presentations of new ideas and findings.' },
    { type: 'demos',     name: 'Interactive Demos',        short: 'Research you can try with your own hands.', line: 'Research and technology in action — hands-on, creative and fun.' },
    { type: 'meetup',    name: 'Meet-ups',                 short: 'Informal gatherings around a shared interest.', line: 'Birds-of-a-feather and meet-and-greets that grow community.' },
    { type: 'social',    name: 'Receptions / Networking',  short: 'Receptions, the job fair and evening socials.', line: 'Receptions, the job fair and evening socials for meeting people across HCI.' },
    { type: 'mentoring', name: 'Student Mentoring',        short: 'Small-group mentoring for students. Apply separately.', line: 'Small-group mentoring for students with experienced researchers. Separate application required.', apply: true },
  ];

  // Venue — floors and rooms are a simplified, illustrative model of the convention center.
  // The David L. Lawrence Convention Center, drawn approximately from its published level guide:
  // L1 lobbies and Halls D–E, L2 the river-side concourse and Halls A–C, L3 the ballroom and meeting rooms 301–338,
  // L4 meeting rooms 401–415 and the north terrace. Plans are in floor units on a 120 × 50 plate,
  // with the Allegheny River along the top (north), Penn Ave along the bottom and 10th St on the left (west).
  // `plate` is each level's outline; `spaces` are areas drawn on the map but never booked for events
  // (kind: concourse by default, 'core' stairs and escalators, 'room' other meeting rooms, 'outdoor', 'hall').
  // `cap` is an approximate capacity (theatre-style seats, or people standing where capKind says so),
  // estimated from the venue's published figures: 20,574 seated across Halls A–C, about 3,800 in the full ballroom.
  // Any room or space may give `pts` (its outline, when it isn't a rectangle; x,y,w,h then just bound it)
  // and `tall` (wall height relative to a meeting room: the exhibit halls rise far above everything else).
  const arc = (cx, cy, rx, ry, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180;
    return [+(cx + Math.cos(a) * rx).toFixed(2), +(cy + Math.sin(a) * ry).toFixed(2)];
  });
  const FLOORS = [
    { id: 'L1', name: 'Level 1', label: 'Street level', plate: { x: 0, y: 0, w: 120, h: 50 },
      rooms: [
        // the lobbies are double-height, with the street corners cut at an angle
        { id: 'lobby', code: 'WEST LOBBY', name: 'West Lobby & Registration', x: 2, y: 16, w: 22, h: 32, tall: 1.7,
          pts: [[2, 16], [24, 16], [24, 48], [10, 48], [2, 40]] },
        { id: 'info',  code: 'EAST LOBBY', name: 'East Lobby & Info Desk', x: 96, y: 16, w: 22, h: 32, tall: 1.7,
          pts: [[96, 16], [110, 16], [118, 24], [118, 48], [96, 48]] },
        // the café bows out towards the river
        { id: 'cafe',  cap: 120, code: 'CAFÉ', name: 'Tasteburgh Café', x: 2, y: 2, w: 22, h: 12, tall: 0.9,
          pts: [[2, 14], [2, 8], ...arc(13, 8, 11, 6, 180, 360), [24, 14]] },
      ],
      spaces: [
        { code: 'HALLS D–E', x: 26, y: 16, w: 68, h: 32, kind: 'hall', tall: 1.8 },
        { code: 'RIVERFRONT PLAZA', x: 26, y: 2, w: 92, h: 12, kind: 'outdoor' },
      ] },
    { id: 'L2', name: 'Level 2', label: 'Exhibit level', plate: { x: 0, y: 0, w: 120, h: 50 },
      rooms: [
        { id: 'hallA', cap: 6800, code: 'HALL A', name: 'Hall A · Posters', x: 2, y: 15, w: 37, h: 33, tall: 2.6 },
        { id: 'hallB', cap: 7000, code: 'HALL B', name: 'Hall B · Interactive Demos', x: 41, y: 15, w: 38, h: 33, tall: 2.6 },
        { id: 'hallC', cap: 6800, code: 'HALL C', name: 'Hall C · Exhibits & Job Fair', x: 81, y: 15, w: 37, h: 33, tall: 2.6 },
      ],
      spaces: [
        { code: 'CONCOURSE', x: 2, y: 2, w: 116, h: 11, pts: [[2, 13], [2, 5], [20, 2], [100, 2], [118, 5], [118, 13]] },
        { code: 'ESC', x: 26, y: 3.5, w: 5, h: 5, kind: 'core' },
        { code: 'ESC', x: 89, y: 3.5, w: 5, h: 5, kind: 'core' },
      ] },
    { id: 'L3', name: 'Level 3', label: 'Ballroom level', plate: { x: 0, y: 0, w: 120, h: 50 },
      rooms: [
        { id: 'ballroom', cap: 3800, code: 'BALLROOM', name: 'Spirit of Pittsburgh Ballroom', x: 2, y: 11, w: 38, h: 23, tall: 1.9,
          pts: [[8, 11], [40, 11], [40, 34], [2, 34], [2, 17]] },
        { id: 'r301', cap: 240, code: '301', name: 'Room 301', x: 42, y: 11, w: 12, h: 11 },
        { id: 'r302', cap: 180, code: '302', name: 'Room 302', x: 55, y: 11, w: 12, h: 11 },
        { id: 'r303', cap: 180, code: '303', name: 'Room 303', x: 68, y: 11, w: 12, h: 11 },
        { id: 'r304', cap: 240, code: '304', name: 'Room 304', x: 81, y: 11, w: 12, h: 11 },
        { id: 'r305', cap: 150, code: '305', name: 'Room 305', x: 94, y: 11, w: 12, h: 11 },
        { id: 'r306', cap: 120, code: '306', name: 'Room 306', x: 107, y: 11, w: 11, h: 11 },
      ],
      spaces: [
        { code: 'ALLEGHENY OVERLOOK', x: 2, y: 2, w: 116, h: 7, pts: [[2, 9], [2, 5], [24, 2], [96, 2], [118, 5], [118, 9]] },
        { code: 'CORRIDOR', x: 42, y: 23, w: 76, h: 3 },
        { code: '307–318', x: 42, y: 27, w: 24, h: 7, kind: 'room' },
        { code: '319–330', x: 67, y: 27, w: 25, h: 7, kind: 'room' },
        { code: '331–338', x: 93, y: 27, w: 25, h: 7, kind: 'room' },
        { code: 'SOUTH TERRACE · GREEN ROOF', x: 2, y: 37, w: 116, h: 11, kind: 'outdoor' },
      ] },
    { id: 'L4', name: 'Level 4', label: 'Upper meeting level', plate: { x: 28, y: 0, w: 92, h: 40 },
      rooms: [
        // open to the sky: only a low parapet
        { id: 'terrace', cap: 1200, capKind: 'standing', code: 'NORTH TERRACE', name: 'North Rooftop Terrace', x: 30, y: 2, w: 88, h: 11, tall: 0.25,
          pts: [[30, 13], [36, 2], [112, 2], [118, 8], [118, 13]] },
        { id: 'r401', cap: 100, code: '401', name: 'Room 401', x: 30, y: 19, w: 14, h: 19 },
        { id: 'r402', cap: 80, code: '402', name: 'Room 402', x: 45, y: 19, w: 14, h: 19 },
        { id: 'r403', cap: 80, code: '403', name: 'Room 403', x: 60, y: 19, w: 14, h: 19 },
        { id: 'r404', cap: 100, code: '404', name: 'Room 404', x: 75, y: 19, w: 14, h: 19 },
      ],
      spaces: [
        { code: 'CORRIDOR', x: 30, y: 14.5, w: 88, h: 3 },
        { code: '406', x: 90, y: 19, w: 13.5, h: 19, kind: 'room', tall: 1.4 },  // 250-seat lecture halls
        { code: '407', x: 104.5, y: 19, w: 13.5, h: 19, kind: 'room', tall: 1.4 },
      ] },
  ];
  const ROOM = {};
  FLOORS.forEach((f, i) => f.rooms.forEach(r => { r.floor = f.id; r.floorIndex = i; ROOM[r.id] = r; }));

  // [id, day, start, end, type, cat, room, title, blurb, people]
  // Every event is open to attendees and visitors; types marked apply: true in PROGRAMS need a separate application.
  const E = [
    ['e01', 0, '08:30', '10:00', 'keynote', 'design', 'ballroom', 'Opening Plenary & Keynote: Bridges We Haven’t Built Yet', 'The chairs open CHI 2027, followed by a keynote on what it takes to connect research, practice and the public.', 'General Chairs · Keynote speaker TBA'],
    ['e02', 0, '11:15', '12:45', 'papers', 'ai', 'r301', 'Conversational Agents & Trust', 'Six papers on how people calibrate trust in assistants that talk back.', 'Chair: N. Okafor'],
    ['e03', 0, '11:15', '12:45', 'papers', 'access', 'r302', 'Accessible Navigation', 'Wayfinding, transit and maps designed with blind and low-vision travellers.', 'Chair: L. Haddad'],
    ['e04', 0, '11:15', '12:45', 'papers', 'health', 'r303', 'Wellbeing at Work', 'Breaks, boundaries and burnout: technology in the working day.', 'Chair: S. Lindqvist'],
    ['e05', 0, '14:15', '15:45', 'workshop', 'social', 'r401', 'Designing With Communities, Not For Them', 'A hands-on session on participatory methods that share power as well as sticky notes.', 'Organisers: M. Tavares, J. Oyelaran'],
    ['e06', 0, '14:15', '15:45', 'papers', 'dataviz', 'r304', 'Visualization for the Public', 'Charts in newsrooms, museums and city halls — and how people really read them.', 'Chair: H. Brandt'],
    ['e07', 0, '16:30', '18:00', 'panel', 'privacy', 'ballroom', 'Who Owns the Interaction? AI, Agency & Consent', 'Researchers, designers and policy folk argue it out. Bring questions and rebuttals.', 'Moderator: R. Castellanos'],
    ['e08', 0, '18:00', '20:00', 'demos', 'playful', 'hallB', 'Reception: Demos, Exhibits, Food & Drinks', 'Try this year’s interactive demos with a drink in hand. Everything is meant to be touched.', '60+ demo teams'],

    ['e09', 1, '09:00', '10:30', 'papers', 'edu', 'r301', 'Learning With AI Tutors', 'What helps, what hinders and what students do when nobody is looking.', 'Chair: P. Ramanathan'],
    ['e10', 1, '09:00', '10:30', 'papers', 'physical', 'r304', 'Hands, Skin & Haptics', 'New actuators and the sensations they make possible.', 'Chair: K. Ishida'],
    ['e11', 1, '11:15', '12:45', 'papers', 'physical', 'r304', 'Wearables & E-Textiles', 'Knitted, woven and stitched interfaces that live on the body.', 'Chair: D. Achterberg'],
    ['e12', 1, '11:15', '12:45', 'papers', 'social', 'r302', 'Moderation & Online Communities', 'Volunteer moderators, community norms and the tools between them.', 'Chair: A. Mbeki'],
    ['e13', 1, '11:15', '12:45', 'papers', 'privacy', 'r303', 'Usable Privacy', 'Consent flows, permission prompts and the gap between policy and practice.', 'Chair: E. Novak'],
    ['e41', 1, '10:30', '13:00', 'demos', 'ai', 'hallB', 'Interactive Demos: AI in the Loop', 'Hands-on demos of AI systems built to work with people, not instead of them. Try them, break them, talk to the teams.', '35 demo teams'],
    ['e14', 1, '14:15', '15:45', 'posters', 'design', 'hallA', 'Posters: Session A', 'Late-breaking work across design, health and accessibility. Authors at their boards.', '120 posters'],
    ['e15', 1, '14:15', '15:45', 'workshop', 'spatial', 'r402', 'Prototyping Mixed Reality on a Budget', 'Cardboard, phones and open tools: get a spatial idea standing in ninety minutes.', 'Organisers: T. Nakamura, B. Ferreira'],
    ['e16', 1, '16:30', '18:00', 'papers', 'playful', 'r305', 'Games for Change', 'Play as a method for civic, health and climate questions.', 'Chair: I. Sørensen'],
    ['e17', 1, '18:30', '20:00', 'meetup', 'social', 'terrace', 'First-Timers at CHI', 'New here? Meet other first-timers and a few veterans who remember how it felt.', 'Hosted by the Student Mentoring Program'],

    ['e18', 2, '09:00', '10:30', 'papers', 'ai', 'r301', 'Human–AI Co-Creation', 'Writing, drawing and composing with generative systems.', 'Chair: C. Dlamini'],
    ['e19', 2, '09:00', '10:30', 'papers', 'access', 'r302', 'Aging & Assistive Technology', 'Designing with older adults for independence, not surveillance.', 'Chair: F. Morales'],
    ['e20', 2, '11:15', '12:45', 'papers', 'spatial', 'r305', 'Spatial Interfaces & XR', 'Input, locomotion and comfort in headsets and rooms.', 'Chair: V. Petrov'],
    ['e21', 2, '11:15', '12:45', 'papers', 'health', 'r303', 'Digital Mental Health', 'Peer support, self-tracking and the limits of an app.', 'Chair: G. Adeyemi'],
    ['e22', 2, '12:45', '14:15', 'social', 'design', 'hallC', 'Job Fair', 'Labs, studios and companies hiring across HCI. Bring a portfolio link.', '40+ organisations'],
    ['e23', 2, '14:15', '15:45', 'mentoring', 'edu', 'r306', 'Student Mentoring: Small-Group Sessions', 'Students meet experienced researchers in small groups to talk research, careers and making the most of CHI.', 'Student Mentoring Program'],
    ['e24', 2, '14:15', '15:45', 'panel', 'society', 'ballroom', 'Sustainable HCI: Beyond the Carbon Footprint', 'What responsible computing asks of researchers, conferences and products.', 'Moderator: O. Lindgren'],
    ['e25', 2, '16:30', '18:00', 'posters', 'ai', 'hallA', 'Posters: Session B', 'Late-breaking work across AI, visualization and social computing.', '120 posters'],
    ['e26', 2, '18:30', '20:00', 'meetup', 'physical', 'r403', 'Craft, Textiles & Making', 'Bring something you made. Swap techniques, materials and failures.', 'Community-run'],

    ['e27', 3, '09:00', '10:30', 'papers', 'design', 'r301', 'Design Methods & Speculation', 'Futures, fictions and the methods that make them useful.', 'Chair: W. Achebe'],
    ['e28', 3, '09:00', '10:30', 'papers', 'dataviz', 'r304', 'Data Physicalization', 'Data you can hold, wear and walk through.', 'Chair: Y. Tanaka'],
    ['e29', 3, '11:15', '12:45', 'papers', 'society', 'r302', 'Civic Tech & Policy', 'Public services, participation and the politics of interfaces.', 'Chair: Z. Rahman'],
    ['e30', 3, '11:15', '12:45', 'papers', 'design', 'r306', 'Design Research in Practice', 'How design research travels from the studio to the people it is for.', 'Chair: T. Okonjo'],
    ['e31', 3, '14:15', '15:45', 'workshop', 'playful', 'r401', 'Playful Research Methods', 'Card decks, improv and toys as serious instruments.', 'Organisers: Q. Lemaire, U. Baptiste'],
    ['e32', 3, '14:15', '15:45', 'papers', 'privacy', 'r303', 'Security Behaviors in the Wild', 'Passwords, scams and the workarounds people actually use.', 'Chair: X. Volkov'],
    ['e40', 3, '14:15', '15:45', 'papers', 'dataviz', 'r304', 'Visualization Literacy', 'How people learn to read, question and make charts.', 'Chair: A. Lindholm'],
    ['e33', 3, '16:30', '18:00', 'meetup', 'access', 'r404', 'Accessibility Community Mixer', 'Open to everyone working on or curious about access. Quiet room next door.', 'Community-run'],
    ['e34', 3, '19:00', '22:00', 'social', 'playful', 'terrace', 'Conference Night on the Riverfront', 'Music, food and a view of the bridges at dusk.', 'All badges welcome'],

    ['e35', 4, '09:00', '10:30', 'papers', 'edu', 'r301', 'Classrooms of the Future', 'Teachers, tablets and the things that survive a real school day.', 'Chair: J. Mwangi'],
    ['e36', 4, '09:00', '10:30', 'papers', 'playful', 'r305', 'Embodied Play', 'Moving bodies, shared spaces and games without screens.', 'Chair: R. Halloran'],
    ['e37', 4, '11:15', '12:45', 'papers', 'health', 'r303', 'Health Tracking & Self-Care', 'Living with data about your own body.', 'Chair: M. Eze'],
    ['e38', 4, '11:15', '12:45', 'papers', 'spatial', 'r302', 'AR for Collaboration', 'Shared views, remote hands and co-located teams.', 'Chair: S. Kowalczyk'],
    ['e39', 4, '13:15', '15:00', 'keynote', 'society', 'ballroom', 'Keynote & Closing Plenary', 'A closing keynote, awards and the hand-over to CHI 2028.', 'Keynote speaker TBA'],
  ];
  const APPLY = new Set(PROGRAMS.filter(p => p.apply).map(p => p.type));
  const EVENTS = E.map(([id, day, start, end, type, cat, room, title, blurb, people]) =>
    ({ id, day, start, end, type, cat, room, title, blurb, people, apply: APPLY.has(type) }));
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
