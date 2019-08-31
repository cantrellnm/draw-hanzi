/* eslint-env jquery, browser */

let list = [];
let listIndex = 0;
let writers = [];
let showOutline = true;
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
  $('#list-options #previous').on('click', previousListIndex);
  $('#list-options #next').on('click', nextListIndex);

  // PRACTICE
  $('#practice-options #animate').on('click', animateCharacters);
  $('#practice-options #show-outline').on('change', () => {
    showOutline = !showOutline;
    writers.forEach(w => {
      if (showOutline) {
        w.showOutline({duration: 0});
      } else {
        w.hideOutline({duration: 0});
      }
    });
  });
  $('#practice-options #show-grid').on('change', () => {
    $('#practice').toggleClass('no-grid');
  });
  $('#practice-options #hint-on-miss').on('change', (e) => {
    showHintAfterMisses = e.target.options[e.target.selectedIndex].value
    cancelQuiz();
    startQuiz(writers[0], 0);
  });

});

function validateListContent(e) {
  let textarea = e.target;
  // remove characters that aren't in given unicode blocks or whitespace
  textarea.value = textarea.value.replace(/(?!([\p{Ideographic}|\p{Unified_Ideograph}|\p{Radical}]|\s))./ug, '');
  textarea.value = textarea.value.replace(/\s{2,}/g, ' ');
}

function setList(target) {
  list = $(target).val().split(/\s/);
  setListIndex(0);
}

function setListIndex(val) {
  listIndex = val;
  $('#list-index').html(`showing ${val+1} of ${list.length}`);
  drawCharacters();
  characterInfo(list[listIndex]);
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
  $('#practice-character').html('');
  if (char) {
    $.getJSON("/char/data/" + char, function(res) {
      if (res.data && res.data.length) {
        res.data.forEach(characterDefinition);
      } else {
        $('#practice-character').append(`<p class="character-default card-body"><span lang="zh" class="character">${char}</span></p>`);
        console.log(res);
      }
    });
  }
}
function characterDefinition(def) {
  let txt = '<p class="character-definition card-body">';
  if (def.simplified) txt += `<span lang="zh" class="character simplified">${def.simplified}</span>`;
  if (def.traditional && def.traditional !== def.simplified) txt += `<label>Traditional: <span lang="zh" class="character traditional">${def.traditional}</span></label>`;
  if (def.pinyin) txt += `<span lang="zh" class="pinyin">${PinyinConverter.convert(def.pinyin)}</span>`;
  if (def.definition) txt += `<span class="definition">${def.definition.split('/').join(', ')}</span>`;
  txt += '</p>';
  $('#practice-character').append(txt);
}

function drawCharacters() {
  $('#practice').html('');
  writers = [];
  list[listIndex].split('').forEach(insertCharacter);
  hideCharacters();
  startQuiz(writers[0], 0);
}

function insertCharacter(char, i) {
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
    writer.quiz({
      showHintAfterMisses : showHintAfterMisses,
      onComplete: function(summaryData) {
        console.log(summaryData);
        if (writers[i+1]) {
          startQuiz(writers[i+1], i+1);
        } else {
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
