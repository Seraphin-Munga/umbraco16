/***----------------------------------------------------------------->
     /**----------------------------------------------------------------->
     /**----------------------------------------------------------------->
     * Wizard Steps Component
     *
     */
    $(function (ab, $) {

        // Exit this script if there is no #wizardSteps
        // on the page
        if (!$('#wizardSteps').length > 0) return;

        // Exposed API
        ab.wizardSteps = {
            addStepTitles: addStepTitles,
            errorStep: errorStep,
            setStepBlue: setStepBlue,
            setStep: setStep,
            nextStep: nextStep,
            prevStep: prevStep,
            reset: reset
        };

        // Cache $ elements and literals
        var $wizardSteps = $('#wizardSteps'),
            $stepsContainer = $wizardSteps.find('.wizard-steps'),
            nTotalSteps = $stepsContainer.find('.step-title').length,
            bSetBlueStep = false,
            nStepError = 0,
            nCurrentStep = 1;

        /**----------------------------------------------------------------->
         * Initialise component and render the UI's
         * state view
         */
        function renderView() {

            // Reset the view to its default state
            resetUI();

            // literals
            var i;

            // Add step circles to the DOM
            // with css 'left' positioning - provided
            // by cssPositioning() to the circles, as well
            // as the titles
            for (i = 0; i < nTotalSteps; i++) {

                $stepsContainer
                    .append($('<div class="step-circle"></div>')
                        .css(cssPositioning(nTotalSteps, i)));

                $stepsContainer
                    .find('.step-title')
                    .eq(i)
                    .css(cssPositioning(nTotalSteps, i));
            }

            // Return an object for use in $.css()
            function cssPositioning(nTotalSteps, nCurrentStep) {
                return {
                    'left': Math.round(100 / (nTotalSteps - 1)) * (nCurrentStep) + '%'
                }
            }

            // Make step circles and titles up to and
            // including nCurrentStep all green in color
            for (i = 0; i < nCurrentStep; i++) {

                if (bSetBlueStep) {

                    if (i === nCurrentStep - 1) {

                        $stepsContainer
                            .find('.step-circle')
                            .eq(i)
                            .addClass('step-circle-blue');

                        $stepsContainer
                            .find('.step-title')
                            .eq(i)
                            .addClass('active-step-title-blue');

                    } else {

                        $stepsContainer
                            .find('.step-circle')
                            .eq(i)
                            .addClass('step-circle-green');

                        $stepsContainer
                            .find('.step-title')
                            .eq(i)
                            .addClass('active-step-title-green');
                    }

                    // progress bar width
                    $stepsContainer
                        .find('.step-line-blue')
                        .css({
                            'width': Math.round(100 / (nTotalSteps - 1)) * (nCurrentStep - 1) + '%'
                        });

                    // progress bar width
                    $stepsContainer
                        .find('.step-line-green')
                        .css({
                            'width': Math.round(100 / (nTotalSteps - 1)) * (nCurrentStep - 2) + '%'
                        });

                    $('.step-xs-view .step-circle')
                        .removeClass('step-circle-blue step-circle-green step-circle-red')
                        .addClass('step-circle-blue');
                    $('.step-xs-view .step-title')
                        .removeClass('active-step-title-blue active-step-title-green active-step-title-red')
                        .addClass('active-step-title-blue');

                } else {

                    $stepsContainer
                        .find('.step-circle')
                        .eq(i)
                        .addClass('step-circle-green');

                    $stepsContainer
                        .find('.step-title')
                        .eq(i)
                        .addClass('active-step-title-green');

                    $('.step-xs-view .step-circle')
                        .removeClass('step-circle-blue step-circle-green step-circle-red')
                        .addClass('step-circle-green');
                    $('.step-xs-view .step-title')
                        .removeClass('active-step-title-blue active-step-title-green active-step-title-red')
                        .addClass('active-step-title-green');

                    // progress bar width
                    $stepsContainer
                        .find('.step-line-green')
                        .css({
                            'width': Math.round(100 / (nTotalSteps - 1)) * (nCurrentStep - 1) + '%'
                        });
                }

                if ($('.step-xs-view .step-circle').length > 1) {
                    $('.step-xs-view .step-circle').eq(1).remove();
                }
            }

            /**
             * Update UI to reflect an ERROR step
             */
            if (nStepError > 0) {

                // Error step red circle
                $stepsContainer
                    .find('.step-circle')
                    .eq(nStepError - 1)
                    .addClass('step-circle-red');

                $stepsContainer
                    .find('.step-title')
                    .eq(i)
                    .addClass('error-step-title');

                $('.step-xs-view .step-circle').addClass('step-circle-red');
                $('.step-xs-view .step-title').addClass('error-step-title');

                // Red progress bar width
                $stepsContainer
                    .find('.step-line-red')
                    .css({
                        'width': Math.round(100 / (nTotalSteps - 1)) * (nStepError === 0 ? nStepError : nStepError - 1) + '%'
                    });
            }

            // Update the text for the current step
            // in XS view
            updateCurrentStepTitle(nCurrentStep);



            updateTitles();

        }

        $(window).resize(function (){
            updateTitles();
        });

        $(window).ready(function () {
            updateTitles();
        });

        function updateTitles () {
            if ( $(window).outerWidth() < 769 ) {

                $('.wizard-steps .step-title').css({
                    'visibility': 'hidden'
                });

                $('.wizard-steps .step-title.active-step-title-green').last().css({
                    'visibility': 'visible'
                });

            } else {

                $('.wizard-steps .step-title').css({
                    'visibility': 'visible'
                });

                $('.wizard-steps .step-title.active-step-title-green').last().css({
                    'visibility': 'visible'
                });
            }
        }

        renderView();

        /**
         * Reset the UI
         */
        function resetUI() {

            // Remove all circles
            $stepsContainer.find('.step-circle').remove();

            // Reset colors for all titles
            $stepsContainer
                .find('.step-title')
                .removeClass('active-step-title-green active-step-title-blue error-step-title');

            // Reset the XS view circle and title colors
            $('.step-xs-view .step-circle').removeClass('step-circle-red step-circle-blue step-circle-green');
            $('.step-xs-view .step-title').removeClass('error-step-title');
        }

        /**
         * Show only the current step in the sequence
         * @ XS view - hide previous and next steps
         *
         * @param {number} nStep
         */
        function updateCurrentStepTitle(nStep) {

            // Decrement by one because $() returns a
            // zero-based array
            var nTempStep = nStep - 1;

            // get the text from the current step
            var sTitle = $wizardSteps.find('.step-title').eq(nTempStep).text();

            // and copy it to the XS display version
            $('.step-xs-view .step-title').text(sTitle);
        }

        /**
         * Add the titles to the widget's view
         *
         * @param arrStepTitles
         */
        function addStepTitles(arrStepTitles) {

            $stepsContainer.find('.step-title').remove();
            $stepsContainer.find('.step-circle').remove();

            nTotalSteps = arrStepTitles;
            nStepError = 0;
            nCurrentStep = 1;

            for (var i = 0; i < arrStepTitles.length; i++) {

                $stepsContainer
                    .append($('<div class="step-title">' + arrStepTitles[i] + '</div>'));
            }

            renderView();
        }

        /**----------------------------------------------------------------->
         * Add a warning response UI update
         * by making the desired step's circle and title red in hue
         *
         * @param nError
         */
        function errorStep(nError) {

            nStepError = nError;

            renderView();
        }

        /**
         * Go to any arbitrary step in sequence
         *
         * @param nStep
         */
        function setStep(nStep) {

            bSetBlueStep = false;

            nCurrentStep = nStep;
            nStepError = 0;

            renderView();
        }

        /**
         * Go to any arbitrary step in sequence
         * however the progress bar will display as blue
         * instead of green
         *
         * @param nStep
         */
        function setStepBlue(nStep) {

            bSetBlueStep = true;

            nCurrentStep = nStep;
            nStepError = 0;

            renderView();
        }

        /**
         * Go to next step in sequence
         */
        function nextStep() {

            nCurrentStep++;
            nStepError = 0;

            renderView();
        }

        /**
         * Go to previous step in sequence
         */
        function prevStep() {

            nCurrentStep--;
            nStepError = 0;

            renderView();
        }

        /**
         * Reset the counters
         */
        function reset() {

            nCurrentStep = 1;
            nStepError = 0;

            renderView();
        }

    }(window.ab = window.ab || {}, jQuery));

