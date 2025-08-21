$(window).ready(function() { // makes sure the whole site is loaded
$('.preloadcss').delay(500).fadeOut('slow'); 
$('.content-body').delay(400).fadeIn('slow'); 
});
//SIDE MENU STICKY JS STARTS
if ($('#sidebar').length > 0) {
$(document).ready(function(){	
	 var sidebar = new StickySidebar('#sidebar', {
        containerSelector: '.main-content',
        innerWrapperSelector: '.sidebar__inner',
        topSpacing: 100,
        bottomSpacing: 20,
		resizeSensor: true,
    });
});
}
//SIDE MENU STICKY JS ENDS
(function ($) {
  $(document).ready(function () {
    "use strict";


    /* MENU TOGGLE */
    $('.side-widget .site-menu ul li i').on('click', function (e) {
      $(this).parent().children('.side-widget .site-menu ul li ul').toggle();
      return true;
    });


    // TAB
    $(".tab-nav li").on('click', function (e) {
      $(".tab-item").hide();
      $(".tab-nav li").removeClass('active');
      $(this).addClass("active");
      var selected_tab = $(this).find("a").attr("href");
      $(selected_tab).stop().show();
      return false;
    });


    // SEARCH BOX
    $('.navbar .search').on('click', function (e) {
      $(this).toggleClass('open');
      $(".search-box").toggleClass('active');
      $("body").toggleClass("overflow");
    });


    // HAMBURGER MENU
    $('.hamburger').on('click', function (e) {solut
      $(this).toggleClass('open');
      $(".side-widget").toggleClass('active');p
      $("body").toggleClass("overflow");
    });


    // SCROLL TOP
    $('.scroll-top').on('click', function (e) {
      $("html, body").animate({
        scrollTop: 0
      }, 600);
      return false;
    });

// PRE lOADER ANIMATION
	//  if ($('#loader-animation').length) { //arkaz-svg-loader-logo
	// 	$('#loader-animation').attr('class','active');
	// }


    // LOGO HOVER
    $(".logo-item").hover(function () {
        $('.logo-item').not(this).css({
          "opacity": "0.3"
        });
      },
      function () {
        $('.logo-item').not(this).css({
          "opacity": "1"
        });
      });
  });

		if ($('#pattern-animation-ov').length) { //arkaz-svg
			
			$(window).scroll(function() {
			
				var pageYOffset = window.pageYOffset;

				var headerHeight = $('.navik-header').innerHeight();
				var homeStop = $(".pattern-animation-section").offset().top - 600;
				console.log(headerHeight);
				if (pageYOffset >= homeStop) {
					
					$('#pattern-animation-ov').attr('class','active');
				} else {
					$('#pattern-animation-ov').attr('class','');
				}

			});
		}

	
		if ($('#pattern-anim').length) { //arkaz-svg-loader-logo
		$('#pattern-anim').attr('class','active');
	}
	
			if ($('#text-animation-square').length) { //arkaz-svg-loader-logo
		$('#text-animation-square').attr('class','active');
	}
	
		//script for onclick event of the homepage scroll animated icon
    $('.icon-scroll').click(function() {
		//console.log('tess');
		//var header_height = $('#noga-header').height();
        $('html, body').animate({
            scrollTop: ($(".partners").offset().top)
        }, 100);
    });
	

  if ($(".slider-main")[0]) {
    mainslider.controller.control = slidercontent;
    slidercontent.controller.control = mainslider;
  } else {}


  // DATA BACKGROUND IMAGE
  var pageSection = $("*");
  pageSection.each(function (indx) {
    if ($(this).attr("data-background")) {
      $(this).css("background", "url(" + $(this).data("background") + ")");
    }
  });

  // DATA BACKGROUND COLOR
  var pageSection = $("*");
  pageSection.each(function (indx) {
    if ($(this).attr("data-background")) {
      $(this).css("background", $(this).data("background"));
    }
  });


  // COUNTER
  $(document).scroll(function () {
    $('.odometer').each(function () {
      var parent_section_postion = $(this).closest('section').position();
      var parent_section_top = parent_section_postion.top;
      if ($(document).scrollTop() > parent_section_top - 1100) {
        if ($(this).data('status') == 'yes') {
          $(this).html($(this).data('count'));
          $(this).data('status', 'no');
        }
      }
    });
  });

  // STICKY NAVBAR
  $(window).on("scroll touchmove", function () {
    $('.navbar').toggleClass('sticky', $(document).scrollTop() > 0);

  });

  // STICKY UP DOWN
  var didScroll;
  var lastScrollTop = 0;
  var delta = 0;
  var navbarHeight = $('.navbar').outerHeight();

  $(window).scroll(function (event) {
    didScroll = true;
  });

  setInterval(function () {
    if (didScroll) {
      hasScrolled();
      didScroll = true;
    }
  }, 0);

  function hasScrolled() {
    var st = $(this).scrollTop();

    // Make sure they scroll more than delta
    if (Math.abs(lastScrollTop - st) <= delta)
      return;

    // If they scrolled down and are past the navbar, add class .nav-up.
    // This is necessary so you never see what is "behind" the navbar.
    if (st > lastScrollTop && st > navbarHeight) {
      // Scroll Down
      $('.navbar').removeClass('nav-down').addClass('nav-up');
    } else {
      // Scroll Up
      if (st + $(window).height() < $(document).height()) {
        $('.navbar').removeClass('nav-up').addClass('nav-down');
      }
    }

    lastScrollTop = st;
  };

  // FORM CALCULATOR
  $(".form").change(function () {
    var totalPrice = parseFloat($('#value1').val()) + parseFloat($('#value2').val()) + parseFloat($('#value3').val()) + parseFloat($('#value4').val()),
      values = [];

    $('input[type=checkbox], input[type=radio]').each(function () {
      if ($(this).is(':checked')) {
        values.push($(this).val());
        totalPrice += parseInt($(this).val());
      }
    });

    $("#result").text(totalPrice);


  });

  $(".form").change(function () {
    total = 0;
    totalPrice();
  }).trigger("change");
	
	$(window).load(function() {
		setNavHeight();
	});
	$(window).resize(function() {
		setNavHeight();
	});
	
	function setNavHeight() {
		var w = $(window),
			h_4 = w.height() / 4;
			w_height = w.height() - h_4;
		
		$('#mry-dynamic-menu').css({
			'margin-top': h_4 + 'px',
			'height': w_height + 'px',
			'overflow': 'auto'
		})
	}

})(jQuery);




// Counter Number

