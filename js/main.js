(() => {
  "use strict";

  window.addEventListener("load", () => {
    // Check if user already made a choice
    const locationChoice = localStorage.getItem("locationChoice");

    if (!locationChoice) {
      setTimeout(() => {
        document.getElementById("locationPopup").classList.remove("hidden");
      }, 1000);
    }
  });

  // Handle Allow
  document.getElementById("allowLocation").addEventListener("click", () => {
    localStorage.setItem("locationChoice", "allowed");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("User's location:", position.coords);
          // Use position.coords.latitude & position.coords.longitude
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }

    document.getElementById("locationPopup").classList.add("hidden");
  });

  // Handle Deny
  document.getElementById("denyLocation").addEventListener("click", () => {
    localStorage.setItem("locationChoice", "denied");
    document.getElementById("locationPopup").classList.add("hidden");
    alert("Some features may not work without location access.");
  });

  // Constants
  const MAX_DISCOVER = 12;
  const INTERESTS = [
    "Creative",
    "Tech",
    "Physical",
    "Social",
    "Nature",
    "Relaxing"
  ];
  const BASE_PURPLE = "#6a1b9a";
  const GOOGLE_MAPS_API_KEY = "AIzaSyC_BOqOK7jLCjPYx5Me_p1rCxQZtFHDNPw";

  // Globals
  let map;
  let userLocation;
  let markers = [];
  let userMarker = null;
  let activeInfoWindow = null;
  let discoverResults = [];

  // Utilities
  const clearMarkers = () => {
    markers.forEach((m) => m.setMap(null));
    markers = [];
    if (userMarker) {
      userMarker.setMap(map);
      markers.push(userMarker);
    }
  };

  const lightenHexColor = (hex, factor) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.floor(r + (255 - r) * factor));
    const ng = Math.min(255, Math.floor(g + (255 - g) * factor));
    const nb = Math.min(255, Math.floor(b + (255 - b) * factor));
    return `rgb(${nr}, ${ng}, ${nb})`;
  };

  const styleAccordionItem = (item, bgColor, textColor, imgUrl) => {
    const button = item.querySelector(".accordion-button");
    const body = item.querySelector(".accordion-body");

    button.style.backgroundColor = bgColor;
    button.style.color = textColor;
    button.style.fontWeight = "700";
    button.style.border = "none";
    button.style.borderRadius = "0.5rem";

    body.style.display = "flex";
    body.style.alignItems = "center";
    body.style.gap = "20px";
    body.style.padding = "1rem";
    body.style.borderRadius = "0 0 0.5rem 0.5rem";
    body.style.backgroundColor = lightenHexColor(bgColor, 0.7);

    const label = body.querySelector("label");
    const input = body.querySelector("input, select");

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
      input.style.border = `1px solid ${textColor}`;
      input.style.borderRadius = "0.3rem";
      input.style.boxSizing = "border-box";
    }
  };

  // Discover Helpers
  const mapPlaceToTags = (place) => {
    const text = (
      place.name +
      " " +
      (place.types || []).join(" ")
    ).toLowerCase();
    const tags = [];

    const match = (regex, tag) => {
      if (regex.test(text)) tags.push(tag);
    };

    match(/art|gallery|painting|craft/, "Creative");
    match(/tech|computer|electronics|coding|software|maker/, "Tech");
    match(/gym|sport|fitness|dance|run|hike|climb|yoga|swim/, "Physical");
    match(/park|garden|outdoor|nature|trail/, "Nature");
    match(/community|club|social|bar|pub|cafe/, "Social");
    match(/spa|relax|massage|meditat|library/, "Relaxing");

    if (tags.length === 0) tags.push("Creative");
    return tags;
  };

  const renderDiscoverResults = () => {
    const container = document.getElementById("discover-results");
    if (!container) return;

    const activeTags = [
      ...document.querySelectorAll(".interest-tag.active"),
    ].map((t) => t.textContent);
    container.innerHTML = "";

    const filtered =
      activeTags.length === 0
        ? discoverResults
        : discoverResults.filter((p) =>
            p.tags.some((t) => activeTags.includes(t))
          );

    if (filtered.length === 0) {
      container.innerHTML =
        '<p class="text-center">No clubs match your selected interests.</p>';
      return;
    }

    filtered.forEach((place) => {
      const col = document.createElement("div");
      col.className = "col";

      const card = document.createElement("div");
      card.className = "card h-100 shadow-sm";

      const img = document.createElement("img");
      img.className = "card-img-top";
      img.style.objectFit = "cover";
      img.style.height = "200px";
      img.src =
        place.photo || "https://via.placeholder.com/300x200?text=No+Image";
      img.alt = place.name;

      const body = document.createElement("div");
      body.className = "card-body";

      const title = document.createElement("h5");
      title.className = "card-title";
      title.textContent = place.name;

      const address = document.createElement("p");
      address.className = "card-text";
      address.textContent = place.address;

      body.appendChild(title);
      body.appendChild(address);
      card.appendChild(img);
      card.appendChild(body);
      col.appendChild(card);

      container.appendChild(col);
    });
  };

  const loadDiscoverResults = (location) => {
    const service = new google.maps.places.Place(map);
    const request = { location, radius: 16093, keyword: "hobby club" }; // 10 miles

    service.nearbySearch(request, (results, status) => {
      if (
        status !== google.maps.places.Place.OK ||
        !results.length
      ) {
        console.warn("No default results found.");
        return;
      }

      const userLatLng = new google.maps.LatLng(location.lat, location.lng);
      results.sort((a, b) => {
        const d1 = google.maps.geometry.spherical.computeDistanceBetween(
          userLatLng,
          a.geometry.location
        );
        const d2 = google.maps.geometry.spherical.computeDistanceBetween(
          userLatLng,
          b.geometry.location
        );
        return d1 - d2;
      });

      discoverResults = results.slice(0, MAX_DISCOVER).map((place) => ({
        name: place.name,
        address: place.vicinity || place.formatted_address || "",
        photo:
          place.photos && place.photos.length
            ? place.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })
            : null,
        tags: mapPlaceToTags(place),
      }));

      renderDiscoverResults();
    });
  };

  // Google Map
  window.initMap = () => {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 50.266, lng: -5.052 },
      zoom: 10,
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          map.setCenter(userLocation);

          if (!userLocation) {
            alert(
              "Location access denied. Please enable location to search nearby clubs."
            );
            userLocation = { lat: 50.266, lng: -5.052 }; // fallback (Cornwall)
          }

          // Create a DOM node for the marker
          const markerContent = document.createElement("img");
          markerContent.src = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
          markerContent.style.width = "32px";
          markerContent.style.height = "32px";

          // Create the marker using AdvancedMarkerElement
          const userMarker = new google.maps.marker.AdvancedMarkerElement({
          position: userLocation, // your lat/lng object
          map: map,               // your map object
          title: "You are here",
          content: markerContent, // pass the DOM Node here
          });


          markers.push(userMarker); ({
            position: userLocation,
            map,
            title: "You are here",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });
          markers.push(userMarker);

          loadDiscoverResults(userLocation);

        },
        () => {
          console.warn("Geolocation failed; using fallback.");
          loadDiscoverResults({ lat: 50.266, lng: -5.052 });
        }
      );
    } else {
      loadDiscoverResults({ lat: 50.266, lng: -5.052 });
    }
  };

  // DOM Ready
  document.addEventListener("DOMContentLoaded", () => {
    // Interest Tags
    const tagContainer = document.getElementById("interest-tags");
    if (tagContainer) {
      INTERESTS.forEach((int) => {
        const tag = document.createElement("span");
        tag.className = "interest-tag tag active";
        tag.textContent = int;
        tag.onclick = () => {
          tag.classList.toggle("active");
          renderDiscoverResults();
        };
        tagContainer.appendChild(tag);
      });
    }

    renderDiscoverResults(); // initial empty render

    // Back to top
    const backToTopBtn = document.getElementById("backToTopBtn");
    window.addEventListener("scroll", () => {
      backToTopBtn.style.display = window.scrollY > 100 ? "block" : "none";
    });
    backToTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );

    // Accordion styling and progressive opening
    const accordionItems = document.querySelectorAll(".accordion-item");
    const icons = ["hobby", "location", "distance", "category"];

    accordionItems.forEach((item, idx) => {
      styleAccordionItem(
        item,
        BASE_PURPLE,
        "#fff",
        `assets/images/icons/${icons[idx]}.png`
      );
    });

    // Function to smoothly scroll to an element
    const scrollToElement = (element, offset = 100) => {
      const elementTop = element.offsetTop - offset;
      window.scrollTo({
        top: elementTop,
        behavior: "smooth",
      });
    };

    // Function to check if accordion section is complete and open next
    const checkAndOpenNext = () => {
      const hobbyValue = hobbyInput?.value.trim();
      const categoryValue = categorySelect?.value;
      const locationValue = document
        .getElementById("manualLocation")
        ?.value.trim();
      const radiusValue = radiusInput?.value.trim();
      const indoorOutdoorValue = indoorOutdoor?.value;

      // Check hobby/category section (first accordion)
      const isHobbyComplete = hobbyValue || categoryValue;

      // Check location section (second accordion)
      const isLocationComplete = userLocation || locationValue;

      // Check distance section (third accordion)
      const isDistanceComplete = radiusValue;

      // Check indoor/outdoor section (fourth accordion)
      const isIndoorOutdoorComplete = indoorOutdoorValue;

      // Open location accordion if hobby is complete
      if (isHobbyComplete && accordionItems[1]) {
        const locationCollapse = accordionItems[1].querySelector(
          ".accordion-collapse"
        );
        if (locationCollapse && !locationCollapse.classList.contains("show")) {
          const bsCollapse = new bootstrap.Collapse(locationCollapse, {
            show: true,
          });
          // Scroll to location section after a short delay to allow accordion to open
          setTimeout(() => {
            scrollToElement(accordionItems[1]);
          }, 300);
        }
      }

      // Open distance accordion if location is complete
      if (isLocationComplete && accordionItems[2]) {
        const distanceCollapse = accordionItems[2].querySelector(
          ".accordion-collapse"
        );
        if (distanceCollapse && !distanceCollapse.classList.contains("show")) {
          const bsCollapse = new bootstrap.Collapse(distanceCollapse, {
            show: true,
          });
          // Scroll to distance section after a short delay
          setTimeout(() => {
            scrollToElement(accordionItems[2]);
          }, 300);
        }
      }

      // Open indoor/outdoor accordion if distance is complete
      if (isDistanceComplete && accordionItems[3]) {
        const categoryCollapse = accordionItems[3].querySelector(
          ".accordion-collapse"
        );
        if (categoryCollapse && !categoryCollapse.classList.contains("show")) {
          const bsCollapse = new bootstrap.Collapse(categoryCollapse, {
            show: true,
          });
          // Scroll to indoor/outdoor section after a short delay
          setTimeout(() => {
            scrollToElement(accordionItems[3]);
          }, 300);
        }
      }
    };

    // Form Logic
    const hobbyInput = document.getElementById("hobbyInput");
    const indoorOutdoor = document.getElementById("indoorOutdoor");
    const radiusInput = document.getElementById("radius");
    const categorySelect = document.getElementById("categorySelect");
    const carouselInner = document.getElementById("carouselInner");
    const hobbyContainer = document.getElementById("hobby-results");
    const searchForm = document.getElementById("searchForm");

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

    // Also check when manual location is entered
    const manualLocationInput = document.getElementById("manualLocation");
    if (manualLocationInput) {
      manualLocationInput.addEventListener("input", checkAndOpenNext);
      manualLocationInput.addEventListener("change", checkAndOpenNext);
    }

    // Helper to show validation errors
    const showError = (input, message) => {
      if (!input) return;
      if (input.parentElement.querySelector(".error-message")) return;
      const err = document.createElement("div");
      err.className = "error-message text-danger small mt-1";
      err.textContent = message;
      input.parentElement.appendChild(err);
    };

    // Perform the Places search
    const performSearch = ({ hobby, category, preference, radiusMiles }) => {
      if (!userLocation) {
        alert(
          "Please set your location first (either allow location access or enter manually)."
        );
        return;
      }

      const radiusMeters = radiusMiles * 1609.34;
      let keyword = "";

      if (hobby) {
        keyword = hobby;
        if (preference === "indoor") {
          keyword += " indoor club";
        } else if (preference === "outdoor") {
          keyword += " outdoor club";
        } else {
          keyword += " club";
        }
      } else {
        const categoryKeywords = {
          sports: "sports club",
          crafting: "crafts club",
          music: "music group",
          gaming: "gaming club",
          social: "community group",
          outdoors: "outdoor adventure club",
        };
        keyword = categoryKeywords[category] || "hobby club";
      }

      const service = new google.maps.places.Place(map);
      const request = { location: userLocation, radius: radiusMeters, keyword };

      // Clear previous UI
      clearMarkers();
      carouselInner.innerHTML = "";
      hobbyContainer.innerHTML = "";

      service.nearbySearch(request, (results, status) => {
        if (
          status !== google.maps.places.Place.OK ||
          !results.length
        ) {
          alert("No results found.");
          return;
        }

        const userLatLng = new google.maps.LatLng(
          userLocation.lat,
          userLocation.lng
        );
        results.sort((a, b) => {
          const d1 = google.maps.geometry.spherical.computeDistanceBetween(
            userLatLng,
            a.geometry.location
          );
          const d2 = google.maps.geometry.spherical.computeDistanceBetween(
            userLatLng,
            b.geometry.location
          );
          return d1 - d2;
        });

        // Render grid & carousel max 12
        results.slice(0, 12).forEach((place, idx) => {
          const photoUrl =
            place.photos && place.photos.length
              ? place.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })
              : "https://placekittens.com/300/200";

          const col = document.createElement("div");
          col.className = "col";
          const card = document.createElement("div");
          card.className = "card h-100 shadow-sm";
          const img = document.createElement("img");
          img.src = photoUrl;
          img.alt = place.name;
          img.className = "card-img-top";
          img.style.objectFit = "cover";
          img.style.height = "200px";
          const body = document.createElement("div");
          body.className = "card-body";
          const title = document.createElement("h5");
          title.className = "card-title";
          title.textContent = place.name;
          const addressP = document.createElement("p");
          addressP.className = "card-text";
          addressP.textContent =
            place.vicinity || place.formatted_address || "";
          body.appendChild(title);
          body.appendChild(addressP);
          card.appendChild(img);
          card.appendChild(body);
          col.appendChild(card);
          hobbyContainer.appendChild(col);

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: place.geometry.location,
            title: place.name,
            icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          });
          markers.push(marker);

          marker.addListener("click", () => {
            if (activeInfoWindow) activeInfoWindow.close();
            const contentString = `<div><h6>${place.name}</h6><p>${
              place.vicinity || place.formatted_address || ""
            }</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              place.name
            )}" target="_blank">View on Google Maps</a></div>`;
            activeInfoWindow = new google.maps.InfoWindow({
              content: contentString,
            });
            activeInfoWindow.open(map, marker);
          });

          const activeClass = idx === 0 ? "active" : "";
          carouselInner.innerHTML += `<div class="carousel-item ${activeClass}"><div class="d-flex flex-column flex-sm-row align-items-center"><img src="${photoUrl}" class="d-block me-sm-3 mb-3 mb-sm-0" style="max-width:300px;height:auto;border-radius:8px;"><div><h5>${
            place.name
          }</h5><p>${
            place.vicinity || ""
          }</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            place.name
          )}" target="_blank">View on Google Maps</a></div></div></div>`;
        });

        const carouselElement = document.getElementById(
          "carouselExampleControls"
        );
        if (carouselElement) carouselElement.style.display = "block";
      });
    };

    // Form submission handler
    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        document
          .querySelectorAll(".error-message")
          .forEach((el) => el.remove());

        const hobby = hobbyInput.value.trim();
        const category = categorySelect.value;
        const preference = indoorOutdoor.value;
        const radiusVal = radiusInput.value.trim();

        let valid = true;

        if (!hobby && !category) {
          showError(hobbyInput, "Enter a hobby or select a category.");
          showError(categorySelect, "Enter a hobby or select a category.");
          valid = false;
        }
        if (!preference) {
          showError(indoorOutdoor, "Select indoor or outdoor preference.");
          valid = false;
        }
        const radiusMiles = radiusVal ? Number(radiusVal) : 100;
        if (
          radiusVal &&
          (isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 100)
        ) {
          showError(radiusInput, "Distance must be between 1 and 100 miles.");
          valid = false;
        }

        if (!valid) return;

        performSearch({ hobby, category, preference, radiusMiles });
      });
    }

    // Manual Location Handler - FIXED VERSION
    document
      .getElementById("manualLocationBtn")
      .addEventListener("click", () => {
        const address = document.getElementById("manualLocation").value.trim();
        const btn = document.getElementById("manualLocationBtn");

        if (!address) {
          alert("Please enter a location.");
          return;
        }

        // Add loading state
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Setting location...";

        // Build Geocoding API request
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`;

        fetch(geocodeUrl)
          .then((response) => response.json())
          .then((data) => {
            if (data.status === "OK") {
              const location = data.results[0].geometry.location;
              console.log("Manual location chosen:", location);

              // Update the global userLocation variable
              userLocation = {
                lat: location.lat,
                lng: location.lng,
              };

              // Center the map on the new location
              map.setCenter(userLocation);
              map.setZoom(12); // Adjust zoom level

              // Remove old user marker if it exists
              if (userMarker) {
                userMarker.setMap(null);
                // Remove from markers array
                markers = markers.filter((marker) => marker !== userMarker);
              }

              // Create new user marker at manual location
              userMarker = new google.maps.marker.AdvancedMarkerElement({
                position: userLocation,
                map: map,
                title: "Your chosen location",
                icon: {
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                },
              });
              markers.push(userMarker);

              // Reload discover results for the new location
              loadDiscoverResults(userLocation);

              // Check if next accordion should open
              checkAndOpenNext();

              alert(`Location set to: ${data.results[0].formatted_address}`);
            } else {
              alert("Could not find that location. Please try again.");
              console.error("Geocoding error:", data);
            }
          })
          .catch((error) => {
            console.error("Error fetching geocode:", error);
            alert("Something went wrong. Please try again.");
          })
          .finally(() => {
            // Restore button state
            btn.disabled = false;
            btn.textContent = originalText;
          });
      });
  });
})();
