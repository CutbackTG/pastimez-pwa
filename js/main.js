/*jslint browser, for */
/*global google, bootstrap, console */

let deferredInstallPrompt = null;

const installBtn = document.getElementById("installBtn");
const networkBanner = document.getElementById("network-banner");

function updateNetworkBanner() {
  if (!networkBanner) return;

  if (navigator.onLine) {
    networkBanner.classList.add("hidden");
    networkBanner.textContent = "You’re back online.";
  } else {
    networkBanner.textContent = "You’re offline. Live map and club results may be limited.";
    networkBanner.classList.remove("hidden");
  }
}

window.addEventListener("online", () => {
  updateNetworkBanner();

  // Optional tiny flourish: briefly show "back online"
  if (networkBanner) {
    networkBanner.textContent = "You’re back online.";
    networkBanner.classList.remove("hidden");
    setTimeout(() => {
      if (navigator.onLine) {
        networkBanner.classList.add("hidden");
      }
    }, 2500);
  }
});

window.addEventListener("offline", () => {
  updateNetworkBanner();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (installBtn) {
    installBtn.classList.remove("hidden");
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();

    try {
      const choiceResult = await deferredInstallPrompt.userChoice;
      console.log("Install prompt result:", choiceResult.outcome);
    } catch (error) {
      console.error("Install prompt error:", error);
    }

    deferredInstallPrompt = null;
    installBtn.classList.add("hidden");
  });
}

window.addEventListener("appinstalled", () => {
  console.log("Pastimez was installed");
  if (installBtn) {
    installBtn.classList.add("hidden");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  updateNetworkBanner();
});

(function () {
    "use strict";

    // Constants
    var MAX_DISCOVER = 12;
    var INTERESTS = ["Creative", "Tech", "Physical", "Social", "Nature", "Relaxing"];
    var BASE_PURPLE = "#6a1b9a";

    // Globals
    var map;
    var userLocation;
    var markers = [];
    var userMarker = null;
    var activeInfoWindow = null;
    var discoverResults = [];

    // Utilities
    function clearMarkers() {
        for (var i = 0; i < markers.length; i += 1) {
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
        var label, input;

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
        var text = (place.name + " " + (place.types || []).join(" ")).toLowerCase();
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
        if (!container) return;

        var activeTags = Array.from(document.querySelectorAll(".interest-tag.active")).map(function (t) {
            return t.textContent;
        });
        container.innerHTML = "";

        var filtered = activeTags.length === 0
            ? discoverResults
            : discoverResults.filter(function (p) {
                return p.tags.some(function (t) { return activeTags.indexOf(t) !== -1; });
            });

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center">No clubs match your selected interests.</p>';
            return;
        }

        for (var i = 0; i < filtered.length; i += 1) {
            var place = filtered[i];
            var col = document.createElement("div");
            col.className = "col";

            var card = document.createElement("div");
            card.className = "card h-100 shadow-sm";

            var img = document.createElement("img");
            img.className = "card-img-top";
            img.style.objectFit = "cover";
            img.style.height = "200px";
            img.src = place.photo || "https://via.placeholder.com/300x200?text=No+Image";
            img.alt = place.name;

            var body = document.createElement("div");
            body.className = "card-body";

            var title = document.createElement("h5");
            title.className = "card-title";
            title.textContent = place.name;

            var address = document.createElement("p");
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
        if (!google || !google.maps || !google.maps.places) {
            console.error("Google Maps Places API not loaded");
            return;
        }

        var service = new google.maps.places.PlacesService(map);
        var request = {
            location: new google.maps.LatLng(location.lat, location.lng),
            radius: 16093,
            keyword: "hobby club"
        };

        service.nearbySearch(request, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                console.warn("No default results found:", status);
                return;
            }

            var userLatLng = new google.maps.LatLng(location.lat, location.lng);
            results.sort(function (a, b) {
                var d1 = google.maps.geometry.spherical.computeDistanceBetween(userLatLng, a.geometry.location);
                var d2 = google.maps.geometry.spherical.computeDistanceBetween(userLatLng, b.geometry.location);
                return d1 - d2;
            });

            discoverResults = [];
            for (var i = 0; i < Math.min(results.length, MAX_DISCOVER); i += 1) {
                discoverResults.push({
                    name: results[i].name,
                    address: results[i].vicinity || results[i].formatted_address || "",
                    photo: (results[i].photos && results[i].photos.length) ? results[i].photos[0].getUrl({ maxWidth: 300, maxHeight: 200 }) : null,
                    tags: mapPlaceToTags(results[i])
                });
            }

            renderDiscoverResults();
        });
    }

    // Google Map
    function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: 50.266, lng: -5.052 },
            zoom: 10
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (pos) { setUserLocation(pos.coords.latitude, pos.coords.longitude, "You are here"); },
                function () { setUserLocation(50.266, -5.052, "Default Location"); }
            );
        } else {
            setUserLocation(50.266, -5.052, "Default Location");
        }
    }

    function setUserLocation(lat, lng, title) {
        userLocation = { lat: lat, lng: lng };
        map.setCenter(userLocation);
        map.setZoom(12);

        if (userMarker) {
            userMarker.setMap(null);
            markers = markers.filter(function (m) { return m !== userMarker; });
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

    function scrollToElement(element, offset) {
        var elementTop = element.offsetTop - (offset || 100);
        window.scrollTo({ top: elementTop, behavior: "smooth" });
    }

    function checkAndOpenNext() {
        var hobbyInput = document.getElementById("hobbyInput");
        var categorySelect = document.getElementById("categorySelect");
        var radiusInput = document.getElementById("radius");
        var indoorOutdoor = document.getElementById("indoorOutdoor");
        var manualLocationInput = document.getElementById("manualLocation");
        var accordionItems = document.querySelectorAll(".accordion-item");

        var hobbyValue = hobbyInput ? hobbyInput.value.trim() : "";
        var categoryValue = categorySelect ? categorySelect.value : "";
        var locationValue = manualLocationInput ? manualLocationInput.value.trim() : "";
        var radiusValue = radiusInput ? radiusInput.value.trim() : "";
        var indoorOutdoorValue = indoorOutdoor ? indoorOutdoor.value : "";

        var isHobbyComplete = hobbyValue || categoryValue;
        var isLocationComplete = userLocation || locationValue;
        var isDistanceComplete = radiusValue;

        if (isHobbyComplete && accordionItems[1]) openAccordion(accordionItems[1]);
        if (isLocationComplete && accordionItems[2]) openAccordion(accordionItems[2]);
        if (isDistanceComplete && accordionItems[3]) openAccordion(accordionItems[3]);
    }

    function openAccordion(item) {
        var collapse = item.querySelector(".accordion-collapse");
        if (collapse && !collapse.classList.contains("show")) {
            new bootstrap.Collapse(collapse, { show: true });
            setTimeout(function () { scrollToElement(item); }, 300);
        }
    }

    function showError(input, message) {
        if (!input || input.parentElement.querySelector(".error-message")) return;
        var err = document.createElement("div");
        err.className = "error-message text-danger small mt-1";
        err.textContent = message;
        input.parentElement.appendChild(err);
    }

    // Search
    function performSearch(params) {
        if (!userLocation) { window.alert("Please set your location first."); return; }
        if (!google || !google.maps || !google.maps.places) { window.alert("Google Maps not loaded."); return; }

        var radiusMeters = params.radiusMiles * 1609.34;
        var keyword = params.hobby ? params.hobby + (params.preference === "indoor" ? " indoor club" : params.preference === "outdoor" ? " outdoor club" : " club") : {
            sports: "sports club",
            crafting: "crafts club",
            music: "music group",
            gaming: "gaming club",
            social: "community group",
            outdoors: "outdoor adventure club"
        }[params.category] || "hobby club";

        var service = new google.maps.places.PlacesService(map);
        var request = { location: new google.maps.LatLng(userLocation.lat, userLocation.lng), radius: radiusMeters, keyword: keyword };

        clearMarkers();
        document.getElementById("carouselInner")?.replaceChildren();
        document.getElementById("hobby-results")?.replaceChildren();

        service.nearbySearch(request, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) { window.alert("No results found."); return; }

            var userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            results.sort(function (a, b) { return google.maps.geometry.spherical.computeDistanceBetween(userLatLng, a.geometry.location) - google.maps.geometry.spherical.computeDistanceBetween(userLatLng, b.geometry.location); });

            results.slice(0, 12).forEach(function (place, i) {
                var photoUrl = (place.photos && place.photos.length) ? place.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 }) : "https://via.placeholder.com/300x200?text=No+Image";

                // Card
                var hobbyContainer = document.getElementById("hobby-results");
                if (hobbyContainer) {
                    var col = document.createElement("div");
                    col.className = "col";
                    var card = document.createElement("div");
                    card.className = "card h-100 shadow-sm";
                    var img = document.createElement("img");
                    img.src = photoUrl;
                    img.alt = place.name;
                    img.className = "card-img-top";
                    img.style.objectFit = "cover";
                    img.style.height = "200px";
                    var body = document.createElement("div");
                    body.className = "card-body";
                    var title = document.createElement("h5");
                    title.className = "card-title";
                    title.textContent = place.name;
                    var addressP = document.createElement("p");
                    addressP.className = "card-text";
                    addressP.textContent = place.vicinity || place.formatted_address || "";
                    body.appendChild(title);
                    body.appendChild(addressP);
                    card.appendChild(img);
                    card.appendChild(body);
                    col.appendChild(card);
                    hobbyContainer.appendChild(col);
                }

                // Marker
                var marker = new google.maps.Marker({
                    map: map,
                    position: place.geometry.location,
                    title: place.name,
                    icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: new google.maps.Size(32, 32) }
                });
                markers.push(marker);

                marker.addListener("click", function () {
                    if (activeInfoWindow) activeInfoWindow.close();
                    activeInfoWindow = new google.maps.InfoWindow({
                        content: "<div><h6>" + place.name + "</h6><p>" + (place.vicinity || place.formatted_address || "") + '</p><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place.name) + '" target="_blank">View on Google Maps</a></div>'
                    });
                    activeInfoWindow.open(map, marker);
                });

                // Carousel
                var carouselInner = document.getElementById("carouselInner");
                if (carouselInner) {
                    var activeClass = i === 0 ? "active" : "";
                    carouselInner.innerHTML += '<div class="carousel-item ' + activeClass + '"><div class="d-flex flex-column flex-sm-row align-items-center"><img src="' + photoUrl + '" class="d-block me-sm-3 mb-3 mb-sm-0" style="max-width:300px;height:auto;border-radius:8px;"><div><h5>' + place.name + '</h5><p>' + (place.vicinity || "") + '</p><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place.name) + '" target="_blank">View on Google Maps</a></div></div></div>';
                }
            });

            var carouselElement = document.getElementById("carouselExampleControls");
            if (carouselElement) carouselElement.style.display = "block";
        });
    }

    // DOM Ready
    document.addEventListener("DOMContentLoaded", function () {
        // Tags
        var tagContainer = document.getElementById("interest-tags");
        if (tagContainer) INTERESTS.forEach(function (interest) {
            var tag = document.createElement("span");
            tag.className = "interest-tag tag active";
            tag.textContent = interest;
            tag.onclick = function () { tag.classList.toggle("active"); renderDiscoverResults(); };
            tagContainer.appendChild(tag);
        });

        renderDiscoverResults();

        // Accordion styling
        document.querySelectorAll(".accordion-item").forEach(function (item) { styleAccordionItem(item, BASE_PURPLE, "#fff"); });

        // Progressive accordion
        ["hobbyInput", "categorySelect", "radius", "indoorOutdoor", "manualLocation"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.addEventListener("input", checkAndOpenNext); el.addEventListener("change", checkAndOpenNext); }
        });

        // Form submit
        var searchForm = document.getElementById("searchForm");
        if (searchForm) {
            searchForm.addEventListener("submit", function (e) {
                e.preventDefault();
                document.querySelectorAll(".error-message").forEach(function (err) { err.remove(); });

                var hobby = document.getElementById("hobbyInput")?.value.trim() || "";
                var category = document.getElementById("categorySelect")?.value || "";
                var preference = document.getElementById("indoorOutdoor")?.value || "";
                var radiusVal = document.getElementById("radius")?.value.trim() || "";
                var valid = true;

                if (!hobby && !category) { showError(document.getElementById("hobbyInput"), "Enter a hobby or select a category."); showError(document.getElementById("categorySelect"), "Enter a hobby or select a category."); valid = false; }
                if (!preference) { showError(document.getElementById("indoorOutdoor"), "Select indoor or outdoor preference."); valid = false; }

                var radiusMiles = radiusVal ? Number(radiusVal) : 10;
                if (radiusVal && (Number.isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)) { showError(document.getElementById("radius"), "Distance must be between 1 and 100 miles."); valid = false; }

                if (!valid) return;

                performSearch({ hobby: hobby, category: category, preference: preference, radiusMiles: radiusMiles });
            });
        }

        // Manual location
        var manualLocationBtn = document.getElementById("manualLocationBtn");
        if (manualLocationBtn) {
            manualLocationBtn.addEventListener("click", function () {
                var address = document.getElementById("manualLocation")?.value.trim();
                if (!address) return window.alert("Please enter a location.");

                var originalText = manualLocationBtn.textContent;
                manualLocationBtn.disabled = true;
                manualLocationBtn.textContent = "Setting location...";

                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: address }, function (results, status) {
                    if (status === "OK" && results[0]) {
                        var locationData = results[0].geometry.location;
                        setUserLocation(locationData.lat(), locationData.lng(), "Your chosen location");
                        checkAndOpenNext();
                        window.alert("Location set to: " + results[0].formatted_address);
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

    // Expose initMap
    window.initMap = initMap;

}());
