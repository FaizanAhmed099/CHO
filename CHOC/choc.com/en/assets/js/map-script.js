// JavaScript Document
function initMap() {

	var Riyadh = {
		info: '<h5 class="map-location-title"> Abdulmohsen Al Tamimi Contracting </h5>\r\
					<p>Prince Humud Ibn Abdulaziz across 10th Street Al Khobar City, Building No. 6971, Kingdom of Saudi Arabia</p>\r\
					<div class="map-details"><p><span class="tel">Telephone<br><a href="tel:966920003144">+966 92 000 3144</a></span></p>\r\
					<p><span class="mail">Email ID<br><a href="mailto:info@tamimi.com">info@tamimi.com</a></span></p></div>',
		lat: 26.2913085,
		long: 50.1972675
	};
	var Jeddah = {
		info: '<h5 class="map-location-title"> Abdulmohsen Al Tamimi Contracting </h5>\r\
					<p>Al Anoud center -Al oulaya Street. Al Mourouj District, 3rd floor, office number 19, Kingdom of Saudi Arabia</p>\r\
					<div class="map-details"><p><span class="tel">Telephone<br><a href="tel:966594507508">+966 59 450 7508</a></span></p>\r\
					<p><span class="mail">Email ID<br><a href="mailto:info@tamimi.com">info@tamimi.com</a></span></p></div>',
		lat: 24.7051847,
		long: 46.674148
	};
	
	var locations = [
      [Riyadh.info, Riyadh.lat, Riyadh.long, 0],
      [Jeddah.info, Jeddah.lat, Jeddah.long, 0],
    ];

	var map = new google.maps.Map(document.getElementById('map'), {
		zoom: 7,
		center: new google.maps.LatLng(25.43948,48.51440),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	var infowindow = new google.maps.InfoWindow({});
	
	var icon = {
		url: "images/inside-pages/tamimi-map.png", // url
		scaledSize: new google.maps.Size(27, 54) // scaled size
		//origin: new google.maps.Point(0,0), // origin
		//anchor: new google.maps.Point(0, 0) // anchor
	};

	var marker, i;

	for (i = 0; i < locations.length; i++) {
		marker = new google.maps.Marker({
			position: new google.maps.LatLng(locations[i][1], locations[i][2], locations[i][3], locations[i][4]),
			map: map,
			icon: icon
		});

		google.maps.event.addListener(marker, 'click', (function (marker, i) {
			return function () {
				infowindow.setContent(locations[i][0]);
				infowindow.open(map, marker);
			}
		})
		
		(marker, i));
		  var styles = [
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#444444"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#00243e"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "color": "#f2f2f2"
            }
        ]
    },
    {
        "featureType": "landscape.natural.landcover",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#f4f8fb"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "saturation": -100
            },
            {
                "lightness": 45
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#46bcec"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#cccccc"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#00243e"
            }
        ]
    }
];

        map.set('styles', styles);
		
	}
	
}
