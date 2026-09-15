$(document).ready(function () {
    (function () {
        function sizeImages() {
            $(".slideimg").each(function () {
                var widthWindows = $(window).width();
                var heightWindows = $(window).height();

                var $img = $(this);
                var widthImage = $img.prop("naturalWidth");
                var heightImage = $img.prop("naturalHeight");
                var idImage = $(this).attr("id");

                console.log("Image width" + widthImage);
                console.log("Image height " + heightImage);
                console.log("Image  " + $(this).attr("id"));
                console.log("width windws  " + widthWindows);
                console.log("height windws   " + heightWindows);

                if (widthWindows > widthImage) {
                    console.log("background");
                    $(".img_slide_" + idImage).hide();
                    $(".item_original_" + idImage).attr("style", "background-image:url('" + $img.prop("src") + "')");
                } else {
                    console.log("image");
                    $(".img_slide_" + idImage).show();
                    $(".item_original_" + idImage).attr("style", "background-image:none");
                }

                if (heightImage < 250) {
                    $img.attr("style", "top:0; height:250px;");
                } else {
                    $img.attr("style", "top:-45%; height:none;");
                }
            });
        }

        sizeImages();

        $(window).resize(function () {
            sizeImages();
        });
    })();
});