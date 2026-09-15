var Video = (function () {

    //var videoPlayerControl = $("#video_player");
    //var videoControlsContainer = $('.container-video-controls');
    var play = true;
    var CLICK_EVENT = "click";
    var END_EVENT = "ended";
    var LOAD_EVENT = "load";

    /*
     * function: playVideo
     * params: video element and video control
     * description: plays video element and hide play icon
     */
    function playVideo(video, control) {
        if (video && control) {
            //Pause another videos
            pauseEachVideo(video);
            //Check if background poster exists
            var backImg = video.css('background-image');
            if (backImg) {
                video.css('background-image', 'none');
            }

            var videoElem = video.get(0);
            if (videoElem) {
                video.get(0).play();
                control.hide();
            }
        }
    }

    /*
     * function: pauseVideo
     * params: video element and video control
     * description: pause video element and show play icon
     */
    function pauseVideo(video, control) {
        if (video && control) {
            var videoElem = video.get(0);
            if (videoElem) {
                video.get(0).pause();
                control.show();
            }
        }
    }

    function pauseEachVideo(currentVideoElem) {
        $(".banner-video .media-video-player").each(function () {
            var videoElement = $(this);

            if (currentVideoElem.attr('id') != videoElement.attr('id')) {
                var controlElement = GetVideoControl($(this));
                pauseVideo(videoElement, controlElement);
            }

        });
    }


    /*
    * function: GetVideo
    * params: without parameters
    * description: gets video element
    */
    function GetVideo(currentElement) {
        if (currentElement) {
            var parentElem = currentElement.parent(".video-container");

            if (parentElem) {
                return parentElem.children(".media-video-player");
            }
        } else {
            var parentElem = $(".banner-video").find(".video-container");
            if (parentElem) {
                return parentElem.children(".media-video-player");
            }
        }
        return null;
    }

    /*
   * function: GetVideoControl
   * params: current element (normaly this)
   * description: gets current video control
   */
    function GetVideoControl(currentElement) {
        if (currentElement) {
            var parentElem = currentElement.parent(".video-container");
            if (parentElem) {
                return parentElem.children(".container-video-controls");
            }
        } else {
            var parentElem = $(".banner-video").find(".video-container");
            if (parentElem) {
                return parentElem.children(".container-video-controls");
            }
        }
        return null;
    }

    /*
    * function: ControlVideoPlayer
    * params: videocontroller
    * description: controls video player
    */
    function ControlVideoPlayer(videoElement) {
        var controlElement = GetVideoControl(videoElement);

        if (controlElement) {
            if (controlElement.is(':visible')) {
                playVideo(videoElement, controlElement);
            }
            else if (!controlElement.is(':visible')) {
                pauseVideo(videoElement, controlElement);
            }
        }
    }


    /*
     * function: init
     * params: without params
     * description: Video init properties
     */
    function init() {
        var video_index = 1;
        $(".banner-video").parents(".content-page-banner").css("height", "auto");

        //Default behaviour
        if (Common.isDevice()) {
            play = false;
        }

        $(".banner-video .media-video-player").each(function () {
            var videoElement = $(this);
            if (!videoElement.attr('id')) {
                videoElement.attr('id', 'video_player_' + video_index);
            }
            var controlElement = GetVideoControl($(this));

            if (!play) {
                pauseVideo(videoElement, controlElement);
            }
            else {
                if (video_index == 1) {
                    playVideo(videoElement, controlElement);
                }
                else {
                    pauseVideo(videoElement, controlElement);
                }
            }
            video_index++;
        });


        $(".banner-video .media-video-player").click(function () {
            ControlVideoPlayer($(this));
        });

        $(".banner-video .container-video-controls").on(CLICK_EVENT,
        function () {
            var videoElement = GetVideo($(this));
            ControlVideoPlayer(videoElement);
        });

        $(".banner-video .media-video-player").on(END_EVENT,
        function () {
            ControlVideoPlayer($(this));
        });
    }

    return {
        init: init
    };
}());