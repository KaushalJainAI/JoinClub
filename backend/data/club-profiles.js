// Hand-written "sell the club" content, keyed by the slug in pec-clubs.json.
//
// Everything here is drawn from the club's own page on pec.ac.in (events, wings,
// what members do), rewritten to be scannable. The seed merges it over the scraped
// data; club admins can edit all of it later from their dashboard.
//
// `commitment` is an estimate for the demo data. Clubs should correct it.

export const CATEGORY_DEFAULTS = {
  technical: { color: "#2563eb", icon: "Cpu", commitment: "4–6 hrs / week" },
  cultural: { color: "#db2777", icon: "Palette", commitment: "3–5 hrs / week" },
  literary: { color: "#7c3aed", icon: "BookOpen", commitment: "2–4 hrs / week" },
  social: { color: "#059669", icon: "HeartHandshake", commitment: "2–4 hrs / week" },
  sports: { color: "#ea580c", icon: "Trophy", commitment: "5–8 hrs / week" },
};

export const PROFILES = {
  asce: {
    name: "American Society of Civil Engineers (ASCE)",
    shortName: "ASCE",
    tagline: "Build concrete canoes. Literally.",
    pitch:
      "The first society at PEC dedicated entirely to Civil Engineering. You take the theory from class and test it in competitions, from straw towers to a canoe made of concrete.",
    foundedYear: 2014,
    whyJoin: [
      { title: "Build things that get tested", text: "Build A Burj, Inverto and the Concrete Canoe put your designs under real load, not just on paper." },
      { title: "Run a whole techfest", text: "Reconnaissance, ASCE's annual Civil techfest, is planned and run by members like you." },
      { title: "Placement-ready early", text: "Career Carnival runs aptitude tests, group discussions and mock interviews before placements do." },
      { title: "Meet the industry", text: "Guest speakers from across the profession share advice and open doors." },
    ],
    activities: ["Structural design competitions", "Technical paper writing (Innovate)", "Guest lectures", "School outreach through Quriosity", "General body meets"],
    signatureEvents: [
      { name: "Reconnaissance", text: "ASCE's annual Civil Engineering techfest, packed with hands-on competitions." },
      { name: "Concrete Canoe", text: "Cast a canoe from concrete, then race-test it for stability, strength and design." },
      { name: "Build A Burj", text: "On-the-spot team challenge: the tallest resilient tower from straws and tape." },
      { name: "Career Carnival", text: "Aptitude test, group discussion and interviews to rehearse placement season." },
    ],
    skills: ["Structural design", "Mix design", "Technical writing", "Teamwork", "Event management", "Interview prep"],
    lookingFor: "Civil engineers first, but anyone curious about how structures stand up is welcome.",
  },

  iim: {
    name: "Indian Institute of Metals (IIM)",
    shortName: "IIM",
    tagline: "Where metallurgy meets the industry.",
    pitch:
      "The PEC chapter of one of the world's premier metallurgical bodies, and the Chandigarh chapter too. Expert lectures, national quizzes and a network that follows you into your career.",
    whyJoin: [
      { title: "A standout line on your CV", text: "Professional-body membership shows recruiters you're serious about the field." },
      { title: "Learn from industry experts", text: "Expert lecture series and workshops connect classroom theory to how metals are actually made." },
      { title: "Compete nationally", text: "Regional rounds for the national quiz held on National Metallurgist Day." },
      { title: "Soft skills, built in", text: "Leadership, presentation and public speaking come from running the chapter's events." },
    ],
    activities: ["Expert lectures", "Workshops and seminars", "Metallographic contests", "Chapter meets with industry members"],
    signatureEvents: [
      { name: "Metallographic Contest", text: "Submit microstructures (optical, SEM, TEM) and what you can read from them." },
      { name: "Picture Tale", text: "Guess the metallurgy phenomenon or historic event from a set of images." },
      { name: "Tech Pictionary", text: "Draw science and technology answers for your team to guess." },
      { name: "National Metallurgist Day Quiz", text: "Regional preliminaries for IIM's national quiz." },
    ],
    skills: ["Materials science", "Microscopy", "Public speaking", "Networking", "Event management"],
    lookingFor: "Metallurgy and materials students, plus anyone who wants an industry network early.",
  },

  sae: {
    name: "Society of Automotive Engineers (SAE)",
    shortName: "SAE",
    tagline: "Design it. Build it. Race it.",
    pitch:
      "Design and manufacture a Formula-style race car and a BAJA off-roader from the ground up, then race them against the best college teams in India.",
    whyJoin: [
      { title: "Race on a real F1 circuit", text: "SUPRA SAE India cars race at the Buddh International Circuit, where Schumacher once drove." },
      { title: "Podium pedigree", text: "PEC's BAJA team has taken 2 podium finishes in 6 competitions." },
      { title: "Learn bumper to bumper", text: "Suspensions, engines, transmissions, gears: seniors teach it all on a 'learn and teach' principle." },
      { title: "A global network", text: "SAE International membership brings technical resources and industry connections." },
    ],
    activities: ["Vehicle design and CAD", "Fabrication and manufacturing", "Testing and tuning", "National competitions", "Knowledge sessions from seniors"],
    signatureEvents: [
      { name: "SUPRA SAE India", text: "Design, build and race an F1-prototype track car against colleges nationwide." },
      { name: "BAJA SAE", text: "An off-road buggy raced on the muddy tracks of Indore." },
    ],
    skills: ["Vehicle dynamics", "CAD/CAE", "Manufacturing", "Problem solving", "Teamwork under pressure"],
    lookingFor: "Every branch, circuital or not. The one requirement is curiosity. Selection is a written test plus an interview.",
  },

  acm: {
    name: "Association for Computing Machinery (ACM)",
    shortName: "ACM",
    tagline: "Code, ship, compete, and teach each other.",
    pitch:
      "PEC's chapter of the world's largest computing society. Seven sub-wings, from competitive programming to cybersecurity, and a culture of members teaching members.",
    whyJoin: [
      { title: "Pick your wing", text: "Competitive Programming, Web Dev, Open Source, ML, Cybersecurity, Socials and Women in Tech." },
      { title: "Learn faster with peers", text: "A community of learners and leaders who teach each other beyond the syllabus." },
      { title: "Ship real projects", text: "Build and contribute to open-source and web projects with a team behind you." },
      { title: "Global brand", text: "ACM is the umbrella body for computer science, and it carries weight on a résumé." },
    ],
    activities: ["Contest practice and editorials", "Web and app dev projects", "Open-source sprints", "ML study groups", "CTFs and security sessions"],
    signatureEvents: [
      { name: "Coding contests", text: "Regular competitive programming rounds, from beginner to advanced." },
      { name: "Workshops by wing", text: "Hands-on sessions run by each sub-wing through the year." },
      { name: "Women in Tech", text: "Sessions and mentoring focused on growing women in computing." },
    ],
    skills: ["DSA", "Web development", "Machine learning", "Open source", "Cybersecurity", "Git"],
    lookingFor: "Anyone who writes code or wants to, from any branch.",
  },

  asme: {
    name: "American Society of Mechanical Engineers (ASME)",
    shortName: "ASME",
    tagline: "CAD, 3D printing, drones. Get your hands dirty.",
    pitch:
      "The PEC chapter of ASME brings hands-on workshops, from 3D printing to drone piloting, and CAD competitions with cash prizes.",
    whyJoin: [
      { title: "Workshops you won't get in class", text: "3D printing, Arduino, drone making and piloting, and live manufacturing demos." },
      { title: "Win while you learn", text: "CADathon, CADventure and Machinist carry cash prizes and certificates." },
      { title: "See the whole industry", text: "Career sessions map the paths from multinationals to local firms." },
      { title: "Beyond mechanical", text: "Collaboration across disciplines, with events run jointly with SAE." },
    ],
    activities: ["CAD modelling", "3D printing", "Arduino and electronics", "Drone building", "Manufacturing quizzes"],
    signatureEvents: [
      { name: "CADathon", text: "Design a hybrid technology around a given machine that performs a useful task." },
      { name: "CADventure", text: "Tests engineering drawing knowledge, accuracy and speed." },
      { name: "Machinist", text: "With SAE: engineering skills tested in a fun, game-style format." },
    ],
    skills: ["CAD", "3D printing", "Arduino", "Drone piloting", "GD&T", "Manufacturing"],
    lookingFor: "Mechanical, Production and anyone who likes making physical things.",
  },

  ieee: {
    name: "IEEE PEC Student Chapter",
    shortName: "IEEE",
    tagline: "The strongest technical society in the region.",
    pitch:
      "Since 2001, IEEE PEC has grown to 100+ active members covering coding, hardware and research, and it runs Techadroit, a 3-day flagship with a 24-hour hackathon.",
    foundedYear: 2001,
    whyJoin: [
      { title: "Code and hardware", text: "C++, Arduino and bot-building workshops, so you can build the software and the device." },
      { title: "A path into research", text: "Guidance and introductions to people with serious research backgrounds." },
      { title: "The world's largest tech body", text: "You're part of IEEE worldwide, not just a college chapter." },
      { title: "Fun is part of it", text: "Gaming contests sit alongside the hackathons, because fun unlocks creativity." },
    ],
    activities: ["Hackathons", "Coding contests", "Hardware projects", "Guest lectures", "Research guidance"],
    signatureEvents: [
      { name: "Techadroit", text: "3-day flagship: 24-hour hackathon, webinars, hardware showcase and more." },
      { name: "Code N Go", text: "Fast-paced programming where decision-making under time pressure wins." },
      { name: "Hardware Showcase", text: "Bring your best build, show it off, win prizes." },
    ],
    skills: ["C++", "Embedded systems", "Hackathon building", "Research", "Public speaking"],
    lookingFor: "CSE, ECE and EE students especially, but builders from every branch are welcome.",
  },

  sesi: {
    name: "Solar Energy Society of India (SESI)",
    shortName: "SESI",
    tagline: "Engineer the clean-energy future.",
    pitch:
      "The PEC branch of the Indian section of the International Solar Energy Society. You build solar bots, teach school students, and get into one of the fastest-growing fields there is.",
    whyJoin: [
      { title: "A field that's growing", text: "Renewable energy is creating jobs worldwide, and trained people are in demand." },
      { title: "Build with the sun", text: "Solar bot workshops where you make a car that runs on solar panels." },
      { title: "Teach and inspire", text: "Solar lamp workshops for school students, where you teach it and understand it better yourself." },
      { title: "National and global links", text: "Part of SESI and ISES, founded in 1954 and headquartered in Germany." },
    ],
    activities: ["Solar bot building", "School outreach", "Renewable-energy talks", "Inter-college collaboration"],
    signatureEvents: [
      { name: "Solar Bot Workshop", text: "Build a car powered by solar panels." },
      { name: "Solar Lamp Workshop", text: "Teach school students solar basics while they build their own lamps." },
    ],
    skills: ["Solar PV", "Sustainability", "Circuit building", "Teaching", "Outreach"],
    lookingFor: "Electrical, Mechanical and anyone who cares about sustainability.",
  },

  "art-and-photography-club": {
    name: "Art and Photography Club (APC)",
    shortName: "APC",
    tagline: "Creativity is intelligence having fun.",
    pitch:
      "PEC's most hands-on cultural club. APC decorates nearly every major event on campus, covers them on camera, and runs workshops with Sony and Canon professionals.",
    whyJoin: [
      { title: "Workshops with the pros", text: "Camera-handling sessions with Sony and Canon professionals, plus light-painting and smoke photography." },
      { title: "Your art everywhere", text: "APC does the décor and coverage for PECFest, Independence Day, E-Summit and more." },
      { title: "Photo walks around the city", text: "Sukhna Lake and the Capitol Complex for wildlife, architecture and portrait shots." },
      { title: "No experience needed", text: "You don't have to be an artist or photographer already. Being interested is enough." },
    ],
    activities: ["Photography workshops", "Photo walks", "Mandala, sketching and craft", "Event décor", "Photoshop, Illustrator and Premiere"],
    signatureEvents: [
      { name: "Photo Walks", text: "Year-round shoots at Sukhna Lake, the Capitol Complex and more." },
      { name: "Light Painting and Smoke Photography", text: "Experimental workshops that change how you use a camera." },
      { name: "Campus décor", text: "Transforming the auditorium for PECFest and the big institute days." },
    ],
    skills: ["Photography", "Composition", "Photoshop", "Illustrator", "Painting", "Event design"],
    lookingFor: "Anyone with an eye for beauty, whether that means cameras, brushes or pens.",
  },

  "music-club": {
    name: "Music Club",
    shortName: "Music",
    tagline: "Metal-heads, qawwali lovers and jazz musicians, all on one stage.",
    pitch:
      "One of the most prestigious and popular clubs at PEC. Perform for hundreds, learn from seniors who've been there, and win competitions outside campus.",
    whyJoin: [
      { title: "The stage is yours", text: "Perform to hundreds of cheering people at CHORDS, ENCORE, PECFEST and Friday Nights." },
      { title: "Workshops for freshers", text: "Seniors teach the ins and outs of the craft, whatever your instrument or genre." },
      { title: "All genres welcome", text: "Rap, pop, Punjabi, Bollywood, metal, jazz, qawwali: they all fit here." },
      { title: "A winning history", text: "A long record of winning competitions outside the institute." },
    ],
    activities: ["Jam sessions", "Band practice", "Institute performances", "Inter-college competitions", "Workshops"],
    signatureEvents: [
      { name: "CHORDS", text: "The freshers' debut. New members enter the club with a bang." },
      { name: "ENCORE", text: "Brings colour back to the second semester, and leaves the crowd wanting more." },
      { name: "INTERLUDE", text: "The graduating batch's farewell concert, an emotional one for everyone there." },
      { name: "Friday Nights", text: "Regular live nights across the year." },
    ],
    skills: ["Performance", "Stage presence", "Ensemble playing", "Arrangement", "Sound"],
    lookingFor: "Singers, instrumentalists and producers, from every genre and skill level.",
  },

  "dramatics-club": {
    name: "Dramatics Club",
    shortName: "Dramatics",
    tagline: "Two wings, one family: DRAMILY.",
    pitch:
      "Acting and dance under one roof. Stage plays, street plays, improv and stand-up, performed at in-house events and at fests across the country.",
    whyJoin: [
      { title: "Act or dance, or both", text: "Pick the Acting wing or the Dance wing, and perform together at Chitrahaar." },
      { title: "Packed auditoriums", text: "At Chitrahaar, every seat in the auditorium is taken." },
      { title: "Compete nationally", text: "Stage plays and street plays at fests across the country, bringing accolades home to PEC." },
      { title: "Find your funny", text: "The Improv Premier League and stand-up give you a stage for quick wit." },
    ],
    activities: ["Stage plays", "Street plays (Nukkad)", "Dance choreography", "Improv and stand-up", "Monologues and skits"],
    signatureEvents: [
      { name: "Aaghaz", text: "The annual debut where new members perform with full energy." },
      { name: "Chitrahaar", text: "Both wings on one stage in front of a packed house." },
      { name: "Spandhan", text: "Stage-play showcase, with teams from all over the country." },
      { name: "Nukkad", text: "Street-play competition bringing together teams from across India." },
      { name: "Improv Premier League", text: "Free-entry improv comedy competition between colleges." },
    ],
    skills: ["Acting", "Choreography", "Improvisation", "Script writing", "Confidence"],
    lookingFor: "Performers, dancers and storytellers. Hard work matters more than experience.",
  },

  "speakers-association-and-study-circle": {
    name: "Speakers Association & Study Circle (SAASC)",
    shortName: "SAASC",
    tagline: "Speak. Write. Read. Quiz.",
    pitch:
      "PEC's only official literary club, and the team behind PECMUN, the TRIVIUM debating championship and Verve, with cash prizes up to ₹1 lakh.",
    category: "literary",
    whyJoin: [
      { title: "Five societies in one", text: "BookSoc, DebSoc, MunSoc, QuizSoc and Cognition. Find your forum or try them all." },
      { title: "Host national events", text: "TRIVIUM brings master debaters and adjudicators from across India to PEC." },
      { title: "Ten years of PECMUN", text: "Run a Model UN that draws delegates from schools and colleges every year." },
      { title: "Leadership that shows", text: "Logical thinking, speaking and leadership that interviewers notice." },
    ],
    activities: ["Parliamentary debates", "Model UN", "Quizzing", "Book discussions", "Just-a-Minute and GDs"],
    signatureEvents: [
      { name: "PECMUN", text: "PEC's Model United Nations, a tradition for a decade." },
      { name: "TRIVIUM", text: "Asian Parliamentary Debating Championship with a national adjudication panel." },
      { name: "Verve", text: "PEC's literary fest: debates, GDs, JAM and quizzes, with prizes up to ₹1 lakh." },
    ],
    skills: ["Public speaking", "Debating", "Critical thinking", "Research", "Diplomacy"],
    lookingFor: "Talkers, readers, quizzers and writers, including anyone who wants to beat stage fright.",
  },

  "projection-design-club": {
    name: "Projection and Design Club (PDC)",
    shortName: "PDC",
    tagline: "Lights. Camera. Design.",
    pitch:
      "Short films, documentaries, posters and motion graphics. PDC designs and films PEC's biggest events and runs a nationwide film festival.",
    whyJoin: [
      { title: "Make real films", text: "Script, shoot, direct and edit originals like FourPlay, Perplexed and Ehsaas for the club's YouTube channel." },
      { title: "Master the Adobe suite", text: "Workshops in Photoshop, After Effects, Illustrator, Premiere Pro and Audition." },
      { title: "Your work, campus-wide", text: "Posters and videos for PECFEST, Convocation, Orientation and Alumni Meet." },
      { title: "Run a national festival", text: "The PEC Film Festival invites shorts and documentaries from across India." },
    ],
    activities: ["Short films and documentaries", "Poster and brochure design", "Video editing", "Event coverage", "Camera-handling workshops"],
    signatureEvents: [
      { name: "PEC Film Festival", text: "Nationwide short film and documentary competition at PECFEST." },
      { name: "Design Showdown", text: "National pop-culture poster and fan-art challenge with cash prizes." },
      { name: "Lumière", text: "A celebration of the freshers who join the club, made by and for them." },
    ],
    skills: ["Video editing", "Cinematography", "Motion graphics", "Graphic design", "Storytelling"],
    lookingFor: "Filmmakers, editors, designers and animators, whether you already have a portfolio or not.",
  },

  "rotaract-club": {
    name: "Rotaract Club",
    shortName: "Rotaract",
    tagline: "Service above self.",
    category: "social",
    pitch:
      "A Rotary International youth program (District 3080). Raise funds for real causes, work with NGOs, and learn to lead by serving.",
    whyJoin: [
      { title: "Real impact", text: "MACARENA, a dance marathon and DJ night, raised ₹30k for prosthetic hands." },
      { title: "Work with NGOs", text: "Aadhvitha, with Vriddhi, built soft skills for underprivileged youth and raised funds." },
      { title: "Leadership training", text: "Rotary's framework for responsible leadership and citizenship." },
      { title: "Career know-how", text: "In-reach and Fin-o-knowledge sessions on finance and career paths." },
    ],
    activities: ["Fundraisers", "NGO collaborations", "Nursing home and orphanage visits", "Financial literacy sessions", "Club merch store"],
    signatureEvents: [
      { name: "MACARENA", text: "Dance marathon and DJ night, run with Rotary Club Chandigarh Central." },
      { name: "Aadhvitha", text: "Soft-skills and fundraising initiative with the NGO Vriddhi." },
      { name: "Fin-o-knowledge", text: "Helping students build real financial literacy." },
    ],
    skills: ["Leadership", "Fundraising", "Event planning", "Community service", "Networking"],
    lookingFor: "People who want their college years to leave something behind.",
  },

  "communication-information-and-media-cell": {
    name: "Communication, Information & Media Cell (CIM)",
    shortName: "CIM",
    tagline: "Be the voice of PEC.",
    category: "literary",
    pitch:
      "PEC's student media body. You run the institute's PR, its official social handles and the PECPOST newsletter, and you work with journalists across the Tricity.",
    whyJoin: [
      { title: "Run official channels", text: "Manage PEC's official social media handles, used by the whole institute." },
      { title: "Publish PECPOST", text: "Design and compile the official newsletter on campus life and research." },
      { title: "Press relations", text: "Draft press releases and build relationships with Tricity media." },
      { title: "Seniors who mentor", text: "A close community with career and non-career guidance from seniors." },
    ],
    activities: ["Press releases", "Event reporting", "Social media management", "Newsletter design", "Photography"],
    signatureEvents: [
      { name: "PECPOST", text: "The official PEC newsletter, compiled and designed by CIM." },
      { name: "PECFEST coverage", text: "Media coverage and PR for the institute's biggest fest." },
    ],
    skills: ["Journalism", "PR", "Content writing", "Social media strategy", "Interviewing"],
    lookingFor: "Writers, reporters and social-media natives.",
  },

  "english-editorial-board": {
    name: "English Editorial Board (EEB)",
    shortName: "EEB",
    tagline: "Words, wit, and a pizza party after every event.",
    category: "literary",
    pitch:
      "The team behind Vista (PEC's annual magazine), the convocation Souvenir, the comic magazine Ragmag, and Slam, a poetry event that never fails.",
    whyJoin: [
      { title: "Get published", text: "Your writing in Vista, the internal magazine Maglagan, and the Bean Sight blog." },
      { title: "Interview the seniors", text: "Vista's most-read section is interviews with the graduating batch." },
      { title: "Own a stage", text: "Slam and Open Mic, in English, Hindi or Punjabi." },
      { title: "Pizza. Every time.", text: "The club guarantees a pizza party after every event it organises." },
    ],
    activities: ["Magazine writing and editing", "Interviews", "Poetry slams", "Comics and doodles", "Blogging"],
    signatureEvents: [
      { name: "Slam", text: "Annual poetry slam with participants from colleges across the region." },
      { name: "Open Mic", text: "No boundaries, and entries welcome in any language." },
      { name: "Vista", text: "PEC's annual magazine, written and edited by the board." },
      { name: "PECFest events", text: "Wordict, FanCon and Twist-A-Script." },
    ],
    skills: ["Creative writing", "Editing", "Interviewing", "Performance poetry", "Publishing"],
    lookingFor: "Writers, readers, poets and doodlers.",
  },

  "hindi-editorial-board": {
    name: "Hindi Editorial Board (HEB)",
    shortName: "HEB",
    tagline: "Ghazal, nazm, shayari, and your voice.",
    category: "literary",
    pitch:
      "One of PEC's three editorial boards. Learn the forms of Hindi poetry, perform with invited poets, and compete at other colleges' fests, including the IITs.",
    whyJoin: [
      { title: "Learn the craft", text: "Sessions for new members on ghazal, nazm, shayari and other forms." },
      { title: "Share a stage with poets", text: "Invited writers and poets at the 4-day Hindi Diwas program." },
      { title: "Win beyond PEC", text: "HEB members have won at events hosted by other colleges, including IITs." },
      { title: "Find your reading list", text: "The club points you to the best poets and writers to learn from." },
    ],
    activities: ["Poetry writing", "Article writing", "Recitation", "Literary events"],
    signatureEvents: [
      { name: "Hindi Diwas Program", text: "A 4-day celebration with invited speakers and poets." },
      { name: "Bazm-e-Shayari", text: "An evening of shayari at PECFest." },
      { name: "Sansad Ki Goonj", text: "PECFest's parliamentary-style event in Hindi." },
      { name: "Chakravyuh", text: "PECFest competition with participation from colleges across the region." },
    ],
    skills: ["Poetry", "Hindi writing", "Recitation", "Stage confidence"],
    lookingFor: "Anyone who loves Hindi and Urdu literature, whether you write or just read.",
  },

  "punjabi-editorial-board": {
    name: "Punjabi Editorial Board (PEB)",
    shortName: "PEB",
    tagline: "Bhangra, Giddha, and the spirit of Punjab.",
    category: "cultural",
    pitch:
      "Six disciplines: Bhangra, Giddha, Malwai Giddha, Theatre, Singing and Literature. PEB's Bhangra team brings home the trophy at PECFEST.",
    whyJoin: [
      { title: "Six ways in", text: "Dance, theatre, singing or literature. There's a discipline for you." },
      { title: "On stage in semester one", text: "DASTAK gives every new member their first stage experience." },
      { title: "Trophy culture", text: "The Bhangra team competes at Bhangra Theque, and the club says it always brings the trophy home." },
      { title: "The PEB fam", text: "From orientation to Raunakaan, it's a big, happy family." },
    ],
    activities: ["Bhangra and Giddha practice", "Theatre", "Folk singing", "Poetry and Mithihaas (folk-tale renditions)", "Magazines"],
    signatureEvents: [
      { name: "DASTAK", text: "Welcome event where freshers get their first taste of the stage." },
      { name: "Rang Punjab De", text: "PEB's PECFEST showcase of Punjabi culture." },
      { name: "Bhangra Theque", text: "Competitive Bhangra at PECFEST." },
      { name: "Raunakaan", text: "A send-off where the graduating members take the stage one last time." },
    ],
    skills: ["Folk dance", "Stagecraft", "Punjabi literature", "Teamwork", "Performance"],
    lookingFor: "Anyone who loves Punjabi culture. You don't need to be from Punjab.",
  },

  "student-counselling-cell": {
    name: "Student Counselling Cell (SCC)",
    shortName: "SCC",
    tagline: "Be one of the 'Happy Folks'.",
    category: "social",
    pitch:
      "Join the peer-help group that makes PEC a happier place. Run murder mysteries, treasure hunts and Diwali drives, and be the friend someone needs.",
    whyJoin: [
      { title: "Make campus kinder", text: "Happy Folks run interactive activities and motivation sessions for everyone." },
      { title: "Give back", text: "Har Dil Raushan helps economically weaker families during Diwali." },
      { title: "Host the fun events", text: "Unveil the Culprit, Scavenger Hunt and Minute to Win It are all run by SCC." },
      { title: "Learn empathy", text: "Peer support skills that make you a better friend, teammate and leader." },
    ],
    activities: ["Peer support", "Wellness activities", "Fun events", "Social drives"],
    signatureEvents: [
      { name: "Unveil the Culprit", text: "PECFEST murder-mystery: identify the suspect from the clues." },
      { name: "Har Dil Raushan", text: "Diwali drive supporting economically weaker families." },
      { name: "Treasure Hunt", text: "A happiness-themed hunt across campus." },
    ],
    skills: ["Empathy", "Active listening", "Event management", "Teamwork"],
    lookingFor: "Kind, approachable people who like bringing others together.",
  },

  "women-empowerment-cell": {
    name: "Women Empowerment Cell (WEC)",
    shortName: "WEC",
    tagline: "A safe space. A louder voice.",
    category: "social",
    pitch:
      "Formed in 2016 under UGC's Saksham scheme, WEC runs workshops, conclaves and campaigns on gender, rights and inclusion, and it's open to everyone.",
    foundedYear: 2016,
    whyJoin: [
      { title: "A safe space", text: "Express yourself among peers who respect and appreciate you, whatever your gender." },
      { title: "Work that matters", text: "Legal-rights, menstrual-health and self-defence workshops with NGOs and experts." },
      { title: "Firsts on campus", text: "Naaz, PEC's first pride event, was the highlight of 2021." },
      { title: "Advance the SDGs", text: "Work toward UN Sustainable Development Goals 4 and 5." },
    ],
    activities: ["Sensitisation workshops", "Self-defence training", "Panel discussions", "Surveys and campaigns"],
    signatureEvents: [
      { name: "Ikhtiyaar", text: "'Beauty beyond shape': a ramp walk graced by changemakers." },
      { name: "Baatein", text: "Moderated conversations on women's perspectives on campus." },
      { name: "Naaz", text: "PEC's first pride event, with a panel on safe spaces in universities." },
    ],
    skills: ["Advocacy", "Public speaking", "Event management", "Research", "Empathy"],
    lookingFor: "Everyone who believes in equality. Not only women.",
  },

  ncc: {
    name: "National Cadet Corps (NCC)",
    shortName: "NCC",
    tagline: "Unity and Discipline.",
    category: "social",
    pitch:
      "PEC's NCC Infantry unit has trained cadets since 1977. You get parades, drills, adventure and a certificate that counts in armed-forces selections.",
    foundedYear: 1977,
    whyJoin: [
      { title: "An edge in selections", text: "NCC achievements earn preference in armed-forces and other selections." },
      { title: "Lead the parade", text: "Independence Day and Republic Day parades on campus." },
      { title: "Character and discipline", text: "Comradeship, leadership and a spirit of adventure." },
      { title: "Serve the community", text: "Awareness drives as part of NCC's social responsibility." },
    ],
    activities: ["Drill and parade", "Basic military training", "Camps", "Awareness drives"],
    signatureEvents: [
      { name: "Republic and Independence Day parades", text: "Cadets lead PEC's ceremonial parades." },
      { name: "NCC Day", text: "Observed on the fourth Sunday of November." },
    ],
    skills: ["Discipline", "Leadership", "Fitness", "Teamwork", "Drill"],
    lookingFor: "Students considering the armed forces, or anyone who wants to build grit.",
    commitment: "Weekly parades + camps",
  },

  nss: {
    name: "National Service Scheme (NSS)",
    shortName: "NSS",
    tagline: "Not me, but you.",
    category: "social",
    pitch:
      "The link between the campus and the community. Take your engineering out of the classroom and into villages, drives and real problems.",
    whyJoin: [
      { title: "Solve real problems", text: "Use what you know to find practical solutions to community needs." },
      { title: "Grow as a leader", text: "Mobilise community participation and learn democratic leadership." },
      { title: "Be ready for emergencies", text: "Build the capacity to respond to emergencies and natural disasters." },
      { title: "A national movement", text: "Part of the programme launched on 24 September 1969 that now runs across India." },
    ],
    activities: ["Village outreach", "Blood donation drives", "Cleanliness campaigns", "Awareness programmes"],
    signatureEvents: [
      { name: "NSS Day", text: "Celebrated every year on 24 September." },
      { name: "Community camps", text: "Service camps working directly with local communities." },
    ],
    skills: ["Community work", "Leadership", "Organising", "Civic responsibility"],
    lookingFor: "Anyone who wants to give back while they're in college.",
  },

  "sports-council": {
    name: "Sports Council",
    shortName: "Sports",
    tagline: "Play for your year. Play for PEC.",
    category: "sports",
    pitch:
      "Cricket, hockey, football, basketball, volleyball, tennis, badminton, athletics and swimming. Compete in Inter-Year and Inter-Department tournaments for the General Championship Trophy.",
    whyJoin: [
      { title: "Every sport, one campus", text: "Playgrounds, an athletic track, a gymnasium-cum-badminton hall and a swimming pool." },
      { title: "Compete all year", text: "Annual Athletic Meet, Inter-Year matches and Inter-Department tournaments." },
      { title: "Chase the trophy", text: "Every match counts toward the General Championship Trophy." },
      { title: "Healthy and happy", text: "Team spirit in a friendly yet competitive environment." },
    ],
    activities: ["Team practice", "Athletics", "Swimming", "Inter-college tournaments"],
    signatureEvents: [
      { name: "Annual Athletic Meet", text: "PEC's biggest day on the track." },
      { name: "General Championship", text: "Inter-Year and Inter-Department tournaments all year." },
    ],
    skills: ["Fitness", "Teamwork", "Discipline", "Competitive spirit"],
    lookingFor: "Athletes at every level, from varsity players to weekend footballers.",
  },

  "robotics-society": {
    name: "Robotics Society",
    shortName: "Robotics",
    tagline: "From line followers to gesture-controlled quadcopters.",
    category: "technical",
    pitch:
      "Design, build and compete with robots nationally and internationally. Members even built a quadcopter to hoist the flag on Independence Day.",
    whyJoin: [
      { title: "Build real robots", text: "Start with line followers and work up to gesture-controlled quadcopters." },
      { title: "Compete worldwide", text: "National and international robotics competitions." },
      { title: "Hands-on from day one", text: "Soldering, basic electronics and Arduino workshops for newcomers." },
      { title: "Showcase moments", text: "A flag-hoisting quadcopter and a custom robot for Independence Day." },
    ],
    activities: ["Robot building", "Soldering and electronics", "Microcontroller programming", "Competitions"],
    signatureEvents: [
      { name: "Independence Day Build", text: "A flag-hoisting quadcopter and a robot that presents tokens to dignitaries." },
      { name: "Arduino Workshop", text: "Microcontrollers from zero, building real circuits." },
      { name: "Soldering Workshop", text: "Make your own night-light circuit." },
    ],
    skills: ["Arduino", "Electronics", "Soldering", "Control systems", "Problem solving"],
    lookingFor: "Anyone with a bit of passion and a willingness to learn. Really.",
  },

  sme: {
    name: "Society of Manufacturing Engineers (SME)",
    shortName: "SME",
    tagline: "Make things. Make them better.",
    pitch:
      "Hands-on manufacturing: casting, forging, CAD/CAM and industrial robotics, with competitions where you build catapults and battle boats.",
    whyJoin: [
      { title: "Workshop access", text: "Machine shop visits, casting, forging, fabrication and carpentry." },
      { title: "Industry-grade tools", text: "CAD/CAM and industrial robotics sessions with industry leaders." },
      { title: "Real projects", text: "Work on real-life problems, in teams and alone." },
      { title: "Fun competitions", text: "Angry Catapult and Pirate Fight make learning competitive." },
    ],
    activities: ["Machine shop sessions", "CAD/CAM", "Fabrication", "Product design challenges"],
    signatureEvents: [
      { name: "Angry Catapult", text: "Build the most efficient catapult on site with limited time and parts." },
      { name: "Pirate Fight", text: "Self-built boats battle for robustness and manoeuvrability." },
      { name: "Product Innovation Challenge", text: "Analyse a case study, design a product, pitch it." },
    ],
    skills: ["Manufacturing processes", "CAD/CAM", "Fabrication", "Product design"],
    lookingFor: "Production, Mechanical and every hands-on maker.",
  },

  asps: {
    name: "Astronomy & Space Physics Society (ASPS)",
    shortName: "ASPS",
    tagline: "Look up. Then build a satellite.",
    pitch:
      "Stargazing through a 14\" Celestron EdgeHD, water-rocket launches, and at least one team every year at CanSat, the international satellite competition.",
    whyJoin: [
      { title: "Serious telescopes", text: "Observatory sessions with a Celestron CGX-L 14\" EdgeHD and an Astromaster 130EQ." },
      { title: "Build a satellite", text: "ASPS sends at least one team to CanSat, an international satellite-making competition." },
      { title: "Launch rockets", text: "Hydroblast, the flagship water-rocket challenge." },
      { title: "Ask big questions", text: "Research talks, and when there's no speaker, members dig into the topic themselves." },
    ],
    activities: ["Stargazing nights", "Water rocketry", "Astronomy quizzes", "Research talks", "CanSat builds"],
    signatureEvents: [
      { name: "Hydroblast", text: "Build a rocket from a 2L bottle, add a parachute, launch." },
      { name: "Brahmand", text: "The astronomy quiz." },
      { name: "Star-gazing", text: "See the cosmos with your own eyes." },
    ],
    skills: ["Observational astronomy", "Rocketry", "Satellite design", "Research"],
    lookingFor: "Anyone who's ever looked up at the night sky and wondered.",
  },

  ats: {
    name: "Aerospace Technical Society (ATS)",
    shortName: "ATS",
    tagline: "PEC's only aeromodelling society.",
    pitch:
      "Build RC aircraft and airships. ATS was the first team from north India at IIT Bombay's Model Airship Regatta and took 1st and 3rd at Technoxian.",
    whyJoin: [
      { title: "Firsts and podiums", text: "First north-Indian team at the Model Airship Regatta; 1st and 3rd in RC Craft at Technoxian." },
      { title: "Every branch has a role", text: "CS for mission planning, ECE for avionics, Mech for airframes, Metallurgy for materials." },
      { title: "Industry-level approach", text: "Hands-on aeromodelling that builds problem-solving and teamwork." },
      { title: "Stay current", text: "Blogs and discussions on the latest in aerospace." },
    ],
    activities: ["RC aircraft building", "Airship design", "Flight testing", "Avionics", "Aerospace discussions"],
    signatureEvents: [
      { name: "Model Airship Regatta (IIT Bombay)", text: "ATS was the first team from all of north India to compete." },
      { name: "Technoxian World Robotics Championship", text: "1st and 3rd place in the RC Craft category." },
    ],
    skills: ["Aeromodelling", "Aerodynamics", "Avionics", "Flight testing", "Composite fabrication"],
    lookingFor: "Students from every branch are welcome.",
  },

  igs: {
    name: "Indian Geotechnical Society (IGS)",
    shortName: "IGS",
    tagline: "Get to the bottom of things.",
    pitch:
      "The PEC student chapter (est. 2016) of the national geotechnical society. Hands-on competitions, a year-round study circle and weekly quizzes that keep you sharp.",
    foundedYear: 2016,
    whyJoin: [
      { title: "A study circle that helps", text: "The IGS Study Circle shares notes, tests and practice questions all year." },
      { title: "Weekly practice", text: "CAT quizzes and the Civil Weekly Series track how you're doing in each subject." },
      { title: "Hands-on contests", text: "MSE, Damnit and Nature's Geosynthesis test theory in practice." },
      { title: "A national network", text: "Chapters across India, with academics, researchers and industry." },
    ],
    activities: ["Technical competitions", "Study circle", "Weekly quizzes", "Workshops and conferences"],
    signatureEvents: [
      { name: "MSE", text: "Find the sand-water mix that makes the strongest cube." },
      { name: "Damnit", text: "A geotechnical design challenge." },
      { name: "Nature's Geosynthesis", text: "Tests your knowledge of natural geosynthetic materials." },
    ],
    skills: ["Soil mechanics", "Foundation engineering", "Exam prep", "Event management"],
    lookingFor: "Civil engineers, especially those eyeing GATE or geotech careers.",
  },

  ecell: {
    name: "Entrepreneurship and Incubation Cell (E-Cell)",
    shortName: "E-Cell",
    tagline: "From idea to incubation.",
    pitch:
      "PEC's launchpad for founders. Workshops, pitch events, investor meets and incubation, and EIC has already helped launch several student start-ups.",
    whyJoin: [
      { title: "Meet investors", text: "Start-up fairs and investor meets put your idea in front of the right people." },
      { title: "Mentors who've done it", text: "Guidance from experienced entrepreneurs and industry professionals." },
      { title: "Get incubated", text: "Promising ideas get mentorship and funding opportunities." },
      { title: "Build the skills", text: "Hackathons and business-plan competitions sharpen how you think about problems." },
    ],
    activities: ["Pitch events", "Boot camps", "Masterclasses", "Hackathons", "Start-up fairs"],
    signatureEvents: [
      { name: "E-Summit", text: "PEC's entrepreneurship summit." },
      { name: "Start-up Fair & Investor Meet", text: "Network with start-ups and investors." },
      { name: "Business Plan Competition", text: "Pitch your plan, get feedback, win support." },
    ],
    skills: ["Product thinking", "Pitching", "Business modelling", "Networking", "Leadership"],
    lookingFor: "Founders, builders and anyone curious about start-ups.",
  },
};

// Generic FAQs, answered per club with its own data by the club page.
export const FAQ_TEMPLATES = [
  { q: "Do I need prior experience?", a: (c) => c.lookingFor || "No. Clubs look for interest and commitment first." },
  { q: "How much time does it take?", a: (c) => `Typically ${c.commitment}. It's more around big events, and less during exams.` },
  { q: "How do I join?", a: (c) => `Apply through an open position on this page. ${c.shortName} usually reviews applications and may call you for an interview.` },
  { q: "Can I join more than one club?", a: () => "Yes. Many students are in two or three clubs. Just be honest about your time in your application." },
];
