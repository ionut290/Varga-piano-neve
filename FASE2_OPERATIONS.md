# Piano Neve 2.0 — Fase 2: review e rilascio

## Stato
La build `75-dev` è sviluppata esclusivamente sul ramo `develop/piano-neve-2-operations`. Non distribuire in produzione o unire al ramo `main` prima di verificare i criteri seguenti.

## Funzioni introdotte
- Centrale amministratore con mappa Leaflet e indicatori delle ultime posizioni per squadra autorizzata. Le posizioni dopo 120 secondi risultano **non aggiornate**.
- Anagrafica squadre (nome, UID Firebase dell'operatore) e mezzi (descrizione, targa opzionale).
- Assegnazione transazionale dei sette percorsi esistenti; un percorso attivo non può essere occupato da due squadre. L'amministratore deve liberarlo prima di riassegnarlo.
- Operatore: visualizzazione assegnazioni e scelta volontaria di condividere il GPS. Condivisione soltanto durante un giro attivo di **viabilità maggiore** o durante un intervento minore dichiarato in corso, con app visibile, rete disponibile e precisione GPS accettabile; frequenza massima 1 aggiornamento ogni 20 secondi.
- Spegnimento della condivisione con rimozione del punto, salvo indisponibilità momentanea della rete. Una posizione storica non va interpretata come live.

## Sicurezza — blocco distribuzione
`firestore.rules` è un file parziale e **NON** rispecchia necessariamente le regole attive del progetto `hera-app-6cd2b` condiviso con Varga Gestionale. La fixture `tests/firestore.phase1.rules` (ora estesa ai percorsi e al GPS) serve **solo** per emulator test e NON deve essere distribuita.

Per una successiva pubblicazione, l'amministratore deve:
1. Esportare la versione completa delle regole Firestore attive dal progetto Firebase, mantenendone una copia verificata.
2. Integrare **solo** i match delle collezioni `pianoNeveTeams`, `pianoNeveVehicles`, `pianoNeveAssignments`, `pianoNeveLivePositions` dopo verifica, senza cancellare regole degli altri servizi.
3. Validare che `platformUsers` contiene UID, `role`, `statoAccount` compatibili con le regole; trattare con cura gli account amministrativi basati su email e gli account legacy.
4. Confermare accessi a minimo privilegio per operatore, ufficio, amministratore, inattivo/bannato e non autenticato.
5. Definire informativa ai dipendenti, finalità e tempi di conservazione, accesso alle posizioni solo per autorizzati e cancellazione programmata dei punti non più necessari.
6. Confermare che il primo admin può creare anagrafiche e assegnazioni in staging e che nessuna regola sulle altre app è stata compromessa.

## Integrazioni successive sul ramo di sviluppo
- La selezione di un nuovo percorso ora richiede una **assegnazione attiva** per l'operatore; gli amministratori possono gestire i percorsi indipendentemente dall'assegnazione. La navigazione e i percorsi esistenti non sono stati rimossi.
- I giri di viabilità maggiore già salvati possono essere recuperati anche se l'assegnazione viene rimossa: questo evita di bloccare il salvataggio e la chiusura di un giro interrotto. Non è invece consentito avviare un nuovo giro maggiore senza una assegnazione attiva.
- L'invio delle posizioni GPS copre anche la viabilità minore **durante un intervento attivato**, oltre ai giri maggiori. Rimangono il consenso esplicito, le limitazioni di visibilità/precisione e la verifica dell'assegnazione.
- Una revoca o riassegnazione dell'incarico interrompe la condivisione volontaria e tenta di cancellare la posizione dell'operatore. Se il dispositivo è offline, può rimanere un vecchio punto che la centrale mostra come non aggiornato dopo 2 minuti.
- Le regole Firebase di produzione NON sono state cambiate: la gestione effettiva dell'accesso deve essere verificata sull'istanza Firebase condivisa prima di un rilascio.

## Limiti noti da verificare
- La condivisione GPS live riguarda i giri maggiori attivi e gli interventi minori avviati manualmente; per la viabilità minore non esiste ancora un giro cronologico completo lato cloud.
- Il campo UID operatore va ricavato da Firebase Auth; la UI non consulta direttamente la lista `platformUsers`.
- Il geotracking in background non è affidabile su tutte le PWA, in particolare iOS. Un punto stale non è una posizione attuale.
- Il client amministratore controlla atomicamente i sette slot delle assegnazioni e impedisce riuso di mezzo, operatore o squadra: le regole Firestore di produzione dovranno comunque difendersi da client modificati, idealmente con funzioni server transazionali.
- La scelta di un percorso passa da controllo di assegnazione attiva: se il servizio di lettura assegnazioni non è disponibile, si blocca la selezione per gli operatori. Gli amministratori possono selezionare ogni percorso. La navigazione e il ripristino dei giri legacy richiedono ancora una verifica sul dispositivo reale.
- Non è presente una funzione per sincronizzare la posizione in assenza di connessione: volutamente, non viene creata una cronologia offline delle posizioni live.

## Accettazione
- CI unit test e Firebase Emulator test verdi.
- Login e permessi Firestore attivi verificati, senza regressioni su Gestionale.
- Test manuali browser mobile, percorso Rosso/Blu/Giallo e recupero offline della Fase 1.
- Due squadre sul campo, posizione consentita e revocata, refresh, dispositivo senza Internet e scadenza GPS.
- Staging separato, mai deploy automatico dalla PR.

## Ulteriori verifiche richieste
- Se la condivisione GPS viene disattivata con il dispositivo offline, la richiesta di cancellazione non raggiunge Firestore: il punto remoto rimane fino al prossimo invio di rimozione o alla scadenza della finestra di freschezza. È necessario prevedere cancellazione periodica server-side prima della produzione.
- Le verifiche sulle assegnazioni sono lato client per l'operatività; la sicurezza dipende sempre dalle regole Firestore e dalle procedure di amministrazione.
- Prima del deploy bisogna esaminare le regole Firestore **attive**, non solo la fixture in test, e verificare i permessi del Varga Gestionale.
