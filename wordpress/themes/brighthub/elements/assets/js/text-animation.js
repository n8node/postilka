(function ($) {
    $.fn.animatedHeadline = function (options) {
      var settings = $.extend(
        {
          animationType: "rotate-1",
          animationDelay: 2500,
          barAnimationDelay: 3800,
          barWaiting: 800,
          lettersDelay: 50,
          typeLettersDelay: 150,
          selectionDuration: 500,
          typeAnimationDelay: 1300,
          revealDuration: 600,
          revealAnimationDelay: 1500
        },
        options
      );
      var duration = settings.animationDelay;
      this.each(function () {
        var headline = $(this);
        if (settings.animationType) {
          if (
            settings.animationType == "type" ||
            settings.animationType == "rotate-2" ||
            settings.animationType == "rotate-3" ||
            settings.animationType == "scale"
          ) {
            headline
              .find(".pxl-heading .pxl-heading__title")
              .addClass("letters " + settings.animationType);
          } else if (settings.animationType == "clip") {
            headline
              .find(".pxl-heading .pxl-heading__title")
              .addClass(settings.animationType + " is-full-width");
          } else {
            headline.find(".pxl-heading .pxl-heading__title").addClass(settings.animationType);
          }
        }
        singleLetters($(".pxl-heading .pxl-heading__title.letters").find("b"));
        if (headline.hasClass("loading-bar")) {
          duration = settings.barAnimationDelay;
          setTimeout(function () {
            headline.find(".pxl-heading__type-loading-bar").addClass("is-loading");
          }, settings.barWaiting);
        } else if (headline.hasClass("clip")) {
          var spanWrapper = headline.find(".pxl-heading__type-clip"),
            newWidth = spanWrapper.width() + 10;
          spanWrapper.css("width", newWidth);
        } else if (!headline.find(".pxl-heading .pxl-heading__title").hasClass("type")) {
          var words = headline.find("b"),
            width = 0;
          words.each(function () {
            var wordWidth = $(this).width();
            if (wordWidth > width) width = wordWidth;
          });
          headline.find(".pxl-heading__words").css("width", width);
        }
        setTimeout(function () {
          hideWord(headline.find(".is-visible").eq(0));
        }, duration);
      });
      function singleLetters(words) {
        words.each(function () {
          var word = $(this),
            letters = word.text().split(""),
            selected = word.hasClass("is-visible");
          for (i in letters) {
            if (word.parents(".rotate-2").length > 0) letters[i] = "<em>" + letters[i] + "</em>";
            letters[i] = selected
              ? '<i class="in">' + letters[i] + "</i>"
              : "<i>" + letters[i] + "</i>";
          }
          var newLetters = letters.join("");
          word.html(newLetters).css("opacity", 1);
        });
      }
      function hideWord(word) {
        var nextWord = takeNext(word);
        if (word.parents(".pxl-heading .pxl-heading__title").hasClass("type")) {
          var parentSpan = word.parent(".pxl-heading__words");
          parentSpan.addClass("selected").removeClass("waiting");
          setTimeout(function () {
            parentSpan.removeClass("selected");
            word
              .removeClass("is-visible")
              .addClass("is-hidden")
              .children("i")
              .removeClass("in")
              .addClass("out");
          }, settings.selectionDuration);
          setTimeout(function () {
            showWord(nextWord, settings.typeLettersDelay);
          }, settings.typeAnimationDelay);
        } else if (word.parents(".pxl-heading .pxl-heading__title").hasClass("letters")) {
          var bool = word.children("i").length >= nextWord.children("i").length ? !0 : !1;
          hideLetter(word.find("i").eq(0), word, bool, settings.lettersDelay);
          showLetter(nextWord.find("i").eq(0), nextWord, bool, settings.lettersDelay);
        } else if (word.parents(".pxl-heading .pxl-heading__title").hasClass("clip")) {
          word
            .parents(".pxl-heading__words")
            .animate({ width: "2px" }, settings.revealDuration, function () {
              switchWord(word, nextWord);
              showWord(nextWord);
            });
        } else if (word.parents(".pxl-heading .pxl-heading__title").hasClass("loading-bar")) {
          word.parents(".pxl-heading__words").removeClass("is-loading");
          switchWord(word, nextWord);
          setTimeout(function () {
            hideWord(nextWord);
          }, settings.barAnimationDelay);
          setTimeout(function () {
            word.parents(".pxl-heading__words").addClass("is-loading");
          }, settings.barWaiting);
        } else {
          switchWord(word, nextWord);
          setTimeout(function () {
            hideWord(nextWord);
          }, settings.animationDelay);
        }
      }
      function showWord(word, duration) {
        if (word.parents(".pxl-heading .pxl-heading__title").hasClass("type")) {
          showLetter(word.find("i").eq(0), word, !1, duration);
          word.addClass("is-visible").removeClass("is-hidden");
        } else if (word.parents(".pxl-heading .pxl-heading__title").hasClass("clip")) {
          word
            .parents(".pxl-heading__words")
            .animate({ width: word.width() + 10 }, settings.revealDuration, function () {
              setTimeout(function () {
                hideWord(word);
              }, settings.revealAnimationDelay);
            });
        }
      }
      function hideLetter(letter, word, bool, duration) {
        letter.removeClass("in").addClass("out");
        if (!letter.is(":last-child")) {
          setTimeout(function () {
            hideLetter(letter.next(), word, bool, duration);
          }, duration);
        } else if (bool) {
          setTimeout(function () {
            hideWord(takeNext(word));
          }, settings.animationDelay);
        }
        if (letter.is(":last-child") && $("html").hasClass("no-csstransitions")) {
          var nextWord = takeNext(word);
          switchWord(word, nextWord);
        }
      }
      function showLetter(letter, word, bool, duration) {
        letter.addClass("in").removeClass("out");
        if (!letter.is(":last-child")) {
          setTimeout(function () {
            showLetter(letter.next(), word, bool, duration);
          }, duration);
        } else {
          if (word.parents(".pxl-heading .pxl-heading__title").hasClass("type")) {
            setTimeout(function () {
              word.parents(".pxl-heading__words").addClass("waiting");
            }, 200);
          }
          if (!bool) {
            setTimeout(function () {
              hideWord(word);
            }, settings.animationDelay);
          }
        }
      }
      function takeNext(word) {
        var words = word.parent().children("b");
        var index = words.index(word);
        return index + 1 < words.length ? words.eq(index + 1) : words.eq(0);
      }
      
      function takePrev(word) {
        var words = word.parent().children("b");
        var index = words.index(word);
        return index - 1 >= 0 ? words.eq(index - 1) : words.last();
      }
      
      function switchWord(oldWord, newWord) {
        oldWord.removeClass("is-visible").addClass("is-hidden");
        newWord.removeClass("is-hidden").addClass("is-visible");
      }
    };
  })(jQuery);
  
