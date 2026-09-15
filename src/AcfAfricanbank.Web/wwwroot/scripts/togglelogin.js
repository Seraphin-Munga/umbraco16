        function toggleTab(tabIndex) {
            $('.nav-modal-tab').removeClass('active');
            $('.nav-modal-tab-content').removeClass('active');

            $('.nav-modal-tab').eq(tabIndex).addClass('active');
            $('.nav-modal-tab-content').eq(tabIndex).addClass('active');
        }


                        