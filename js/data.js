/*
 * Sample data for the demo.
 * Everything here is made-up sample content. Replace it with your own
 * college's procedures, books and equipment.
 */
window.CRP_DATA = {
  APP_NAME: 'Campus Nexus',

  STUDENT: { name: 'Demo Student', year: '3rd year' },

  /* ---------- Demo accounts, shown on the login screen ---------- */
  DEMO_STUDENT: { name: 'Demo Student' },
  DEMO_ADMIN: { name: 'Demo Admin' },

  /* ---------- Faculty in-charges: cabin and hours, used to show whether
     someone is available right now, and when they'll next be in ---------- */
  approvers: {
    'Class Coordinator': { cabin: 'Room 214, Block A', hours: ['10:00-13:00', '14:00-16:30'] },
    'Department Office': { cabin: 'Admin Block, ground floor', hours: ['09:30-17:00'] },
    'Lab In-charge': { cabin: 'ECE Lab 2 office, ground floor', hours: ['09:00-12:00', '13:00-16:00'] }
  },

  /* ---------- Permissions and documents ---------- */
  /* `small: true` means the request can be sent and approved on WhatsApp.
     `small: false` means it's a major request and must be done in person. */
  procedures: [
    {
      id: 'hackathon',
      title: 'Attend a hackathon or external event',
      approver: 'Class Coordinator',
      small: false,
      keywords: ['hackathon', 'event', 'competition', 'fest', 'conclave'],
      whom: 'Class coordinator first, then the Head of Department (HoD)',
      when: 'At least 5 working days before the event',
      how: 'Write a permission letter in the department format, attach the event invitation, and get it signed in that order.',
      where: 'Collect the letter format from the department office',
      turnaround: '2 to 3 working days',
      documents: [
        'Permission letter (department format)',
        'Event invitation or registration confirmation',
        'Guardian consent, if you are travelling outside the city',
        'College ID card'
      ],
      nextStep: 'Collect the signed letter from the department office, then get the HoD signature.'
    },
    {
      id: 'noc',
      title: 'No-objection certificate (internship or external project)',
      approver: 'Class Coordinator',
      small: false,
      keywords: ['noc', 'no objection', 'no-objection', 'internship'],
      whom: 'Class coordinator first, then the HoD',
      when: 'At least 7 working days before the start date',
      how: 'Submit a request letter with the company offer letter, and get both signatures.',
      where: 'Department office',
      turnaround: '3 to 4 working days',
      documents: [
        'NOC request letter',
        'Offer or acceptance letter from the company',
        'Latest internal marks card',
        'College ID card'
      ],
      nextStep: 'Collect the signed NOC from the department office.'
    },
    {
      id: 'bonafide',
      title: 'Bonafide certificate',
      approver: 'Department Office',
      small: true,
      keywords: ['bonafide', 'certificate', 'proof of study'],
      whom: 'Department office, signed by the HoD',
      when: 'Apply 2 working days before you need it',
      how: 'Fill in the bonafide request form and attach the fee receipt.',
      where: 'Administrative office counter',
      turnaround: '1 to 2 working days',
      documents: ['Filled bonafide request form', 'College ID card', 'Latest fee receipt'],
      nextStep: 'Collect the signed certificate from the administrative office counter.'
    },
    {
      id: 'lab-after-hours',
      title: 'Lab access after college hours',
      approver: 'Lab In-charge',
      small: true,
      keywords: ['after hours', 'after college hours', 'after college', 'night access'],
      whom: 'Lab in-charge first, then the HoD',
      when: 'One day before, before 4 PM',
      how: 'Send the project purpose, the time slot you need and your guide’s name.',
      where: 'Lab in-charge’s desk',
      turnaround: 'Same day',
      documents: ['Short note on the project purpose', 'Guide’s recommendation', 'College ID card'],
      nextStep: 'Show the approval to the lab in-charge when you arrive.'
    },
    {
      id: 'leave',
      title: 'Leave of absence (1 to 3 days)',
      approver: 'Class Coordinator',
      small: true,
      keywords: ['leave', 'absent', 'absence'],
      whom: 'Class coordinator',
      when: 'Before the leave. For emergencies, within 2 days after returning.',
      how: 'Submit a leave application with a supporting proof.',
      where: 'Class coordinator, or the department office',
      turnaround: 'Same day',
      documents: ['Leave application', 'Supporting proof', 'College ID card'],
      nextStep: 'Get the approved application stamped at the department office.'
    }
  ],

  /* ---------- Library ---------- */
  books: [
    { id: 'os', type: 'Book', title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', total: 5, available: 2, location: 'Shelf C-14', nextReturn: '', tags: ['os', 'operating system', 'operating systems', 'kernel'] },
    { id: 'cn', type: 'Book', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', total: 4, available: 0, location: 'Shelf C-08', nextReturn: '29 Sep', tags: ['network', 'networks', 'networking', 'tcp'] },
    { id: 'dbms', type: 'Book', title: 'Database System Concepts', author: 'Korth, Silberschatz, Sudarshan', total: 3, available: 1, location: 'Shelf C-10', nextReturn: '', tags: ['database', 'databases', 'dbms', 'sql'] },
    { id: 'algo', type: 'Book', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', total: 4, available: 0, location: 'Shelf B-03', nextReturn: '1 Oct', tags: ['algorithm', 'algorithms', 'dsa', 'data structures'] },
    { id: 'ai', type: 'Book', title: 'Artificial Intelligence: A Modern Approach', author: 'Russell and Norvig', total: 3, available: 3, location: 'Shelf D-02', nextReturn: '', tags: ['ai', 'artificial intelligence', 'machine learning', 'ml'] },
    { id: 'dd', type: 'Book', title: 'Digital Design', author: 'M. Morris Mano', total: 6, available: 4, location: 'Shelf A-11', nextReturn: '', tags: ['digital', 'logic', 'circuits'] },
    { id: 'crypto', type: 'Book', title: 'Cryptography and Network Security', author: 'William Stallings', total: 3, available: 0, location: 'Shelf C-21', nextReturn: '27 Sep', tags: ['security', 'cryptography', 'crypto', 'network security'] },
    { id: 'se', type: 'Book', title: 'Software Engineering', author: 'Roger S. Pressman', total: 4, available: 2, location: 'Shelf B-15', nextReturn: '', tags: ['software', 'engineering', 'se'] },
    { id: 'quiet-seat', type: 'Library resource', title: 'Quiet reading room seat', author: 'First floor', total: 12, available: 5, location: 'First floor', nextReturn: '', tags: ['seat', 'reading room', 'study space', 'quiet'] },
    { id: 'group-room', type: 'Library resource', title: 'Group study room', author: 'Second floor', total: 2, available: 0, location: 'Second floor', nextReturn: 'Today, 3:30 PM', tags: ['group', 'study room', 'study space', 'team'] }
  ],

  /* ---------- Lab equipment ---------- */
  equipment: [
    { id: 'oscilloscope', name: 'Digital oscilloscope', location: 'ECE Lab 2', inCharge: 'ECE Lab 2 In-charge', slot: '2:00 to 4:00 PM', approval: 'Faculty approval required', units: 1, keywords: ['oscilloscope', 'cro'] },
    { id: 'printer', name: '3D printer', location: 'Innovation Lab', inCharge: 'Innovation Lab In-charge', slot: '10:00 AM to 5:00 PM', approval: 'Faculty approval required', units: 1, keywords: ['3d printer', '3d print', 'printer', 'printing'] },
    { id: 'arduino', name: 'Arduino Uno kit', location: 'IoT Lab', inCharge: 'IoT Lab In-charge', slot: 'All day', approval: 'Sign-out with the in-charge', units: 6, keywords: ['arduino'] },
    { id: 'esp32', name: 'ESP32 board with sensors', location: 'IoT Lab', inCharge: 'IoT Lab In-charge', slot: 'All day', approval: 'Sign-out with the in-charge', units: 4, keywords: ['esp32', 'sensor', 'iot'] },
    { id: 'rpi', name: 'Raspberry Pi 4 kit', location: 'IoT Lab', inCharge: 'IoT Lab In-charge', slot: 'All day', approval: 'Sign-out with the in-charge', units: 3, keywords: ['raspberry', 'rpi', 'pi 4'] },
    { id: 'multimeter', name: 'Digital multimeter', location: 'Electronics Lab 1', inCharge: 'Electronics Lab 1 In-charge', slot: '9:00 AM to 4:00 PM', approval: 'Sign-out with the in-charge', units: 5, keywords: ['multimeter'] }
  ]
};
