/*jslint browser, for */
/*global google, bootstrap, console */

(function () {
    "use strict";

    // ============================
    // Constants
    // ============================
    var MAX_DISCOVER = 12;
    var INTERESTS = ["Creative", "Tech", "Physical", "Social", "Nature", "Relaxing"];
    var BASE_PURPLE = "#6a1b9a";

    // ============================
    // Globals
    // ============================
    var map;
    var userLocation;
    var markers = [];
    var userMarker = null;
    var activeInfoWindow = null;
    var discoverResults = [];
    var geocoder;

    // ============================
    // Utilities
    // ============================
    function clearMarkers() {
        markers.forEach(m => m.setMap(null));
        markers = [];
        if (userMarker) {
            userMarker.setMap(map);
            markers.push(userMarker);
        }
    }

    function lightenHexColor(hex, factor) {
        var r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return "rgb(" +
            Math.min(255, Math.floor(r + (255 - r) * factor)) + ", " +
            Math.min(255, Math.floor(g + (255 - g) * factor)) + ", " +
            Math.min(255, Math.floor(b + (255 - b) * factor)) + ")";
    }

    function styleAccordionItem(item, bgColor, textColor) {
        var button = item.querySelector(".accordion-button");
        var body = item.querySelector(".accordion-body");
        if (button) {
            button.style.backgroundColor = bgColor;
            button.style.color = textColor;
            button.style.fontWeight = "700";
            button.style.borderRadius = "0.5rem";
        }
        if (body) {
            body.style.display = "flex";
            body.style.alignItems = "center";
            body.style.gap = "20px";
            body.style.padding = "1rem";
            body.style.borderRadius = "0 0 0.5rem 0.5rem";
            body.style.backgroundColor = lightenHexColor(bgColor, 0.7);
        }
    }

    // ============================
    // Discover helpers
    // ============================
    function mapPlaceToTags(place) {
        var text = (place.name + " " + (place.types || []).join(" ")).toLowerCase();
        var tags = [];
        function match(regex, tag) { if (regex.test(text)) { tags.push(tag); } }
        match(/art|gallery|painting|craft/, "Creative");
        match(/tech|computer|electronics|coding|software|maker/, "Tech");
        match(/gym|sport|fitness|dance|run|hike|climb|yoga|swim/, "Physical");
        match(/park|garden|outdoor|nature|trail/, "Nature");
        match(/community|club|social|bar|pub|cafe/, "Social");
        match(/spa|relax|massage|meditat|library/, "Relaxing");
        if (!tags.length) { tags.push("Creative"); }
        return tags;
    }

    function renderDiscoverResults() {
        var container = document.getElementById("discover-results");
        if (!container) return;
        var activeTags = Array.from(document.querySelectorAll(".interest-tag.active")).map(t => t.textContent);
        var filtered = !activeTags.length ? discoverResults : discoverResults.filter(p => p.tags.some(t => activeTags.includes(t)));
        container.innerHTML = "";
        if (!filtered.length) {
            container.innerHTML = '<p class="text-center">No clubs match your selected interests.</p>';
            return;
        }
        filtered.forEach(place => {
            var col = document.createElement("div");
            col.className = "col";
            col.innerHTML = `
              <div class="card h-100 shadow-sm">
                <img class="card-img-top" style="object-fit:cover;height:200px" 
                     src="${place.photo || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                     alt="${place.name}">
                <div class="card-body">
                  <h5 class="card-title">${place.name}</h5>
                  <p class="card-text">${place.address}</p>
                </div>
              </div>`;
            container.appendChild(col);
        });
    }

    function loadDiscoverResults(location) {
        if (!google || !google.maps || !google.maps.places) return;
        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
            location: new google.maps.LatLng(location.lat, location.lng),
            radius: 16093,
            keyword: "hobby club"
        }, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) return;
            var userLatLng = new google.maps.LatLng(location.lat, location.lng);
            results.sort((a, b) =>
                google.maps.geometry.spherical.computeDistanceBetween(userLatLng, a.geometry.location) -
                google.maps.geometry.spherical.computeDistanceBetween(userLatLng, b.geometry.location));
            discoverResults = results.slice(0, MAX_DISCOVER).map(r => ({
                name: r.name,
                address: r.vicinity || r.formatted_address || "",
                photo: (r.photos && r.photos.length) ? r.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 }) : null,
                tags: mapPlaceToTags(r)
            }));
            renderDiscoverResults();
        });
    }

    // ============================
    // Map Init
    // ============================
    function initMap(lat, lng) {
        var center = (typeof lat === "number" && typeof lng === "number")
            ? { lat, lng }
            : { lat: 50.266, lng: -5.052 }; // Default: Cornwall

        map = new google.maps.Map(document.getElementById("map"), {
            center: center,
            zoom: (lat && lng) ? 13 : 10,
            mapId: "DEMO_MAP_ID"
        });

        geocoder = new google.maps.Geocoder();
        userLocation = center;

        if (lat && lng) {
            userMarker = new google.maps.Marker({
                position: center,
                map: map,
                title: "You are here",
                icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    scaledSize: new google.maps.Size(32, 32)
                }
            });
            markers.push(userMarker);
            loadDiscoverResults(userLocation);
        }
    }

    // ============================
    // Popup + Events
    // ============================
    window.addEventListener("load", function () {
        var choice = localStorage.getItem("locationChoice");
        if (!choice) {
            setTimeout(() => {
                document.getElementById("locationPopup")?.classList.remove("hidden");
            }, 1000);
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        var allowBtn = document.getElementById("allowLocation");
        var denyBtn = document.getElementById("denyLocation");
        var popup = document.getElementById("locationPopup");

        if (allowBtn) {
            allowBtn.addEventListener("click", function () {
                localStorage.setItem("locationChoice", "allowed");
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        pos => initMap(pos.coords.latitude, pos.coords.longitude),
                        err => { console.warn("Geolocation error:", err); initMap(); },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    alert("Geolocation not supported.");
                    initMap();
                }
                popup?.classList.add("hidden");
            });
        }

        if (denyBtn) {
            denyBtn.addEventListener("click", function () {
                localStorage.setItem("locationChoice", "denied");
                initMap();
                popup?.classList.add("hidden");
                alert("Some features may not work without location access.");
            });
        }

        // Manual Location Search
        var manualBtn = document.getElementById("manualLocationBtn");
        var manualInput = document.getElementById("manualLocation");
        if (manualBtn && manualInput) {
            manualBtn.addEventListener("click", function () {
                var address = manualInput.value.trim();
                if (!address) {
                    alert("Please enter a location.");
                    return;
                }
                if (!geocoder) {
                    alert("Google Maps not ready yet. Try again.");
                    return;
                }
                geocoder.geocode({ address: address }, (results, status) => {
                    if (status === "OK") {
                        var loc = results[0].geometry.location;
                        map.setCenter(loc);
                        map.setZoom(13);
                        if (userMarker) userMarker.setMap(null);
                        userMarker = new google.maps.Marker({
                            map: map,
                            position: loc,
                            title: address
                        });
                    } else {
                        alert("Geocode failed: " + status);
                    }
                });
            });
        }

        // ============================
        // Interests & Discover
        // ============================
        var container = document.getElementById("interests-container");
        if (container) {
            INTERESTS.forEach(tag => {
                var btn = document.createElement("button");
                btn.className = "btn btn-outline-primary interest-tag";
                btn.textContent = tag;
                btn.addEventListener("click", function () {
                    btn.classList.toggle("active");
                    renderDiscoverResults();
                });
                container.appendChild(btn);
            });
        }

        // Accordion styling
        document.querySelectorAll(".accordion-item").forEach(item => {
            styleAccordionItem(item, BASE_PURPLE, "#ffffff");
        });

        // Back to top
        var backToTopBtn = document.getElementById("backToTop");
        if (backToTopBtn) {
            window.addEventListener("scroll", function () {
                backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
            });
            backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
        }

        // Carousel
        var carousel = document.getElementById("discoverCarousel");
        if (carousel) {
            new bootstrap.Carousel(carousel, { interval: 5000, ride: "carousel" });
        }

        // Search Form
        var form = document.getElementById("searchForm");
        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var hobby = document.getElementById("hobby").value;
                var category = document.getElementById("category").value;
                var indoor = document.getElementById("indoorOutdoor").value;
                var radius = document.getElementById("radius").value;
                console.log("Search:", { hobby, category, indoor, radius });
                alert("Search started for " + hobby + " within " + radius + " miles.");
            });
        }
    });

    // Expose map init for Google callback
    window.initMap = initMap;

}());

