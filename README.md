# Ancestral Atlas — GitHub Pages edition

A static, client-side family-history map. No backend, database, account login, or build command is required.

## Publish on GitHub Pages

1. Create a GitHub repository, for example `ancestral-atlas`.
2. Upload **all the files and folders in this directory** to the repository root. Keep `index.html`, JavaScript, CSS, JSON, and the `images/` folder together.
3. In the repository, open **Settings → Pages**.
4. Set **Build and deployment → Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Open the GitHub Pages URL after publication.

These are already static assets. Do not upload the `.openai` hosting manifest, a deployment archive, personal GEDCOM files, or any downloaded `ancestral-atlas-offline-*.html` family maps to a public repository.

## Privacy and storage

- **Imported people, relationships, coordinates, and preferences are stored in the visitor's own browser** using localStorage. They are never added to the site's files or GitHub repository by the application.
- Different visitors see independent data. Clearing browser/site data removes that visitor's family tree; it does not remove another visitor's data.
- **Clear all local data** permanently removes this application's saved tree, geocoding cache, and settings from the current browser. It cannot delete HTML exports already downloaded.
- The included `local-cities.json` allows many city names to be located without transmitting the search terms to a third party. When a city cannot be resolved, a visitor can explicitly opt into online geocoding; that sends **place names only** to OpenStreetMap Nominatim.
- The interactive base-map tiles still load over the internet from OpenStreetMap/CARTO-style providers. These providers receive the map tile coordinates and normal web request metadata, but the app does not send family names or relationship records. The **Download offline HTML** export instead embeds a simplified vector basemap and needs no network connection to view.
- A downloaded offline HTML **contains the entire exported family dataset**. Treat it as a sensitive personal file and share it only with intended recipients.
- Browser privacy modes, storage cleanup, or different browsers/devices can remove or isolate saved data. Keep a separate GEDCOM/CSV backup.

## Using the map

1. Tap **Import family tree**, choose a `.ged`, `.gedcom`, or `.csv` file on the dedicated import page.
2. Choose the reference person for GEDCOM imports, review optional online place lookup, and confirm the import.
3. Single tap a group for a member list; double tap to expand when markers fit within 100 km. Tap a name for details and clickable spouse/parent/child links.
4. Use **Offline HTML** to download a view-only, self-contained map populated from this browser's data.

## Data format

CSV requires `name,generation,location`. Optional columns include `branch`, `birthPlace`, `deathPlace`, `residence`, `latitude`, `longitude`, `id`, `relationship`, and `spouse`.

## Third-party data and libraries

- **Leaflet 1.9.4** — BSD-2-Clause. See `LEAFLET-LICENSE.txt`.
- **GeoNames cities15000** — geographical names data from [GeoNames](https://www.geonames.org/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Included as a compact city lookup table in `local-cities.json`. Attribution: GeoNames.
- **world-atlas countries-110m** — bundled world geography from [world-atlas](https://github.com/topojson/world-atlas), derived from Natural Earth public-domain data, in `world-110m.json`.
- Online basemap tiles include their required attribution inside the map.

All application JavaScript and CSS files are readable and can be modified directly without a build system.
