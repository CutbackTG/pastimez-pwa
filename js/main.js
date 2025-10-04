/*jslint browser, for */
/*global google, bootstrap, console */

(function () {
    "use strict";

    // Constants
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
    var map;
    var userLocation;
    var markers = [];
    var userMarker = null;
    var activeInfoWindow = null;
    var discoverResults = [];

    // Utilities
    function clearMarkers() {
        var i;
        for (i = 0; i < markers.length; i += 1) {
            markers[i].setMap(null);
        }
        markers = [];
        if (userMarker) {
            userMarker.setMap(map);
            markers.push(userMarker);
        }
    }

    function lightenHexColor(hex, factor) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var nr = Math.min(255, Math.floor(r + (255 - r) * factor));
        var ng = Math.min(255, Math.floor(g + (255 - g) * factor));
        var nb = Math.min(255, Math.floor(b + (255 - b) * factor));
        return "rgb(" + nr + ", " + ng + ", " + nb + ")";
    }

    function styleAccordionItem(item, bgColor, textColor) {
        var button = item.querySelector(".accordion-button");
        var body = item.querySelector(".accordion-body");
        var label;
        var input;

        if (button) {
            button.style.backgroundColor = bgColor;
            button.style.color = textColor;
            button.style.fontWeight = "700";
            button.style.border = "none";
            button.style.borderRadius = "0.5rem";
        }

        if (body) {
            body.style.display = "flex";
            body.style.alignItems = "center";
            body.style.gap = "20px";
            body.style.padding = "1rem";
            body.style.borderRadius = "0 0 0.5rem 0.5rem";
            body.style.backgroundColor = lightenHexColor(bgColor, 0.7);

            label = body.querySelector("label");
            input = body.querySelector("input, select");

            if (label) {
                label.style.flex = "1 0 0%";
                label.style.marginBottom = "0";
                label.style.color = textColor;
                label.style.fontWeight = "600";
            }

            if (input) {
                input.style.flex = "1 0 70%";
                input.style.maxWidth = "400px";
                input.style.width = "100%";
                input.style.padding = "0.5rem";
                input.style.border = "1px solid " + textColor;
                input.style.borderRadius = "0.3rem";
                input.style.boxSizing = "border-box";
            }
        }
    }

    // Discover Helpers
    function mapPlaceToTags(place) {
        var text = (
            place.name + " " + (place.types || []).join(" ")
        ).toLowerCase();
        var tags = [];

        function match(regex, tag) {
            if (regex.test(text)) {
                tags.push(tag);
            }
        }

        match(/art|gallery|painting|craft/, "Creative");
        match(/tech|computer|electronics|coding|software|maker/, "Tech");
        match(/gym|sport|fitness|dance|run|hike|climb|yoga|swim/, "Physical");
        match(/park|garden|outdoor|nature|trail/, "Nature");
        match(/community|club|social|bar|pub|cafe/, "Social");
        match(/spa|relax|massage|meditat|library/, "Relaxing");

        if (tags.length === 0) {
            tags.push("Creative");
        }
        return tags;
    }

    function renderDiscoverResults() {
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
        }

        activeTags = Array.prototype.slice.call(
            document.querySelectorAll(".interest-tag.active")
        ).map(function (t) {
            return t.textContent;
        });
        container.innerHTML = "";

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
            return;
        }

        for (i = 0; i < filtered.length; i += 1) {
            place = filtered[i];
            col = document.createElement("div");
            col.className = "col";

            card = document.createElement("div");
            card.className = "card h-100 shadow-sm";

            img = document.createElement("img");
            img.className = "card-img-top";
            img.style.objectFit = "cover";
            img.style.height = "200px";
            img.src = place.photo || "https://via.placeholder.com/300x200?text=No+Image";
            img.alt = place.name;

            body = document.createElement("div");
            body.className = "card-body";

            title = document.createElement("h5");
            title.className = "card-title";
            title.textContent = place.name;

            address = document.createElement("p");
            address.className = "card-text";
            address.textContent = place.address;

            body.appendChild(title);
            body.appendChild(address);
            card.appendChild(img);
            card.appendChild(body);
            col.appendChild(card);

            container.appendChild(col);
        }
    }

    function loadDiscoverResults(location) {
        var service;
        var request;
        var userLatLng;

        if (!google || !google.maps || !google.maps.places) {
            console.error("Google Maps Places API not loaded");
            return;
        }

        service = new google.maps.places.PlacesService(map);
        request = {
            location: new google.maps.LatLng(location.lat, location.lng),
            radius: 16093,
            keyword: "hobby club"
        };

        service.nearbySearch(request, function (results, status) {
            var i;
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                console.warn("No default results found:", status);
                return;
            }

            userLatLng = new google.maps.LatLng(location.lat, location.lng);
            results.sort(function (a, b) {
                var d1 = google.maps.geometry.spherical.computeDistanceBetween(
                    userLatLng,
                    a.geometry.location
                );
                var d2 = google.maps.geometry.spherical.computeDistanceBetween(
                    userLatLng,
                    b.geometry.location
                );
                return d1 - d2;
            });

            discoverResults = [];
            for (i = 0; i < Math.min(results.length, MAX_DISCOVER); i += 1) {
                discoverResults.push({
                    name: results[i].name,
                    address: results[i].vicinity || results[i].formatted_address || "",
                    photo: (
                        (results[i].photos && results[i].photos.length)
                            ? results[i].photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                            : null
                    ),
                    tags: mapPlaceToTags(results[i])
                });
            }

            renderDiscoverResults();
        });
    }

    // Google Map
    function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
            center: {lat: 50.266, lng: -5.052},
            zoom: 10,
            mapId: "DEMO_MAP_ID"
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    var markerContent;
                    userLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    map.setCenter(userLocation);

                    markerContent = document.createElement("img");
                    markerContent.src = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
                    markerContent.style.width = "32px";
                    markerContent.style.height = "32px";

                    userMarker = new google.maps.marker.AdvancedMarkerElement({
                        position: userLocation,
                        map: map,
                        title: "You are here",
                        content: markerContent
                    });

                    markers.push(userMarker);
                    loadDiscoverResults(userLocation);
                },
                function (error) {
                    console.warn("Geolocation failed; using fallback.", error);
                    userLocation = {lat: 50.266, lng: -5.052};
                    loadDiscoverResults(userLocation);
                }
            );
        } else {
            console.warn("Geolocation not supported");
            userLocation = {lat: 50.266, lng: -5.052};
            loadDiscoverResults(userLocation);
        }
    }

    function scrollToElement(element, offset) {
        var elementTop = element.offsetTop - (offset || 100);
        window.scrollTo({
            top: elementTop,
            behavior: "smooth"
        });
    }

    function checkAndOpenNext() {
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
            if (locationCollapse && !locationCollapse.classList.contains("show")) {
                new bootstrap.Collapse(locationCollapse, {show: true});
                setTimeout(function () {
                    scrollToElement(accordionItems[1]);
                }, 300);
            }
        }

        if (isLocationComplete && accordionItems[2]) {
            distanceCollapse = accordionItems[2].querySelector(".accordion-collapse");
            if (distanceCollapse && !distanceCollapse.classList.contains("show")) {
                new bootstrap.Collapse(distanceCollapse, {show: true});
                setTimeout(function () {
                    scrollToElement(accordionItems[2]);
                }, 300);
            }
        }

        if (isDistanceComplete && accordionItems[3]) {
            categoryCollapse = accordionItems[3].querySelector(".accordion-collapse");
            if (categoryCollapse && !categoryCollapse.classList.contains("show")) {
                new bootstrap.Collapse(categoryCollapse, {show: true});
                setTimeout(function () {
                    scrollToElement(accordionItems[3]);
                }, 300);
            }
        }
    }

    function showError(input, message) {
        var err;
        if (!input || input.parentElement.querySelector(".error-message")) {
            return;
        }
        err = document.createElement("div");
        err.className = "error-message text-danger small mt-1";
        err.textContent = message;
        input.parentElement.appendChild(err);
    }

    function performSearch(params) {
        var radiusMeters = params.radiusMiles * 1609.34;
        var keyword = "";
        var categoryKeywords;
        var service;
        var request;
        var carouselInner = document.getElementById("carouselInner");
        var hobbyContainer = document.getElementById("hobby-results");

        if (!userLocation) {
            window.alert("Please set your location first (either allow location access or enter manually).");
            return;
        }

        if (!google || !google.maps || !google.maps.places) {
            window.alert("Google Maps is not loaded yet. Please try again in a moment.");
            return;
        }

        if (params.hobby) {
            keyword = params.hobby;
            if (params.preference === "indoor") {
                keyword += " indoor club";
            } else if (params.preference === "outdoor") {
                keyword += " outdoor club";
            } else {
                keyword += " club";
            }
        } else {
            categoryKeywords = {
                sports: "sports club",
                crafting: "crafts club",
                music: "music group",
                gaming: "gaming club",
                social: "community group",
                outdoors: "outdoor adventure club"
            };
            keyword = categoryKeywords[params.category] || "hobby club";
        }

        service = new google.maps.places.PlacesService(map);
        request = {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: radiusMeters,
            keyword: keyword
        };

        clearMarkers();
        if (carouselInner) {
            carouselInner.innerHTML = "";
        }
        if (hobbyContainer) {
            hobbyContainer.innerHTML = "";
        }

        service.nearbySearch(request, function (results, status) {
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
                return;
            }

            userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            results.sort(function (a, b) {
                var d1 = google.maps.geometry.spherical.computeDistanceBetween(
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
                photoUrl = (
                    (place.photos && place.photos.length)
                        ? place.photos[0].getUrl({maxWidth: 300, maxHeight: 200})
                        : "https://via.placeholder.com/300x200?text=No+Image"
                );

                if (hobbyContainer) {
                    col = document.createElement("div");
                    col.className = "col";
                    card = document.createElement("div");
                    card.className = "card h-100 shadow-sm";
                    img = document.createElement("img");
                    img.src = photoUrl;
                    img.alt = place.name;
                    img.className = "card-img-top";
                    img.style.objectFit = "cover";
                    img.style.height = "200px";
                    body = document.createElement("div");
                    body.className = "card-body";
                    title = document.createElement("h5");
                    title.className = "card-title";
                    title.textContent = place.name;
                    addressP = document.createElement("p");
                    addressP.className = "card-text";
                    addressP.textContent = place.vicinity || place.formatted_address || "";
                    body.appendChild(title);
                    body.appendChild(addressP);
                    card.appendChild(img);
                    card.appendChild(body);
                    col.appendChild(card);
                    hobbyContainer.appendChild(col);
                }

                markerContent = document.createElement("img");
                markerContent.src = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
                markerContent.style.width = "32px";
                markerContent.style.height = "32px";

                marker = new google.maps.marker.AdvancedMarkerElement({
                    map: map,
                    position: place.geometry.location,
                    title: place.name,
                    content: markerContent
                });
                markers.push(marker);

                marker.addListener("click", (function (p) {
                    return function () {
                        var contentString;
                        if (activeInfoWindow) {
                            activeInfoWindow.close();
                        }
                        contentString = "<div><h6>" + p.name + "</h6><p>" +
                            (p.vicinity || p.formatted_address || "") +
                            '</p><a href="https://www.google.com/maps/search/?api=1&query=' +
                            encodeURIComponent(p.name) +
                            '" target="_blank">View on Google Maps</a></div>';
                        activeInfoWindow = new google.maps.InfoWindow({
                            content: contentString
                        });
                        activeInfoWindow.open(map, marker);
                    };
                }(place)));

                if (carouselInner) {
                    activeClass = (
                        i === 0
                            ? "active"
                            : ""
                    );
                    carouselInner.innerHTML += '<div class="carousel-item ' + activeClass +
                        '"><div class="d-flex flex-column flex-sm-row align-items-center"><img src="' +
                        photoUrl + '" class="d-block me-sm-3 mb-3 mb-sm-0" style="max-width:300px;height:auto;border-radius:8px;"><div><h5>' +
                        place.name + '</h5><p>' + (place.vicinity || "") +
                        '</p><a href="https://www.google.com/maps/search/?api=1&query=' +
                        encodeURIComponent(place.name) +
                        '" target="_blank">View on Google Maps</a></div></div></div>';
                }
            }

            carouselElement = document.getElementById("carouselExampleControls");
            if (carouselElement) {
                carouselElement.style.display = "block";
            }
        });
    }

    // Event handlers
    window.addEventListener("load", function () {
        var locationChoice = window.localStorage.getItem("locationChoice");

        if (!locationChoice) {
            setTimeout(function () {
                var popup = document.getElementById("locationPopup");
                if (popup) {
                    popup.classList.remove("hidden");
                }
            }, 1000);
        }
    });

    // Initialize when DOM is ready
    document.addEventListener("DOMContentLoaded", function () {
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
            allowBtn.addEventListener("click", function () {
                var popup;
                window.localStorage.setItem("locationChoice", "allowed");

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function (position) {
                            console.log("User's location:", position.coords);
                        },
                        function (error) {
                            console.error("Geolocation error:", error);
                        }
                    );
                } else {
                    window.alert("Geolocation is not supported by your browser.");
                }

                popup = document.getElementById("locationPopup");
                if (popup) {
                    popup.classList.add("hidden");
                }
            });
        }

        if (denyBtn) {
            denyBtn.addEventListener("click", function () {
                var popup;
                window.localStorage.setItem("locationChoice", "denied");
                popup = document.getElementById("locationPopup");
                if (popup) {
                    popup.classList.add("hidden");
                }
                window.alert("Some features may not work without location access.");
            });
        }

        // Interest Tags
        if (tagContainer) {
            for (i = 0; i < INTERESTS.length; i += 1) {
                (function (interest) {
                    var tag = document.createElement("span");
                    tag.className = "interest-tag tag active";
                    tag.textContent = interest;
                    tag.onclick = function () {
                        tag.classList.toggle("active");
                        renderDiscoverResults();
                    };
                    tagContainer.appendChild(tag);
                }(INTERESTS[i]));
            }
        }

        renderDiscoverResults();

        // Back to top
        if (backToTopBtn) {
            window.addEventListener("scroll", function () {
                backToTopBtn.style.display = (
                    window.scrollY > 100
                        ? "block"
                        : "none"
                );
            });
            backToTopBtn.addEventListener("click", function () {
                window.scrollTo({top: 0, behavior: "smooth"});
            });
        }

        // Accordion styling
        for (i = 0; i < accordionItems.length; i += 1) {
            styleAccordionItem(accordionItems[i], BASE_PURPLE, "#fff");
        }

        // Add event listeners for progressive accordion opening
        if (hobbyInput) {
            hobbyInput.addEventListener("input", checkAndOpenNext);
            hobbyInput.addEventListener("change", checkAndOpenNext);
        }
        if (categorySelect) {
            categorySelect.addEventListener("change", checkAndOpenNext);
        }
        if (radiusInput) {
            radiusInput.addEventListener("input", checkAndOpenNext);
            radiusInput.addEventListener("change", checkAndOpenNext);
        }
        if (indoorOutdoor) {
            indoorOutdoor.addEventListener("change", checkAndOpenNext);
        }
        if (manualLocationInput) {
            manualLocationInput.addEventListener("input", checkAndOpenNext);
            manualLocationInput.addEventListener("change", checkAndOpenNext);
        }

        // Form submission handler
        if (searchForm) {
            searchForm.addEventListener("submit", function (e) {
                var hobby;
                var category;
                var preference;
                var radiusVal;
                var valid = true;
                var radiusMiles;
                var errorMessages;

                e.preventDefault();
                errorMessages = document.querySelectorAll(".error-message");
                for (i = 0; i < errorMessages.length; i += 1) {
                    errorMessages[i].remove();
                }

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
                        showError(hobbyInput, "Enter a hobby or select a category.");
                    }
                    if (categorySelect) {
                        showError(categorySelect, "Enter a hobby or select a category.");
                    }
                    valid = false;
                }
                if (!preference) {
                    if (indoorOutdoor) {
                        showError(indoorOutdoor, "Select indoor or outdoor preference.");
                    }
                    valid = false;
                }
                radiusMiles = (
                    radiusVal
                        ? Number(radiusVal)
                        : 10
                );
                if (radiusVal && (Number.isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)) {
                    if (radiusInput) {
                        showError(radiusInput, "Distance must be between 1 and 100 miles.");
                    }
                    valid = false;
                }

                if (!valid) {
                    return;
                }

                performSearch({
                    hobby: hobby,
                    category: category,
                    preference: preference,
                    radiusMiles: radiusMiles
                });
            });
        }

        // Manual Location Handler
        if (manualLocationBtn) {
            manualLocationBtn.addEventListener("click", function () {
                var address = (
                    manualLocationInput
                        ? manualLocationInput.value.trim()
                        : ""
                );
                var originalText;
                var geocodeUrl;

                if (!address) {
                    window.alert("Please enter a location.");
                    return;
                }

                originalText = manualLocationBtn.textContent;
                manualLocationBtn.disabled = true;
                manualLocationBtn.textContent = "Setting location...";

                geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=" +
                    encodeURIComponent(address) + "&key=" + GOOGLE_MAPS_API_KEY;

                fetch(geocodeUrl)
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        var locationData;
                        if (data.status === "OK" && data.results && data.results.length > 0) {
                            locationData = data.results[0].geometry.location;
                            console.log("Manual location chosen:", locationData);

                            userLocation = {
                                lat: locationData.lat,
                                lng: locationData.lng
                            };

                            map.setCenter(userLocation);
                            map.setZoom(12);

                            if (userMarker) {
                                userMarker.setMap(null);
                                markers = markers.filter(function (marker) {
                                    return marker !== userMarker;
                                });
                            }

                            userMarker = new google.maps.Marker({
                                position: userLocation,
                                map: map,
                                title: "Your chosen location",
                                icon: {
                                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                    scaledSize: new google.maps.Size(32, 32)
                                }
                            });
                            markers.push(userMarker);

                            loadDiscoverResults(userLocation);
                            checkAndOpenNext();
                            window.alert("Location set to: " + data.results[0].formatted_address);
                        } else {
                            window.alert("Could not find that location. Please try again.");
                            console.error("Geocoding error:", data);
                        }
                    })
                    .catch(function (error) {
                        console.error("Error fetching geocode:", error);
                        window.alert("Something went wrong. Please try again.");
                    })
                    .finally(function () {
                        manualLocationBtn.disabled = false;
                        manualLocationBtn.textContent = originalText;
                    });
            });
        }
    });

    // Expose initMap to global scope
    window.initMap = initMap;

    // Location logic
document.addEventListener("DOMContentLoaded", () => {
  const allowBtn = document.getElementById("allowLocation");
  const denyBtn = document.getElementById("denyLocation");
  const popup = document.getElementById("locationPopup");

  // Show the popup on load (you already have HTML for this)
  popup.classList.remove("hidden");

  allowBtn.addEventListener("click", () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          console.log("User position:", lat, lng);

          // Call your map initializer with coords
          if (typeof initMap === "function") {
            initMap(lat, lng);
          }

          popup.classList.add("hidden"); // close popup
        },
        (err) => {
          alert("Error getting location: " + err.message);
          console.error(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert("Geolocation is not supported on this device.");
    }
  });

  denyBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
    // fallback: initMap without coords, or use default center
    if (typeof initMap === "function") {
      initMap();
    }
  });
});

}());
