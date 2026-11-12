const film = document.querySelector('#film');
const soundButton = document.querySelector('#sound');
const rooms = [
  {
    name: 'Le couloir', title: 'Quelque chose <em>écoute</em>', shot: 1,
    clue: 'La créature tourne le dos au rideau. Quand ta botte grince, elle se fige et tend l’oreille.',
    choices: [
      ['Se glisser derrière le rideau', true, 'Lou retient son souffle. La créature s’éloigne.'],
      ['Courir sur le parquet', false, 'Le parquet craque. La créature bondit vers Lou !'],
    ],
    positions: [[23,30],[46,46],[67,24],[83,56],[56,74]],
  },
  {
    name: 'La bibliothèque', title: 'La boîte <em>à musique</em>', shot: 2,
    clue: 'La créature surveille la table. Quand le mécanisme de la boîte tinte, elle tourne la tête vers le fauteuil.',
    choices: [
      ['Attraper le chandelier sous son nez', false, 'Le chandelier cogne la table. La créature lève la tête !'],
      ['Remonter la boîte à musique', true, 'Elle quitte la table pour suivre le refrain. C’est le moment.'],
    ],
    positions: [[19,23],[42,57],[66,35],[83,48],[57,77]],
  },
  {
    name: 'La salle de bal', title: 'Une ombre <em>sans visage</em>', shot: 1,
    clue: 'La silhouette barre la dernière porte. Elle s’approche dans le noir, mais recule quand le faisceau de Lou effleure ses pattes.',
    choices: [
      ['Éclairer le sol devant la silhouette', true, 'Les yeux se ferment. La silhouette recule derrière une colonne.'],
      ['Éteindre la lampe et avancer', false, 'Dans le noir, des griffes accrochent le manteau de Lou.'],
    ],
    positions: [[29,21],[56,39],[79,27],[73,67],[40,72]],
  },
];

const shots = [
  ['0% 0%', 'Lou devant la porte du manoir.'],
  ['100% 0%', 'Un long couloir de pierre éclairé par la lune.'],
  ['0% 100%', 'Une bibliothèque et sa boîte à musique.'],
  ['100% 100%', 'Lou et une créature timide devant son gâteau.'],
];

let room = 0;
let phase = 'intro';
let courage = 3;
let collected = new Set();
let message = '';
let audio;
let master;
let enabled = false;
let muted = false;
let soundtrack;
let beat = 0;

function note(hz, duration, volume, type = 'sine', delay = 0, glide = hz) {
  if (!enabled) return;
  const start = audio.currentTime + delay;
  const voice = audio.createOscillator();
  const envelope = audio.createGain();
  voice.type = type;
  voice.frequency.setValueAtTime(hz, start);
  voice.frequency.exponentialRampToValueAtTime(glide, start + duration);
  envelope.gain.setValueAtTime(.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(.55, duration * .24));
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  voice.connect(envelope).connect(master);
  voice.start(start);
  voice.stop(start + duration + .02);
}

function score() {
  if (!enabled || ['intro', 'win', 'lose'].includes(phase)) return;
  const root = [55, 51.91, 46.25][room];
  note(root, 3.7, .18, 'triangle');
  note(root * 1.06, 3.35, .12);
  note(root * 2.83, 2.4, .045, 'triangle', .25);
  for (const [i, interval] of [1, 1.41, 1.06, 1.19].entries()) {
    note(root * 4 * interval, 1.1, .065, 'triangle', .2 + i * .52);
  }
  note(69, .28, .17, 'sine', .55, 34);
  note(67, .24, .13, 'sine', .81, 31);
  if (beat++ % 2) note(380, 2.1, .055, 'sine', .4, 250);
}

async function setSound(on) {
  try {
    if (on && !audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio = new Context();
      master = audio.createGain();
      master.gain.value = .68;
      master.connect(audio.destination);
    }
    if (on) await audio.resume();
    enabled = on;
    soundButton.textContent = on ? 'Son : activé' : 'Son : coupé';
    soundButton.setAttribute('aria-pressed', String(on));
    clearInterval(soundtrack);
    if (master) master.gain.setTargetAtTime(on ? .68 : 0, audio.currentTime, .08);
    if (on) {
      score();
      soundtrack = setInterval(score, 2800);
    }
  } catch {
    soundButton.textContent = 'Son indisponible';
  }
}

function effect(event) {
  if (event === 'candle') {
    note(523, .22, .12, 'triangle');
    note(784, .31, .09, 'sine', .07);
  } else if (event === 'danger') {
    note(115, .64, .27, 'triangle', 0, 29);
    note(217, .45, .12, 'sawtooth', 0, 58);
  } else if (event === 'win') {
    [262, 330, 392, 523].forEach((hz, index) => note(hz, .82, .12, 'triangle', index * .14));
  } else {
    note(196, .58, .1, 'triangle', 0, 147);
  }
}

function screen(shot, animate, action) {
  const [position, alt] = shots[shot];
  const dust = Array.from({length: 11}, (_, i) => '<i style="--x:' + ((i * 29 + 9) % 97) + '%;--t:' + (-i * .57) + 's"></i>').join('');
  const candles = phase === 'hunt' ? rooms[room].positions.map(([x, y], index) => {
    const id = room * 5 + index;
    const found = collected.has(id);
    return '<button type="button" class="candle' + (found ? ' found' : '') + '" style="--x:' + x + '%;--y:' + y + '%" data-candle="' + id + '" aria-label="Ramasser la bougie ' + (index + 1) + '"' + (found ? ' disabled' : '') + '><span aria-hidden="true">✧</span></button>';
  }).join('') : '';
  const actors = animate ? '<div class="moonlight"></div><div class="dust">' + dust + '</div><div class="actor ' + action + '" aria-hidden="true"><div class="torch"></div><div class="sprite"></div></div><div class="creature ' + action + '" aria-hidden="true"><i></i><b></b></div>' : '';
  const finale = phase === 'win' ? '<div class="final-flames" aria-label="Les quinze bougies allumées">' +
    Array.from({length: 15}, (_, i) => '<i style="--delay:' + (i * .12) + 's" aria-hidden="true"></i>').join('') + '</div>' : '';
  return '<div class="screen ' + (action === 'retreat' ? 'danger' : '') + '"><div class="shot" role="img" aria-label="' + alt + '" style="--shot:' + position + '"></div>' + actors + '<div class="hotspots">' + candles + '</div>' + finale + '</div>';
}

const button = (label, action, primary = false) => '<button type="button" class="' + (primary ? 'primary' : '') + '" data-action="' + action + '">' + label + '</button>';

function progress() {
  return '<div class="hud small"><span id="tally">✦ ' + collected.size + ' / 15 bougies</span><span aria-label="' + courage + ' chances restantes">' + '♥ '.repeat(courage) + '♡ '.repeat(3 - courage) + '</span></div><div class="inventory" aria-hidden="true">' +
    Array.from({length: 15}, (_, i) => '<i' + (collected.has(i) ? ' class="lit"' : '') + '></i>').join('') + '</div>';
}

function render(focus = true) {
  const current = rooms[room];
  let image = current.shot;
  let title = current.title;
  let tag = current.name;
  let text = current.clue;
  let controls = '';
  let action = 'arrive';
  let animate = true;

  if (phase === 'intro') {
    image = 0;
    animate = false;
    title = 'Le Gâteau <em>de minuit</em>';
    tag = 'Un film interactif pour Lou';
    text = 'Le soir de tes 15 ans, on vole les quinze bougies de ton gâteau. Une lampe à la main, tu franchis la porte du manoir. Observe les créatures et repère les petites flammes avant qu’elles te trouvent.';
    controls = button('Entrer dans le manoir →', 'start', true);
  } else if (phase === 'choice') {
    controls = current.choices.map(([label], index) => button(label, 'choice-' + index)).join('');
  } else if (phase === 'scare') {
    action = 'retreat';
    title = 'Demi-tour !';
    text = message + ' Tu perds une chance. Observe son comportement avant de réessayer.';
    controls = button('Revenir à l’abri →', 'retry', true);
  } else if (phase === 'hunt') {
    action = 'search';
    title = 'Retrouve les <em>flammes</em>';
    text = message + ' Touche chaque petite flamme dans l’image.';
    controls = button(room === 2 ? 'Allumer le gâteau →' : 'Ouvrir la prochaine porte →', 'next', true);
    if (collected.size < (room + 1) * 5) controls = controls.replace('data-action="next"', 'data-action="next" disabled');
  } else if (phase === 'win') {
    image = 3;
    animate = false;
    title = 'Joyeux 15 ans, <em>Lou !</em>';
    tag = 'Les quinze flammes de minuit';
    text = 'Une à une, les quinze bougies s’allument. La créature se penche vers toi. « Je peux garder la part avec le plus de glaçage ? » Fais un vœu, Lou. 🖤 Et quand tu auras soufflé tes bougies, envoie-moi ton RIB en privé, s’il te plaît. J’ai une petite surprise pour toi !';
    controls = button('Rejouer ↻', 'reset', true);
  } else if (phase === 'lose') {
    action = 'retreat';
    title = 'Le manoir <em>se referme</em>';
    text = message + ' Lou doit lâcher ses bougies pour retrouver la sortie. Il faudra une autre tentative pour souffler les quinze flammes.';
    controls = button('Tenter une autre approche ↻', 'reset', true);
  }

  film.innerHTML = screen(image, animate, action) + '<div class="body">' +
    (phase === 'intro' ? '' : progress()) + '<p class="eyebrow">' + tag + '</p><h2 tabindex="-1">' + title +
    '</h2><p class="lead">' + text + '</p><div class="choices">' + controls + '</div><p class="sr" id="announcement" role="status"></p></div>';
  if (focus) {
    film.querySelector('h2').focus({preventScroll:true});
    window.scrollTo(0, 0);
  }
}

function collect(target) {
  const id = Number(target.dataset.candle);
  if (phase !== 'hunt' || collected.has(id) || Math.floor(id / 5) !== room) return;
  collected.add(id);
  target.classList.add('found');
  target.disabled = true;
  film.querySelectorAll('.inventory i')[id].classList.add('lit');
  film.querySelector('#tally').textContent = '✦ ' + collected.size + ' / 15 bougies';
  const complete = collected.size === (room + 1) * 5;
  film.querySelector('#announcement').textContent = complete ? 'Toutes les bougies de la pièce sont récupérées.' : collected.size + ' bougies sur quinze.';
  if (complete) {
    const next = film.querySelector('[data-action="next"]');
    next.disabled = false;
    next.focus({preventScroll:true});
  } else if (target.matches(':focus') || window.matchMedia('(pointer:fine)').matches) {
    film.querySelector('.candle:not([disabled])')?.focus({preventScroll:true});
  }
  effect('candle');
}

soundButton.addEventListener('click', () => {
  muted = enabled;
  void setSound(!enabled);
});

film.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target || target.disabled) return;
  if (target.dataset.candle !== undefined) {
    collect(target);
    return;
  }
  const action = target.dataset.action;
  if (action === 'start' || action === 'reset') {
    room = 0;
    courage = 3;
    collected = new Set();
    phase = 'choice';
    if (!muted && !enabled) void setSound(true);
    else score();
  } else if (action === 'retry') {
    phase = 'choice';
  } else if (action === 'next' && collected.size === (room + 1) * 5) {
    if (room === 2) {
      phase = 'win';
      effect('win');
    } else {
      room += 1;
      phase = 'choice';
    }
  } else if (phase === 'choice' && /^choice-[01]$/.test(action)) {
    const [, safe, outcome] = rooms[room].choices[Number(action.slice(-1))];
    message = outcome;
    if (safe) {
      phase = 'hunt';
      effect('safe');
    } else {
      courage -= 1;
      phase = courage ? 'scare' : 'lose';
      effect('danger');
    }
  } else {
    return;
  }
  render();
});

render(false);
