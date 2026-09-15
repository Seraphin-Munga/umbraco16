 $(document).ready(function() {
    var $element1 = $('#banner');   // main banner (default visible)
    var $element2 = $('#banner1');  // alternate banner

    if ($element1.length === 0 || $element2.length === 0) return;

    // URLs where #banner should be hidden and #banner1 should be shown
    var bannerHidePatterns = [
        '/en/home/business-banking',
        '/en/home/tap2glass',
        '/en/home/business-transactional-account',
        '/en/home/business-and-commercial-banking',
        '/en/home/business-and-commercial-banking/#tab-CommercialPropertyFinance',
        '/en/home/business-and-commercial-banking/#tab-BusinessLoans',
        '/en/home/invest/call-deposits',
        '/en/home/invest/notice-deposits',
        '/en/home/invest/fixed-deposits',
        '/en/home/invest/online-money-manager'
    ];

    var currentUrl = window.location.href;

    // Check if current URL matches any hide pattern
    var shouldHideBanner = bannerHidePatterns.some(function(pattern) {
        return currentUrl.indexOf(pattern) !== -1;
    });

    if (shouldHideBanner && window.innerWidth <= 768) {
        $element1.hide();
        $element2.css("display", "flex");
        
    } else if(window.innerWidth <= 768) {
        $element1.show();
        $element2.hide();
    }
});
