export interface Script {
  id: string;
  name: string;
  content: string;
  objections: ObjectionMap;
}

export interface ObjectionMap {
  [category: string]: {
    [objection: string]: string[];
  };
}

export interface ObjectionItem {
  objection: string;
  responses: string[];
}

export const defaultScripts: Script[] = [
  {
    id: 'inbound',
    name: 'Inbound Calls',
    content: `Hello, thank you for calling [Company Name]. This is [Agent Name].
How may I assist you today?

I understand you're interested in our insurance coverage.
I'd be happy to explain our options and find the best fit for your needs.

We offer several comprehensive plans with benefits including:
1. Guaranteed acceptance
2. Fixed premiums that never increase
3. Coverage that never decreases
4. No medical exam required

Would you like me to explain our coverage options in more detail?`,
    objections: {
      pricing: {
        "It's too expensive": [
          "I understand cost is important. This plan actually comes to less than a dollar per day.",
          "Many of our clients find it more expensive not to have coverage when it's needed.",
          "We have several flexible payment options to fit your budget."
        ],
        "I can't afford it right now": [
          "I understand. That's why we offer plans starting at just $30 per month.",
          "We can look at different coverage amounts to find what works for your budget.",
          "Many clients find our payment plans very manageable when broken down weekly."
        ]
      },
      timing: {
        "I need time to think about it": [
          "Of course, this is an important decision. Keep in mind rates increase with age.",
          "I can walk you through the benefits now so you have all the information to decide.",
          "Would it help if I explained our 30-day money-back guarantee?"
        ]
      }
    }
  }
];

export interface ChecklistItem {
  id: number;
  text: string;
  completed?: boolean;
}

export const checklistItems: ChecklistItem[] = [
  { id: 1, text: 'Proper greeting used' },
  { id: 2, text: 'Verified decision maker' },
  { id: 3, text: 'Explained key benefits' },
  { id: 4, text: 'Addressed primary concerns' },
  { id: 5, text: 'Quoted appropriate plan' },
  { id: 6, text: 'Attempted close' },
  { id: 7, text: 'Set follow-up if needed' },
  { id: 8, text: 'Thanked for time' }
];