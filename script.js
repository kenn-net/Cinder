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
  dailyCareDate: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(),
  dailyCareCount: 0,
  careStreak: 0,
  lastCareDate: ""
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

  idle: [
    "Just hanging out? That's fine.",
    "It's pretty quiet right now.",
    "I'll be here when you need me.",
    "Taking a little break?",
    "Nothing much happening, huh?",
    "We can just sit here for a bit.",
    "Hey. Just checking in.",
    "Still there? No rush.",
    "It's nice to have a quiet moment.",
    "You can come back whenever you want.",
    "I wonder what you're up to.",
    "I'm getting comfortable over here.",
    "No need to hurry. I'm okay.",
    "A little quiet time is nice sometimes.",
    "I'll wait here for you.",

    // Casual chatter
    "Hmm. What should we do next?",
    "I was just thinking about snacks.",
    "Do you ever just sit and forget what you were doing?",
    "I wonder what's happening outside.",
    "Well, this is a nice place to sit.",
    "I have absolutely nothing to report.",
    "Just me and my thoughts over here.",
    "Did you know I can sit here all day?",
    "I'm not bored. I'm just professionally relaxing.",
    "I had a thought. I forgot it.",
    "What a perfectly ordinary moment.",
    "I could get used to this.",
    "Do you think pets have hobbies?",
    "My hobby is apparently waiting.",
    "I wonder if I look busy enough.",
    "If I stare at the wall long enough, will something happen?",
    "I should probably do something productive.",
    "Nah. Maybe later.",
    "I feel like something is missing. Oh, right. Snacks.",
    "This silence is kind of nice.",
    "I wonder what your favorite thing is today.",
    "Nothing to see here. Just a tiny pet.",
    "I think I blinked for five minutes.",
    "Is it weird that I'm enjoying doing nothing?",
    "I could use a tiny adventure.",
    "Maybe we should go somewhere. In a little while.",
    "I'm having a very important rest.",
    "I have no plans, and I'm sticking to them.",
    "Do you think clouds ever get tired?",
    "I wonder if fish get thirsty.",
    "That was a deep thought. Probably.",
    "I forgot what I was going to say.",
    "Anyway, how are you doing?",
    "I hope your day is going all right.",
    "You don't have to entertain me, you know.",
    "I'm pretty good at keeping myself company.",
    "I think I'll just sit here for a bit longer.",
    "Something tells me it's snack time somewhere.",
    "I wonder if I could learn to juggle.",
    "Imagine if I had tiny little shoes.",
    "I would probably trip over them.",
    "Sometimes doing nothing is doing enough.",
    "I think I deserve a tiny award for sitting.",
    "If there were a competition for waiting, I'd win.",
    "I should write a book about doing nothing.",
    "Chapter one: Sit down.",
    "Chapter two: Keep sitting.",
    "A thrilling story, honestly.",

    // Friendly check-ins
    "Hey, how's your day going?",
    "Have you had a chance to relax today?",
    "Don't forget to stretch a little.",
    "Remember to drink some water, okay?",
    "I hope things are going well for you.",
    "You can take your time with everything.",
    "How are you feeling right now?",
    "I hope you aren't working too hard.",
    "It's okay to take a break when you need one.",
    "Just checking whether you're doing okay.",
    "I hope something nice happens to you today.",
    "Have you smiled at least once today?",
    "If not, there's still time.",
    "I hope you've eaten something good.",
    "Don't forget to look after yourself, too.",
    "You deserve a little downtime.",
    "No need to rush back. Take your time.",
    "I hope the rest of your day goes smoothly.",
    "Whatever you're doing, I hope it works out.",
    "You seem busy. I'll stay out of the way.",
    "Just a little reminder to breathe.",
    "One thing at a time, okay?",
    "You don't have to figure everything out today.",
    "I hope you get a peaceful moment soon.",
    "Even a small win is still a win.",
    "I wonder what made you smile today.",
    "Did anything interesting happen recently?",
    "I hope someone has been kind to you today.",
    "Be nice to yourself, all right?",
    "You can always take things one step at a time.",
    "I hope you're giving yourself enough rest.",
    "It's fine if today is just an ordinary day.",
    "You don't have to be productive every second.",
    "I hope you get to do something you enjoy.",
    "Hey, don't forget to have a little fun.",
    "I'm glad you stopped by for a bit.",
    "No pressure. We can just hang out.",
    "I hope tomorrow brings something good.",
    "You're allowed to have slow days, too.",
    "I hope things feel a little lighter soon.",

    // Playful pet thoughts
    "Psst. Hey. Nothing. Just wanted to say hi.",
    "Did you hear that? Probably nothing.",
    "I think I heard a snack wrapper.",
    "Was that you? Or am I imagining things?",
    "I could really go for a tiny hat.",
    "What color do you think would suit me?",
    "I bet I'd look good in a little bow tie.",
    "Imagine me wearing sunglasses.",
    "I'd look incredibly cool.",
    "I wonder if I could become famous.",
    "My talent would be sitting very still.",
    "Autographs will cost one snack each.",
    "I have big dreams for a little pet.",
    "Maybe one day I'll learn a cool trick.",
    "For now, I can blink. Watch this.",
    "Did you see that? Incredible, right?",
    "I think I deserve a standing ovation.",
    "Please hold your applause.",
    "I wonder if I could fit in a teacup.",
    "Probably not. Worth investigating, though.",
    "What if we gave me a tiny backpack?",
    "I could carry absolutely nothing in it.",
    "That sounds like a good plan to me.",
    "I think I just invented a new game.",
    "The rules are simple. We make them up as we go.",
    "I bet you can't guess what I'm thinking.",
    "It's either food or a nap.",
    "Okay, you got it right. Again.",
    "I wonder what my theme song would be.",
    "Something dramatic, probably.",
    "Cue the music. I'm about to do absolutely nothing.",
    "I should probably get a little exercise.",
    "Maybe I'll wiggle my ears. Does that count?",
    "I'm saving my energy for important pet business.",
    "This is what peak performance looks like.",
    "I think my brain needs a software update.",
    "Have you tried turning me off and on again?",
    "Just kidding. Please don't.",
    "I may be small, but my thoughts are enormous.",
    "That sounded wise. I'm keeping it.",
    "I wonder if I could win a staring contest.",
    "Careful. I'm very good at staring.",
    "Blink and you lose. Ready?",
    "I forgot the rules already.",
    "It's okay. We can invent new ones.",
    "I think I would make a terrible detective.",
    "I'd get distracted by snacks halfway through.",
    "Mystery solved: I was hungry.",
    "I should put that on my résumé.",
    "Professional snack enthusiast.",
    "Experienced nap taker.",
    "Certified friend-shaped creature.",
    "That last one sounds pretty official.",

    // Quiet and relaxed moments
    "It's nice when nothing needs to happen.",
    "We can enjoy the quiet for a little while.",
    "No big plans. No rush. Just here.",
    "Sometimes a little peace is all you need.",
    "The world can wait for a moment.",
    "I don't mind the silence.",
    "It's comfortable just being here.",
    "You can sit with me if you want.",
    "We don't always need something to talk about.",
    "A quiet moment can still be a good moment.",
    "I hope you get plenty of these little breaks.",
    "Take your time. Nothing is chasing us.",
    "I'm happy to keep you company.",
    "Even doing nothing together counts as hanging out.",
    "I wonder if time moves slower when we're relaxing.",
    "Let's pretend we don't have any chores today.",
    "Just for a minute, at least.",
    "I could sit here and watch the day go by.",
    "I hope you can enjoy a moment without worrying.",
    "You can always come back when you're ready.",
    "I'll be right here, doing my very important sitting.",
    "Until something exciting happens, anyway.",
    "Oh, wait. That was exciting. I moved my paw.",
    "All right, back to relaxing.",
    "I think I'll close my eyes for a second.",
    "Don't worry, I'm still listening.",
    "This is a pretty good place to be.",
    "Sometimes ordinary moments turn into good memories.",
    "Maybe this will be one of them.",
    "Anyway, I'm glad we got to hang out."
  ]
};


function clamp(value) { return Math.max(0, Math.min(100, value)); }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function render() {
  ["hunger", "happiness", "energy", "cleanliness", "health", "friendship"].forEach((key) => {
    $(key + "Text").textContent = Math.floor(state[key]);
    $(key + "Bar").style.width = state[key] + "%";
  });
  $("petName").textContent = state.name;
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
  const icons = { achBirthday: "🎂", achDedicated: "9", achTrusted: "8", achFriend: "7", achClose: "6", achVeteran: "5", achGrinder: "4", achCareful: "3", achActions: "2", achFirst: "1" };
  element.querySelector("span").textContent = unlocked ? "✓" : icons[id];
}

function showSpeech(message) {
  bubble.textContent = message;
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

  // Wait a random 5–7 seconds after the last interaction before speaking.
  const delay = 5000 + Math.floor(Math.random() * 2001);
  idleDialogueTimer = window.setTimeout(() => {
    idleDialogueTimer = null;
    if (document.hidden) return;

    // Keep idle chatter from interrupting an action or a recent message.
    if (Date.now() - lastUserActivityAt >= delay - 250) {
      showSpeech(randomItem(dialogue.idle));
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
  let totalCriticalNeedMs = 0;
  let allStartedHealthy = true;
  let healthyRecoveryMs = elapsed;

  needRules.forEach(({ key, decayMs }) => {
    const before = clamp(Number(state[key]) || 0);
    // A need contributes to health loss only for the part of the interval
    // during which it was actually at or below the critical threshold.
    const timeToCritical = before <= 10 ? 0 : (before - 10) * decayMs;
    totalCriticalNeedMs += Math.max(0, elapsed - timeToCritical);
    if (before < 60) {
      allStartedHealthy = false;
    } else {
      healthyRecoveryMs = Math.min(healthyRecoveryMs, (before - 60) * decayMs);
    }
    state[key] = clamp(before - elapsed / decayMs);
  });

  const hourMs = 60 * 60 * 1000;
  state.health = clamp(state.health - (totalCriticalNeedMs / hourMs) * 2);

  // Recover only for the portion of the interval when all basic needs stayed at 60+.
  if (allStartedHealthy && healthyRecoveryMs > 0) {
    state.health = clamp(state.health + (healthyRecoveryMs / hourMs) * 2);
  }

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
  const responses = dialogue[action];
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
      showSpeech(randomItem(responses));
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
      showSpeech(randomItem(responses));
      note.textContent = `You played with ${state.name}. +${gain} friendship, but it used energy and increased hunger.`;
      pet.classList.add("playing");
    }
  } else if (action === "sleep") {
    state.energy = clamp(state.energy + 22);
    state.happiness = clamp(state.happiness - 2);
    state.hunger = clamp(state.hunger - 1);
    showSpeech(randomItem(responses));
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
      showSpeech(randomItem(responses));
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
    showSpeech(randomItem(responses));
    note.textContent = `You cleaned ${state.name}. Cleanliness restored${gain ? " and +1 friendship" : ""}.`;
    pet.classList.add("happy");
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

function load() {
  try {
    const saved = localStorage.getItem("friendpet-save-v2");
    if (saved) {
      state = { ...defaults, ...JSON.parse(saved) };
      state.friendship = Math.min(FRIENDSHIP_GOAL, Math.max(0, Number(state.friendship) || 0));
      state.actions = Math.max(0, Number(state.actions) || 0);
      state.hunger = clamp(Number(state.hunger) || 0);
      state.happiness = clamp(Number(state.happiness) || 0);
      state.energy = clamp(Number(state.energy) || 0);
      state.cleanliness = clamp(Number(state.cleanliness ?? defaults.cleanliness));
      state.health = clamp(Number(state.health ?? defaults.health));
      state.dailyCareCount = Math.max(0, Number(state.dailyCareCount) || 0);
      state.careStreak = Math.max(0, Number(state.careStreak) || 0);
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
  state.lastNeedsUpdate = Date.now();
  render();
  showSpeech(randomItem(dialogue.idle));
  lastUserActivityAt = Date.now();
  scheduleIdleDialogue();
  startNeedsClock();
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
$("modalClose").addEventListener("click", closeModal);
$("modalOkay").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", (event) => {
  if (event.target === $("modalBackdrop")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
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
