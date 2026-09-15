/**
 * Account switcher component
 *
 *
 */
$(function (ab, $) {

  // Exit this script if there is no #toggleAccounts
  // on the page
  if (!$('.dashboard-icons').length > 0) return;

  // Cache $ elements
  var $dashboardIcons = $('.dashboard-icon');

  $dashboardIcons
    .on('mouseenter', function () {
      setIconActiveState($(this));
    })
    .on('mouseleave', function () {
      resetIconsStates();
    });

  function setIconActiveState(elem) {
    $(elem).addClass('active').find('.description').removeClass('invisible');
  }

  function resetIconsStates() {
    $dashboardIcons.each(function () {
      $(this).removeClass('active').find('.description').addClass('invisible');
    })
  }

}(window.ab = window.ab || {}, jQuery));

