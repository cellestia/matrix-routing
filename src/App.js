import { useEffect, useState, useRef } from "react";
import * as tt from "@tomtom-international/web-sdk-maps";
import * as ttapi from "@tomtom-international/web-sdk-services";
import "./App.css";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

function App() {
  const mapContainer = useRef();
  const [map, setMap] = useState({});
  const [longitude, setLongitude] = useState(15.645881);
  const [latitude, setLatitude] = useState(46.55465);
  const API_KEY = process.env.REACT_APP_API_KEY

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if(map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer ({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson,
      },
      paint: {
        'line-color': 'red',
        'line-width': 6
      }
    })
  }

  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map)
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }

    const destinations = []

    let map = tt.map({
      key: API_KEY,
      container: mapContainer.current,
      stylesVisibility: {
        trafficFlow: true,
        trafficIncidents: true,
      },
      center: [longitude, latitude],
      zoom: 13,
      language: "en-GB",
    });
    map.addControl(new tt.FullscreenControl());
    map.addControl(new tt.NavigationControl());

    setMap(map);

    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -40]
      }
      const popup = new tt.Popup({ offset: popupOffset}).setHTML('This is you!')
      popup.className = 'popup'
      const element =  document.createElement('div')
      element.className = 'marker'
      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
      .setLngLat([longitude, latitude])
      .addTo(map)

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLongitude(lngLat.lng)
        setLatitude(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()
    }

    addMarker()

      const sortDestinations = (locations) => {
        const pointsForDestinations = locations.map((destination) => {
          return convertToPoints(destination)
          })
          const callParameters = {
            key: API_KEY,
            destinations: pointsForDestinations,
            origins: [convertToPoints(origin)], 
          }

          return new Promise((resolve, reject) => {
            ttapi.services
            .matrixRouting(callParameters)
            .then((matrixAPIResults) => {
                const results = matrixAPIResults.matrix[0]
                const resultsArray = results.map((result, index) => {
                    return {
                      location: locations[index],
                      drivingtime: result.response.routeSummary.travelTimeInSeconds,
                    }
                })
                resultsArray.sort((a, b) => {
                  return a.drivingtime - b.drivingtime
                })
                const sortedLocations = resultsArray.map((result) => {
                  return result.location
                })
                resolve(sortedLocations)
            })
          })
        }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
          })
      })
    }

    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDeliveryMarker(e.lngLat, map)
      recalculateRoutes()
    })

    return () => 
      map.remove();
  }, [longitude, latitude, API_KEY]);


  return (
   <div className = "appContainer">
      <nav className = "nav">
        <h1>Matrix Routing</h1>
        <h2>Tom-Tom Maps</h2>
      </nav>
      <div ref = {mapContainer} className = "map" id = "map" />
      <div className = "poi">
        <div className = "searchBar">
          <h1 className="poi-title">Where to go?</h1>
          <input
            type = "text"
            id = "longitude"
            className = "longitude"
            placeholder = "Put in Longitude"
            onChange={(e) => { setLongitude(e.target.value) }}
          >

          </input>
          <input
            type = "text"
            id = "latitude"
            className = "latitude"
            placeholder = "Put in Latitude"
            onChange={(e) => { setLatitude(e.target.value) }}
          >
          </input>
        </div>
        <div className="instructions">
          <h3>How to use this App?</h3>
          <h4>Drag your position on the map. Click on the map to add delivery points. 
            Insert longitude and latitude to get around the world or use the commands
            on the upper right site.</h4>
        </div>
      </div>

    
    
    
    
    </div>

  );
}
export default App;