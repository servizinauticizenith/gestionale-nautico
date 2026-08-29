import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import logoZenith from "./assets/logo_zenith.jpg";
import "./App.css";

const stati = [
  "In lavorazione",
  "Terminato",
];

const priorita = ["Bassa", "Normale", "Alta", "Urgente"];
const statiPreventivo = ["Da preparare", "Inviato", "Approvato",];

function nuovoLavoroVuoto() {
  return {
    id: "",
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    lavoro: "",
    interventiEseguiti: "",
    stato: "In lavorazione",
    priorita: "Normale",
    tecnico: "",
    ingresso: new Date().toISOString().slice(0, 10),
    consegna: "",
    ricambi: "",
    ricambiDettaglio: [],
    costoRicambi: "",
    oreManodopera: "",
    prezzoOra: "60",
    altro: "",
    acconto: "",
    pagamento: "Non pagato",   // ← AGGIUNGI QUESTA RIGA
    note: "",
  };
}

function nuovoPreventivoVuoto() {
  return {
    id: "",
    data: new Date().toISOString().slice(0, 10),
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    descrizione: "",
    altro: "",
    stato: "Da preparare",
    note: "",
  };
}

export default function App() {
  const [lavori, setLavori] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [rimessaggi, setRimessaggi] = useState([]);
  const [clientiDb, setClientiDb] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [utente, setUtente] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erroreLogin, setErroreLogin] = useState("");
  const [form, setForm] = useState(nuovoLavoroVuoto());
  const [lavoroInModifica, setLavoroInModifica] = useState(null);
  const [rimessaggioInModifica, setRimessaggioInModifica] = useState(null);
  const [formPreventivo, setFormPreventivo] = useState(nuovoPreventivoVuoto());
  const [ricercaClientePreventivo, setRicercaClientePreventivo] = useState("");
  const [formCliente, setFormCliente] = useState({
    
  cliente: "",
  telefono: "",
  barca: "",
  motore: "",
  matricola: "",
  note: "",
});
const [clienteInModifica, setClienteInModifica] = useState(null);
const [clienteAperto, setClienteAperto] = useState(null);
const [ordinaClientiPerSaldo, setOrdinaClientiPerSaldo] = useState(false);
const [ricercaGlobale, setRicercaGlobale] = useState("");
  const [preventivoInModifica, setPreventivoInModifica] = useState(null);
  const [ricerca, setRicerca] = useState("");
  const [ricercaClienteLavoro, setRicercaClienteLavoro] = useState("");
  const [filtroStato, setFiltroStato] = useState("Tutti");
  const [filtroPagamento, setFiltroPagamento] = useState("Tutti");
  const [filtroAnnoLavori, setFiltroAnnoLavori] = useState(
  new Date().getFullYear().toString()
);
const [filtroAnnoRimessaggi, setFiltroAnnoRimessaggi] = useState(
  new Date().getFullYear().toString()
);
  const [filtroPagamentoRimessaggi, setFiltroPagamentoRimessaggi] = useState("Tutti");
  const [vista, setVista] = useState("lavori");
  const [preventivoDaStampare, setPreventivoDaStampare] = useState(null);
  const [rimessaggioDaStampare, setRimessaggioDaStampare] = useState(null);
  const [lavoroDaStampare, setLavoroDaStampare] = useState(null);
  const [stampaElencoLavori, setStampaElencoLavori] = useState(false);
  const [stampaElencoRimessaggi, setStampaElencoRimessaggi] = useState(false);
  function modificaCliente(cliente) {
  setFormCliente({
    firebaseId: cliente.firebaseId || "",
    cliente: cliente.cliente || "",
    telefono: cliente.telefono || "",
    barca: cliente.barca || "",
    motore: cliente.motore || "",
    matricola: cliente.matricola || "",
    note: cliente.note || "",
  });

  setClienteInModifica(cliente.firebaseId);
  

  setVista("clienti");
}

  useEffect(() => {
    const stopAuth = onAuthStateChanged(auth, (user) => {
      setUtente(user);
      setCaricamento(false);
    });

    return () => stopAuth();
  }, []);

  useEffect(() => {
    if (!utente) {
      setLavori([]);
      setPreventivi([]);
      return;
    }

   const stopLavori = onSnapshot(collection(db, "lavori"), (snapshot) => {
  const dati = snapshot.docs
    .map((documento) => ({
      ...documento.data(),
      firebaseId: documento.id,
    }))
    .sort((a, b) => {
      if (a.stato === "Terminato" && b.stato !== "Terminato") return 1;
      if (a.stato !== "Terminato" && b.stato === "Terminato") return -1;

      if (!a.consegna) return 1;
      if (!b.consegna) return -1;

      return new Date(a.consegna) - new Date(b.consegna);
    });

  setLavori(dati);
});
const stopRimessaggi = onSnapshot(
  collection(db, "rimessaggi"),
  (snapshot) => {
    const dati = snapshot.docs.map((documento) => ({
      ...documento.data(),
      firebaseId: documento.id,
    }));

    setRimessaggi(dati);
  }
);

    const stopPreventivi = onSnapshot(collection(db, "preventivi"), (snapshot) => {
      const dati = snapshot.docs.map((documento) => ({
        firebaseId: documento.id,
        ...documento.data(),
      }));
      setPreventivi(dati);
    });

    const stopClienti = onSnapshot(collection(db, "clienti"), (snapshot) => {
      const dati = snapshot.docs.map((documento) => ({
        firebaseId: documento.id,
        ...documento.data(),
      }));
      setClientiDb(dati);
    });

   return () => {
  stopLavori();
  stopPreventivi();
  stopClienti();
  stopRimessaggi();
};
  }, [utente]);

  async function accedi(e) {
    e.preventDefault();
    setErroreLogin("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (errore) {
      console.log(errore.code, errore.message);
      setErroreLogin(errore.code || "Errore login");
    }
  }

  async function esci() {
    await signOut(auth);
  }
async function salvaCliente(e) {
  e.preventDefault();

  if (!formCliente.cliente.trim()) {
    alert("Inserisci il nome cliente");
    return;
  }

  const datiCliente = { ...formCliente };
  delete datiCliente.firebaseId;

  if (clienteInModifica) {
    await updateDoc(doc(db, "clienti", clienteInModifica), datiCliente);
    setClienteInModifica(null);
  } else {
    await addDoc(collection(db, "clienti"), {
      ...datiCliente,
      creatoIl: new Date().toISOString(),
    });
  }

  alert(clienteInModifica ? "Cliente aggiornato" : "Cliente salvato");

  setFormCliente({
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    note: "",
  });
}
  async function aggiungiLavoro(e) {
  e.preventDefault();

  if (!form.cliente.trim() || !form.lavoro.trim()) {
    alert("Inserisci almeno cliente e lavoro richiesto.");
    return;
  }

  const totaleRicambi = (form.ricambiDettaglio || []).reduce(
    (totale, ricambio) =>
      totale +
      numero(ricambio.quantita) *
        numero(ricambio.prezzo),
    0
  );

  let idLavoro = form.id;

  if (!idLavoro) {
    idLavoro = await generaNumeroLavoro();
  }

  const datiLavoro = {
    ...form,
    id: idLavoro,
    costoRicambi: String(totaleRicambi),
  };

  delete datiLavoro.firebaseId;

  if (lavoroInModifica) {
    await updateDoc(
      doc(db, "lavori", lavoroInModifica),
      datiLavoro
    );

    setLavoroInModifica(null);
  } else {
    await addDoc(
      collection(db, "lavori"),
      datiLavoro
    );
  }
alert("Lavoro salvato");
  setForm(nuovoLavoroVuoto());
}
async function generaNumeroRimessaggio() {
  const anno = new Date().getFullYear();
  const contatoreRef = doc(db, "contatori", `rimessaggi-${anno}`);

  const numeroProgressivo = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(contatoreRef);

    let prossimoNumero = 1;

    if (snapshot.exists()) {
      prossimoNumero = (snapshot.data().ultimoNumero || 0) + 1;
    }

    transaction.set(contatoreRef, {
      ultimoNumero: prossimoNumero,
      anno,
    });

    return prossimoNumero;
  });

  return `RIM-${anno}-${String(numeroProgressivo).padStart(4, "0")}`;
}

async function generaNumeroPreventivo() {
  const anno = new Date().getFullYear();
  const contatoreRef = doc(db, "contatori", `preventivi-${anno}`);

  const numeroProgressivo = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(contatoreRef);

    let prossimoNumero = 1;

    if (snapshot.exists()) {
      prossimoNumero = (snapshot.data().ultimoNumero || 0) + 1;
    }

    transaction.set(contatoreRef, {
      ultimoNumero: prossimoNumero,
      anno,
    });

    return prossimoNumero;
  });

  return `PREV-${anno}-${String(numeroProgressivo).padStart(4, "0")}`;
}
  async function generaNumeroLavoro() {
  const anno = new Date().getFullYear();
  const contatoreRef = doc(db, "contatori", `lavori-${anno}`);

  const numeroProgressivo = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(contatoreRef);

    let prossimoNumero = 1;

    if (snapshot.exists()) {
      prossimoNumero = (snapshot.data().ultimoNumero || 0) + 1;
    }

    transaction.set(contatoreRef, {
      ultimoNumero: prossimoNumero,
      anno,
    });

    return prossimoNumero;
  });

  return `LAV-${anno}-${String(numeroProgressivo).padStart(4, "0")}`;
}
async function salvaRimessaggio() {
  if (!form.cliente?.trim()) {
    alert("Inserisci il cliente.");
    return;
  }

  let idRimessaggio = form.id;

const formatoNuovo = /^RIM-\d{4}-\d{4}$/;

if (!idRimessaggio || !formatoNuovo.test(String(idRimessaggio))) {
  idRimessaggio = await generaNumeroRimessaggio();
}

const datiRimessaggio = {
  ...form,
  id: idRimessaggio,
  tipo: "rimessaggio",
};

  if (rimessaggioInModifica) {
    await updateDoc(
      doc(db, "rimessaggi", rimessaggioInModifica),
      datiRimessaggio
    );

    setRimessaggioInModifica(null);

    alert("Rimessaggio aggiornato");
  } else {
    await addDoc(
      collection(db, "rimessaggi"),
      datiRimessaggio
    );

    alert("Rimessaggio salvato");
  }

  setForm(nuovoLavoroVuoto());
}

  async function aggiungiPreventivo(e) {
    e.preventDefault();

    if (!formPreventivo.cliente.trim() || !formPreventivo.descrizione.trim()) {
      alert("Inserisci almeno cliente e descrizione preventivo.");
      return;
    }

    let idPreventivo = formPreventivo.id;

if (!idPreventivo) {
  idPreventivo = await generaNumeroPreventivo();
}

const datiPreventivo = {
  ...formPreventivo,
  id: idPreventivo,
};
    delete datiPreventivo.firebaseId;

    if (preventivoInModifica) {
  await updateDoc(doc(db, "preventivi", preventivoInModifica), datiPreventivo);
  setPreventivoInModifica(null);
} else {
  await addDoc(collection(db, "preventivi"), datiPreventivo);
}

alert("Preventivo salvato");

setFormPreventivo(nuovoPreventivoVuoto());
  }

  async function aggiornaCampo(firebaseId, campo, valore) {
    if (!firebaseId) return;
    await updateDoc(doc(db, "lavori", firebaseId), {
      [campo]: valore,
    });
  }

  async function aggiornaPreventivo(firebaseId, campo, valore) {
    if (!firebaseId) return;
    await updateDoc(doc(db, "preventivi", firebaseId), {
      [campo]: valore,
    });
  }

  async function eliminaLavoro(firebaseId) {
  const conferma = window.confirm(
    "Vuoi eliminare questo lavoro?"
  );

  if (!conferma) return;

  try {
    await deleteDoc(doc(db, "lavori", firebaseId));

    alert("Lavoro eliminato");
  } catch (errore) {
    console.error("Errore eliminazione lavoro:", errore);

    alert(
      "Errore durante eliminazione lavoro: " +
        errore.message
    );
  }
}

async function eliminaCliente(firebaseId) {
  if (!firebaseId) {
    alert("ID cliente mancante");
    return;
  }

  const conferma = window.confirm(
    "Vuoi eliminare questo cliente dall'archivio?"
  );

  if (!conferma) return;

  try {
    await deleteDoc(doc(db, "clienti", firebaseId));
    alert("Cliente eliminato");
  } catch (errore) {
    console.error("Errore eliminazione cliente:", errore);
    alert("Errore eliminazione cliente: " + errore.message);
  }
}

async function eliminaRimessaggio(firebaseId) {
  if (!firebaseId) {
    alert("ID rimessaggio mancante");
    return;
  }

  const conferma = window.confirm(
    "Vuoi eliminare questo rimessaggio?"
  );

  if (!conferma) return;

  try {
    await deleteDoc(
      doc(db, "rimessaggi", firebaseId)
    );

    alert("Rimessaggio eliminato");
  } catch (errore) {
    console.error(
      "Errore eliminazione rimessaggio:",
      errore
    );

    alert(
      "Errore durante eliminazione rimessaggio: " +
      errore.message
    );
  }
}

async function eliminaPreventivo(firebaseId) {
  if (!firebaseId) return;

  if (!confirm("Vuoi eliminare questo preventivo?"))
    return;

  await deleteDoc(
    doc(db, "preventivi", firebaseId)
  );

  if (preventivoInModifica === firebaseId) {
    annullaModificaPreventivo();
  }
}
  function modificaPreventivo(preventivo) {
    setVista("preventivi");
    setPreventivoInModifica(preventivo.firebaseId);
    setFormPreventivo({
      ...nuovoPreventivoVuoto(),
      ...preventivo,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function annullaModificaPreventivo() {
    setPreventivoInModifica(null);
    setFormPreventivo(nuovoPreventivoVuoto());
  }
function pulisciHtml(testo) {
  return String(testo || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
 function stampaPreventivo(preventivo) {
  const totale = calcolaTotale(preventivo);
  const manodopera = numero(preventivo.oreManodopera) * numero(preventivo.prezzoOra);

  const finestra = window.open("", "_blank");

  finestra.document.write(`
    <html>
      <head>
        <title>Preventivo ${preventivo.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            padding: 30px;
          }
            .logo-text h1 {
  margin: 0;
  font-size: 20px;
  color: #0b3b60;
}

.logo-text p {
  margin-top: 4px;
  font-size: 12px;
  color: #4b5563;
}

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #0b3b60;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .logoArea {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .logo {
            width: 84px;
            height: auto;
          }

          h1 {
            margin: 0;
            font-size: 20px;
          }
            p {
  margin: 2px 0;
  font-size: 10px;
}

          h2 {
            font-size: 18px;
            margin-bottom: 10px;
          }

          .docInfo {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

        .section {
  border: 1px solid #d1d5db;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
}

         .twoCols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

          .priceRows div {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .total {
            font-size: 20px;
            font-weight: bold;
            border-top: 2px solid #111827;
            border-bottom: none !important;
            margin-top: 10px;
            padding-top: 14px;
          }

          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 150px;
          }

          .signatureLine {
            border-bottom: 1px solid #111827;
            height: 50px;
          }

          .small {
  margin-top: 30px;
  font-size: 12px;
  color: #4b5563;
}

.pageBreak {
  page-break-before: always;
}
        </style>
      </head>

      <body>
        <div class="header">
          <div class="logoArea">
            <img src="${logoZenith}" class="logo" />
            <div>
              <h1>Servizi Nautici Zenith</h1>
              <p>Vendita e assistenza di motori e imbarcazioni</p>
            </div>
          </div>

          <div class="docInfo">
            <strong>Preventivo</strong>
            <span>${preventivo.id || "-"}</span>
            <span>${formatData(preventivo.data)}</span>
          </div>
        </div>

        <div class="section twoCols">
          <div>
            <h2>Dati cliente</h2>
            <p><strong>Cliente:</strong> ${preventivo.cliente || "-"}</p>
            <p><strong>Telefono:</strong> ${preventivo.telefono || "-"}</p>
          </div>

          <div>
            <h2>Imbarcazione</h2>
            <p><strong>Barca:</strong> ${preventivo.barca || "-"}</p>
            <p><strong>Motore:</strong> ${preventivo.motore || "-"}</p>
            <p><strong>Matricola:</strong> ${preventivo.matricola || "-"}</p>
          </div>
        </div>

        <div class="section">
 <h2 style="text-align: center;">Descrizione</h2>

  <div
    style="
      min-height: 220px;
white-space: pre-wrap;
padding-top: 10px;
    "
  >
    ${preventivo.descrizione || "-"}
  </div>
</div>
<div class="section">
 <h2 style="text-align: center;">Ricambi</h2>

  <div
  style="
    min-height: 350px;
    white-space: pre-wrap;
    padding-top: 10px;
  "
>
  ${preventivo.ricambi || "-"}
</div>
</div>

        <div class="section pageBreak">
  <div class="header">
    <div class="logoArea">
      <img src="${logoZenith}" class="logo" />
      <div>
        <h1>Servizi Nautici Zenith</h1>
        <p>Vendita e assistenza di motori e imbarcazioni</p>
      </div>
    </div>

    <div class="docInfo">
      <strong>Preventivo</strong>
      <span>${preventivo.id || "-"}</span>
      <span>${formatData(preventivo.data)}</span>
    </div>
  </div>

  <div class="section twoCols" style="margin-bottom: 70px;">
    <div>
      <h2>Dati cliente</h2>
      <p><strong>Cliente:</strong> ${preventivo.cliente || "-"}</p>
      <p><strong>Telefono:</strong> ${preventivo.telefono || "-"}</p>
    </div>

    <div>
      <h2>Imbarcazione</h2>
      <p><strong>Barca:</strong> ${preventivo.barca || "-"}</p>
      <p><strong>Motore:</strong> ${preventivo.motore || "-"}</p>
      <p><strong>Matricola:</strong> ${preventivo.matricola || "-"}</p>
    </div>
  </div>

  <h2>Dettaglio costi</h2>

  <div class="priceRows">
    <div>
      <span>Ricambi</span>
      <strong>${euro(preventivo.costoRicambi || 0)}</strong>
    </div>

    <div>
      <span>Manodopera (${preventivo.oreManodopera || 0} h × ${euro(preventivo.prezzoOra || 0)})</span>
      <strong>${euro(manodopera)}</strong>
    </div>

    <div>
      <span>Altro</span>
      <strong>${euro(preventivo.altro || 0)}</strong>
    </div>

    <div class="total">
      <span>Totale preventivo</span>
      <strong>${euro(totale)}</strong>
    </div>
  </div>
</div>

       <div class="section">
  <h2>Note</h2>

  <div
    style="
      min-height: 80px;
      white-space: pre-wrap;
      padding-top: 10px;
    "
  >
    ${preventivo.note || "-"}
  </div>
</div>

        <div class="footer">
          <div>
            <strong>Firma cliente</strong>
            <div class="signatureLine"></div>
          </div>

          <div>
            <strong>Firma cantiere</strong>
            <div class="signatureLine"></div>
          </div>
        </div>
<p style="margin-top: 30px; font-size: 12px;">
  Validità offerta: 7 giorni
</p>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  finestra.document.close();
}

  function compilaPreventivoDaLavoro(lavoro) {
  setVista("preventivi");
  setPreventivoInModifica(null);

  setFormPreventivo({
    ...nuovoPreventivoVuoto(),
    cliente: lavoro.cliente || "",
    telefono: lavoro.telefono || "",
    barca: lavoro.barca || "",
    motore: lavoro.motore || "",
    matricola: lavoro.matricola || "",
    descrizione: lavoro.lavoro || "",
    note: lavoro.note || "",
  });
}
  async function creaLavoroDaPreventivo(preventivo) {
  if (!confirm("Vuoi trasformare questo preventivo in un lavoro?")) return;

  try {
    const nuovoLavoro = {
      ...nuovoLavoroVuoto(),
      cliente: preventivo.cliente || "",
      telefono: preventivo.telefono || "",
      barca: preventivo.barca || "",
      motore: preventivo.motore || "",
      matricola: preventivo.matricola || "",
      lavoro: preventivo.descrizione || "",
      ricambi: preventivo.ricambi || "",
      note: preventivo.note || "",
      stato: "In lavorazione",
      ingresso: new Date().toISOString().slice(0, 10),
    };

    await addDoc(collection(db, "lavori"), nuovoLavoro);

    await deleteDoc(doc(db, "preventivi", preventivo.firebaseId));

    alert("Preventivo trasformato in lavoro ed eliminato dai preventivi.");

    setVista("lavori");
  } catch (errore) {
    console.error("Errore conversione preventivo:", errore);
    alert("Errore: il preventivo non è stato eliminato. Controlla la console.");
  }
}

  const clienti = useMemo(() => {
    const archivio = {};

    lavori.forEach((lavoro) => {
      const nome = (lavoro.cliente || "").trim();
      if (!nome) return;

      if (!archivio[nome]) {
        archivio[nome] = {
          nome,
          telefono: lavoro.telefono || "",
          barche: new Set(),
          motori: new Set(),
          matricole: new Set(),
          lavori: 0,
          ultimoIngresso: lavoro.ingresso || "",
        };
      }

      archivio[nome].lavori += 1;
      if (lavoro.telefono) archivio[nome].telefono = lavoro.telefono;
      if (lavoro.barca) archivio[nome].barche.add(lavoro.barca);
      if (lavoro.motore) archivio[nome].motori.add(lavoro.motore);
      if (lavoro.matricola) archivio[nome].matricole.add(lavoro.matricola);

      if (lavoro.ingresso && lavoro.ingresso > archivio[nome].ultimoIngresso) {
        archivio[nome].ultimoIngresso = lavoro.ingresso;
      }
    });

    return Object.values(archivio).map((cliente) => ({
      ...cliente,
      barche: Array.from(cliente.barche).join(", "),
      motori: Array.from(cliente.motori).join(", "),
      matricole: Array.from(cliente.matricole).join(", "),
    }));
  }, [lavori]);

  const lavoriFiltrati = useMemo(() => {
  return lavori.filter((lavoro) => {
    const testo = [
  lavoro.id,
  lavoro.cliente,
  lavoro.titolo,
  lavoro.barca,
  lavoro.motore,
  lavoro.matricola,
]
  .join(" ")
  .toLowerCase();

    const matchRicerca = testo.includes(ricerca.toLowerCase());

    const matchStato =
      filtroStato === "Tutti" ||
      (lavoro.stato || "").trim().toLowerCase() ===
        filtroStato.trim().toLowerCase();

    const pagamentoLavoro = lavoro.pagamento || "Non pagato";

    const matchPagamento =
      filtroPagamento === "Tutti" ||
      pagamentoLavoro === filtroPagamento;

    const annoLavoro = lavoro.ingresso
      ? new Date(lavoro.ingresso).getFullYear().toString()
      : "";

    const matchAnno =
      filtroAnnoLavori === "Tutti" ||
      annoLavoro === filtroAnnoLavori;

    return (
      matchRicerca &&
      matchStato &&
      matchPagamento &&
      matchAnno
    );
  });
}, [
  lavori,
  ricerca,
  filtroStato,
  filtroPagamento,
  filtroAnnoLavori,
]);
  

  const preventiviFiltrati = useMemo(() => {
    return preventivi.filter((preventivo) => {
      const testo = [
  preventivo.id,
  preventivo.cliente,
  preventivo.titolo,
  preventivo.barca,
  preventivo.motore,
  preventivo.matricola,
]
  .join(" ")
  .toLowerCase();
      return testo.includes(ricerca.toLowerCase());
    });
  }, [preventivi, ricerca]);
  
  const rimessaggiFiltrati = useMemo(() => {
  return rimessaggi.filter((r) => {
    const testo = [
  r.id,
  r.cliente,
  r.barca,
  r.motore,
  r.matricola,
]
  .join(" ")
  .toLowerCase();

const matchRicerca =
  ricerca === "" ||
  testo.includes(ricerca.toLowerCase());

    const pagamentoRimessaggio = r.pagamento || "Da pagare";

const matchPagamento =
  filtroPagamentoRimessaggi === "Tutti" ||
  (
    filtroPagamentoRimessaggi === "Da pagare" &&
    (
      pagamentoRimessaggio === "Da pagare" ||
      pagamentoRimessaggio === "Non pagato"
    )
  ) ||
  pagamentoRimessaggio === filtroPagamentoRimessaggi;

    const annoRimessaggio = r.ingresso
      ? new Date(r.ingresso).getFullYear().toString()
      : "";

    const matchAnno =
      filtroAnnoRimessaggi === "Tutti" ||
      annoRimessaggio === filtroAnnoRimessaggi;

    return matchRicerca && matchPagamento && matchAnno;
  });
}, [
  rimessaggi,
  filtroPagamentoRimessaggi,
  filtroAnnoRimessaggi,
  ricerca,
]);
   
  const clientiFiltrati = useMemo(() => {
    return clienti.filter((cliente) => {
      const testo = Object.values(cliente).join(" ").toLowerCase();
      return testo.includes(ricerca.toLowerCase());
    });
  }, [clienti, ricerca]);



  const riepilogo = {
  aperti: lavori.filter(
    (l) => !["Terminato", "Consegnato"].includes(l.stato)
  ).length,

  urgenti: lavori.filter(
    (l) => ["Alta", "Urgente"].includes(l.priorita)
  ).length,

  attesaRicambi: lavori.filter(
    (l) => l.stato === "Attesa ricambi"
  ).length,
  rimessaggiDaIncassare: rimessaggi.filter(
  (r) =>
    r.pagamento === "Da pagare" ||
    r.pagamento === "Non pagato" ||
    !r.pagamento
).length,
totaleRimessaggiDaIncassare: rimessaggi
  .filter(
    (r) =>
      r.pagamento === "Da pagare" ||
      r.pagamento === "Non pagato" ||
      !r.pagamento
  )
  .reduce((totale, r) => {
    const saldo =
      numero(r.prezzoRimessaggio) -
      numero(r.acconto);

    return totale + Math.max(0, saldo);
  }, 0),

  preventivi: preventivi.length,

  daIncassare: lavori.filter(
    (l) => (l.pagamento || "Non pagato") === "Non pagato"
  ).length,
  totaleDaIncassare: lavori
  .filter(
    (l) => (l.pagamento || "Non pagato") === "Non pagato"
  )
  .reduce((totale, l) => {
    const totaleLavoro =
      numero(l.costoRicambi) +
      numero(l.oreManodopera) * numero(l.prezzoOra) +
      numero(l.altro);

    const saldo =
      totaleLavoro - numero(l.acconto);

    return totale + Math.max(0, saldo);
  }, 0),
};

  const totaleFormPreventivo = calcolaTotale(formPreventivo);
  const risultatiRicercaGlobale = useMemo(() => {
  const q = ricercaGlobale.trim().toLowerCase();

  if (!q) return [];

  const risultati = [];

  clientiDb.forEach((cliente) => {
    const testo = [
      cliente.cliente,
      cliente.telefono,
      cliente.barca,
      cliente.motore,
      cliente.matricola,
    ]
      .join(" ")
      .toLowerCase();

    if (testo.includes(q)) {
      risultati.push({
        tipo: "cliente",
        dati: cliente,
      });
    }
  });

  lavori.forEach((lavoro) => {
    const testo = [
      lavoro.id,
      lavoro.cliente,
      lavoro.titolo,
      lavoro.barca,
      lavoro.motore,
      lavoro.matricola,
    ]
      .join(" ")
      .toLowerCase();

    if (testo.includes(q)) {
      risultati.push({
        tipo: "lavoro",
        dati: lavoro,
      });
    }
  });

  preventivi.forEach((preventivo) => {
    const testo = [
      preventivo.id,
      preventivo.cliente,
      preventivo.titolo,
      preventivo.barca,
      preventivo.motore,
      preventivo.matricola,
    ]
      .join(" ")
      .toLowerCase();

    if (testo.includes(q)) {
      risultati.push({
        tipo: "preventivo",
        dati: preventivo,
      });
    }
  });

  rimessaggi.forEach((rimessaggio) => {
    const testo = [
      rimessaggio.id,
      rimessaggio.cliente,
      rimessaggio.barca,
      rimessaggio.motore,
      rimessaggio.matricola,
    ]
      .join(" ")
      .toLowerCase();

    if (testo.includes(q)) {
      risultati.push({
        tipo: "rimessaggio",
        dati: rimessaggio,
      });
    }
  });

  return risultati.sort((a, b) => {
  const clienteA = (a.dati.cliente || "").toLowerCase();
  const clienteB = (b.dati.cliente || "").toLowerCase();

  if (clienteA < clienteB) return -1;
  if (clienteA > clienteB) return 1;

  return a.tipo.localeCompare(b.tipo);
});
}, [
  ricercaGlobale,
  clientiDb,
  lavori,
  preventivi,
  rimessaggi,
]);
  const clientiRicercatiLavoro = clientiDb.filter((cliente) => {
  const testo = [
    cliente.cliente,
    cliente.telefono,
    cliente.barca,
    cliente.motore,
    cliente.matricola,
  ]
    .join(" ")
    .toLowerCase();

return testo.includes(ricerca.toLowerCase());});
const clientiOrdinati = [...clientiRicercatiLavoro];

if (ordinaClientiPerSaldo) {
  clientiOrdinati.sort((a, b) => {
    const saldoCliente = (cliente) => {
      const lavoriCliente = lavori.filter(
        (lavoro) => lavoro.cliente === cliente.cliente
      );

      const rimessaggiCliente = rimessaggi.filter(
        (rimessaggio) => rimessaggio.cliente === cliente.cliente
      );

      const saldoLavori = lavoriCliente.reduce((totale, lavoro) => {
        if (
          lavoro.pagamento === "Pagato" ||
          lavoro.pagamento === "Fatturato"
        ) {
          return totale;
        }

        const totaleLavoro =
          numero(lavoro.costoRicambi) +
          numero(lavoro.oreManodopera) * numero(lavoro.prezzoOra) +
          numero(lavoro.altro);

        return totale + Math.max(
          0,
          totaleLavoro - numero(lavoro.acconto)
        );
      }, 0);

      const saldoRimessaggi = rimessaggiCliente.reduce(
        (totale, rimessaggio) => {
          if (
            rimessaggio.pagamento === "Pagato" ||
            rimessaggio.pagamento === "Fatturato"
          ) {
            return totale;
          }

          return totale + Math.max(
            0,
            numero(rimessaggio.prezzoRimessaggio) -
              numero(rimessaggio.acconto)
          );
        },
        0
      );

      return saldoLavori + saldoRimessaggi;
    };

    return saldoCliente(b) - saldoCliente(a);
  });
}

  if (caricamento) {
    return (
      <div className="loginPage">
        <div className="loginBox">Caricamento...</div>
      </div>
    );
  }

  if (!utente) {
    return (
      <div className="loginPage">
        <form className="loginBox" onSubmit={accedi}>
          <h1>Gestionale Cantiere Nautico</h1>
          <p>Accesso riservato Servizi Nautici Zenith</p>

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {erroreLogin && <div className="loginError">{erroreLogin}</div>}

          <button className="primary" type="submit">Entra nel gestionale</button>
        </form>
      </div>
    );
  }

  return (
    <>
      {preventivoDaStampare && (
  <PreventivoStampabile preventivo={preventivoDaStampare} />
)}

{lavoroDaStampare && (
  <LavoroStampabile lavoro={lavoroDaStampare} />
)}
{stampaElencoLavori && (
  <ElencoLavoriStampabile
    lavori={[...lavori]
      .filter((l) => l.stato === "In lavorazione")
      .sort(
        (a, b) =>
          new Date(a.consegna) -
          new Date(b.consegna)
      )}
  />
)}
{stampaElencoRimessaggi && (
  <ElencoRimessaggiStampabile
    rimessaggi={rimessaggi.filter((r) => {
      const pagamento = r.pagamento || "Da pagare";

      const matchPagamento =
        filtroPagamentoRimessaggi === "Tutti" ||
        (
          filtroPagamentoRimessaggi === "Da pagare" &&
          (
            pagamento === "Da pagare" ||
            pagamento === "Non pagato"
          )
        ) ||
        pagamento === filtroPagamentoRimessaggi;

      const annoRimessaggio = r.ingresso
        ? new Date(r.ingresso).getFullYear().toString()
        : "";

      const matchAnno =
        filtroAnnoRimessaggi === "Tutti" ||
        annoRimessaggio === filtroAnnoRimessaggi;

      return matchPagamento && matchAnno;
    })}
  />
)}
{rimessaggioDaStampare && (
  <RimessaggioStampabile rimessaggio={rimessaggioDaStampare} />
)}

      <div className="page">
        <header className="header">
          <div>
            <h1>Gestionale Cantiere Nautico</h1>
            <p>Clienti, lavori officina, preventivi, motori e priorità.</p>
          </div>
          <div className="headerActions">
            <span>{utente.email}</span>
            <button onClick={esci} className="logoutBtn">Esci</button>
          </div>
        </header>

        <section className="stats">
          <div className="stat"><span>Lavori aperti</span><strong>{riepilogo.aperti}</strong></div>
                   <div
  className="stat"
  onClick={() => {
    setVista("lavori");
    setFiltroPagamento("Non pagato");
    setFiltroAnnoLavori("Tutti");
    setRicerca("");
  }}
  style={{ cursor: "pointer" }}
>
  <span>Lavori da incassare</span>

  <strong>{riepilogo.daIncassare}</strong>

  <div
    style={{
      marginTop: "6px",
      fontSize: "14px",
      color: "#64748b",
      fontWeight: "600",
    }}
  >
    Totale: {euro(riepilogo.totaleDaIncassare)}
  </div>
</div>
<div
  className="stat"
  onClick={() => {
  setVista("rimessaggi");
  setFiltroPagamentoRimessaggi("Da pagare");
  setFiltroAnnoRimessaggi("Tutti");
  setRicerca("");
}}
  style={{ cursor: "pointer" }}
>
  <span>Rimessaggi da incassare</span>

<strong>{riepilogo.rimessaggiDaIncassare}</strong>

<div
  style={{
    marginTop: "6px",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  }}
>
  Totale: {euro(riepilogo.totaleRimessaggiDaIncassare)}
</div>
</div>
          <div className="stat"><span>Preventivi</span><strong>{riepilogo.preventivi}</strong></div>
        </section>
        <div
  style={{
    margin: "18px 0",
    position: "relative",
    zIndex: 50,
  }}
>
  <input
    type="text"
    placeholder="Ricerca globale: cliente, barca, matricola, LAV, PREV, RIM..."
    value={ricercaGlobale}
    onChange={(e) => setRicercaGlobale(e.target.value)}
    style={{
      width: "680px",
maxWidth: "90%",
      padding: "12px 14px",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      fontSize: "14px",
    }}
  />

  {ricercaGlobale.trim() && (
    <div
  style={{
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  width: "680px",
  maxWidth: "90%",
  zIndex: 100,
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  overflow: "hidden",
  background: "white",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
  maxHeight: "700px",
  overflowY: "auto",
}}
>
      {risultatiRicercaGlobale.length === 0 ? (
        <div style={{ padding: "12px", color: "#64748b" }}>
          Nessun risultato
        </div>
      ) : (
        risultatiRicercaGlobale.map((risultato, index) => {
  const clienteCorrente = risultato.dati.cliente || "-";

  const clientePrecedente =
    index > 0
      ? risultatiRicercaGlobale[index - 1].dati.cliente || "-"
      : null;

  const nuovoCliente =
    index === 0 || clienteCorrente !== clientePrecedente;

  return (
    <React.Fragment
      key={`${risultato.tipo}-${risultato.dati.firebaseId || risultato.dati.id || index}`}
    >
      {nuovoCliente && (
        <div
          style={{
            padding: "10px 12px 6px",
            fontSize: "13px",
            fontWeight: "800",
            color: "#dc2626",
            background: "#f8fafc",
            borderTop: index > 0 ? "1px solid #cbd5e1" : "none",
            textAlign: "left",
          }}
        >
          {clienteCorrente}
        </div>
      )}

      <div
        onClick={() => {
          if (risultato.tipo === "cliente") {
            setVista("clienti");
            setRicerca(risultato.dati.cliente || "");

            if (risultato.dati.firebaseId) {
              setClienteAperto(risultato.dati.firebaseId);
            }
          }

          if (risultato.tipo === "lavoro") {
            setVista("lavori");
            setForm({ ...risultato.dati });
            setLavoroInModifica(risultato.dati.firebaseId);
          }

          if (risultato.tipo === "preventivo") {
            modificaPreventivo(risultato.dati);
          }

          if (risultato.tipo === "rimessaggio") {
            setVista("rimessaggi");
            setForm({ ...risultato.dati });
            setRimessaggioInModifica(risultato.dati.firebaseId);
          }

          setRicercaGlobale("");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        style={{
          padding: "8px 18px",
          borderBottom: "1px solid #e2e8f0",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        <strong
          style={{
            textTransform: "capitalize",
            color: "#2563eb",
          }}
        >
          {risultato.tipo}
        </strong>

        {" — "}

        {risultato.dati.id
          ? `${risultato.dati.id} — `
          : ""}

        {risultato.dati.cliente || "-"}
      </div>
    </React.Fragment>
  );
})
      )}
    </div>
  )}
</div>

        <div className="tabs">
  <button
    className={vista === "lavori" ? "active" : ""}
    onClick={() => {
  setVista("lavori");
  setForm(nuovoLavoroVuoto());
  setLavoroInModifica(null);
}}
  >
    Lavori officina
  </button>

  <button
    className={vista === "clienti" ? "active" : ""}
    onClick={() => setVista("clienti")}
  >
    Archivio clienti
  </button>

  <button
    className={vista === "preventivi" ? "active" : ""}
    onClick={() => {
  setVista("preventivi");
  setFormPreventivo(nuovoPreventivoVuoto());
  setPreventivoInModifica(null);
}}
  >
    Preventivi
  </button>
  <button
  className={vista === "rimessaggi" ? "active" : ""}
  onClick={() => {
  setVista("rimessaggi");
  setForm(nuovoLavoroVuoto());
  setRimessaggioInModifica(null);
}}
>
  Rimessaggi
</button>

{vista === "lavori" && (
  <>
    <select
      value={filtroAnnoLavori}
      onChange={(e) => setFiltroAnnoLavori(e.target.value)}
      style={{ marginLeft: "10px" }}
    >
      <option value="Tutti">Tutti gli anni</option>
      <option value="2026">2026</option>
      <option value="2025">2025</option>
      <option value="2024">2024</option>
    </select>

    <select
      value={filtroStato}
      onChange={(e) => setFiltroStato(e.target.value)}
      style={{ marginLeft: "10px" }}
    >
      <option value="Tutti">Tutti</option>
      <option value="In lavorazione">In lavorazione</option>
      <option value="Terminato">Terminato</option>
    </select>

    <select
      value={filtroPagamento}
      onChange={(e) => setFiltroPagamento(e.target.value)}
      style={{ marginLeft: "10px" }}
    >
      <option value="Tutti">Tutti pagamenti</option>
      <option value="Non pagato">Non pagato</option>
      <option value="Pagato">Pagato</option>
      <option value="Fatturato">Fatturato</option>
    </select>

    <button
      style={{ marginLeft: "10px" }}
      onClick={() => {
        setStampaElencoLavori(true);

        setTimeout(() => {
          window.print();
          setStampaElencoLavori(false);
        }, 300);
      }}
    >
      📄 PDF Lavori aperti
    </button>
  </>
)}

{vista === "rimessaggi" && (
  <>
    <div
      style={{
        marginLeft: "650px",   // regola il valore
        display: "inline-flex",
        gap: "10px",
        alignItems: "center",
      }}
        >
      <select
        value={filtroAnnoRimessaggi}
        onChange={(e) =>
          setFiltroAnnoRimessaggi(e.target.value)
        }
      >
        <option value="Tutti">Tutti gli anni</option>
        <option value="2026">2026</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
      </select>

      <select
  value={filtroPagamentoRimessaggi}
  onChange={(e) =>
    setFiltroPagamentoRimessaggi(e.target.value)
  }
>
  <option value="Tutti">Tutti</option>
  <option value="Da pagare">Da pagare</option>
  <option value="Pagato">Pagato</option>
  <option value="Fatturato">Fatturato</option>
</select>

<button
  style={{ marginLeft: "10px" }}
  onClick={() => {
    setStampaElencoRimessaggi(true);

    setTimeout(() => {
      window.print();
      setStampaElencoRimessaggi(false);
    }, 300);
  }}
>
  📄 PDF Rimessaggi
</button>

</div>

<div
  style={{
    marginTop: "10px",
    display: "flex",
    marginLeft: "650px",
  }}
>
  <input
    type="text"
    placeholder="Cerca cliente, barca, motore o matricola..."
    value={ricerca}
    onChange={(e) => setRicerca(e.target.value)}
    style={{
      width: "320px",
      padding: "8px",
    }}
  />
</div>
   </>
)}
</div>
        <main className="layout">
          {vista === "lavori" && (
  <section className="panel">
    <h2>Nuovo lavoro</h2>

    <form onSubmit={aggiungiLavoro} className="form">
    {!form.cliente && (
  <label>
    Cerca cliente registrato

    <input
      type="text"
      list="clientiListLavori"
      placeholder="Scrivi nome, telefono, motore o matricola"
      value={ricercaClienteLavoro}
      onChange={(e) => {
        const valore = e.target.value;

        setRicercaClienteLavoro(valore);

       const cliente = clientiDb.find((c) =>
  (c.cliente || "").toLowerCase() === valore.toLowerCase()
);

        if (cliente && valore.trim().length > 1) {
          setForm({
            ...form,
            cliente: cliente.cliente || "",
            telefono: cliente.telefono || "",
            barca: cliente.barca || "",
            motore: cliente.motore || "",
            matricola: cliente.matricola || "",
          });

          setRicercaClienteLavoro("");
        }
      }}
    />

    <datalist id="clientiListLavori">
      {clientiDb.map((cliente) => (
        <option
          key={cliente.firebaseId}
          value={cliente.cliente}
        />
      ))}
    </datalist>
  </label>
)}

      <Input
        label="Titolo lavoro"
        value={form.titolo || ""}
        onChange={(v) => setForm({ ...form, titolo: v })}
      />

      <Input
        label="Cliente *"
        value={form.cliente || ""}
        onChange={(v) => setForm({ ...form, cliente: v })}
      />

      <Input
        label="Telefono"
        value={form.telefono || ""}
        onChange={(v) => setForm({ ...form, telefono: v })}
      />

      <Input
        label="Imbarcazione"
        value={form.barca || ""}
        onChange={(v) => setForm({ ...form, barca: v })}
      />

      <Input
        label="Motore"
        value={form.motore || ""}
        onChange={(v) => setForm({ ...form, motore: v })}
      />

      <Input
        label="Matricola"
        value={form.matricola || ""}
        onChange={(v) => setForm({ ...form, matricola: v })}
      />

      <Textarea
        label="Lavoro richiesto *"
        value={form.lavoro || ""}
        onChange={(v) => setForm({ ...form, lavoro: v })}
      />

      <Textarea
  label="Interventi eseguiti"
  value={form.interventiEseguiti || ""}
  onChange={(v) =>
    setForm({
      ...form,
      interventiEseguiti: v,
    })
  }
/>

    <div
  style={{
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "16px",
  }}
>
  <strong>Ricambi / materiali</strong>

  {(form.ricambiDettaglio || []).map((ricambio, index) => (
    <div
      key={index}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 90px 120px 120px 45px",
        gap: "8px",
        alignItems: "center",
        marginTop: "10px",
      }}
    >
      <input
        type="text"
        placeholder="Descrizione ricambio"
        value={ricambio.descrizione || ""}
        onChange={(e) => {
          const nuovi = [...(form.ricambiDettaglio || [])];
          nuovi[index] = {
            ...nuovi[index],
            descrizione: e.target.value,
          };

          setForm({
            ...form,
            ricambiDettaglio: nuovi,
          });
        }}
      />

     <input
  type="number"
  min="1"
  placeholder="Qtà"
  value={ricambio.quantita || ""}
  onWheel={(e) => e.currentTarget.blur()}
  onChange={(e) => {
    const nuovi = [...(form.ricambiDettaglio || [])];
    nuovi[index] = {
      ...nuovi[index],
      quantita: e.target.value,
    };

    setForm({
      ...form,
      ricambiDettaglio: nuovi,
    });
  }}
/>

      <input
  type="number"
  step="0.01"
  placeholder="Prezzo €"
  value={ricambio.prezzo || ""}
  onWheel={(e) => e.currentTarget.blur()}
  onChange={(e) => {
    const nuovi = [...(form.ricambiDettaglio || [])];
    nuovi[index] = {
      ...nuovi[index],
      prezzo: e.target.value,
    };

    setForm({
      ...form,
      ricambiDettaglio: nuovi,
    });
  }}
/>

      <strong>
        {euro(
          numero(ricambio.quantita) *
            numero(ricambio.prezzo)
        )}
      </strong>

      <button
        type="button"
        onClick={() => {
          const nuovi = (form.ricambiDettaglio || []).filter(
            (_, i) => i !== index
          );

          setForm({
            ...form,
            ricambiDettaglio: nuovi,
          });
        }}
      >
        🗑
      </button>
    </div>
  ))}

  <button
    type="button"
    style={{ marginTop: "12px" }}
    onClick={() =>
      setForm({
        ...form,
        ricambiDettaglio: [
          ...(form.ricambiDettaglio || []),
          {
            descrizione: "",
            quantita: 1,
            prezzo: "",
          },
        ],
      })
    }
  >
    + Aggiungi ricambio
  </button>
</div>

<div className="twoCols">
  <Input
  label="Costo ricambi euro"
  type="number"
  value={String(
    (form.ricambiDettaglio || []).reduce(
      (totale, ricambio) =>
        totale +
        numero(ricambio.quantita) *
          numero(ricambio.prezzo),
      0
    )
  )}
  onChange={() => {}}
  readOnly
/>

  <Input
    label="Ore manodopera"
    type="number"
    value={form.oreManodopera || ""}
    onChange={(v) =>
      setForm({ ...form, oreManodopera: v })
    }
  />
</div>

<div className="twoCols">
  <Input
    label="Costo ora euro"
    type="number"
    value={form.prezzoOra || ""}
    onChange={(v) =>
      setForm({ ...form, prezzoOra: v })
    }
  />

  <Input
    label="Rimessaggio euro"
    type="number"
    value={form.altro || ""}
    onChange={(v) =>
      setForm({ ...form, altro: v })
    }
  />
</div>
<div className="twoCols">
  <Input
    label="Acconto euro"
    type="number"
    value={form.acconto || ""}
    onChange={(v) =>
      setForm({ ...form, acconto: v })
    }
  />

  <Input
    label="Saldo euro"
    value={String(
      numero(form.costoRicambi) +
      numero(form.oreManodopera) *
        numero(form.prezzoOra) +
      numero(form.altro) -
      numero(form.acconto)
    )}
    onChange={() => {}}
    readOnly
  />
</div>
<div className="totalBox">
  Totale lavoro:{" "}
  <strong>
    {euro(
      numero(form.costoRicambi) +
      numero(form.oreManodopera) *
        numero(form.prezzoOra) +
      numero(form.altro)
    )}
  </strong>
</div>

<Select
  label="Stato"
        value={form.stato || ""}
        options={stati}
        onChange={(v) => setForm({ ...form, stato: v })}
      />
      <Select
  label="Stato amministrativo"
  value={form.pagamento || "Non pagato"}
  options={[
    "Non pagato",
    "Pagato",
    "Fatturato"
  ]}
  onChange={(v) =>
    setForm({ ...form, pagamento: v })
  }
/>

      <Input
        label="Tecnico"
        value={form.tecnico || ""}
        onChange={(v) => setForm({ ...form, tecnico: v })}
      />

      <div className="twoCols">
        <Input
          label="Ingresso"
          type="date"
          value={form.ingresso || ""}
          onChange={(v) => setForm({ ...form, ingresso: v })}
        />

        <Input
          label="Consegna"
          type="date"
          value={form.consegna || ""}
          onChange={(v) => setForm({ ...form, consegna: v })}
        />
      </div>

      <Textarea
        label="Note"
        value={form.note || ""}
        onChange={(v) => setForm({ ...form, note: v })}
      />

      <button className="primary" type="submit">
        {lavoroInModifica ? "Aggiorna lavoro" : "Aggiungi lavoro"}
      </button>

    </form>
  </section>
)}
          {vista === "lavori" && (
  <div className="cards">

<input
  type="text"
  placeholder="Cerca cliente, lavoro, barca, motore o matricola..."
  value={ricerca}
  onChange={(e) => setRicerca(e.target.value)}
  style={{
    width: "100%",
    marginBottom: "15px",
    padding: "10px",
  }}
/>
<div
  style={{
    maxHeight: "500px",
    overflowY: "auto",
    marginTop: "20px",
  }}
>
  {lavoriFiltrati.map((lavoro) => (
  <article
    className="job lavoro"
    key={lavoro.firebaseId || lavoro.id}
    style={{
      padding: "10px 14px",
      marginBottom: "8px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}
    >
     <div
  style={{
    display: "grid",
    gridTemplateColumns: "190px 170px 110px",
    gridTemplateRows: "auto auto",
    alignItems: "center",
    columnGap: "12px",
    rowGap: "5px",
    minWidth: 0,
    flex: 1,
  }}
>
        <strong
          style={{
            fontSize: "15px",
            whiteSpace: "nowrap",
          }}
        >
          {lavoro.cliente}
        </strong>

        <span
  style={{
    fontSize: "14px",
    color: "#333",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    minWidth: 0,
  }}
>
  {lavoro.titolo || "Senza titolo"}
</span>

<span
  style={{
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    color:
      lavoro.pagamento === "Pagato"
        ? "green"
        : lavoro.pagamento === "Fatturato"
        ? "#2563eb"
        : "red",
  }}
>
  {lavoro.pagamento || "Non pagato"}
</span>
<span
  style={{
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    whiteSpace: "nowrap",
  }}
>
  Scheda: {lavoro.id || "-"}
</span>
<span
  style={{
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    color: "#111827",
  }}
>
  {euro(
    Math.max(
      0,
      numero(lavoro.costoRicambi) +
        numero(lavoro.oreManodopera) * numero(lavoro.prezzoOra) +
        numero(lavoro.altro) -
        numero(lavoro.acconto)
    )
  )}
</span>

<span
  style={{
    fontSize: "13px",
    color: "#666",
    whiteSpace: "nowrap",
  }}
>
  Consegna: {formatData(lavoro.consegna)}
</span>
      </div>

      <div className="actions">
        <button
          className="actionBtn editBtn"
          onClick={() => {
            setForm({ ...lavoro });
            setLavoroInModifica(lavoro.firebaseId);
          }}
        >
          Modifica
        </button>

        <button
          className="actionBtn pdfBtn"
          onClick={() => {
            setLavoroDaStampare(lavoro);

            setTimeout(() => {
              window.print();
            }, 300);
          }}
        >
          PDF
        </button>

        <button
          type="button"
          className="actionBtn deleteBtn"
          onClick={() => eliminaLavoro(lavoro.firebaseId)}
        >
          Elimina
        </button>
      </div>
    </div>
  </article>
))}
    ))}
</div>
  </div>
)}
          {vista === "preventivi" && (
            <section className="panel">
              <h2>{preventivoInModifica ? "Modifica preventivo" : "Nuovo preventivo"}</h2>
              {preventivoInModifica && (
                <div className="totalBox">
                  Stai modificando il preventivo <strong>{formPreventivo.id}</strong>
                </div>
              )}

              <form onSubmit={aggiungiPreventivo} className="form">
                
                <label>
  Cerca cliente *
  <input
    type="text"
    list="clientiListPreventivi"
    placeholder="Scrivi nome, cognome, telefono, motore o matricola"
    value={ricercaClientePreventivo}
    onChange={(e) => {
  const valore = e.target.value;
  setRicercaClientePreventivo(valore);

  const cliente = clientiDb.find((c) =>
    `${c.cliente || ""} ${c.telefono || ""} ${c.barca || ""} ${c.motore || ""} ${c.matricola || ""}`
      .toLowerCase()
      .includes(valore.toLowerCase())
  );

  if (cliente && valore.trim().length > 1) {
    setFormPreventivo((prev) => ({
      ...prev,
      cliente: cliente.cliente || "",
      telefono: cliente.telefono || "",
      barca: cliente.barca || "",
      motore: cliente.motore || "",
      matricola: cliente.matricola || "",
    }));
  }
}}
  />

  <datalist id="clientiListPreventivi">
    {clientiDb.map((cliente) => (
      <option
        key={cliente.firebaseId}
        value={cliente.cliente}
      />
    ))}
  </datalist>
</label>
<Input
  label="Cliente *"
  value={formPreventivo.cliente}
  onChange={(v) =>
    setFormPreventivo({ ...formPreventivo, cliente: v })
  }
/>
<Input
  label="Titolo preventivo"
  value={formPreventivo.titolo || ""}
  onChange={(v) =>
    setFormPreventivo({ ...formPreventivo, titolo: v })
  }
/>
                <Input label="Telefono" value={formPreventivo.telefono} onChange={(v) => setFormPreventivo({ ...formPreventivo, telefono: v })} />
                <Input label="Imbarcazione" value={formPreventivo.barca} onChange={(v) => setFormPreventivo({ ...formPreventivo, barca: v })} />
                <Input label="Motore" value={formPreventivo.motore} onChange={(v) => setFormPreventivo({ ...formPreventivo, motore: v })} />
                <Input label="Matricola" value={formPreventivo.matricola} onChange={(v) => setFormPreventivo({ ...formPreventivo, matricola: v })} />
                <Textarea label="Descrizione lavori *" value={formPreventivo.descrizione} onChange={(v) => setFormPreventivo({ ...formPreventivo, descrizione: v })} />
                <Textarea label="Ricambi" value={formPreventivo.ricambi} onChange={(v) => setFormPreventivo({ ...formPreventivo, ricambi: v })} />

                <div className="twoCols">
                  <Input label="Costo ricambi euro" type="number" value={formPreventivo.costoRicambi} onChange={(v) => setFormPreventivo({ ...formPreventivo, costoRicambi: v })} />
                  <Input label="Ore manodopera" type="number" value={formPreventivo.oreManodopera} onChange={(v) => setFormPreventivo({ ...formPreventivo, oreManodopera: v })} />
                </div>

                <div className="twoCols">
                  <Input label="Prezzo ora euro" type="number" value={formPreventivo.prezzoOra} onChange={(v) => setFormPreventivo({ ...formPreventivo, prezzoOra: v })} />
                  <Input label="Altro euro" type="number" value={formPreventivo.altro} onChange={(v) => setFormPreventivo({ ...formPreventivo, altro: v })} />
                </div>

                                <Textarea label="Note" value={formPreventivo.note} onChange={(v) => setFormPreventivo({ ...formPreventivo, note: v })} />

                <div className="totalBox">
                  Totale preventivo: <strong>{euro(totaleFormPreventivo)}</strong>
                </div>

                <button className="primary" type="submit">
                  {preventivoInModifica ? "Aggiorna preventivo" : "Salva preventivo"}
                </button>

                {preventivoInModifica && (
                  <button className="smallBtn" type="button" onClick={annullaModificaPreventivo}>
                    Annulla modifica
                  </button>
                )}
              </form>
            </section>
          )}

          {vista === "clienti" && (
  <section className="panel">
    <h2>Nuovo cliente</h2>

    <form onSubmit={salvaCliente} className="form">
      <Input
        label="Cliente"
        value={formCliente.cliente}
        onChange={(v) => setFormCliente({ ...formCliente, cliente: v })}
      />

      <Input
        label="Telefono"
        value={formCliente.telefono}
        onChange={(v) => setFormCliente({ ...formCliente, telefono: v })}
      />

      <Input
        label="Imbarcazione"
        value={formCliente.barca}
        onChange={(v) => setFormCliente({ ...formCliente, barca: v })}
      />

      <Input
        label="Motore"
        value={formCliente.motore}
        onChange={(v) => setFormCliente({ ...formCliente, motore: v })}
      />

      <Input
        label="Matricola"
        value={formCliente.matricola}
        onChange={(v) => setFormCliente({ ...formCliente, matricola: v })}
      />

      <Textarea
        label="Note"
        value={formCliente.note}
        onChange={(v) => setFormCliente({ ...formCliente, note: v })}
      />

      <button className="primary" type="submit">
  {clienteInModifica ? "Aggiorna cliente" : "Salva cliente"}
</button>
    </form>
  </section>
)}
{vista === "clienti" && (
  <div className="cards">

    <input
      type="text"
      placeholder="Cerca cliente, telefono, barca, motore o matricola..."
      value={ricerca}
      onChange={(e) => setRicerca(e.target.value)}
      style={{
        width: "100%",
        marginBottom: "15px",
        padding: "10px",
      }}
    />
<button
  type="button"
  onClick={() =>
    setOrdinaClientiPerSaldo(!ordinaClientiPerSaldo)
  }
  style={{
    marginBottom: "15px",
    padding: "10px 14px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    background: ordinaClientiPerSaldo ? "#dbeafe" : "#f1f5f9",
    color: ordinaClientiPerSaldo ? "#1d4ed8" : "#334155",
  }}
>
  {ordinaClientiPerSaldo
    ? "Ordine normale"
    : "Ordina per saldo"}
</button>
    {clientiOrdinati.map((cliente) => {
      const lavoriCliente = lavori.filter(
        (lavoro) => lavoro.cliente === cliente.cliente
      );

      const preventiviCliente = preventivi.filter(
        (preventivo) => preventivo.cliente === cliente.cliente
      );
      const rimessaggiCliente = rimessaggi.filter(
  (rimessaggio) => rimessaggio.cliente === cliente.cliente
);
const saldoLavoriCliente = lavoriCliente.reduce((totale, lavoro) => {
  if (
    lavoro.pagamento === "Pagato" ||
    lavoro.pagamento === "Fatturato"
  ) {
    return totale;
  }

  const totaleLavoro =
    numero(lavoro.costoRicambi) +
    numero(lavoro.oreManodopera) * numero(lavoro.prezzoOra) +
    numero(lavoro.altro);

  const saldo =
    totaleLavoro - numero(lavoro.acconto);

  return totale + Math.max(0, saldo);
}, 0);
const saldoRimessaggiCliente = rimessaggiCliente.reduce(
  (totale, rimessaggio) => {
    if (
      rimessaggio.pagamento === "Pagato" ||
      rimessaggio.pagamento === "Fatturato"
    ) {
      return totale;
    }

    const saldo =
      numero(rimessaggio.prezzoRimessaggio) -
      numero(rimessaggio.acconto);

    return totale + Math.max(0, saldo);
  },
  0
);
const saldoTotaleCliente =
  saldoLavoriCliente + saldoRimessaggiCliente;

      return (
        <article
  className="job"
  key={cliente.firebaseId}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <div>
      <strong>{cliente.cliente}</strong>

      <div
        style={{
          fontSize: "13px",
          color: "#666",
          marginTop: "4px",
        }}
      >
        {cliente.barca || "-"} | {cliente.motore || "-"}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#666",
        }}
      >
       Lavori: {lavoriCliente.length} | Preventivi: {preventiviCliente.length} | Rimessaggi: {rimessaggiCliente.length}
      <div
  style={{
    marginTop: "8px",
    fontSize: "13px",
    lineHeight: "1.6",
  }}
>
  <div>
    Saldo lavori: <strong>{euro(saldoLavoriCliente)}</strong>
  </div>

  <div>
    Saldo rimessaggi: <strong>{euro(saldoRimessaggiCliente)}</strong>
  </div>

  <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  <span>
    Saldo totale: <strong>{euro(saldoTotaleCliente)}</strong>
  </span>

  <span
    style={{
      padding: "3px 8px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: "700",
      background:
        saldoTotaleCliente > 0 ? "#fee2e2" : "#dcfce7",
      color:
        saldoTotaleCliente > 0 ? "#dc2626" : "#15803d",
    }}
  >
    {saldoTotaleCliente > 0 ? "DA INCASSARE" : "IN REGOLA"}
  </span>
</div>
</div>
      </div>
    </div>

    <div className="clientActions">
    <button
  type="button"
  className="clientBtn"
  style={{
    background: "#0f172a",
    color: "white",
  }}
  onClick={() =>
    setClienteAperto(
      clienteAperto === cliente.firebaseId
        ? null
        : cliente.firebaseId
    )
  }
>
  📂 Storico
</button>
      <button
  className="clientBtn editBtn"
  onClick={() => modificaCliente(cliente)}
>
  Modifica
</button>

      <button
        type="button"
        className="clientBtn preventivoBtn"
        onClick={() => {
          setVista("preventivi");

          setFormPreventivo({
            ...nuovoPreventivoVuoto(),
            cliente: cliente.cliente || "",
            telefono: cliente.telefono || "",
            barca: cliente.barca || "",
            motore: cliente.motore || "",
            matricola: cliente.matricola || "",
          });
        }}
      >
        Preventivo
      </button>

      <button
        type="button"
        className="clientBtn lavoroBtn"
        onClick={() => {
          setVista("lavori");

          setForm({
            ...nuovoLavoroVuoto(),
            cliente: cliente.cliente || "",
            telefono: cliente.telefono || "",
            barca: cliente.barca || "",
            motore: cliente.motore || "",
            matricola: cliente.matricola || "",
          });
        }}
      >
        Lavoro
          
      </button>

      <button
        type="button"
        className="clientBtn deleteBtn"
        onClick={() => eliminaCliente(cliente.firebaseId)}
      >
        Elimina
      </button>
    </div>
  </div>
  {clienteAperto === cliente.firebaseId && (
  <div
    style={{
      marginTop: "15px",
      paddingTop: "15px",
      borderTop: "1px solid #cbd5e1",
      textAlign: "left",
    }}
  >
    <h3>Storico cliente</h3>

    <div style={{ marginTop: "12px" }}>
      <strong>Lavori ({lavoriCliente.length})</strong>

      {lavoriCliente.length === 0 ? (
        <p>Nessun lavoro registrato.</p>
      ) : (
        lavoriCliente.map((lavoro) => (
          <div
            key={lavoro.firebaseId}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <button
  type="button"
  onClick={() => {
    setVista("lavori");
    setForm({ ...lavoro });
    setLavoroInModifica(lavoro.firebaseId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#2563eb",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "underline",
  }}
>
  {lavoro.id || "-"}
</button>
{" — "}
{formatData(lavoro.ingresso)} —{" "}
<strong>{lavoro.titolo || "Senza titolo"}</strong>
{" — "}
{lavoro.pagamento || "Non pagato"}
          </div>
        ))
      )}
    </div>

    <div style={{ marginTop: "18px" }}>
      <strong>Preventivi ({preventiviCliente.length})</strong>

      {preventiviCliente.length === 0 ? (
        <p>Nessun preventivo registrato.</p>
      ) : (
        preventiviCliente.map((preventivo) => (
          <div
            key={preventivo.firebaseId}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <button
  type="button"
  onClick={() => modificaPreventivo(preventivo)}
  style={{
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#2563eb",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "underline",
  }}
>
  {preventivo.id || "-"}
</button>
{" — "}
{formatData(preventivo.data)} —{" "}
<strong>{preventivo.titolo || "Preventivo"}</strong>
          </div>
        ))
      )}
    </div>

    <div style={{ marginTop: "18px" }}>
      <strong>Rimessaggi ({rimessaggiCliente.length})</strong>

      {rimessaggiCliente.length === 0 ? (
        <p>Nessun rimessaggio registrato.</p>
      ) : (
        rimessaggiCliente.map((rimessaggio) => (
          <div
            key={rimessaggio.firebaseId}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <button
  type="button"
  onClick={() => {
  setVista("rimessaggi");
  setForm({ ...rimessaggio });
  setRimessaggioInModifica(rimessaggio.firebaseId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}}
  style={{
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#2563eb",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "underline",
  }}
>
  {rimessaggio.id || "-"}
</button>
{" — "}
{formatData(rimessaggio.ingresso)}
{" — "}
{rimessaggio.barca || "Imbarcazione"}
{" — "}
<strong>{rimessaggio.pagamento || "Da pagare"}</strong>
          </div>
        ))
      )}
    </div>
  </div>
)}
</article>
      );
    })}
  </div>
)}
{vista === "rimessaggi" && (
  <section className="panel">
    <h2>Nuovo rimessaggio</h2>

    <form className="form">

    <label>
  Cerca cliente

  <input
    type="text"
    list="clientiListRimessaggi"
    placeholder="Nome cliente..."
    value={form.cliente || ""}
    onChange={(e) => {
      const valore = e.target.value;

      const cliente = clientiDb.find(
        (c) => c.cliente === valore
      );

      if (cliente) {
  setForm({
    ...form,
    cliente: cliente.cliente || "",
    telefono: cliente.telefono || "",
    matricola: cliente.matricola || "",
    barca: cliente.barca || "",
    motore: cliente.motore || "",
  });
} else {
        setForm({
          ...form,
          cliente: valore,
        });
      }
    }}
  />

  <datalist id="clientiListRimessaggi">
    {clientiDb.map((cliente) => (
      <option
        key={cliente.firebaseId}
        value={cliente.cliente}
      />
    ))}
  </datalist>
</label>

      <Input
        label="Imbarcazione"
        value={form.barca || ""}
        onChange={(v) => setForm({ ...form, barca: v })}
      />

      <Input
        label="Motore"
        value={form.motore || ""}
        onChange={(v) => setForm({ ...form, motore: v })}
      />

      <div className="twoCols">
        <Input
          label="Data ingresso"
          type="date"
          value={form.ingresso || ""}
          onChange={(v) => setForm({ ...form, ingresso: v })}
        />

        <Input
          label="Data uscita"
          type="date"
          value={form.uscita || ""}
          onChange={(v) => setForm({ ...form, uscita: v })}
        />
      </div>
<Select
  label="Copertura"
  value={form.copertura || ""}
  options={[
    "Copertura termo",
    "Copertura cliente",
  ]}
  onChange={(v) =>
    setForm({ ...form, copertura: v })
  }
/>

<Input
  label="Prezzo rimessaggio euro"
  value={form.prezzoRimessaggio || ""}
  onChange={(v) =>
    setForm({ ...form, prezzoRimessaggio: v })
  }
/>

<Input
  label="Acconto euro"
  value={form.acconto || ""}
  onChange={(v) =>
    setForm({ ...form, acconto: v })
  }
/>

<Input
  label="Saldo euro"
  value={
    String(
      numero(form.prezzoRimessaggio) -
      numero(form.acconto)
    )
  }
  onChange={() => {}}
  readOnly
/>
<Select
  label="Pagamento"
  value={form.pagamento || ""}
  options={[
    "Da pagare",
    "Pagato",
    "Fatturato",
  ]}
  onChange={(v) =>
    setForm({ ...form, pagamento: v })
  }
/>

<Textarea
  label="Note"
  value={form.note || ""}
  onChange={(v) =>
    setForm({ ...form, note: v })
  }
/>

      <button
  className="primary"
  type="button"
  onClick={salvaRimessaggio}
>
  Salva rimessaggio
</button>

    </form>
  </section>
)}
{vista === "rimessaggi" && (
<>
  

  <div className="cards">

  <div
    style={{
      maxHeight: "500px",
      overflowY: "auto",
      marginTop: "20px",
    }}
  >
    {rimessaggiFiltrati.map((rimessaggio) => (
  <article
    className="job lavoro"
    key={rimessaggio.firebaseId}
    style={{
      padding: "10px 14px",
      marginBottom: "8px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "180px 95px 95px 135px",
    alignItems: "center",
    columnGap: "8px",
    minWidth: 0,
    flex: 1,
  }}
>
        <strong
          style={{
            fontSize: "15px",
            whiteSpace: "nowrap",
          }}
        >
          {rimessaggio.cliente}
        </strong>

        <span
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            color:
  rimessaggio.pagamento === "Pagato"
    ? "green"
    : rimessaggio.pagamento === "Fatturato"
    ? "#2563eb"
    : "red",
          }}
        >
          {rimessaggio.pagamento || "Da pagare"}
</span>

<span
  style={{
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    color: "#111827",
  }}
>
  {euro(
    Math.max(
      0,
      numero(rimessaggio.prezzoRimessaggio) -
        numero(rimessaggio.acconto)
    )
  )}
</span>

<span
  style={{
    fontSize: "13px",
    color: "#666",
    whiteSpace: "nowrap",
  }}
>
          Uscita: {formatData(rimessaggio.uscita)}
        </span>
      </div>

      <div className="actions">
        <button
          className="actionBtn editBtn"
          onClick={() => {
            setForm({ ...rimessaggio });
            setRimessaggioInModifica(rimessaggio.firebaseId);
          }}
        >
          Modifica
        </button>

        <button
          className="actionBtn pdfBtn"
          onClick={() => {
            setLavoroDaStampare(null);
            setRimessaggioDaStampare(rimessaggio);

            setTimeout(() => {
              window.print();
            }, 300);
          }}
        >
          PDF
        </button>

        <button
          type="button"
          className="actionBtn deleteBtn"
          onClick={() =>
            eliminaRimessaggio(rimessaggio.firebaseId)
          }
        >
          Elimina
        </button>
      </div>
    </div>
  </article>
))}
  </div>

  </div>
  </>
)}
{vista === "preventivi" && (
              <div className="cards">
                <input
  type="text"
  placeholder="Cerca cliente, preventivo, barca, motore o matricola..."
  value={ricerca}
  onChange={(e) => setRicerca(e.target.value)}
  style={{
    width: "100%",
    marginBottom: "15px",
    padding: "10px",
  }}
/>
                {preventiviFiltrati.map((preventivo) => (
                  <article className="job preventivo" key={preventivo.firebaseId || preventivo.id}>
                    <div className="jobTop">
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "180px 140px 135px",
      alignItems: "center",
      gap: "8px",
      minWidth: 0,
      flex: 1,
    }}
  >
    <strong
      style={{
        fontSize: "13px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {preventivo.cliente}
    </strong>

    <span
      style={{
        fontSize: "14px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {preventivo.titolo || "Preventivo"}
    </span>

        <span
      style={{
        fontSize: "13px",
        color: "#666",
        whiteSpace: "nowrap",
      }}
    >
      Data: {formatData(preventivo.data)}
    </span>
  </div>

  <div className="actions">
    <button
      className="actionBtn editBtn"
      onClick={() => modificaPreventivo(preventivo)}
    >
      Modifica
    </button>

    <button
      className="actionBtn pdfBtn"
      onClick={() => stampaPreventivo(preventivo)}
    >
      PDF
    </button>

    <button
      className="actionBtn lavoroBtn"
      onClick={() => creaLavoroDaPreventivo(preventivo)}
    >
      Lavoro
    </button>

    <button
      className="actionBtn deleteBtn"
      onClick={() => eliminaPreventivo(preventivo.firebaseId)}
    >
      Elimina
    </button>
  </div>
</div>
{preventivo.note && <p><strong>Note:</strong> {preventivo.note}</p>}
                  </article>
                ))}
              </div>
            )}
         </main>
      </div>
    </>
  );
}

function PreventivoStampabile({ preventivo }) {
  const totale = calcolaTotale(preventivo);

  return (
    <div className="printArea">
      <div className="printHeader">
        <div className="printLogoArea">
          <img src={logoZenith} alt="Servizi Nautici Zenith" className="printLogo" />

          <div>
            <h1>Servizi Nautici Zenith</h1>
            <p>Cantiere nautico - Assistenza motori marini - Ricambi - Manutenzione</p>
          </div>
        </div>

        <div className="printDocInfo">
          <strong>Preventivo</strong>
          <span>{preventivo.id}</span>
          <span>{formatData(preventivo.data)}</span>
        </div>
      </div>

      <div className="printSection twoPrintCols">
        <div>
          <h2>Dati cliente</h2>
          <p><strong>Cliente:</strong> {preventivo.cliente || "-"}</p>
          <p><strong>Telefono:</strong> {preventivo.telefono || "-"}</p>
        </div>
        <div>
          <h2>Imbarcazione</h2>
          <p><strong>Barca:</strong> {preventivo.barca || "-"}</p>
          <p><strong>Motore:</strong> {preventivo.motore || "-"}</p>
          <p><strong>Matricola:</strong> {preventivo.matricola || "-"}</p>
        </div>
      </div>

      <div className="printSection">
        <h2>Descrizione lavori</h2>
        <p>{preventivo.descrizione || "-"}</p>
      </div>
      

      <div className="priceRows">
  <div className="total">
    <span>Totale preventivo</span>
    <strong>{euro(totale)}</strong>
  </div>
</div>

      {preventivo.note && (
        <div className="printSection">
          <h2>Note</h2>
          <p>{preventivo.note}</p>
        </div>
      )}

      <div className="printFooter">
        <div>
          <strong>Firma cliente</strong>
          <div className="signatureLine"></div>
        </div>
        <div>
          <strong>Firma cantiere</strong>
          <div className="signatureLine"></div>
        </div>
      </div>

      <p className="printSmall">
        Preventivo salvo diversa indicazione. Eventuali lavorazioni aggiuntive verranno comunicate prima dell'esecuzione.
      </p>
    </div>
  );
}
function LavoroStampabile({ lavoro }) {
  return (
    <div className="printArea">
      <div className="printHeader">
        <div className="printLogoArea">
          <img src={logoZenith} alt="Servizi Nautici Zenith" className="printLogo" />

          <div>
             <h1>Servizi Nautici Zenith</h1>
    <p>Vendita e assistenza di motori e imbarcazioni</p>
  </div>
</div>

        <div className="printDocInfo">
          <strong>Scheda lavoro</strong>
          <span>{lavoro.id}</span>
          <span>{formatData(lavoro.ingresso)}</span>
        </div>
      </div>

      <div className="printSection twoPrintCols">
        <div>
          <h2>Dati cliente</h2>
          <p><strong>Cliente:</strong> {lavoro.cliente || "-"}</p>
          <p><strong>Telefono:</strong> {lavoro.telefono || "-"}</p>
        </div>

        <div>
          <h2>Imbarcazione</h2>
          <p><strong>Barca:</strong> {lavoro.barca || "-"}</p>
          <p><strong>Motore:</strong> {lavoro.motore || "-"}</p>
          <p><strong>Matricola:</strong> {lavoro.matricola || "-"}</p>
        </div>
      </div>

      <div className="titoloLavoroPrint">
  <h2>Titolo lavoro</h2>
  <p>{lavoro.titolo || "-"}</p>
</div>

    
  <div className="lavoroRichiestoPrint">
  <h2>Lavoro richiesto</h2>

  <div
    style={{
      whiteSpace: "pre-wrap",
      textAlign: "left",
    }}
  >
  {lavoro.lavoro || "-"}
</div>
      </div>

      <div
  className="ricambiPrint"
  style={{ pageBreakBefore: "always" }}
>
  <h2>Ricambi / materiali</h2>

{(lavoro.ricambiDettaglio || []).length > 0 ? (
  <div style={{ marginTop: "12px" }}>
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "14px",
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: "left",
              borderBottom: "1px solid #999",
              padding: "8px",
            }}
          >
            Descrizione
          </th>

          <th
            style={{
              textAlign: "center",
              borderBottom: "1px solid #999",
              padding: "8px",
              width: "70px",
            }}
          >
            Qtà
          </th>

          <th
            style={{
              textAlign: "right",
              borderBottom: "1px solid #999",
              padding: "8px",
              width: "120px",
            }}
          >
            Prezzo
          </th>

          <th
            style={{
              textAlign: "right",
              borderBottom: "1px solid #999",
              padding: "8px",
              width: "120px",
            }}
          >
            Totale
          </th>
        </tr>
      </thead>

      <tbody>
        {lavoro.ricambiDettaglio.map((ricambio, index) => (
          <tr key={index}>
            <td
              style={{
                padding: "8px",
                borderBottom: "1px solid #ddd",
              }}
            >
              {ricambio.descrizione || "-"}
            </td>

            <td
              style={{
                padding: "8px",
                textAlign: "center",
                borderBottom: "1px solid #ddd",
              }}
            >
              {ricambio.quantita || 0}
            </td>

            <td
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "1px solid #ddd",
              }}
            >
              {euro(numero(ricambio.prezzo))}
            </td>

            <td
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "1px solid #ddd",
              }}
            >
              {euro(
                numero(ricambio.quantita) *
                  numero(ricambio.prezzo)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div
  style={{
    textAlign: "right",
    marginTop: "0px",
    padding: "12px",
    fontWeight: "bold",
    background: "#f2f8fc",
    borderTop: "1px solid #b8cfdf",
  }}
>
      Totale ricambi:{" "}
      {euro(
        lavoro.ricambiDettaglio.reduce(
          (totale, ricambio) =>
            totale +
            numero(ricambio.quantita) *
              numero(ricambio.prezzo),
          0
        )
      )}
    </div>
  </div>
) : (
  <div
    style={{
      padding: "12px",
      minHeight: "320px",
      whiteSpace: "pre-wrap",
      textAlign: "left",
    }}
  >
    {lavoro.ricambi || "-"}
  </div>
)}
</div>
      <div className="interventiPrint">
  <h2>Interventi eseguiti</h2>

  <div
    style={{
      whiteSpace: "pre-wrap",
      textAlign: "left",
    }}
  >
    {lavoro.interventiEseguiti || ""}
  </div>
</div>

<div
  className="printSection"
  style={{
    pageBreakBefore: "always",
    paddingTop: "15px",
  }}
>
<div className="printHeader">
  <div className="printLogoArea">
    <img
      src={logoZenith}
      alt="Servizi Nautici Zenith"
      className="printLogo"
    />

    <div>
      <h1>Servizi Nautici Zenith</h1>
      <p>Vendita e assistenza di motori e imbarcazioni</p>
    </div>
  </div>

  <div className="printDocInfo">
    <strong>Scheda lavoro</strong>
    <span>{lavoro.id}</span>
    <span>{formatData(lavoro.ingresso)}</span>
  </div>
</div>

<div className="printSection twoPrintCols">
  <div>
    <h2>Dati cliente</h2>
    <p><strong>Cliente:</strong> {lavoro.cliente || "-"}</p>
    <p><strong>Telefono:</strong> {lavoro.telefono || "-"}</p>
  </div>

  <div>
    <h2>Imbarcazione</h2>
    <p><strong>Barca:</strong> {lavoro.barca || "-"}</p>
    <p><strong>Motore:</strong> {lavoro.motore || "-"}</p>
    <p><strong>Matricola:</strong> {lavoro.matricola || "-"}</p>
  </div>
</div>

 <div style={{ height: "50px" }}></div>
 <div className="riepilogoLavoroTitle">
  Riepilogo lavoro
</div>

  <div className="priceRows">
    <div>
      <span>Ricambi / materiali</span>
      <strong>{euro(numero(lavoro.costoRicambi))}</strong>
    </div>

    <div>
      <span>
        <span>Manodopera</span>
      </span>
      <strong>
        {euro(
  (parseFloat(lavoro.oreManodopera || 0)) *
  (parseFloat(lavoro.prezzoOra || 0))
)}
      </strong>
    </div>

    <div>
      <span>Rimessaggio</span>
      <strong>{euro(numero(lavoro.altro))}</strong>
    </div>

    <div
  className="total"
  style={{
    display: "block",
    textAlign: "center",
    background: "#f2f8fc",
    padding: "14px",
  }}
>
  <div
    style={{
      textAlign: "center",
      marginBottom: "10px",
    }}
  >
    <span>Totale lavoro</span>
    <br />
    <strong style={{ fontSize: "20px" }}>
      {euro(
        numero(lavoro.costoRicambi) +
          (parseFloat(lavoro.oreManodopera || 0)) *
            (parseFloat(lavoro.prezzoOra || 0)) +
          numero(lavoro.altro)
      )}
    </strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "80px",
    }}
  >
    <div>
      <span>Acconto:&nbsp;</span>
      <strong>{euro(numero(lavoro.acconto))}</strong>
    </div>

    <div>
      <span>Saldo:&nbsp;</span>
      <strong>
        {euro(
          numero(lavoro.costoRicambi) +
            (parseFloat(lavoro.oreManodopera || 0)) *
              (parseFloat(lavoro.prezzoOra || 0)) +
            numero(lavoro.altro) -
            numero(lavoro.acconto)
        )}
      </strong>
    </div>
  </div>
</div>
  </div>
</div>

      {lavoro.note && (
        <div className="printSection">
          <h2>Note</h2>
          <p>{lavoro.note}</p>
        </div>
      )}

      <div
  className="printFooter"
  style={{
    marginTop: "120px",
  }}
>
        <div>
          <strong>Firma cliente</strong>
          <div className="signatureLine"></div>
        </div>

        <div>
          <strong>Firma officina</strong>
          <div className="signatureLine"></div>
        </div>
      </div>

      <p className="printSmall">
        Scheda lavoro ad uso interno officina. Eventuali interventi aggiuntivi verranno comunicati prima dell'esecuzione.
      </p>
    </div>
  );
}
function ElencoLavoriStampabile({ lavori }) {
  const lavoriOrdinati = [...lavori].sort((a, b) => {
    if (!a.consegna) return 1;
    if (!b.consegna) return -1;

    return new Date(a.consegna) - new Date(b.consegna);
  });

  return (
    <div className="printArea">
      <div className="printHeader">
        <h1>Servizi Nautici Zenith</h1>
        <h2>Elenco lavori aperti</h2>
        <p>Ordinati per data di consegna</p>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "8px" }}>
              Entrata
            </th>

            <th style={{ border: "1px solid #000", padding: "8px" }}>
              Cliente
            </th>

            <th style={{ border: "1px solid #000", padding: "8px" }}>
              Imbarcazione
            </th>

            <th style={{ border: "1px solid #000", padding: "8px" }}>
              Telefono
            </th>

            <th style={{ border: "1px solid #000", padding: "8px" }}>
              Consegna
            </th>
          </tr>
        </thead>

        <tbody>
          {lavoriOrdinati.map((l) => (
            <tr key={l.firebaseId}>
              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {formatData(l.ingresso)}
              </td>

              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {l.cliente}
              </td>

              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {l.barca}
              </td>

              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {l.telefono}
              </td>

              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {formatData(l.consegna)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "20px",
          fontWeight: "bold",
        }}
      >
        Totale lavori aperti: {lavoriOrdinati.length}
      </div>
    </div>
  );
}
function RimessaggioStampabile({ rimessaggio }) {
  return (
    <div className="printArea">
      <div className="printHeader">
        <div className="printLogoArea">
          <img
            src={logoZenith}
            alt="Servizi Nautici Zenith"
            className="printLogo"
          />

          <div>
            <h1>Servizi Nautici Zenith</h1>
            <p>Vendita e assistenza di motori e imbarcazioni</p>
          </div>
        </div>

        <div className="printDocInfo">
  <strong>Scheda rimessaggio</strong>
  <span>{rimessaggio.id || "-"}</span>
  <span>{formatData(rimessaggio.ingresso)}</span>
</div>
      </div>

      <div className="printSection twoPrintCols">
        <div>
          <h2>Dati cliente</h2>

          <p>
            <strong>Cliente:</strong>{" "}
            {rimessaggio.cliente || "-"}
          </p>

          <p>
            <strong>Telefono:</strong>{" "}
            {rimessaggio.telefono || "-"}
          </p>
        </div>

        <div>
          <h2>Imbarcazione</h2>

          <p>
            <strong>Barca:</strong>{" "}
            {rimessaggio.barca || "-"}
          </p>

          <p>
            <strong>Motore:</strong>{" "}
            {rimessaggio.motore || "-"}
          </p>

          <p>
            <strong>Matricola:</strong>{" "}
            {rimessaggio.matricola || "-"}
          </p>
        </div>
      </div>

      <div className="printSection">
        <h2>Dati rimessaggio</h2>

        <p>
          <strong>Ingresso:</strong>{" "}
          {formatData(rimessaggio.ingresso)}
        </p>

        <p>
          <strong>Uscita:</strong>{" "}
          {formatData(rimessaggio.uscita)}
        </p>

        <p>
          <strong>Copertura:</strong>{" "}
          {rimessaggio.copertura || "-"}
        </p>

        <p>
          <strong>Pagamento:</strong>{" "}
          {rimessaggio.pagamento || "Da pagare"}
        </p>
      </div>

      <div className="printSection">
        <div className="priceRows">
          <div>
            <span>Prezzo rimessaggio</span>

            <strong>
              {euro(
                numero(
                  rimessaggio.prezzoRimessaggio
                )
              )}
            </strong>
          </div>

          <div>
            <span>Acconto</span>

            <strong>
              {euro(
                numero(rimessaggio.acconto)
              )}
            </strong>
          </div>

          <div className="total">
            <span>Saldo</span>

            <strong>
              {euro(
                numero(
                  rimessaggio.prezzoRimessaggio
                ) -
                  numero(rimessaggio.acconto)
              )}
            </strong>
          </div>
        </div>
      </div>

      {rimessaggio.note && (
        <div className="printSection">
          <h2>Note</h2>
          <p>{rimessaggio.note}</p>
        </div>
      )}

      <div className="printFooter">
        <div>
          <strong>Firma cliente</strong>
          <div className="signatureLine"></div>
        </div>

        <div>
          <strong>Firma cantiere</strong>
          <div className="signatureLine"></div>
        </div>
      </div>
    </div>
  );
}
function ElencoRimessaggiStampabile({ rimessaggi }) {
  return (
    <div className="printArea">
      <div className="printHeader">
        <h1>Servizi Nautici Zenith</h1>
        <h2>Elenco Rimessaggi</h2>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
  <tr>
    <th style={{ border: "1px solid #000", padding: "8px" }}>
      Cliente
    </th>
    <th style={{ border: "1px solid #000", padding: "8px" }}>
      Imbarcazione
    </th>
    <th style={{ border: "1px solid #000", padding: "8px" }}>
      Telefono
    </th>
    <th style={{ border: "1px solid #000", padding: "8px" }}>
      Pagamento
    </th>
  </tr>
</thead>

        <tbody>
         {rimessaggi.map((r) => (
  <tr key={r.firebaseId}>
    <td style={{ border: "1px solid #000", padding: "6px" }}>
      {r.cliente}
    </td>

    <td style={{ border: "1px solid #000", padding: "6px" }}>
      {r.barca}
    </td>

    <td style={{ border: "1px solid #000", padding: "6px" }}>
      {r.telefono}
    </td>

    <td style={{ border: "1px solid #000", padding: "6px" }}>
      {r.pagamento}
    </td>
  </tr>
))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "20px",
          fontWeight: "bold",
        }}
      >
        Totale rimessaggi: {rimessaggi.length}
      </div>
    </div>
  );
}
function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => {
          if (type === "number") {
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function numero(valore) {
  return Number(String(valore || "0").replace(",", ".")) || 0;
}

function calcolaTotale(preventivo) {
  const manodopera =
    numero(preventivo.oreManodopera) *
    numero(preventivo.prezzoOra);

  const altro = numero(preventivo.altro);

  return manodopera + altro;
}

function euro(valore) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(valore || 0);
}

function formatData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("it-IT");
}


