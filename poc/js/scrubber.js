import { TOTAL_DAYS } from './schedule.js';

let currentDay = 0;
const listeners = [];

export function initScrubber(onDayChange) {
  listeners.push(onDayChange);

  const slider = document.getElementById('time-slider');
  const dayLabel = document.getElementById('day-label');
  const playBtn = document.getElementById('play-btn');

  slider.min = 0;
  slider.max = TOTAL_DAYS - 1;
  slider.value = 0;

  updateLabel(0, dayLabel);

  slider.addEventListener('input', () => {
    currentDay = parseInt(slider.value);
    updateLabel(currentDay, dayLabel);
    fire(currentDay);
  });

  // Play button
  let playing = false;
  let playInterval = null;
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸' : '▶';
    if (playing) {
      playInterval = setInterval(() => {
        currentDay = (currentDay + 1) % TOTAL_DAYS;
        slider.value = currentDay;
        updateLabel(currentDay, dayLabel);
        fire(currentDay);
      }, 120);
    } else {
      clearInterval(playInterval);
    }
  });
}

function fire(day) {
  listeners.forEach(fn => fn(day));
}

function updateLabel(day, el) {
  const date = new Date();
  date.setDate(date.getDate() + day);
  const fmt = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  el.textContent = day === 0 ? `Today (${fmt})` : `Day ${day} — ${fmt}`;
}

export function getCurrentDay() { return currentDay; }
