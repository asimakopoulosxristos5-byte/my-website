// ==========================================
// 🚒 ΚΡΟΥΝΟΙ ΑΧΑΪΑΣ
// ==========================================


// ==========================================
// 🔒 ΕΛΕΓΧΟΣ ΠΡΟΣΒΑΣΗΣ ΕΘΕΛΟΝΤΩΝ
// ==========================================
const SOMA_PASSWORD = '2001'; // <--- ΕΔΩ ΑΛΛΑΖΕΙΣ ΤΟΝ ΚΩΔΙΚΟ ΤΟΥ ΣΩΜΑΤΕΙΟΥ

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('loginModal');
    const input = document.getElementById('passwordInput');
    const btn = document.getElementById('loginButton');
    const errorMsg = document.getElementById('loginError');

    // Έλεγχος αν έχει ήδη μπει σωστός κωδικός σε αυτή τη συσκευή
    if (localStorage.getItem('vol_auth') === 'true') {
        if (modal) modal.style.display = 'none';
        return;
    }

    function checkPassword() {
        if (input.value === SOMA_PASSWORD) {
            localStorage.setItem('vol_auth', 'true');
            if (modal) modal.style.display = 'none';
            errorMsg.style.display = 'none';
        } else {
            errorMsg.style.display = 'block';
            input.value = '';
            input.focus();
        }
    }

    if (btn) btn.addEventListener('click', checkPassword);
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
        // Εστίαση στο πεδίο κωδικού κατά το άνοιγμα
        input.focus();
    }
});


// ==========================================
// ΧΑΡΤΗΣ
// ==========================================

const map = L.map('map').setView(
    [38.2466, 21.7346],
    11
);


// Φορτώνει την πιο πρόσφατη έκδοση της εφαρμογής από τον server,
// ενώ κρατά την τελευταία διαθέσιμη έκδοση για χρήση χωρίς σύνδεση.
if (
    'serviceWorker' in navigator
) {

    window.addEventListener(
        'load',
        function() {

            navigator.serviceWorker.register(
                'service-worker.js'
            );

        }
    );

}


// ==========================================
// OPENSTREETMAP
// ==========================================

L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:
            '&copy; OpenStreetMap contributors'
    }
).addTo(map);


// ==========================================
// ΔΕΔΟΜΕΝΑ
// ==========================================

let hydrants = [];


// ==========================================
// GPS
// ==========================================

let vehicleMarker = null;

let vehicleLat = null;

let vehicleLng = null;


// ==========================================
// ΚΟΝΤΙΝΟΤΕΡΟΣ
// ==========================================

let nearestHydrant = null;

let nearestDistance = null;


// ==========================================
// ΔΙΑΔΡΟΜΗ
// ==========================================

let routeLine = null;

let currentRoute = null;

let navigationFollowing = false;

let activeRouteTarget = null;


// ==========================================
// ΤΕΛΕΥΤΑΙΑ ΘΕΣΗ ROUTING
// ==========================================

let lastRouteLat = null;

let lastRouteLng = null;


// ==========================================
// ICON
// ==========================================

function createHydrantIcon(status) {

    let color = '#f39c12';


    if (status === 'Ενεργός') {

        color = '#2ecc71';

    }


    if (
        status === 'Εκτός λειτουργίας'
    ) {

        color = '#e74c3c';

    }


    if (
        status === 'Άγνωστη'
    ) {

        color = '#f1c40f';

    }


    return L.divIcon({

        className:
            'hydrant-icon',

        html: `

            <div
                class="hydrant-marker"
                style="
                    background-color:${color};
                "
            >

                🔥

            </div>

        `,

        iconSize: [
            34,
            34
        ],

        iconAnchor: [
            17,
            17
        ],

        popupAnchor: [
            0,
            -17
        ]

    });

}


// ==========================================
// NORMALIZE
// ==========================================

function normalizeText(text) {

    return text
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .toLowerCase()
        .trim();

}


function createVehicleIcon() {

    return L.divIcon({

        className:
            'vehicle-icon',

        html: `

            <div class="vehicle-marker">
                🚒
            </div>

        `,

        iconSize: [
            42,
            42
        ],

        iconAnchor: [
            21,
            21
        ],

        popupAnchor: [
            0,
            -21
        ]

    });

}


// ==========================================
// ROUTE DIRECTIONS
// ==========================================

function formatRouteDistance(distance) {

    if (distance < 1000) {

        return Math.round(distance) + ' μ.';

    }

    return (distance / 1000).toFixed(1) + ' χλμ.';

}


function getDirectionText(step) {

    const maneuver = step.maneuver || {};

    const road = step.name
        ? ' στην ' + step.name
        : '';

    const modifierText = {
        left: 'αριστερά',
        right: 'δεξιά',
        straight: 'ευθεία',
        'slight left': 'ελαφρά αριστερά',
        'slight right': 'ελαφρά δεξιά',
        'sharp left': 'απότομα αριστερά',
        'sharp right': 'απότομα δεξιά',
        uturn: 'αναστροφή'
    }[maneuver.modifier];

    if (maneuver.type === 'depart') {

        return 'Ξεκίνα' + road;

    }

    if (maneuver.type === 'arrive') {

        return 'Έφτασες στον κρουνό';

    }

    if (maneuver.type === 'roundabout' || maneuver.type === 'rotary') {

        const exit = maneuver.exit
            ? ' και βγες στην έξοδο ' + maneuver.exit
            : '';

        return 'Μπες στον κυκλικό κόμβο' + exit + road;

    }

    if (maneuver.type === 'merge') {

        return 'Μπες' + road;

    }

    if (maneuver.type === 'continue' || maneuver.type === 'new name') {

        return 'Συνέχισε ευθεία' + road;

    }

    if (maneuver.type === 'end of road') {

        return modifierText
            ? 'Στο τέλος του δρόμου στρίψε ' + modifierText + road
            : 'Συνέχισε' + road;

    }

    if (modifierText) {

        return 'Στρίψε ' + modifierText + road;

    }

    return 'Συνέχισε' + road;

}





// ==========================================
// ΦΟΡΤΩΣΗ ΚΡΟΥΝΩΝ
// ==========================================

fetch('hydrants.json')

    .then(response => {

        if (!response.ok) {

            throw new Error(
                'Δεν βρέθηκε το hydrants.json'
            );

        }

        return response.json();

    })

    .then(data => {

        hydrants = data;

        displayHydrants();

        // Show the full service area on first load, including the
        // imported hydrants in the Municipality of Western Achaea.
        if (hydrants.length > 0) {

            map.fitBounds(

                hydrants.map(
                    hydrant => [
                        hydrant.lat,
                        hydrant.lng
                    ]
                ),

                {
                    padding: [
                        40,
                        40
                    ],
                    maxZoom: 13
                }

            );

        }

    })

    .catch(error => {

        console.error(
            'Σφάλμα:',
            error
        );

    });


// ==========================================
// ΕΜΦΑΝΙΣΗ ΚΡΟΥΝΩΝ
// ==========================================
function displayHydrants() {
    const searchText = normalizeText(document.getElementById('searchInput')?.value || '');
    const selectedStatus = document.getElementById('statusFilter')?.value || 'all';
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';

    let visibleCount = 0;

    hydrants.forEach(hydrant => {
        const matchesSearch =
            normalizeText(hydrant.id || '').includes(searchText) ||
            normalizeText(hydrant.area || '').includes(searchText) ||
            normalizeText(hydrant.name || '').includes(searchText);

        const matchesStatus =
            selectedStatus === 'all' || hydrant.status === selectedStatus;

        // Έλεγχος κατηγορίας
       const matchesCategory =
    selectedCategory === 'all' ||
    (selectedCategory === 'hydrant' && hydrant.type !== 'Δεξαμενή' && hydrant.type !== 'Νοσοκομείο' && hydrant.type !== 'Ερυθρός Σταυρός') ||
    (selectedCategory === 'tank' && hydrant.type === 'Δεξαμενή') ||
    (selectedCategory === 'medical' && (hydrant.type === 'Νοσοκομείο' || hydrant.type === 'Ερυθρός Σταυρός'));

        if (matchesSearch && matchesStatus && matchesCategory) {
            if (!hydrant.marker) {
                const markerIcon =
                    hydrant.type === 'Δεξαμενή'
                        ? createTankIcon()
                        : (hydrant.type === 'Νοσοκομείο' || hydrant.type === 'Ερυθρός Σταυρός')
                            ? createMedicalIcon(hydrant.type)
                            : createHydrantIcon(hydrant.status);

                hydrant.marker = L.marker([hydrant.lat, hydrant.lng], { icon: markerIcon }).addTo(map);

                const symbol =
                    hydrant.type === 'Δεξαμενή' ? '🛢️' :
                    hydrant.type === 'Νοσοκομείο' ? '🏥' :
                    hydrant.type === 'Ερυθρός Σταυρός' ? '➕' : '🚒';

                hydrant.marker.bindPopup(`
                    <h3>${symbol} ${hydrant.name}</h3>
                    <p><strong>Κωδικός:</strong> ${hydrant.id}</p>
                    <p><strong>Περιοχή:</strong> ${hydrant.area}</p>
                    <p><strong>Κατάσταση:</strong> ${hydrant.status}</p>
                    <button
                        onclick="showRouteToHydrant(${hydrant.lat}, ${hydrant.lng})"
                        style="width:100%; padding:10px; background:#1976d2; color:white; border:none; border-radius:6px; font-weight:bold;"
                    >
                        🧭 ΔΕΙΞΕ ΔΙΑΔΡΟΜΗ
                    </button>
                `);
            }

            if (!map.hasLayer(hydrant.marker)) {
                hydrant.marker.addTo(map);
            }

            visibleCount++;
        } else {
            if (hydrant.marker && map.hasLayer(hydrant.marker)) {
                map.removeLayer(hydrant.marker);
            }
        }
    });

    const countEl = document.getElementById('hydrantCount');
    if (countEl) {
        countEl.textContent = visibleCount;
    }
}

// ==========================================
// SEARCH
// ==========================================




// ==========================================
// FILTER
// ==========================================




// ==========================================
// ΑΠΟΣΤΑΣΗ
// ==========================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371e3;


    const lat1Rad =
        lat1 *
        Math.PI /
        180;


    const lat2Rad =
        lat2 *
        Math.PI /
        180;


    const deltaLat =
        (lat2 - lat1) *
        Math.PI /
        180;


    const deltaLon =
        (lon2 - lon1) *
        Math.PI /
        180;


    const a =

        Math.sin(
            deltaLat / 2
        ) ** 2

        +

        Math.cos(
            lat1Rad
        )

        *

        Math.cos(
            lat2Rad
        )

        *

        Math.sin(
            deltaLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


// ==========================================
// ΚΟΝΤΙΝΟΤΕΡΟΣ ΚΡΟΥΝΟΣ
// ==========================================

function updateNearestHydrant() {


    if (
        vehicleLat === null ||
        vehicleLng === null
    ) {

        return;

    }


    let closest = null;

    let closestDistance =
        Infinity;


    hydrants.forEach(
        hydrant => {


            if (
                hydrant.status ===
                'Εκτός λειτουργίας'
            ) {

                return;

            }


            const distance =
                calculateDistance(

                    vehicleLat,
                    vehicleLng,

                    hydrant.lat,
                    hydrant.lng

                );


            if (
                distance <
                closestDistance
            ) {

                closest =
                    hydrant;

                closestDistance =
                    distance;

            }

        }
    );


    if (!closest) {

        return;

    }


    nearestHydrant =
        closest;


    nearestDistance =
        closestDistance;


    let distanceText;


    if (
        closestDistance <
        1000
    ) {

        distanceText =
            Math.round(
                closestDistance
            ) +
            ' μέτρα';

    }

    else {

        distanceText =
            (
                closestDistance /
                1000
            ).toFixed(2) +
            ' χλμ.';

    }


    document
        .getElementById(
            'nearestName'
        )
        .textContent =
        closest.name;


    document
        .getElementById(
            'nearestInfo'
        )
        .textContent =

        '📍 ' +
        (closest.area || 'Άγνωστη περιοχή') +

        ' | 📏 ' +
        distanceText +

        ' | 🟢 ' +
        (closest.status || 'Άγνωστη');


    const button =
        document.getElementById(
            'navigateButton'
        );


    button.disabled =
        false;


    button.onclick =
        function() {

            showRouteToHydrant(

                closest.lat,
                closest.lng

            );

        };

}


// ==========================================
// 🛣️ ΠΡΑΓΜΑΤΙΚΗ ΔΙΑΔΡΟΜΗ
// ==========================================

function showRouteToHydrant(
    hydrantLat,
    hydrantLng
) {


    if (
        vehicleLat === null ||
        vehicleLng === null
    ) {

        alert(
            'Δεν έχει βρεθεί ακόμα η θέση του οχήματος.'
        );

        return;

    }


    // Enter navigation-camera mode: keep the vehicle in view while GPS updates.
    navigationFollowing = true;

    activeRouteTarget = {
        lat: hydrantLat,
        lng: hydrantLng
    };

    map.setView(

        [
            vehicleLat,
            vehicleLng
        ],

        18,

        {
            animate: true
        }

    );


    // Keep the vehicle in the lower part of the screen, with the road ahead visible.
    map.panBy(
        [
            0,
            -Math.min(
                180,
                Math.round(
                    map.getSize().y * 0.25
                )
            )
        ],
        {
            animate: true,
            duration: 0.5
        }
    );


    const routePath =

        vehicleLng +
        ',' +
        vehicleLat +

        ';' +

        hydrantLng +
        ',' +
        hydrantLat +

        '?overview=full&geometries=geojson&steps=true';

    // Οι κρουνοί δεν βρίσκονται πάντα ακριβώς πάνω στη γραμμή του δρόμου.
    // Χωρίς αυστηρή ακτίνα snap, ο δρομολογητής βρίσκει τον κοντινότερο δρόμο.
    const routingServices = [
        'https://router.project-osrm.org/route/v1/driving/',
        'https://routing.openstreetmap.de/routed-car/route/v1/driving/'
    ];

    function fetchRoute(serviceIndex) {

        return fetch(
            routingServices[serviceIndex] + routePath
        )
            .then(response => {

                if (!response.ok) {

                    throw new Error(
                        'Routing error'
                    );

                }

                return response.json();

            })
            .catch(error => {

                if (
                    serviceIndex <
                    routingServices.length - 1
                ) {

                    return fetchRoute(
                        serviceIndex + 1
                    );

                }

                throw error;

            });

    }

    fetchRoute(0)

        .then(response => {

            const data = response;


            if (
                !data.routes ||
                data.routes.length === 0
            ) {

                alert(
                    'Δεν βρέθηκε διαδρομή.'
                );

                return;

            }


            const route =
                data.routes[0];


            currentRoute =
                route;


            // Το πάνελ οδηγιών δεν υπάρχει στην τρέχουσα σελίδα.
            // Συνέχισε κανονικά με την εμφάνιση της γραμμής της διαδρομής.
            if (
                typeof displayRouteDirections ===
                'function'
            ) {

                displayRouteDirections(
                    route
                );

            }


            // ==================================
            // ΑΦΑΙΡΕΣΗ ΠΑΛΙΑΣ ΔΙΑΔΡΟΜΗΣ
            // ==================================

            if (routeLine) {

                map.removeLayer(
                    routeLine
                );

            }


            // ==================================
            // ΝΕΑ ΔΙΑΔΡΟΜΗ
            // ==================================

            routeLine =
                L.geoJSON(

                    route.geometry,

                    {

                        style: {

                            color:
                                '#1976d2',

                            weight:
                                7,

                            opacity:
                                0.85

                        }

                    }

                ).addTo(map);


            // ==================================
            // ZOOM
            // ==================================

            if (!navigationFollowing) {

                map.fitBounds(

                    routeLine.getBounds(),

                    {

                        padding:
                            [
                                60,
                                60
                            ]

                    }

                );

            }


            // ==================================
            // ΑΠΟΣΤΑΣΗ
            // ==================================

            const distanceKm =

                (
                    route.distance /
                    1000
                ).toFixed(2);


            // ==================================
            // ΧΡΟΝΟΣ
            // ==================================

            const durationMinutes =

                Math.max(

                    1,

                    Math.round(
                        route.duration /
                        60
                    )

                );


            document
                .getElementById(
                    'nearestInfo'
                )
                .textContent =

                '🛣️ ' +
                distanceKm +
                ' km' +

                ' | ⏱️ ' +
                durationMinutes +
                ' λεπτά';


            // ==================================
            // ΦΩΝΗΤΙΚΗ ΕΝΗΜΕΡΩΣΗ
            // ==================================

            speak(

                'Η διαδρομή είναι ' +

                distanceKm +

                ' χιλιόμετρα. ' +

                'Ο εκτιμώμενος χρόνος είναι ' +

                durationMinutes +

                ' λεπτά.'

            );


            lastRouteLat =
                vehicleLat;


            lastRouteLng =
                vehicleLng;


        })

        .catch(error => {

            console.error(
                'Routing error:',
                error
            );


            alert(
                'Δεν μπορέσαμε να υπολογίσουμε τη διαδρομή.'
            );

        });

}


// ==========================================
// 🔊 ΦΩΝΗ
// ==========================================

function speak(text) {


    if (
        !('speechSynthesis'
            in window)
    ) {

        alert(
            'Η συσκευή δεν υποστηρίζει φωνητικές οδηγίες.'
        );

        return;

    }


    window.speechSynthesis.cancel();


    const message =
        new SpeechSynthesisUtterance(
            text
        );


    message.lang =
        'el-GR';


    message.rate =
        0.9;


    message.volume =
        1;


    window.speechSynthesis.speak(
        message
    );

}


// ==========================================
// ΚΟΥΜΠΙ ΦΩΝΗΣ
// ==========================================

document
    .getElementById(
        'voiceButton'
    )
    .addEventListener(
        'click',
        function() {


            if (
                !nearestHydrant
            ) {

                speak(
                    'Δεν έχει βρεθεί κοντινός κρουνός.'
                );

                return;

            }


            const distance =
                nearestDistance;


            let distanceText;


            if (
                distance < 1000
            ) {

                distanceText =

                    Math.round(
                        distance
                    ) +

                    ' μέτρα';

            }

            else {

                distanceText =

                    (
                        distance /
                        1000
                    ).toFixed(1) +

                    ' χιλιόμετρα';

            }


            speak(

                'Ο κοντινότερος ενεργός κρουνός είναι ' +

                nearestHydrant.name +

                ', στην περιοχή ' +

                nearestHydrant.area +

                ', σε απόσταση ' +

                distanceText

            );

        });


// ==========================================
// 📍 GPS
// ==========================================

function startGPS() {


    if (
        !navigator.geolocation
    ) {

        document
            .getElementById(
                'nearestName'
            )
            .textContent =
            'Το GPS δεν υποστηρίζεται.';

        return;

    }


    navigator.geolocation.watchPosition(

        function(position) {


            vehicleLat =
                position.coords.latitude;


            vehicleLng =
                position.coords.longitude;


            // ==================================
            // MARKER ΟΧΗΜΑΤΟΣ
            // ==================================

            if (
                !vehicleMarker
            ) {


                vehicleMarker =
                    L.marker(

                        [
                            vehicleLat,
                            vehicleLng
                        ],

                        {

                            icon:
                                createVehicleIcon()

                        }

                    ).addTo(map);


                vehicleMarker
                    .bindPopup(
                        '🚒 Η θέση του οχήματος'
                    );

            }

            else {


                vehicleMarker
                    .setLatLng(

                        [
                            vehicleLat,
                            vehicleLng
                        ]

                    );

            }


            if (navigationFollowing) {

                map.panTo(

                    [
                        vehicleLat,
                        vehicleLng
                    ],

                    {
                        animate: true,
                        duration: 0.7,
                        easeLinearity: 0.25
                    }

                );

                map.panBy(
                    [
                        0,
                        -Math.min(
                            180,
                            Math.round(
                                map.getSize().y * 0.25
                            )
                        )
                    ],
                    {
                        animate: true,
                        duration: 0.7,
                        easeLinearity: 0.25
                    }
                );

            }


            // ==================================
            // ΚΟΝΤΙΝΟΤΕΡΟΣ
            // ==================================

            updateNearestHydrant();


            // ==================================
            // ΑΥΤΟΜΑΤΟ RE-ROUTING
            // ==================================

            if (
                nearestHydrant &&
                lastRouteLat !== null
            ) {


                const moved =
                    calculateDistance(

                        lastRouteLat,
                        lastRouteLng,

                        vehicleLat,
                        vehicleLng

                    );


                if (
                    moved > 100
                ) {


                    if (activeRouteTarget) {

                        showRouteToHydrant(

                            activeRouteTarget.lat,
                            activeRouteTarget.lng

                        );

                    }

                }

            }

        },


        function(error) {

            console.error(
                'GPS error:',
                error
            );

        },


        {

            enableHighAccuracy:
                true,

            maximumAge:
                2000,

            timeout:
                10000

        }

    );

}


// ==========================================
// 📍 Η ΤΟΠΟΘΕΣΙΑ ΜΟΥ
// ==========================================

document
    .getElementById(
        'locationButton'
    )
    .addEventListener(
        'click',
        function() {


            if (
                vehicleLat === null
            ) {

                alert(
                    'Περιμένουμε το GPS...'
                );

                return;

            }


            map.setView(

                [
                    vehicleLat,
                    vehicleLng
                ],

                16

            );


            updateNearestHydrant();

        });


// ==========================================
// 🧭 ΠΛΟΗΓΗΣΗ GOOGLE MAPS
// ==========================================

function navigateToHydrant(
    lat,
    lng
) {


    const url =

        'https://www.google.com/maps/dir/?api=1' +

        '&destination=' +

        lat +

        ',' +

        lng;


    window.open(
        url,
        '_blank'
    );

}


// ==========================================
// ΕΝΑΡΞΗ GPS
// ==========================================

startGPS();
const toggleNearestBtn = document.getElementById('toggleNearestBtn');
const nearestPanel = document.getElementById('nearestPanel');

if (toggleNearestBtn && nearestPanel) {
    toggleNearestBtn.addEventListener('click', function() {
        nearestPanel.classList.toggle('is-hidden');
    });
}

function createTankIcon() {

    return L.divIcon({
        className: 'hydrant-icon',
        html: `<div class="hydrant-marker" style="background-color:#1976d2;">🛢️</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
    });
    
    
    



}
// ==========================================
// 🏥 ΝΟΣΟΚΟΜΕΙΑ & ΕΡΥΘΡΟΣ ΣΤΑΥΡΟΣ (ΞΕΧΩΡΙΣΤΑ)
// ==========================================
fetch('medical.json')
    .then(response => response.json())
    .then(locations => {
        locations.forEach(loc => {
            const symbol = loc.type === 'Νοσοκομείο' ? '🏥' : '➕';
            const bgColor = loc.type === 'Νοσοκομείο' ? '#ffffff' : '#d32f2f';

            const icon = L.divIcon({
                className: 'hydrant-icon',
                html: `<div class="hydrant-marker" style="background-color:${bgColor}; border-color:#d32f2f;">${symbol}</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17],
                popupAnchor: [0, -17]
            });

            L.marker([loc.lat, loc.lng], { icon: icon })
                .addTo(map)
                .bindPopup(`
                    <h3>${symbol} ${loc.name}</h3>
                    <p><strong>Περιοχή:</strong> ${loc.area}</p>
                    <button
                        onclick="showRouteToHydrant(${loc.lat}, ${loc.lng})"
                        style="width:100%; padding:10px; background:#1976d2; color:white; border:none; border-radius:6px; font-weight:bold;"
                    >
                        🧭 ΔΕΙΞΕ ΔΙΑΔΡΟΜΗ
                    </button>
                `);
        });
    })
    .catch(err => console.error('Σφάλμα φόρτωσης medical.json:', err));
    document.getElementById('categoryFilter')?.addEventListener('change', displayHydrants);
    

