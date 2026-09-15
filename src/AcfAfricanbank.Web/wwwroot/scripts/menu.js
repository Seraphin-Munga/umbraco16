$(document).ready(function () {
    (function () {
        var minWidthMenu = 767;
        var velocity = "speed";
        var OPEN = "open";
        var clickSelector = ".no_link";
        var id_menu = "";
        var CLICK_EVENT = "click";
        var MENU_MD = "MenuMD";
        var MENU_MD_MOBILE = "MenuMDMobile";
        var NAV_BAR_TOGGLE = ".navbar-toggle";
        var windows_width = $(window).width();
        /*
         * function: getId
         * params: _id
         * description: return string id
         */
        function getId(_id) {
            return "#" + _id
        }

        /*
         * function: addClassOpen
         * params: _id
         * description: add class open to selections
         */
        function addClassOpen(_id) {
            $(getId(_id)).addClass(OPEN);
        }

        /*
         * function: removeClassOpen
         * params: _id
         * description: remove class open to selections
         */
        function removeClassOpen(_id) {
            $(getId(_id)).removeClass(OPEN);
        }

        /*
        * function: openMenu
        * params: _id
        * description: should close all menus and open the selected
        */
        function openMenu(_id) {
            $(".submenulogin").slideUp();
            $(".btn-login").css("background-color", "#89BC47");
            $(".submenulogin").removeClass("active_menu");
            $.when(closeAllMenu(getAllIdsWithoutTheSelected(_id))).done(function () {
                $(getId(_id)).slideDown(velocity, function () {
                    addClassOpen(this.id);
                    closeAllMenu(getAllIdsWithoutTheSelected(_id));
                });
            });
        }

        /*
        * function: closeMenu
        * params: _id
        * description: should close the selected menu
        */
        function closeMenu(_id) {
            $(getId(_id)).slideUp(velocity, function () {
                removeClassOpen(this.id);
                closeAllMenu(getAllIdsWithoutTheSelected(_id));
            });
        }

        /*
        * function: closeAllMenu
        * params: _ids
        * description: Should close the menus of the corresponding ids
        */
        function closeAllMenu(_ids) {
            return $(_ids).slideUp(velocity, function () {
                removeClassOpen(this.id);
            });
        }

        /*
        * function: getAllIdsWithoutTheSelected
        * params: _ids
        * description: return the list of ids without the selected
        */
        function getAllIdsWithoutTheSelected(_id) {
            var elements = [];
            var selector = "[id$=MenuMD]";
            if ($(window).width() < 767) {
                selector = "[id$=MenuMDMobile]";
            }
            // verify if another solution exist without the each function
            $(selector).each(function () {
                if (_id !== this.id) {
                    elements.push("#" + this.id);
                }
            });
            return elements.toString();
        }

        /*
        * function: toogle
        * params: _id
        * description: Close or open the menu depending on status
       */
        function toogle(_id) {
            if ($(getId(_id)).hasClass(OPEN)) {
                closeMenu(_id);
                return;
            }
            openMenu(_id);
        }

        /*
        * function: onClickSectionMenu
        * params: event
        * description: on click section menu
       */
        function onClickSectionMenu(event) {
            event.preventDefault();
            var _id = event.currentTarget.id;
            var href = $(getId(_id)).attr("href");
            var menuMD = MENU_MD;
            if ($(window).width() < minWidthMenu) {
                menuMD = MENU_MD_MOBILE;
            }
            if (href == "#") {
                var _id = event.currentTarget.id + menuMD;
                toogle(_id);
            }
        }
        $(clickSelector).on(CLICK_EVENT, onClickSectionMenu);

        /*
        * function: onClickSearchIcon
        * params: event
        * description: on click search icon
        */
        function onClickSearchIcon(event) {
            event.preventDefault();
            if ($(window).width() < minWidthMenu) {
                //if ($(NAV_BAR_TOGGLE).attr("aria-expanded") !== "false") {
                //    $(NAV_BAR_TOGGLE).trigger(CLICK_EVENT);
                //}
            } else {
                $(".menu_md").slideUp(velocity);
            }

            $(".submenulogin").slideUp();
            $(".submenulogin").removeClass("active_menu");
            $(".btn-login").css("background-color", "#89BC47");
        }

        function onclickNav(event) {
            event.preventDefault();
            $(".menu_login_mobile").slideUp();
            $(".menu_login_mobile").removeClass("active_menu");
            $(".barra_menu_mobile").toggle();
            
        }

        $(NAV_BAR_TOGGLE).on(CLICK_EVENT, onclickNav);
        $(".search-icon").on(CLICK_EVENT, onClickSearchIcon);
        function closemenu(event) {
            if ($(window).width() > minWidthMenu) {
                $(".menu_md").slideUp();
                $(".menu_md").removeClass("open");;
            }

            $(".submenulogin").slideUp();
            $(".submenulogin").removeClass("active_menu");
            $(".btn-login").css("background-color", "#89BC47");
        }

        function closemenuLogin(event) {
            if ($(window).width() > 767) {
                $(".menu_desktop_row").click(function () {
                    $(".submenulogin").slideUp();
                    $(".submenulogin").removeClass("active_menu");
                    $(".btn-login").css("background-color", "#89BC47");
                }).children().click(function (e) {
                    if ($(e.target).is('a') || $(e.target).parent().is('a')) {
                        return true;
                    } else
                    {
                        return false;
                    }
                });
            } else {
            }
        }

        $(".content").on(CLICK_EVENT, closemenu);
        $(".homepage").on(CLICK_EVENT, closemenu);
        $(".menu_desktop_row").on(CLICK_EVENT, closemenuLogin);

        $("#applicationsWidget").on(CLICK_EVENT, closemenu);
        function submenulogin() {
            if ($(".menu_second_home").hasClass(OPEN)) {
                $(".menu_second_home").slideUp(velocity, function () {
                    $(".menu_second_home").removeClass("open");
                });
            }

            if ($(window).width() < minWidthMenu) {
                if ($(NAV_BAR_TOGGLE).attr("aria-expanded") !== "false") {
                    $(NAV_BAR_TOGGLE).trigger(CLICK_EVENT);
                }
            } else {
                $(".menu_md").slideUp(velocity);
            }

            if ($(".submenulogin").hasClass("active_menu")) {
                $(".submenulogin").slideUp(velocity, function () {
                    $(".submenulogin").removeClass("active_menu");
                    $(".btn-login").css("background-color", "#89BC47");
                });
                return;
            }

            $(".btn-login").css("background-color", "#4c6a8f");
            $(".submenulogin").slideDown(velocity, function () {
                $(".submenulogin").addClass("active_menu");
            });
        }

        $(".btn-login").click(function () {
            submenulogin();
        });

        $(".navbar-toggle").click(function () {
            $(".submenulogin").slideUp();
            $(".submenulogin").removeClass("active_menu");
        });

        $(".user-loggedin-icon").click(function () {
            submenulogin();
        });

        $(".user-loggedin-icon_mobile").click(function () {
            if ($(".menu_login_mobile").hasClass("active_menu")) {
                $(".menu_login_mobile").slideUp();
                $(".menu_login_mobile").removeClass("active_menu");
            } else {
                $(".menu_login_mobile").slideDown();
                $(".menu_login_mobile").addClass("active_menu");
            }
        });

        $(window).resize(function () {
            if ($(window).width() > 767 && windows_width < 767) {
                $(".submenulogin").slideUp();
                $(".submenulogin").removeClass("active_menu");
                $(".btn-login").css("background-color", "#89BC47");
                $(".menu_login_mobile").hide();
                $(".barra_menu_mobile").hide();
                $('.navbar-collapse').collapse('hide');
            }

            windows_width = $(window).width();
        });
    })();
});