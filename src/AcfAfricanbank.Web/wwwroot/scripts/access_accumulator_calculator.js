var interestRates = [];
var context = $("#loggedInContext").attr('href');
var lookupUrl = context + "/savings/rates/access-accumulator";
var detailedRatesLookupUrl = context + "/savings/rates/detailed-access-accumulator";

$(function(ab, $){
  /**
   * Exit this script if there is no bounding element found
   */
  if (!$('.access-calc .fixed-calculator-wrapper').length > 0) return;

    $.ajax({
        type: "GET",
        url: detailedRatesLookupUrl,
        crossDomain: true,
        success: function (response) {
          printRates(response.reverse());
        }
      });

  function printRates(rates){
    $.each(rates, function(key) {
      row = '<div class="col-xs-12"> ' +
            '<div class="rate-values">' +
              '<div class="row">' +
                '<div class="col-xs-12 col-sm-2">'+ rates[key].term +' months</div>' +
                '<div class="col-xs-12 col-sm-2">R500</div>' +
                '<div class="col-xs-12 col-sm-2">'+ rates[key].monthlyRate +'%</div>' +
                '<div class="col-xs-12 col-sm-2">'+ rates[key].monthlyInterestRateIncrease +'%</div>' +
                '<div class="col-xs-12 col-sm-2">'+ rates[key].semiAnnualRate +'%</div>' +
                '<div class="col-xs-12 col-sm-2">'+ rates[key].expiryRate +'%</div>' +
              '</div>' +
            '</div>' +
          '</div> <div class="col-xs-12"><hr></div>';
      $(".rates-rows").append($(row));
    });
  }

    $.ajax({
        type: "GET",
        url: lookupUrl,
        crossDomain: true,
        success: function (response) {

            if (response == null) {

                ab.shared.showErrorMsg("An empty response was returned from the server. Please try again Later");
                $("#calculator-footer").slideUp();
                return false;
            }

            if (!ab.utilities.isNullOrEmpty(response.errorMessage)) {
                ab.shared.showErrorMsg(response.errorMessage);
                $("#calculator-footer").slideUp();
                return false;
            }

            for( var key in response.interestRates ){
                var label = (key == 1 ? key + " month" :  key + " months" );
                $("#investPeriod").append("<option value='"+ response.interestRates[key] +"'>" + label + "</option>")
                interestRates.push(parseFloat(response.interestRates[key]));
            }
            return interestRates;
        },
        error: function (jqXHR, textStatus, errorThrown) {
            return ab.shared.showErrorMsg('Error: ' + errorThrown);
            $("#calculator-footer").slideUp();
        }
    });
}( window.ab = window.ab || {}, jQuery ));


$(function (ab, $) {
  /**
   * Exit this script if there is no bounding element found
   */
  if (!$('.access-calc .fixed-calculator-wrapper').length > 0) return;
  /**
   * Fields
   */
  var $applyButton  = $('.action-button button');
    ab.shared = {
        showErrorMsg: showErrorMsg
    };

  showHideResultsTable(false);

  $('#accessAccumulatorAmount').on('keyup', function () {

    var amount               = $("#accessAccumulatorAmount").val();
    var selectedInvestPeriod = $("#investPeriod").val();
      
    var parsedAmount = parseFloat(amount),
        regX = /^[1-9]\d*(\.\d{1,2})?\s*$/;
      
   if (isNullOrEmpty(amount) || _.isNaN(parsedAmount) || !regX.test(amount)) {
        showErrorMsg("Please specify a valid amount, eg: 500.00");
        $("#calculator-footer").slideUp();
        return;
    }

    if(amount == 0 || amount == ""){
      $("#calculator-footer").slideUp();
      return;
    }


    if (validateInputs() !== true) {
        return false;
    }

    setTimeout(function () {
      calculateInterest(amount, selectedInvestPeriod);
    }, 500);

  });

  $('#investPeriod').on('change', function () {

    var amount               = $("#accessAccumulatorAmount").val();
    var selectedInvestPeriod = $("#investPeriod").val();
      
      var parsedAmount = parseFloat(amount),
        regX = /^[1-9]\d*(\.\d{1,2})?\s*$/;
      
       if (isNullOrEmpty(amount) || _.isNaN(parsedAmount) || !regX.test(amount)) {
            showErrorMsg("Please specify a valid amount, eg: 500.00");
            $("#calculator-footer").slideUp();
            return;
        }

    calculateInterest(amount, selectedInvestPeriod);
  });

  $applyButton.on('click', function () {
    ab.utilities.scrollToElem('#call-to-action-investment')
  });

  function calculateInterest(amount, selectedInvestPeriod) {

    hideErrorMsg();

    if (validateInputs() !== true) {

      return false;
    }

    amount = typeof amount !== "number" ? parseFloat(amount) : amount;

    var accumulatedInterest = 0;
    var lastInterestRate;
    var interest;
    var accumulatedAmount   = amount;

    lastInterestRate    = selectedInvestPeriod;
    interest            = getInterest(accumulatedAmount, lastInterestRate);
    accumulatedAmount   = accumulatedAmount + interest;
    accumulatedInterest = accumulatedInterest + interest;

    var formattedInterest       = formatAsCurrencyStr(accumulatedInterest, "R");
    var investmentTotal         = formatAsCurrencyStr(accumulatedAmount, "R");
    var formattedOriginalAmount = formatAsCurrencyStr(amount, "R");

    lastInterestRate = parseFloat(lastInterestRate).toFixed(2) + '%';
    console.log(selectedInvestPeriod);
    $('#startInterestRate').html(interestRates[0] + '%');
    $("#lastInterestRate").html(lastInterestRate);
    $("#interestTotal").html(formattedInterest);
    $("#investmentTotal").html(investmentTotal);

    $("#accumulatorApplyLabel").html(formattedOriginalAmount);
    $("#accumulatorApplyPrefixLabel").html("Your Access Accumulator is&nbsp;");

    showHideResultsTable(true);
  }

  function validateInputs() {

    var amount = $("#accessAccumulatorAmount").val();
    if (isNaN(parseInt(amount)) && isNullOrEmpty(amount)) {
      showErrorMsg("Please specify a valid amount, eg: 500.00");
      return false;
    }

    if (parseInt(amount) <= 499) {
      showErrorMsg("Please specify an amount of R500 or more");
      return false;
    }

    if (amount == "0" || amount == "") {
      showHideResultsTable(false);
      return false;
    }
    return true;
  }

  function getInterest(amount, rate) {
    return amount * (rate / 12 / 100);
  }

  function isNullOrEmpty(val) {
    return isNullOrUndefined(val) || val.length == 0 || val === "";
  }

  function isNullOrUndefined(val) {
    return typeof val === "undefined" || val == null;
  }

  function showHideResultsTable(visible) {
    if (visible === true) {

      $(".investmentResultsTable").show();
      $("#calculator-footer").slideDown();
    }
    else {
      $(".investmentResultsTable").hide();
    }
  }

  function showErrorMsg(errorMsg) {
    $("#errorMsg").text(errorMsg).show();
  }

  function hideErrorMsg() {
    $("#errorMsg").hide();
  }

  /** Format numbers with commas - From: http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript */
  function formatAsCurrencyStr(x, currencySymbol) {
    //First round to a decimal:
    var num = Math.round(parseFloat(x) * 1000) / 1000;
    x       = num.toFixed(2);

    var parts  = x.toString().split(".");
    parts[0]   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var result = parts.join(".");

    if (!isNullOrEmpty(currencySymbol)) {
      result = currencySymbol + " " + result;
    }
    return result;
  }

  $('[data-toggle="tooltip"]').tooltip();

}(window.ab = window.ab || {}, jQuery));
