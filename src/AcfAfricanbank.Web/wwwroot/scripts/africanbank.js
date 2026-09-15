$(window).resize(function () {
    var fHeight = $("footer").outerHeight();

    $("body").css("padding-bottom", fHeight);
});

$(document).ready(function () {
    var fHeight = $("footer").outerHeight();
    $("body").css("padding-bottom", fHeight);

    $(window).scroll(function () {
        if ($(window).scrollTop() > 200) {
            $('.scrollup').removeClass('hidden');
        } else {
            $('.scrollup').addClass('hidden');
        }
    });

    function scrollCallBack() {
        $('.scrollup').fadeOut();
    }
    $(window).scroll(function () {
        clearTimeout($(this).data('scrollTimeout'));
        if ($(this).scrollTop() > 50) {
            $('.scrollup').fadeIn();
            $(this).data('scrollTimeout', setTimeout(scrollCallBack, 3000));
        } else {
            $('.scrollup').fadeOut();
        }
    });

    // scroll body to 0px on click
    $('.scrollup').click(function () {
        $('.scrollup').tooltip('hide');
        $('body,html').animate({
            scrollTop: 0
        }, 800);
        return false;
    });

    // scroll body to 0px on click
    $('.back-to-top-button').click(function () {
        $('.back-to-top-button').tooltip('hide');
        $('body,html').animate({
            scrollTop: 0
        }, 800);
        return false;
    });

    $('.scrollup').tooltip('show');

    $('.scrollup').tooltip('show');

    // over learn more
    $('.block_learn_more').mouseover(function () {
        $(this).find(".background_blur").hide();
        $(this).find(".overlay").attr("style", "background-color:transparent !important;");
    });
    $('.block_learn_more').mouseout(function () {
        $(this).find(".background_blur").show();
        $(this).find(".overlay").attr("style", "background-color:rgba(87, 135, 147,0.6);");
    });

    $('.block_learn_more_mobile').mouseover(function () {
        $(this).find(".background_blur").hide();
        $(this).find(".overlay").attr("style", "background-color:transparent !important;");
    });
    $('.block_learn_more_mobile').mouseout(function () {
        $(this).find(".background_blur").show();
        $(this).find(".overlay").attr("style", "background-color:rgba(87, 135, 147,0.6);");
    });

    $('#loader').fadeOut('slow');
    $('#preloader').fadeOut('slow');

    $('body').css({
        'overflow': 'visible'
    });
});

(function () {
    $(document).tooltip({
        selector: "[title]",
        placement: "bottom",
        trigger: "hover",
        animation: false
    });

    // void some browsers issue
    setTimeout(function () { scroll(0, 0); }, 1);

    $(function () {
        // your current click function
        $('.scroll').on('click', function (e) {
            e.preventDefault();
            $('html, body').animate({
                scrollTop: $($(this).attr('href')).offset().top - 100
            }, 500, 'swing');
        });

        (function (document, history, location) {
            var HISTORY_SUPPORT = !!(history && history.pushState);

            var anchorScrolls = {
                ANCHOR_REGEX: /^#[^ ]+$/,
                OFFSET_HEIGHT_PX: 150,

                /**
                 * Establish events, and fix initial scroll position if a hash is provided.
                 */
                init: function () {
                    this.scrollToCurrent();
                    window.addEventListener('hashchange', this.scrollToCurrent.bind(this));
                    document.body.addEventListener('click', this.delegateAnchors.bind(this));
                },

                /**
                 * Return the offset amount to deduct from the normal scroll position.
                 * Modify as appropriate to allow for dynamic calculations
                 */
                getFixedOffset: function () {
                    return this.OFFSET_HEIGHT_PX;
                },

                /**
                 * If the provided href is an anchor which resolves to an element on the
                 * page, scroll to it.
                 * @param  {String} href
                 * @return {Boolean} - Was the href an anchor.
                 */
                scrollIfAnchor: function (href, pushToHistory) {
                    var match, anchorOffset;

                    if (!this.ANCHOR_REGEX.test(href)) {
                        return false;
                    }

                    match = document.getElementById(href.slice(1));

                    if (match) {
                        //rect = match.getBoundingClientRect();
                        anchorOffset = $(match).offset().top - this.getFixedOffset();

                        var body = $("html, body");
                        body.animate({ scrollTop: anchorOffset }, '500', 'swing', function () {
                        });
                        //window.scrollTo(window.pageXOffset, anchorOffset);

                        // Add the state to history as-per normal anchor links
                        if (HISTORY_SUPPORT && pushToHistory) {
                            history.pushState({}, document.title, location.pathname + href);
                        }
                    }

                    return !!match;
                },

                /**
                 * Attempt to scroll to the current location's hash.
                 */
                scrollToCurrent: function () {
                    this.scrollIfAnchor(window.location.hash);
                },

                /**
                 * If the click event's target was an anchor, fix the scroll position.
                 */
                delegateAnchors: function (e) {
                    var elem = e.target;

                    if (
                      elem.nodeName === 'A' &&
                      this.scrollIfAnchor(elem.getAttribute('href'), true)
                    ) {
                        e.preventDefault();
                    }
                    else if (elem.parentElement.nodeName === 'A' &&
                      this.scrollIfAnchor(elem.parentElement.getAttribute('href'), true)) {
                        e.preventDefault();
                    }
                }
            };

            if (window.addEventListener) {
                window.addEventListener('DOMContentLoaded', anchorScrolls.init.bind(anchorScrolls));
            }
            else {
                window.attachEvent('DOMContentLoaded', anchorScrolls.init.bind(anchorScrolls));
            }
        })(window.document, window.history, window.location);
    });

    //$.ajax({
    //  url: $("body").data("context") +  "/maintenanceMode",
    //  success: function(response){
    //    response = JSON.parse(response);
    //    if(response===true){
    //      $("#loginBtn").addClass("hidden");
    //      $("#maintenance-alert").removeClass("hidden");
    //    }
    //  }
    //});
})();

//
// $('#element').donetyping(callback[, timeout=1000])
// Fires callback when a user has finished typing. This is determined by the time elapsed
// since the last keystroke and timeout parameter or the blur event--whichever comes first.
//   @callback: function to be called when even triggers
//   @timeout:  (default=1000) timeout, in ms, to to wait before triggering event if not
//              caused by blur.
// Requires jQuery 1.7+
//
; (function ($) {
    $.fn.extend({
        donetyping: function (callback, timeout) {
            timeout = timeout || 1e3; // 1 second default timeout
            var timeoutReference,
                doneTyping = function (el) {
                    if (!timeoutReference) return;
                    timeoutReference = null;
                    callback.call(el);
                };
            return this.each(function (i, el) {
                var $el = $(el);
                // Chrome Fix (Use keyup over keypress to detect backspace)
                // thank you @palerdot
                $el.is(':input') && $el.on('keyup keypress paste', function (e) {
                    // This catches the backspace button in chrome, but also prevents
                    // the event from triggering too preemptively. Without this line,
                    // using tab/shift+tab will make the focused element fire the callback.
                    if (e.type === 'keyup' && e.keyCode !== 8) return;

                    // Check if timeout has been set. If it has, "reset" the clock and
                    // start over again.
                    if (timeoutReference) clearTimeout(timeoutReference);
                    timeoutReference = setTimeout(function () {
                        // if we made it here, our timeout has elapsed. Fire the
                        // callback
                        doneTyping(el);
                    }, timeout);
                }).on('blur', function () {
                    // If we can, fire the event since we're leaving the field
                    doneTyping(el);
                });
            });
        }
    });
})(jQuery);

if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () { },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                       ? this
                       : oThis,
                       aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}