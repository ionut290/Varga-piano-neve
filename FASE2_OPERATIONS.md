# Piano Neve 2.0 — Fase 2: review e rilascio

## Stato
La build `75-dev` è sviluppata esclusivamente sul ramo `develop/piano-neve-2-operations`. Non distribuire in produzione o unire al ramo `main` prima di verificare i criteri seguenti.

## Funzioni introdotte
- Centrale amministratore con mappa Leaflet e indicatori delle ultime posizioni per squadra autorizzata. Le posizioni dopo 120 secondi risultano **non aggiornate**.
- Anagrafica squadre (nome, UID Firebase dell'operatore) e mezzi (descrizione, targa opzionale).
- Assegnazione transazionale dei sette percorsi esistenti; un percorso attivo non può essere occupato da due squadre. L'amministratore deve liberarlo prima di riassegnarlo.
- Operatore: visualizzazione assegnazioni e scelta volontaria di condividere il GPS. Condivisione soltanto durante un giro attivo di **viabilità maggiore**, con app visibile, rete disponibile e precisione GPS accettabile; frequenza massima 1 aggiornamento ogni 20 secondi.
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

## Limiti noti da verificare
- La condivisione GPS live è implementata **solo per giri maggiori**; la viabilità minore resta gestita dall'app esistente.
- Il campo UID operatore va ricavato da Firebase Auth; la UI non consulta direttamente la lista `platformUsers`.
- Il geotracking in background non è affidabile su tutte le PWA, in particolare iOS. Un punto stale non è una posizione attuale.
- Assegnazione di un mezzo a più percorsi: non è ancora impedita lato server; valutare blocchi di disponibilità per mezzo se necessari.
- Le assegnazioni sono visibili nell'app operatore, ma i percorsi legacy restano selezionabili: l'assegnazione non è ancora un blocco della navigazione per le altre rotte.
- Non è presente una funzione per sincronizzare la posizione in assenza di connessione: volutamente, non viene creata una cronologia offline delle posizioni live.

## Accettazione
- CI unit test e Firebase Emulator test verdi.
- Login e permessi Firestore attivi verificati, senza regressioni su Gestionale.
- Test manuali browser mobile, percorso Rosso/Blu/Giallo e recupero offline della Fase 1.
- Due squadre sul campo, posizione consentita e revocata, refresh, dispositivo senza Internet e scadenza GPS.
- Staging separato, mai deploy automatico dalla PR.
