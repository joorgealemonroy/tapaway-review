import { UtensilsCrossed, Scissors, Sparkles, Coffee, Car, type LucideIcon } from "lucide-react";

export interface VerticalSection {
  heading: string;
  body: string[];
}

export interface VerticalFaq {
  q: string;
  a: string;
}

export interface VerticalData {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: VerticalSection[];
  faqs: VerticalFaq[];
  ctaBody: string;
  icon: LucideIcon;
}

export const restaurants: VerticalData = {
  metaTitle: "NFC Tap Cards for Restaurants | TapAway",
  metaDescription:
    "Tap cards for restaurants: one tap connects diners to your menu, Instagram, reviews & directions. Done-for-you NFC cards. 14-day free trial.",
  h1: "NFC Tap Cards for Restaurants: Turn Every Table into a Connection",
  intro:
    "Your dining room does the hard part. Great food, good service, full tables. But when a happy guest walks out the door, the connection walks out with them. TapAway fixes that. We make NFC tap cards for restaurants — your guest taps one with their phone, and your whole restaurant opens up on their screen. No app, no scanning, no friction.",
  sections: [
    {
      heading: "The moment it works: right there at the check",
      body: [
        "It lives where your servers already are. Drop a TapAway card on the table with the check, or keep one in the check presenter. Your guest pays, taps the card with their phone, and boom — they're looking at your menu, your Instagram, your Google review page, your directions. The happy ones leave a review right then, while the meal is still fresh. The rest are connected to you long after they've left. That one tap turns a single visit into a repeat customer.",
      ],
    },
    {
      heading: "What's inside your restaurant's hub",
      body: [
        "Your hub is custom-built for you, and for a restaurant it means the stuff diners actually want: your full menu, your Instagram feed with photos that sell the next visit, a one-tap link to leave a Google review, online ordering if you have it, directions, hours, and a call button. It's the whole restaurant, in your customer's pocket.",
      ],
    },
    {
      heading: "Reviews come from real visits, not begging",
      body: [
        "Here's the honest truth: guests who just had a great meal want to leave a review. They just forget by the time they get to the car. The tap card catches them at the peak moment — full, happy, phone already in hand. More reviews means more people finding you on Google, which means more first-time diners walking in. Reviews are one big benefit of the connection, not a gimmick on top of it.",
        "Real proof it works at the table: Victor Ramirez, a TapAway customer, pulled in +44 new Google reviews in 30 days once his tap cards were out.",
      ],
    },
    {
      heading: "Done for you, not another project on your list",
      body: [
        "You run a restaurant. You don't have time to build a mobile hub. You don't have to. We build your hub for you, we ship your cards ready to use, and you do nothing technical at any point. Your staff just leaves the card on the table and says \u201ctap this with your phone.\u201d That's the entire training program.",
      ],
    },
  ],
  faqs: [
    {
      q: "Will my older customers figure this out?",
      a: "Yes — it's one motion they've already done a thousand times. Hold the phone near the card. That's it. No app to download, no account to make. Works on iPhone 7 and newer and most Androids. If someone's phone doesn't support NFC, the QR code on the card does the same job.",
    },
    {
      q: "How many cards do I need?",
      a: "Solo ($20/mo) comes with 4 cards a month, Pro ($39/mo) with 15. Most restaurants start with a few cards rotating through check presenters and add more for the host stand and bar.",
    },
    {
      q: "Do I have to redesign my menu or change anything?",
      a: "No. Your hub links to whatever you already have — your existing menu page, your Instagram, your Google listing. Nothing changes on your end. We just connect it all in one tap.",
    },
  ],
  ctaBody:
    "Get your hub built and cards shipped. If it doesn't pay for itself, cancel anytime — no contract, no awkward phone call.",
  icon: UtensilsCrossed,
};

export const barbershops: VerticalData = {
  metaTitle: "NFC Tap Cards for Barbershops | TapAway",
  metaDescription:
    "Barbershop tap cards: one tap connects clients to your booking, cuts gallery, price list & reviews. Done-for-you NFC cards. 14-day free trial.",
  h1: "NFC Tap Cards for Barbershops: Turn Every Client in the Chair into a Connection",
  intro:
    "You cut hair all day. Your chair is full, your work speaks for itself, and half your clients found you because someone told them to come. But when a first-timer leaves happy, they usually leave with nothing — no way to book again, no way to find you later, no review. TapAway fixes that. We make NFC tap cards for barbershops — your client taps one with their phone, and your whole shop opens up on their screen. No app, no scanning, nothing weird.",
  sections: [
    {
      heading: "The moment it works: right after the cut, at the chair",
      body: [
        "You're done. Mirror check, line's clean, client's smiling. You hand them the card (or keep it on the station) and say \u201ctap your phone on this.\u201d Their phone opens your booking link while you're taking payment — they can rebook their next cut in ten seconds instead of forgetting for three weeks. Happy first-timers leave a Google review right there. The rest land on your Instagram, where your latest cuts do the selling for you.",
      ],
    },
    {
      heading: "What's inside your barbershop's hub",
      body: [
        "Your hub is custom-built for you: your booking link, your price list, your Instagram full of your best work, a one-tap Google review link, directions to the shop, and a call or text button. It's your whole shop in your client's pocket — the stuff that turns a one-time cut into a regular.",
      ],
    },
    {
      heading: "Stop losing clients to forgetfulness",
      body: [
        "Most barbers don't lose clients because the cut was bad. They lose them because life happens — the guy meant to rebook, didn't, and three weeks later went somewhere closer. When rebooking is one tap before he stands up, that doesn't happen. And when your Google reviews stack up, the \u201cbarber near me\u201d searches start working for you.",
      ],
    },
    {
      heading: "Done for you, not another thing to figure out",
      body: [
        "You're behind the chair, not at a desk. So we handle all of it — we build your hub, we ship your cards, and you never touch anything technical. Hand the card over, say \u201ctap it,\u201d and get back to the fade. That's the whole setup.",
      ],
    },
  ],
  faqs: [
    {
      q: "My clients are regulars — do I even need this?",
      a: "Your regulars keep the lights on, but first-timers and walk-ins are where growth comes from. The card turns every one-time cut into a booked second visit. Your regulars will use it too — to rebook faster and send your Instagram to their friends.",
    },
    {
      q: "What if a client's phone doesn't have NFC?",
      a: "Every card also has a QR code that opens the same hub, so nobody's left out. And NFC works on iPhone 7 and newer and most Androids, which covers just about everybody.",
    },
    {
      q: "How many cards do I need?",
      a: "Solo ($20/mo) comes with 4 cards a month, Pro ($39/mo) with 15. Most shops start with one per chair plus one at the register and grow from there.",
    },
  ],
  ctaBody:
    "Get your hub built and cards shipped. If it doesn't earn its keep, cancel anytime — no contract, no hassle.",
  icon: Scissors,
};

export const salons: VerticalData = {
  metaTitle: "NFC Tap Cards for Salons | TapAway",
  metaDescription:
    "Salon tap cards: one tap connects clients to your booking, services, price list & reviews. Done-for-you NFC cards. 14-day free trial.",
  h1: "NFC Tap Cards for Salons: Turn Every Appointment into a Connection",
  intro:
    "Your salon runs on relationships. Clients sit in your chair for an hour or more, they love the result, they say \u201cI'll be back\u201d — and then some of them drift. They forget to rebook, or they never left the review they meant to, or a friend asks where they got their hair done and they don't have your link handy. TapAway fixes that. We make NFC tap cards for salons — your client taps one with their phone, and your whole salon opens up on their screen. No app, no scanning, no awkward tech moment.",
  sections: [
    {
      heading: "The moment it works: at the front desk, at checkout",
      body: [
        "She's paying, she's happy, her hair looks amazing. Your receptionist sets the card on the counter and says \u201ctap your phone here to book your next appointment.\u201d The booking page is already open on her phone before she's walked out. Your Instagram is right there for her to follow — she becomes the kind of client who tags you in her stories. And the review link catches her at her happiest, which is exactly when reviews get written.",
      ],
    },
    {
      heading: "What's inside your salon's hub",
      body: [
        "Your hub is custom-built for you: your online booking, your services and price list, your Instagram portfolio, a one-tap Google review link, directions, hours, and a call or text button. Everything a client needs to come back — and everything a friend of hers needs to become a new client.",
      ],
    },
    {
      heading: "Clients who feel connected actually rebook",
      body: [
        "The difference between a client who comes twice a year and one who comes every six weeks is usually just how easy you make it. When your booking, your prices, and your latest work live in her pocket, the next appointment is one tap instead of a chore. Sonia Berumen, a TapAway customer, puts it simply — staying connected with her customers is the whole point — and her cards pulled in +33 new Google reviews in 30 days.",
      ],
    },
    {
      heading: "Done for you, zero setup on your end",
      body: [
        "You're styling, consulting, and running a salon — you don't need a tech project. We build your hub for you, we ship your cards ready to go, and nobody on your team has to learn anything. Set the card on the front desk. Done.",
      ],
    },
  ],
  faqs: [
    {
      q: "Will my clients think it's too techy?",
      a: "No. It feels like contactless payment — hold the phone near the card and it just opens. No app, no account, no typing. Works on iPhone 7 and newer and most Androids, and every card has a QR code as a backup.",
    },
    {
      q: "Can the hub show my services and prices?",
      a: "Yes. We build your services and price list right into your hub, linked to your booking page. When you update your prices, just tell us — done-for-you means done-for-you.",
    },
    {
      q: "How many cards do I need?",
      a: "Solo ($20/mo) comes with 4 cards a month, Pro ($39/mo) with 15. Most salons start with one at the front desk and one or two per station, then expand.",
    },
  ],
  ctaBody:
    "Get your hub built and cards shipped. If your clients don't love it, cancel anytime — no contract, no fine print.",
  icon: Sparkles,
};

export const cafes: VerticalData = {
  metaTitle: "NFC Tap Cards for Caf\u00e9s | TapAway",
  metaDescription:
    "Tap cards for caf\u00e9s: one tap connects customers to your menu, Instagram, reviews & directions. Done-for-you NFC cards. 14-day free trial.",
  h1: "NFC Tap Cards for Caf\u00e9s & Coffee Shops: Turn Every Regular into a Connection",
  intro:
    "Your caf\u00e9 survives on regulars — the morning crowd, the laptop people, the ones who order before you finish saying hi. But even your best regulars are one move or one new shop away from disappearing, and the weekend crowd that tries you once usually leaves with nothing but a coffee. TapAway fixes that. We make NFC tap cards for caf\u00e9s and coffee shops — a customer taps one with their phone, and your whole caf\u00e9 opens up on their screen. No app, no scanning, no line slowed down.",
  sections: [
    {
      heading: "The moment it works: on the counter by the register",
      body: [
        "Morning rush, card tap, coffee in hand. They pay, and the TapAway card sits right there on the counter where they can see it: \u201ctap your phone here.\u201d In two seconds they're on your Instagram — the latte art, the new seasonal drink, the photos that make someone choose your shop tomorrow. The happy first-timer leaves a Google review before their coffee cools. Your menu, your hours, your directions — all in their pocket when they leave.",
      ],
    },
    {
      heading: "What's inside your caf\u00e9's hub",
      body: [
        "Your hub is custom-built for you: your menu with photos, your Instagram, a one-tap Google review link, directions and hours, and a call button. It's the stuff that turns \u201ctried it once\u201d into \u201cthis is my place\u201d — plus everything a regular shares when they recommend you to a friend.",
      ],
    },
    {
      heading: "Reviews and follows compound for caf\u00e9s",
      body: [
        "Coffee shops live on discovery — \u201ccoffee near me,\u201d Instagram stories, word of mouth. Every review and every new Instagram follower is a signal that pulls the next customer in. The tap card catches people at the exact moment they're happiest — first sip of something great — so the review actually gets written instead of forgotten. One tap connects them to you for good.",
      ],
    },
    {
      heading: "Done for you, not one more thing on the to-do list",
      body: [
        "You're steaming milk and restocking pastries. We handle everything else — we build your hub, we ship your cards, and there's nothing technical for you or your team to learn. Put the card on the counter. That's the entire setup.",
      ],
    },
  ],
  faqs: [
    {
      q: "Won't it slow down my morning rush?",
      a: "No — it's faster than handing someone a receipt. The card sits on the counter and customers tap it themselves. There's nothing for your baristas to do, no line impact, no script to memorize.",
    },
    {
      q: "Will my older customers figure this out?",
      a: "Yes. It's one motion they already know from contactless payment — hold the phone near the card. No app, no account. Works on iPhone 7 and newer and most Androids, and every card also has a QR code as a backup.",
    },
    {
      q: "How many cards do I need?",
      a: "Solo ($20/mo) comes with 4 cards a month, Pro ($39/mo) with 15. Most caf\u00e9s start with one at the register and one on the pickup counter or a communal table.",
    },
  ],
  ctaBody:
    "Get your hub built and cards shipped. If it doesn't pay for itself, cancel anytime — no contract, no hassle.",
  icon: Coffee,
};

export const autoShops: VerticalData = {
  metaTitle: "NFC Tap Cards for Auto Shops | TapAway",
  metaDescription:
    "Tap cards for auto shops: one tap connects customers to your booking, services, price list & reviews. Done-for-you NFC. 14-day free trial.",
  h1: "NFC Tap Cards for Auto Shops: Turn Every Key Pickup into a Connection",
  intro:
    "Auto shops don't struggle because of bad work. You fix the car, the customer picks up the keys, they're happy — and then they vanish. Six months later the check engine light comes on and they google \u201cmechanic near me\u201d like they never met you. TapAway fixes that. We make NFC tap cards for auto shops — your customer taps one with their phone, and your whole shop opens up on their screen. No app, no scanning, no tech headache.",
  sections: [
    {
      heading: "The moment it works: at the counter, when they pick up the keys",
      body: [
        "The car is done. They're paying, they're relieved, you're the hero. You set the card on the counter and say \u201ctap your phone here.\u201d Now your booking link is on their phone for the next oil change — not buried in a Google search six months from now. Your Google review link is right there too, and this is exactly the moment people leave five-star reviews: problem solved, wallet open, genuinely grateful.",
      ],
    },
    {
      heading: "What's inside your shop's hub",
      body: [
        "Your hub is custom-built for you: your booking link, your services and price list, your Google review link, your Instagram or Facebook with real work photos, directions, hours, and a call button. It's your whole shop in their pocket — so next time their car makes a weird noise, they tap one button instead of shopping around.",
      ],
    },
    {
      heading: "Auto shops run on reviews — catch them at the counter",
      body: [
        "Nobody leaves a review for their mechanic from the couch. They leave it at the counter, keys in hand, happy it's fixed. The tap card captures that moment. And reviews for auto shops are gold — \u201cauto repair near me\u201d searches are won by shops with ratings, not shops with the best website. Reviews are one major benefit of the connection, alongside rebookings that come back on autopilot.",
      ],
    },
    {
      heading: "Done for you, zero tech required",
      body: [
        "You're under cars, not at a computer. So we do everything — we build your hub, we ship your cards, and there's nothing for you or your service writer to learn or install. Set the card on the counter. That's the whole setup.",
      ],
    },
  ],
  faqs: [
    {
      q: "My customers just want their car back — will they really tap a card?",
      a: "The ones who are happiest will. A relieved customer picking up a fixed car is in the best mood they'll ever be in at your shop. One tap, ten seconds, and they're connected. The rest see it sitting on the counter next time.",
    },
    {
      q: "What if a customer doesn't have NFC on their phone?",
      a: "Every card also has a QR code that opens the exact same hub, so it works either way. NFC covers iPhone 7 and newer and most Androids — that's the vast majority of customers.",
    },
    {
      q: "How many cards do I need?",
      a: "Solo ($20/mo) comes with 4 cards a month, Pro ($39/mo) with 15. Most shops start with one at the front counter and one in the waiting area, then expand.",
    },
  ],
  ctaBody:
    "Get your hub built and cards shipped. If it doesn't earn its keep, cancel anytime — no contract, no fine print.",
  icon: Car,
};
