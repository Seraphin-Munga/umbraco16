var Slider = (function () {

    var CLICK_EVENT = "click";

    /*
     * function: SlideData
     * params: without params
     * description: Set carousel indicators to change slider image. 
     */
    function SlideData() {
        event.stopPropagation();
        var goTo = $(this).data('slide-to');
        $('.carousel-inner .item').each(function (index) {
            if ($(this).data('id') == goTo) {
                goTo = index;
                return false;
            }

        });
        var carouselElement = $(this).parent().parent();
        carouselElement.carousel(goTo);
    }


    /*
     * function: init
     * params: without params
     * description: Slider init properties
     */
    function init() {
        $('.carousel-indicators li').on(CLICK_EVENT, SlideData);
    }

    return {
        init: init
    };
}());

var Slider_Overlay = (function () {

    var OVERLAYHOVERSTYLE = "hover-style";
    var OVERLAYHOVERACTIVE = "hover-active";
    var ACTIONADD = "ADD";
    var ACTIONREMOVE = "REMOVE";

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
     * function: GetGlobalOverlay
     * params: current element (normaly this)
     * description: gets global overlay based on current element
     */
    function GetGlobalOverlay(currentElement) {
        // Find high level parent
        var highLevelParent = currentElement.parents(".container-slider");

        //Find carousel
        return highLevelParent.children(".global-overlay");
    }

    /*
     * function: GetCarousel
     * params: current element (normaly this)
     * description: gets carousel element based on current element
     */
    function GetCarousel(currentElement) {
        // Find high level parent
        var highLevelParent = currentElement.parents(".container-slider");

        //Find carousel
        return highLevelParent.children(".carousel");
    }

    /*
     * function: GetCarouselIndicators
     * params: current element (normaly this)
     * description: gets carousel indicators element based on current element
     */
    function GetCarouselIndicators(currentElement) {
        var carousel = GetCarousel(currentElement);

        if (carousel) {
            //Find slider indicators
            return carousel.children(".carousel-indicators");
        }

        return null;
    }


    /*
     * function: GetActiveCarouselItem
     * params: current element (normaly this)
     * description: if carousel item exists on page, this function returns the current and active slider element
     */
    function GetActiveCarouselItem(currentElement) {
        var activeItem = null;
        var carousel = GetCarousel(currentElement);

        if (carousel) {
            //Find slider items
            var carouselDataItems = carousel.children(".carousel-inner");

            var carouselItems = carouselDataItems.children(".slider-item");

            if (carouselItems && carouselItems.length != 0) {
                carouselItems.each(function (i) {
                    var item = carouselItems[i];
                    if ($(item).hasClass("active")) {
                        activeItem = $(item);
                        return;
                    }
                });
            }
        }
        return activeItem;
    }

    /*
     * function: SetCarouselOverlayHover
     * params: action (ADD or REMOVE) and current element
     * description: Manage add/remove overlay hover from carousel
     */
    function SetCarouselOverlayHover(action, element) {

        if (action && (action === ACTIONADD || action === ACTIONREMOVE)) {

            //Get active item
            var carouselActiveItem = GetActiveCarouselItem(element);

            //Check Specific Overlay
            if (carouselActiveItem && carouselActiveItem.children().length > 0) {

                //Check if carousel item has overlay hover active
                var itemOverlay = carouselActiveItem.children(".hover-active");

                if (itemOverlay) {

                    if (action === ACTIONADD) {
                        addHoverOverlayBackground(itemOverlay);
                    }
                    else if (action === ACTIONREMOVE) {
                        removeHoverOverlayBackground(itemOverlay)
                    }
                }
            }
            else {
                //Check global overlay
                var globalOverlayElem = GetGlobalOverlay(element);

                if (globalOverlayElem.hasClass("overlay-back")) {

                    if (action === ACTIONADD) {
                        addHoverOverlayBackground(globalOverlayElem);
                    }
                    else if (action === ACTIONREMOVE) {
                        removeHoverOverlayBackground(globalOverlayElem)
                    }
                }
            }

        }
    }

    /*
    * function: SetGlobalOverlayHover
    * params: action (ADD or REMOVE) and current element
    * description: Manage add/remove hover for global overlay
    */
    function SetGlobalOverlayHover(action, element) {

        if (action && (action === ACTIONADD || action === ACTIONREMOVE)) {
            //Carousel indicators
            var carouselIndicators = GetCarouselIndicators(element);

            //If carousel indicators exists and current element has hover active
            if (carouselIndicators && element.hasClass(OVERLAYHOVERACTIVE)) {
                if (action === ACTIONADD) {
                    addHoverOverlayBackground(carouselIndicators);
                }
                else if (action === ACTIONREMOVE) {
                    removeHoverOverlayBackground(carouselIndicators)
                }
            }

            //Global overlay
            if (action === ACTIONADD) {
                addHoverOverlayBackground(element);
            }
            else if (action === ACTIONREMOVE) {
                removeHoverOverlayBackground(element)
            }

        }
    }


    /*
     * function: init
     * params: without params
     * description: Banner overlay init properties
     */
    function init() {

        $(".banner-slider .overlay-back").hover(
            function () {
                SetGlobalOverlayHover(ACTIONADD, $(this));
            },
            function () {
                SetGlobalOverlayHover(ACTIONREMOVE, $(this));
            });


        $(".banner-slider .carousel-indicators").hover(function () {
            SetCarouselOverlayHover(ACTIONADD, $(this));
        },
        function () {
            SetCarouselOverlayHover(ACTIONREMOVE, $(this));
        });

    }

    return {
        init: init
    };
}());