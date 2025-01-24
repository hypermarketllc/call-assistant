export interface Script {
  id: string;
  name: string;
  content: string;
  objections: {
    [category: string]: Objection[];
  };
}

export interface Objection {
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
      pricing: [
        {
          objection: "It's too expensive",
          responses: [
            "I understand cost is important. This plan actually comes to less than a dollar per day.",
            "Many of our clients find it more expensive not to have coverage when it's needed.",
            "We have several flexible payment options to fit your budget."
          ]
        },
        {
          objection: "I can't afford it right now",
          responses: [
            "I understand. That's why we offer plans starting at just $30 per month.",
            "We can look at different coverage amounts to find what works for your budget.",
            "Many clients find our payment plans very manageable when broken down weekly."
          ]
        }
      ],
      timing: [
        {
          objection: "I need time to think about it",
          responses: [
            "Of course, this is an important decision. Keep in mind rates increase with age.",
            "I can walk you through the benefits now so you have all the information to decide.",
            "Would it help if I explained our 30-day money-back guarantee?"
          ]
        }
      ]
    }
  },
  {
    id: 'transfer',
    name: 'Transfer Calls',
    content: `Hello, this is [Agent Name] with [Company Name]. I'm receiving a transfer from [Transfer Agent].
I understand you're interested in our insurance coverage, is that correct?

Thank you for your interest. I'll be happy to help you find the right coverage.

Let me confirm the information we received:
[Confirm transferred details]

Now, let me explain our coverage options that best match your needs:
1. Guaranteed acceptance
2. Fixed premiums
3. Immediate coverage
4. Flexible payment options

Would you like to hear more about these benefits?`,
    objections: {
      verification: [
        {
          objection: "Why was I transferred?",
          responses: [
            "I'm a specialist in the specific coverage you're interested in.",
            "I have direct access to our premium plans and can offer the best rates.",
            "This allows me to provide you with more detailed information about our policies."
          ]
        }
      ]
    }
  },
  {
    id: 'outbound',
    name: 'Outbound Calls',
    content: `Hello, this is [Agent Name] from [Company Name]. I'm calling about your insurance coverage.
How are you doing today?

I noticed you recently inquired about our final expense insurance coverage.
This coverage helps protect your family from unexpected funeral and medical costs.

Our plans start at just $30 per month, and they come with several key benefits:
1. Guaranteed acceptance
2. Fixed premiums that never increase
3. Coverage that never decreases
4. No medical exam required

Would you like to hear more about our coverage options?`,
    objections: {
      timing: [
        {
          objection: "This is a bad time",
          responses: [
            "I understand. When would be a better time to discuss this?",
            "This will only take a few minutes and could save you money on coverage.",
            "I can be very brief, and the information might be valuable to you."
          ]
        }
      ]
    }
  }
];

export const checklistItems = [
  { id: 1, text: 'Proper greeting used' },
  { id: 2, text: 'Verified decision maker' },
  { id: 3, text: 'Explained key benefits' },
  { id: 4, text: 'Addressed primary concerns' },
  { id: 5, text: 'Quoted appropriate plan' },
  { id: 6, text: 'Attempted close' },
  { id: 7, text: 'Set follow-up if needed' },
  { id: 8, text: 'Thanked for time' }
];