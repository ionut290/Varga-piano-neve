# Motore territoriale commesse (preparazione)

Il file `territory.js` espone `VargaTerritory.createResolver(geojson)` senza modificare i giri esistenti. Nessuna commessa viene creata e nessun PDF viene importato.

Input: GeoJSON FeatureCollection con geometrie Polygon/MultiPolygon in coordinate [longitudine, latitudine] EPSG:4326. Ogni feature deve indicare `municipality`/`comune` e `neighborhood`/`quartiere` nelle properties.

`resolver.list()` elenca le zone; `resolver.locate([lon,lat])` riconosce le zone contenenti un punto; `resolver.resolveStreet({name,coordinates:[[lon,lat],...]},{municipalities:['Bologna'],neighborhoods:['Navile','San Donato-San Vitale']})` restituisce tutte le zone attraversate, quelle selezionate e gli indicatori `ambiguous`, `matched`, `requiresReview`.

I filtri consentono più comuni e più quartieri; la geometria della strada prevale sul solo nome (es. Via Gramsci in comuni diversi). Una strada che attraversa confini conserva tutte le zone individuate. Per linee molto lunghe è opportuno densificare e usare dati di confine ufficiali prima dell'importazione reale.

Da integrare successivamente: UI selezione, caricamento confini ufficiali, parser PDF e conferma manuale delle vie ambigue. Non collegare automaticamente il modulo ai giri attivi senza test GPS e di regressione.
