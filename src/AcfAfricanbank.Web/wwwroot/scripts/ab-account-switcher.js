/**
 * Account switcher component
 *
 * User opens dropdown and selects desired account
 */
$(function (ab, $) {

  /**
   * Exit this script if there is no #accountSwitcher on the page
   */
  if (!$('#accountSwitcher').length > 0) return;

  /**
   * Variables State
   */
  // Cache $ elements
  var $accountSwitcher  = $('#accountSwitcher'),
      $accountItemRow   = $accountSwitcher.find('.account-item-row'),
      $toggleAccounts   = $accountSwitcher.find('#toggleAccounts'),
      $accountsList     = $accountSwitcher.find('.accounts-item'),
      nMenuHeight       = 0; // Used for adding padding top of the body

  /**
   * Append the account selector to the main nav
   * so that it is fixed to the viewport along with
   * the nav
   */
  $accountSwitcher
      .removeClass('hidden')
      .appendTo('.navbar.navbar-default.navbar-ab');
  setBodyPadding();

  /**
   * TODO: strip out into own js file
   * Add the breadcrumbs component to the main menu
   * - above the account selector
   */
  $('.breadcrumbs-banner').detach().insertBefore('#accountSwitcher');

  //
  if ($accountItemRow.length > 1) {

    // Show the toggle (dropdown arrow) if
    // there is more than one account available
    $('.toggle-accounts').addClass('visible');

    // Adds tick to user-selected account
    $toggleAccounts.on('click', toggleAccountsHandler);
  }

  /**
   * Toggles the account switcher between an open and closed state
   */
  function toggleAccountsHandler() {

    toggleAccountsList();

    if ($accountSwitcher.hasClass('open')) {

      //
      $toggleAccounts.find('.glyphicon')
          .fadeOut(300, function () {

            $toggleAccounts.find('.glyphicon')
                .removeClass()
                .addClass('glyphicon glyphicon-chevron-up');

          })
          .fadeIn(100);

    } else {

      $toggleAccounts.find('.glyphicon')
          .fadeOut(300, function () {

            $toggleAccounts.find('.glyphicon')
                .removeClass()
                .addClass('glyphicon glyphicon-chevron-down');

          })
          .fadeIn(100);

    }
  }

  //Show accounts as dropdown via slide animation
  function toggleAccountsList() {

    if ($accountSwitcher.hasClass('open')) {

      closeSelector();

    } else {

      openSelector();
    }
  }

  /**
   * Open the selector
   */
  function openSelector() {

    $accountsList.slideDown();
    $accountSwitcher.addClass('open');
  }

  /**
   * Close the switcher
   */
  function closeSelector() {

    $accountsList.slideUp();
    $accountSwitcher.removeClass('open');
  }

  /**
   * Add or remove padding-top on the body
   */
  function setBodyPadding() {

    // Set the body padding-top based on viewport-size
    // This ensures the page in-line content can be seen
    // below the main-menu and the
    if (window.innerWidth > 767) {

      $('body').css({
        'padding-top': $('.navbar-collapse').outerHeight() + $('#toggleAccounts.account-item-row').outerHeight()
      });

    } else {

      $('body').css({
        'padding-top': 0
      });
    }
  }

  /**
   * Close the account list if user clicks outside
   */
  $(document).mouseup(function (e) {

    var container = $accountSwitcher;

    if (!container.is(e.target) && container.has(e.target).length === 0) {

      if ($accountSwitcher.hasClass('open')) {

        toggleAccountsHandler();
      }
    }
  });

  /**
   * Close the account list on resize
   */
  $(window).resize(function () {

    $toggleAccounts.find('.glyphicon')
        .removeClass()
        .addClass('glyphicon glyphicon-chevron-down');

    closeSelector();
    setBodyPadding();
  });

}(window.ab = window.ab || {}, jQuery));

/**
 * Account switcher component
 *
 * User opens dropdown and selects desired account
 */
$(function (ab, $) {

  $('.payment-btn').on('click', function (event) {

    event.stopPropagation();

    //console.log($(event.target));
  });

}(window.ab = window.ab || {}, jQuery));
