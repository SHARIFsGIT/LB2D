export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  competency: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export const questionPool: Question[] = [
  // Basic Greetings and Politeness (A1-C2)
  { id: '1-A1', text: 'How do you say "Hello" in German?', options: ['Guten Tag', 'Hallo', 'Auf Wiedersehen', 'Danke'], correctAnswer: 1, competency: 'Basic Greetings', level: 'A1' },
  { id: '1-A2', text: 'What is the German word for "Thank you"?', options: ['Bitte', 'Entschuldigung', 'Danke', 'Tschüs'], correctAnswer: 2, competency: 'Basic Greetings', level: 'A2' },
  { id: '1-B1', text: 'How do you politely ask for help in German?', options: ['Hilfe!', 'Können Sie mir helfen?', 'Ich brauche Hilfe', 'Hilf mir'], correctAnswer: 1, competency: 'Basic Greetings', level: 'B1' },
  { id: '1-B2', text: 'Which is the most formal way to say goodbye?', options: ['Tschüs', 'Auf Wiedersehen', 'Bis bald', 'Ciao'], correctAnswer: 1, competency: 'Basic Greetings', level: 'B2' },
  { id: '1-C1', text: 'What does "Entschuldigen Sie die Störung" mean?', options: ['Excuse the noise', 'Sorry for disturbing', 'Excuse me', 'I apologize'], correctAnswer: 1, competency: 'Basic Greetings', level: 'C1' },
  { id: '1-C2', text: 'Which phrase shows the highest level of politeness when declining?', options: ['Nein, danke', 'Das kann ich nicht', 'Leider kann ich das nicht', 'Es tut mir außerordentlich leid, aber das ist mir leider nicht möglich'], correctAnswer: 3, competency: 'Basic Greetings', level: 'C2' },

  // Basic Vocabulary (A1-C2)
  { id: '2-A1', text: 'What is the German word for "water"?', options: ['das Brot', 'das Wasser', 'die Milch', 'der Saft'], correctAnswer: 1, competency: 'Basic Vocabulary', level: 'A1' },
  { id: '2-A2', text: 'How do you say "I am hungry" in German?', options: ['Ich bin müde', 'Ich habe Durst', 'Ich habe Hunger', 'Ich bin kalt'], correctAnswer: 2, competency: 'Basic Vocabulary', level: 'A2' },
  { id: '2-B1', text: 'What does "Fernseher" mean in English?', options: ['Radio', 'Computer', 'Television', 'Phone'], correctAnswer: 2, competency: 'Basic Vocabulary', level: 'B1' },
  { id: '2-B2', text: 'Which word means "to improve"?', options: ['verschlechtern', 'verbessern', 'vergrößern', 'verkleinern'], correctAnswer: 1, competency: 'Basic Vocabulary', level: 'B2' },
  { id: '2-C1', text: 'What is the meaning of "nachvollziehen"?', options: ['to follow behind', 'to comprehend/understand', 'to copy', 'to repeat'], correctAnswer: 1, competency: 'Basic Vocabulary', level: 'C1' },
  { id: '2-C2', text: 'Which word best describes "extremely meticulous attention to detail"?', options: ['sorgfältig', 'genau', 'akribisch', 'ordentlich'], correctAnswer: 2, competency: 'Basic Vocabulary', level: 'C2' },

  // Numbers and Time (A1-C2)
  { id: '3-A1', text: 'How do you say "three" in German?', options: ['zwei', 'drei', 'vier', 'fünf'], correctAnswer: 1, competency: 'Numbers and Time', level: 'A1' },
  { id: '3-A2', text: 'What time is "halb vier"?', options: ['3:30', '4:30', '4:00', '3:00'], correctAnswer: 0, competency: 'Numbers and Time', level: 'A2' },
  { id: '3-B1', text: 'How do you say "quarter past eight"?', options: ['Viertel acht', 'Viertel nach acht', 'Viertel vor acht', 'Acht Viertel'], correctAnswer: 1, competency: 'Numbers and Time', level: 'B1' },
  { id: '3-B2', text: 'What does "übermorgen" mean?', options: ['yesterday', 'tomorrow', 'the day after tomorrow', 'last week'], correctAnswer: 2, competency: 'Numbers and Time', level: 'B2' },
  { id: '3-C1', text: 'Which expression means "in the foreseeable future"?', options: ['bald', 'in absehbarer Zeit', 'später', 'irgendwann'], correctAnswer: 1, competency: 'Numbers and Time', level: 'C1' },
  { id: '3-C2', text: 'What does "alle Jubeljahre" mean?', options: ['every year', 'very rarely', 'during celebrations', 'in jubilee years'], correctAnswer: 1, competency: 'Numbers and Time', level: 'C2' },

  // Family and Relationships (A1-C2)
  { id: '4-A1', text: 'What is the German word for "mother"?', options: ['Vater', 'Mutter', 'Schwester', 'Tochter'], correctAnswer: 1, competency: 'Family and Relationships', level: 'A1' },
  { id: '4-A2', text: 'How do you say "my brother" in German?', options: ['meine Schwester', 'mein Bruder', 'mein Vater', 'meine Mutter'], correctAnswer: 1, competency: 'Family and Relationships', level: 'A2' },
  { id: '4-B1', text: 'What does "Schwiegermutter" mean?', options: ['sister-in-law', 'step-mother', 'mother-in-law', 'grandmother'], correctAnswer: 2, competency: 'Family and Relationships', level: 'B1' },
  { id: '4-B2', text: 'Which term describes a close friendship?', options: ['Bekanntschaft', 'Freundschaft', 'enge Freundschaft', 'Kameradschaft'], correctAnswer: 2, competency: 'Family and Relationships', level: 'B2' },
  { id: '4-C1', text: 'What does "verschwägert" mean?', options: ['related by marriage', 'divorced', 'engaged', 'adopted'], correctAnswer: 0, competency: 'Family and Relationships', level: 'C1' },
  { id: '4-C2', text: 'Which expression means "to be estranged from family"?', options: ['mit der Familie streiten', 'von der Familie entfremdet sein', 'die Familie verlassen', 'sich von der Familie distanzieren'], correctAnswer: 1, competency: 'Family and Relationships', level: 'C2' },

  // Food and Drinks (A1-C2)
  { id: '5-A1', text: 'What is "Brot" in English?', options: ['butter', 'bread', 'cheese', 'meat'], correctAnswer: 1, competency: 'Food and Drinks', level: 'A1' },
  { id: '5-A2', text: 'How do you say "I would like coffee" in German?', options: ['Ich trinke Kaffee', 'Ich möchte Kaffee', 'Ich habe Kaffee', 'Ich koche Kaffee'], correctAnswer: 1, competency: 'Food and Drinks', level: 'A2' },
  { id: '5-B1', text: 'What does "Hauptgericht" mean?', options: ['appetizer', 'main course', 'dessert', 'side dish'], correctAnswer: 1, competency: 'Food and Drinks', level: 'B1' },
  { id: '5-B2', text: 'Which phrase means "the bill, please"?', options: ['Die Rechnung, bitte', 'Das Geld, bitte', 'Die Bezahlung, bitte', 'Der Preis, bitte'], correctAnswer: 0, competency: 'Food and Drinks', level: 'B2' },
  { id: '5-C1', text: 'What does "schmackhaft" mean?', options: ['expensive', 'tasty', 'healthy', 'fresh'], correctAnswer: 1, competency: 'Food and Drinks', level: 'C1' },
  { id: '5-C2', text: 'Which term describes food that is "exquisitely prepared"?', options: ['gut gekocht', 'lecker zubereitet', 'raffiniert zubereitet', 'einfach gemacht'], correctAnswer: 2, competency: 'Food and Drinks', level: 'C2' },

  // Articles and Grammar Basics (A1-C2)
  { id: '6-A1', text: 'Which article goes with "Haus" (house)?', options: ['der', 'die', 'das', 'den'], correctAnswer: 2, competency: 'Articles and Grammar', level: 'A1' },
  { id: '6-A2', text: 'What is the plural of "das Kind"?', options: ['die Kinds', 'die Kinder', 'die Kinde', 'das Kinder'], correctAnswer: 1, competency: 'Articles and Grammar', level: 'A2' },
  { id: '6-B1', text: 'Which case is used after "mit" (with)?', options: ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv'], correctAnswer: 2, competency: 'Articles and Grammar', level: 'B1' },
  { id: '6-B2', text: 'What is the correct past participle of "gehen"?', options: ['gegangen', 'gegehen', 'gegangt', 'gehangen'], correctAnswer: 0, competency: 'Articles and Grammar', level: 'B2' },
  { id: '6-C1', text: 'Which modal verb expresses ability?', options: ['müssen', 'sollen', 'können', 'wollen'], correctAnswer: 2, competency: 'Articles and Grammar', level: 'C1' },
  { id: '6-C2', text: 'What is the subjunctive II form of "haben" for "ich"?', options: ['hätte', 'habe', 'hatte', 'häbe'], correctAnswer: 0, competency: 'Articles and Grammar', level: 'C2' },

  // Verb Conjugations (A1-C2)
  { id: '7-A1', text: 'How do you conjugate "sein" (to be) for "ich"?', options: ['ich bin', 'ich bist', 'ich ist', 'ich sind'], correctAnswer: 0, competency: 'Verb Conjugations', level: 'A1' },
  { id: '7-A2', text: 'What is the "du" form of "haben"?', options: ['du habe', 'du hast', 'du hat', 'du haben'], correctAnswer: 1, competency: 'Verb Conjugations', level: 'A2' },
  { id: '7-B1', text: 'Which is the correct past tense of "ich gehe"?', options: ['ich ginge', 'ich ging', 'ich gegangen', 'ich bin gegangen'], correctAnswer: 1, competency: 'Verb Conjugations', level: 'B1' },
  { id: '7-B2', text: 'What is the future tense of "er kommt"?', options: ['er wird kommen', 'er kommt werden', 'er gekommen wird', 'er hat kommen'], correctAnswer: 0, competency: 'Verb Conjugations', level: 'B2' },
  { id: '7-C1', text: 'Which sentence uses the subjunctive I correctly?', options: ['Er sagt, er ist krank', 'Er sagt, er sei krank', 'Er sagt, er wäre krank', 'Er sagt, er würde krank sein'], correctAnswer: 1, competency: 'Verb Conjugations', level: 'C1' },
  { id: '7-C2', text: 'What is the double infinitive construction with "lassen"?', options: ['Ich habe ihn gelassen kommen', 'Ich habe ihn kommen lassen', 'Ich habe ihn kommen gelassen', 'Ich lasse ihn gekommen haben'], correctAnswer: 1, competency: 'Verb Conjugations', level: 'C2' },

  // Prepositions and Cases (A1-C2)
  { id: '8-A1', text: 'Which preposition means "in"?', options: ['auf', 'in', 'an', 'über'], correctAnswer: 1, competency: 'Prepositions and Cases', level: 'A1' },
  { id: '8-A2', text: 'Complete: "Ich wohne ___ Berlin" (I live in Berlin)', options: ['in', 'an', 'auf', 'bei'], correctAnswer: 0, competency: 'Prepositions and Cases', level: 'A2' },
  { id: '8-B1', text: 'Which case does "wegen" require?', options: ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv'], correctAnswer: 3, competency: 'Prepositions and Cases', level: 'B1' },
  { id: '8-B2', text: 'What is the dative form of "der große Mann"?', options: ['dem großen Mann', 'den großen Mann', 'der große Mann', 'des großen Mannes'], correctAnswer: 0, competency: 'Prepositions and Cases', level: 'B2' },
  { id: '8-C1', text: 'Which preposition can take both accusative and dative?', options: ['für', 'mit', 'auf', 'von'], correctAnswer: 2, competency: 'Prepositions and Cases', level: 'C1' },
  { id: '8-C2', text: 'In "Er arbeitet des Geldes wegen", what case is used?', options: ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv'], correctAnswer: 3, competency: 'Prepositions and Cases', level: 'C2' },

  // Travel and Transportation (A1-C2)
  { id: '9-A1', text: 'What is "Zug" in English?', options: ['bus', 'car', 'train', 'plane'], correctAnswer: 2, competency: 'Travel and Transportation', level: 'A1' },
  { id: '9-A2', text: 'How do you ask "Where is the train station?"', options: ['Wie ist der Bahnhof?', 'Wo ist der Bahnhof?', 'Was ist der Bahnhof?', 'Wann ist der Bahnhof?'], correctAnswer: 1, competency: 'Travel and Transportation', level: 'A2' },
  { id: '9-B1', text: 'What does "umsteigen" mean?', options: ['to get on', 'to get off', 'to change trains', 'to buy tickets'], correctAnswer: 2, competency: 'Travel and Transportation', level: 'B1' },
  { id: '9-B2', text: 'Which phrase means "the flight is delayed"?', options: ['Der Flug ist pünktlich', 'Der Flug ist verspätet', 'Der Flug ist abgesagt', 'Der Flug ist früh'], correctAnswer: 1, competency: 'Travel and Transportation', level: 'B2' },
  { id: '9-C1', text: 'What does "eine Rundreise machen" mean?', options: ['to take a one-way trip', 'to go on a round trip', 'to travel by round route', 'to make a circular journey'], correctAnswer: 1, competency: 'Travel and Transportation', level: 'C1' },
  { id: '9-C2', text: 'Which expression means "to travel at someone else\'s expense"?', options: ['auf eigene Kosten reisen', 'auf fremde Rechnung reisen', 'kostenlos reisen', 'billig reisen'], correctAnswer: 1, competency: 'Travel and Transportation', level: 'C2' },

  // Work and Professions (A1-C2)
  { id: '10-A1', text: 'What is "Lehrer" in English?', options: ['student', 'teacher', 'doctor', 'lawyer'], correctAnswer: 1, competency: 'Work and Professions', level: 'A1' },
  { id: '10-A2', text: 'How do you say "I work in an office"?', options: ['Ich arbeite im Büro', 'Ich wohne im Büro', 'Ich gehe ins Büro', 'Ich bin im Büro'], correctAnswer: 0, competency: 'Work and Professions', level: 'A2' },
  { id: '10-B1', text: 'What does "Vollzeit" mean?', options: ['part-time', 'full-time', 'overtime', 'free time'], correctAnswer: 1, competency: 'Work and Professions', level: 'B1' },
  { id: '10-B2', text: 'Which phrase means "to apply for a job"?', options: ['einen Job suchen', 'sich um einen Job bewerben', 'einen Job haben', 'einen Job verlieren'], correctAnswer: 1, competency: 'Work and Professions', level: 'B2' },
  { id: '10-C1', text: 'What does "sich beruflich weiterbilden" mean?', options: ['to change careers', 'to retire', 'to pursue professional development', 'to work harder'], correctAnswer: 2, competency: 'Work and Professions', level: 'C1' },
  { id: '10-C2', text: 'Which term describes "a highly specialized field of expertise"?', options: ['Fachgebiet', 'Spezialgebiet', 'Fachbereich', 'hochspezialisiertes Fachgebiet'], correctAnswer: 3, competency: 'Work and Professions', level: 'C2' },

  // Shopping and Money (A1-C2)
  { id: '11-A1', text: 'How do you ask "How much does it cost?"', options: ['Wie viel kostet das?', 'Was kostet das?', 'Wo kostet das?', 'Wann kostet das?'], correctAnswer: 0, competency: 'Shopping and Money', level: 'A1' },
  { id: '11-A2', text: 'What is the German word for "expensive"?', options: ['billig', 'teuer', 'kostenlos', 'preiswert'], correctAnswer: 1, competency: 'Shopping and Money', level: 'A2' },
  { id: '11-B1', text: 'How do you say "Can I pay with card?"', options: ['Kann ich mit Karte zahlen?', 'Kann ich Karte bezahlen?', 'Darf ich Karte nehmen?', 'Soll ich mit Karte zahlen?'], correctAnswer: 0, competency: 'Shopping and Money', level: 'B1' },
  { id: '11-B2', text: 'What does "Sonderangebot" mean?', options: ['special order', 'special offer', 'special delivery', 'special service'], correctAnswer: 1, competency: 'Shopping and Money', level: 'B2' },
  { id: '11-C1', text: 'Which phrase means "good value for money"?', options: ['gutes Geld', 'guter Preis', 'gutes Preis-Leistungs-Verhältnis', 'günstig'], correctAnswer: 2, competency: 'Shopping and Money', level: 'C1' },
  { id: '11-C2', text: 'What does "in finanzieller Schieflage sein" mean?', options: ['to be financially stable', 'to be in financial difficulties', 'to be wealthy', 'to be financially independent'], correctAnswer: 1, competency: 'Shopping and Money', level: 'C2' },

  // Weather and Seasons (A1-C2)
  { id: '12-A1', text: 'What is "Sonne" in English?', options: ['moon', 'sun', 'star', 'cloud'], correctAnswer: 1, competency: 'Weather and Seasons', level: 'A1' },
  { id: '12-A2', text: 'How do you say "It is raining"?', options: ['Es schneit', 'Es regnet', 'Es ist kalt', 'Es ist warm'], correctAnswer: 1, competency: 'Weather and Seasons', level: 'A2' },
  { id: '12-B1', text: 'What does "bewölkt" mean?', options: ['sunny', 'cloudy', 'windy', 'foggy'], correctAnswer: 1, competency: 'Weather and Seasons', level: 'B1' },
  { id: '12-B2', text: 'Which phrase describes very hot weather?', options: ['Es ist warm', 'Es ist heiß', 'Es ist glühend heiß', 'Es ist sonnig'], correctAnswer: 2, competency: 'Weather and Seasons', level: 'B2' },
  { id: '12-C1', text: 'What does "ein Wetterumschwung" mean?', options: ['weather forecast', 'weather change', 'weather report', 'weather station'], correctAnswer: 1, competency: 'Weather and Seasons', level: 'C1' },
  { id: '12-C2', text: 'Which expression describes "unpredictable weather"?', options: ['schlechtes Wetter', 'unbeständiges Wetter', 'launisches Wetter', 'wechselhaftes Wetter'], correctAnswer: 2, competency: 'Weather and Seasons', level: 'C2' },

  // Health and Body Parts (A1-C2)
  { id: '13-A1', text: 'What is "Kopf" in English?', options: ['hand', 'foot', 'head', 'arm'], correctAnswer: 2, competency: 'Health and Body', level: 'A1' },
  { id: '13-A2', text: 'How do you say "I have a headache"?', options: ['Ich habe Kopfschmerzen', 'Mein Kopf tut weh', 'Ich bin krank', 'Ich habe Schmerzen'], correctAnswer: 0, competency: 'Health and Body', level: 'A2' },
  { id: '13-B1', text: 'What does "Termin beim Arzt" mean?', options: ['hospital visit', 'doctor appointment', 'medical exam', 'health check'], correctAnswer: 1, competency: 'Health and Body', level: 'B1' },
  { id: '13-B2', text: 'Which phrase means "to recover from illness"?', options: ['krank werden', 'sich erholen', 'gesund werden', 'sich von einer Krankheit erholen'], correctAnswer: 3, competency: 'Health and Body', level: 'B2' },
  { id: '13-C1', text: 'What does "chronische Beschwerden" mean?', options: ['acute pain', 'chronic complaints', 'temporary discomfort', 'severe symptoms'], correctAnswer: 1, competency: 'Health and Body', level: 'C1' },
  { id: '13-C2', text: 'Which term describes "a comprehensive medical examination"?', options: ['Untersuchung', 'gründliche Untersuchung', 'umfassende medizinische Untersuchung', 'Gesundheitscheck'], correctAnswer: 2, competency: 'Health and Body', level: 'C2' },

  // Hobbies and Leisure (A1-C2)
  { id: '14-A1', text: 'What is "Sport" in English?', options: ['game', 'sport', 'play', 'fun'], correctAnswer: 1, competency: 'Hobbies and Leisure', level: 'A1' },
  { id: '14-A2', text: 'How do you say "I like reading"?', options: ['Ich lese gern', 'Ich mag lesen', 'Ich lese Bücher', 'Ich kann lesen'], correctAnswer: 0, competency: 'Hobbies and Leisure', level: 'A2' },
  { id: '14-B1', text: 'What does "Freizeit" mean?', options: ['free time', 'work time', 'school time', 'break time'], correctAnswer: 0, competency: 'Hobbies and Leisure', level: 'B1' },
  { id: '14-B2', text: 'Which phrase means "to pursue a hobby seriously"?', options: ['ein Hobby haben', 'ein Hobby ernst nehmen', 'sich einem Hobby widmen', 'ein Hobby intensiv betreiben'], correctAnswer: 3, competency: 'Hobbies and Leisure', level: 'B2' },
  { id: '14-C1', text: 'What does "sich entspannen" mean?', options: ['to exercise', 'to work', 'to relax', 'to concentrate'], correctAnswer: 2, competency: 'Hobbies and Leisure', level: 'C1' },
  { id: '14-C2', text: 'Which expression describes "an all-consuming passion"?', options: ['große Leidenschaft', 'starkes Interesse', 'alles verschlingende Leidenschaft', 'tiefe Hingabe'], correctAnswer: 2, competency: 'Hobbies and Leisure', level: 'C2' },

  // Education and Learning (A1-C2)
  { id: '15-A1', text: 'What is "Schule" in English?', options: ['university', 'school', 'college', 'class'], correctAnswer: 1, competency: 'Education and Learning', level: 'A1' },
  { id: '15-A2', text: 'How do you say "I am a student"?', options: ['Ich bin Student', 'Ich bin Schüler', 'Ich lerne', 'Ich studiere'], correctAnswer: 0, competency: 'Education and Learning', level: 'A2' },
  { id: '15-B1', text: 'What does "Prüfung" mean?', options: ['lesson', 'exam', 'homework', 'grade'], correctAnswer: 1, competency: 'Education and Learning', level: 'B1' },
  { id: '15-B2', text: 'Which phrase means "to pass an exam"?', options: ['eine Prüfung machen', 'eine Prüfung bestehen', 'eine Prüfung haben', 'eine Prüfung schreiben'], correctAnswer: 1, competency: 'Education and Learning', level: 'B2' },
  { id: '15-C1', text: 'What does "sich weiterbilden" mean?', options: ['to continue studying', 'to pursue continuing education', 'to advance in education', 'to improve skills'], correctAnswer: 1, competency: 'Education and Learning', level: 'C1' },
  { id: '15-C2', text: 'Which term describes "academic excellence"?', options: ['gute Noten', 'Erfolg im Studium', 'akademische Spitzenleistung', 'hohe Bildung'], correctAnswer: 2, competency: 'Education and Learning', level: 'C2' },

  // Technology and Communication (A1-C2)
  { id: '16-A1', text: 'What is "Computer" in German?', options: ['Komputer', 'Computer', 'Rechner', 'Maschine'], correctAnswer: 1, competency: 'Technology and Communication', level: 'A1' },
  { id: '16-A2', text: 'How do you say "I send an email"?', options: ['Ich schicke eine E-Mail', 'Ich bekomme eine E-Mail', 'Ich lese eine E-Mail', 'Ich öffne eine E-Mail'], correctAnswer: 0, competency: 'Technology and Communication', level: 'A2' },
  { id: '16-B1', text: 'What does "herunterladen" mean?', options: ['to upload', 'to download', 'to delete', 'to save'], correctAnswer: 1, competency: 'Technology and Communication', level: 'B1' },
  { id: '16-B2', text: 'Which phrase means "to be online"?', options: ['am Computer sein', 'im Internet sein', 'online sein', 'connected sein'], correctAnswer: 2, competency: 'Technology and Communication', level: 'B2' },
  { id: '16-C1', text: 'What does "digitalisieren" mean?', options: ['to make digital', 'to digitize', 'to computerize', 'to modernize'], correctAnswer: 1, competency: 'Technology and Communication', level: 'C1' },
  { id: '16-C2', text: 'Which term describes "cutting-edge technology"?', options: ['neue Technologie', 'moderne Technologie', 'fortschrittliche Technologie', 'Spitzentechnologie'], correctAnswer: 3, competency: 'Technology and Communication', level: 'C2' },

  // Culture and Traditions (A1-C2)
  { id: '17-A1', text: 'What is "Weihnachten" in English?', options: ['Easter', 'Christmas', 'Birthday', 'New Year'], correctAnswer: 1, competency: 'Culture and Traditions', level: 'A1' },
  { id: '17-A2', text: 'When do Germans celebrate Oktoberfest?', options: ['October', 'September/October', 'November', 'August'], correctAnswer: 1, competency: 'Culture and Traditions', level: 'A2' },
  { id: '17-B1', text: 'What is a "Gymnasium" in the German education system?', options: ['elementary school', 'middle school', 'academic high school', 'university'], correctAnswer: 2, competency: 'Culture and Traditions', level: 'B1' },
  { id: '17-B2', text: 'What does "Gemütlichkeit" represent in German culture?', options: ['efficiency', 'punctuality', 'coziness and warmth', 'formality'], correctAnswer: 2, competency: 'Culture and Traditions', level: 'B2' },
  { id: '17-C1', text: 'What is the significance of "Karneval" in German culture?', options: ['harvest festival', 'pre-Lenten celebration', 'summer festival', 'religious holiday'], correctAnswer: 1, competency: 'Culture and Traditions', level: 'C1' },
  { id: '17-C2', text: 'Which concept represents the German approach to life-work balance?', options: ['Arbeitsmoral', 'Leistungsgesellschaft', 'Work-Life-Balance', 'Feierabend-Kultur'], correctAnswer: 3, competency: 'Culture and Traditions', level: 'C2' },

  // Complex Grammar Structures (A1-C2)
  { id: '18-A1', text: 'Which word order is correct: "Ich __ morgen nach Berlin"?', options: ['fahre', 'nach Berlin fahre', 'morgen fahre', 'fahren'], correctAnswer: 0, competency: 'Complex Grammar', level: 'A1' },
  { id: '18-A2', text: 'Where does the verb go in: "Morgen __ ich nach Hause"?', options: ['first position', 'second position', 'third position', 'last position'], correctAnswer: 1, competency: 'Complex Grammar', level: 'A2' },
  { id: '18-B1', text: 'Which conjunction requires verb at the end: "Ich gehe nach Hause, __ ich müde bin"?', options: ['und', 'aber', 'weil', 'denn'], correctAnswer: 2, competency: 'Complex Grammar', level: 'B1' },
  { id: '18-B2', text: 'What is the passive voice of "Der Mann liest das Buch"?', options: ['Das Buch wird gelesen', 'Das Buch liest sich', 'Das Buch ist gelesen', 'Das Buch wurde gelesen'], correctAnswer: 0, competency: 'Complex Grammar', level: 'B2' },
  { id: '18-C1', text: 'Which sentence uses the subjunctive correctly for indirect speech?', options: ['Er sagte, er ist krank', 'Er sagte, er sei krank', 'Er sagte, er wäre krank', 'Er sagte, dass er krank ist'], correctAnswer: 1, competency: 'Complex Grammar', level: 'C1' },
  { id: '18-C2', text: 'What is the correct use of "würde" + infinitive?', options: ['Conditional mood replacement', 'Future tense', 'Past tense', 'Present perfect'], correctAnswer: 0, competency: 'Complex Grammar', level: 'C2' },

  // Idiomatic Expressions (A1-C2)
  { id: '19-A1', text: 'What does "Wie geht\'s?" mean?', options: ['Where are you going?', 'How are you?', 'What are you doing?', 'Who are you?'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'A1' },
  { id: '19-A2', text: 'What does "Alles Gute!" mean?', options: ['Everything good!', 'All the best!', 'Very good!', 'Good everything!'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'A2' },
  { id: '19-B1', text: 'What does "Das ist mir Wurst" mean?', options: ['I like sausage', 'I don\'t care', 'That\'s food to me', 'I\'m hungry'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'B1' },
  { id: '19-B2', text: 'What does "Die Daumen drücken" mean?', options: ['to press thumbs', 'to keep fingers crossed', 'to be nervous', 'to squeeze hands'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'B2' },
  { id: '19-C1', text: 'What does "Das ist nicht mein Bier" mean?', options: ['That\'s not my beer', 'That\'s not my business', 'I don\'t drink', 'I don\'t like that'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'C1' },
  { id: '19-C2', text: 'What does "Jemandem einen Bären aufbinden" mean?', options: ['to tie a bear to someone', 'to tell tall tales', 'to give someone a pet', 'to create a burden'], correctAnswer: 1, competency: 'Idiomatic Expressions', level: 'C2' },

  // Regional Differences (A1-C2)
  { id: '20-A1', text: 'How do you say "bread roll" in Northern Germany?', options: ['Brötchen', 'Semmel', 'Schrippe', 'Wecken'], correctAnswer: 0, competency: 'Regional Differences', level: 'A1' },
  { id: '20-A2', text: 'What do they call "bread roll" in Bavaria?', options: ['Brötchen', 'Semmel', 'Schrippe', 'Wecken'], correctAnswer: 1, competency: 'Regional Differences', level: 'A2' },
  { id: '20-B1', text: 'Which greeting is typical for Bavaria?', options: ['Moin', 'Servus', 'Tschüs', 'Hallo'], correctAnswer: 1, competency: 'Regional Differences', level: 'B1' },
  { id: '20-B2', text: 'What does "Moin" mean in Northern Germany?', options: ['Good morning only', 'Hello (any time)', 'Goodbye', 'Good evening'], correctAnswer: 1, competency: 'Regional Differences', level: 'B2' },
  { id: '20-C1', text: 'Which is a distinctive Austrian German word for "January"?', options: ['Januar', 'Jänner', 'Januarius', 'Wintermonat'], correctAnswer: 1, competency: 'Regional Differences', level: 'C1' },
  { id: '20-C2', text: 'What characterizes Swiss German compared to Standard German?', options: ['Only pronunciation differs', 'Completely different language', 'Significant vocabulary and grammar differences', 'Only formal differences'], correctAnswer: 2, competency: 'Regional Differences', level: 'C2' },

  // Business German (A1-C2)
  { id: '21-A1', text: 'How do you say "company" in German?', options: ['Kompanie', 'Firma', 'Geschäft', 'Betrieb'], correctAnswer: 1, competency: 'Business German', level: 'A1' },
  { id: '21-A2', text: 'What is a formal way to start a business letter?', options: ['Hallo', 'Liebe Grüße', 'Sehr geehrte Damen und Herren', 'Guten Tag'], correctAnswer: 2, competency: 'Business German', level: 'A2' },
  { id: '21-B1', text: 'What does "Termin" mean in business context?', options: ['deadline', 'appointment', 'contract', 'meeting room'], correctAnswer: 1, competency: 'Business German', level: 'B1' },
  { id: '21-B2', text: 'Which phrase means "to schedule a meeting"?', options: ['ein Meeting haben', 'ein Meeting planen', 'ein Meeting anberaumen', 'ein Meeting besuchen'], correctAnswer: 2, competency: 'Business German', level: 'B2' },
  { id: '21-C1', text: 'What does "Geschäftsführung" refer to?', options: ['business travel', 'business management/executive board', 'business plan', 'business ethics'], correctAnswer: 1, competency: 'Business German', level: 'C1' },
  { id: '21-C2', text: 'Which term describes "hostile takeover"?', options: ['freundliche Übernahme', 'Unternehmenskauf', 'feindliche Übernahme', 'Fusion'], correctAnswer: 2, competency: 'Business German', level: 'C2' },

  // Advanced Cultural Concepts (A1-C2)
  { id: '22-A1', text: 'What is the German currency?', options: ['Mark', 'Euro', 'Pfund', 'Dollar'], correctAnswer: 1, competency: 'Advanced Cultural Concepts', level: 'A1' },
  { id: '22-A2', text: 'Which is a famous German car brand?', options: ['Toyota', 'BMW', 'Ford', 'Peugeot'], correctAnswer: 1, competency: 'Advanced Cultural Concepts', level: 'A2' },
  { id: '22-B1', text: 'What is "Bundestag"?', options: ['German president', 'German parliament', 'German court', 'German military'], correctAnswer: 1, competency: 'Advanced Cultural Concepts', level: 'B1' },
  { id: '22-B2', text: 'What does "soziale Marktwirtschaft" mean?', options: ['social media marketing', 'social market economy', 'socialist economy', 'market socialism'], correctAnswer: 1, competency: 'Advanced Cultural Concepts', level: 'B2' },
  { id: '22-C1', text: 'What is the concept of "Mitbestimmung" in German business?', options: ['self-determination', 'co-determination/worker participation', 'decision-making', 'management consultation'], correctAnswer: 1, competency: 'Advanced Cultural Concepts', level: 'C1' },
  { id: '22-C2', text: 'Which philosophical concept is deeply rooted in German culture?', options: ['Pragmatismus', 'Existenzialismus', 'Bildung (self-cultivation through education)', 'Materialismus'], correctAnswer: 2, competency: 'Advanced Cultural Concepts', level: 'C2' }
];

// Function to get questions for a specific step
export const getQuestionsForStep = (step: number): Question[] => {
  let levels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[];
  
  if (step === 1) {
    levels = ['A1', 'A2'];
  } else if (step === 2) {
    levels = ['B1', 'B2'];
  } else {
    levels = ['C1', 'C2'];
  }
  
  // Get 2 questions from each specified levels (44 total)
  const selectedQuestions: Question[] = [];
  
  for (let i = 1; i <= 22; i++) {
    const competencyQuestions = questionPool.filter(q => {
      return q.competency === getCompetencyName(i) && levels.includes(q.level);
    });
    
    // Select 2 questions
    if (competencyQuestions.length >= 2) {
      selectedQuestions.push(competencyQuestions[0], competencyQuestions[1]);
    }
  }
  
  return selectedQuestions.slice(0, 44);
};

// Helper function
const getCompetencyName = (index: number): string => {
  const competencies = [
    'Basic Greetings',
    'Basic Vocabulary',
    'Numbers and Time',
    'Family and Relationships',
    'Food and Drinks',
    'Articles and Grammar',
    'Verb Conjugations',
    'Prepositions and Cases',
    'Travel and Transportation',
    'Work and Professions',
    'Shopping and Money',
    'Weather and Seasons',
    'Health and Body',
    'Hobbies and Leisure',
    'Education and Learning',
    'Technology and Communication',
    'Culture and Traditions',
    'Complex Grammar',
    'Idiomatic Expressions',
    'Regional Differences',
    'Business German',
    'Advanced Cultural Concepts'
  ];
  
  return competencies[index - 1] || '';
};

// Function to shuffle questions
export const shuffleQuestions = (questions: Question[]): Question[] => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to calculate score with new scoring system
export const calculateScore = (answers: {questionId: string, answer: number}[], totalQuestions: number): number => {
  // Validate answers is an array
  if (!Array.isArray(answers)) {
    answers = [];
  }
  
  let score = 0;
  const answeredQuestions = new Set();
  
  // Process answered questions
  answers.forEach(answer => {
    const question = questionPool.find(q => q.id === answer.questionId);
    if (question) {
      answeredQuestions.add(answer.questionId);
      if (question.correctAnswer === answer.answer) {
        score += 1; // +1 for correct answer
      } else {
        score -= 0.5; // -0.5 for wrong answer
      }
    }
  });
  
  // Process unanswered questions (-0.5 each)
  const totalAvailableQuestions = Math.min(totalQuestions || 20, questionPool.length);
  const unansweredCount = totalAvailableQuestions - answeredQuestions.size;
  score -= (unansweredCount * 0.5);
  
  // Convert to percentage (assuming max possible score is totalQuestions * 1)
  const maxPossibleScore = totalAvailableQuestions;
  const percentage = Math.max(0, Math.round((score / maxPossibleScore) * 100));
  
  return percentage;
};

// Export competency list
export const competencyList = [
  'Basic Greetings',
  'Basic Vocabulary',
  'Numbers and Time',
  'Family and Relationships',
  'Food and Drinks',
  'Articles and Grammar',
  'Verb Conjugations',
  'Prepositions and Cases',
  'Travel and Transportation',
  'Work and Professions',
  'Shopping and Money',
  'Weather and Seasons',
  'Health and Body',
  'Hobbies and Leisure',
  'Education and Learning',
  'Technology and Communication',
  'Culture and Traditions',
  'Complex Grammar',
  'Idiomatic Expressions',
  'Regional Differences',
  'Business German',
  'Advanced Cultural Concepts'
];

export default questionPool;