# FaceBlock 🕵️‍♂️🚫

**FaceBlock** è un'estensione per Google Chrome progettata per proteggere la privacy visiva attraverso l'intelligenza artificiale. L'estensione rileva, riconosce e offusca dinamicamente i volti nelle pagine web e nei video di YouTube, offrendo all'utente il controllo totale su quali identità proteggere e come visualizzare l'oscuramento.

## ✨ Caratteristiche Principali

*   **Rilevamento e Riconoscimento Selettivo:** Carica le immagini dei volti che desideri oscurare. L'estensione utilizzerà il riconoscimento facciale per applicare il blocco solo a quelle specifiche identità.
*   **Target Toggle Control:** Ogni volto caricato nel database locale ha un interruttore ON/OFF dedicato per decidere in tempo reale chi oscurare durante la navigazione.
*   **Personalizzazione dell'Oscuramento:** 
    *   **Scelta del Colore:** È possibile selezionare il colore del cerchio che copre il volto per adattarlo alle proprie preferenze estetiche.
    *   **Overlay Cartoon:** In alternativa al cerchio, è possibile selezionare un'immagine precaricata (una faccia barrata in stile cartoon) da sovrapporre ai volti rilevati.
*   **Privacy-First:** L'elaborazione avviene interamente in locale sul dispositivo dell'utente tramite TensorFlow.js. Nessun dato biometrico o immagine viene inviata a server esterni.
*   **Modalità Editor Single-Image:** Carica una singola foto, seleziona i volti da oscurare tramite interruttori e scarica l'immagine protetta o condividila direttamente sui social (es. Facebook).
*   **Supporto Video (YouTube):** Offuscamento dinamico dei volti target in tempo reale durante la riproduzione video su YouTube.

## 🛠️ Stack Tecnologico

*   **JavaScript (ES6+):** Logica core e gestione asincrona.
*   **[face-api.js](https://github.com/justadudewhohacks/face-api.js/):** Rilevamento dei tratti somatici e generazione di descrittori facciali a 128 bit.
*   **Chrome Extension API (Manifest V3):** Integrazione con il browser e gestione dei background service workers.
*   **HTML5 Canvas & Web Share API:** Per l'editing delle immagini, il rendering delle maschere personalizzate e la condivisione rapida.
*   **IndexedDB:** Per il salvataggio sicuro dei template facciali e delle preferenze estetiche dell'utente.

## 🚀 Installazione (Sviluppatore)

1.  **Clona il repository:**
    ```bash
    git clone [https://github.com/Domenicos97/FaceBlock.git](https://github.com/Domenicos97/FaceBlock.git)
    ```
2.  Apri Chrome e vai a `chrome://extensions/`.
3.  Attiva la **Modalità sviluppatore** in alto a destra.
4.  Clicca su **Carica estensione non pacchettizzata**.
5.  Seleziona la cartella principale del progetto `FaceBlock`.

## ⚙️ Come Funziona

1.  **Configurazione:** L'utente carica i volti target e sceglie lo stile di oscuramento (colore specifico o icona cartoon).
2.  **Scansione DOM:** Il `content script` analizza le immagini e i player video di YouTube.
3.  **Matching:** Per ogni volto rilevato, l'estensione calcola la corrispondenza con i descrittori nel database.
4.  **Rendering Maschera:** Se viene trovato un match e l'interruttore è su ON, l'estensione disegna un cerchio del colore scelto o l'immagine cartoon sopra il volto identificato.

---

### Note sul Copyright
*Questo progetto utilizza modelli pre-addestrati distribuiti con la libreria face-api.js. I modelli vengono eseguiti esclusivamente sul client dell'utente.*
