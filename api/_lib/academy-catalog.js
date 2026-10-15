// api/_lib/academy-catalog.js
// Catalogue des auto-études : CATÉGORIE (boîte) > DOMAINE (liste) > SUJET (choix précis).
// Données pures, sans accès base de données (facile à tester). Dans /_lib : ce n'est PAS une fonction serverless.
// Les textes sont écrits « français|English ». Les autres langues de l'interface retombent sur l'anglais.

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const pair = (s) => { const [fr, en] = String(s).split('|'); return { fr: fr.trim(), en: (en || fr).trim() }; };
const T = (s) => { const l = pair(s); return { id: slug(l.en), fr: l.fr, en: l.en }; };
const G = (label, topics, extra) => { const l = pair(label); return Object.assign({ id: slug(l.en), label: l, topics: topics.map(T) }, extra || {}); };
const C = (id, icon, label, desc, hint, groups, extra) => Object.assign({ id, icon, label: pair(label), desc: pair(desc), hint, groups }, extra || {});

/* ---------- Langues : une langue = un domaine ; les sujets sont les compétences à travailler ---------- */
const LANG_SKILLS = [
  'Parler dès le début : conversation de base|Speaking from day one: basic conversation',
  'Conversation avancée et aisance à l\'oral|Advanced conversation and fluency',
  'Grammaire|Grammar',
  'Conjugaison et temps verbaux|Conjugation and verb tenses',
  'Vocabulaire thématique|Thematic vocabulary',
  'Orthographe et écriture|Spelling and writing',
  'Compréhension orale et prononciation|Listening and pronunciation',
  'Compréhension écrite et lecture|Reading comprehension',
  'Expression écrite, rédaction et dissertation|Writing, composition and essays',
  'Analyse de texte et figures de style|Text analysis and figures of speech',
  'Langue des affaires et du travail|Business and workplace language',
  'Culture et civilisation|Culture and civilisation'
];
function langGroup(label, opts) {
  const o = opts || {};
  const skills = LANG_SKILLS.filter((s) => !(o.skip || []).some((k) => s.startsWith(k)));
  const topics = skills.concat(o.extra || []);
  return G(label, topics, { kind: 'language' });
}


/* ---------- Sport : sports collectifs, arts martiaux, yoga, fitness, athlétisme... ---------- */
const MARTIAL_BASE = [
  'Découvrir la discipline : histoire, philosophie et valeurs|Discovering the discipline: history, philosophy and values',
  'Échauffement, souplesse et condition physique|Warm-up, flexibility and conditioning',
  'Positions, déplacements et équilibre|Stances, footwork and balance',
  'Techniques de base : frappes, saisies ou projections|Basic techniques: strikes, grips or throws',
  'Enchaînements et formes (katas, taolu, combinaisons)|Combinations and forms (kata, taolu, drills)',
  'Principes de défense et réflexes|Defence principles and reflexes',
  'Préparer ses passages de grade|Preparing for grading exams',
  'Sécurité, étiquette et prévention des blessures|Safety, etiquette and injury prevention',
  'Mental, concentration et gestion du stress|Mindset, focus and stress management'
];
const martial = (label, extra) => G(label, MARTIAL_BASE.concat(extra || []));
const TEAM_BASE = [
  'Règles du jeu et comprendre le terrain|Rules of the game and understanding the pitch',
  'Technique individuelle de base|Basic individual technique',
  'Tactique, placement et lecture du jeu|Tactics, positioning and reading the game',
  'Préparation physique spécifique|Sport-specific conditioning',
  'Arbitrage et lois du jeu|Refereeing and laws of the game',
  'Entraîner des jeunes et animer une séance|Coaching youth and running a session'
];
const team = (label, extra) => G(label, TEAM_BASE.concat(extra || []));

const CATEGORIES = [
  C('languages', 'chat', 'Langues|Languages',
    'Parler, comprendre, écrire : du premier mot à la maîtrise.|Speak, understand, write: from the first word to mastery.',
    "Matière : apprentissage d'une langue. Explique dans la langue de l'élève ; les exemples, dialogues et exercices sont dans la langue étudiée avec traduction. Utilise le niveau CECRL (A1 à C2) : A1-A2 pour débutant, B1-B2 pour intermédiaire, C1-C2 pour avancé. Chaque leçon contient un mini-dialogue ou un texte court, du vocabulaire utile, la prononciation quand c'est pertinent, les erreurs fréquentes et un exercice de pratique orale ou écrite.",
    [
      langGroup('Français|French', { extra: ['Préparer le DELF / DALF / TCF|Preparing DELF / DALF / TCF', 'Littérature et lecture d\'œuvres|Literature and reading works'] }),
      langGroup('Anglais|English', { extra: ['Préparer le TOEFL / IELTS / TOEIC|Preparing TOEFL / IELTS / TOEIC', 'Littérature et lecture d\'œuvres|Literature and reading works'] }),
      langGroup('Espagnol|Spanish', { extra: ['Préparer le DELE / SIELE|Preparing DELE / SIELE'] }),
      langGroup('Portugais|Portuguese', { extra: ['Préparer le CELPE-Bras|Preparing CELPE-Bras'] }),
      langGroup('Italien|Italian', { extra: ['Préparer le CILS / CELI|Preparing CILS / CELI'] }),
      langGroup('Allemand|German', { extra: ['Préparer le Goethe-Zertifikat / TestDaF|Preparing Goethe-Zertifikat / TestDaF'] }),
      langGroup('Arabe|Arabic', { extra: ['Lire et écrire l\'alphabet arabe|Reading and writing the Arabic alphabet', 'Arabe dialectal et arabe littéraire|Dialectal vs. Modern Standard Arabic'] }),
      langGroup('Chinois (mandarin)|Chinese (Mandarin)', { skip: ['Conjugaison', 'Analyse de texte'], extra: ['Pinyin et tons|Pinyin and tones', 'Caractères chinois (hanzi)|Chinese characters (hanzi)', 'Préparer le HSK|Preparing the HSK'] }),
      langGroup('Japonais|Japanese', { extra: ['Hiragana et katakana|Hiragana and katakana', 'Kanji|Kanji', 'Préparer le JLPT|Preparing the JLPT'] }),
      langGroup('Russe|Russian', { extra: ['Alphabet cyrillique|The Cyrillic alphabet'] }),
      langGroup('Turc|Turkish', {}),
      langGroup('Néerlandais|Dutch', {}),
      langGroup('Swahili|Swahili', { skip: ['Analyse de texte'] }),
      langGroup('Lingala|Lingala', { skip: ['Analyse de texte', 'Langue des affaires'] }),
      langGroup('Langue des signes|Sign language', { skip: ['Conjugaison', 'Orthographe', 'Compréhension orale', 'Analyse de texte', 'Expression écrite'], extra: ['Alphabet dactylologique|Fingerspelling alphabet', 'Signes du quotidien|Everyday signs'] })
    ]),

  C('tech', 'code', 'Informatique et numérique|Computing and digital',
    'Programmation, réseaux, cybersécurité, maintenance, bureautique et IA.|Programming, networks, cybersecurity, maintenance, office tools and AI.',
    "Matière : informatique. Privilégie la pratique : code ou commandes complets et commentés, étapes reproductibles, erreurs courantes et leur correction. Les exemples doivent être exacts et testables ; précise la version ou l'outil utilisé.",
    [
      G('Programmation et algorithmique|Programming and algorithms', ['Logique et pensée algorithmique|Logic and algorithmic thinking', 'Algorithmique et structures de données|Algorithms and data structures', 'Python|Python', 'JavaScript|JavaScript', 'Java|Java', 'C et C++|C and C++', 'C#|C#', 'PHP|PHP', 'Programmation orientée objet|Object-oriented programming', 'Git et GitHub|Git and GitHub']),
      G('Développement web|Web development', ['HTML et CSS|HTML and CSS', 'JavaScript pour le web|JavaScript for the web', 'React|React', 'Node.js et API|Node.js and APIs', 'WordPress|WordPress', 'Créer un site de A à Z|Building a website from scratch']),
      G('Développement mobile|Mobile development', ['Android avec Kotlin|Android with Kotlin', 'Flutter et Dart|Flutter and Dart', 'Applications web progressives (PWA)|Progressive web apps (PWA)', 'Publier une application|Publishing an app']),
      G('Bases de données et data|Databases and data', ['SQL|SQL', 'Firebase et Firestore|Firebase and Firestore', 'MySQL et PostgreSQL|MySQL and PostgreSQL', 'Analyse de données avec Excel|Data analysis with Excel', 'Python pour la data|Python for data', 'Power BI et tableaux de bord|Power BI and dashboards']),
      G('Réseaux et télécoms|Networking and telecoms', ['Fondamentaux des réseaux|Network fundamentals', 'Modèle OSI et TCP/IP|OSI model and TCP/IP', 'Adressage IP et sous-réseaux|IP addressing and subnetting', 'Routage et commutation (Cisco)|Routing and switching (Cisco)', 'Wi-Fi et réseaux sans fil|Wi-Fi and wireless networks', 'Câblage et installation réseau|Cabling and network installation', 'Fibre optique et télécoms|Fibre optics and telecoms', 'Préparer le CCNA|Preparing the CCNA']),
      G('Cybersécurité|Cybersecurity', ['Bases de la cybersécurité|Cybersecurity basics', 'Sécurité des réseaux et pare-feu|Network security and firewalls', 'Cryptographie|Cryptography', 'Sécurité web (OWASP)|Web security (OWASP)', 'Tests d\'intrusion éthiques|Ethical penetration testing', 'Analyse de menaces et réponse aux incidents|Threat analysis and incident response', 'Protéger sa vie privée en ligne|Protecting your online privacy', 'Préparer Security+|Preparing Security+']),
      G('Systèmes, cloud et administration|Systems, cloud and administration', ['Linux|Linux', 'Windows Server|Windows Server', 'Virtualisation|Virtualization', 'Cloud (AWS, Azure, Google Cloud)|Cloud (AWS, Azure, Google Cloud)', 'Docker et conteneurs|Docker and containers', 'DevOps et automatisation|DevOps and automation']),
      G('Maintenance et dépannage|Maintenance and repair', ['Hardware : composants d\'un ordinateur|Hardware: computer components', 'Assembler et réparer un PC|Building and repairing a PC', 'Installer Windows et Linux|Installing Windows and Linux', 'Dépannage logiciel et virus|Software troubleshooting and malware', 'Réparer un téléphone|Phone repair', 'Imprimantes et périphériques|Printers and peripherals', 'Maintenance d\'un parc informatique|IT asset maintenance']),
      G('Bureautique et outils numériques|Office and digital tools', ['Word|Word', 'Excel|Excel', 'PowerPoint|PowerPoint', 'Google Workspace|Google Workspace', 'Dactylographie rapide|Fast touch typing', 'Travail collaboratif en ligne|Online collaboration', 'Culture numérique de base|Basic digital literacy']),
      G('Intelligence artificielle|Artificial intelligence', ['Comprendre l\'IA|Understanding AI', 'Utiliser les assistants IA efficacement|Using AI assistants effectively', 'Ingénierie de prompts|Prompt engineering', 'Apprentissage automatique (machine learning)|Machine learning', 'Réseaux de neurones et deep learning|Neural networks and deep learning', 'IA générative : texte, image, audio|Generative AI: text, image, audio', 'Automatiser son travail avec l\'IA|Automating work with AI', 'Éthique et limites de l\'IA|AI ethics and limits']),
      G('Électronique et systèmes embarqués|Electronics and embedded systems', ['Électronique de base|Basic electronics', 'Arduino|Arduino', 'Raspberry Pi|Raspberry Pi', 'Internet des objets (IoT)|Internet of Things (IoT)', 'Domotique|Home automation'])
    ]),

  C('business', 'brief', 'Business et gestion|Business and management',
    'Entreprendre, vendre, gérer, comprendre la finance et le marketing.|Start, sell, manage, understand finance and marketing.',
    "Matière : business et gestion. Donne des cadres de travail concrets, des exemples chiffrés réalistes et des études de cas, sans promettre de résultats financiers. Rappelle que les lois et taxes varient selon les pays.",
    [
      G('Entrepreneuriat|Entrepreneurship', ['Trouver et valider une idée|Finding and validating an idea', 'Business plan|Business plan', 'Créer et formaliser son entreprise|Starting and registering a company', 'Business model et proposition de valeur|Business model and value proposition', 'Lever des fonds et financer son projet|Funding your project', 'Entreprendre en Afrique|Entrepreneurship in Africa', 'Gérer une petite entreprise|Running a small business']),
      G('Marketing digital|Digital marketing', ['Stratégie marketing|Marketing strategy', 'Réseaux sociaux|Social media', 'SEO : référencement naturel|SEO', 'Publicité en ligne (Facebook, Google)|Online ads (Facebook, Google)', 'Copywriting et rédaction de vente|Copywriting', 'Email marketing|Email marketing', 'Marque et branding|Branding', 'Analyse des statistiques|Analytics']),
      G('Vente et relation client|Sales and customer relations', ['Techniques de vente|Sales techniques', 'Négociation|Negotiation', 'Service client|Customer service', 'Prospection et fidélisation|Prospecting and retention', 'Vente en ligne et e-commerce|Online selling and e-commerce']),
      G('Finance et comptabilité|Finance and accounting', ['Comptabilité générale|General accounting', 'Comptabilité de gestion|Management accounting', 'Analyse financière|Financial analysis', 'Budget et trésorerie|Budgeting and cash flow', 'Fiscalité de base|Basic taxation', 'Audit et contrôle de gestion|Audit and management control', 'Marchés financiers : notions|Financial markets: basics', 'Logiciels de comptabilité|Accounting software']),
      G('Gestion de projet|Project management', ['Fondamentaux de la gestion de projet|Project management fundamentals', 'Méthodes agiles et Scrum|Agile and Scrum', 'Planification et suivi|Planning and tracking', 'Gestion des risques|Risk management', 'Préparer le PMP|Preparing the PMP']),
      G('Management et ressources humaines|Management and HR', ['Leadership et management d\'équipe|Leadership and team management', 'Recrutement|Recruitment', 'Droit du travail pour managers|Employment basics for managers', 'Gestion de la paie|Payroll', 'Motivation et performance|Motivation and performance']),
      G('Économie et commerce|Economics and trade', ['Microéconomie|Microeconomics', 'Macroéconomie|Macroeconomics', 'Commerce international|International trade', 'Logistique et chaîne d\'approvisionnement|Logistics and supply chain', 'Import-export|Import and export'])
    ]),

  C('science', 'flask', 'Sciences et ingénierie|Science and engineering',
    'Physique, chimie, biologie, Terre, astronomie et ingénierie.|Physics, chemistry, biology, Earth science, astronomy and engineering.',
    "Matière : sciences. Sois rigoureux : définitions exactes, unités, formules expliquées, ordres de grandeur, expériences ou exemples du quotidien. Distingue clairement ce qui est établi de ce qui est débattu. N'invente aucune valeur numérique.",
    [
      G('Physique|Physics', ['Mécanique|Mechanics', 'Électricité et magnétisme|Electricity and magnetism', 'Thermodynamique|Thermodynamics', 'Optique et ondes|Optics and waves', 'Physique moderne|Modern physics', 'Énergie et énergies renouvelables|Energy and renewables']),
      G('Chimie|Chemistry', ['Chimie générale|General chemistry', 'Chimie organique|Organic chemistry', 'Chimie des solutions et acides-bases|Solution chemistry and acids-bases', 'Chimie analytique|Analytical chemistry', 'Biochimie|Biochemistry']),
      G('Biologie|Biology', ['Biologie cellulaire|Cell biology', 'Génétique|Genetics', 'Microbiologie|Microbiology', 'Écologie|Ecology', 'Évolution|Evolution', 'Botanique et zoologie|Botany and zoology']),
      G('Terre, environnement et agronomie|Earth, environment and agronomy', ['Géologie|Geology', 'Météorologie et climat|Meteorology and climate', 'Environnement et développement durable|Environment and sustainability', 'Agronomie et cultures|Agronomy and crops', 'Élevage|Animal husbandry', 'Gestion de l\'eau|Water management']),
      G('Astronomie et espace|Astronomy and space', ['Système solaire|The solar system', 'Étoiles et galaxies|Stars and galaxies', 'Cosmologie|Cosmology', 'Observer le ciel|Stargazing']),
      G('Ingénierie|Engineering', ['Électricité du bâtiment|Building electricity', 'Électrotechnique|Electrical engineering', 'Mécanique générale|General mechanics', 'Génie civil et construction|Civil engineering and construction', 'Résistance des matériaux|Strength of materials', 'Dessin technique et CAO|Technical drawing and CAD', 'Énergie solaire et installation|Solar energy and installation']),
      G('Méthode scientifique|Scientific method', ['Esprit critique et raisonnement|Critical thinking and reasoning', 'Statistiques pour la recherche|Statistics for research', 'Rédiger un rapport scientifique|Writing a scientific report', 'Faire une recherche documentaire|Literature research'])
    ]),

  C('health', 'heart', 'Médecine et santé|Medicine and health',
    'Anatomie, soins, santé publique, nutrition, premiers secours.|Anatomy, care, public health, nutrition, first aid.',
    "Matière : santé et médecine. Contenu éducatif et général uniquement : aucun diagnostic, aucune prescription ni posologie personnalisée. Rappelle à la fin des notions cliniques de consulter un professionnel de santé. Utilise la terminologie correcte avec son explication simple, et signale ce qui peut varier selon les pays ou les protocoles locaux.",
    [
      G('Anatomie et physiologie|Anatomy and physiology', ['Anatomie générale|General anatomy', 'Système cardiovasculaire|Cardiovascular system', 'Système respiratoire|Respiratory system', 'Système nerveux|Nervous system', 'Appareil digestif|Digestive system', 'Système endocrinien et reproduction|Endocrine and reproductive systems', 'Terminologie médicale|Medical terminology']),
      G('Médecine : les bases|Medicine: the basics', ['Sémiologie : comprendre les symptômes|Semiology: understanding symptoms', 'Pathologies courantes|Common conditions', 'Maladies infectieuses et tropicales|Infectious and tropical diseases', 'Paludisme, VIH, tuberculose : prévention|Malaria, HIV, tuberculosis: prevention', 'Lire des examens de laboratoire|Reading lab results', 'Introduction à l\'imagerie médicale|Introduction to medical imaging']),
      G('Pharmacologie|Pharmacology', ['Notions de pharmacologie|Pharmacology basics', 'Classes de médicaments|Drug classes', 'Bon usage des médicaments|Safe use of medicines', 'Plantes médicinales : approche prudente|Medicinal plants: a cautious approach']),
      G('Soins infirmiers|Nursing', ['Soins de base|Basic care', 'Hygiène et asepsie|Hygiene and asepsis', 'Prise des constantes|Taking vital signs', 'Injections et pansements : principes|Injections and dressings: principles', 'Éthique et relation soignant-patient|Ethics and patient relations']),
      G('Santé publique|Public health', ['Épidémiologie|Epidemiology', 'Vaccination et prévention|Vaccination and prevention', 'Hygiène, eau et assainissement|Hygiene, water and sanitation', 'Éducation à la santé|Health education', 'Gestion d\'un centre de santé|Running a health centre']),
      G('Mère, enfant et famille|Mother, child and family', ['Grossesse et suivi prénatal|Pregnancy and prenatal care', 'Accouchement et post-partum|Childbirth and postpartum', 'Santé de l\'enfant|Child health', 'Planification familiale|Family planning']),
      G('Premiers secours et urgences|First aid and emergencies', ['Gestes de premiers secours|First aid basics', 'Réanimation de base (RCP)|Basic life support (CPR)', 'Brûlures, plaies, fractures|Burns, wounds, fractures', 'Réagir face à un accident|Responding to an accident']),
      G('Nutrition et diététique|Nutrition and dietetics', ['Bases de la nutrition|Nutrition basics', 'Alimentation équilibrée|Balanced diet', 'Nutrition de l\'enfant et de la femme enceinte|Child and pregnancy nutrition', 'Alimentation et maladies chroniques|Diet and chronic conditions']),
      G('Santé mentale et bien-être|Mental health and wellbeing', ['Comprendre le stress|Understanding stress', 'Sommeil et hygiène de vie|Sleep and lifestyle', 'Psychologie de base|Basic psychology', 'Accompagner un proche en difficulté|Supporting someone in difficulty']),
      G('Sport et remise en forme|Sport and fitness', ['Programme de remise en forme|Fitness programme', 'Musculation : bases|Strength training basics', 'Course à pied|Running', 'Échauffement et prévention des blessures|Warm-up and injury prevention'])
    ]),

  C('math', 'sigma', 'Mathématiques et logique|Mathematics and logic',
    'Calcul, algèbre, géométrie, analyse, statistiques et raisonnement.|Calculation, algebra, geometry, analysis, statistics and reasoning.',
    "Matière : mathématiques. Raisonne pas à pas, justifie chaque étape, donne des exemples résolus en détail puis des exercices progressifs. Vérifie tes calculs. Utilise une notation simple en texte (par exemple x^2, racine(x), a/b).",
    [
      G('Arithmétique et calcul|Arithmetic and calculation', ['Les quatre opérations et le calcul mental|The four operations and mental maths', 'Fractions, pourcentages, proportions|Fractions, percentages, proportions', 'Nombres relatifs et puissances|Integers and powers', 'Règle de trois et problèmes|Rule of three and word problems', 'Mathématiques du quotidien|Everyday maths']),
      G('Algèbre|Algebra', ['Équations et inéquations|Equations and inequalities', 'Systèmes d\'équations|Systems of equations', 'Polynômes et factorisation|Polynomials and factoring', 'Suites et séries|Sequences and series', 'Matrices et algèbre linéaire|Matrices and linear algebra', 'Nombres complexes|Complex numbers']),
      G('Géométrie et trigonométrie|Geometry and trigonometry', ['Géométrie plane|Plane geometry', 'Géométrie dans l\'espace|Solid geometry', 'Trigonométrie|Trigonometry', 'Vecteurs et repères|Vectors and coordinates', 'Aires et volumes|Areas and volumes']),
      G('Analyse|Calculus and analysis', ['Fonctions|Functions', 'Limites et continuité|Limits and continuity', 'Dérivées|Derivatives', 'Intégrales|Integrals', 'Équations différentielles|Differential equations']),
      G('Probabilités et statistiques|Probability and statistics', ['Statistiques descriptives|Descriptive statistics', 'Dénombrement|Counting', 'Probabilités|Probability', 'Lois de probabilité|Probability distributions', 'Tests et estimation|Tests and estimation']),
      G('Logique et raisonnement|Logic and reasoning', ['Logique et raisonnement mathématique|Mathematical logic and reasoning', 'Démonstrations|Proofs', 'Énigmes et résolution de problèmes|Puzzles and problem solving', 'Tests de logique pour concours|Logic tests for entrance exams']),
      G('Mathématiques appliquées|Applied mathematics', ['Mathématiques financières|Financial mathematics', 'Recherche opérationnelle|Operations research', 'Mathématiques pour l\'informatique|Maths for computing', 'Mathématiques pour l\'ingénieur|Maths for engineers'])
    ]),

  C('arts', 'brush', 'Arts et créativité|Arts and creativity',
    'Musique, dessin, design, photo, décoration, écriture et plus.|Music, drawing, design, photography, decoration, writing and more.',
    "Matière : arts. Mêle explication et pratique : exercices à faire chez soi, routine de travail, erreurs de débutant, repères d'écoute ou d'observation. Décris précisément les gestes (positions, schémas en texte, accords, rythmes) et propose une progression réaliste.",
    [
      G('Musique|Music', ['Piano|Piano', 'Clavier et orgue d\'église|Keyboard and church organ', 'Guitare acoustique|Acoustic guitar', 'Guitare électrique|Electric guitar', 'Guitare basse|Bass guitar', 'Batterie et percussions|Drums and percussion', 'Chant et technique vocale|Singing and vocal technique', 'Théorie musicale et solfège|Music theory and solfège', 'Blues|Blues', 'Jazz|Jazz', 'Kompa|Kompa', 'Salsa|Salsa', 'Rumba congolaise et soukous|Congolese rumba and soukous', 'Gospel et musique d\'église|Gospel and church music', 'Afrobeats et musiques urbaines|Afrobeats and urban music', 'Reggae|Reggae', 'Rock et pop|Rock and pop', 'Violon|Violin', 'Saxophone et instruments à vent|Saxophone and wind instruments', 'Flûte|Flute', 'Composition et arrangement|Composition and arrangement', 'Écriture de chansons|Songwriting', 'Production musicale (MAO)|Music production (DAW)', 'Mixage et mastering|Mixing and mastering', 'Direction de chorale|Choir conducting', 'Histoire de la musique|Music history']),
      G('Dessin et peinture|Drawing and painting', ['Bases du dessin|Drawing basics', 'Dessin au crayon et ombres|Pencil drawing and shading', 'Portrait|Portrait', 'Perspective|Perspective', 'Manga et bande dessinée|Manga and comics', 'Aquarelle|Watercolour', 'Peinture acrylique et à l\'huile|Acrylic and oil painting', 'Dessin numérique|Digital drawing']),
      G('Design graphique|Graphic design', ['Principes du design graphique|Graphic design principles', 'Photoshop|Photoshop', 'Illustrator|Illustrator', 'Canva|Canva', 'Création de logo et identité visuelle|Logo and visual identity', 'Typographie et couleurs|Typography and colour', 'UI / UX design|UI / UX design', 'Affiches et supports imprimés|Posters and print']),
      G('Photographie et vidéo|Photography and video', ['Photographie : les bases|Photography basics', 'Lumière et composition|Light and composition', 'Retouche photo (Lightroom)|Photo editing (Lightroom)', 'Montage vidéo|Video editing', 'Réaliser un film court|Making a short film', 'Créer du contenu pour les réseaux|Creating social content']),
      G('Décoration et design d\'intérieur|Decoration and interior design', ['Principes de décoration|Decoration principles', 'Couleurs et ambiances|Colour and mood', 'Aménager un petit espace|Small space planning', 'Plans et rendu 3D|Plans and 3D rendering', 'Décoration d\'événements|Event decoration', 'Aménagement paysager et jardin|Landscaping and gardens']),
      G('Mode, couture et artisanat|Fashion, sewing and crafts', ['Couture : les bases|Sewing basics', 'Patronage et modélisme|Pattern making', 'Stylisme et tendances|Styling and trends', 'Broderie et tricot|Embroidery and knitting', 'Maquillage et coiffure|Make-up and hairstyling', 'Bijoux et artisanat|Jewellery and crafts']),
      G('Écriture et littérature|Writing and literature', ['Écriture créative|Creative writing', 'Écrire un roman|Writing a novel', 'Poésie|Poetry', 'Scénario|Screenwriting', 'Analyser une œuvre littéraire|Analysing a literary work']),
      G('Théâtre, cinéma et danse|Theatre, film and dance', ['Théâtre et jeu d\'acteur|Theatre and acting', 'Histoire du cinéma|Film history', 'Danse : les bases|Dance basics', 'Danses africaines et latines|African and Latin dances', 'Animation 2D et 3D|2D and 3D animation'])
    ]),

  C('sport', 'sport', 'Sport et arts martiaux|Sport and martial arts',
    'Football, arts martiaux, yoga, fitness : techniques, entraînement et bonnes pratiques.|Football, martial arts, yoga, fitness: technique, training and good practice.',
    "Matière : sport, arts martiaux et activité physique. Enseigne les règles, la technique, la tactique et la progression d'entraînement, avec des gestes décrits étape par étape (position de départ, mouvement, erreurs fréquentes, comment corriger). Commence toujours par l'échauffement et la sécurité. Pour les techniques de contact, les projections et les étirements poussés, rappelle de pratiquer avec un entraîneur ou un professeur qualifié. Aucun programme médical, aucun régime ni dosage personnalisé : donne des principes généraux, adaptés à l'âge et à la condition physique, et invite à consulter un médecin en cas de douleur, de maladie ou de reprise après une longue pause.",
    [
      team('Football|Football (soccer)', ['Contrôle, passes et conduite de balle|Control, passing and dribbling', 'Tir et finition|Shooting and finishing', 'Gardien de but|Goalkeeping', 'Systèmes de jeu (4-4-2, 4-3-3...)|Formations (4-4-2, 4-3-3...)', 'Phases arrêtées : corners et coups francs|Set pieces: corners and free kicks']),
      team('Basketball|Basketball', ['Dribble, passes et tir|Dribbling, passing and shooting', 'Défense individuelle et collective|Individual and team defence']),
      team('Volleyball|Volleyball', ['Service, réception et passe|Serve, receive and set', 'Attaque et bloc|Spike and block']),
      team('Handball et rugby|Handball and rugby', ['Handball : bases et règles|Handball: basics and rules', 'Rugby : bases et règles|Rugby: basics and rules', 'Plaquage et placement en sécurité|Safe tackling and positioning']),
      G('Sports de raquette|Racket sports', ['Tennis : coups de base|Tennis: basic strokes', 'Tennis : service et tactique|Tennis: serve and tactics', 'Tennis de table|Table tennis', 'Badminton|Badminton', 'Règles et marquage des points|Rules and scoring']),
      martial('Kung-fu et wushu|Kung fu and wushu', ['Styles : Shaolin, Wing Chun, Tai-chi|Styles: Shaolin, Wing Chun, Tai chi', 'Armes traditionnelles (initiation)|Traditional weapons (introduction)']),
      martial('Karaté|Karate', ['Kihon, kata et kumite|Kihon, kata and kumite', 'Styles : Shotokan, Kyokushin, Goju-ryu|Styles: Shotokan, Kyokushin, Goju-ryu']),
      martial('Judo|Judo', ['Chutes (ukemi) en sécurité|Safe falling (ukemi)', 'Projections (nage-waza)|Throws (nage-waza)', 'Travail au sol (ne-waza)|Ground work (ne-waza)']),
      martial('Taekwondo|Taekwondo', ['Techniques de pied|Kicking techniques', 'Poomsae|Poomsae']),
      martial('Aïkido, jiu-jitsu et capoeira|Aikido, jiu-jitsu and capoeira', ['Aïkido : principes et techniques|Aikido: principles and techniques', 'Jiu-jitsu brésilien : bases au sol|Brazilian jiu-jitsu: ground basics', 'Capoeira : ginga et mouvements|Capoeira: ginga and movements']),
      G('Boxe et sports de combat|Boxing and combat sports', ['Boxe anglaise : garde, déplacements, coups|Boxing: guard, footwork, punches', 'Muay-thaï et kickboxing|Muay Thai and kickboxing', 'Lutte : bases|Wrestling: basics', 'Préparation physique du combattant|Fighter conditioning', 'Défense personnelle : principes|Self-defence: principles', 'Règlements et catégories de poids|Rules and weight classes']),
      G('Yoga et bien-être|Yoga and wellness', ['Yoga pour débutants|Yoga for beginners', 'Hatha yoga : postures (asanas)|Hatha yoga: postures (asanas)', 'Vinyasa et enchaînements|Vinyasa and flows', 'Respiration (pranayama)|Breathing (pranayama)', 'Méditation et pleine conscience|Meditation and mindfulness', 'Pilates : bases|Pilates: basics', 'Étirements et mobilité|Stretching and mobility', 'Relaxation et gestion du stress|Relaxation and stress management', 'Yoga et philosophie|Yoga and philosophy']),
      G('Fitness et musculation|Fitness and strength training', ['Musculation pour débutants|Strength training for beginners', 'Poids du corps et callisthénie|Bodyweight and calisthenics', 'Cardio et HIIT|Cardio and HIIT', 'Construire un programme d\'entraînement|Building a training programme', 'Technique des mouvements de base|Technique of the basic lifts', 'Récupération et prévention des blessures|Recovery and injury prevention', 'Alimentation du sportif : principes généraux|Sports nutrition: general principles', 'Motivation et régularité|Motivation and consistency']),
      G('Athlétisme et course à pied|Athletics and running', ['Commencer à courir|Starting to run', 'Préparer un 5 km et un 10 km|Preparing a 5K and 10K', 'Semi-marathon et marathon|Half-marathon and marathon', 'Sprint et vitesse|Sprint and speed', 'Sauts : longueur, hauteur, triple saut|Jumps: long, high, triple', 'Lancers : poids, disque, javelot|Throws: shot, discus, javelin', 'Technique de course et respiration|Running technique and breathing']),
      G('Natation et sports nautiques|Swimming and water sports', ['Apprendre à nager|Learning to swim', 'Crawl : technique et respiration|Front crawl: technique and breathing', 'Brasse, dos et papillon|Breaststroke, backstroke and butterfly', 'Virages et départs|Turns and starts', 'Sécurité dans l\'eau|Water safety', 'Water-polo : bases|Water polo: basics']),
      G('Cyclisme et sports de plein air|Cycling and outdoor sports', ['Cyclisme : bases et sécurité|Cycling: basics and safety', 'Entraînement cycliste|Cycling training', 'Randonnée et orientation|Hiking and orienteering', 'Escalade : bases|Climbing: basics', 'Premiers secours en plein air|Outdoor first aid']),
      G('Échecs|Chess', ['Règles et mouvement des pièces|Rules and piece movement', 'Ouvertures|Openings', 'Tactique : fourchettes, clouages, attaques|Tactics: forks, pins, attacks', 'Milieu de jeu et stratégie|Middlegame and strategy', 'Finales|Endgames', 'Analyser ses parties|Analysing your games']),
      G('Métiers et entraînement sportif|Coaching and sports careers', ['Devenir coach sportif|Becoming a sports coach', 'Planifier une saison d\'entraînement|Planning a training season', 'Préparation mentale du sportif|Sports psychology', 'Premiers secours et gestes qui sauvent|First aid and life-saving actions', 'Gérer un club ou une association sportive|Running a sports club', 'Arbitrage et officiels|Refereeing and officials', 'Anatomie et physiologie de l\'effort|Anatomy and exercise physiology'])
    ]),

  C('exams', 'cap', 'Examens et concours|Exams and entrance tests',
    'Réviser, s\'organiser et réussir ses épreuves.|Revise, organise yourself and succeed in your tests.',
    "Matière : préparation aux examens. Structure : points clés du programme, méthode de résolution, exemples type sujet corrigés, pièges fréquents, conseils de gestion du temps. Reste fidèle au niveau demandé et ne prétends pas connaître le sujet exact d'un examen.",
    [
      G('Examens nationaux|National exams', ['Baccalauréat|Baccalaureate', 'Examen d\'État|State exam', 'Brevet et fin de collège|Middle-school diploma', 'Probatoire et examens de fin d\'année|Mid-cycle and end-of-year exams']),
      G('Concours et admissions|Entrance and competitive exams', ['Concours d\'entrée universitaire|University entrance exams', 'Concours de la fonction publique|Civil service exams', 'Concours de médecine et santé|Medicine and health entrance', 'Concours d\'écoles d\'ingénieurs|Engineering school entrance', 'Concours de police, armée et sécurité|Police, army and security exams']),
      G('Tests de langue|Language tests', ['TOEFL|TOEFL', 'IELTS|IELTS', 'TOEIC|TOEIC', 'DELF / DALF / TCF|DELF / DALF / TCF', 'Test d\'allemand (Goethe, TestDaF)|German tests']),
      G('Études à l\'étranger et bourses|Studying abroad and scholarships', ['Constituer un dossier de candidature|Building an application', 'Lettre de motivation et CV|Cover letter and CV', 'Trouver et obtenir une bourse|Finding and winning a scholarship', 'SAT, GRE, GMAT|SAT, GRE, GMAT', 'S\'installer et réussir ses études à l\'étranger|Settling abroad']),
      G('Méthodes de travail|Study methods', ['Méthodes de révision efficaces|Effective revision methods', 'Mémorisation et fiches|Memorisation and notes', 'Gestion du temps et planning|Time management and planning', 'Gestion du stress en examen|Handling exam stress', 'Prise de notes|Note-taking']),
      G('Rédaction et expression|Writing and expression', ['Dissertation|Essay writing', 'Résumé et synthèse de textes|Summaries and syntheses', 'Commentaire de texte|Text commentary', 'Préparer un oral et un entretien|Preparing an oral exam or interview'])
    ]),

  C('career', 'tie', 'Métiers et compétences pro|Careers and professional skills',
    'Compétences concrètes pour travailler, évoluer et se former à un métier.|Practical skills to work, progress and train for a trade.',
    "Matière : compétences professionnelles. Donne des procédures concrètes, des normes de sécurité quand c'est pertinent, des cas pratiques du terrain et un vocabulaire métier. Précise que les réglementations dépendent des pays.",
    [
      G('Secrétariat et administration|Office and administration', ['Secrétariat et assistanat|Secretarial work', 'Rédaction administrative|Administrative writing', 'Classement et archivage|Filing and archiving', 'Accueil et standard|Reception and switchboard', 'Gestion de bureau|Office management']),
      G('Communication professionnelle|Professional communication', ['Communiquer au travail|Workplace communication', 'Prise de parole en public|Public speaking', 'Rédiger des emails professionnels|Writing professional emails', 'Animer une réunion|Running meetings', 'Gestion des conflits|Conflict management', 'Chercher un emploi : CV et entretien|Job search: CV and interview']),
      G('Hôtellerie, restauration et tourisme|Hospitality, catering and tourism', ['Cuisine : techniques de base|Cooking basics', 'Pâtisserie et boulangerie|Pastry and baking', 'Service en salle et bar|Table service and bar', 'Réception hôtelière|Hotel reception', 'Guide touristique et agence de voyage|Tour guide and travel agency', 'Hygiène et sécurité alimentaire|Food safety']),
      G('Bâtiment et métiers techniques|Construction and technical trades', ['Maçonnerie|Masonry', 'Plomberie|Plumbing', 'Électricité domestique|Home electrical work', 'Soudure|Welding', 'Menuiserie|Carpentry', 'Mécanique automobile|Auto mechanics', 'Climatisation et froid|Air conditioning and refrigeration', 'Peinture en bâtiment|House painting']),
      G('Agriculture et élevage|Farming and livestock', ['Cultures vivrières|Food crops', 'Maraîchage|Market gardening', 'Élevage de volaille|Poultry farming', 'Pisciculture|Fish farming', 'Transformation agroalimentaire|Food processing', 'Gestion d\'une exploitation agricole|Running a farm']),
      G('Transport, logistique et sécurité|Transport, logistics and safety', ['Gestion de stock|Inventory management', 'Transport et livraison|Transport and delivery', 'Sécurité au travail|Workplace safety', 'Agent de sécurité|Security officer', 'Conduite et code de la route|Driving and road rules']),
      G('Éducation et formation|Education and training', ['Devenir enseignant|Becoming a teacher', 'Pédagogie et préparation de cours|Pedagogy and lesson planning', 'Animer une formation|Delivering training', 'Éducation de la petite enfance|Early childhood education', 'Soutien scolaire|Tutoring']),
      G('Travail indépendant et numérique|Freelancing and remote work', ['Devenir freelance|Becoming a freelancer', 'Travailler à distance|Working remotely', 'Trouver des clients|Finding clients', 'Gérer son temps et ses revenus|Managing time and income'])
    ]),

  C('society', 'scale', 'Droit et sciences humaines|Law and humanities',
    'Droit, histoire, philosophie, politique et société.|Law, history, philosophy, politics and society.',
    "Matière : droit et sciences humaines. Donne des connaissances générales et pédagogiques, jamais un avis juridique personnalisé. Précise que le droit varie selon les pays et les dates. Présente les débats de façon équilibrée.",
    [
      G('Droit|Law', ['Introduction au droit|Introduction to law', 'Droit civil et de la famille|Civil and family law', 'Droit du travail|Employment law', 'Droit des affaires et des sociétés|Business and company law', 'Droit pénal : notions|Criminal law basics', 'Droit constitutionnel|Constitutional law', 'Droits humains et droits du citoyen|Human and citizen rights', 'Contrats|Contracts', 'Fiscalité : notions|Taxation basics', 'Droit international|International law']),
      G('Histoire et géographie|History and geography', ['Histoire de l\'Afrique|History of Africa', 'Histoire mondiale|World history', 'Géographie physique et humaine|Physical and human geography', 'Histoire des idées et des civilisations|History of ideas and civilisations', 'Lire une carte et s\'orienter|Reading maps']),
      G('Philosophie et pensée|Philosophy and thought', ['Introduction à la philosophie|Introduction to philosophy', 'Éthique et morale|Ethics and morality', 'Logique et argumentation|Logic and argumentation', 'Grands philosophes|Great philosophers', 'Dissertation de philosophie|Philosophy essay']),
      G('Politique et relations internationales|Politics and international relations', ['Sciences politiques|Political science', 'Institutions et démocratie|Institutions and democracy', 'Relations internationales|International relations', 'Organisations internationales|International organisations', 'Développement et coopération|Development and cooperation']),
      G('Sociologie et psychologie|Sociology and psychology', ['Sociologie : les bases|Sociology basics', 'Psychologie générale|General psychology', 'Psychologie de l\'enfant et de l\'adolescent|Child and adolescent psychology', 'Anthropologie|Anthropology', 'Communication et médias|Communication and media'])
    ]),

  C('personal', 'sun', 'Développement personnel|Personal development',
    'Habitudes, confiance, finances personnelles et leadership.|Habits, confidence, personal finance and leadership.',
    "Matière : développement personnel. Reste concret, réaliste et bienveillant : exercices à pratiquer, exemples du quotidien, étapes progressives. Évite les promesses miracle et les conseils thérapeutiques ou financiers personnalisés.",
    [
      G('Productivité et organisation|Productivity and organisation', ['Gestion du temps|Time management', 'Fixer et atteindre des objectifs|Setting and reaching goals', 'Habitudes et discipline|Habits and discipline', 'Concentration et apprentissage efficace|Focus and effective learning', 'Organiser sa semaine|Planning your week']),
      G('Confiance et relations|Confidence and relationships', ['Confiance en soi|Self-confidence', 'Communication et écoute|Communication and listening', 'Intelligence émotionnelle|Emotional intelligence', 'Gérer le stress et les émotions|Managing stress and emotions', 'Relations saines|Healthy relationships']),
      G('Prise de parole et leadership|Public speaking and leadership', ['Prise de parole en public|Public speaking', 'Leadership personnel|Personal leadership', 'Débattre et argumenter|Debating and arguing', 'Négocier au quotidien|Everyday negotiation']),
      G('Finances personnelles|Personal finance', ['Gérer son budget|Managing a budget', 'Épargner|Saving', 'Éviter et sortir de l\'endettement|Avoiding and escaping debt', 'Comprendre l\'investissement|Understanding investing', 'Éducation financière des enfants|Teaching kids about money']),
      G('Famille et éducation des enfants|Family and parenting', ['Éducation positive|Positive parenting', 'Accompagner la scolarité|Supporting schoolwork', 'Communication parent-adolescent|Parent-teen communication', 'Vie de couple et famille|Couple and family life'])
    ])
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const findCategory = (id) => CATEGORIES.find((c) => c.id === id) || null;
function findGroup(catId, groupId) {
  const c = findCategory(catId);
  return c ? (c.groups.find((g) => g.id === groupId) || null) : null;
}
const labelOf = (x, lang) => (x && x.label ? (x.label[lang] || x.label.en || x.label.fr) : (x && (x[lang] || x.en || x.fr)) || '');

module.exports = { CATEGORIES, CATEGORY_IDS, findCategory, findGroup, labelOf, slug };
