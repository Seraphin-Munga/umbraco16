(function($) {
    $(document).ready(function() {
        // Money formatting function
        $(document).on('input', '#amount', function() {
            let $input = $(this);
            let rawValue = $input.val().replace(/[^\d]/g, '');
            
            if (rawValue.length > 0) {
                let reversed = rawValue.split('').reverse().join('');
                let chunks = reversed.match(/.{1,3}/g) || [];
                let formatted = chunks.join(' ').split('').reverse().join('');
                $input.val(formatted);
            } else {
                $input.val('');
            }
            calculateFinance();
        });

        // Calculator logic
        const COST_PER_MONTH = 0.0185;
        let selectedTerm = 6;

        // Term selection
        $('.term-btn').click(function() {
            $('.term-btn').removeClass('selected btn-success').addClass('btn-default');
            $(this).addClass('selected btn-success');
            selectedTerm = parseInt($(this).data('term'));
            calculateFinance();
        });

        function calculateFinance() {
            // Get raw numeric value without spaces
            const amountValue = $('#amount').val().replace(/ /g, '');
            const amount = parseFloat(amountValue) || 0;

            if (amount >= 20000 && amount <= 5000000) {
                const costOfFinance = amount * COST_PER_MONTH * selectedTerm;
                const totalRepayment = amount + costOfFinance;
                const monthlyRepayment = totalRepayment / selectedTerm;

                // Update correct element IDs with "-1" suffix
                $('#cost-of-finance').text(`R${costOfFinance.toFixed(2)}`);
                $('#total-repayment').text(`R${totalRepayment.toFixed(2)}`);
                $('#monthly-repayment').text(`R${monthlyRepayment.toFixed(2)}`);
            } else {
                $('#cost-of-finance, #total-repayment, #monthly-repayment').text('R0');
            }
        }
    });
})(jQuery.noConflict());
                        