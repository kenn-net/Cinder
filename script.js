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
  feed: ["Thanks. I was getting hungry.", "That was good.", "Could I have a little more later?", "Food makes this a better day."],
  play: ["That was fun. Again?", "I needed to move around.", "Let's try that one more time.", "I like spending time with you."],
  sleep: ["I'm going to rest for a while.", "A short nap should help.", "Wake me when it's time to eat.", "I feel better after some rest."],
  pet: ["That feels nice.", "You can stay a little longer.", "I'm getting used to you.", "Thanks for being gentle."],
  idle: ["Hi. What should we do today?", "I'm ready when you are.", "It's quiet here today.", "I could eat something soon."]
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
