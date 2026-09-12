// Primary sources checked 2026-09-11. Keep the population and evidence type
// alongside each figure; productivity and reported savings are different measures.
export const researchChapters = [
  {
    label: "The hesitation",
    kind: "OECD survey · published 2025",
    figure: "57%",
    unit: "of non-users say generative AI doesn’t fit their work",
    title: "It has to make sense for your work.",
    body: "Among small and medium-sized firms not using generative AI, the most common barrier was fit. Concerns about data, rules, and skills also held businesses back.",
    source: "OECD · Generative AI and the SME Workforce",
    url: "https://www.oecd.org/en/publications/generative-ai-and-the-sme-workforce_2d08b99d-en/full-report/component-6.html",
    notes: [
      "The OECD surveyed 5,232 firms with up to 249 employees across seven countries in late 2024. The report was published in November 2025. The 57.3% figure applies to non-users of generative AI, not to all businesses.",
      "Among non-users, 52.5% cited concerns about information fed into models, and 49.8% cited a lack of employee skills. These are reported barriers; they don’t establish that every firm should adopt AI.",
    ],
  },
  {
    label: "The time back",
    kind: "Peer-reviewed field study · 2025",
    figure: "+15%",
    unit: "more customer issues resolved per hour, on average",
    title: "Give people a useful head start.",
    body: "In a study of 5,172 support agents, an AI assistant helped people resolve more issues per hour. The agents stayed in charge of the conversation.",
    source: "Quarterly Journal of Economics · Generative AI at Work",
    url: "https://doi.org/10.1093/qje/qjae044",
    notes: [
      "Brynjolfsson, Li, and Raymond studied a staggered rollout at one business-software company. Their 2025 paper used a difference-in-differences analysis, rather than random assignment, to estimate the effect of AI assistance.",
      "The average gain was 15% more issues resolved per hour, with gains varying by experience. Agents could edit or ignore suggestions. This is a productivity result, not a 15% reduction in payroll costs or a prediction for every workflow.",
    ],
  },
  {
    label: "The money",
    kind: "Company-reported savings · 2025",
    figure: "$59m",
    unit: "approximately, in annual customer-service cost savings",
    title: "Savings can add up. Context matters.",
    body: "Klarna attributed about $59 million in 2025 cost savings to its AI customer-service assistant. This is a large-company example, not a small-business benchmark.",
    source: "Klarna · 2025 annual report, page 184",
    url: "https://s205.q4cdn.com/644747736/files/doc_financials/2025/q4/Klarna-Group-plc-20-F-2025.pdf#page=188",
    notes: [
      "Klarna’s Form 20-F for the year ended December 31, 2025 reports this retrospective annual figure. The statement is on printed page 184 (PDF page 188), in the operating review.",
      "This is the company’s attribution, not independent causal research or verified return on investment. The report does not provide a reproducible savings calculation or establish whether all AI implementation costs are deducted.",
      "For your project, we would compare time and quality before and after, and account for build, software, and upkeep costs. Time freed up is useful capacity; it doesn’t automatically become cash savings.",
    ],
  },
] as const;
