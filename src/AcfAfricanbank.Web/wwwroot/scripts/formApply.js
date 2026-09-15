/**
 * Call to action component
 */
$(document).ready(function () {
    $(function (ab, $) {
        /**
         * Exit this script if there is no #userDetailsForm on the page
         */

        /**
         * Variables State
         */

        $("#email").on('blur', function () {
            validateEmailInput();
        });
        /**
         * UI controls
         */
    }(window.ab = window.ab || {}, jQuery));
});

function validateEmail(email) {
    var emailReg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailReg.test(email);
}

function validateInputEmail() {
    if (validateEmail()) {
        $("#EmailContextInput").removeClass("haserror_input");
        $("#EmailContextInput").addClass("hascorrect_input");
        $("#email").removeClass("haserror_input");
        $("#email").addClass("hascorrect_input");
        $(".error_email").hide();
    } else {
        //  $userEmailError.slideDown();
        $("#EmailContextInput").removeClass("hascorrect_input");
        $("#EmailContextInput").addClass("haserror_input");
        $("#email").removeClass("hascorrect_input");
        $("#email").addClass("haserror_input");
        $(".error_email").show();
    }
}

function validateEmailInput() {
    if (validateEmail($("#email").val())) {
        $("#email").addClass("hascorrect_input");
        $(".error_email").hide();
    } else {
        $("#email").addClass("haserror_input");
        $(".error_email").show();
    }
}