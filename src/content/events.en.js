/* ================= RANDOM EVENTS · ENGLISH TRANSLATION PACK =================
   Only text fields; mechanics (effects, chances, conditions) come from events.tr.js via the same id.
   Every Turkish event has a translation here (local Turkish humour is kept, explained in context). */
export default [
  {
    id: "kanal",
    title: "Channel idea",
    text: "\"I'm starting a basketball channel about you. It's called '{last} Diaries'. You in?\"",
    choices: [
      { t: "I'm in, roll the camera", out: "The first video blew up. {friend} now thinks he's a film director." },
      { t: "I need to focus", out: '{friend} was hurt but said "fair enough". Then turned it into a cat channel.' }
    ]
  },
  {
    id: "taktik",
    title: "Secret play",
    text: "\"I drew a new set. It's called 'Turtle 3'. Everyone attacks slowly, and when the defense falls asleep, we speed up.\"",
    choices: [
      { t: "Brilliant idea, coach", out: "{coach} patted your back. Your teammates rolled their eyes." },
      { t: "Coach, that won't work", out: "The coach turned red and made you run 20 laps. But the team respected you." }
    ]
  },
  {
    id: "rakip-sahnede",
    title: "Rival in the spotlight",
    text: '{rival} said in an interview: "{last}? Overrated." The clip is on everyone\'s phone.',
    choices: [
      {
        t: "Reply on social media",
        win: { out: "Your reply went viral. The fans are behind you." },
        lose: { out: "Your reply came across as childish." }
      },
      { t: "I'll answer on the court", out: "Fired up. Your attributes will be more effective next game." }
    ]
  },
  {
    id: "pankart",
    title: "Banner in the stands",
    text: "\"I'm bringing a banner to your game: '{FIRST}, MOM IS HERE!'\"",
    choices: [
      { t: "Thanks, mom", out: "The banner was shown three times on TV. Your mom is thrilled." },
      { t: "Please don't", out: "{mom} quietly folded the banner. Family −9." }
    ]
  },
  {
    id: "mucize-icecek",
    who: "Man outside the arena",
    title: "Miracle drink",
    text: "\"Psst. 'Turbo Champion'. Totally legal, definitely inspected. Only {M:6}.\"",
    choices: [
      {
        t: "Buy one",
        needOut: "Not enough money.",
        win: { out: "Energy +35! But purple spots appeared on your face." },
        lose: { out: "Energy +35! Tasted like a battery, but it worked." }
      },
      { t: "No, thanks", out: "The man vanished in a cloud of smoke." }
    ]
  },
  {
    id: "balik-sakasi",
    title: "Locker-room prank",
    text: '"I hid a fish in the coach\'s locker a week ago. Want to watch him open it?"',
    choices: [
      { t: "Absolutely", out: "The coach staggered back when he opened it. The team laughed for days." },
      { t: "This will end badly", out: "{mate} got caught alone and stopped talking to you." }
    ]
  },
  {
    id: "sahil-3x3",
    title: "Beach tournament",
    text: '"There\'s a 3x3 tournament on the {city} beach! Prize: {S:40}."',
    choices: [
      {
        t: "Let's play",
        win: { out: "You won the tournament!" },
        lose: { out: "Knocked out in the semis, but it was a great day." }
      },
      { t: "Not this week", out: "{friend} entered with someone else." }
    ]
  },
  {
    id: "memleket-ozlemi",
    title: "Homesick",
    text: '"Are you eating properly in {city}? I sent you a box of cookies. The courier called three times."',
    choices: [
      { t: "Pick up the parcel now", out: "You shared the cookies with your teammates. Everyone adores your mom." },
      { t: "I'll get it later", out: "The parcel is waiting at the depot. Your mom heard about it." }
    ]
  },
  {
    id: "balon",
    title: "Operation Balloon",
    text: "\"Let's cover the principal's car in balloons!\"",
    choices: [
      {
        t: "Count me in",
        win: { out: "You got caught! A week of detention." },
        lose: { out: "The photo made it into the yearbook." }
      },
      { t: "I'm off to practice", out: "Extra work. {stat} +1." }
    ]
  },
  {
    id: "sinav-haftasi",
    who: "School",
    title: "Exam week",
    text: "Exams this week, right when you're preparing for a game.",
    choices: [
      { t: "Bury yourself in books", out: "Academics +7." },
      { t: "Basketball comes first", out: "Academics −6." }
    ]
  },
  {
    id: "kahve-mesaji",
    title: "A message",
    text: '{fem} wrote: "Watched your game yesterday. Coffee?"',
    choices: [
      {
        t: "Why not",
        win: { out: "A lovely coffee with {fem}. You're in a relationship now." },
        lose: { out: "She was on her phone all evening. It didn't work out." }
      },
      { t: "I need to focus right now", out: "You replied politely." }
    ]
  },
  {
    id: "reklam-teklifi",
    title: "Ad offer",
    text: "\"'Hoop Burger' wants you in an ad. Slogan: 'One bite, three points.' Fee: {W:1.5}.\"",
    choices: [
      { t: "Money is money", out: "The ad is everywhere." },
      { t: "Doesn't fit my brand", out: '{agent}: "Fine, we\'ll wait for something better."' }
    ]
  },
  {
    id: "kamyonet",
    title: "Dad's van",
    text: '"The van broke down again. The mechanic wants {W:0.6}..."',
    choices: [
      { t: "Sending it right now", out: "{dad} tried to hide the tremble in his voice." },
      { t: "I'm short this month", out: '"Okay, we\'ll manage," he said.' }
    ]
  },
  {
    id: "gizli-gorusme",
    title: "Secret meeting",
    text: '"Another club\'s president wants you. Have a quiet dinner with him this week and your end-of-season offers will improve."',
    choices: [
      {
        t: "Meet him",
        win: { out: "It leaked! The coach is angry. But the offers will be better." },
        lose: { out: "The meeting stayed secret. Better offers at season's end." }
      },
      { t: "I'm loyal to my club", out: "Your loyalty made the papers." }
    ]
  },
  {
    id: "uzaylilar",
    who: "Your neighbor Mr. Harry",
    title: "Midnight",
    text: '"Wake up! Aliens stole the basketball from my garden! And a cow. I don\'t even have a cow."',
    choices: [
      {
        t: "Go look for the aliens",
        win: { out: "In the woods you found a shiny envelope full of money." },
        lose: { out: "All you found was a raccoon." }
      },
      { t: "Keep sleeping", out: "Mr. Harry knocked on your door until morning." }
    ]
  },
  {
    id: "cocuk-kulubu",
    who: "Kids' basketball club",
    title: "Invitation",
    text: "A kids' club in {city} invited you to their practice.",
    choices: [
      { t: "Go and spend the day with them", out: 'One kid said, "I\'m going to be just like you."' },
      { t: "My schedule is full", out: "The disappointment was obvious." }
    ]
  },
  {
    id: "dugun",
    who: "The neighborhood",
    title: "Wedding down the street",
    text: "There's a wedding on the next street. Drums and zurna look set to go on until 2 a.m. You have practice in the morning.",
    choices: [
      { t: "Join the halay dance", out: "You led the halay, waving the handkerchief in the air. Your video is making the rounds in the neighborhood groups." },
      { t: "Sleep with earplugs", out: "The zurna pierced right through the earplugs, but you still managed a few hours of sleep." }
    ]
  },
  {
    id: "yelek",
    title: "Wear your vest",
    text: '"It\'s freezing outside! Don\'t go to the game without your vest. If you get sick, who\'s going to play?"',
    choices: [
      { t: "Okay mom, I'm wearing it", out: "You wore the vest. You took it off in the locker room, but your mom doesn't need to know that." },
      { t: "Mom, the gym is indoors and warm", out: '{mom} said "As if I don\'t know" and put another vest in your bag.' }
    ]
  },
  {
    id: "dayi",
    who: "Your uncle",
    title: "Uncle's tactics",
    text: 'At family dinner your uncle drew a play on a napkin: "Look, you get the ball, beat everyone, shoot. Simple as that. When I was your age nobody in the neighborhood could guard me."',
    choices: [
      { t: "You're right, uncle", out: "Your uncle beamed and told his youth story once more. For the third time." },
      { t: "Uncle, that's not how basketball works", out: "The table went silent. Your aunt quickly changed the subject to the stuffed peppers." }
    ]
  },
  {
    id: "hali-saha",
    title: "Five-a-side invite",
    text: '"We\'ve got five-a-side football tonight and we\'re one short. Come play in goal. You\'re tall, nobody will score."',
    choices: [
      {
        t: "Count me in",
        win: { out: "You were great in goal, but a shot hit your wrist. Energy −20." },
        lose: { out: "You were a wall in goal. The other team complained that you're a basketball player." }
      },
      { t: "Can't risk my wrist", out: '{friend} teased you: "Oh right, you\'re a pro now."' }
    ]
  },
  {
    id: "simitci",
    who: "The simit seller",
    title: "Morning simit",
    text: 'The simit seller on your way to school recognized you: "I saw you in the game yesterday, son! This simit is on me. Win the title and bring me a jersey."',
    choices: [
      { t: "Promise, I'll bring you a jersey", out: "The simit was still warm. He'll be telling the whole neighborhood about you." },
      { t: "Say thanks and pay", out: "He refused the money and slipped it back into your pocket." }
    ]
  },
  {
    id: "bayram",
    who: "Your aunt",
    title: "Holiday visit",
    text: 'For the holiday you visited your aunt to kiss her hand. Out came an envelope of pocket money. Then came the questions: "Do you have a girlfriend? When are you getting married?"',
    choices: [
      { t: "I'm still young, auntie", out: 'Your aunt said "Your uncle was married at your age." The envelope was a thick one.' },
      { t: "I'm focused on my career", out: 'Your aunt told everyone, "Our kid is very serious."' }
    ]
  },
  {
    id: "gurbetci",
    who: "Expat fans",
    title: "Turkish flags in the stands",
    text: "At your game in {city} there was a group with Turkish flags in the stands. They're waiting for you after the game.",
    choices: [
      { t: "Go over and take photos", out: '"That\'s our boy!" they shouted. Someone handed you homemade baklava.' },
      { t: "Wave from a distance", out: "They applauded, but looked a little disappointed." }
    ]
  },
  {
    id: "kargo",
    title: "Care package",
    text: '"I sent you dried beans, tea, red pepper flakes and dried mulberries. There\'s no proper food over there in {city}."',
    choices: [
      { t: "Cook a Turkish meal for your teammates", out: "They told you to go easy on the pepper flakes; you didn't listen. Still, everyone cleaned their plates." },
      { t: "Keep it all for yourself", out: "Evening tea and dried mulberries. It almost felt like home." }
    ]
  },
  {
    id: "lokanta",
    who: "Turkish restaurant",
    title: "A taste of home",
    text: 'You found a Turkish restaurant in {city}. The owner recognized you: "The bill is on us, just score in the game."',
    choices: [
      { t: "Kebab and ayran", out: "The ayran was frothy. Your signed jersey will go up on the wall." },
      { t: "I'm on a diet, just soup", out: "Lentil soup, lemon, pepper flakes. Athlete style." }
    ]
  },
  {
    id: "kahvehane",
    who: "Coffeehouse pundits",
    title: "Tea house analysis",
    text: 'The neighborhood tea house has the game on. The old men at the table are analyzing you: "This kid never goes left. Mark my words, you go right on him."',
    choices: [
      { t: "Buy their tea", out: "The old men embraced you. You even got invited to their okey table." },
      { t: "They're right, work on going left", out: "The next day you practiced your left-hand crossover. Agility +1. The old men were right." }
    ]
  },
  {
    id: "taksici",
    who: "Taxi driver",
    title: "The taxi driver knows you",
    text: 'Your taxi driver looked in the rear-view mirror: "Hey, aren\'t you that basketball player? Why don\'t you join our team, we need a center too!"',
    choices: [
      { t: "Chat and sign an autograph", out: "He never started the meter. He walked you through every roster move the whole way." },
      { t: "Put on headphones", out: "The driver turned up the radio. You arrived to a soundtrack of arabesque." }
    ]
  }
];
