require('dotenv').config();
const mongoose = require('mongoose');
const { FAQ, Subject } = require('./models');

const subjects = [
  {
    code: 'UCB009', name: 'Chemistry', credits: 4.0, pool: 'A', ltp: '3-0-2',
    attendance: 'Medium strictness', detain: 'High',
    topics: ['Spectroscopy', 'Electrochemistry', 'Water Treatment', 'Fuels', 'Polymers', 'SMILES'],
    tips: [
      'Study from the faculty PPTs, not from reference books. Papers are set directly from the slides.',
      'This subject rewards memorisation. Learn each concept properly instead of skimming.',
      'Quizzes carry real weight here, so prepare for every one of them.',
      'Attend all labs. Detention in Chemistry is common and avoidable.'
    ]
  },
  {
    code: 'UES013', name: 'Electrical & Electronics', credits: 4.5, pool: 'A', ltp: '3-1-2',
    attendance: 'Medium strictness', detain: 'Medium',
    topics: ['DC Circuits', 'AC Circuits', 'Digital Logic', 'Electronic Devices', 'Op-Amps'],
    tips: [
      'The paper is heavily numerical. Solve every numerical from the tutorial sheets.',
      'Labs count for a solid chunk of the grade, so do not skip them.',
      'Digital Logic is the easiest scoring section. Lock it down early.'
    ]
  },
  {
    code: 'UMA010', name: 'Mathematics I', credits: 3.5, pool: 'A', ltp: '3-1-0',
    attendance: 'Low strictness', detain: 'Low',
    topics: ['Series', 'Partial Differentiation', 'Multiple Integrals', 'Complex Analysis'],
    tips: [
      'Follow the Harish Garg YouTube channel. It matches this syllabus almost exactly.',
      'Work through every solved example by hand instead of reading the solution.',
      'Attendance is relaxed, but the paper is not. Keep up with the practice.'
    ]
  },
  {
    code: 'UEN008', name: 'Energy & Environment', credits: 3.0, pool: 'A', ltp: '3-0-0',
    attendance: 'High strictness', detain: 'High',
    topics: ['Sustainability', 'Air Pollution', 'Water Pollution', 'Solid Waste', 'Energy Resources'],
    tips: [
      'Attendance matters more here than in any other first year subject.',
      'The PPTs are the syllabus. Everything on the paper comes from them.',
      'Put real effort into the project. It is an easy way to pull the grade up.'
    ]
  },
  {
    code: 'UES103', name: 'Programming in C', credits: 4.0, pool: 'A', ltp: '3-0-2',
    attendance: 'Low strictness', detain: 'Low',
    topics: ['Basics', 'Control Flow', 'Arrays', 'Functions', 'Pointers', 'Structures', 'File I/O'],
    tips: [
      'The most important first year subject for CSE. Everything in DSA builds on this.',
      'Attend every lab and solve the lab questions yourself before looking at answers.',
      'Pointers are where most people fall behind. Spend extra time there.',
      'Low attendance requirement is a trap. Falling behind here costs you in second year.'
    ]
  },
  {
    code: 'UMA004', name: 'Mathematics II', credits: 3.5, pool: 'B', ltp: '3-1-0',
    attendance: 'Low strictness', detain: 'Low',
    topics: ['Linear Algebra', 'ODEs', 'Laplace Transform', 'Fourier Series'],
    tips: [
      'Same approach as Mathematics I. Harish Garg covers this syllabus well.',
      'Linear Algebra pays off later in ML and graphics, so learn it properly.',
      'Laplace and Fourier are formula heavy. Build a formula sheet from week one.'
    ]
  },
  {
    code: 'UPH001', name: 'Physics I', credits: 4.5, pool: 'B', ltp: '3-1-2',
    attendance: 'Medium strictness', detain: 'Medium',
    topics: ['Sound Waves', 'EM Waves', 'Interference & Diffraction', 'Polarization', 'Quantum Mechanics', 'Laser'],
    tips: [
      'Class lectures and faculty slides cover the paper. Use YouTube only to fill gaps.',
      'Lab attendance is mandatory and the lab file is graded.',
      'Quantum Mechanics looks intimidating but the questions asked are standard.'
    ]
  },
  {
    code: 'UES102', name: 'Manufacturing Processes', credits: 3.0, pool: 'B', ltp: '2-0-2',
    attendance: 'High strictness', detain: 'High',
    topics: ['Machining', 'Metal Casting', 'Metal Forming', 'Joining', 'Smart Manufacturing'],
    tips: [
      'Every lab session carries marks. Missing one directly costs you.',
      'The theory is pure memorisation from the PPTs. Revise them repeatedly.',
      'High detention risk. Track your attendance from the first week.'
    ]
  },
  {
    code: 'PHU003', name: 'Professional Communication', credits: 3.5, pool: 'B', ltp: '3-1-0',
    attendance: 'Low strictness', detain: 'Low',
    topics: ['Communication theory', 'Written communication', 'Presentations', 'Interviews', 'Creative writing'],
    tips: [
      'The lightest subject of the semester. Two days of revision is enough for the paper.',
      'Attend the practical sessions. Presentations and activities are graded there.',
      'The interview module is genuinely useful later. Do not treat it as filler.'
    ]
  },
  {
    code: 'UES101', name: 'Engineering Drawing', credits: 4.0, pool: 'B', ltp: '2-4-0',
    attendance: 'Low strictness', detain: 'Low',
    topics: ['2D Drafting', '3D Modelling', 'Orthographic Projection', 'Isometric Projection', 'CAD'],
    tips: [
      'Almost entirely lab and CAD based. There is very little to read.',
      'Practise the tutorial sheets on your own laptop between sessions.',
      'Weekly lab marks are counted directly, so finish each sheet on time.'
    ]
  }
];

const faqs = [
  { category: 'academics', isFree: true,
    question: 'How should I prepare for quizzes?',
    answer: 'Studying properly 2-3 days before the quiz is enough to do well.' },
  { category: 'academics', isFree: true,
    question: 'How much weightage does the MST carry?',
    answer: 'Usually 30%, though it drops to around 25% in one or two subjects.' },
  { category: 'academics', isFree: true,
    question: 'How important are labs for the overall grade?',
    answer: 'Very important - labs typically carry close to 20 marks out of 100. Scoring well in labs makes a real difference to your total.' },
  { category: 'academics', isFree: true,
    question: 'Is tutorial attendance mandatory?',
    answer: 'Not strictly mandatory, but attending helps a lot since tutorials double as practice, and exams are largely tutorial-based.' },
  { category: 'academics', isFree: false,
    question: 'Are previous year papers helpful for exam prep?',
    answer: 'Yes, they are one of the best ways to prepare - many exam questions follow a similar pattern year to year.' },
  { category: 'academics', isFree: false,
    question: 'Are practicals graded separately from theory?',
    answer: 'Yes, subjects with labs usually have separate practical marks alongside the theory exam, and both need to be cleared independently.' },
  { category: 'academics', isFree: true,
    question: 'Is attendance strict in every subject?',
    answer: 'No - it varies. Some subjects are strict about it, others are relaxed.' },
  { category: 'academics', isFree: true,
    question: 'Which subjects have the highest detention risk in first year?',
    answer: 'Manufacturing Processes and Environmental Science see the most detentions in first year.' },
  { category: 'academics', isFree: false,
    question: 'Are classes online or offline?',
    answer: 'Offline.' },
  { category: 'academics', isFree: false,
    question: 'Is the first year syllabus heavy?',
    answer: 'No, it is noticeably lighter compared to later years.' },
  { category: 'academics', isFree: false,
    question: 'Will exam patterns and marking schemes be explained in advance?',
    answer: 'Yes, your teacher will go over this in class.' },
  { category: 'academics', isFree: true,
    question: 'How is the faculty in first year?',
    answer: 'Quite good, and reasonably accommodating with students.' },
  { category: 'academics', isFree: false,
    question: 'What is the best way to score well?',
    answer: 'Staying consistent with tutorials and solving previous year questions (PYQs) leads to a good score.' },
  { category: 'hostel', isFree: true,
    question: 'How is the hostel overall?',
    answer: 'Good - hostels have WiFi and things generally run smoothly.' },
  { category: 'hostel', isFree: true,
    question: 'Are there issues with electricity or water?',
    answer: 'No, there are no issues with either.' },
  { category: 'hostel', isFree: false,
    question: 'What is the hostel mess food like?',
    answer: 'Decent and filling, though most students supplement it with outside food occasionally for variety.' },
  { category: 'hostel', isFree: true,
    question: 'Are washrooms and laundry facilities decent?',
    answer: 'Yes, washrooms are fine, and laundry service is available - you will need to get a laundry card made.' },
  { category: 'hostel', isFree: false,
    question: 'Do I need to bring my own bedding and essentials?',
    answer: 'Yes, bring your own bedding, pillow, and daily essentials - the hostel provides the room and furniture but not these items.' },
  { category: 'hostel', isFree: true,
    question: 'What is the hostel curfew?',
    answer: 'You need to be back before 8:30 PM, and can step out again after 6 AM.' },
  { category: 'hostel', isFree: true,
    question: 'Does ragging happen?',
    answer: 'No, absolutely not.' },
  { category: 'hostel', isFree: false,
    question: 'Is there a study room in the hostel?',
    answer: 'Yes, hostels have a study room you can use.' },
  { category: 'hostel', isFree: false,
    question: 'Can I change my hostel room?',
    answer: 'Talk to the caretaker - if a room is available, it can be changed.' },
  { category: 'campus', isFree: true,
    question: 'Are there enough societies to join?',
    answer: 'Yes, plenty of societies covering different interests.' },
  { category: 'campus', isFree: false,
    question: 'Is there an official fresher party?',
    answer: 'No official one, but unofficial fresher parties do happen.' },
  { category: 'campus', isFree: true,
    question: 'What are the major fests?',
    answer: 'Two big fests each year - Saturnalia and Urja (Urja is the sports fest).' },
  { category: 'campus', isFree: false,
    question: 'Do hostels have a gym?',
    answer: 'Yes, every hostel has its own gym.' },
  { category: 'campus', isFree: true,
    question: 'How is the library?',
    answer: 'Quite good and spacious, with WiFi and AC. Open until 8:30 PM normally, with extended hours during exams.' },
  { category: 'campus', isFree: false,
    question: 'Is WiFi reliable across campus?',
    answer: 'Yes, no real issues.' },
  { category: 'campus', isFree: false,
    question: 'Is there a medical facility on campus?',
    answer: 'Yes, there is a health centre on campus for basic medical needs and emergencies.' },
  { category: 'campus', isFree: false,
    question: 'Are ATMs available on campus?',
    answer: 'Yes, ATMs are available within campus for convenience.' },
  { category: 'campus', isFree: false,
    question: 'How do I get my student ID card made?',
    answer: 'It is issued during orientation/admission in the first week, so complete that formality early.' },
  { category: 'campus', isFree: true,
    question: 'What is nearby campus for shopping or food?',
    answer: 'Right next to campus is 22 Number, Patiala\'s well-known market area.' },
  { category: 'campus', isFree: false,
    question: 'Is the student community diverse?',
    answer: 'Yes, students come from many different cultural backgrounds.' },
  { category: 'campus', isFree: true,
    question: 'Does ragging happen on campus generally?',
    answer: 'No, ragging does not happen at all.' },
  { category: 'campus', isFree: false,
    question: 'Are seniors approachable and helpful?',
    answer: 'Yes, seniors are quite helpful.' }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Subject.deleteMany({});
    await FAQ.deleteMany({});
    await Subject.insertMany(subjects);
    await FAQ.insertMany(faqs);
    console.log('Seeded ' + subjects.length + ' subjects and ' + faqs.length + ' FAQs');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
