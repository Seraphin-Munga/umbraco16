/**
 * Applications widget
 *
 * Homepage widget for customer application forms, including quicklinks
 */
function iframeInit() {
    //$("#creditprocess")[0].find(".icon_loan_active").attr("style", "display:block !important");
    //$("#creditprocess")[0].find(".icon_loan").attr("style", "display:none !important");
    //$("#credit-panel-link").click(function () {
    //    $("#creditprocess")[0].contentWindow.postMessage("change-title", "http://dev-africanbank-cms.ebankit.local/en/home/find-us/");
      
    //})
    //function postMessageHandler(msg) {
    //    // we don't seem to always the get the
    //    // apply-form-ready event so hide it every
    //    $(".loader-container.product-content").hide();
    //    if (msg.data === "goToApply") {
    //        $(".loader-container.product-content").show();
    //        window.location.href = "http://dev-africanbank-cms.ebankit.local/en/home/find-us/";
    //    }
    //}
    //if (window.addEventListener) {
    //    window.addEventListener("message", postMessageHandler, false);
    //} else {
    //    window.attachEvent("message", postMessageHandler);
    //}
}

function iframeInitMobile() {
           //$(".loader-container.product-content").hide();
        ////if (msg.data === "goToApply") {
        ////    $(".loader-container.product-content").show();
        ////    window.location.href = "http://dev-africanbank-cms.ebankit.local/en/home/find-us/";
        ////}   
    
}

$(function (ab, $) {
    "use strict";

    var width_windows = $(window).width();

    $(window).resize(function () {

        $(".active-panel").find(".objectcenter").find(".icon_products").hide();
        $(".active-panel").find(".objectcenter").find(".active_icon_products").show();
        $(".active-panel").find(".objectcenter").find(".div_img_snniper_mobile").find(".icon_products").hide();
        $(".active-panel").find(".objectcenter").find(".div_img_snniper_mobile").find(".active_icon_products").show();
    });


    //
    //
    // ----------------------------------------------------------------- //
    // Vars, $-cache

    // Sets the initial panel on page load
    // var sInitialPanelSelector = 'a[data-target=#saveInvest_Panel]';
    var sInitialPanelSelector = 'a[data-target=#applyForLoan_Panel]';
    var sInitialPanelSelectorMobile = 'a[data-target=#applyForLoan_Panel_mobile]';
    /**
     * Root element selector
     */
    var $applicationsWidget = $('#applicationsWidget');
    var $applicationsWidgetMobile = $('#applicationsWidget_mobile');
    var $productsMenu = $applicationsWidget.find('.products-menu');
    var $productsMenuMobile = $applicationsWidgetMobile.find('.products-menu');

    //
    //
    // ----------------------------------------------------------------- //
    // Initialise

    /**
     * Display the desired panel when page loads
     */
    fAddActiveState($applicationsWidget.find(sInitialPanelSelector));
    fAddActiveState($applicationsWidgetMobile.find(sInitialPanelSelectorMobile));

    //
    //
    // ----------------------------------------------------------------- //
    // Event handlers

    /**
     * Delegate any anchor clicks within #productsMenu.
     * A click will set the active state of the desired panel
     */
    $productsMenu.on('click', 'a', function (oEvent) {       
        oEvent.preventDefault();
        fRemoveAllActiveStates();
        fAddActiveState(this);
    });

    $productsMenuMobile.on('click', 'a', function (oEvent) {     
        oEvent.preventDefault();
        fRemoveAllActiveStatesMobile();
        fAddActiveStateMobile(this);
    });
    //
    //
    // ----------------------------------------------------------------- //
    // Functions

    /**
     * Sets the active state for the desired panel
     */
    function fAddActiveState(elem) {
        //console.log(elem);
        $(elem).addClass('active-panel');
        var sTarget = $(elem).data('target');
        $(elem).find('.active_icon_products').show();
        $(elem).find('.icon_products').hide();
        $applicationsWidget.find(sTarget).addClass('active-panel');
    }
    /**
     * Removes all '.active-panel' classes
     */
    function fRemoveAllActiveStates() {
        $applicationsWidget.find('a').removeClass('active-panel');
        $('.active_icon_products').hide();
        $('.icon_products').show();
        $applicationsWidget.find('.product-content').removeClass('active-panel');
    }
   
    function fAddActiveStateMobile(elem) {
        console.log(elem);
        console.log("elele");
        $(elem).addClass('active-panel');
        var sTarget = $(elem).data('target');
        console.log(sTarget);
        $(elem).find('.active_icon_products').show();
        $(elem).find('.icon_products').hide();
        $applicationsWidgetMobile.find(sTarget).addClass('active-panel');
    }

    /**
     * Removes all '.active-panel' classes
     */
    function fRemoveAllActiveStatesMobile() {
        $applicationsWidgetMobile.find('a').removeClass('active-panel');
        $('.active_icon_products').hide();
        $('.icon_products').show();
        $applicationsWidgetMobile.find('.product-content').removeClass('active-panel');
    }
}(window.ab = window.ab || {}, jQuery));
