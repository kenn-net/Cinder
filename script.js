const FRIENDSHIP_GOAL = 20000;
const ACTION_COOLDOWN_MS = 2000;
let nextActionAt = 0;

const defaults = {
  name: "Cinder",
  hunger: 65,
  happiness: 55,
  energy: 75,
  friendship: 0,
  interacted: false,
  surpriseSeen: false,
  actions: 0,
  celebratedFriend: false,
  celebratedBirthday: false
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
    "Hi. What should we do today?",
    "I'm ready when you are.",
    "It's quiet here today.",
    "I could eat something soon.",
    "Oh, you're back.",
    "I wonder what we'll do today.",
    "Nothing much is happening right now.",
    "Just hanging around.",
    "It's a pretty calm day.",
    "Got anything planned?",
    "I'm open to suggestions.",
    "I was just thinking about stuff.",
    "Well, this is a nice place to sit.",
    "I wonder what time it is.",
    "I'm not bored. Not yet, anyway.",
    "Something interesting should happen soon.",
    "I'll just stay here for a while.",
    "It's nice to have a quiet moment.",
    "I wonder what you're up to.",
    "No plans, no problems.",
    "I'm taking a break from doing absolutely nothing.",
    "Today feels a little different.",
    "I could use a bit of excitement.",
    "Maybe we'll do something fun later.",
    "I'm just enjoying the moment.",
    "Nothing to report. Everything's normal.",
    "I should probably get up soon.",
    "Is it snack time yet?",
    "I'll be here if you need me.",
    "Another day, another tiny adventure.",
    "I wonder what happens next.",
    "It's not a bad day to do nothing.",
    "I'm listening. What's up?",
    "You don't have to do anything right now.",
    "Just checking in. How's your day going?",
    "I think I'll sit here a little longer.",
    "Something tells me today's going to be interesting.",
    "I'm here. That's something, right?",
    "We can figure out what to do later.",
    "For now, I think I'll just chill."
  ]
};

function clamp(value) { return Math.max(0, Math.min(100, value)); }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function render() {
  ["hunger", "happiness", "energy", "friendship"].forEach((key) => {
    $(key + "Text").textContent = state[key];
    $(key + "Bar").style.width = state[key] + "%";
  });
  $("petName").textContent = state.name;
  const friendshipPercent = Math.min(100, (state.friendship / FRIENDSHIP_GOAL) * 100);
  $("friendshipBar").style.width = friendshipPercent + "%";
  $("surpriseProgress").style.width = friendshipPercent + "%";
  $("surpriseLabel").textContent = `${Math.floor(state.friendship).toLocaleString()} / ${FRIENDSHIP_GOAL.toLocaleString()} friendship`;
  $("surpriseButton").disabled = state.friendship < FRIENDSHIP_GOAL;
  $("surpriseButton").textContent = state.friendship >= FRIENDSHIP_GOAL ? "Open birthday surprise" : "Reach 20,000 friendship to unlock";
  $("surpriseText").textContent = state.friendship >= FRIENDSHIP_GOAL
    ? "You reached the final milestone. The birthday surprise is ready."
    : "This is a long-term goal: reach 20,000 friendship. Actions have a short cooldown, and Cinder's needs require regular care.";
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

function doAction(action) {
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

  state.interacted = true;
  state.actions += 1;
  pet.classList.remove("sleeping", "happy", "playing");
  const responses = dialogue[action];

  if (action !== "sleep") {
    state.hunger = clamp(state.hunger - 2);
    state.energy = clamp(state.energy - 1);
    state.happiness = clamp(state.happiness - 1);
  }

  if (action === "feed") {
    if (state.hunger >= 95) {
      showSpeech("I'm full for now.");
      note.textContent = `${state.name} is too full. Try another activity or wait for hunger to drop.`;
    } else {
      state.hunger = clamp(state.hunger + 18);
      state.happiness = clamp(state.happiness + 2);
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + 1);
      showSpeech(randomItem(responses));
      note.textContent = `You fed ${state.name}. +1 friendship. Small gains add up over time.`;
      pet.classList.add("happy");
    }
  } else if (action === "play") {
    if (state.energy < 20 || state.hunger < 10) {
      showSpeech(state.energy < 20 ? "I need to rest before playing." : "I need something to eat first.");
      note.textContent = `${state.name} needs more energy and food before playing.`;
    } else {
      state.happiness = clamp(state.happiness + 12);
      state.energy = clamp(state.energy - 18);
      state.hunger = clamp(state.hunger - 10);
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + 2);
      showSpeech(randomItem(responses));
      note.textContent = `You played with ${state.name}. +2 friendship, but it used energy and increased hunger.`;
      pet.classList.add("playing");
    }
  } else if (action === "sleep") {
    state.energy = clamp(state.energy + 22);
    state.happiness = clamp(state.happiness - 2);
    state.hunger = clamp(state.hunger - 1);
    showSpeech(randomItem(responses));
    note.textContent = `${state.name} rested. Energy recovered, but hunger and happiness still need attention.`;
    pet.classList.add("sleeping");
  } else if (action === "pet") {
    if (state.happiness < 5) {
      showSpeech("I need a little time to feel better.");
      note.textContent = `${state.name} is having a rough moment. Try feeding or resting first.`;
    } else {
      state.happiness = clamp(state.happiness + 4);
      state.friendship = Math.min(FRIENDSHIP_GOAL, state.friendship + 1);
      showSpeech(randomItem(responses));
      note.textContent = `You spent a quiet moment with ${state.name}. +1 friendship.`;
      pet.classList.add("happy");
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
  chirp();
  render();
  save();
}

function save() {
  try { localStorage.setItem("friendpet-save-v2", JSON.stringify(state)); } catch (_) {}
}

function load() {
  try {
    const saved = localStorage.getItem("friendpet-save-v2");
    if (saved) {
      state = { ...defaults, ...JSON.parse(saved) };
      state.friendship = Math.min(FRIENDSHIP_GOAL, Math.max(0, Number(state.friendship) || 0));
      state.actions = Math.max(0, Number(state.actions) || 0);
    }
    if (!saved) state.name = "Cinder";
  } catch (_) { state = { ...defaults }; }
  render();
  showSpeech(randomItem(dialogue.idle));
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

load();
