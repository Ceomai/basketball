/* ================= HARD EVENTS · ENGLISH TRANSLATION =================
   Only text fields; mechanics come from events.hard.tr.js via the same id. */
export default [
  {
    id: "h-ayrilik",
    title: "We need to talk",
    text: '"These past months it\'s always practice, always games. I feel alone in this relationship. I want to break up."',
    choices: [
      {
        t: "Try to change her mind",
        win: {
          out: "It was a long night. In the end she decided to give it another chance. You'll need to make more time for her."
        },
        lose: { out: "Her mind was made up. When you got home, the place was very quiet." }
      },
      { t: "Respect it and part ways", out: "A calm goodbye, but you'll feel the gap for a few weeks." }
    ]
  },
  {
    id: "h-dede",
    title: "We lost your grandfather",
    text: '"Son... your grandfather passed away this morning. The funeral is tomorrow back home."',
    choices: [
      {
        t: "Go to the funeral",
        out: "You were with your family. He always wanted to watch you from the stands; you dedicated the season to him."
      },
      { t: "Stay with the team", out: "You played, but your mind was back home. Your family was a little hurt." }
    ]
  },
  {
    id: "h-baba-hasta",
    title: "Your father is unwell",
    text: "\"Your father can't work for a few weeks. Making ends meet will be hard this month. I didn't want to tell you.\"",
    choices: [
      {
        t: "Cover the expenses",
        out: "You took the weight off your family. Your mother cried on the phone; she didn't know how to thank you."
      },
      {
        t: "Be with them on weekends",
        out: "Every weekend on the road. You're tired, but your father perks up every time he sees you."
      },
      { t: "There's nothing I can do right now", out: "When you hung up, something heavy stayed with you." }
    ]
  },
  {
    id: "h-soygun",
    who: "Your neighbor",
    title: "Break-in",
    text: '"Your door was open, so I called the police. The place is a mess."',
    choices: [
      { t: "Install a security system", out: "Insurance covered part of it, but you didn't sleep well at home for a while." },
      { t: "Let it go, it's just stuff", out: "The loss wasn't huge, but your peace of mind was gone." }
    ]
  },
  {
    id: "h-sosyal",
    who: "Social media",
    title: "Pile-on",
    text: "After a bad game, a clip of you was taken out of context. Thousands of comments, tags, insults.",
    choices: [
      {
        t: "Make a statement",
        win: { out: "Your honest statement turned it around. The fans stood behind you." },
        lose: { out: "The statement poured fuel on the fire. You'll need to stay quiet for a few weeks." }
      },
      { t: "Turn off your phone, focus on the court", out: "A rough few days. Then the news moved on." }
    ]
  },
  {
    id: "h-menajer",
    who: "Your lawyer",
    title: "Agent misconduct",
    text: '"{agent} secretly inflated the commission on your last contract. We have the documents."',
    choices: [
      {
        t: "Sue",
        win: { out: "You won the case and got the money back. Your agent apologized." },
        lose: { out: "The case dragged on and the legal fees came out of your pocket." }
      },
      { t: "Quietly part ways", out: "You took the loss. Offers may be a bit slow until your new agent gets to know you." }
    ]
  },
  {
    id: "h-zehir",
    title: "Food poisoning",
    text: "After the team dinner you were sick all night. In the morning you can barely stand.",
    choices: [
      { t: "See a doctor and rest", out: "You got an IV. Two days in bed." },
      {
        t: "Take a pill and go to practice",
        win: { out: "You were exhausted but showed up. The coach noticed." },
        lose: { out: "You nearly fainted mid-practice. The coach sent you home." }
      }
    ]
  },
  {
    id: "h-kaza",
    title: "Car accident",
    text: '"The guy who rear-ended your car drove off. You\'re okay, but your neck is stiff."',
    choices: [
      { t: "See a physio", out: "Early treatment helped. You recovered in a few days." },
      {
        t: "It'll pass",
        win: { out: "It really did pass. You were lucky." },
        lose: { out: "The pain lasted for weeks; you feel it even when you shoot." }
      }
    ]
  },
  {
    id: "h-arkadas",
    title: "A friend asks for a loan",
    text: '"Bro, things went badly. Could you lend me some money? I\'ll pay you back at the end of the month."',
    choices: [
      {
        t: "Lend it",
        win: { out: "{friend} brought the money on the day he promised. Your friendship grew stronger." },
        lose: { out: "The money never came back. {friend} isn't answering your calls." }
      },
      { t: "Politely say no", out: '"I get it," he said, but his voice was cold.' }
    ]
  },
  {
    id: "h-yedek",
    title: "Benched",
    text: "\"I haven't seen the energy I want these past weeks. You're coming off the bench next game.\"",
    choices: [
      { t: "Answer with extra practice", out: "First in, last out. The coach saw it." },
      {
        t: "Knock on his door and argue",
        win: { out: "You talked. He didn't change his decision, but he listened." },
        lose: { out: "The argument escalated. It's the talk of the locker room." }
      }
    ]
  }
];
