$(function (ab, $) {
    /**
     * Exit this script if there is no bounding element found
     */
    if (!$('.fixed-calc .fixed-calculator-wrapper').length > 0) return;

    var $applyButton = $('.action-button button'),
        $fixedDepositAmount = $('#fixedDepositAmount'),
        $fixedDepositPeriod = $("#FixedDepositPeriod"),
        numberFormatOptions = {
            symbol: "R",
            decimal: ".",
            thousand: " ",
            precision: 2,
            format: "%s %v"
        };

    populateRateTable();

    $applyButton.on('click', function () {
        ab.utilities.scrollToElem('#call-to-action-investment')
    });

    $fixedDepositAmount.on('keyup', function () {
        setTimeout(function () {
            calculateInterest();
        }, 500);
    });

    $fixedDepositPeriod.on('change', function () {
        // var depositPeriod = $(this).find("option:selected").text();
        // $("#deposit-period").text(depositPeriod);
        calculateInterest();
    });

    $(".investmentResultTable").show();

    function populateRateTable() {
      lookupUrl = $("#loggedInContext").attr('href') + "/savings/fixed-deposit-rates";

      $.ajax({
          type: "GET",
          url: lookupUrl,
          crossDomain: true,
          success: function (response) {
            rates = cleanRates(response);
            printRates(rates);
          }
        });
    }

    function printRates(rates){

        $.each(rates, function(key){
          row = '<div class="col-xs-12"> ' +
                '<div class="rate-values">' +
                  '<div class="row">' +
                    '<div class="col-xs-12 col-sm-2">'+ key +' months</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ rates[key].minimumAmount +'</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ formatRate(rates[key].monthlyRate) +'</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ formatRate(rates[key].annualRate) + '</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ formatRate(rates[key].semiAnnualRate) +'</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ formatRate(rates[key].expiryRate) +'</div>' +
                  '</div>' +
                '</div>' +
              '</div> <div class="col-xs-12"><hr></div>';

          $(".rates-rows").append($(row));
        });
    }

    function formatRate(rateValue){
      return rateValue === "n.a." ? "n.a." : rateValue + "%";
    }

    function cleanRates(rates){
      // remove fields that are not applicable
      rates["3"].annualRate = "n.a.";
      rates["3"].semiAnnualRate = "n.a.";
      rates["6"].annualRate = "n.a.";

      // set minimumAmount
      rates["3"].minimumAmount = 'R500*';
      rates["6"].minimumAmount = 'R500**';
      rates["12"].minimumAmount = rates['24'].minimumAmount = rates['60'].minimumAmount = "R500";
      return rates;
    }

    function calculateInterest() {

      var depositPeriod = $("#FixedDepositPeriod option:selected").text();
      $("#deposit-period").text(depositPeriod);

        hideErrorMsg();

        var term = $fixedDepositPeriod.val();

        var amount = $("#fixedDepositAmount").val();

        if (isNullOrEmpty(amount) || !regX.test(amount)) {
        //if (isNullOrEmpty(amount)) {

            $("#calculator-footer").slideUp();

            showErrorMsg("Please specify a valid amount, eg: 500.00");

            toggleInterestTable(false);
            return;
        }

        if (parseInt(amount) < 500) {

            $("#calculator-footer").slideUp();
            showErrorMsg("Please specify an amount of R500 or more");
            toggleInterestTable(false);

            return;
        }

        var context = $("#loggedInContext").attr('href');
        var lookupUrl = context + "/savings/fixed-deposits/calculate?ajaxSource=true";
        var lookupData = "term=" + term + "&amount=" + amount;

        $.ajax({
            type: "GET",
            url: lookupUrl,
            crossDomain: true,
            data: lookupData,
            success: function (response) {
                if (response == null) {

                    $("#calculator-footer").slideUp();
                    showErrorMsg("An empty response was returned from the server. Please try again");
                    return false;
                }

                if (!isNullOrEmpty(response.errorMessage)) {

                    showErrorMsg(response.errorMessage);
                    return false;
                }

                return PopulateCalculateInterestResponse(response);
            },
            error: function (jqXHR, textStatus, errorThrown) {

                toggleInterestTable(false);
                return showErrorMsg('Error calculating interest: ' + errorThrown);
            }
        });
    }

    function PopulateCalculateInterestResponse(response) {

        //Show table
        toggleInterestTable(true);

        //Show/hide fields based on term, like hide semi-annual if less than 6 months.
        toggleFieldsForTerm($fixedDepositPeriod.val());

        //Update interest rates:
        calculatorUpdateInterestRates(response);

        //Update interest earned:
        calculatorUpdateInterestEarned(response);

        //Update totals:
        calculatorUpdateTotalEarned(response);

    }

    function toggleInterestTable(visible) {

        if (visible) {

            $("#calculator-footer").slideDown();
            //$(".table_area_fix > .investmentResultTable").show();
            $(".table_area_fix > .investmentResultTable").slideDown('slow');

        } else {

            //$(".table_area_fix > .investmentResultTable").hide();
            $(".table_area_fix > .investmentResultTable").slideUp('slow');
        }
    }

    function toggleFieldsForTerm(term) {

        if (isNullOrEmpty(term) || typeof term != "string") {

            return;
        }

        term = term.substring(1);

        var annualVisible = term > 6;

        var semiAnnualVisible = term > 3;

        if (annualVisible) {

            $(".annual").show();
            $(".annual").each(function () {
                $(this).removeAttr('style');
            });

        } else {

            $(".annual").hide();
        }

        if (semiAnnualVisible) {

            $(".semiAnnual").show();
            $(".semiAnnual").each(function () {

                $(this).removeAttr('style');
            });
        } else {

            $(".semiAnnual").hide();
        }
    }

    function calculatorUpdateInterestRates(response) {

        $("#monthlyInterestRate")
            .text(
            getDisplayFriendlyInterest(response.monthlyResult.interestRate));

        $("#semiAnnualInterestRate")
            .text(
            getDisplayFriendlyInterest(response.semiAnnualResult.interestRate));

        $("#annualInterestRate").text(
            getDisplayFriendlyInterest(response.annualResult.interestRate));

        $("#expiryInterestRate").text(
            getDisplayFriendlyInterest(response.expiryResult.interestRate));
    }

    function calculatorUpdateInterestEarned(response) {

        $("#monthlyIntEarned").text(
            formatAsCurrencyStr(response.monthlyResult.interestPaidOut));

        $("#semiAnnualIntEarned").text(
            formatAsCurrencyStr(response.semiAnnualResult.interestPaidOut));

        $("#annualIntEarned").text(
            formatAsCurrencyStr(response.annualResult.interestPaidOut));

        $("#expiryIntEarned").text(
            formatAsCurrencyStr(response.expiryResult.interestPaidOut));
    }

    function calculatorUpdateTotalEarned(response) {

        $("#monthlyTotalEarned")
            .text(
            formatAsCurrencyStr(response.monthlyResult.totalInterestOverPeriod));

        $("#semiAnnualTotalEarned")
            .text(
            formatAsCurrencyStr(response.semiAnnualResult.totalInterestOverPeriod));

        $("#annualTotalEarned")
            .text(
            formatAsCurrencyStr(response.annualResult.totalInterestOverPeriod));

        $("#expiryTotalEarned")
            .text(
            formatAsCurrencyStr(response.expiryResult.totalInterestOverPeriod));

    }

    function getDisplayFriendlyInterest(interest) {

        if (isNullOrEmpty(interest)) {
            return "";
        }

        if (isNaN(interest)) {
            return interest;
        }

        return (typeof interest == "number" ? interest : parseFloat(interest))
                .toFixed(2)
            + " %";
    }

    function showErrorMsg(errorMsg) {

        $("#errorMsg").text(errorMsg).show();
    }

    function hideErrorMsg() {
        $("#errorMsg").hide();
    }

    function isNullOrEmpty(str) {
        return isNullOrUndefined(str) || str.length == 0
            || (typeof str == "string" && str == "");
    }

    function isNullOrUndefined(obj) {
        return typeof obj == "undefined" || obj == null;
    }

    function formatAsCurrencyStr(num) {

        var isNull = isNullOrUndefined(num);

        var amt = !isNull
        && (typeof num == "number" || (typeof num == "string"
        && num.length > 0 && num.indexOf("R") == -1)) ? parseFloat(Math
                .round(num * 100) / 100)//.toFixed(2).toString()
            : num;

        if (!isNaN(amt)) {
            amt = accounting.formatMoney(amt, numberFormatOptions);
        }

        if (!isNullOrUndefined(amt) && amt.indexOf("R") == -1) {
            amt = "R " + amt;
        }

        return amt;
    }

    $('[data-toggle="tooltip"]').tooltip();
    

}(window.ab = window.ab || {}, jQuery));


//$(document).ready(function () {
///*
//
//    //console.log($('#fixedDeposit').offset().top);
//    //console.log($(document).scrollTop());
//
//    //console.log($('#fixedDeposit').pageYOffset());
//
//    if ($('#fixedDeposit').offset().top < $(document).scrollTop()) {
//        //console.log("overstepping top");
//
//
//    }
//*/
//
//});
