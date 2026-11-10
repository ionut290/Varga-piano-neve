# Piano Neve 2.0 — Collaudo su telefono (nessun deploy di produzione)
Questa check-list serve all'operatore e all'amministratore. Usare un ambiente **staging isolato**, non la pagina di produzione della build 73. Le regole Firestore attive sono condivise con Varga Gestionale e vanno prima esportate e revisionate.

## Preparazione
- Verificare che la pagina di staging riporti **74-dev**, non **73**.
- Usare due utenti Firebase di prova e dati non operativi; autorizzazioni validate nel Firebase Emulator.
- Annotare modello telefono, sistema operativo, browser, data/ora e connessione disponibile.
- Non utilizzare durante la guida per svolgere test manuali o configurare la schermata.

## Prove obbligatorie
1. Autenticarsi come operatore A, avviare un giro di prova, annotare data, percorso e identificativo.
2. Generare una registrazione di strada e disattivare Internet. Verificare che il giro rimanga attivo e il lavoro non venga dichiarato sincronizzato.
3. Tentare di terminare il giro offline: la chiusura deve essere rifiutata e il lavoro deve restare recuperabile.
4. Chiudere forzatamente la PWA e riaprirla ancora offline: verificare ripristino dei dati e assenza di duplicazioni.
5. Ripristinare la connessione. Aspettare conferma di sincronizzazione e controllare su Firestore che ogni record abbia esattamente lo stesso ID e valori.
6. Modificare lo stesso record durante un invio lento simulato: la versione più recente non deve scomparire dalla coda.
7. Accedere con operatore B sul medesimo dispositivo: il giro di A non deve comparire e non deve essere caricato a nome di B.
8. Accedere nuovamente con operatore A: verificare il recupero dei propri dati rimasti.
9. Provare l'apertura simultanea su due dispositivi dello stesso account: verificare la gestione del conflitto, in particolare dopo la scadenza della session lease.
10. Archiviare e terminare il giro con connessione stabile. Verificare che i dati in archivio siano presenti una sola volta e che la sessione attiva sia cancellata sia dal server sia dal dispositivo.
11. Verificare GPS scarso, permessi GPS negati, basso spazio di archiviazione, scheda in background, cambio rete e scadenza autenticazione.
12. Controllare il percorso rosso, blu, giallo e viabilità minore: le funzionalità della build 73 devono essere preservate.

## Criteri di accettazione
- Nessuna cancellazione di dati locali prima della conferma di sync.
- Nessun dato di A visibile o scrivibile da B.
- Regole Firestore finali allineate alle autorizzazioni del progetto condiviso.
- Test CI e Firebase Emulator verdi.
- Nessuna regressione GPS e navigazione.
- Approvazione responsabile prima del merge e del deploy.

## Avvertenze importanti
- Il tracciamento GPS continuo in background non è garantito da tutte le PWA.
- I salvataggi storici che usavano chiavi localStorage senza UID richiedono una migrazione esplicita in sicurezza; non importare automaticamente dati legacy senza attribuzione verificata.
- I test di emulator usano `tests/firestore.phase1.rules`: è una **fixture isolata**, non il file da distribuire in Firebase.
