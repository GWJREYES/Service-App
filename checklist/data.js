// Groundworks S.E.R.V.I.C.E. appointment data + brand tokens.
// Plain globals (no JSX) so it loads fast before the React scripts.

window.GW = {
  navy:       '#1B2C4F',
  navyDeep:   '#15233F',
  slate:      '#7AA4C0',
  slateSoft:  '#AAC6D8',
  slateWash:  '#E7EEF4',
  gold:       '#C49A4C',
  goldSoft:   '#E4D2A6',
  ink:        '#232A33',
  muted:      '#6B7482',
  faint:      '#97A0AC',
  line:       '#E3E7EC',
  panel:      '#F4F6F9',
  panelDeep:  '#EBEFF4',
  footer:     '#54585F',
  white:      '#FFFFFF',
  green:      '#3E8E5A',
  greenWash:  '#E6F1EA',
};

// 7 stages. Each item expands into concrete sub-tasks a tech checks off.
window.SERVICE = [
  {
    key: 'scout', letter: 'S', name: 'Scout',
    tagline: 'Prepare for the appointment',
    items: [
      { id: 'scout-lead', title: 'Project Info & Lead Ticket Review', subtasks: [
        'Review the original problem on the lead ticket',
        'Review the original project & products installed',
        'Note the customer’s past projects',
      ]},
      { id: 'scout-type', title: 'Appointment Type', subtasks: [
        { text: 'Confirm the appointment type', hint: 'Proactive or Reactive' },
        { text: 'Flag the visit type', hint: 'Yes-1, Prepaid, or Cashless' },
        'For reactive visits, note the customer’s possible issue',
        'Confirm materials are on hand for any repair / replacement',
      ]},
      { id: 'scout-concerns', title: 'Previous Concerns & Note Review', subtasks: [
        'Review previous customer concerns',
        'Note whether each was resolved — and why / how',
        'Review previous service appointments',
      ]},
      { id: 'scout-photos', title: 'Photo Review', subtasks: [
        'Review exterior photos on file',
        'Interior — drywall cracks, seams, or sticking?',
        'Concrete — cracking or settling?',
        'Doors / windows — misaligned or sticking?',
        'Flag prior repairs, water damage, stains, or settlement',
        'Basement walls — bowing, cracks, or water intrusion?',
      ]},
      { id: 'scout-prep', title: 'Prep & Customer Setup', subtasks: [
        { text: 'Open inspection links & documents to review', hint: 'Pull the records you’ll need before the visit' },
        'Check SMP status',
        'Review location & the past state of the home',
        'Confirm the introductory call is scheduled',
      ]},
      { id: 'scout-opportunity', title: 'Additional Service Opportunity', subtasks: [
        'Review any un-sold quotes',
        { text: 'Note ways to go above & beyond for this customer', hint: 'Heat, upsell, education, follow-up' },
      ]},
    ],
  },
  {
    key: 'engage', letter: 'E', name: 'Engage',
    tagline: 'Make a great first impression',
    items: [
      { id: 'eng-intro-call', title: 'Introductory Call', subtasks: [
        'Call to confirm the appointment window',
        'Verify address, gate codes, parking & pets',
        'Set expectations for how long the visit takes',
      ], script: {
        lines: [
          'Hi, this is <Name> with Groundworks, may I speak with <First Name, Last Name>?',
          'I’m your service technician for our visit. I am calling to remind you of our appointment at <time>.',
          'Is there anything that I should know about before the visit?',
          'Okay great! One last thing, do you have a place we can sit down to review your system, before I start my service?',
          'I look forward to meeting you and will give you a call when I am about 30 minutes away.',
        ],
        keyPhrase: 'Introductory Call',
      }},
      { id: 'eng-intro-vm', title: 'Introductory Voicemail / Text', subtasks: [
        'If no answer, leave a friendly voicemail',
        { text: 'Send an intro text with your name', hint: 'Place the call through the On The Way app so it logs into Modern' },
      ], script: {
        lines: [
          'Hi, this is <Name> with Groundworks.',
          'I have an appointment scheduled with you and have a few questions.',
          'Please call me back as soon as you’re able.',
        ],
        keyPhrase: 'Voicemail Script',
      }},
      { id: 'eng-otw-call', title: 'On The Way Call', subtasks: [
        'Call when en route with an honest ETA',
        'Confirm the customer will be home',
      ], script: {
        lines: [
          'Hi, this is <Name> with Groundworks, may I speak with <First Name, Last Name>?',
          'I am on my way to your home and should arrive in about 30 minutes.',
          'Would it be okay for me to park in the street, or would another area be better for you?',
          'You will receive a text message shortly, where you can track and see my exact location.',
        ],
        keyPhrase: 'On the Way Call',
        reminder: 'Just a quick reminder, we’ll need a place where we can sit for just a moment to review your system before I begin my service.',
      }},
      { id: 'eng-arrival', title: 'Arrival', subtasks: [
        'Park considerately; wear branded gear & PPE',
        'Shake hands and introduce yourself with badge visible',
        'Compliment something about the house or something you notice',
        'Lay down drop cloths / shoe covers',
      ], script: {
        blocks: [
          { type: 'key', text: 'At the Door' },
          { type: 'line', text: 'Earlier you said there was a place inside we could sit down. Show me the way.' },
        ],
      }},
    ],
  },
  {
    key: 'review', letter: 'R', name: 'Review',
    tagline: 'Understand the customer',
    items: [
      { id: 'rev-concerns', title: 'Customer Concerns', subtasks: [
        'Ask what prompted the call today',
        'Take notes on every concern raised',
        'Repeat it back to confirm you understand',
      ], script: {
        label: 'Table script',
        blocks: [
          { type: 'key', text: 'At the Table' },
          { type: 'line', text: 'Thank you for having me out today. I would like to take a moment to go over what we will do during today’s visit — sound good?' },
          { type: 'line', text: 'We’ll start with any questions you have, as well as a quick review of the systems we have installed.' },
          { type: 'line', text: 'I will have a few questions for you as well, just so I am completely up to speed on your home.' },
          { type: 'line', text: 'I’ll begin an interior and exterior inspection of your home, then head straight underneath to perform maintenance on your existing systems.' },
          { type: 'line', text: 'As soon as I finish, we can sit down to review your service report and how everything looks.' },
          { type: 'line', text: 'I work on hundreds of homes each year — I know how to get it done right!' },
          { type: 'key', text: 'Customer Review' },
          { type: 'line', text: 'So first, what questions do you have for me?' },
        ],
      }},
      { id: 'rev-systems', title: 'Existing Systems & Prior Appointments', subtasks: [
        { text: 'Confirm Problem, Project, & Product', hint: 'Have GSS open and ready to reference' },
        'Translate equipment into project language',
      ], script: {
        label: 'Table script',
        blocks: [
          { type: 'key', text: 'Translate equipment into project language' },
          { type: 'line', text: '“I see you were having an issue with moisture in the crawlspace, so we Changed The Environment down there with our 120 mil CrawlSeal, Crawlspace Air System and Crawlspace Door.”' },
        ],
      }},
      { id: 'rev-quest', title: 'Questionnaire', subtasks: [
        'Complete the discovery questionnaire',
        'Capture water intrusion, cracks & timeline',
      ], script: {
        lines: [
          'Walk me through anything you’ve noticed since we were last here.',
          'Tell me more about that ______',
          'When did you first notice that?',
          'Let’s talk about moisture — have you picked up on anything unusual with humidity or water?',
          'What have you noticed about the interior walls, ceilings, or doorways?',
          'I’m going to take a look at the foundation and floors today. Anything in those areas catching your attention?',
          'What changes have you observed with the concrete surfaces around your property?',
        ],
        label: 'Table script',
        keyPhrase: 'Questions in GSS',
      }},
      { id: 'rev-transition', title: 'Key Phrase to Interior Inspection', subtasks: [
        'Set the key phrase before you begin the interior inspection',
        'Confirm the customer wants you to knock when you’re finished',
      ], script: {
        label: 'Table script',
        blocks: [
          { type: 'key', text: 'To Interior Inspection' },
          { type: 'line', text: 'Should I find anything of concern, whether we fix it or not, such as a plumbing leak or anything — would you like me to bring it to your attention?' },
          { type: 'key', text: 'To Exterior PEPs' },
          { type: 'line', text: '“…once I have completed everything, would you like for me to knock on the door?”' },
        ],
      }},
    ],
  },
  {
    key: 'verify', letter: 'V', name: 'Verify',
    tagline: 'Inspect & document everything',
    items: [
      { id: 'ver-int-pep', title: 'Interior PEPs', subtasks: [
        'Capture wide + detail photos of every interior issue',
        'Label each photo to its location',
      ]},
      { id: 'ver-int-insp', title: 'Interior Inspection', subtasks: [
        'Inspect basement / crawlspace, walls & floors',
        'Measure cracks and take moisture readings',
      ]},
      { id: 'ver-ext-pep', title: 'Exterior PEPs', subtasks: [
        'Photograph grading, gutters & foundation',
      ]},
      { id: 'ver-ext-insp', title: 'Exterior Inspection', subtasks: [
        'Walk the full perimeter',
        'Note drainage, soil & settlement signs',
      ]},
      { id: 'ver-drawing', title: 'Drawing', subtasks: [
        'Sketch the foundation plan with measurements',
        'Mark problem areas and proposed work',
      ]},
    ],
  },
  {
    key: 'impact', letter: 'I', name: 'Impact',
    tagline: 'Build the plan',
    items: [
      { id: 'imp-maint', title: 'Maintain Existing Systems', subtasks: [
        'Service & test any systems already installed',
        'Photograph their current condition',
      ]},
      { id: 'imp-cxp', title: 'CXPs', subtasks: [
        'Prepare the Customer Experience Plan options',
        'Match each option to a stated concern',
      ]},
      { id: 'imp-flight', title: 'Flight Plan', flag: true, subtasks: [
        'Build the recommended scope of work',
        'Prioritize repairs by urgency & risk',
      ]},
      { id: 'imp-record', title: 'Service Record', subtasks: [
        'Document all findings and work performed',
      ]},
    ],
  },
  {
    key: 'convert', letter: 'C', name: 'Convert',
    tagline: 'Present & close',
    items: [
      { id: 'con-review', title: 'Review CXPs', subtasks: [
        'Walk through the plan options together',
      ]},
      { id: 'con-convert', title: 'Convert', subtasks: [
        'Present pricing and financing options',
        'Ask for the sale and sign the agreement',
      ]},
      { id: 'con-educate', title: 'Educate', subtasks: [
        'Explain the “why” behind each recommendation',
        'Answer questions in plain language',
      ]},
      { id: 'con-cart', title: 'Build the Cart', subtasks: [
        'Add products & services; confirm totals',
      ]},
    ],
  },
  {
    key: 'extend', letter: 'E', name: 'Extend',
    tagline: 'Lock in next steps',
    items: [
      { id: 'ext-schedule', title: 'Schedule', subtasks: [
        'Book the install / follow-up date',
        'Confirm next steps & best contact method',
      ]},
      { id: 'ext-dispo', title: 'Dispo', subtasks: [
        'Set the appointment disposition',
        'Submit paperwork & photos before you leave',
      ]},
    ],
  },
];

// Flatten helper: total sub-tasks across everything.
window.SERVICE_TOTAL = window.SERVICE.reduce(
  (n, s) => n + s.items.reduce((m, i) => m + i.subtasks.length, 0), 0);
