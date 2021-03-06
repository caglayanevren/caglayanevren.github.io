"use strict";

var main = {
    init: function(){
        var $hamburger = $(".hamburger");
        $hamburger.on("click", () => $hamburger.toggleClass("is-active"));
    }
};


// Document.Ready
document.addEventListener("DOMContentLoaded", function() {
    main.init();
});

document.addEventListener('scroll', function () {
    if (pageYOffset > 76) {
        $(".index-header").addClass("back-gray");
    } else {
        $(".index-header").removeClass("back-gray");
    }
}, false);

$(document).on('click', 'a[href^="#"]', function (event) {
    
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);

    $('#mainNavbar').collapse('hide');

    $(".hamburger").toggleClass("is-active");

});