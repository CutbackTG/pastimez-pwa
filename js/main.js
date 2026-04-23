/*jslint browser, for */
/*global google, bootstrap, console */

(function () {
    "use strict";

    // =========================================================
    // PWA / App UI
    // =========================================================
    var deferredInstallPrompt = null;
    var installBtn = document.getElementById("installBtn");
    var networkBanner = document.getElementById("network-banner");

    function updateNetworkBanner() {
        if (!networkBanner) {
            return;
        }

        if (navigator.onLine) {
            networkBanner.textContent = "You’re back online.";
            networkBanner.classList.add("hidden");
        } else {
            networkBanner.textContent = "You’re offline. Live map and club results may be limited.";
            networkBanner.classList.remove("hidden");
        }
    }

    window.addEventListener("online", function () {
        updateNetworkBanner();

        if (networkBanner) {
            networkBanner.textContent = "You’re back online.";
            networkBanner.classList.remove("hidden");

            window.setTimeout(function () {
                if (navigator.onLine) {
                    networkBanner.classList.add("hidden");
                }
            }, 2500);
        }
    });

    window.addEventListener("offline", function () {
        updateNetworkBanner();
    });

    window.addEventListener("beforeinstallprompt", function (event) {
        event.preventDefault();
        deferredInstallPrompt = event;

        if (installBtn) {
            installBtn.classList.remove("hidden");
        }
    });

    if (installBtn) {
        installBtn.addEventListener("click", function () {
            if (!deferredInstallPrompt) {
                return;
            }

            deferredInstallPrompt.prompt();

            deferredInstallPrompt.userChoice.then(function (choiceResult) {
                console.log("Install prompt result:", choiceResult.outcome);
                deferredInstallPrompt = null;
                installBtn.classList.add("hidden");
            }).catch(function (error) {
                console.error("Install prompt error:", error);
            });
        });
    }

    window.addEventListener("appinstalled", function () {
        console.log("Pastimez was installed");
        if (installBtn) {
            installBtn.classList.add("hidden");
        }
    });

    // =========================================================
    // App Constants / State
    // =========================================================
    var MAX_DISCOVER = 12;
    var INTERESTS = ["Creative", "Tech", "Physical", "Social", "Nature", "Relaxing"];
    var BASE_PURPLE = "#6a1b9a";
    var DEFAULT_LOCATION = { lat: 50.266, lng: -5.052 };

    var map = null;
    var markers = [];
    var userLocation = null;
    var userMarker = null;
    var activeInfoWindow = null;
    var discoverResults = [];
    var mapReady = false;

    // =========================================================
    // Helpers
    // =========================================================
    function getElement(id) {
        return document.getElementById(id);
    }

    function clearMarkers() {
        markers.forEach(function (marker) {
            if (marker) {
                marker.setMap(null);
            }
        });

        markers = [];

        if (userMarker && map) {
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
            body.style.flexDirection = "column";
            body.style.alignItems = "stretch";
            body.style.gap = "12px";
            body.style.padding = "1rem";
            body.style.borderRadius = "0 0 0.5rem 0.5rem";
            body.style.backgroundColor = lightenHexColor(bgColor, 0.7);

            label = body.querySelector("label");
            input = body.querySelector("input, select");

            if (label) {
                label.style.marginBottom = "0";
                label.style.color = textColor;
                label.style.fontWeight = "600";
            }

            if (input) {
                input.style.width = "100%";
                input.style.padding = "0.75rem";
                input.style.border = "1px solid " + textColor;
                input.style.borderRadius = "0.5rem";
                input.style.boxSizing = "border-box";
            }
        }
    }

    function scrollToElement(element, offset) {
        var elementTop = element.offsetTop - (offset || 100);
        window.scrollTo({
            top: elementTop,
            behavior: "smooth"
        });
    }

    function openAccordion(item) {
        var collapse = item.querySelector(".accordion-collapse");

        if (collapse && !collapse.classList.contains("show")) {
            new bootstrap.Collapse(collapse, { show: true });
            window.setTimeout(function () {
                scrollToElement(item);
            }, 300);
        }
    }

    function showError(input, message) {
        var existing;
        var err;

        if (!input || !input.parentElement) {
            return;
        }

        existing = input.parentElement.querySelector(".error-message");
        if (existing) {
            return;
        }

        err = document.createElement("div");
        err.className = "error-message text-danger small mt-1";
        err.textContent = message;
        input.parentElement.appendChild(err);
    }

    function clearErrors() {
        document.querySelectorAll(".error-message").forEach(function (err) {
            err.remove();
        });
    }

    function setStatusMessage(message) {
        if (!networkBanner) {
            return;
        }

        networkBanner.textContent = message;
        networkBanner.classList.remove("hidden");

        window.setTimeout(function () {
            if (navigator.onLine && networkBanner.textContent === message) {
                networkBanner.classList.add("hidden");
            }
        }, 2500);
    }

    // =========================================================
    // Discover Helpers
    // =========================================================
    function mapPlaceToTags(place) {
        var text = (place.name + " " + ((place.types || []).join(" "))).toLowerCase();
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
        var container = getElement("hobby-results");
        var activeTags;
        var filtered;

        if (!container) {
            return;
        }

        activeTags = Array.from(document.querySelectorAll(".interest-tag.active")).map(function (tag) {
            return tag.textContent;
        });

        container.innerHTML = "";

        filtered = activeTags.length === 0
            ? discoverResults
            : discoverResults.filter(function (place) {
                return place.tags.some(function (tag) {
                    return activeTags.indexOf(tag) !== -1;
                });
            });

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center">No clubs match your selected interests.</p>';
            return;
        }

        filtered.forEach(function (place) {
            var col = document.createElement("div");
            var card = document.createElement("div");
            var img = document.createElement("img");
            var body = document.createElement("div");
            var title = document.createElement("h5");
            var address = document.createElement("p");

            col.className = "col";
            card.className = "card h-100 shadow-sm";
            img.className = "card-img-top";
            img.style.objectFit = "cover";
            img.style.height = "200px";
            img.src = place.photo || "https://via.placeholder.com/300x200?text=No+Image";
            img.alt = place.name;

            body.className = "card-body";
            title.className = "card-title";
            title.textContent = place.name;

            address.className = "card-text";
            address.textContent = place.address;

            body.appendChild(title);
            body.appendChild(address);
            card.appendChild(img);
            card.appendChild(body);
            col.appendChild(card);
            container.appendChild(col);
        });
    }

    function safeComputeDistance(fromLatLng, toLatLng) {
        if (google &&
                google.maps &&
                google.maps.geometry &&
                google.maps.geometry.spherical &&
                typeof google.maps.geometry.spherical.computeDistanceBetween === "function") {
            return google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);
        }

        return 0;
    }

    function loadDiscoverResults(location) {
        var service;
        var request;

        if (!mapReady || !map || !google || !google.maps || !google.maps.places) {
            console.warn("Google Maps Places API not ready yet");
            return;
        }

        service = new google.maps.places.PlacesService(map);
        request = {
            location: new google.maps.LatLng(location.lat, location.lng),
            radius: 16093,
            keyword: "hobby club"
        };

        service.nearbySearch(request, function (results, status) {
            var userLatLng;

            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                console.warn("No default discover results found:", status);
                discoverResults = [];
                renderDiscoverResults();
                return;
            }

            userLatLng = new google.maps.LatLng(location.lat, location.lng);

            results.sort(function (a, b) {
                var d1 = safeComputeDistance(userLatLng, a.geometry.location);
                var d2 = safeComputeDistance(userLatLng, b.geometry.location);
                return d1 - d2;
            });

            discoverResults = results.slice(0, MAX_DISCOVER).map(function (result) {
                return {
                    name: result.name,
                    address: result.vicinity || result.formatted_address || "",
                    photo: (result.photos && result.photos.length)
                        ? result.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })
                        : null,
                    tags: mapPlaceToTags(result)
                };
            });

            renderDiscoverResults();
        });
    }

    // =========================================================
    // Map
    // =========================================================
    function initMap() {
        var mapElement = getElement("map");

        if (!mapElement || !google || !google.maps) {
            console.error("Map element or Google Maps API not available.");
            return;
        }

        map = new google.maps.Map(mapElement, {
            center: DEFAULT_LOCATION,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
        });

        mapReady = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    setUserLocation(pos.coords.latitude, pos.coords.longitude, "You are here");
                },
                function () {
                    setUserLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, "Default location");
                }
            );
        } else {
            setUserLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, "Default location");
        }
    }

    function setUserLocation(lat, lng, title) {
        if (!mapReady || !map) {
            console.warn("Map is not initialized yet.");
            return;
        }

        userLocation = {
            lat: lat,
            lng: lng
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
            title: title,
            icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        markers.push(userMarker);
        loadDiscoverResults(userLocation);
    }

    // =========================================================
    // Search Flow
    // =========================================================
    function checkAndOpenNext() {
        var hobbyInput = getElement("hobbyInput");
        var categorySelect = getElement("categorySelect");
        var radiusInput = getElement("radius");
        var manualLocationInput = getElement("manualLocation");
        var accordionItems = document.querySelectorAll(".accordion-item");

        var hobbyValue = hobbyInput ? hobbyInput.value.trim() : "";
        var categoryValue = categorySelect ? categorySelect.value : "";
        var locationValue = manualLocationInput ? manualLocationInput.value.trim() : "";
        var radiusValue = radiusInput ? radiusInput.value.trim() : "";

        var isHobbyComplete = hobbyValue || categoryValue;
        var isLocationComplete = userLocation || locationValue;
        var isDistanceComplete = radiusValue;

        if (isHobbyComplete && accordionItems[1]) {
            openAccordion(accordionItems[1]);
        }
        if (isLocationComplete && accordionItems[2]) {
            openAccordion(accordionItems[2]);
        }
        if (isDistanceComplete && accordionItems[3]) {
            openAccordion(accordionItems[3]);
        }
    }

    function buildKeyword(params) {
        if (params.hobby) {
            if (params.preference === "indoor") {
                return params.hobby + " indoor club";
            }
            if (params.preference === "outdoor") {
                return params.hobby + " outdoor club";
            }
            return params.hobby + " club";
        }

        return {
            sports: "sports club",
            crafting: "crafts club",
            music: "music group",
            gaming: "gaming club",
            social: "community group",
            outdoors: "outdoor adventure club"
        }[params.category] || "hobby club";
    }

    function createResultsCard(place, photoUrl) {
        var hobbyContainer = getElement("hobby-results");
        var col;
        var card;
        var img;
        var body;
        var title;
        var addressP;

        if (!hobbyContainer) {
            return;
        }

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

    function createResultMarker(place) {
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            title: place.name,
            icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        marker.addListener("click", function () {
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }

            activeInfoWindow = new google.maps.InfoWindow({
                content:
                    "<div>" +
                    "<h6>" + place.name + "</h6>" +
                    "<p>" + (place.vicinity || place.formatted_address || "") + "</p>" +
                    '<a href="https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(place.name) +
                    '" target="_blank" rel="noopener">View on Google Maps</a>' +
                    "</div>"
            });

            activeInfoWindow.open(map, marker);
        });

        markers.push(marker);
    }

    function appendCarouselSlide(place, photoUrl, index) {
        var carouselInner = getElement("carouselInner");
        var item;
        var wrapper;
        var imageWrap;
        var img;
        var content;
        var title;
        var address;
        var link;

        if (!carouselInner) {
        return;
    }

    item = document.createElement("div");
    item.className = "carousel-item" + (index === 0 ? " active" : "");

    wrapper = document.createElement("div");
    wrapper.className = "d-flex flex-column flex-md-row align-items-start";

    imageWrap = document.createElement("div");
    imageWrap.className = "carousel-result-image-wrap";

    img = document.createElement("img");
    img.src = photoUrl;
    img.alt = place.name;

    content = document.createElement("div");
    content.className = "carousel-result-content";

    title = document.createElement("h5");
    title.textContent = place.name;

    address = document.createElement("p");
    address.textContent = place.vicinity || place.formatted_address || "";

    link = document.createElement("a");
    link.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.name);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "View on Google Maps";

    imageWrap.appendChild(img);
    content.appendChild(title);
    content.appendChild(address);
    content.appendChild(link);

    wrapper.appendChild(imageWrap);
    wrapper.appendChild(content);
    item.appendChild(wrapper);
    carouselInner.appendChild(item);
    }

    function performSearch(params) {
        var radiusMeters;
        var keyword;
        var service;
        var request;
        var carouselInner;
        var resultsContainer;

        if (!userLocation) {
            window.alert("Please set your location first.");
            return;
        }

        if (!mapReady || !map || !google || !google.maps || !google.maps.places) {
            window.alert("Google Maps is not ready yet.");
            return;
        }

        radiusMeters = params.radiusMiles * 1609.34;
        keyword = buildKeyword(params);

        service = new google.maps.places.PlacesService(map);
        request = {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: radiusMeters,
            keyword: keyword
        };

        clearMarkers();

        carouselInner = getElement("carouselInner");
        resultsContainer = getElement("hobby-results");

        if (carouselInner) {
            carouselInner.innerHTML = "";
        }
        if (resultsContainer) {
            resultsContainer.innerHTML = "";
        }

        service.nearbySearch(request, function (results, status) {
            var userLatLng;

            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                window.alert("No results found.");
                return;
            }

            userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);

            results.sort(function (a, b) {
                return safeComputeDistance(userLatLng, a.geometry.location) -
                    safeComputeDistance(userLatLng, b.geometry.location);
            });

            results.slice(0, 12).forEach(function (place, index) {
                var photoUrl = (place.photos && place.photos.length)
                    ? place.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })
                    : "https://via.placeholder.com/300x200?text=No+Image";

                createResultsCard(place, photoUrl);
                createResultMarker(place);
                appendCarouselSlide(place, photoUrl, index);
            });

            setStatusMessage("Found " + Math.min(results.length, 12) + " clubs near you.");
        });
    }

    // =========================================================
    // DOM Setup
    // =========================================================
    document.addEventListener("DOMContentLoaded", function () {
        var tagContainer = getElement("interest-tags");
        var searchForm = getElement("searchForm");
        var manualLocationBtn = getElement("manualLocationBtn");

        updateNetworkBanner();

        if (tagContainer) {
            INTERESTS.forEach(function (interest) {
                var tag = document.createElement("span");
                tag.className = "interest-tag tag active";
                tag.textContent = interest;
                tag.addEventListener("click", function () {
                    tag.classList.toggle("active");
                    renderDiscoverResults();
                });
                tagContainer.appendChild(tag);
            });
        }

        renderDiscoverResults();

        document.querySelectorAll(".accordion-item").forEach(function (item) {
            styleAccordionItem(item, BASE_PURPLE, "#ffffff");
        });

        ["hobbyInput", "categorySelect", "radius", "indoorOutdoor", "manualLocation"].forEach(function (id) {
            var el = getElement(id);
            if (el) {
                el.addEventListener("input", checkAndOpenNext);
                el.addEventListener("change", checkAndOpenNext);
            }
        });

        if (searchForm) {
            searchForm.addEventListener("submit", function (e) {
                var hobbyInput = getElement("hobbyInput");
                var categorySelect = getElement("categorySelect");
                var indoorOutdoor = getElement("indoorOutdoor");
                var radiusInput = getElement("radius");

                var hobby;
                var category;
                var preference;
                var radiusVal;
                var radiusMiles;
                var valid = true;

                e.preventDefault();
                clearErrors();

                hobby = hobbyInput ? hobbyInput.value.trim() : "";
                category = categorySelect ? categorySelect.value : "";
                preference = indoorOutdoor ? indoorOutdoor.value : "";
                radiusVal = radiusInput ? radiusInput.value.trim() : "";

                if (!hobby && !category) {
                    showError(hobbyInput, "Enter a hobby or select a category.");
                    showError(categorySelect, "Enter a hobby or select a category.");
                    valid = false;
                }

                if (!preference) {
                    showError(indoorOutdoor, "Select indoor or outdoor preference.");
                    valid = false;
                }

                radiusMiles = radiusVal ? Number(radiusVal) : 10;

                if (radiusVal && (Number.isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)) {
                    showError(radiusInput, "Distance must be between 1 and 100 miles.");
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

        if (manualLocationBtn) {
            manualLocationBtn.addEventListener("click", function () {
                var manualLocationInput = getElement("manualLocation");
                var address = manualLocationInput ? manualLocationInput.value.trim() : "";
                var originalText;
                var geocoder;

                if (!address) {
                    window.alert("Please enter a location.");
                    return;
                }

                if (!google || !google.maps || typeof google.maps.Geocoder !== "function") {
                    window.alert("Google Maps is not ready yet.");
                    return;
                }

                originalText = manualLocationBtn.textContent;
                manualLocationBtn.disabled = true;
                manualLocationBtn.textContent = "Setting location...";

                geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: address }, function (results, status) {
                    if (status === "OK" && results[0]) {
                        var locationData = results[0].geometry.location;
                        setUserLocation(locationData.lat(), locationData.lng(), "Your chosen location");
                        checkAndOpenNext();
                        setStatusMessage("Location set to: " + results[0].formatted_address);
                    } else {
                        window.alert("Could not find that location. Please try again.");
                        console.error("Geocoding failed:", status);
                    }

                    manualLocationBtn.disabled = false;
                    manualLocationBtn.textContent = originalText;
                });
            });
        }
    });

    // =========================================================
    // Expose initMap for Google callback
    // =========================================================
    window.initMap = initMap;
}());