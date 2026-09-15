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
    // scroll-to-top animate
    $('.scrollup').click(function () {
        //var ua = window.navigator.userAgent;
        //var msie = ua.indexOf("MSIE ");



        //// Opera 8.0+
        //var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

        //// Firefox 1.0+
        //var isFirefox = typeof InstallTrigger !== 'undefined';

        //// Safari 3.0+ "[object HTMLElementConstructor]" 
        //var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification);

        //// Internet Explorer 6-11
        //var isIE = /*@cc_on!@*/false || !!document.documentMode;

        //// Edge 20+
        //var isEdge = !isIE && !!window.StyleMedia;

        //// Chrome 1+
        //var isChrome = !!window.chrome && !!window.chrome.webstore;

        //// Blink engine detection


        $('body,html').animate({
            scrollTop: 0
        }, 600);
        //if ( isIE || isEdge || msie > 0) // If Internet Explorer, return version number
        //{
        //    document.documentElement.scrollTop = 0;
        //}
        //else  // If another browser, return 0
        //{
           
        //}



        return false;
    });


    // over learn more
    $('.block_learn_more').mouseover(function () {
        $(this).find(".background_blur").hide();
        $(this).find(".overlay").attr("style", "background-color:transparent !important;");

    });
    $('.block_learn_more').mouseout(function () {
        $(this).find(".background_blur").show();
        $(this).find(".overlay").attr("style", "background-color:rgba(87, 135, 147,0.6);");
    });
});