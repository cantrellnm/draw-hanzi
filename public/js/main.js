/* eslint-env jquery, browser */
import Speak from './lib/speak-tts.js';
const speech = new Speak(); // will throw an exception if not browser supported
if (speech.hasBrowserSupport()) { // returns a boolean
  speech.init({
    'lang': 'zh-CN'
  }).then((data) => {
  // The "data" object contains the list of available voices and the voice synthesis params
  console.log("Speech is ready, voices are available", data);
  let voices = data.voices.filter(v => {return v.lang === 'zh-CN'});
  if (voices.length) {
    let voice = voices[0];
    speech.setVoice(voice.name);
    console.log('Set voice to '+voice.name);
  } else {
    console.log('No voices found for zh-CN');
  }
}).catch(e => {
  console.error("An error occured while initializing Speech: ", e);
})
}

let list = [];
let orderedList = [];
let listOrder = 'original';
let listIndex = 0;
let score = [];
let writers = [];
let showOutline = true;
let autoplayAudio = false;
let showHintAfterMisses = 1;
$(document).ready(() => {

  // LIST FORM
  $('#list-form #content').on('change keyup', validateListContent);

  // LIST SELECT
  if ($('#list-select').length) {
    setList('#list-select');
    $('#list-select').on('change', () => { setList('#list-select'); });
  }
  if ($('#practice-list-content').length) {
    setList('#practice-list-content');
  }

  // LIST OPTIONS
  $('#list-options #list-order-select').on('change', setListOrder);
  $('#list-options #previous').on('click', previousListIndex);
  $('#list-options #next').on('click', nextListIndex);

  // PRACTICE
  $('#practice-options #animate').on('click', animateCharacters);
  $('#practice-options #show-outline').on('change', () => {
    showOutline = !showOutline;
    if (showOutline) {
      $('#practice-container').removeClass('hide-character');
      writers.forEach(w => {
          w.showOutline({duration: 0});
      });
    } else {
      $('#practice-container').addClass('hide-character');
      writers.forEach(w => {
          w.hideOutline({duration: 0});
      });
    }
  });
  $('#practice-options #show-grid').on('change', () => {
    $('#practice').toggleClass('no-grid');
  });
  $('#practice-options #autoplay-audio').on('change', () => {
    autoplayAudio = !autoplayAudio;
  });
  $('#practice-options #hint-on-miss').on('change', (e) => {
    showHintAfterMisses = e.target.options[e.target.selectedIndex].value
    cancelQuiz();
    startQuiz(writers[0], 0);
  });

  // SPEAK
  $('body').on('click', 'button.speak', (e) => {
    let text = e.target.innerText;
    if (text) {
      speech.speak({ text }).catch(console.error);
    }
  });

});

function validateListContent(e) {
  let textarea = e.target;
  // remove characters that aren't in given unicode blocks or whitespace
  textarea.value = textarea.value.replace(/(?!([\p{Ideographic}|\p{Unified_Ideograph}|\p{Radical}]|\s))./ug, '');
  textarea.value = textarea.value.replace(/\s{2,}/g, ' ');
}

async function setList(target) {
  list = $(target).val().split(/\s/);
  orderedList = await orderList();
  setListIndex(0);
}

async function setListOrder() {
  listOrder = $(this).val();
  orderedList = await orderList();
  setListIndex(0);
}

async function orderList() {
  switch (listOrder) {
    case 'original':
      return [...list];
    case 'reverse':
      return [...list].reverse();
    case 'random':
      return [...list].sort((a, b) => { return 0.5 - Math.random(); });
    case 'score':
      return await new Promise((resolve, reject) => {
        $.post("/list/sort", { content: list.join(' '), _csrf: $('#practice-container input[name="_csrf"]').val() }, (res) => {
          if (res.list) {
            resolve([...res.list]);
          } else {
            resolve([...list]);
          }
        }, 'json');
      });
  }
}

function setListIndex(val) {
  listIndex = val;
  $('#list-index').html(`showing ${val+1} of ${list.length}`);
  drawCharacters();
  characterInfo(orderedList[listIndex]);
}

function previousListIndex() {
  let newIndex = listIndex === 0 ? list.length - 1 : listIndex - 1;
  setListIndex(newIndex);
}

function nextListIndex() {
  let newIndex = listIndex === list.length - 1 ? 0 : listIndex + 1;
  setListIndex(newIndex);
}

function characterInfo(char) {
  if (char) {
    // char info loading start
    $('body').addClass('character-info-loading');
    $.getJSON("/char/data/" + char, function(res) {
      $('#practice-character').html('');
      // score data
      if (res.score) {
        $('#practice-character').append(characterAttempts(res.score));
      }
      // definition data
      if (res.data && res.data.length) {
        res.data.forEach(characterDefinition);
        if (res.data[0].pinyin && autoplayAudio) {
          speech.speak({ text: PinyinConverter.convert(res.data[0].pinyin) }).catch(console.error);
        }
      } else {
        $('#practice-character').append(`<p class="character-default card-body"><span lang="zh" class="character">${char}</span></p>`);
        console.log(res);
      }
      // char info loading end
      $('body').removeClass('character-info-loading');
    });
  } else {
    $('#practice-character').html('');
  }
}
function characterAttempts(score) {
  let txt = '<details id="character-score" class="card-body"><summary><i class="fas fa-info fa-xs"></i></summary>';
  txt += `<p>Current Score: ${score.score}%</p>`;
  txt += `<p>Total Attempts: ${score.totalAttempts}</p>`;
  txt += '</details>';
  return txt;
}
function characterDefinition(def) {
  let txt = '<p class="character-definition card-body">';
  if (def.simplified) txt += `<span lang="zh" class="character simplified">${def.simplified}</span>`;
  if (def.traditional && def.traditional !== def.simplified) txt += `<label>Traditional: <span lang="zh" class="character traditional">${def.traditional}</span></label>`;
  if (def.pinyin) {
    if (speech.hasBrowserSupport()) {
      txt += `<button lang="zh" class="btn pinyin speak">${PinyinConverter.convert(def.pinyin)}  <i class="fas fa-volume-up fa-xs"></i></button>`;
    } else {
      txt += `<span lang="zh" class="pinyin">${PinyinConverter.convert(def.pinyin)}</span>`;
    }
  }
  if (def.definition) txt += `<span class="definition">${def.definition.split('/').join(', ')}</span>`;
  txt += '</p>';
  $('#practice-character').append(txt);
}

function drawCharacters() {
  $('#practice').html('');
  writers = [];
  let chars = orderedList[listIndex].split('');
  if (chars.length) {
    // practice loading start
    $('body').addClass('stroke-data-loading');
    chars.forEach(insertCharacter);
  }
  hideCharacters();
  startQuiz(writers[0], 0);
}

function insertCharacter(char, i, arr) {
  $('#practice').append(createCharacterContainer(char, i));
  let writer = HanziWriter.create(`practice-character-${char}-${i}`, char, {
    width: 200,
    height: 200,
    showOutline,
    highlightCompleteColor: '#5EA360',
    strokeAnimationSpeed: 3, // 2x normal speed
    delayBetweenStrokes: 200, // milliseconds
    padding: 5,
    charDataLoader: function(char, onComplete) {
      $.getJSON("/char/strokes/" + char, function(charData) {
        if (i === arr.length - 1) {
          // practice loading ended
          $('body').removeClass('stroke-data-loading');
        }
        onComplete(charData);
      });
    }
  });
  writers.push(writer);
}

function hideCharacters() {
  writers.forEach(w => {
    w.hideCharacter({duration: 0});
  });
}

function startQuiz(writer, i) {
  if (writer) {
    score = [];
    writer.target.node.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
    writer.quiz({
      showHintAfterMisses : showHintAfterMisses,
      onCorrectStroke: function(data) {
        score.push(1);
      },
      onMistake: function(data) {
        score.push(0);
      },
      onComplete: function(summaryData) {
        console.log(summaryData);
        // start next
        if (writers[i+1]) {
          // next char
          startQuiz(writers[i+1], i+1);
        } else {
          // send score
          $.post("/char/score", { char: orderedList[listIndex], attempt: score, _csrf: $('#practice-container input[name="_csrf"]').val() }, (res) => {}, 'json');
          // next in list
          if (list.length > 1) {
            setTimeout(nextListIndex, 1500);
          } else {
            setTimeout(function() {
              hideCharacters();
              startQuiz(writers[0], 0);
            }, 1500);
          }
        }
      }
    });
  }
}

function cancelQuiz() {
  writers.forEach(w => {
    w.cancelQuiz();
  });
  hideCharacters();
}

function animateCharacters() {
  let delay = 500; // milliseconds
  hideCharacters();
  if (writers[0]) {
    $('#practice-options #animate').attr('disabled', true);
    animate(writers[0], delay, 0);
  }
}

function animate(writer, delay, i) {
  if (writers[i+1]) {
    writer.animateCharacter({
      onComplete: function() {
        setTimeout(function() {
          animate(writers[i+1], delay, i+1);
        }, delay);
      }
    });
  } else {
    writer.animateCharacter({
      onComplete: function() {
        setTimeout(function() {
          hideCharacters();
          $('#practice-options #animate').removeAttr('disabled');
          startQuiz(writers[0], 0);
        }, 500);
      }
    });
  }
}

function createCharacterContainer(char, i) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" class="practice-character" id="practice-character-${char}-${i}">`+
            '<line x1="0" y1="0" x2="200" y2="200" stroke="#DDD" />'+
            '<line x1="200" y1="0" x2="0" y2="200" stroke="#DDD" />'+
            '<line x1="100" y1="0" x2="100" y2="200" stroke="#DDD" />'+
            '<line x1="0" y1="100" x2="200" y2="100" stroke="#DDD" />'+
          '</svg>';
}
