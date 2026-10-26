const FRIENDSHIP_GOAL = 20000;
const ACTION_COOLDOWN_MS = 2000;
const DAILY_CARE_TARGET = 5;
const HUNGER_DECAY_MS = 4 * 60 * 1000;
const HAPPINESS_DECAY_MS = 6 * 60 * 1000;
const ENERGY_DECAY_MS = 5 * 60 * 1000;
const CLEANLINESS_DECAY_MS = 12 * 60 * 1000;
const NEEDS_TICK_MS = 30 * 1000;
let nextActionAt = 0;
let needsTimer = null;
let idleDialogueTimer = null;
let petAnimationTimer = null;
let lastUserActivityAt = Date.now();
let lastSpokenDialogue = "";

const defaults = {
  name: "Cinder",
  hunger: 65,
  happiness: 55,
  energy: 75,
  cleanliness: 80,
  health: 100,
  friendship: 0,
  interacted: false,
  surpriseSeen: false,
  actions: 0,
  celebratedFriend: false,
  celebratedBirthday: false,
  lastNeedsUpdate: Date.now(),
  lastMeaningfulInteractionAt: Date.now(),
  lastPositiveInteractionAt: 0,
  lastPlayAt: 0,
  dailyCareDate: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(),
  dailyCareCount: 0,
  careStreak: 0,
  lastCareDate: "",
  eventNextAt: 0,
  lastRandomEventId: "",
  eventTimingVersion: 0,
  eventHistory: [],
};

let state = { ...defaults };
let soundEnabled = true;
const $ = (id) => document.getElementById(id);
const pet = $("pet");
const bubble = $("speechBubble");
const note = $("actionNote");
const dialogue = {
  feed: [
    "Thanks. I was getting hungry.",
    "That was good.",
    "Could I have a little more later?",
    "Food makes this a better day.",
    "Oh, just what I needed.",
    "I didn't realize how hungry I was.",
    "That hit the spot.",
    "Got any more of that?",
    "I could get used to this.",
    "Eating is probably my favorite activity.",
    "That was pretty good, actually.",
    "I was starting to think you'd forgotten.",
    "My stomach says thank you.",
    "Well, that was nice.",
    "A full stomach makes everything better.",
    "I appreciate the snack.",
    "You always seem to know when I'm hungry.",
    "I could use a little more, but this is fine.",
    "That should keep me going for a while.",
    "Food acquired. Life is good.",
    "I was just thinking about food.",
    "Now I can relax.",
    "That was exactly what I wanted.",
    "You came prepared, huh?",
    "Not bad. I'd give it a solid rating.",
    "I might need another snack later.",
    "Okay, I'm satisfied for now.",
    "This is a pretty good day already.",
    "I wonder what's on the menu next time.",
    "All right, time for a food coma."
  ],

  play: [
    "That was fun. Again?",
    "I needed to move around.",
    "Let's try that one more time.",
    "I like spending time with you.",
    "Okay, that was actually pretty fun.",
    "You almost got me that time.",
    "I think I'm getting better at this.",
    "One more round, then maybe a break.",
    "I needed that little distraction.",
    "We should do this more often.",
    "That was a good way to spend some time.",
    "I wasn't expecting that!",
    "You're making this interesting.",
    "I think I won that one. Probably.",
    "Rematch?",
    "My turn to choose the next activity.",
    "I could do this all day.",
    "That was better than doing nothing.",
    "I didn't know I had that much energy.",
    "Okay, I'm officially entertained.",
    "Let's see if we can beat that next time.",
    "I'm having a decent time here.",
    "You make a pretty good playmate.",
    "That was a close one.",
    "I need a second to recover.",
    "I was definitely not prepared for that.",
    "We should try something different next.",
    "Well, that was unexpected.",
    "I'm glad we did that.",
    "All right, what's next?"
  ],

  sleep: [
    "I'm going to rest for a while.",
    "A short nap should help.",
    "Wake me when it's time to eat.",
    "I feel better after some rest.",
    "Just five more minutes.",
    "It's getting harder to keep my eyes open.",
    "I think I'll stay here for a bit.",
    "Today's been a long day.",
    "A little quiet time sounds nice.",
    "I'm not sleeping. Just resting my eyes.",
    "This spot seems comfortable enough.",
    "I'll be back after a quick nap.",
    "My energy is running low.",
    "I could really use some rest.",
    "Don't mind me. I'm recharging.",
    "It's peaceful here.",
    "I might accidentally fall asleep.",
    "Let me just get comfortable first.",
    "I think I'll take it easy for now.",
    "Even little pets need their breaks.",
    "I'll deal with everything after my nap.",
    "It's too comfortable to move.",
    "I can barely keep my eyes open.",
    "A quiet moment never hurts.",
    "I wonder what I'll dream about.",
    "Wake me up if something interesting happens.",
    "I could use a little downtime.",
    "Resting is surprisingly exhausting. Somehow.",
    "I'll have more energy after this.",
    "Okay, I'm officially off duty."
  ],

  wash: [
    "That feels much better.",
    "I needed a proper wash.",
    "All clean. That's a relief.",
    "Can we keep the soap out of my eyes next time?",
    "I feel a little fresher now."
  ],

  pet: [
    "That feels nice.",
    "You can stay a little longer.",
    "I'm getting used to you.",
    "Thanks for being gentle.",
    "Oh, hello again.",
    "I don't mind that.",
    "You have a pretty gentle touch.",
    "That was nice. Do it again?",
    "I'm comfortable here.",
    "I was wondering when you'd show up.",
    "You seem to be in a good mood.",
    "I could get used to this treatment.",
    "Not bad. Not bad at all.",
    "You're pretty good at that.",
    "I think I like this.",
    "Okay, you've got my attention.",
    "That's actually kind of relaxing.",
    "I wasn't expecting company.",
    "You can hang around if you want.",
    "I don't have anything else planned.",
    "This is a nice little break.",
    "You don't have to stop just yet.",
    "I'm not complaining.",
    "Well, this is pleasant.",
    "I think we're getting along.",
    "You know, you're not so bad.",
    "I was just sitting here anyway.",
    "That made my day a little better.",
    "I'll admit, I enjoy the attention.",
    "All right, you can stay."
  ],

};


function clamp(value) { return Math.max(0, Math.min(100, value)); }
function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  // Avoid choosing the exact same line that was just shown whenever possible.
  const choices = items.length > 1 && lastSpokenDialogue
    ? items.filter((item) => item !== lastSpokenDialogue)
    : items;
  const pool = choices.length ? choices : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

function render() {
  ["hunger", "happiness", "energy", "cleanliness", "health", "friendship"].forEach((key) => {
    $(key + "Text").textContent = Math.floor(state[key]);
    $(key + "Bar").style.width = state[key] + "%";
  });
  $("petName").textContent = state.name;
  const mood = getCurrentMood({ idle: true });
  const moodLabel = $("currentMood");
  const moodNames = {
    happy: "😊 Happy",
    playful: "🎾 Playful",
    sleepy: "😴 Sleepy",
    grumpy: "😣 Grumpy",
    lonely: "🥺 Lonely"
  };
  moodLabel.textContent = `Mood: ${moodNames[mood] || mood}`;
  moodLabel.dataset.mood = mood;
  const friendshipPercent = Math.min(100, (state.friendship / FRIENDSHIP_GOAL) * 100);
  $("friendshipBar").style.width = friendshipPercent + "%";
  $("friendshipBar").setAttribute("aria-label", `${Math.floor(state.friendship)} of ${FRIENDSHIP_GOAL} friendship`);
  $("surpriseProgress").style.width = friendshipPercent + "%";
  $("surpriseLabel").textContent = `${Math.floor(state.friendship).toLocaleString()} / ${FRIENDSHIP_GOAL.toLocaleString()} friendship`;
  $("surpriseButton").disabled = state.friendship < FRIENDSHIP_GOAL;
  $("surpriseButton").textContent = state.friendship >= FRIENDSHIP_GOAL
    ? (state.surpriseSeen ? "View birthday message again" : "Open birthday surprise")
    : "Reach 20,000 friendship to unlock";
  $("surpriseText").textContent = state.friendship >= FRIENDSHIP_GOAL
    ? (state.surpriseSeen
      ? "The birthday message is unlocked. You can open it again whenever you like."
      : "You reached the final milestone. The birthday surprise is ready.")
    : "This is a long-term goal: reach 20,000 friendship. Actions have a short cooldown, and Cinder's needs require regular care.";
  const needs = [state.hunger, state.happiness, state.energy, state.cleanliness, state.health];
  const lowestNeed = Math.min(...needs);
  const statusText = $("needsStatusText");
  const statusBox = $("needsStatus");
  statusBox.classList.remove("needs-good", "needs-warning", "needs-critical");
  if (lowestNeed <= 15) {
    statusBox.classList.add("needs-critical");
    statusText.textContent = state.health <= 15
      ? `${state.name}'s health is very low. Take care of their basic needs.`
      : state.hunger <= 15
        ? `${state.name} is very hungry. Please feed them soon.`
        : state.energy <= 15
          ? `${state.name} is exhausted. A rest would help.`
          : state.cleanliness <= 15
            ? `${state.name} needs a wash.`
            : `${state.name} seems down. Spend a little time caring for them.`;
  } else if (lowestNeed <= 35) {
    statusBox.classList.add("needs-warning");
    statusText.textContent = state.hunger <= 35
      ? `${state.name} is getting hungry.`
      : state.energy <= 35
        ? `${state.name} is getting tired.`
        : state.cleanliness <= 35
          ? `${state.name} could use a wash.`
          : state.health <= 35
            ? `${state.name} isn't feeling their best.`
            : `${state.name} could use some attention.`;
  } else {
    statusBox.classList.add("needs-good");
    statusText.textContent = `${state.name} is doing okay. Needs slowly decline over time.`;
  }

  $("petTitle").textContent = state.friendship >= 20000
    ? "Level 10 · Trusted Companion"
    : state.friendship >= 15000
      ? "Level 9 · Longstanding Bond"
      : state.friendship >= 10000
        ? "Level 8 · Close Companion"
        : state.friendship >= 7500
          ? "Level 7 · Deep Trust"
          : state.friendship >= 5000
            ? "Level 6 · Familiar Face"
            : state.friendship >= 3000
              ? "Level 5 · Regular Companion"
              : state.friendship >= 1500
                ? "Level 4 · Growing Bond"
                : state.friendship >= 500
                  ? "Level 3 · Getting Closer"
                  : state.friendship >= 100
                    ? "Level 2 · Getting Acquainted"
                    : "Level 1 · New Companion";

  $("dailyCareText").textContent = `${Math.min(state.dailyCareCount || 0, DAILY_CARE_TARGET)} / ${DAILY_CARE_TARGET}`;
  $("dailyCareBar").style.width = `${Math.min(100, ((state.dailyCareCount || 0) / DAILY_CARE_TARGET) * 100)}%`;
  $("streakText").textContent = `Care streak: ${state.careStreak || 0} day${state.careStreak === 1 ? "" : "s"}`;
  $("routineText").textContent = (state.dailyCareCount || 0) >= DAILY_CARE_TARGET
    ? "Daily care goal complete. Keep Cinder comfortable until tomorrow."
    : "Complete 5 care actions today. A new day starts a fresh routine.";

  setAchievement("achFirst", state.interacted);
  setAchievement("achActions", state.actions >= 100);
  setAchievement("achCareful", state.actions >= 500);
  setAchievement("achGrinder", state.actions >= 1500);
  setAchievement("achVeteran", state.actions >= 3000);
  setAchievement("achClose", state.friendship >= 500);
  setAchievement("achFriend", state.friendship >= 2000);
  setAchievement("achTrusted", state.friendship >= 7500);
  setAchievement("achDedicated", state.friendship >= 15000);
  setAchievement("achBirthday", state.friendship >= FRIENDSHIP_GOAL);
  pet.setAttribute("aria-label", `${state.name}, your virtual white bear`);
}

function setAchievement(id, unlocked) {
  const element = $(id);
  element.classList.toggle("unlocked", unlocked);
  element.classList.toggle("locked", !unlocked);
  element.querySelector("em").textContent = unlocked ? "UNLOCKED" : "LOCKED";
  const icons = { achBirthday: "🎂", achDedicated: "9", achTrusted: "8", achVeteran: "7", achFriend: "6", achGrinder: "5", achClose: "4", achCareful: "3", achActions: "2", achFirst: "1" };
  element.querySelector("span").textContent = unlocked ? "✓" : icons[id];
}

const moodDialogue = {
  happy: [
    "I'm feeling good today.",
    "It's a nice, peaceful moment.",
    "I'm glad to be here with you.",
    "Things feel pretty good right now.",
    "I'm enjoying this quiet moment.",
    "It's a good day to be Cinder.",
    "I like how calm everything feels.",
    "It's nice just being here for a while.",
    "I think today is going pretty well.",
    "I feel comfortable and content right now.",
    "Nothing much to worry about at the moment.",
    "I'm happy to share this little moment with you.",
    "The world feels a little brighter today.",
    "I'm doing alright, and that feels nice.",
    "Let's enjoy the quiet for a bit.",
    "It's nice when things feel simple.",
    "I could get used to a day like this.",
    "I'm in a pretty good place right now."
  ],
  playful: [
    "I could go for a little game, if you're up for it.",
    "Feel like doing something fun?",
    "I've got some energy to spare. What should we do?",
    "I wouldn't mind playing for a bit.",
    "Bet I can make you laugh. Want to see?",
    "I wonder what kind of fun we can find today.",
    "Come on, let's make something interesting happen!",
    "I've got a little mischief in mind.",
    "Everything looks like a game when you're in the mood.",
    "I feel like bouncing around for a while.",
    "What do you say to a tiny adventure?",
    "I hope you're ready for some fun.",
    "I have energy to burn. Got any ideas?",
    "Let's do something silly!",
    "I wonder if I can surprise you today.",
    "A little playtime could make this day even better.",
    "I'm feeling curious. What should we try?",
    "Stay close—fun might be just around the corner."
  ],
  sleepy: [
    "I'm getting tired. I could use some rest.",
    "My energy's running low. Let's take it easy.",
    "I can barely keep my eyes open right now.",
    "A little rest sounds pretty good.",
    "Could we have a quiet moment? I'm worn out.",
    "My paws feel heavy today.",
    "I might close my eyes for just a minute.",
    "Everything feels extra cozy when I'm sleepy.",
    "I need to recharge before doing much else.",
    "A soft place to rest would be wonderful.",
    "I'm trying not to yawn, but it's hard.",
    "Maybe I'll dream about something nice.",
    "I don't have much energy left to spare.",
    "Let's slow down for a little while.",
    "I could really use a peaceful nap.",
    "My eyelids are getting heavier by the second.",
    "I think my bed is calling my name.",
    "Just a little rest, then I'll feel better."
  ],
  grumpy: [
    "I'm not feeling my best right now.",
    "Could you help me sort out what I need?",
    "I'm a bit uncomfortable. Something's bothering me.",
    "I'm having a rough moment. Let's take care of things.",
    "Hmm. Something just doesn't feel right.",
    "I could use a little help getting comfortable.",
    "I'm feeling rather cranky at the moment.",
    "Can we fix what's bothering me?",
    "I'm not in the mood for much until I feel better.",
    "Everything seems a little irritating right now.",
    "I think one of my needs has been neglected.",
    "Could we take a moment to check on me?",
    "I'm trying to be patient, but it's a rough day.",
    "Something's off, and I'd like it sorted out.",
    "I might be a bit snappy until I feel better.",
    "Let's figure out what I need before anything else.",
    "I'm uncomfortable. A little care might help.",
    "I don't feel like myself just now."
  ],
  lonely: [
    "It's been quiet here. I'm glad you're around.",
    "I was hoping we'd spend a little time together.",
    "It's nice to have some company again.",
    "I missed having you around.",
    "I was starting to wonder when I'd see you again.",
    "It's better when there's someone to share the moment with.",
    "I have a lot of quiet thoughts to tell you about.",
    "Could you stay with me for a little while?",
    "I like it when we get to spend time together.",
    "The place feels less quiet now that you're here.",
    "I was hoping for a little company today.",
    "It's good to have you back beside me.",
    "I saved a little moment just for us.",
    "I don't need much—just a bit of your time.",
    "I feel less alone when you're nearby.",
    "I was wondering what you've been up to.",
    "Let's keep each other company for a while.",
    "I'm glad this quiet moment isn't just mine anymore."
  ]
};

function getCurrentMood({ action = null, idle = false } = {}) {
  const lowNeeds = [state.hunger, state.happiness, state.energy, state.cleanliness]
    .filter(value => Number(value) < 30).length;
  if (Number(state.health) <= 15 || lowNeeds >= 2) return "grumpy";

  const hour = new Date().getHours();
  const nighttime = hour >= 21 || hour < 5;
  if (Number(state.energy) < 30 || (nighttime && Number(state.energy) < 50)) return "sleepy";

  const now = Date.now();
  if (idle && now - (Number(state.lastMeaningfulInteractionAt) || now) >= 2 * 60 * 60 * 1000) {
    return "lonely";
  }

  const lastPlay = Number(state.lastPlayAt) || 0;
  if (Number(state.energy) >= 50 && lastPlay && now - lastPlay >= 30 * 60 * 1000) {
    return "playful";
  }
  return "happy";
}

function showActionDialogue(action) {
  // Action dialogue is selected only from the dialogue for that action.
  const lines = dialogue[action];
  if (Array.isArray(lines) && lines.length) {
    showSpeech(randomItem(lines));
  }
}

function showMoodDialogue() {
  // Mood determines idle chatter only; action responses never use mood lines.
  const mood = getCurrentMood({ idle: true });
  const lines = moodDialogue[mood];
  if (Array.isArray(lines) && lines.length) {
    showSpeech(randomItem(lines));
  }
}

function showSpeech(message) {
  // Keep fixed responses in their intended category rather than substituting
  // an unrelated line when the same message is shown twice in a row.
  bubble.textContent = message;
  lastSpokenDialogue = message;
  bubble.animate([{ transform: "translateX(-50%) scale(.85)", opacity: .5 }, { transform: "translateX(-50%) scale(1)", opacity: 1 }], { duration: 180, easing: "ease-out" });
}

function clearIdleDialogueTimer() {
  if (idleDialogueTimer !== null) {
    clearTimeout(idleDialogueTimer);
    idleDialogueTimer = null;
  }
}

function scheduleIdleDialogue() {
  clearIdleDialogueTimer();
  if (document.hidden) return;

  // Rotate mood-appropriate idle dialogue every 10 seconds.
  const delay = 10000;
  idleDialogueTimer = window.setTimeout(() => {
    idleDialogueTimer = null;
    if (document.hidden) return;

    // Keep idle chatter from interrupting an action or a recent message.
    if (Date.now() - lastUserActivityAt >= delay - 250) {
      showMoodDialogue();
    }
    scheduleIdleDialogue();
  }, delay);
}

function registerUserActivity() {
  lastUserActivityAt = Date.now();
  scheduleIdleDialogue();
}

function chirp() {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => context.close();
  } catch (_) {}
}

function applyNeedsDecay(now = Date.now()) {
  const last = Number(state.lastNeedsUpdate) || now;
  // Cap offline time at seven days to protect saves from large clock jumps.
  const elapsed = Math.max(0, Math.min(now - last, 7 * 24 * 60 * 60 * 1000));
  if (elapsed <= 0) {
    state.lastNeedsUpdate = now;
    return;
  }

  const needRules = [
    { key: "hunger", decayMs: HUNGER_DECAY_MS },
    { key: "happiness", decayMs: HAPPINESS_DECAY_MS },
    { key: "energy", decayMs: ENERGY_DECAY_MS },
    { key: "cleanliness", decayMs: CLEANLINESS_DECAY_MS }
  ];
  const needsAtStart = needRules.map(({ key, decayMs }) => ({
    key,
    decayMs,
    value: clamp(Number(state[key]) || 0)
  }));

  // Split elapsed time at every 60 and 10 threshold crossing so health uses
  // the correct rate even when a need crosses a threshold between updates.
  const boundaries = [0, elapsed];
  needsAtStart.forEach(({ value, decayMs }) => {
    [60, 10].forEach((threshold) => {
      if (value > threshold) {
        const crossingMs = (value - threshold) * decayMs;
        if (crossingMs > 0 && crossingMs < elapsed) boundaries.push(crossingMs);
      }
    });
  });
  boundaries.sort((a, b) => a - b);

  const hourMs = 60 * 60 * 1000;
  let healthChange = 0;
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const segmentStart = boundaries[i];
    const segmentEnd = boundaries[i + 1];
    if (segmentEnd <= segmentStart) continue;
    const midpoint = (segmentStart + segmentEnd) / 2;
    const values = needsAtStart.map(({ value, decayMs }) =>
      clamp(value - midpoint / decayMs)
    );
    const allNeedsHealthy = values.every((value) => value >= 60);
    const anyNeedCritical = values.some((value) => value < 10);
    const healthRatePerHour = allNeedsHealthy ? 2 : (anyNeedCritical ? -3 : -2);
    healthChange += ((segmentEnd - segmentStart) / hourMs) * healthRatePerHour;
  }

  needsAtStart.forEach(({ key, decayMs, value }) => {
    state[key] = clamp(value - elapsed / decayMs);
  });
  state.health = clamp(state.health + healthChange);
  state.lastNeedsUpdate = now;
}

function startNeedsClock() {
  if (needsTimer) clearInterval(needsTimer);
  needsTimer = setInterval(() => {
    applyNeedsDecay();
    refreshDailyRoutine();
    render();
    save();
  }, NEEDS_TICK_MS);
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function refreshDailyRoutine() {
  const today = localDateKey();
  if (state.dailyCareDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = state.dailyCareDate === localDateKey(yesterday);
    if (wasYesterday && (state.dailyCareCount || 0) >= DAILY_CARE_TARGET) {
      state.careStreak = (state.careStreak || 0) + 1;
    } else {
      // An incomplete day or a missed day breaks the consecutive-day streak.
      state.careStreak = 0;
    }
    state.dailyCareDate = today;
    state.dailyCareCount = 0;
  }
}

function doAction(action) {
  registerUserActivity();
  applyNeedsDecay();
  refreshDailyRoutine();
  const now = Date.now();
  if (now < nextActionAt) {
    const seconds = Math.ceil((nextActionAt - now) / 1000);
    note.textContent = `Wait ${seconds} second${seconds === 1 ? "" : "s"} before the next activity.`;
    return;
  }
  nextActionAt = now + ACTION_COOLDOWN_MS;
  document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = true; });
  window.setTimeout(() => {
    document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = false; });
  }, ACTION_COOLDOWN_MS);

  pet.classList.remove("sleeping", "happy", "playing");
  $("scene").classList.remove("sleeping");
  if (petAnimationTimer !== null) {
    clearTimeout(petAnimationTimer);
    petAnimationTimer = null;
  }
  let actionSucceeded = true;

  if (action === "feed") {
    if (state.hunger >= 95) {
      actionSucceeded = false;
      showSpeech("I'm full for now.");
      note.textContent = `${state.name} is too full. Try another activity or wait for hunger to drop.`;
    } else {
      state.hunger = clamp(state.hunger + 24);
      state.happiness = clamp(state.happiness + 2);
      const gain = state.happiness < 15 || state.energy < 10 ? 0 : 1;
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + gain);
      showActionDialogue(action);
      note.textContent = gain
        ? `You fed ${state.name}. +1 friendship. Needs keep declining as time passes.`
        : `You fed ${state.name}. Cinder needs more rest or comfort before this builds friendship.`;
      pet.classList.add("happy");
    }
  } else if (action === "play") {
    if (state.energy < 20 || state.hunger < 10) {
      actionSucceeded = false;
      showSpeech(state.energy < 20 ? "I need to rest before playing." : "I need something to eat first.");
      note.textContent = `${state.name} needs more energy and food before playing.`;
    } else {
      state.happiness = clamp(state.happiness + 15);
      state.energy = clamp(state.energy - 20);
      state.hunger = clamp(state.hunger - 12);
      const gain = state.hunger < 15 || state.energy < 15 ? 1 : 2;
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + gain);
      state.lastPlayAt = Date.now();
      showActionDialogue(action);
      note.textContent = `You played with ${state.name}. +${gain} friendship, but it used energy and increased hunger.`;
      pet.classList.add("playing");
    }
  } else if (action === "sleep") {
    state.energy = clamp(state.energy + 22);
    state.happiness = clamp(state.happiness - 2);
    state.hunger = clamp(state.hunger - 1);
    showActionDialogue(action);
    note.textContent = `${state.name} rested. Energy recovered, but hunger and happiness still need attention.`;
    pet.classList.add("sleeping");
    $("scene").classList.add("sleeping");
  } else if (action === "pet") {
    if (state.happiness < 5) {
      actionSucceeded = false;
      showSpeech("I need a little time to feel better.");
      note.textContent = `${state.name} is having a rough moment. Try feeding or resting first.`;
    } else {
      state.happiness = clamp(state.happiness + 7);
      const gain = state.energy < 10 || state.hunger < 10 ? 0 : 1;
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + gain);
      showActionDialogue(action);
      note.textContent = gain
        ? `You spent a quiet moment with ${state.name}. +1 friendship.`
        : `You comforted ${state.name}, but they need food or rest before friendship can grow.`;
      pet.classList.add("happy");
    }
  }

  if (actionSucceeded) {
    // Only successful care actions count toward achievements and daily routines.
    state.interacted = true;
    state.actions += 1;
    state.dailyCareCount = Math.min(DAILY_CARE_TARGET, (state.dailyCareCount || 0) + 1);
    state.lastCareDate = localDateKey();
  }

  if (action === "wash") {
    state.cleanliness = clamp(state.cleanliness + 45);
    state.happiness = clamp(state.happiness + 2);
    const gain = state.health < 10 || state.hunger < 10 ? 0 : 1;
    state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + gain);
    showActionDialogue(action);
    note.textContent = `You cleaned ${state.name}. Cleanliness restored${gain ? " and +1 friendship" : ""}.`;
    pet.classList.add("happy");
  }

  if (actionSucceeded) {
    state.lastMeaningfulInteractionAt = Date.now();
    if (["feed", "play", "pet", "wash"].includes(action)) {
      state.lastPositiveInteractionAt = Date.now();
    }
  }

  if (state.friendship >= 2000 && !state.celebratedFriend) {
    state.celebratedFriend = true;
    note.textContent = "Milestone reached: 2,000 friendship. Keep going; the final goal is 20,000.";
  }
  if (state.friendship >= FRIENDSHIP_GOAL && !state.celebratedBirthday) {
    state.celebratedBirthday = true;
    setTimeout(() => openModal("🎉", "??? unlocked", `You and ${state.name} reached 20,000 friendship. This took serious dedication. The ??? is now available.`), 350);
  }
  // Action poses are temporary. Return Cinder to the default bobbing idle
  // animation after the reaction finishes, including after sleeping.
  if (petAnimationTimer !== null) clearTimeout(petAnimationTimer);
  petAnimationTimer = window.setTimeout(() => {
    pet.classList.remove("sleeping", "happy", "playing");
    $("scene").classList.remove("sleeping");
    petAnimationTimer = null;
  }, 5000);

  chirp();
  render();
  save();
}

function save() {
  try {
    state.lastNeedsUpdate = Date.now();
    localStorage.setItem("friendpet-save-v2", JSON.stringify(state));
  } catch (_) {}
}

const RANDOM_EVENTS = [
  { id: "under-furniture", icon: "🔎", title: "Something Under the Furniture", description: "Cinder keeps nosing at the corner of the room. Something small is tucked under the furniture.", choices: [
    { label: "Look together", detail: "See what Cinder has found beneath the furniture.", effects: { energy: -2, happiness: 2, friendship: 4 }, result: "You investigate together. Cinder seems pleased you took the time." },
    { label: "Let Cinder investigate", detail: "Let Cinder take a closer look on their own.", effects: { energy: -1, happiness: 2 }, result: "Cinder investigates carefully and comes back looking rather proud." },
    { label: "Leave it for now", detail: "Leave the mystery for another time.", effects: {}, result: "You leave it where it is. Cinder soon finds something else to do." }
  ]},
  { id: "snack-request", icon: "🍎", title: "A Very Hopeful Look", description: "Cinder sits near the food bowl and looks up at you. It might be snack time—or Cinder might just be optimistic.", condition: s => s.hunger < 75, choices: [
    { label: "Offer a small snack", detail: "Offer Cinder a little birthday-style treat.", effects: { hunger: 8, happiness: 2, friendship: 2 }, result: "Cinder accepts the snack and settles down happily." },
    { label: "Check the bowl first", detail: "Check the bowl before deciding what to do.", effects: { happiness: 1 }, result: "The bowl can wait until the next proper feeding. Cinder stays nearby." },
    { label: "Not right now", detail: "Let Cinder know snack time can wait.", effects: {}, result: "Cinder gives you one last hopeful look, then wanders off." }
  ]},
  { id: "new-toy", icon: "🧶", title: "A Forgotten Toy", description: "Cinder has dragged an old toy into the middle of the room and is waiting to see what you do.", condition: s => s.energy >= 20, choices: [
    { label: "Play for a moment", detail: "Take a moment to play with the forgotten toy.", effects: { happiness: 5, energy: -4, hunger: -2, friendship: 4 }, result: "You play for a little while. Cinder seems glad you joined in." },
    { label: "Put it somewhere safe", detail: "Put the toy somewhere safe for later.", effects: { happiness: 1 }, result: "You put the toy somewhere Cinder can find it again." },
    { label: "Let Cinder play alone", detail: "Let Cinder entertain themself for a while.", effects: { happiness: 2, energy: -1 }, result: "Cinder entertains themself for a while. It seems to help." }
  ]},
  { id: "flower", icon: "🌼", title: "A Little Flower", description: "Cinder has found a tiny flower and brought it over to you. It's slightly bent, but Cinder seems pleased.", choices: [
    { label: "Spend a moment together", detail: "Share a pleasant moment with Cinder.", effects: { happiness: 3, friendship: 3 }, result: "You spend a quiet moment together. Cinder seems content." },
    { label: "Give Cinder some attention", detail: "Give Cinder a little extra attention.", effects: { friendship: 5, happiness: 2 }, result: "You give Cinder some attention, and Cinder looks pleased." }
  ]},
  { id: "restless", icon: "🐾", title: "Cinder Is Restless", description: "Cinder is pacing around the room, full of energy and looking for something to do.", condition: s => s.energy >= 35, choices: [
    { label: "Play a quick game", detail: "Start a quick game with Cinder.", effects: { happiness: 4, energy: -5, hunger: -2, friendship: 4 }, result: "The game doesn't last long, but it seems to be exactly what Cinder wanted." },
    { label: "Explore the room", detail: "Explore the room and see what catches Cinder's eye.", effects: { energy: -2, happiness: 2 }, result: "You explore the room together. Cinder seems to enjoy the change of pace." },
    { label: "Encourage a quiet break", detail: "Settle down together for a quiet break.", effects: { happiness: 1, energy: 2 }, result: "Cinder settles down beside you for a quiet moment." }
  ]},
  { id: "familiar", icon: "☕", title: "A Familiar Little Routine", description: "Cinder settles beside you in a way that feels familiar now. Some things become comforting simply because you keep showing up.", condition: s => s.friendship >= 1000, choices: [
    { label: "Stay together a moment", detail: "Enjoy a familiar moment together.", effects: { happiness: 3, friendship: 8 }, result: "You sit together for a while. Nothing special happens—and that's rather nice." },
    { label: "Give a gentle pat", detail: "Give Cinder a gentle pat and let them relax.", effects: { happiness: 2, friendship: 4 }, result: "Cinder leans into your hand, then goes back to relaxing." }
  ]},
  { id: "rainy-window", icon: "🌧️", title: "Rain at the Window", description: "Rain taps against the window. Cinder watches the drops race down the glass, occasionally glancing back at you.", choices: [
    { label: "Watch the rain together", detail: "Watch the rain together by the window.", effects: { happiness: 3, friendship: 5 }, result: "You watch the rain for a while. Cinder settles comfortably beside you." },
    { label: "Make a little game of it", detail: "Turn the raindrops into a little game.", effects: { happiness: 5, energy: -2, friendship: 4 }, result: "You pick raindrops to follow. Cinder takes the competition surprisingly seriously." },
    { label: "Let Cinder enjoy the view", detail: "Let Cinder enjoy the view at their own pace.", effects: { happiness: 1, friendship: 2 }, result: "You give Cinder some quiet space, staying close by." }
  ]},
  { id: "blanket-fort", icon: "🧺", title: "The Blanket Situation", description: "A blanket has slipped onto the floor, and Cinder has decided it is now an important discovery.", choices: [
    { label: "Make a little blanket nest", detail: "Make a cozy little nest out of the blanket.", effects: { happiness: 4, energy: 2, friendship: 5 }, result: "The blanket nest is a little lopsided, but Cinder approves of it." },
    { label: "Fold it together", detail: "Fold the blanket together.", effects: { happiness: 2, friendship: 4 }, result: "You fold the blanket together. Cinder mostly supervises, but the company is nice." },
    { label: "Leave it as Cinder arranged it", detail: "Leave the blanket just the way Cinder arranged it.", effects: { happiness: 1, friendship: 2 }, result: "You decide not to interfere with the arrangement. Cinder seems satisfied." }
  ]},
  { id: "birdwatching", icon: "🐦", title: "Visitors Outside", description: "A small bird lands outside. Cinder has gone very still, watching every movement.", choices: [
    { label: "Watch quietly together", detail: "Watch the bird quietly together.", effects: { happiness: 3, friendship: 5 }, result: "The bird stays for a moment before flying away. Cinder keeps looking at the empty spot." },
    { label: "Point out where it went", detail: "Show Cinder where the bird went.", effects: { happiness: 2, friendship: 3 }, result: "Cinder follows your gesture and seems pleased to have shared the discovery." },
    { label: "Let Cinder watch alone", detail: "Give Cinder some space to watch the bird.", effects: { happiness: 1, friendship: 2 }, result: "You give Cinder room to concentrate, remaining nearby." }
  ]},
  { id: "paper-ball", icon: "🗞️", title: "The Paper Ball", description: "A scrap of paper has rolled into a ball. Cinder nudges it toward you and waits.", condition: s => s.energy >= 15, choices: [
    { label: "Roll it back and forth", detail: "Roll the paper ball back and forth.", effects: { happiness: 5, energy: -3, hunger: -1, friendship: 6 }, result: "The paper ball travels approximately three feet. It is, somehow, a good game." },
    { label: "Make a gentle toss", detail: "Gently toss the paper ball for Cinder to chase.", effects: { happiness: 3, energy: -2, friendship: 4 }, result: "Cinder trots after it and brings it back with an expectant look." },
    { label: "Save it for later", detail: "Save the paper ball for another time.", effects: { happiness: 1, friendship: 2 }, result: "You put the paper ball somewhere safe for another time." }
  ]},
  { id: "plant-check", icon: "🪴", title: "The Plant Needs Attention", description: "The little plant by the window looks dry. Cinder sits nearby while you notice it.", choices: [
    { label: "Water it together", detail: "Water the plant together.", effects: { happiness: 2, friendship: 5 }, result: "You water the plant. Cinder watches the water disappear into the soil." },
    { label: "Let Cinder inspect it", detail: "Let Cinder inspect the plant.", effects: { happiness: 2, friendship: 3 }, result: "Cinder sniffs the pot carefully, then decides it is probably fine." },
    { label: "Move it into the light", detail: "Move the plant somewhere with better light.", effects: { happiness: 1, friendship: 2 }, result: "You shift the plant toward the light. Cinder follows along to supervise." }
  ]},
  { id: "lost-sock", icon: "🧦", title: "A Missing Sock", description: "Cinder has found a sock that you thought was missing. It is being presented to you like a valuable treasure.", choices: [
    { label: "Thank Cinder for the discovery", detail: "Thank Cinder for finding the missing sock.", effects: { happiness: 3, friendship: 6 }, result: "You thank Cinder. The sock is returned, and Cinder looks pleased with the work." },
    { label: "Trade it for a toy", detail: "Trade the sock for a toy.", effects: { happiness: 4, energy: -1, friendship: 4 }, result: "Cinder accepts the trade and immediately investigates the toy." },
    { label: "Put it away together", detail: "Put the sock away together.", effects: { happiness: 1, friendship: 3 }, result: "The sock makes it back to its proper place, with Cinder close behind." }
  ]},
  { id: "quiet-hum", icon: "🎵", title: "A Quiet Tune", description: "Cinder perks up when you start humming. The room feels a little less quiet.", choices: [
    { label: "Keep humming", detail: "Keep humming while Cinder listens.", effects: { happiness: 4, friendship: 5 }, result: "You hum a little longer. Cinder settles in as if this was the plan all along." },
    { label: "Make up a silly tune", detail: "Make up a silly tune together.", effects: { happiness: 5, friendship: 4 }, result: "The tune has no clear melody, but Cinder seems entertained anyway." },
    { label: "Sit together in silence", detail: "Sit together and enjoy the silence.", effects: { happiness: 2, friendship: 3 }, result: "You let the room grow quiet again. Cinder stays close." }
  ]},
  { id: "box-discovery", icon: "📦", title: "An Empty Box", description: "An empty box has appeared in the room. Cinder has already decided to investigate it.", choices: [
    { label: "Turn it into a hideout", detail: "Turn the box into a little hideout.", effects: { happiness: 5, energy: -2, friendship: 6 }, result: "The box becomes a temporary hideout. Cinder seems to think it is excellent architecture." },
    { label: "Peek inside together", detail: "Peek inside the box together.", effects: { happiness: 3, friendship: 4 }, result: "You inspect the very empty box together. Nothing is inside, but the investigation was thorough." },
    { label: "Keep it for another day", detail: "Set the box aside for another day.", effects: { happiness: 1, friendship: 2 }, result: "You set the box aside. Cinder appears to approve of keeping options open." }
  ]},
  { id: "warm-drink", icon: "☕", title: "A Warm Break", description: "You take a break, and Cinder settles nearby. There is no particular reason to rush back to anything.", choices: [
    { label: "Take a proper break", detail: "Take a proper break together.", effects: { happiness: 3, energy: 2, friendship: 5 }, result: "You take a few quiet minutes. Cinder seems content with the quiet break." },
    { label: "Give Cinder some attention", detail: "Give Cinder some attention before returning to your tasks.", effects: { happiness: 2, friendship: 6 }, result: "You give Cinder some attention before getting back to things." },
    { label: "Stay nearby while you rest", detail: "Rest nearby and enjoy a quiet moment.", effects: { energy: 1, friendship: 3 }, result: "You both take it easy for a while. It is a decent way to spend a few minutes." }
  ]},
  { id: "tiny-doodle", icon: "✏️", title: "A Tiny Doodle", description: "A pen and a scrap of paper are nearby. Cinder watches as you draw a little shape, then nudges the page.", choices: [
    { label: "Draw Cinder a portrait", detail: "Draw a little portrait of Cinder.", effects: { happiness: 4, friendship: 7 }, result: "The portrait is not especially realistic, but Cinder has no complaints." },
    { label: "Let Cinder choose the next shape", detail: "Let Cinder decide what shape to draw next.", effects: { happiness: 3, friendship: 5 }, result: "Cinder's choice is mostly a paw mark. It still counts as collaboration." },
    { label: "Keep the drawing simple", detail: "Finish a simple doodle for Cinder.", effects: { happiness: 1, friendship: 3 }, result: "You finish a tiny doodle and leave it somewhere Cinder can see it." }
  ]},
  { id: "curious-corner", icon: "🔍", title: "The Curious Corner", description: "Cinder has discovered a corner that apparently deserves a very thorough inspection.", choices: [
    { label: "Investigate together", detail: "Investigate the curious corner together.", effects: { happiness: 2, energy: -1, friendship: 5 }, result: "The corner contains no surprises, but Cinder seems happy you investigated it together." },
    { label: "Bring a toy along", detail: "Bring a toy along to make exploring more interesting.", effects: { happiness: 4, energy: -2, friendship: 4 }, result: "The toy makes the corner much more interesting, at least by Cinder's standards." },
    { label: "Keep Cinder company", detail: "Stay nearby while Cinder finishes investigating.", effects: { happiness: 1, friendship: 2 }, result: "You stay nearby while Cinder finishes the inspection." }
  ]}
];
const EVENT_FIRST_MIN = 2 * 60 * 1000;
const EVENT_FIRST_MAX = 2 * 60 * 1000;
const EVENT_NEXT_INTERVAL = 2 * 60 * 1000;
const EVENT_TIMING_VERSION = 3;
let eventTimer = null;
let activeRandomEvent = null;
let eventChoiceLocked = false;

function randomBetween(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function scheduleNextRandomEvent(first = false) {
  const now = Date.now();
  const delay = first ? randomBetween(EVENT_FIRST_MIN, EVENT_FIRST_MAX) : EVENT_NEXT_INTERVAL;
  state.eventNextAt = now + delay;
  state.eventTimingVersion = EVENT_TIMING_VERSION;
  save();
}
function startRandomEventClock() {
  if (eventTimer !== null) clearInterval(eventTimer);
  // Migrate existing saves to the new event cadence once, without touching pet progress.
  if (Number(state.eventTimingVersion) !== EVENT_TIMING_VERSION || !Number(state.eventNextAt)) scheduleNextRandomEvent(true);
  eventTimer = window.setInterval(() => {
    if (document.hidden || activeRandomEvent || !$('modalBackdrop').hidden || !$('eventBackdrop').hidden || !$('eventResultBackdrop').hidden) return;
    if (Date.now() < Number(state.eventNextAt || 0)) return;
    if (Date.now() - lastUserActivityAt > 3 * 60 * 1000) return;
    showRandomEvent();
  }, 15000);
}
function chooseRandomEvent() {
  let pool = RANDOM_EVENTS.filter(event => !event.condition || event.condition(state));
  if (pool.length > 1) pool = pool.filter(event => event.id !== state.lastRandomEventId);
  return randomItem(pool.length ? pool : RANDOM_EVENTS);
}
function showRandomEvent() {
  if (activeRandomEvent || document.hidden || !$('modalBackdrop').hidden || !$('eventBackdrop').hidden || !$('eventResultBackdrop').hidden) return;
  activeRandomEvent = chooseRandomEvent();
  eventChoiceLocked = false;
  const event = activeRandomEvent;
  $('eventIcon').textContent = event.icon;
  $('eventTitle').textContent = event.title;
  $('eventDescription').textContent = event.description;
  const choices = $('eventChoices');
  choices.replaceChildren();
  event.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'event-choice';
    const title = document.createElement('strong'); title.textContent = choice.label;
    const detail = document.createElement('small');
    const friendshipReward = typeof choice.effects?.friendship === 'number' ? choice.effects.friendship : 1;
    detail.textContent = `${choice.detail}`;
    button.append(title, detail);
    button.addEventListener('click', () => resolveRandomEvent(index), { once: true });
    choices.appendChild(button);
  });
  $('eventBackdrop').hidden = false;
  choices.querySelector('button')?.focus();
  state.lastRandomEventId = event.id;
  save();
}
function resolveRandomEvent(index) {
  if (eventChoiceLocked || !activeRandomEvent) return;
  eventChoiceLocked = true;
  const event = activeRandomEvent;
  const choice = event.choices[index];
  if (!choice) { eventChoiceLocked = false; return; }
  const effects = choice.effects || {};
  // Even a neutral or cautious response can build a little trust; event choices
  // with explicit friendship values retain their intended, larger rewards.
  if (typeof effects.friendship !== 'number') effects.friendship = 1;
  ['hunger', 'happiness', 'energy', 'cleanliness', 'health'].forEach(key => {
    if (typeof effects[key] === 'number') state[key] = clamp(Number(state[key] || 0) + effects[key]);
  });
  if (typeof effects.friendship === 'number') state.friendship = Math.min(FRIENDSHIP_GOAL, Math.max(0, state.friendship + effects.friendship));
  let result = choice.result;
  state.eventHistory = Array.isArray(state.eventHistory) ? state.eventHistory : [];
  state.eventHistory.push({ id: event.id, at: Date.now(), choice: choice.label });
  state.eventHistory = state.eventHistory.slice(-30);
  state.lastMeaningfulInteractionAt = Date.now();
  // Keep the result separate from Cinder's speech bubble. Start the next-event
  // countdown only after the player dismisses this result popup.
  $('eventBackdrop').hidden = true;
  activeRandomEvent = null;
  eventChoiceLocked = false;
  $('eventResultIcon').textContent = event.icon || '☕';
  $('eventResultTitle').textContent = choice.label;
  $('eventResultMessage').textContent = `${result}`;
  $('eventResultBackdrop').hidden = false;
  lastUserActivityAt = Date.now();
  render();
  save();
}


// Update the room's lighting and sky to match the player's local time.
function updateRoomTimeOfDay() {
  const hour = new Date().getHours();
  let phase;
  let label;
  if (hour >= 5 && hour < 12) {
    phase = "morning";
    label = "CINDER ROOM · MORNING";
  } else if (hour >= 12 && hour < 17) {
    phase = "afternoon";
    label = "CINDER ROOM · AFTERNOON";
  } else if (hour >= 17 && hour < 21) {
    phase = "evening";
    label = "CINDER ROOM · EVENING";
  } else {
    phase = "night";
    label = "CINDER ROOM · NIGHT";
  }

  applyRoomTimeOfDay(phase);
}

function applyRoomTimeOfDay(phase) {
  const labels = {
    morning: "CINDER ROOM · MORNING",
    afternoon: "CINDER ROOM · AFTERNOON",
    evening: "CINDER ROOM · EVENING",
    night: "CINDER ROOM · NIGHT"
  };
  if (!labels[phase]) return;
  const scene = $("scene");
  if (!scene) return;
  scene.classList.remove("time-morning", "time-afternoon", "time-evening", "time-night");
  scene.classList.add(`time-${phase}`);
  const sceneLabel = $("sceneLabel");
  if (sceneLabel) sceneLabel.textContent = labels[phase];
  document.documentElement.dataset.timeOfDay = phase;
}


function load() {
  try {
    const saved = localStorage.getItem("friendpet-save-v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...defaults, ...parsed };
      if (!Number.isFinite(Number(parsed.lastMeaningfulInteractionAt))) {
        state.lastMeaningfulInteractionAt = Number(parsed.lastNeedsUpdate) || Date.now();
      }
      if (!Number.isFinite(Number(parsed.lastPositiveInteractionAt))) state.lastPositiveInteractionAt = 0;
      if (!Number.isFinite(Number(parsed.lastPlayAt))) state.lastPlayAt = 0;
      state.friendship = Math.min(FRIENDSHIP_GOAL, Math.max(0, Number(state.friendship) || 0));
      state.actions = Math.max(0, Number(state.actions) || 0);
      state.hunger = clamp(Number(state.hunger) || 0);
      state.happiness = clamp(Number(state.happiness) || 0);
      state.energy = clamp(Number(state.energy) || 0);
      state.cleanliness = clamp(Number(state.cleanliness ?? defaults.cleanliness));
      state.health = clamp(Number(state.health ?? defaults.health));
      state.dailyCareCount = Math.max(0, Number(state.dailyCareCount) || 0);
      state.careStreak = Math.max(0, Number(state.careStreak) || 0);
      state.eventNextAt = Math.max(0, Number(state.eventNextAt) || 0);
      state.eventHistory = Array.isArray(state.eventHistory) ? state.eventHistory : [];
      if (!Number.isFinite(Number(state.lastNeedsUpdate))) state.lastNeedsUpdate = Date.now();
      const lastVisit = Number(state.lastNeedsUpdate);
      applyNeedsDecay(Date.now());
      const awayMinutes = Math.max(0, Math.floor((Date.now() - lastVisit) / 60000));
      if (awayMinutes >= 2) {
        note.textContent = `Cinder's needs changed while you were away for ${awayMinutes.toLocaleString()} minutes.`;
      }
    }
    if (!saved) state.name = "Cinder";
  } catch (_) { state = { ...defaults }; }
  refreshDailyRoutine();
  updateRoomTimeOfDay();
  window.setInterval(updateRoomTimeOfDay, 60 * 1000);
  state.lastNeedsUpdate = Date.now();
  render();
  showMoodDialogue();
  lastUserActivityAt = Date.now();
  scheduleIdleDialogue();
  startNeedsClock();
  startRandomEventClock();
  save();
}

function openModal(icon, title, message) {
  $("modalIcon").textContent = icon;
  $("modalTitle").textContent = title;
  $("modalMessage").textContent = message;
  $("modalBackdrop").hidden = false;
  $("modalOkay").focus();
}
function closeModal() { $("modalBackdrop").hidden = true; }

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => doAction(button.dataset.action));
});


$("surpriseButton").addEventListener("click", () => {
  if (state.friendship >= FRIENDSHIP_GOAL) {
    state.surpriseSeen = true;
    openModal("🎂", "Happy Birthday", `I hope this year brings you so much happiness and beautiful moments to cherish. Thank you for spending time with Cinder and for being a part of their life. It truly means a lot, and I hope your special day is filled with the same warmth and gentleness you share with others. You deserve all the wonderful things life has to offer. Have the loveliest day!`);
    render();
    save();
  }
});
function closeEventResult() {
  if ($('eventResultBackdrop').hidden) return;
  $('eventResultBackdrop').hidden = true;
  state.eventNextAt = Date.now() + EVENT_NEXT_INTERVAL;
  state.eventTimingVersion = EVENT_TIMING_VERSION;
  lastUserActivityAt = Date.now();
  save();
  scheduleIdleDialogue();
}
$('eventResultOkay').addEventListener('click', closeEventResult);
$('eventResultBackdrop').addEventListener('click', (event) => {
  if (event.target === $('eventResultBackdrop')) closeEventResult();
});

$("modalClose").addEventListener("click", closeModal);
$("modalOkay").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", (event) => {
  if (event.target === $("modalBackdrop")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!$('eventResultBackdrop').hidden) {
      closeEventResult();
      return;
    }
    if (activeRandomEvent) {
      $('eventBackdrop').hidden = true;
      activeRandomEvent = null;
      state.eventNextAt = Date.now() + EVENT_NEXT_INTERVAL;
      state.eventTimingVersion = EVENT_TIMING_VERSION;
      save();
    }
    closeModal();
  }
});

// User activity postpones idle chatter; hidden tabs resume with a fresh delay.
["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  document.addEventListener(eventName, registerUserActivity, { passive: true });
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearIdleDialogueTimer();
  } else {
    registerUserActivity();
  }
});

load();