var Common = (function () {

    function isDevice() {      
        return ((typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1) || ($(window).width() < 992));
    }

    function isIEBrowser() {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older
            return true;
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11
            return true;
        }

        var edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+)
            return true;
        }
        return false;
    }

    return {
        isDevice: isDevice,
        isIEBrowser: isIEBrowser
    };
}());