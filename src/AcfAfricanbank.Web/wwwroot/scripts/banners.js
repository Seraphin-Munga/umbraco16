var Banner = (function () {
    /*
     * function
     * params
     * description: Opens defined url link, when banner is clicked
     */
    function openLink(event, url, target) {
        window.open(url, target);

        if (!event) {
            event = window.event;
        }

        //IE9 & Other Browsers
        if (event.stopPropagation) {
            event.stopPropagation();
        }
            //IE8 and Lower
        else {
            event.cancelBubble = true;
        }
    }

    /*
     * function: showHoverEffect
     * params: without params
     * description: Check if hover effect must be shown
     */
    function showHoverEffect() {
        return !Common.isDevice();
    }

    return {
        openLink: openLink,
        showHoverEffect: showHoverEffect
    };
}());

var StaticImage_Overlay = (function () {
    var OVERLAYHOVERSTYLE = "hover-style";
    var OVERLAYHOVERACTIVE = "hover-active";

    /*
     * function: addHoverOverlayBackground
     * params: without params
     * description: Add overlay background color with/without slider
     */
    function addHoverOverlayBackground(elem) {
        if (elem.hasClass(OVERLAYHOVERACTIVE) && Banner.showHoverEffect()) {
            elem.addClass(OVERLAYHOVERSTYLE);
        }
    }

    /*
     * function: removeHoverOverlayBackground
     * params: without params
     * description: removes overlay background color with/without slider
     */
    function removeHoverOverlayBackground(elem) {
        if (elem.hasClass(OVERLAYHOVERACTIVE) && Banner.showHoverEffect()) {
            elem.removeClass(OVERLAYHOVERSTYLE);
        }
    }

    /*
     * function: init
     * params: without params
     * description: Banner init properties
     */
    function init() {
        $(".static-image .overlay-back").hover(function () {
            addHoverOverlayBackground($(this));
        }, function () {
            removeHoverOverlayBackground($(this));
        });
    }

    return {
        init: init
    };
}());