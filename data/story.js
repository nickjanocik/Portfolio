/* ------------------------------------------------------------------
   Page content as data.

   index.html is still the source of truth for the vanilla prototypes —
   this module exists so the React prototype (and any future templating)
   renders the SAME words and the SAME photos without a second transcription.
   If you edit copy in one place, edit it in both.
------------------------------------------------------------------ */

/* Responsive variants live in assets/opt/, generated at 480/960/1440 but never
   upscaled past the original — so each photo lists only the widths that exist.
   `w`/`h` are the ORIGINAL intrinsic dimensions, used for the width/height
   attributes that hold layout before the image decodes. */
export const photos = {
  "me-intro-1":     { w: 1066, h: 1600, widths: [480, 960],       alt: "Nick looking off into a sunset, wearing a flannel shirt" },
  "me-intro-2":     { w: 1600, h: 900,  widths: [480, 960, 1440], alt: "Close-up portrait of Nick at dusk" },
  "me-music-1":     { w: 1600, h: 900,  widths: [480, 960, 1440], alt: "Nick sitting in a field playing electric guitar under a bright blue sky" },
  "me-music-2":     { w: 6000, h: 4000, widths: [480, 960, 1440], alt: "Nick standing and playing guitar at dusk" },
  "me-people-1":    { w: 843,  h: 1200, widths: [480],            alt: "Groomsmen, including Nick, walking down a staircase at a wedding" },
  "me-people-2":    { w: 1200, h: 900,  widths: [480, 960],       alt: "Nick and friends standing at a candle-lighting ceremony" },
  "me-people-3":    { w: 900,  h: 1200, widths: [480],            alt: "Nick dancing and laughing with a friend at a bar" },
  "me-people-4":    { w: 1200, h: 891,  widths: [480, 960],       alt: "Nick with his arm around a friend at a get-together" },
  "me-people-5":    { w: 768,  h: 1024, widths: [480],            alt: "Nick with friends" },
  "me-people-6":    { w: 4608, h: 3456, widths: [480, 960, 1440], alt: "Nick with friends" },
  "me-community-1": { w: 1600, h: 1200, widths: [480, 960, 1440], alt: "A big group in costumes at a Texas A&M football game" },
  "me-community-2": { w: 1600, h: 1200, widths: [480, 960, 1440], alt: "A large group photo of a service organization chapter" },
  "me-community-3": { w: 1200, h: 885,  widths: [480, 960],       alt: "Nick and four friends taking a selfie in the mountains" },
  "me-community-4": { w: 891,  h: 1200, widths: [480],            alt: "Nick and a friend hiking, standing on a rocky overlook" },
  "me-community-5": { w: 1600, h: 1200, widths: [480, 960, 1440], alt: "Nick and friends giving a thumbs up at the gym" },
  "me-community-6": { w: 1024, h: 768,  widths: [480, 960],       alt: "Nick with his community" },
  "me-bottom-page": { w: 6000, h: 4000, widths: [480, 960, 1440], alt: "A photo of Nick" },
};

/* `sizes` depends on which grid a photo sits in — see .photo-cluster in the CSS.
   stack : 1-col cluster, stays 1-col at every breakpoint
   grid  : 2-col desktop -> 3-col <=860px -> 2-col <=520px
   bottom: standalone sign-off print, width: min(420px, 74%) */
export const sizes = {
  stack: "(max-width: 860px) calc(100vw - 40px), 470px",
  grid: "(max-width: 520px) 45vw, (max-width: 860px) 30vw, 230px",
  bottom: "(max-width: 568px) 74vw, 420px",
};

export const srcset = (name, ext) =>
  photos[name].widths.map((w) => `assets/opt/${name}-${w}.${ext} ${w}w`).join(", ");

export const fallbackSrc = (name) =>
  `assets/opt/${name}-${photos[name].widths.at(-1)}.jpg`;

export const hero = {
  eyebrow: "an unsolicited TED Talk, sort of",
  heading: "Howdy",
  // rendered as <span class="accent-mark"> — the one place --kite appears in the page
  accentMark: ".",
  paragraphs: [
    "Chances are, you're either a recruiter, a colleague, a friend, or a family member of mine who's now here checking this out, because why else would you be here? I'm not advertising this website.",
    "I fought off the idea of making a portfolio website for years because, quite honestly, the idea always felt a little too self-indulgent for my taste. A page entirely dedicated to me and what I'm doing…? Kinda made me want to throw up in my mouth.",
    "However, this recently changed when it was pointed out to me that I'm a huge proponent of what my generation would term “side quests.”",
  ],
  callout: {
    variant: "definition",
    label: "def.",
    // `strong` marks the defined term; the rest is the definition body
    strong: "side quest",
    body: " — a detour with no obligation, taken purely because it sounded interesting. usually unrelated to the main plot. often the actual point.",
  },
  paragraphsAfter: [
    "And, come to think of it, my entire life feels like a collection of side quests. Honestly? That's how I think it should be.",
    "So I thought: maybe it'd be cool to have a place for all of these things to live, especially as that list seems to be growing faster than it ever has.",
  ],
  scrollCue: "keep reading ↓",
};

export const storyRows = [
  {
    id: "engineer",
    label: "so here's me",
    heading: "I'm an engineer.",
    reverse: false,
    cluster: "stack",
    photos: ["me-intro-1", "me-intro-2"],
    paragraphs: [
      "While I love a good problem to solve in any context, I chose software as my specialty, as I've been hooked on technology since I combed through the family desktop's filesystem at the ripe age of three. I can proudly say I've been studying AI, both on my own and in academia, since before it was a “cool” subject, and I've designed and architected solutions that utilize, integrate, or build artificially intelligent systems in enterprise, start-up, and entrepreneurial contexts.",
    ],
    linksLabel: "Find me elsewhere",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/nick-janocik-2664b81bb/" },
      { label: "GitHub", href: "https://github.com/nickjanocik" },
      { label: "Resume", href: "assets/resume.pdf" },
      { label: "ReplyMate", href: "https://yourreplymate.com" },
    ],
    callout: {
      variant: "tidbit dug",
      label: "tidbit",
      body: "Just to see how far I can stretch the boundaries of my capabilities, I'm currently working on bridging my love for Golden Retrievers, Pixar movies, and machine learning by prototyping a talking dog harness that uses behavioral inference, sentiment analysis, and localized large language models to translate canine body language into natural language: all on an edge computer that's strapped to the back of a dog. Inspired by the character “Dug” from the movie {em:Up}, of course.",
    },
  },
  {
    id: "creative",
    label: "also…",
    heading: "I'm a creative at heart.",
    reverse: true,
    cluster: "stack",
    photos: ["me-music-1", "me-music-2"],
    paragraphs: [
      "As may or may not be implied by my affinity for tinkering with sometimes wild or ridiculous ideas, this stretches widely across multiple areas of my life, as I've been writing and recording music for as long as I can remember. I'm a multi-instrumentalist, songwriter, producer, and audio engineer, and I have always loved music so much that I almost went to school for it. I've played in bands, written and produced music for other artists, scored multiple films, and released plenty of my own music to streaming over the years. To illustrate: if you're familiar with the 10,000-hour rule, I've easily got 25,000 — whether or not this translates to quality, I am certainly not sure.",
    ],
    linksLabel: "Hear what I make",
    links: [{ label: "LANDR artist page", href: "https://artists.landr.com/991043513339" }],
  },
  {
    id: "people",
    label: "the biggest part, though",
    heading: "I love people. A lot.",
    reverse: false,
    cluster: "grid",
    photos: ["me-people-1", "me-people-2", "me-people-3", "me-people-4", "me-people-5", "me-people-6"],
    pullQuote:
      "To say that I love people would be like saying Guy Fieri has a “passing interest” in putting sunglasses on the back of his head.",
    paragraphs: [
      "It's been the greatest gift of my life to have been touched so deeply by the kindness, grace, and generosity of others in my darkest moments, and it has since become my life's mission to inspire a sense of self-belief and emanating love for others in as many souls for as long as I live, in whichever ways I may get the opportunity.",
      "I truly am convicted by the belief that everyone has something great to offer, and that it is up to us as human beings to see it that way, no matter how difficult.",
      "Recently, it's been my passion project to create an organization focused on gaining back what my generation has lost in the wake of the recent technological renaissance: true, authentic community.",
    ],
  },
  {
    id: "third-space",
    label: "so, naturally…",
    heading: "I'm building a third space.",
    reverse: true,
    cluster: "grid",
    photos: ["me-community-1", "me-community-2", "me-community-3", "me-community-4", "me-community-5", "me-community-6"],
    paragraphs: [
      "After college, where does everyone go? If you're not familiar with the \"third-space theory\", some theorize that as our technology has become more enabling to us, we have lost the inconveniences that used to provide opportunities for the casual social interactions that quietly upheld our wellbeing. Now, instead of going out to eat, we DoorDash it. Instead of picking our own groceries, we order ahead and have someone else load the trunk so we never have to get out of the car. Instead of the local park after work, we stay inside under artificial light with the dying hope that we'll be happy once the next season of {em:insert trash TV show here} drops — knowing deep down that won't be the case— but are never quite able to put a finger on why we're so unhappy.",
      "So I, along with an ever-expanding short list of incredible friends of mine, am reinventing third-space interactions in a way they have never existed before, using the technology that originally brought about their demise. A place where everyone can be authentically themselves, maybe for the first time in their lives.",
    ],
    linksLabel: "Come find us",
    links: [{ label: "loosetieshtx.com", href: "https://www.loosetieshtx.com" }],
  },
];

export const contact = {
  label: "whoever you are",
  heading: "I'd love to hear your story.",
  body: "For whatever reason you've made it this far into my unsolicited TED Talk — thank you. Seriously. Now it's your turn.",
  email: "nickjanocik@gmail.com",
};

export const site = {
  name: "Nick Janocik",
  title: "Nick Janocik | Portfolio",
  description:
    "Nick Janocik's personal portfolio: side quests, software, music, people, and a third space in the making.",
  footer: "probably on a side quest",
};
