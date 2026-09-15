var ProductsMenu = (function () {
    var obj = {};
    var selectedProductId = '';

    obj.init = function () {
        $('.product_box').click(selectProduct);

        // Set the id to the initially selected product.
        selectedProductId = $('.product_box.active').attr('id');
    }

    var selectProduct = function () {
        // Remove active from previously selected item.
        $('#' + selectedProductId).removeClass('active');
        // Change the selected item id.
        selectedProductId = $(this).attr('id');
        // Add active to the newly selected item.
        $('#' + selectedProductId).addClass('active');

        // TODO: Load form according to selected product.
    }

    return obj;
}());

$(function () {
    ProductsMenu.init();
});