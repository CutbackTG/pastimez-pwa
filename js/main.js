@ -1,29 +1,29 @@
/*jslint browser, for */
/*global google, bootstrap */
/*global google, bootstrap, console */

(function () {
    "use strict";

    // Constants
    var MAX_DISCOVER = 12,
        INTERESTS = [
            "Creative",
            "Tech",
            "Physical",
            "Social",
            "Nature",
            "Relaxing"
        ],
        BASE_PURPLE = "#6a1b9a",
        GOOGLE_MAPS_API_KEY = "AIzaSyC_BOqOK7jLCjPYx5Me_p1rCxQZtFHDNPw";
    var MAX_DISCOVER = 12;
    var INTERESTS = [
        "Creative",
        "Tech",
        "Physical",
        "Social",
        "Nature",
        "Relaxing"
    ];
    var BASE_PURPLE = "#6a1b9a";
    var GOOGLE_MAPS_API_KEY = "AIzaSyC_BOqOK7jLCjPYx5Me_p1rCxQZtFHDNPw";

    // Globals
    var map,
        userLocation,
        markers = [],
        userMarker = null,
        activeInfoWindow = null,
        discoverResults = [];
    var map;
    var userLocation;
    var markers = [];
    var userMarker = null;
    var activeInfoWindow = null;
    var discoverResults = [];

    // Utilities
    function clearMarkers() {
@ -39,20 +39,20 @@
    }

    function lightenHexColor(hex, factor) {
        var r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16),
            nr = Math.min(255, Math.floor(r + (255 - r) * factor)),
            ng = Math.min(255, Math.floor(g + (255 - g) * factor)),
            nb = Math.min(255, Math.floor(b + (255 - b) * factor));
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var nr = Math.min(255, Math.floor(r + (255 - r) * factor));
        var ng = Math.min(255, Math.floor(g + (255 - g) * factor));
        var nb = Math.min(255, Math.floor(b + (255 - b) * factor));
        return "rgb(" + nr + ", " + ng + ", " + nb + ")";
    }

    function styleAccordionItem(item, bgColor, textColor) {
        var button = item.querySelector(".accordion-button"),
            body = item.querySelector(".accordion-body"),
            label,
            input;
        var button = item.querySelector(".accordion-button");
        var body = item.querySelector(".accordion-body");
        var label;
        var input;

        if (button) {
            button.style.backgroundColor = bgColor;
@ -94,8 +94,10 @@

    // Discover Helpers
    function mapPlaceToTags(place) {
        var text = (place.name + " " + (place.types || []).join(" ")).toLowerCase(),
            tags = [];
        var text = (
            place.name + " " + (place.types || []).join(" ")
        ).toLowerCase();
        var tags = [];

        function match(regex, tag) {
            if (regex.test(text)) {
@ -117,17 +119,17 @@
    }

    function renderDiscoverResults() {
        var container = document.getElementById("discover-results"),
            activeTags,
            filtered,
            i,
            place,
            col,
            card,
            img,
            body,
            title,
            address;
        var container = document.getElementById("discover-results");
        var activeTags;
        var filtered;
        var i;
        var place;
        var col;
        var card;
        var img;
        var body;
        var title;
        var address;

        if (!container) {
            return;
@ -140,13 +142,15 @@
        });
        container.innerHTML = "";

        filtered = activeTags.length === 0
            ? discoverResults
            : discoverResults.filter(function (p) {
                return p.tags.some(function (t) {
                    return activeTags.indexOf(t) !== -1;
                });
            });
        filtered = (
            activeTags.length === 0
                ? discoverResults
                : discoverResults.filter(function (p) {
                    return p.tags.some(function (t) {
                        return activeTags.indexOf(t) !== -1;
                    });
                })
        );

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center">No clubs match your selected interests.</p>';
@ -190,9 +194,9 @@
    }

    function loadDiscoverResults(location) {
        var service,
            request,
            userLatLng;
        var service;
        var request;
        var userLatLng;

        if (!google || !google.maps || !google.maps.places) {
            console.error("Google Maps Places API not loaded");
@ -216,13 +220,13 @@
            userLatLng = new google.maps.LatLng(location.lat, location.lng);
            results.sort(function (a, b) {
                var d1 = google.maps.geometry.spherical.computeDistanceBetween(
                        userLatLng,
                        a.geometry.location
                    ),
                    d2 = google.maps.geometry.spherical.computeDistanceBetween(
                        userLatLng,
                        b.geometry.location
                    );
                    userLatLng,
                    a.geometry.location
                );
                var d2 = google.maps.geometry.spherical.computeDistanceBetween(
                    userLatLng,
                    b.geometry.location
                );
                return d1 - d2;
            });

@ -231,9 +235,11 @@
                discoverResults.push({
                    name: results[i].name,
                    address: results[i].vicinity || results[i].formatted_address || "",
                    photo: results[i].photos && results[i].photos.length
                        ? results[i].photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                        : null,
                    photo: (
                        (results[i].photos && results[i].photos.length)
                            ? results[i].photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                            : null
                    ),
                    tags: mapPlaceToTags(results[i])
                });
            }
@ -297,23 +303,43 @@
    }

    function checkAndOpenNext() {
        var hobbyInput = document.getElementById("hobbyInput"),
            categorySelect = document.getElementById("categorySelect"),
            radiusInput = document.getElementById("radius"),
            indoorOutdoor = document.getElementById("indoorOutdoor"),
            manualLocationInput = document.getElementById("manualLocation"),
            accordionItems = document.querySelectorAll(".accordion-item"),
            hobbyValue = hobbyInput ? hobbyInput.value.trim() : "",
            categoryValue = categorySelect ? categorySelect.value : "",
            locationValue = manualLocationInput ? manualLocationInput.value.trim() : "",
            radiusValue = radiusInput ? radiusInput.value.trim() : "",
            indoorOutdoorValue = indoorOutdoor ? indoorOutdoor.value : "",
            isHobbyComplete = hobbyValue || categoryValue,
            isLocationComplete = userLocation || locationValue,
            isDistanceComplete = radiusValue,
            locationCollapse,
            distanceCollapse,
            categoryCollapse;
        var hobbyInput = document.getElementById("hobbyInput");
        var categorySelect = document.getElementById("categorySelect");
        var radiusInput = document.getElementById("radius");
        var indoorOutdoor = document.getElementById("indoorOutdoor");
        var manualLocationInput = document.getElementById("manualLocation");
        var accordionItems = document.querySelectorAll(".accordion-item");
        var hobbyValue = (
            hobbyInput
                ? hobbyInput.value.trim()
                : ""
        );
        var categoryValue = (
            categorySelect
                ? categorySelect.value
                : ""
        );
        var locationValue = (
            manualLocationInput
                ? manualLocationInput.value.trim()
                : ""
        );
        var radiusValue = (
            radiusInput
                ? radiusInput.value.trim()
                : ""
        );
        var indoorOutdoorValue = (
            indoorOutdoor
                ? indoorOutdoor.value
                : ""
        );
        var isHobbyComplete = hobbyValue || categoryValue;
        var isLocationComplete = userLocation || locationValue;
        var isDistanceComplete = radiusValue;
        var locationCollapse;
        var distanceCollapse;
        var categoryCollapse;

        if (isHobbyComplete && accordionItems[1]) {
            locationCollapse = accordionItems[1].querySelector(".accordion-collapse");
@ -358,13 +384,13 @@
    }

    function performSearch(params) {
        var radiusMeters = params.radiusMiles * 1609.34,
            keyword = "",
            categoryKeywords,
            service,
            request,
            carouselInner = document.getElementById("carouselInner"),
            hobbyContainer = document.getElementById("hobby-results");
        var radiusMeters = params.radiusMiles * 1609.34;
        var keyword = "";
        var categoryKeywords;
        var service;
        var request;
        var carouselInner = document.getElementById("carouselInner");
        var hobbyContainer = document.getElementById("hobby-results");

        if (!userLocation) {
            window.alert("Please set your location first (either allow location access or enter manually).");
@ -413,20 +439,20 @@
        }

        service.nearbySearch(request, function (results, status) {
            var userLatLng,
                i,
                place,
                photoUrl,
                col,
                card,
                img,
                body,
                title,
                addressP,
                markerContent,
                marker,
                activeClass,
                carouselElement;
            var userLatLng;
            var i;
            var place;
            var photoUrl;
            var col;
            var card;
            var img;
            var body;
            var title;
            var addressP;
            var markerContent;
            var marker;
            var activeClass;
            var carouselElement;

            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                window.alert("No results found.");
@ -436,21 +462,23 @@
            userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            results.sort(function (a, b) {
                var d1 = google.maps.geometry.spherical.computeDistanceBetween(
                        userLatLng,
                        a.geometry.location
                    ),
                    d2 = google.maps.geometry.spherical.computeDistanceBetween(
                        userLatLng,
                        b.geometry.location
                    );
                    userLatLng,
                    a.geometry.location
                );
                var d2 = google.maps.geometry.spherical.computeDistanceBetween(
                    userLatLng,
                    b.geometry.location
                );
                return d1 - d2;
            });

            for (i = 0; i < Math.min(results.length, 12); i += 1) {
                place = results[i];
                photoUrl = place.photos && place.photos.length
                    ? place.photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                    : "https://via.placeholder.com/300x200?text=No+Image";
                photoUrl = (
                    (place.photos && place.photos.length)
                        ? place.photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                        : "https://via.placeholder.com/300x200?text=No+Image"
                );

                if (hobbyContainer) {
                    col = document.createElement("div");
@ -511,7 +539,11 @@
                }(place)));

                if (carouselInner) {
                    activeClass = i === 0 ? "active" : "";
                    activeClass = (
                        i === 0
                            ? "active"
                            : ""
                    );
                    carouselInner.innerHTML += '<div class="carousel-item ' + activeClass +
                        '"><div class="d-flex flex-column flex-sm-row align-items-center"><img src="' +
                        photoUrl + '" class="d-block me-sm-3 mb-3 mb-sm-0" style="max-width:300px;height:auto;border-radius:8px;"><div><h5>' +
@ -545,20 +577,20 @@

    // Initialize when DOM is ready
    document.addEventListener("DOMContentLoaded", function () {
        var tagContainer = document.getElementById("interest-tags"),
            backToTopBtn = document.getElementById("backToTopBtn"),
            accordionItems = document.querySelectorAll(".accordion-item"),
            icons = ["hobby", "location", "distance", "category"],
            hobbyInput = document.getElementById("hobbyInput"),
            indoorOutdoor = document.getElementById("indoorOutdoor"),
            radiusInput = document.getElementById("radius"),
            categorySelect = document.getElementById("categorySelect"),
            searchForm = document.getElementById("searchForm"),
            manualLocationInput = document.getElementById("manualLocation"),
            manualLocationBtn = document.getElementById("manualLocationBtn"),
            allowBtn = document.getElementById("allowLocation"),
            denyBtn = document.getElementById("denyLocation"),
            i;
        var tagContainer = document.getElementById("interest-tags");
        var backToTopBtn = document.getElementById("backToTopBtn");
        var accordionItems = document.querySelectorAll(".accordion-item");
        var icons = ["hobby", "location", "distance", "category"];
        var hobbyInput = document.getElementById("hobbyInput");
        var indoorOutdoor = document.getElementById("indoorOutdoor");
        var radiusInput = document.getElementById("radius");
        var categorySelect = document.getElementById("categorySelect");
        var searchForm = document.getElementById("searchForm");
        var manualLocationInput = document.getElementById("manualLocation");
        var manualLocationBtn = document.getElementById("manualLocationBtn");
        var allowBtn = document.getElementById("allowLocation");
        var denyBtn = document.getElementById("denyLocation");
        var i;

        // Handle location buttons
        if (allowBtn) {
@ -619,7 +651,11 @@
        // Back to top
        if (backToTopBtn) {
            window.addEventListener("scroll", function () {
                backToTopBtn.style.display = window.scrollY > 100 ? "block" : "none";
                backToTopBtn.style.display = (
                    window.scrollY > 100
                        ? "block"
                        : "none"
                );
            });
            backToTopBtn.addEventListener("click", function () {
                window.scrollTo({top: 0, behavior: "smooth"});
@ -654,13 +690,13 @@
        // Form submission handler
        if (searchForm) {
            searchForm.addEventListener("submit", function (e) {
                var hobby,
                    category,
                    preference,
                    radiusVal,
                    valid = true,
                    radiusMiles,
                    errorMessages;
                var hobby;
                var category;
                var preference;
                var radiusVal;
                var valid = true;
                var radiusMiles;
                var errorMessages;

                e.preventDefault();
                errorMessages = document.querySelectorAll(".error-message");
@ -668,10 +704,26 @@
                    errorMessages[i].remove();
                }

                hobby = hobbyInput ? hobbyInput.value.trim() : "";
                category = categorySelect ? categorySelect.value : "";
                preference = indoorOutdoor ? indoorOutdoor.value : "";
                radiusVal = radiusInput ? radiusInput.value.trim() : "";
                hobby = (
                    hobbyInput
                        ? hobbyInput.value.trim()
                        : ""
                );
                category = (
                    categorySelect
                        ? categorySelect.value
                        : ""
                );
                preference = (
                    indoorOutdoor
                        ? indoorOutdoor.value
                        : ""
                );
                radiusVal = (
                    radiusInput
                        ? radiusInput.value.trim()
                        : ""
                );

                if (!hobby && !category) {
                    if (hobbyInput) {
@ -688,8 +740,12 @@
                    }
                    valid = false;
                }
                radiusMiles = radiusVal ? Number(radiusVal) : 10;
                if (radiusVal && (isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)) {
                radiusMiles = (
                    radiusVal
                        ? Number(radiusVal)
                        : 10
                );
                if (radiusVal && (Number.isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)) {
                    if (radiusInput) {
                        showError(radiusInput, "Distance must be between 1 and 100 miles.");
                    }
@ -712,9 +768,13 @@
        // Manual Location Handler
        if (manualLocationBtn) {
            manualLocationBtn.addEventListener("click", function () {
                var address = manualLocationInput ? manualLocationInput.value.trim() : "",
                    originalText,
                    geocodeUrl;
                var address = (
                    manualLocationInput
                        ? manualLocationInput.value.trim()
                        : ""
                );
                var originalText;
                var geocodeUrl;

                if (!address) {
                    window.alert("Please enter a location.");
@ -733,14 +793,14 @@
                        return response.json();
                    })
                    .then(function (data) {
                        var location;
                        var locationData;
                        if (data.status === "OK" && data.results && data.results.length > 0) {
                            location = data.results[0].geometry.location;
                            console.log("Manual location chosen:", location);
                            locationData = data.results[0].geometry.location;
                            console.log("Manual location chosen:", locationData);

                            userLocation = {
                                lat: location.lat,
                                lng: location.lng
                                lat: locationData.lat,
                                lng: locationData.lng
                            };

                            map.setCenter(userLocation);
