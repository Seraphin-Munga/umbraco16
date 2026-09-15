$(function (ab, $) {

    /**
     * Exit this script if there is no bounding element found
     */
    if (!$('.tax-free-calc .fixed-calculator-wrapper').length > 0) return;

    /**
     * Fields
     */
    var $applyButton = $('.action-button button'),
        $taxFreeAmount = $('#taxfreeAmount'),
        $taxFreePeriod = $('#taxfreePeriod'),
        numberFormatOptions = {
            symbol: "R",
            decimal: ".",
            thousand: " ",
            precision: 2,
            format: "%s %v"
        };

    $applyButton.on('click', function () {
        ab.utilities.scrollToElem('#call-to-action-investment')
    });

    $taxFreeAmount.on('keyup', function () {

        setTimeout(function () {
            calculateInvestment();
        }, 500);
    });
    
    /*$taxFreeAmount.on('change', function () {
        calculateInvestment();
    });*/


    $taxFreePeriod.on('change', function() {
        if($taxFreeAmount.val()) {
            setTimeout(function () {
                calculateInvestment();
            }, 500);
        }
    });

    var detailedRatesLookupUrl = $("#contextPath").attr("href") + "/savings/tax-free-investment-rates";

    $.ajax({
        type: "GET",
        url: detailedRatesLookupUrl,
        crossDomain: true,
        success: function (response) {
          printRates(response);
        }
      });


      function printRates(rates){
          row = '<div class="col-xs-12"> ' +
                '<div class="rate-values">' +
                  '<div class="row">' +
                    '<div class="col-xs-12 col-sm-2">12 months</div>' +
                    '<div class="col-xs-12 col-sm-2">R500</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ rates.monthlyRate +'%</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ rates.annualRate +'%</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ rates.semiAnnualRate +'%</div>' +
                    '<div class="col-xs-12 col-sm-2">'+ rates.expiryRate +'%</div>' +
                  '</div>' +
                '</div>' +
              '</div> <div class="col-xs-12"><hr></div>';
          $(".rates-rows").append($(row));
      }


    function calculateInvestment() {

        hideErrorMsg();

        var term = 12;

        var amount = $("#taxfreeAmount").val();

        var frequency = $("#taxfreePeriod").val();
        
        var regX = /^[1-9]\d*(\.\d{1,2})?\s*$/;

        if (isNullOrEmpty(amount) || !regX.test(amount)) {

            $("#calculator-footer").slideUp();

            showErrorMsg("Please specify a valid amount, eg: 500.00");

            toggleInterestTable(false);
            return;
        }

        if (parseFloat(amount) < 500.00) {

            $("#calculator-footer").slideUp();
            showErrorMsg("Please specify an amount of R500.00 or more");
            toggleInterestTable(false);

            return;
        }

        if (frequency === "Monthly" && parseFloat(amount) > 2500.00){
            $("#calculator-footer").slideUp();
            showErrorMsg("Please specify an amount of R2,500.00 or less");
            toggleInterestTable(false);
            return;
        }

        if (frequency === "OnceOff" && parseFloat(amount) > 30000.00){
            $("#calculator-footer").slideUp();
            showErrorMsg("Please specify an amount of R30,000.00 or less");
            toggleInterestTable(false);
            return;
        }

        var contextPath = $("#contextPath").attr("href");
        var lookupUrl = contextPath + "/savings/tax-free-investment/calculate?ajaxSource=true";
        var lookupData = "term=" + term + "&amount=" + amount + "&frequency=" + frequency;
        
        $.ajax({
            type: "GET",
            url: lookupUrl,
            crossDomain: true,
            data: lookupData,
            success: function (response) {
                console.log(response);
                if (response == null) {

                    $("#calculator-footer").slideUp();
                    showErrorMsg("An empty response was returned from the server. Please try again");
                    return false;
                }

                if (!isNullOrEmpty(response.errorMessage)) {

                    showErrorMsg(response.errorMessage);
                    return false;
                }

                return PopulateCalculateInvestResponse(response);
            },
            error: function (jqXHR, textStatus, errorThrown) {

                toggleInterestTable(false);
                return showErrorMsg('Error calculating interest: ' + errorThrown);
            }
        });
    }

    function PopulateCalculateInvestResponse(response) {

        //Show table
        toggleInterestTable(true);

        //Show/hide fields based on term, like hide semi-annual if less than 6 months.
        //toggleFieldsForTerm($("#FixedDepositPeriod").val());
        
        //Update interest rates:
        calculatorUpdateInvestRates(response);

        //Update interest earned:
        calculatorUpdateInvestEarned(response);

        //Update totals:
        calculatorUpdateInvestTotal(response);

    }

    function toggleInterestTable(visible) {

        if (visible) {

            $("#calculator-footer").slideDown();
            $(".table_area_fix > .investmentResultTable").show();
            $(".table_area_fix > .investmentResultsTable").slideDown('slow');

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

    function calculatorUpdateInvestRates(response) {

        $("#monthlyRate")
            .text(
            getDisplayFriendlyInterest(response.sixMonthsResult.interestRate));

        $("#semiRate")
            .text(
            getDisplayFriendlyInterest(response.twelveMonthResult.interestRate));

        $("#annualRate").text(
            getDisplayFriendlyInterest(response.twentyFourMonthsResult.interestRate));

        $("#expiryRate").text(
            getDisplayFriendlyInterest(response.thirtySixMonthsResult.interestRate));
    }

    function calculatorUpdateInvestEarned(response) {

        $("#monthlyEarned").text(
            formatAsCurrencyStr(response.sixMonthsResult.interestEarned));

        $("#semiEarned").text(
            formatAsCurrencyStr(response.twelveMonthResult.interestEarned));

        $("#annualEarned").text(
            formatAsCurrencyStr(response.twentyFourMonthsResult.interestEarned));

        $("#expiryEarned").text(
            formatAsCurrencyStr(response.thirtySixMonthsResult.interestEarned));
    }

    function calculatorUpdateInvestTotal(response) {

        $("#monthlyTotal")
            .text(formatAsCurrencyStr(response.sixMonthsResult.investmentValue));

        $("#semiTotal")
            .text(formatAsCurrencyStr(response.twelveMonthResult.investmentValue));

        $("#annualTotal")
            .text(formatAsCurrencyStr(response.twentyFourMonthsResult.investmentValue));

        $("#expiryTotal")
            .text(formatAsCurrencyStr(response.thirtySixMonthsResult.investmentValue));

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