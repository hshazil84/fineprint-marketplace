export interface Quote {
  text:   string
  author: string
}

export interface Greeting {
  message: string
  emoji:   string
}

export interface SpecialDay {
  month:   number
  day:     number
  message: string
  emoji:   string
  quote?:  Quote
}

// ── Time-based greetings ──────────────────────────────────────────────────────
// {name} will be replaced with the artist's display name

export const GREETINGS: Record<string, Greeting[]> = {
  morning: [
    { message: "Good morning, {name}. How was your morning coffee?",       emoji: '☕' },
    { message: "Rise and shine, {name}. The world needs your art today.",   emoji: '🌅' },
    { message: "Good morning, {name}. A fresh canvas awaits.",              emoji: '🎨' },
    { message: "Morning, {name}. Make today beautiful.",                    emoji: '✨' },
    { message: "Good morning, {name}. What will you create today?",         emoji: '🌄' },
    { message: "Morning light, {name}. Your best work might be today.",     emoji: '🌞' },
    { message: "Good morning, {name}. The day is yours.",                   emoji: '🌿' },
    { message: "Morning, {name}. Begin gently. Begin well.",                emoji: '🕊️' },
  ],
  afternoon: [
    { message: "Good afternoon, {name}. Keep the momentum going.",         emoji: '☀️' },
    { message: "Afternoon, {name}. How's the work coming along?",           emoji: '🖌️' },
    { message: "Good afternoon, {name}. Stay inspired.",                    emoji: '💫' },
    { message: "Afternoon, {name}. The day is still full of possibility.",  emoji: '🌻' },
    { message: "Good afternoon, {name}. Breathe. Create. Repeat.",         emoji: '🌊' },
    { message: "Afternoon, {name}. Every brushstroke counts.",              emoji: '🎭' },
  ],
  golden: [
    { message: "Golden hour, {name}. The most beautiful time of day.",     emoji: '🌇' },
    { message: "That golden light is for you, {name}.",                    emoji: '🌆' },
    { message: "Evening approaches, {name}. How did your day unfold?",     emoji: '🌅' },
    { message: "The golden hour belongs to creators, {name}.",             emoji: '✨' },
    { message: "Slow down, {name}. Soak in this light.",                   emoji: '🌇' },
  ],
  evening: [
    { message: "Good evening, {name}. Time to wind down and reflect.",     emoji: '🌆' },
    { message: "Evening, {name}. You showed up today. That matters.",      emoji: '🌙' },
    { message: "Good evening, {name}. Rest is part of the creative life.", emoji: '🕯️' },
    { message: "Evening, {name}. What are you grateful for today?",        emoji: '🌠' },
    { message: "Good evening, {name}. The day was good.",                  emoji: '🌃' },
  ],
  night: [
    { message: "Good night, {name}. Rest well. Create more tomorrow.",     emoji: '🌙' },
    { message: "Late night, {name}? The best ideas come in the quiet.",    emoji: '⭐' },
    { message: "Night, {name}. Tomorrow is a fresh start.",                emoji: '🌌' },
    { message: "Good night, {name}. Dream in colour.",                     emoji: '💫' },
  ],
}

// ── Special days ──────────────────────────────────────────────────────────────

export const SPECIAL_DAYS: SpecialDay[] = [
  {
    month: 1, day: 1,
    message: "Happy New Year, {name}! A brand new chapter begins.",
    emoji: '🎉',
    quote: { text: "Every new beginning comes from some other beginning's end.", author: "Seneca" },
  },
  {
    month: 12, day: 31,
    message: "Last day of the year, {name}. Make it count.",
    emoji: '🥂',
    quote: { text: "An ending is just a beginning waiting to happen.", author: "Unknown" },
  },
  {
    month: 7, day: 26,
    message: "Happy Independence Day, {name}! 🇲🇻 Proud to be Maldivian.",
    emoji: '🇲🇻',
    quote: { text: "Freedom is never voluntarily given by the oppressor; it must be demanded by the oppressed.", author: "Martin Luther King Jr." },
  },
]

// ── Quotes ────────────────────────────────────────────────────────────────────

export const QUOTES: Quote[] = [
  // Rumi
  { text: "Do not be satisfied with the stories that come before you. Unfold your own myth.",                    author: "Rumi" },
  { text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.",               author: "Rumi" },
  { text: "What you seek is seeking you.",                                                                        author: "Rumi" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "Silence is the language of God. All else is poor translation.",                                       author: "Rumi" },
  { text: "You were born with wings. Why prefer to crawl through life?",                                         author: "Rumi" },
  { text: "The wound is the place where the light enters you.",                                                   author: "Rumi" },
  { text: "Let yourself be silently drawn by the strange pull of what you really love.",                         author: "Rumi" },
  { text: "Don't grieve. Anything you lose comes round in another form.",                                        author: "Rumi" },
  { text: "Be a lamp, or a lifeboat, or a ladder. Help someone's soul heal.",                                   author: "Rumi" },
  { text: "Forget safety. Live where you fear to live. Destroy your reputation. Be notorious.",                  author: "Rumi" },
  { text: "The garden of the world has no limits, except in your mind.",                                         author: "Rumi" },

  // Paulo Coelho
  { text: "When you want something, all the universe conspires in helping you to achieve it.",                   author: "Paulo Coelho" },
  { text: "It's the possibility of having a dream come true that makes life interesting.",                       author: "Paulo Coelho" },
  { text: "One day you will wake up and there won't be any more time to do the things you've always wanted. Do it now.", author: "Paulo Coelho" },
  { text: "Tell your heart that the fear of suffering is worse than the suffering itself.",                      author: "Paulo Coelho" },
  { text: "The secret of life is to fall seven times and to get up eight times.",                                author: "Paulo Coelho" },
  { text: "You drown not by falling into a river, but by staying submerged in it.",                             author: "Paulo Coelho" },
  { text: "We must take adventures in order to know where we truly belong.",                                     author: "Paulo Coelho" },
  { text: "Wherever your heart is, there you will find your treasure.",                                          author: "Paulo Coelho" },

  // Prophet Muhammad ﷺ
  { text: "The strongest among you is the one who controls his anger.",                                          author: "Prophet Muhammad ﷺ" },
  { text: "Be in this world as if you were a stranger or a traveler.",                                           author: "Prophet Muhammad ﷺ" },
  { text: "The best of people are those that bring the most benefit to the rest of mankind.",                    author: "Prophet Muhammad ﷺ" },
  { text: "Speak good or remain silent.",                                                                         author: "Prophet Muhammad ﷺ" },
  { text: "Make things easy and do not make them difficult. Cheer people up and do not drive them away.",        author: "Prophet Muhammad ﷺ" },
  { text: "Richness is not having many possessions, but richness is being content with oneself.",                author: "Prophet Muhammad ﷺ" },

  // Quran
  { text: "Verily, with every hardship comes ease.",                                                             author: "Quran 94:5" },
  { text: "So lose not heart, nor fall into despair. For you will be superior if you are true in faith.",        author: "Quran 3:139" },
  { text: "Indeed, Allah is with the patient.",                                                                   author: "Quran 2:153" },
  { text: "And He found you lost and guided you.",                                                                author: "Quran 93:7" },
  { text: "Do not grieve. Indeed, Allah is with us.",                                                            author: "Quran 9:40" },
  { text: "And it may be that you dislike a thing which is good for you.",                                       author: "Quran 2:216" },
  { text: "Allah does not burden a soul beyond that it can bear.",                                               author: "Quran 2:286" },

  // Maya Angelou
  { text: "Try to be a rainbow in someone's cloud.",                                                             author: "Maya Angelou" },
  { text: "You can't use up creativity. The more you use, the more you have.",                                   author: "Maya Angelou" },
  { text: "There is no greater agony than bearing an untold story inside you.",                                  author: "Maya Angelou" },
  { text: "Nothing will work unless you do.",                                                                     author: "Maya Angelou" },
  { text: "We may encounter many defeats but we must not be defeated.",                                          author: "Maya Angelou" },

  // Lao Tzu
  { text: "The journey of a thousand miles begins with one step.",                                               author: "Lao Tzu" },
  { text: "Nature does not hurry, yet everything is accomplished.",                                              author: "Lao Tzu" },
  { text: "He who knows others is wise. He who knows himself is enlightened.",                                   author: "Lao Tzu" },
  { text: "When you realize there is nothing lacking, the whole world belongs to you.",                          author: "Lao Tzu" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.",                          author: "Lao Tzu" },

  // Art & Creativity
  { text: "Creativity takes courage.",                                                                            author: "Henri Matisse" },
  { text: "Every artist was first an amateur.",                                                                   author: "Ralph Waldo Emerson" },
  { text: "Art enables us to find ourselves and lose ourselves at the same time.",                               author: "Thomas Merton" },
  { text: "The purpose of art is washing the dust of daily life off our souls.",                                 author: "Pablo Picasso" },
  { text: "I found I could say things with color and shapes that I couldn't say any other way.",                 author: "Georgia O'Keeffe" },
  { text: "To be an artist is to believe in life.",                                                              author: "Henry Moore" },
  { text: "An artist cannot fail; it is a success to be one.",                                                   author: "Charles Horton Cooley" },

  // Thich Nhat Hanh
  { text: "The present moment is the only moment available to us, and it is the door to all moments.",          author: "Thich Nhat Hanh" },
  { text: "Walk as if you are kissing the Earth with your feet.",                                                author: "Thich Nhat Hanh" },
  { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",                 author: "Thich Nhat Hanh" },

  // Others
  { text: "Start where you are. Use what you have. Do what you can.",                                            author: "Arthur Ashe" },
  { text: "It always seems impossible until it's done.",                                                         author: "Nelson Mandela" },
  { text: "A good head and a good heart are always a formidable combination.",                                   author: "Nelson Mandela" },
  { text: "Darkness cannot drive out darkness; only light can do that.",                                         author: "Martin Luther King Jr." },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.",                       author: "Chinese Proverb" },
  { text: "A flower does not think of competing with the flower next to it. It just blooms.",                   author: "Zen Proverb" },
  { text: "It does not matter how slowly you go as long as you do not stop.",                                    author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.",                      author: "Confucius" },
  { text: "Vulnerability is the birthplace of innovation, creativity, and change.",                             author: "Brené Brown" },
  { text: "In the depth of winter, I finally learned that within me there lay an invincible summer.",           author: "Albert Camus" },
  { text: "Even the darkest night will end and the sun will rise.",                                              author: "Victor Hugo" },
  { text: "Happiness is not something ready-made. It comes from your own actions.",                             author: "Dalai Lama" },
  { text: "My religion is very simple. My religion is kindness.",                                                author: "Dalai Lama" },
  { text: "You must be the change you wish to see in the world.",                                                author: "Mahatma Gandhi" },
  { text: "The only way to do great work is to love what you do.",                                               author: "Steve Jobs" },
  { text: "Your time is limited, so don't waste it living someone else's life.",                                 author: "Steve Jobs" },
  { text: "Do small things with great love.",                                                                     author: "Mother Teresa" },
  { text: "Patience is not the ability to wait, but the ability to keep a good attitude while waiting.",        author: "Joyce Meyer" },
  { text: "Sometimes the heart sees what is invisible to the eye.",                                              author: "H. Jackson Brown Jr." },
  { text: "Beauty begins the moment you decide to be yourself.",                                                 author: "Coco Chanel" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.",                       author: "Walt Whitman" },
  { text: "Not all those who wander are lost.",                                                                   author: "J.R.R. Tolkien" },
  { text: "We are all broken, that's how the light gets in.",                                                    author: "Ernest Hemingway" },
  { text: "Make each day your masterpiece.",                                                                      author: "John Wooden" },
  { text: "You don't have to be great to start, but you have to start to be great.",                            author: "Zig Ziglar" },
  { text: "All our dreams can come true, if we have the courage to pursue them.",                                author: "Walt Disney" },
  { text: "Little things make big days.",                                                                         author: "Unknown" },
  { text: "Work hard in silence. Let success make the noise.",                                                   author: "Unknown" },
  { text: "Sometimes later becomes never. Do it now.",                                                           author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.",                                                              author: "Unknown" },
]

// ── Helper functions ──────────────────────────────────────────────────────────

function nameSeed(name: string): number {
  return name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'golden' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 15) return 'afternoon'
  if (hour >= 15 && hour < 19) return 'golden'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

export function getSpecialDay(): SpecialDay | undefined {
  const now   = new Date()
  const month = now.getMonth() + 1
  const day   = now.getDate()
  return SPECIAL_DAYS.find(s => s.month === month && s.day === day)
}

export function getGreeting(name: string): { message: string; emoji: string } {
  const now     = new Date()
  const month   = now.getMonth() + 1
  const day     = now.getDate()

  // Special days take priority
  const special = SPECIAL_DAYS.find(s => s.month === month && s.day === day)
  if (special) {
    return {
      message: special.message.replace('{name}', name),
      emoji:   special.emoji,
    }
  }

  // Time-based — unique per artist per day
  const timeOfDay = getTimeOfDay()
  const pool      = GREETINGS[timeOfDay]
  const seed      = day + month * 31 + nameSeed(name)
  const selected  = pool[seed % pool.length]

  return {
    message: selected.message.replace('{name}', name),
    emoji:   selected.emoji,
  }
}

export function getDailyQuote(specialDay?: SpecialDay, name = ''): Quote {
  if (specialDay?.quote) return specialDay.quote
  const now   = new Date()
  const seed  = now.getDate() + (now.getMonth() * 31) + nameSeed(name)
  return QUOTES[seed % QUOTES.length]
}
