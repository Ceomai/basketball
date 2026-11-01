/* ================= RANDOM EVENTS · ENGLISH TRANSLATION (extra pack) =================
   Only text fields; mechanics come from events.more.tr.js via the same id. */
export default [
  {
    id: "otobus",
    title: "Away-game bus",
    text: "The team bus broke down on the highway. Tip-off is in four hours, the captain has the hood up, and nobody's helping.",
    choices: [
      {
        t: "Step up to the engine",
        win: { out: "You reconnected a wire and the engine roared back. The team carried you on their shoulders." },
        lose: { out: "The engine stayed dead, but you all hitchhiked together. You made it to the game at the last second." }
      },
      {
        t: "Put your headphones on and sleep",
        out: "When you woke up, the team was already in the back of a pickup truck. They remembered you at the last second."
      }
    ]
  },
  {
    id: "maas-gecikti",
    title: "Late wages",
    text: '"The club hasn\'t paid wages for two weeks. Some players are talking about skipping practice. What are you going to do?"',
    choices: [
      {
        t: "Join the team's boycott",
        win: { out: "The chairman paid everyone the next day. Your teammates hugged you." },
        lose: { out: "The chairman dug in his heels and two practices were lost. In the end, half the pay arrived." }
      },
      {
        t: "Show up to practice, be a pro",
        out: "The coach held you up as an example in front of the whole team. Some in the locker room are sulking at you."
      }
    ]
  },
  {
    id: "kucuk-salon",
    who: "Local newspaper",
    title: "One-stand gym",
    text: "This week's away gym has a single stand, and the roof leaks. The local newspaper wants an interview.",
    choices: [
      {
        t: 'Say "Every gym is a stage"',
        out: "The interview was a hit in town. Even the home fans applauded you during the game."
      },
      {
        t: 'Say "These conditions aren\'t professional"',
        out: 'You were right, but the headline read "Arrogant star wannabe".'
      }
    ]
  },
  {
    id: "ikinci-is",
    title: "Weekend job",
    text: '"Our cafe needs a weekend waiter. The pay isn\'t bad. But what about practice?"',
    choices: [
      {
        t: "Take the job",
        out: "You carried trays all weekend. One customer recognized you and doubled the tip."
      },
      { t: "Focus on basketball", out: "The wallet is thin, but your mind is on the court." }
    ]
  },
  {
    id: "gozlemci-geldi",
    title: "A stranger in the stands",
    text: "\"There'll be a scout from a higher league in the stands tonight. Play normal, don't overdo it.\"",
    choices: [
      {
        t: "Put on a show",
        out: "You did a dunk show in warm-ups. The coach frowned, but your drive is through the roof."
      },
      {
        t: "Stick to team play",
        out: 'The scout wrote "team player" in his notebook. Your agent is smiling.'
      }
    ]
  },
  {
    id: "forma-satisi",
    title: "Jersey sales",
    text: '"Yours is the best-selling jersey in the club store! The club wants a signing day."',
    choices: [
      {
        t: "Go to the signing day",
        out: "The line spilled out of the store. One kid had you sign his school notebook instead of a jersey."
      },
      {
        t: "I need to rest",
        out: 'The club understood, but social media filled with "he\'s a star now, nose in the air" comments.'
      }
    ]
  },
  {
    id: "transfer-yasagi",
    who: "Sports reporter",
    title: "The pundit's criticism",
    text: 'A famous TV pundit said live on air, "This kid is not a big-game player." The clip is going around.',
    choices: [
      {
        t: "Invite the pundit on, and watch your game together",
        out: 'You watched your game together on air. In the end the pundit said, "I was unfair."'
      },
      {
        t: "Ignore it",
        out: "Your phone wallpaper is now a screenshot of that pundit. You're fired up."
      }
    ]
  },
  {
    id: "sponsor-ayakkabi",
    title: "Shoe sponsor",
    text: "\"A local sportswear brand wants to make you a signature shoe. The money isn't like the big global brands, but they're leaving the design to you.\"",
    choices: [
      {
        t: "Work with the local brand",
        out: "You had your neighbourhood's name printed on the sole. The first batch sold out in a day."
      },
      {
        t: "Wait for the big brand",
        win: { out: "Worth the wait: the global brand is at the door." },
        lose: { out: "The big brand picked another player. The local brand signed with someone else too." }
      }
    ]
  },
  {
    id: "doping-testi",
    who: "Doping control officer",
    title: "Surprise test",
    text: "At 6 a.m. someone knocked on your door: a surprise doping test. Last night you'd been at your friend's birthday party.",
    choices: [
      {
        t: "Take the test right away",
        out: 'The test came back clean. The officer said, "You were the calmest athlete I\'ve had."'
      },
      {
        t: "Coffee first, test later",
        out: 'The officer waited at the door for half an hour and wrote "reluctant to cooperate" in his report. The test is clean, but the coach is not happy.'
      }
    ]
  },
  {
    id: "euro-seyahat",
    title: "Three countries, five days",
    text: "This week it's Madrid, Kaunas and Piraeus. You can't sleep on the plane.",
    choices: [
      {
        t: "A book instead of a sleeping pill",
        out: "You finished a novel on the flights. Your head was much clearer in Kaunas."
      },
      {
        t: "Join the team's game night",
        out: "You organized an okey tournament on the plane. Even the pilot made an announcement."
      }
    ]
  },
  {
    id: "euro-kaunas",
    who: "Žalgiris Arena",
    title: "Kaunas inferno",
    text: "In Kaunas 15,000 people are whistling. During warm-ups someone threw a scarf at you.",
    choices: [
      {
        t: "Throw the scarf back into the stands",
        out: "Even the Lithuanians laughed. All game long they couldn't decide between applauding and booing you."
      },
      {
        t: "Wrap the scarf around your neck",
        out: 'The image was shared all over Europe. Your coach said, "What is this now?"'
      }
    ]
  },
  {
    id: "euro-dil",
    title: "Language course",
    text: "Your teammates chat and laugh among themselves in their own languages. The club suggests a language course.",
    choices: [
      {
        t: "Sign up for the course",
        out: "Three weeks later you made your first joke in the local language. Nobody laughed, but everyone applauded."
      },
      {
        t: "English is enough",
        out: "English gets you by, but you're missing the locker room jokes."
      }
    ]
  },
  {
    id: "euro-final-four",
    title: "Final Four tickets",
    text: '"The whole neighbourhood wants to come to the Final Four! Can you find twelve tickets?"',
    choices: [
      {
        t: "Sort them all out",
        out: "One corner of the stands filled up with neighbours who came from Istanbul. Everyone saw the banner."
      },
      {
        t: "I can only get them for my family",
        out: "{friend} was a bit hurt, but watched the game at the coffeehouse and cheered you on by video."
      }
    ]
  },
  {
    id: "euro-turk-derbi",
    who: "Sports reporter",
    title: "Against a Turkish team",
    text: "This week in the EuroLeague you're playing a Turkish club. Everyone is asking how you feel.",
    choices: [
      {
        t: 'Say "I\'m loyal to my jersey"',
        out: "A professional answer. Some Turkish fans were hurt, but most respected it."
      },
      {
        t: 'Say "My heart is in Istanbul"',
        out: "You trended in Turkey. Your own club's fans weren't too happy."
      }
    ]
  },
  {
    id: "nba-rookie",
    title: "Rookie duty",
    text: "NBA tradition: rookies carry doughnuts onto the team plane. The veterans want three boxes from you.",
    choices: [
      {
        t: "Bring three boxes of baklava",
        out: "You brought baklava instead of doughnuts. The veterans were shocked, then finished the boxes. You're a legend now."
      },
      {
        t: "I won't follow tradition",
        out: "The veterans filled your hotel room with plastic balls."
      }
    ]
  },
  {
    id: "nba-podcast",
    title: "Famous podcast",
    text: '"America\'s most-listened-to basketball podcast wants you. Relax, but be careful: everything is on the record."',
    choices: [
      {
        t: "Talk about simit, tea and the Moda seaside",
        out: "The episode went viral. The next week the host ate a simit live on air."
      },
      {
        t: "Keep it short and professional",
        out: "A calm episode. The club is happy; the internet found you boring."
      }
    ]
  },
  {
    id: "nba-sakatlik-hile",
    title: "Load management",
    text: '"Tomorrow is the second game of a back-to-back. I want to rest you, but the broadcaster wants to see you on the court."',
    choices: [
      {
        t: "Rest",
        out: "The team won while you watched from the sideline. Social media is full of the disappointed kids who bought tickets."
      },
      {
        t: "I want to play",
        out: "Tired, but you were out there. After the game you gave your shoes to a kid."
      }
    ]
  },
  {
    id: "nba-hollywood",
    who: "Producer",
    title: "Film offer",
    text: "A Hollywood producer offers you a small role in a basketball movie. Shooting is in the offseason.",
    choices: [
      {
        t: "Accept",
        out: "You had two lines and forgot one. The film still did well at the box office."
      },
      {
        t: "I'll focus on my season",
        out: 'The producer said, "Next time." Your coach gave you a big hug.'
      }
    ]
  },
  {
    id: "nba-turk-gecesi",
    who: "Club management",
    title: "Turkish Night",
    text: 'The club wants to declare one game "Turkish Night": folk dances at halftime, simit served at the entrance.',
    choices: [
      {
        t: "Take part in the event",
        out: "The arena was full of thousands of crescent-and-star flags. At halftime you joined the zeybek dance yourself."
      },
      {
        t: "Let me just focus on the game",
        out: "The night was still great, but the Turkish fans would have loved to see you dancing on the court."
      }
    ]
  },
  {
    id: "nba-trade",
    title: "Trade rumour",
    text: '"The trade deadline is approaching and your name is on the list. What message do we send the club?"',
    choices: [
      {
        t: '"I want to stay here"',
        out: 'The general manager called you: "You\'re not going anywhere."'
      },
      {
        t: '"I want a contender"',
        out: "The rumours grew. Offers will be better at season's end, but the coach is cold."
      }
    ]
  },
  {
    id: "yildiz-liderlik",
    title: "The young player's trouble",
    text: "The team's youngest player is crying because he isn't getting minutes. He looks up to you.",
    choices: [
      {
        t: "Work with him after practice",
        out: "A week later he scored his first points and ran straight to you."
      },
      {
        t: 'Say "Be patient" and move on',
        out: "A right answer, but a short one. The kid is a little hurt."
      }
    ]
  },
  {
    id: "yildiz-kaptan",
    title: "Locker room speech",
    text: "The team has lost three straight. The coach wants you to give the pre-game speech.",
    choices: [
      {
        t: "Give an emotional speech",
        out: "After your speech nobody said a word. Walking onto the court, everyone hugged each other."
      },
      {
        t: 'Say "We don\'t need talk, we need to play"',
        out: "Short and clear. Some laughed, some took it seriously."
      }
    ]
  },
  {
    id: "yildiz-kiskanclik",
    who: "The team's former star",
    title: "Jealousy",
    text: "The team's former star, who fell out of the starting five because of you, told the press, \"There's favouritism on this team.\"",
    choices: [
      {
        t: "Talk to him face to face",
        out: "A long talk. In the end you shook hands. You gave the press a joint statement."
      },
      {
        t: "Answer on the court",
        out: "You dropped 30 points in the next game. The tension is still there."
      }
    ]
  },
  {
    id: "yedek-sabir",
    title: "Patience on the bench",
    text: "You haven't played in three games. The coach called you into his office: \"Do you know why you're not getting minutes?\"",
    choices: [
      {
        t: '"Tell me what I need to do"',
        out: "The coach opened up the defence videos. You talked for an hour. For the first time, he drew you a plan."
      },
      {
        t: '"You\'re being unfair"',
        out: "The coach silently pointed at the door. You got it off your chest, but your minutes won't increase."
      }
    ]
  },
  {
    id: "yedek-ekstra",
    title: "Night practice",
    text: "A small group of bench players does extra practice in the gym at night. Are you coming?",
    choices: [
      {
        t: "Count me in",
        out: "In the middle of the night there was only the balls and your voices in the gym. {stat} +1."
      },
      {
        t: "I need to rest",
        out: "You slept. The next day you saw their tired but happy faces."
      }
    ]
  },
  {
    id: "yedek-kiralik",
    title: "Loan offer",
    text: '"A club from a lower league wants to loan you until the end of the season. You\'d play every game there."',
    choices: [
      {
        t: "I'll stay here and earn my place",
        out: "When the coach heard your decision, he gave you minutes in the next game."
      },
      {
        t: "Let's reassess at the end of the season",
        out: "Your agent took notes. There'll be more options on the table at season's end."
      }
    ]
  },
  {
    id: "genc-sosyal",
    title: "Viral dance",
    text: '"Everyone\'s doing this dance! Shall we shoot a video in your jersey?"',
    choices: [
      {
        t: "Let's shoot it",
        out: "The video got millions of views. Your coach greeted you at practice with the dance moves."
      },
      {
        t: "I don't dance",
        out: '{friend} shot the video alone. He captioned it "My bro is shy".'
      }
    ]
  },
  {
    id: "genc-araba",
    title: "First car",
    text: '"Son, you got your first big paycheck. Don\'t rush out and buy a sports car. Think about a home first."',
    choices: [
      {
        t: "Listen to your dad, save the money",
        out: 'Your dad proudly told everyone, "Our boy is smart."'
      },
      {
        t: "We only live once, dad",
        out: 'Your dad sighed: "I had my youth too."'
      }
    ]
  },
  {
    id: "genc-sinav",
    title: "Report card day",
    text: '"Your report card came. Math is a little low. Basketball is great, but don\'t quit school, promise me."',
    choices: [
      {
        t: "I promise, mom",
        out: "That week you studied math for an hour every evening. Your mom rewarded you with cake."
      },
      {
        t: "I'm going to the NBA, mom",
        out: 'Your mom smiled: "High school first."'
      }
    ]
  },
  {
    id: "veteran-diz",
    who: "Physiotherapist",
    title: "Knee alert",
    text: '"Your knees are worn out. We need to reduce your training load this week, or the injury risk goes up."',
    choices: [
      {
        t: "Follow the programme",
        out: "A week of pool and bike. Your knees said thank you."
      },
      {
        t: "I'll train as usual",
        out: "You outdid the youngsters in practice, but slept with ice packs that night."
      }
    ]
  },
  {
    id: "veteran-genc-yetenek",
    who: "The team's young talent",
    title: "Taking your spot",
    text: 'A 19-year-old talent arrived at your position. The media is writing "Passing of the torch".',
    choices: [
      {
        t: "Be a big brother to him",
        out: 'You started morning practices with the kid. This time the media writes "Master and apprentice".'
      },
      {
        t: "Don't give up your spot easily",
        out: "One-on-ones heated up in practice. The coach is pleased; the kid is a little scared."
      }
    ]
  },
  {
    id: "veteran-roportaj",
    who: "Documentary crew",
    title: "Career documentary",
    text: "A documentary crew wants to make a film about your career. From the Moda seaside to today.",
    choices: [
      {
        t: "Accept, and film my family too",
        out: "The scene where your mom showed your childhood photos made everyone cry."
      },
      {
        t: "When my career is over",
        out: 'The crew said, "It\'ll be even better then," and left their numbers.'
      }
    ]
  },
  {
    id: "zengin-akraba",
    who: "Distant relative",
    title: "Distant relatives",
    text: 'A relative you\'ve never met called: "My nephew! I have a business idea, I just need a little capital."',
    choices: [
      {
        t: "Politely decline",
        out: 'Your relative said, "I won\'t forget this." Your mom whispered, "You did right."'
      },
      {
        t: "Help out a bit",
        win: { out: "Unbelievable, but the business took off! He sent you your share of the profit." },
        lose: { out: "The business sank in three months. Your relative never called again." }
      }
    ]
  },
  {
    id: "zengin-bagis",
    who: "School principal",
    title: "Your old school",
    text: "The roof of the Mavi Martı Spor Lisesi gym is leaking. The principal called, embarrassed.",
    choices: [
      {
        t: "Have the roof fixed",
        out: "A plaque was hung under the new roof. Your old coach gave a speech at the opening."
      },
      {
        t: "Point him to the club",
        out: "The principal was understanding, but his voice was full of disappointment."
      }
    ]
  },
  {
    id: "batik-kredi",
    title: "Advance",
    text: '"Your account is overdrawn. We can ask the club for a salary advance, but the coach won\'t like it."',
    choices: [
      {
        t: "Ask for an advance",
        out: 'The advance came. The coach said, "Get your life in order."'
      },
      {
        t: "Tighten your belt and get by",
        out: "You lived on pasta for two weeks. But you're debt-free."
      }
    ]
  },
  {
    id: "unlu-hayran",
    who: "Famous singer",
    title: "Famous fan",
    text: "A famous singer said your name at their concert and invited you onto the stage.",
    choices: [
      {
        t: "Get on stage",
        out: "You sang the chorus together. Your voice was awful, but the hall went wild."
      },
      {
        t: "Wave from the audience",
        out: "The cameras turned to you. You smiled and waved."
      }
    ]
  },
  {
    id: "unlu-sahte-hesap",
    title: "Fake account",
    text: '"A fake account has been opened in your name, asking people for money!"',
    choices: [
      {
        t: "Make a statement right away",
        out: "The account was shut down. Your statement was shared thousands of times."
      },
      {
        t: "Leave it to my agent",
        out: "The account stayed up for three days. A few fans got scammed."
      }
    ]
  },
  {
    id: "partner-yildonumu",
    who: "Your partner",
    title: "Anniversary",
    text: "Your anniversary landed on game day.",
    choices: [
      {
        t: "Surprise dinner after the game",
        out: "You celebrated at the only restaurant still open past midnight. The waiter recognized you and brought dessert on the house."
      },
      {
        t: "Postpone it to the next day",
        out: '"I understand," they said. Their voice didn\'t sound understanding.'
      }
    ]
  },
  {
    id: "partner-tasinma",
    who: "Your partner",
    title: "Long distance",
    text: "\"You're in another country, I'm in Istanbul. Should I come over there too?\"",
    choices: [
      {
        t: "Come, let's live together",
        out: "You hugged at the airport. The flat is warmer now."
      },
      {
        t: "Let's keep it as it is for now",
        out: "The video calls continue, but a distance is creeping between you."
      }
    ]
  },
  {
    id: "anne-hasta",
    title: "Your mom in the hospital",
    text: "\"Your mom was admitted to the hospital with a minor ailment. Don't worry, she's fine. But she's asking for you.\"",
    choices: [
      {
        t: "Take the first flight",
        out: 'When she saw you, your mom scolded, "What about your game?" but her eyes were shining.'
      },
      {
        t: "Video call, visit on the weekend",
        out: "She laughed on the phone. By the time you visited at the weekend, she'd already been discharged."
      }
    ]
  },
  {
    id: "milli-forma",
    who: "Federation",
    title: "Jersey signing campaign",
    text: "The federation will put the money from national jersey sales toward sports equipment for village schools. They want you to be the face.",
    choices: [
      {
        t: "Be the face",
        out: "In the ad you shot hoops with kids at a village school. The footage moved everyone."
      },
      {
        t: "My schedule is full",
        out: "The federation signed with another player."
      }
    ]
  },
  {
    id: "milli-marş",
    title: "Anthem moment",
    text: '"During the anthem at yesterday\'s national game, the camera turned to you. Your eyes were welling up. The neighbours are talking about nothing else."',
    choices: [
      {
        t: '"It happens every time, mom"',
        out: "Your mom made that shot her phone screen."
      },
      {
        t: '"I got something in my eye"',
        out: 'Your mom laughed: "Sure, sure."'
      }
    ]
  },
  {
    id: "rakip-onde",
    title: "Message from your rival",
    text: '{rival} wrote to you on social media: "See you at the top, brother." Whether it\'s a jab or friendship, who knows.',
    choices: [
      {
        t: 'Reply "I\'ll be there soon"',
        out: "The exchange got thousands of likes. You ran extra laps in practice."
      },
      {
        t: "Don't reply",
        out: "The message stayed on read. It crossed your mind again in the evening."
      }
    ]
  },
  {
    id: "moral-dusuk",
    title: "Old friends",
    text: '"We haven\'t seen each other in a long time. Shall we have tea in Moda? Like old times."',
    choices: [
      {
        t: "Come right over",
        out: "You talked for hours by the seaside. Nobody asked about basketball. It was exactly what you needed."
      },
      {
        t: "My head is too full",
        out: "{friend} was understanding, but their voice sounded sad."
      }
    ]
  },
  {
    id: "moral-psikolog",
    who: "Club psychologist",
    title: "Club psychologist",
    text: "The club's sports psychologist knocked on your door: \"You haven't been smiling in recent games. Want to talk?\"",
    choices: [
      {
        t: "Let's talk",
        out: "An hour-long talk. Leaving, it felt like a weight had lifted off your shoulders."
      },
      {
        t: "I'm fine, no need",
        out: 'The psychologist left their card: "My door is open."'
      }
    ]
  },
  {
    id: "yorgun-uyku",
    title: "Sleepless nights",
    text: '"You sound so tired. What time do you even go to bed?"',
    choices: [
      {
        t: "I'll go to bed early this week",
        out: "You left your phone outside the bedroom. Three nights later you felt like a new person."
      },
      {
        t: "The games run long, mom",
        out: "Your mom sighed deeply. The console is still on."
      }
    ]
  },
  {
    id: "yorgun-masaj",
    title: "Massage chair",
    text: '"The club got a new massage chair but the queue is huge. I reserved a spot for myself, you can have it if you want."',
    choices: [
      {
        t: "Thank them and use it",
        out: "You fell asleep in the chair. {mate} put a blanket over you."
      },
      {
        t: "You use it, I'm fine",
        out: '{mate} said, "You\'re a real teammate."'
      }
    ]
  }
];
