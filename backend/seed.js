require('dotenv').config();
const mongoose = require('mongoose');
const { FAQ, Subject } = require('./models');

const subjects = [{
        code: 'UCB009',
        name: 'Chemistry',
        credits: 4.0,
        pool: 'A',
        ltp: '3-0-2',
        attendance: 'Medium strictness',
        detain: 'moderate',
        topics: ['Spectroscopy', 'Electrochemistry', 'Water Treatment', 'Fuels', 'Polymers', 'SMILES'],
        tips: [
            'Study from the faculty PPTs, not from reference books. Papers are set directly from the slides.',
            'This subject rewards memorisation. Learn each concept properly instead of skimming.',
            'Quizzes carry real weight here, so prepare for every one of them.',
            'Attend all labs. Detention in Chemistry is common and avoidable.'
        ]
    },
    {
        code: 'UES013',
        name: 'Electrical & Electronics',
        credits: 4.5,
        pool: 'A',
        ltp: '3-1-2',
        attendance: 'Medium strictness',
        detain: 'Moderate',
        topics: ['DC Circuits', 'AC Circuits', 'Digital Logic', 'Electronic Devices', 'Op-Amps'],
        tips: [
            'The paper is heavily numerical. Solve every numerical from the tutorial sheets.',
            'Labs count for a solid chunk of the grade, so do not skip them.',
            'Digital Logic is the easiest scoring section. Lock it down early.'
        ]
    },
    {
        code: 'UMA010',
        name: 'Mathematics I',
        credits: 3.5,
        pool: 'A',
        ltp: '3-1-0',
        attendance: 'Less strictness',
        detain: 'low',
        topics: ['Series', 'Partial Differentiation', 'Multiple Integrals', 'Complex Analysis'],
        tips: [
            'Follow the Harish Garg YouTube channel. It matches this syllabus almost exactly.',
            'Work through every solved example by hand instead of reading the solution.',
            'Attendance is relaxed, but the paper is not. Keep up with the practice.'
        ]
    },
    {
        code: 'UEN008',
        name: 'Energy & Environment',
        credits: 3.0,
        pool: 'A',
        ltp: '3-0-0',
        attendance: 'High strictness',
        detain: 'High risk',
        topics: ['Sustainability', 'Air Pollution', 'Water Pollution', 'Solid Waste', 'Energy Resources'],
        tips: [
            'Attendance matters more here than in any other first year subject.',
            'The PPTs are the syllabus. Everything on the paper comes from them.',
            'Put real effort into the project. It is an easy way to pull the grade up.'
        ]
    },
    {
        code: 'UES103',
        name: 'Programming in C',
        credits: 4.0,
        pool: 'A',
        ltp: '3-0-2',
        attendance: 'Very Low',
        detain: 'low chances',
        topics: ['Basics', 'Control Flow', 'Arrays', 'Functions', 'Pointers', 'Structures', 'File I/O'],
        tips: [
            'The most important first year subject for CSE. Everything in DSA builds on this.',
            'Attend every lab and solve the lab questions yourself before looking at answers.',
            'Pointers are where most people fall behind. Spend extra time there.',
            'Low attendance requirement is a trap. Falling behind here costs you in second year.'
        ]
    },
    {
        code: 'UMA004',
        name: 'Mathematics II',
        credits: 3.5,
        pool: 'B',
        ltp: '3-1-0',
        attendance: 'Low',
        detain: 'low chances',
        topics: ['Linear Algebra', 'ODEs', 'Laplace Transform', 'Fourier Series'],
        tips: [
            'Same approach as Mathematics I. Harish Garg covers this syllabus well.',
            'Linear Algebra pays off later in ML and graphics, so learn it properly.',
            'Laplace and Fourier are formula heavy. Build a formula sheet from week one.'
        ]
    },
    {
        code: 'UPH001',
        name: 'Physics I',
        credits: 4.5,
        pool: 'B',
        ltp: '3-1-2',
        attendance: 'Medium',
        detain: 'Moderate',
        topics: ['Sound Waves', 'EM Waves', 'Interference & Diffraction', 'Polarization', 'Quantum Mechanics', 'Laser'],
        tips: [
            'Class lectures and faculty slides cover the paper. Use YouTube only to fill gaps.',
            'Lab attendance is mandatory and the lab file is graded.',
            'Quantum Mechanics looks intimidating but the questions asked are standard.'
        ]
    },
    {
        code: 'UES102',
        name: 'Manufacturing Processes',
        credits: 3.0,
        pool: 'B',
        ltp: '2-0-2',
        attendance: 'High',
        detain: 'High risk',
        topics: ['Machining', 'Metal Casting', 'Metal Forming', 'Joining', 'Smart Manufacturing'],
        tips: [
            'Every lab session carries marks. Missing one directly costs you.',
            'The theory is pure memorisation from the PPTs. Revise them repeatedly.',
            'High detention risk. Track your attendance from the first week.'
        ]
    },
    {
        code: 'PHU003',
        name: 'Professional Communication',
        credits: 3.5,
        pool: 'B',
        ltp: '3-1-0',
        attendance: 'Low',
        detain: 'less chances',
        topics: ['Communication theory', 'Written communication', 'Presentations', 'Interviews', 'Creative writing'],
        tips: [
            'The lightest subject of the semester. Two days of revision is enough for the paper.',
            'Attend the practical sessions. Presentations and activities are graded there.',
            'The interview module is genuinely useful later. Do not treat it as filler.'
        ]
    },
    {
        code: 'UES101',
        name: 'Engineering Drawing',
        credits: 4.0,
        pool: 'B',
        ltp: '2-4-0',
        attendance: 'Low',
        detain: 'No',
        topics: ['2D Drafting', '3D Modelling', 'Orthographic Projection', 'Isometric Projection', 'CAD'],
        tips: [
            'Almost entirely lab and CAD based. There is very little to read.',
            'Practise the tutorial sheets on your own laptop between sessions.',
            'Weekly lab marks are counted directly, so finish each sheet on time.'
        ]
    }
];

const faqs = [{
        category: 'general',
        isFree: true,
        question: 'What is the difference between Pool A and Pool B?',
        answer: 'In the first semester the pool is not fixed by branch. Roughly half the batch gets Pool A and half gets Pool B. You study all ten subjects across the first year either way, only the order changes.'
    },
    {
        category: 'academics',
        isFree: true,
        question: 'How much attendance do I need to avoid detention?',
        answer: 'The official requirement is 75%. Chemistry, Energy & Environment and Manufacturing Processes are the strictest in practice, and most detention cases come from those three.'
    },
    {
        category: 'academics',
        isFree: true,
        question: 'How is CGPA calculated?',
        answer: 'Each subject grade point is multiplied by its credits, then divided by total credits. High credit subjects like Physics and Electrical & Electronics (4.5 each) move your CGPA more than the lighter ones.'
    },
    {
        category: 'campus',
        isFree: true,
        question: 'Does ragging happen on campus?',
        answer: 'No. There is a strict zero tolerance policy and an active anti-ragging committee. Seniors are generally approachable and helpful.'
    },
    {
        category: 'hostel',
        isFree: true,
        question: 'What is hostel life like?',
        answer: 'Rooms come with WiFi, and there is mess, gym and study room access. Roommate allotment is random. Bring your own extension board, lock and laptop.'
    },
    {
        category: 'academics',
        isFree: true,
        question: 'Do I need tuition or coaching in first year?',
        answer: 'No. Faculty PPTs, YouTube for maths, and a study group cover everything. Nobody in first year needs paid coaching.'
    },
    {
        category: 'academics',
        isFree: true,
        question: 'Which first year subject is the hardest?',
        answer: 'Most students find Chemistry and Engineering Drawing the most demanding. Chemistry needs heavy memorisation and Engineering Drawing needs consistent CAD practice every week.'
    },
    {
        category: 'academics',
        isFree: false,
        question: 'How important is Programming in C for CSE students?',
        answer: 'It is the single most important first year subject for CSE. DSA in second year assumes you are fluent in it. Attend every lab and write the lab programs yourself.'
    },
    {
        category: 'academics',
        isFree: false,
        question: 'What is the best resource for Mathematics?',
        answer: 'The Harish Garg YouTube channel covers both Mathematics I and II closely. Solve every example by hand rather than watching passively.'
    },
    {
        category: 'campus',
        isFree: false,
        question: 'Do I need to bring a laptop?',
        answer: 'Yes. Engineering Drawing CAD work and the programming labs both need one. Any mid range machine with 8GB RAM and an SSD is enough.'
    },
    {
        category: 'campus',
        isFree: false,
        question: 'Should I join societies in first year?',
        answer: 'Join one or two, ideally a coding or technical club. More than that and academics slip while you are still settling in.'
    },
    {
        category: 'academics',
        isFree: false,
        question: 'What happens if I miss labs?',
        answer: 'In Manufacturing Processes and Engineering Drawing every session carries marks, so a missed lab is a direct loss. Chemistry and Physics labs have mandatory attendance too.'
    },
    {
        category: 'general',
        isFree: false,
        question: 'When do placements start mattering?',
        answer: 'Placements happen in third and fourth year, but your CGPA from first year carries into the eligibility cutoffs. Keeping a clean first year makes the later shortlists much easier.'
    },
    {
        category: 'hostel',
        isFree: false,
        question: 'Can I go home on weekends?',
        answer: 'Yes, with the standard leave process through the hostel warden. Plan around quizzes and lab submissions, which are usually scheduled midweek.'
    }
];

(async() => {
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