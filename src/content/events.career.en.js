/* ================= CAREER STAGE EVENTS · ENGLISH TRANSLATION (pack 4d) =================
   Only text fields; mechanics come from events.career.tr.js via the same id (same order). */
export default [
  {
    id: "kr-menajer-pay",
    title: "Your agent's cut",
    text: '"I\'m opening bigger doors for you, you can see that. We need to bump my commission a little."',
    choices: [
      {
        t: "Agree, let them work",
        out: "Your agent's phone didn't stop ringing that week. Better offers will be on the table at season's end."
      },
      {
        t: "Negotiate",
        win: { out: '"Fine, same rate as before," they said. You were both laughing as you got up from the table.' },
        lose: { out: "They agreed, but the tone went cold. Offers might reach you a little late for a while." }
      },
      {
        t: "Start reading contracts yourself",
        out: "You went through every clause until midnight. You understood half of it, but now you know which questions to ask."
      }
    ]
  },
  {
    id: "kr-uzatma",
    title: "Early extension offer",
    text: '"The club wants to extend before your contract runs out. The number is good, but if you hit free agency the market could be even better."',
    choices: [
      {
        t: "Sign it, peace of mind",
        out: 'The president hugged you at the signing. The fans unfurled a banner: "Our kid is staying."'
      },
      {
        t: "Wait, test the market",
        out: 'Your agent is thrilled, the fans are nervous. Someone in the stands waved a sign: "Are you staying?"'
      }
    ]
  },
  {
    id: "kr-bonus-madde",
    title: "Performance clause",
    text: '"Instead of a flat salary, the club is offering a bonus clause tied to your points per game. Do you back yourself?"',
    choices: [
      {
        t: "I back myself",
        win: { out: "You hit the target with two games to spare. The bonus arrived from accounting with a slightly sour face." },
        lose: {
          out: "You missed the target by three points. That open shot in the last game will haunt your dreams for a while."
        }
      },
      {
        t: "Keep the flat salary",
        out: "No surprises, no stress. Your agent said \"You're cautious\" and you couldn't tell if that was praise."
      }
    ]
  },
  {
    id: "kr-takas-soylenti",
    who: "Reporter",
    title: "On the trading block",
    text: "A sports site reports the club has put you on the trade block. Everyone in the locker room is staring at their phone.",
    choices: [
      {
        t: "Ask the coach directly",
        win: { out: '"News to me. You\'re in my plans," he said, looking you in the eye.' },
        lose: { out: 'A long silence. "That\'s up to the front office," he said. Not a great answer.' }
      },
      { t: "Answer on the court", out: "First in, last out at practice all week. The scoreboard will silence the rumour." },
      { t: "Joke about it online", out: "Your suitcase emoji post got record likes. The front office didn't laugh at all." }
    ]
  },
  {
    id: "kr-yeni-genc",
    title: "The new kid",
    text: 'The club signed a hugely talented 19-year-old at your position. The press is calling him "the star of the future".',
    choices: [
      {
        t: "Take him under your wing",
        out: "You showed him your defensive footwork. In his first interview, he thanked you before anyone else."
      },
      {
        t: "Show him there's no room yet",
        out: "You blocked him twice in your first one-on-one. The kid is good, but it's still your turn."
      }
    ]
  },
  {
    id: "kr-genc-rakip",
    title: "Voice of the new generation",
    text: "The league's young star said on a stream: \"The old guard is slow now, it's our time.\" Everyone knows he meant you.",
    choices: [
      { t: "Talk in the game", out: 'Fans are billing it as a "generation war". You\'ve never been this locked in at practice.' },
      { t: "Reply with a joke", out: 'You posted: "Slow, but I know the way." Even the younger fans loved it.' },
      { t: "Ignore it", out: "The coach appreciated your calm. A small spark stayed lit inside you anyway." }
    ]
  },
  {
    id: "kr-soyunma-kavga",
    title: "Locker room tension",
    text: "After an ugly loss, two of your teammates are screaming at each other. Everyone is looking at you.",
    choices: [
      {
        t: "Step in and take the floor",
        win: { out: "You kept it short and clear. Nobody answered back; the next day the two of them shot around together." },
        lose: { out: "The anger suddenly turned on you. Things calmed down, but they barely spoke to you for a while." }
      },
      {
        t: "Leave it to the coach",
        out: "The coach shut the door and talked for half an hour. Everyone noticed the leadership gap."
      }
    ]
  },
  {
    id: "kr-takim-yemegi",
    title: "Team dinner",
    text: 'After a losing streak the mood is at rock bottom. Someone asked "Should we set up a dinner?" and everyone turned to you.',
    choices: [
      { t: "Dinner's on me", out: "A long table, lots of laughter. The first night all season that truly felt like a team." },
      { t: "Everyone pays their own", out: "Dinner was nice, splitting the bill took a while. Still, it helped." }
    ]
  },
  {
    id: "kr-kaptanlik-teklif",
    title: "The armband",
    text: '"Our captain is injured. I want to give you the armband this season. It\'s a heavy responsibility, but I trust you."',
    choices: [
      { t: "Accept it proudly", out: "Your voice shook a little at the first meeting. Then everyone stood up and applauded." },
      {
        t: "Give it to one of the young guys",
        out: "The armband went to the young point guard. Before games he still comes to you to ask what to do."
      }
    ]
  },
  {
    id: "kr-sakatlik-korku",
    title: "You're afraid of that move",
    text: "\"I've noticed. Since the old injury, you never drive to that side. Your body healed; your head didn't.\"",
    choices: [
      {
        t: "Work with a sports psychologist",
        out: "Three sessions, a lot of breathing exercises. This week you drove that side without thinking for the first time."
      },
      {
        t: "Attack it in practice",
        win: { out: "Ten reps, twenty reps... In the end you felt more tired than scared. It worked." },
        lose: { out: "A slight tweak, a big panic. Nothing serious, luckily, but your confidence slipped a little more." }
      },
      {
        t: "Change your game",
        out: "You decided to play more from the outside. The coach isn't convinced but goes along with it for now."
      }
    ]
  },
  {
    id: "kr-erken-donus",
    title: "Pressure to come back early",
    text: '"The doctor says two more weeks, but we\'re in the playoff race. If you feel ready, I need ten minutes from you tonight."',
    choices: [
      { t: "Listen to the doctor", out: "Watching from the bench was hard. But some day your knee will thank you." },
      { t: "Play for the team", out: "Two key stops in ten minutes. Ice bags at night, a huge smile in the morning." }
    ]
  },
  {
    id: "kr-eski-paylasim",
    who: "Reporter",
    title: "A post from years ago",
    text: "Someone dug up a post of yours from high school that looks really bad today. The tags are piling up.",
    choices: [
      {
        t: "Write a sincere apology",
        out: "Short and honest. A few days later it blew over; some people praised your maturity."
      },
      {
        t: "Say you were hacked",
        win: { out: "Somehow they bought it. But you know, and that stings a little." },
        lose: { out: "The post's date and location surfaced. The crisis doubled." }
      },
      {
        t: "Go offline for a week",
        out: "A week without your phone. The storm passed while you were gone, and your sleep improved too."
      }
    ]
  },
  {
    id: "kr-roportaj-tuzak",
    who: "Reporter",
    title: "A loaded question",
    text: "\"There's talk of complaints inside the team about the coach's rotations. Aren't you unhappy too?\"",
    choices: [
      {
        t: 'Go with a cliché: "One game at a time"',
        out: "The reporter was disappointed. The coach brought you a coffee the next morning."
      },
      { t: "Be honest, a little", out: '"Everybody wants to play more," you said. Headline: "Star takes a dig at the coach".' },
      {
        t: "Turn it back on the reporter",
        win: { out: '"Who\'s your source? Tell him to come play," you said. The room laughed and the clip went viral.' },
        lose: { out: 'The joke fell flat. The clip went around titled "awkward moments".' }
      }
    ]
  },
  {
    id: "kr-mikrofon-acik",
    title: "The mic was on",
    text: "Something you said about the referee during a timeout got caught on the courtside mic. The clip is already spreading.",
    choices: [
      { t: "Apologise to the referee", out: 'You shook the ref\'s hand the next game. "It happens," he said. No fine.' },
      {
        t: "Stand by it",
        win: { out: "The fans rallied behind you. They even printed T-shirts." },
        lose: { out: "The league fined you. The clip spread anyway, no T-shirts required." }
      }
    ]
  },
  {
    id: "kr-reklam-cekimi",
    title: "Take fourteen on the ad set",
    text: "You're shooting an energy drink commercial. The director wants you to dunk and wink at the camera. For the fourteenth time.",
    choices: [
      { t: "Keep going patiently", out: "Take seventeen nailed it. The director cried, and you nearly did too." },
      {
        t: "Pitch your own idea",
        win: { out: "Lob from behind, one-handed slam, walk away without even looking at the camera. The ad is everywhere." },
        lose: { out: 'The agency called your idea "bold" and didn\'t use it. The wink stays.' }
      },
      {
        t: "Call it a wrap and walk off",
        out: "Your agent spent a long call apologising. Whether the brand calls again is anyone's guess."
      }
    ]
  },
  {
    id: "kr-sponsor-celiski",
    title: "Rival brands",
    text: '"The club\'s kit sponsor and your personal sponsor are rival brands. Which shoes are you wearing at the launch?"',
    choices: [
      {
        t: "Stay loyal to your sponsor",
        out: "The front office isn't pleased, but a contract is a contract. Your agent can breathe."
      },
      { t: "Tape over the logo", out: "Black-taped sneakers suddenly became a trend. Both brands grumbled, but nobody lost." }
    ]
  },
  {
    id: "kr-hayir-maci",
    title: "Summer charity game",
    text: '"We\'re organising a charity game for the hospital. If stars show up, tickets will fly. Will you come, and maybe donate?"',
    choices: [
      { t: "Play and donate", out: "A kid sent a cheering video from a hospital bed. You didn't show it to anyone for a while." },
      { t: "Just come to the game", out: "Sold out. At halftime you had a free-throw contest with the kids, and lost." },
      { t: "My schedule is full", out: "Your friend was understanding, but you could hear the hurt in their voice." }
    ]
  },
  {
    id: "kr-uzun-deplasman",
    title: "Five cities, nine days",
    text: "Day seven of the long road trip. The hotel rooms have blurred together; this morning you didn't know which city you woke up in.",
    choices: [
      {
        t: "Stick to your sleep routine",
        out: "Eye mask, white noise, lights out at ten. The team played cards while you slept nine hours."
      },
      {
        t: "Join the team's card game",
        out: "A tournament that went past midnight. You lost, but it was the best moment of the trip."
      }
    ]
  },
  {
    id: "kr-havalimani",
    title: "Delayed",
    text: "Your flight is delayed six hours. A group of kids in jerseys sitting on the floor by the gate have spotted you.",
    choices: [
      { t: "Chat with the kids", out: "Autographs, photos, a million questions. Six hours went by faster than expected." },
      { t: "Nap in the lounge", out: "When you woke up one of your earbuds was gone, but your body is grateful." }
    ]
  },
  {
    id: "kr-yasli-vucut",
    title: "Your knees talk in the morning",
    text: '"Your warm-up used to take ten minutes, now it\'s half an hour. Should we cut your training load?"',
    choices: [
      {
        t: "Cut the load, save it for games",
        out: "You watched half of practice from the side. Fresh legs on game day, but it stings a little."
      },
      {
        t: "Start a yoga and stretching routine",
        out: "Week one you couldn't touch your toes. By week three your teammates started joining you."
      },
      {
        t: 'Say "I\'m fine" and go full speed',
        win: { out: "Your body held up another week. But the question mark is still there." },
        lose: { out: "Hamstring tweak. Not serious, but the message is clear: age is just a number, but numbers count." }
      }
    ]
  },
  {
    id: "kr-beslenme-uzmani",
    title: "The plate that extends careers",
    text: "The club nutritionist drew up a new plan: no sugar, no late-night snacks, and definitely none of your favourite dessert.",
    choices: [
      {
        t: "Follow it to the letter",
        out: "Two weeks later you're taking the stairs two at a time. But you dream about that dessert every night."
      },
      { t: "Only with a weekend cheat meal", out: "The nutritionist raised an eyebrow but agreed. Sunday evenings are sacred." }
    ]
  },
  {
    id: "kr-emeklilik-sorusu",
    who: "Reporter",
    title: '"When are you retiring?"',
    text: "At a press conference after a rough game, a young reporter asks about your retirement plans.",
    choices: [
      { t: '"When my body tells me"', out: "A calm, mature answer. The room applauded and the reporter blushed." },
      {
        t: '"I\'ll answer that on the court"',
        out: "There was fire in your eyes. That line made it into the club's promo video."
      }
    ]
  },
  {
    id: "kr-sozlesme-maddesi",
    title: "The fine print",
    text: '"Your contract has no release clause if a top-league club calls. The club can keep you as long as it wants. Shall we try to add one?"',
    choices: [
      {
        t: "Push for a release clause",
        win: { out: "The club added it, reluctantly. The door is now ajar." },
        lose: { out: "The president snapped, \"Don't you trust us?\" And the clause didn't go in." }
      },
      {
        t: "Show loyalty to the club",
        out: "The president called you in to thank you. Looks like you'll get more touches this season."
      }
    ]
  },
  {
    id: "kr-ust-lig-antrenman",
    title: "Tryout practice",
    text: '"A top-league club wants you at one of their practices. But we have a big game that same day."',
    choices: [
      {
        t: "Go to the tryout",
        win: { out: "After practice their coach asked your name and wrote it down. That's a good sign." },
        lose: { out: "You played well, but they picked someone else. And your own team lost the game." }
      },
      { t: "Stay with your team", out: "You dropped twenty in the game. Maybe that scout was watching this one, who knows?" }
    ]
  },
  {
    id: "kr-euro-cift-mac",
    title: "Double-game week",
    text: '"Europe on Tuesday, Europe on Thursday, league on Sunday. We need to split your minutes. Which games do you want?"',
    choices: [
      {
        t: "Play the European games",
        out: "Two games against the best on the continent. You're tired, but the shop window is huge."
      },
      { t: "Rest in the league game", out: "Fans grumbled seeing you on the bench in the league. But your legs say thanks." }
    ]
  },
  {
    id: "kr-nba-rookie-saka",
    title: "The pink backpack",
    text: "The team's veterans gave you a huge pink backpack with a cartoon character on it. You'll be carrying it all season.",
    choices: [
      {
        t: "Carry it proudly",
        out: "The photo of you walking through the airport with it became the most shared picture in the league."
      },
      { t: "Try to hide the backpack", out: "When they found it, they added a matching pink hat." },
      {
        t: "Buy everyone breakfast",
        out: "Rookie tradition: a breakfast order for twenty at 6 a.m. Nobody forgot the backpack, but you won them over."
      }
    ]
  },
  {
    id: "kr-nba-back-to-back",
    title: "Back-to-back",
    text: '"We went to overtime last night, and tonight there\'s another game two hours away. Should we do load management?"',
    choices: [
      {
        t: "Load management, rest",
        out: "A photo of a sad kid who bought a ticket to see you hit the internet. Fresh legs, guilty conscience."
      },
      { t: "Play, the fans came to see you", out: "You could barely stand, but you gave that kid your jersey after the game." }
    ]
  },
  {
    id: "kr-nba-two-way",
    title: "Two-way contract",
    text: '"The club is thinking about moving you to a two-way deal: half the week in the G League, half here. You have two weeks to stick on the roster."',
    choices: [
      {
        t: "Put in extra work",
        out: "You were alone in the gym after everyone left. An assistant coach gave you a note before turning off the lights."
      },
      {
        t: "Have your agent look elsewhere",
        out: 'Your agent called three clubs. One was interested, but for now it\'s just "interested".'
      },
      {
        t: "See the G League as a chance",
        out: "You'll play forty minutes down there. Minutes, mistakes, growth. That could be your ticket back."
      }
    ]
  },
  {
    id: "kr-nba-draft-anisi",
    who: "Reporter",
    title: "The draft night question",
    text: '"What do you think of the twelve teams that passed on you in the draft?" The reporter shoves a mic in your face.',
    choices: [
      { t: '"I thank every one of them"', out: "You said it with a smile, but everyone got the message. The clip went viral." },
      { t: '"The past is the past"', out: 'After the press conference the coach tapped your shoulder: "Professional."' }
    ]
  },
  {
    id: "kr-nba-buyuk-sehir",
    who: "Reporter",
    title: "Big city, big headline",
    text: 'After a three-game slump, the mega-city tabloids put your photo on the cover under the headline "Where is this star?"',
    choices: [
      {
        t: "Pin the headline in your locker",
        out: "You look at that cover before every practice. The writer heard about it and softened a bit in the next column."
      },
      { t: "Go dark on the media for a week", out: "A quiet week behind closed doors. But the silence became a headline too." },
      {
        t: "Organise a meet-up with the fans",
        out: "A shooting contest with fans in a local gym. The next day's cover had you smiling."
      }
    ]
  },
  {
    id: "kr-nba-allstar-etkinlik",
    title: "Celebrity game invite",
    text: '"You\'ve been asked to coach in the All-Star weekend celebrity game. Your roster: a singer, two actors and a chef."',
    choices: [
      {
        t: "Draw up a serious game plan",
        win: { out: "The chef hit the game-winner! Clips of you roaring on the sideline like a real coach are on every phone." },
        lose: { out: "The singer ran to the wrong basket three times. You lost, but your stomach hurt from laughing." }
      },
      {
        t: "Just have fun",
        out: "You threw balls into the crowd during timeouts and danced on the sideline. Who cares about the score."
      },
      {
        t: "Politely decline, rest",
        out: "You watched the celebrity game from the couch. The chef's shooting really was terrible."
      }
    ]
  },
  {
    id: "kr-nba-g-league",
    title: "A week down below",
    text: "\"We're sending you to the G League team for a week. It's not a punishment; you need minutes. But how you take it matters.\"",
    choices: [
      {
        t: "Play forty minutes, let the numbers talk",
        out: "Thirty-four points, ten rebounds. The report was on the coach's desk the next morning."
      },
      { t: "Make your frustration known", out: 'You posted a cryptic "...". Fans got curious, the coach got annoyed.' }
    ]
  },
  {
    id: "kr-nba-sehir-hayati",
    title: "The city you've never seen",
    text: "\"We've lived in this city for two years and you've seen nothing but the arena, hotels and airports. Shall we go out tonight?\"",
    choices: [
      { t: "Tonight is all hers", out: "A small restaurant, a long walk. The waiter recognised you and never brought the bill." },
      { t: "Game tomorrow, postpone", out: '"There\'s always a game tomorrow," she said, smiling but tired.' }
    ]
  },
  {
    id: "kr-nba-imza-ayakkabi",
    title: "Prototype shoes",
    text: '"A brand sent a prototype for your signature shoe. Wear it tonight and social media explodes, but it might not fit right yet."',
    choices: [
      {
        t: "Wear it in the game",
        win: { out: "The shoes shone, and so did you. The brand called the next morning." },
        lose: { out: "Blisters by the second quarter; you switched back to your old pair at halftime." }
      },
      { t: "Try it in practice first", out: "After two practices the shoe fit perfectly. The brand appreciated your patience." }
    ]
  },
  {
    id: "kr-trade-deadline",
    title: "Trade deadline day",
    text: "\"The deadline is 3 p.m. today. Keep your phone on. Don't sit in the hotel, and don't pack. Or do.\"",
    choices: [
      {
        t: "Turn the phone off, go to the gym",
        out: 'You shot for an hour. When you turned the phone on, there were twenty-one messages, all saying "nothing happened".'
      },
      { t: "Refresh the news every second", out: "3:01 p.m. Nothing happened. But those six hours took a year off your life." }
    ]
  }
];
