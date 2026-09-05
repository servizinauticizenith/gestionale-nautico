import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
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
  const [allievi, setAllievi] = useState([]);
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
const [mostraFormCliente, setMostraFormCliente] = useState(false);
const [clienteInModifica, setClienteInModifica] = useState(null);
const [clienteAperto, setClienteAperto] = useState(null);
const [ordinaClientiPerSaldo, setOrdinaClientiPerSaldo] = useState(false);
const [ricercaGlobale, setRicercaGlobale] = useState("");
const [ricercaAllievi, setRicercaAllievi] = useState("");
const [mostraFormAllievo, setMostraFormAllievo] = useState(false);
const [nuovoVersamento, setNuovoVersamento] = useState({
  data: "",
  importo: "",
  metodo: "",
});
const [allievoInModifica, setAllievoInModifica] = useState(null);
const [formAllievo, setFormAllievo] = useState({
  nome: "",
  cognome: "",
  luogoNascita: "",
  provinciaNascita: "",
  dataNascita: "",
  indirizzo: "",
  civico: "",
  cap: "",
  citta: "",
  provincia: "",
  codiceFiscale: "",
  cellulare: "",
  email: "",
  documenti: {
  documentoIdentita: false,
  codiceFiscale: false,
  certificatoMedico: false,
  fototessere: false,
  bollettini: false,
  privacy: false,
  autocertificazione: false,
},
  costoCorso: "",
versamenti: [],
});
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
  const [vista, setVista] = useState("dashboard");
  const [sezione, setSezione] = useState("cantiere");
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
  
setMostraFormCliente(true);
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
const stopAllievi = onSnapshot(
  collection(db, "allievi"),
  (snapshot) => {
    const dati = snapshot.docs.map((documento) => ({
      ...documento.data(),
      firebaseId: documento.id,
    }));

    setAllievi(dati);
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
  stopAllievi();
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
async function generaRicevutaVersamento(allievo, versamento, index) {
  const pdf = new jsPDF();

  const logo = await fetch("/snz2.jpg")
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader();

          reader.onloadend = () => resolve(reader.result);

          reader.readAsDataURL(blob);
        })
    );

  const nomeCompleto =
    `${allievo.nome || ""} ${allievo.cognome || ""}`.trim();

  const dataPagamento = versamento.data
    ? new Date(
        versamento.data + "T00:00:00"
      ).toLocaleDateString("it-IT")
    : "-";

  const importo = Number(
    versamento.importo || 0
  ).toFixed(2);

  const totaleVersatoFinoAQui = (allievo.versamenti || [])
    .slice(0, index + 1)
    .reduce(
      (totale, v) =>
        totale + Number(v.importo || 0),
      0
    );

  const saldoMancante = Math.max(
    0,
    Number(allievo.costoCorso || 0) -
      totaleVersatoFinoAQui
  ).toFixed(2);

  // LOGO
  pdf.addImage(
    logo,
    "JPEG",
    20,
    15,
    30,
    30
  );

  // NOME SCUOLA
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text(
    "SCUOLA NAUTICA ZENITH",
    35,
    54,
    {
      align: "center",
    }
  );

  // DATA PAGAMENTO
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  pdf.text(
    `Data pagamento: ${dataPagamento}`,
    190,
    25,
    {
      align: "right",
    }
  );

  // TITOLO
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);

  pdf.text(
    "RICEVUTA DI PAGAMENTO",
    105,
    75,
    {
      align: "center",
    }
  );

  // LINEA
  pdf.line(20, 82, 190, 82);

  // ALLIEVO
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  pdf.text(
    "Ricevuto da:",
    20,
    95
  );

  pdf.setFont("helvetica", "bold");

  pdf.text(
    nomeCompleto || "-",
    50,
    95
  );

  pdf.setFont("helvetica", "normal");

  if (allievo.codiceFiscale) {
    pdf.text(
      `Codice fiscale: ${allievo.codiceFiscale}`,
      20,
      110
    );
  }

  // IMPORTO
  pdf.text(
    "Importo versato:",
    20,
    135
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);

  pdf.text(
    `EUR ${importo}`,
    60,
    135
  );

  // METODO
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  pdf.text(
    `Metodo di pagamento: ${versamento.metodo || "-"}`,
    20,
    150
  );

  // RESIDUO
  pdf.setFont("helvetica", "bold");

  pdf.text(
    `Importo residuo: EUR ${saldoMancante}`,
    20,
    175
  );

  // CAUSALE
  pdf.setFont("helvetica", "normal");

  pdf.text(
    "Pagamento relativo al corso per il conseguimento della patente nautica.",
    20,
    195
  );

  // FOOTER
  pdf.line(20, 215, 190, 215);

  pdf.setFontSize(9);

  pdf.text(
    "Documento generato dal Gestionale Scuola Nautica Zenith",
    105,
    228,
    {
      align: "center",
    }
  );

  // STAMPA DIRETTA
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
    finestraStampa.onload = () => {
      finestraStampa.print();
    };
  }
}
// QUI devono esserci le funzioni vere
// generaRicevutaVersamento
// generaPdfDaIncassare
function generaPdfDaIncassare() {
  const pdf = new jsPDF();

  const euro = (valore) =>
    `EUR ${Number(valore || 0).toFixed(2)}`;

  const allieviDaSaldare = allievi.filter((allievo) => {
    const totaleVersato = (allievo.versamenti || []).reduce(
      (somma, versamento) =>
        somma + Number(versamento.importo || 0),
      0
    );

    const residuo =
      Number(allievo.costoCorso || 0) - totaleVersato;

    return residuo > 0;
  });

  // TITOLO
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text(
    "SITUAZIONE ALLIEVI DA SALDARE",
    105,
    18,
    { align: "center" }
  );

  // DATA
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    `Data: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    28,
    { align: "right" }
  );

  pdf.line(15, 33, 195, 33);

  // COLONNE
  const xSinistra = 15;
  const xDestra = 108;
  const larghezzaColonna = 87;

  let ySinistra = 45;
  let yDestra = 45;

  // linea centrale
  pdf.line(103, 38, 103, 280);

  allieviDaSaldare.forEach((allievo, indice) => {
    const versamenti = allievo.versamenti || [];

    const totaleVersato = versamenti.reduce(
      (somma, versamento) =>
        somma + Number(versamento.importo || 0),
      0
    );

    const residuo = Math.max(
      0,
      Number(allievo.costoCorso || 0) - totaleVersato
    );

    const usaSinistra = indice % 2 === 0;

    const x = usaSinistra ? xSinistra : xDestra;
    let y = usaSinistra ? ySinistra : yDestra;

    // se siamo troppo in basso, nuova pagina
    if (y > 245) {
      pdf.addPage();

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);

      pdf.text(
        "SITUAZIONE ALLIEVI DA SALDARE",
        105,
        18,
        { align: "center" }
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);

      pdf.text(
        `Data: ${new Date().toLocaleDateString("it-IT")}`,
        190,
        28,
        { align: "right" }
      );

      pdf.line(15, 33, 195, 33);
      pdf.line(103, 38, 103, 280);
ySinistra = 45;
yDestra = 45;

y = 45;
}
 
    // NOME
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);

    pdf.text(
      `${indice + 1}. ${allievo.nome || ""} ${allievo.cognome || ""}`,
      x,
      y
    );

    y += 8;

    // COSTO CORSO
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    pdf.text(
      `Costo corso: ${euro(allievo.costoCorso)}`,
      x + 5,
      y
    );

    y += 7;

    // MOVIMENTI
    pdf.setFont("helvetica", "bold");

    pdf.text(
      "Movimenti:",
      x + 5,
      y
    );

    y += 6;

    pdf.setFont("helvetica", "normal");

    if (versamenti.length > 0) {
      versamenti.forEach((versamento) => {
        const data = versamento.data
          ? new Date(
              versamento.data + "T00:00:00"
            ).toLocaleDateString("it-IT")
          : "-";

        pdf.text(
          `${data}   ${euro(versamento.importo)}   ${versamento.metodo || "-"}`,
          x + 10,
          y
        );

        y += 6;
      });
    } else {
      pdf.text(
        "Nessun versamento registrato",
        x + 10,
        y
      );

      y += 6;
    }

    // TOTALI
    pdf.setFont("helvetica", "bold");

    pdf.text(
      `Totale versato: ${euro(totaleVersato)}`,
      x + 5,
      y
    );

    y += 6;

    pdf.setTextColor(220, 38, 38);

pdf.text(
  `Importo residuo: ${euro(residuo)}`,
  x + 5,
  y
);

pdf.setTextColor(0, 0, 0);

    y += 9;

    // linea sotto allievo
    pdf.line(
      x,
      y,
      x + larghezzaColonna,
      y
    );

    y += 10;

    if (usaSinistra) {
      ySinistra = y;
    } else {
      yDestra = y;
    }
  });

  if (allieviDaSaldare.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    pdf.text(
      "Nessun allievo con importi da saldare.",
      105,
      60,
      { align: "center" }
    );
  }

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
    finestraStampa.onload = () => {
      finestraStampa.print();
    };
  }
}

function generaEstrattoContoAllievo(allievo) {
  const pdf = new jsPDF();

  const euro = (valore) =>
    `EUR ${Number(valore || 0).toFixed(2)}`;

  const nomeCompleto =
    `${allievo.nome || ""} ${allievo.cognome || ""}`.trim();

  const versamenti = allievo.versamenti || [];

  const totaleVersato = versamenti.reduce(
    (somma, versamento) =>
      somma + Number(versamento.importo || 0),
    0
  );

  const residuo = Math.max(
    0,
    Number(allievo.costoCorso || 0) - totaleVersato
  );

  // TITOLO
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text(
    "ESTRATTO CONTO ALLIEVO",
    105,
    20,
    { align: "center" }
  );

  // DATA
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text(
    `Data: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    30,
    { align: "right" }
  );

  pdf.line(20, 35, 190, 35);

  // DATI ALLIEVO
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);

  pdf.text(
    nomeCompleto || "-",
    20,
    50
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  if (allievo.codiceFiscale) {
    pdf.text(
      `Codice fiscale: ${allievo.codiceFiscale}`,
      20,
      60
    );
  }
  

  pdf.text(
    `Costo corso: ${euro(allievo.costoCorso)}`,
    20,
    75
  );

  // MOVIMENTI
  let y = 92;

  pdf.setFont("helvetica", "bold");

  pdf.text(
    "MOVIMENTI",
    20,
    y
  );

  y += 10;

  pdf.setFont("helvetica", "normal");

  if (versamenti.length === 0) {
    pdf.text(
      "Nessun versamento registrato",
      20,
      y
    );

    y += 10;
  } else {
    versamenti.forEach((versamento, index) => {
      const data = versamento.data
        ? new Date(
            versamento.data + "T00:00:00"
          ).toLocaleDateString("it-IT")
        : "-";

      pdf.text(
        `${index + 1}. ${data}   ${euro(
          versamento.importo
        )}   ${versamento.metodo || "-"}`,
        20,
        y
      );

      y += 8;
    });
  }

  y += 5;

  pdf.line(20, y, 190, y);

  y += 12;

  // TOTALI
  pdf.setFont("helvetica", "bold");

  pdf.text(
    `Totale versato: ${euro(totaleVersato)}`,
    20,
    y
  );

  y += 10;

  if (residuo > 0) {
    pdf.setTextColor(220, 38, 38);
  }

  pdf.text(
    `Importo residuo: ${euro(residuo)}`,
    20,
    y
  );

  pdf.setTextColor(0, 0, 0);

  y += 20;

  pdf.line(20, y, 190, y);

  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    "Documento generato dal Gestionale Scuola Nautica Zenith",
    105,
    y,
    { align: "center" }
  );

  // APERTURA PDF
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  window.open(pdfUrl, "_blank");
}

function generaPdfDocumentiMancanti() {
  const pdf = new jsPDF();

  const etichetteDocumenti = {
    documentoIdentita: "Documento di identita",
    codiceFiscale: "Codice fiscale / Tessera sanitaria",
    certificatoMedico: "Certificato medico",
    fototessere: "Fototessere",
    bollettini: "Ricevute / Bollettini",
    privacy: "Modulo privacy",
    autocertificazione: "Autocertificazione",
  };

  const allieviConDocumentiMancanti = allievi
    .map((allievo) => {
      const documenti = allievo.documenti || {};

      const mancanti = Object.keys(etichetteDocumenti).filter(
        (chiave) => !documenti[chiave]
      );

      return {
        ...allievo,
        documentiMancanti: mancanti,
      };
    })
    .filter((allievo) => allievo.documentiMancanti.length > 0);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text(
    "DOCUMENTI MANCANTI ALLIEVI",
    105,
    20,
    { align: "center" }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    `Data: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    30,
    { align: "right" }
  );

  pdf.line(20, 35, 190, 35);

  let y = 48;

  allieviConDocumentiMancanti.forEach((allievo, index) => {
    if (y > 245) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);

    pdf.text(
      `${index + 1}. ${allievo.nome || ""} ${allievo.cognome || ""}`,
      20,
      y
    );

    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    allievo.documentiMancanti.forEach((chiave) => {
      pdf.text(
        `- ${etichetteDocumenti[chiave]}`,
        28,
        y
      );

      y += 6;
    });

    y += 4;

    pdf.line(20, y, 190, y);

    y += 9;
  });

  if (allieviConDocumentiMancanti.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    pdf.text(
      "Tutti gli allievi hanno consegnato i documenti richiesti.",
      105,
      60,
      { align: "center" }
    );
  }

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
    finestraStampa.onload = () => {
      finestraStampa.print();
    };
  }
}
function generaPdfIncassiBonifico() {
  const pdf = new jsPDF();

  const movimentiBonifico = allievi.flatMap((allievo) =>
    (allievo.versamenti || [])
      .filter((versamento) => versamento.metodo === "Bonifico")
      .map((versamento) => ({
        nome: `${allievo.nome || ""} ${allievo.cognome || ""}`.trim(),
        data: versamento.data || "",
        importo: Number(versamento.importo || 0),
      }))
  );

  const totaleBonifico = movimentiBonifico.reduce(
    (totale, movimento) => totale + movimento.importo,
    0
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text(
    "INCASSI BONIFICO",
    105,
    20,
    { align: "center" }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    `Data stampa: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    30,
    { align: "right" }
  );

  pdf.line(20, 35, 190, 35);

  let y = 48;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  pdf.text("Allievo", 20, y);
  pdf.text("Data", 115, y);
  pdf.text("Importo", 190, y, { align: "right" });

  y += 5;

  pdf.line(20, y, 190, y);

  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  movimentiBonifico.forEach((movimento) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    const data = movimento.data
      ? new Date(
          movimento.data + "T00:00:00"
        ).toLocaleDateString("it-IT")
      : "-";

    pdf.text(
      movimento.nome || "-",
      20,
      y
    );

    pdf.text(
      data,
      115,
      y
    );

    pdf.text(
      `EUR ${movimento.importo.toFixed(2)}`,
      190,
      y,
      { align: "right" }
    );

    y += 8;
  });

  if (movimentiBonifico.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    pdf.text(
      "Nessun incasso tramite bonifico registrato.",
      105,
      65,
      { align: "center" }
    );

    y = 80;
  }

  y += 3;

  pdf.line(20, y, 190, y);

  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text(
    `TOTALE BONIFICI: EUR ${totaleBonifico.toFixed(2)}`,
    190,
    y,
    { align: "right" }
  );

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
  finestraStampa.onload = () => {
    finestraStampa.print();
  };
}
}

function generaPdfIncassiPos() {
  const pdf = new jsPDF();

  const movimentiPos = allievi.flatMap((allievo) =>
    (allievo.versamenti || [])
      .filter((versamento) => versamento.metodo === "POS")
      .map((versamento) => ({
        nome: `${allievo.nome || ""} ${allievo.cognome || ""}`.trim(),
        data: versamento.data || "",
        importo: Number(versamento.importo || 0),
      }))
  );

  const totalePos = movimentiPos.reduce(
    (totale, movimento) => totale + movimento.importo,
    0
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text("INCASSI POS", 105, 20, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    `Data stampa: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    30,
    { align: "right" }
  );

  pdf.line(20, 35, 190, 35);

  let y = 48;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  pdf.text("Allievo", 20, y);
  pdf.text("Data", 115, y);
  pdf.text("Importo", 190, y, { align: "right" });

  y += 5;
  pdf.line(20, y, 190, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  movimentiPos.forEach((movimento) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    const data = movimento.data
      ? new Date(
          movimento.data + "T00:00:00"
        ).toLocaleDateString("it-IT")
      : "-";

    pdf.text(movimento.nome || "-", 20, y);
    pdf.text(data, 115, y);

    pdf.text(
      `EUR ${movimento.importo.toFixed(2)}`,
      190,
      y,
      { align: "right" }
    );

    y += 8;
  });

  if (movimentiPos.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    pdf.text(
      "Nessun incasso tramite POS registrato.",
      105,
      65,
      { align: "center" }
    );

    y = 80;
  }

  y += 3;
  pdf.line(20, y, 190, y);
  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text(
    `TOTALE POS: EUR ${totalePos.toFixed(2)}`,
    190,
    y,
    { align: "right" }
  );

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
    finestraStampa.onload = () => {
      finestraStampa.print();
    };
  }
}
function generaPdfIncassiContanti() {
  const pdf = new jsPDF();

  const movimentiContanti = allievi.flatMap((allievo) =>
    (allievo.versamenti || [])
      .filter((versamento) => versamento.metodo === "Contanti")
      .map((versamento) => ({
        nome: `${allievo.nome || ""} ${allievo.cognome || ""}`.trim(),
        data: versamento.data || "",
        importo: Number(versamento.importo || 0),
      }))
  );

  const totaleContanti = movimentiContanti.reduce(
    (totale, movimento) => totale + movimento.importo,
    0
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  pdf.text("INCASSI CONTANTI", 105, 20, {
    align: "center",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(
    `Data stampa: ${new Date().toLocaleDateString("it-IT")}`,
    190,
    30,
    { align: "right" }
  );

  pdf.line(20, 35, 190, 35);

  let y = 48;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  pdf.text("Allievo", 20, y);
  pdf.text("Data", 115, y);
  pdf.text("Importo", 190, y, { align: "right" });

  y += 5;
  pdf.line(20, y, 190, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  movimentiContanti.forEach((movimento) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    const data = movimento.data
      ? new Date(
          movimento.data + "T00:00:00"
        ).toLocaleDateString("it-IT")
      : "-";

    pdf.text(movimento.nome || "-", 20, y);
    pdf.text(data, 115, y);

    pdf.text(
      `EUR ${movimento.importo.toFixed(2)}`,
      190,
      y,
      { align: "right" }
    );

    y += 8;
  });

  if (movimentiContanti.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    pdf.text(
      "Nessun incasso in contanti registrato.",
      105,
      65,
      { align: "center" }
    );

    y = 80;
  }

  y += 3;
  pdf.line(20, y, 190, y);
  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text(
    `TOTALE CONTANTI: EUR ${totaleContanti.toFixed(2)}`,
    190,
    y,
    { align: "right" }
  );

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const finestraStampa = window.open(pdfUrl);

  if (finestraStampa) {
    finestraStampa.onload = () => {
      finestraStampa.print();
    };
  }
}
async function salvaAllievo(e) {
  e.preventDefault();

  if (
    !formAllievo.nome.trim() ||
    !formAllievo.cognome.trim()
  ) {
    alert("Inserisci almeno nome e cognome");
    return;
  }

  if (allievoInModifica) {
    await updateDoc(
      doc(db, "allievi", allievoInModifica),
      formAllievo
    );

    alert("Allievo aggiornato");

    setAllievoInModifica(null);
  } else {
    await addDoc(
      collection(db, "allievi"),
      {
        ...formAllievo,
        creatoIl: new Date().toISOString(),
      }
    );

    alert("Allievo salvato");
  }

  setFormAllievo({
    nome: "",
    cognome: "",
    luogoNascita: "",
    provinciaNascita: "",
    dataNascita: "",
    indirizzo: "",
    civico: "",
    cap: "",
    citta: "",
    provincia: "",
    codiceFiscale: "",
    cellulare: "",
    email: "",
    documenti: {
  documentoIdentita: false,
  codiceFiscale: false,
  certificatoMedico: false,
  fototessere: false,
  bollettini: false,
  privacy: false,
  autocertificazione: false,
},
    costoCorso: "",
    versamenti: [],
  });

  setMostraFormAllievo(false);
}
async function eliminaAllievo(allievo) {
  const conferma = window.confirm(
    `Vuoi eliminare definitivamente ${allievo.nome} ${allievo.cognome}?`
  );

  if (!conferma) return;

  await deleteDoc(doc(db, "allievi", allievo.firebaseId));

  alert("Allievo eliminato");
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
    Cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    note: "",
  });
  setMostraFormCliente(false);
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

const lavoriInScadenza = [...lavori]
  .filter((lavoro) => {
    const stato = (lavoro.stato || "").trim().toLowerCase();

    return (
      lavoro.consegna &&
      stato !== "terminato" &&
      stato !== "consegnato"
    );
  })
  .sort(
    (a, b) =>
      new Date(a.consegna) - new Date(b.consegna)
  )
  .slice(0, 5);

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

      <div
  className="page"
  style={{
    marginLeft: "240px",
    width: "calc(100% - 240px)",
  }}
>
        <header className="header">
  <div>
    <h1>
  {sezione === "scuola"
    ? "Gestionale Scuola Nautica"
    : "Gestionale Cantiere Nautico"}
</h1>

<p>
  {sezione === "scuola"
    ? "Allievi, documenti e incassi"
    : "Clienti, lavori officina, preventivi e rimessaggi"}
</p>
  </div>

  <div className="headerActions">
    <div className="userInfo">
      <span className="userEmail">{utente.email}</span>
      <span className="userRole">Amministratore</span>
    </div>

    <button onClick={esci} className="logoutBtn">
      Esci
    </button>
  </div>
</header>

        
        
<div className="sidebarMenu">
       <div className="sidebarBrand">
  <div className="sidebarTitle">SEA SRLS</div>

  <div className="sidebarSectionSwitch">
    <button
      type="button"
      className={sezione === "cantiere" ? "activeSection" : ""}
      onClick={() => {
        setSezione("cantiere");
        setVista("dashboard");
      }}
    >
      Cantiere
    </button>

    <button
      type="button"
      className={sezione === "scuola" ? "activeSection" : ""}
      onClick={() => {
        setSezione("scuola");
        setVista("dashboardScuola");
      }}
    >
      Scuola
    </button>
  </div>
</div>


  {sezione === "cantiere" && (
  <button
    className={vista === "dashboard" ? "active" : ""}
    onClick={() => setVista("dashboard")}
  >
    Dashboard
  </button>
)}
  {sezione === "cantiere" && (
  <button
    className={vista === "clienti" ? "active" : ""}
    onClick={() => setVista("clienti")}
  >
    Clienti
  </button>
)}

  

{sezione === "cantiere" && (
  <button
    className={vista === "lavori" ? "active" : ""}
    onClick={() => {
      setVista("lavori");
      setForm(nuovoLavoroVuoto());
      setLavoroInModifica(null);
    }}
  >
    Lavori
  </button>
)}
{sezione === "cantiere" && (
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
)}

    {sezione === "cantiere" && (
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
)}
{sezione === "scuola" && (
  <>
  <div
  style={{
    margin: "10px 10px 6px",
    fontSize: "11px",
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  }}
>
  GESTIONE SCUOLA
</div>
    <button
      className={vista === "allievi" ? "active" : ""}
      onClick={() => setVista("allievi")}
    >
      Allievi
    </button>

    
    <button
  type="button"
  onClick={generaPdfDocumentiMancanti}
>
  Documenti mancanti
</button>

   <hr
  style={{
    width: "calc(100% - 16px)",
    margin: "12px 8px",
    border: "none",
    borderTop: "1px solid rgba(255,255,255,0.55)",
  }}
/>

<div
  style={{
    height: "1px",
    background: "rgba(255,255,255,.14)",
    margin: "8px 10px",
  }}
/>
<div
  style={{
    margin: "10px 10px 6px",
    fontSize: "11px",
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  }}
>
  NUOVI ISCRITTI
</div>
<button
  className={vista === "iscrizioni" ? "active" : ""}
  onClick={() => setVista("iscrizioni")}
>
  Iscrizioni
</button>

<hr
  style={{
    width: "calc(100% - 16px)",
    margin: "12px 8px",
    border: "none",
    borderTop: "1px solid rgba(255,255,255,0.55)",
  }}
/>

<div
  style={{
    margin: "10px 10px 6px",
    fontSize: "11px",
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  }}
>
  CONTABILITA'
</div>

<button
  className={vista === "incassiScuola" ? "active" : ""}
  onClick={() => setVista("incassiScuola")}
>
  Da incassare
</button>
<button
  type="button"
  onClick={generaPdfIncassiBonifico}
>
  Incassi Bonifico
</button>

<button
  type="button"
  onClick={generaPdfIncassiPos}
>
  Incassi POS
</button>

<button
  type="button"
  onClick={generaPdfIncassiContanti}
>
  Incassi Contanti
</button>
  </>
)}
)}
{sezione === "scuola" && (
  <div
    className="sidebarSearch"
    style={{
      position: "relative",
      zIndex: 50,
      width: "100%",
      marginTop: "12px",
    }}
  >
    <input
      type="text"
      placeholder="Cerca allievo: nome, cognome, codice fiscale, cellulare..."
      value={ricercaAllievi}
      onChange={(e) => setRicercaAllievi(e.target.value)}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: "1px solid #cbd5e1",
        borderRadius: "10px",
        fontSize: "14px",
      }}
    />
  </div>
)}

 <div
  className="sidebarSearch"
  style={{
  position: "relative",
  zIndex: 50,
  width: "100%",
  display: sezione === "cantiere" ? "block" : "none",
}}
>
  <input
    type="text"
    placeholder="Ricerca globale: cliente, barca, matricola, LAV, PREV, RIM..."
    value={ricercaGlobale}
    onChange={(e) => setRicercaGlobale(e.target.value)}
    style={{
      width: "100%",
      padding: "12px 14px",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      fontSize: "14px",
    }}
  />

  {ricercaGlobale.trim() && (
    <div
  style={{
  position: "fixed",
top: "20px",
left: "250px",
  width: "680px",
  maxWidth: "70vw",
  zIndex: 2000,
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  overflow: "hidden",
  background: "white",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
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


<div className="sidebarStatsBottom">

  <div className="sidebarStatBtn">
    <span>Lavori aperti</span>
    <strong>{riepilogo.aperti}</strong>
  </div>

  <div className="sidebarStatBtn">
    <span>Lavori da incassare</span>

    <strong>
      {riepilogo.daIncassare}{" "}
      <span
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#93c5fd",
        }}
      >
        ({euro(riepilogo.totaleDaIncassare)})
      </span>
    </strong>
  </div>

  <div className="sidebarStatBtn">
    <span>Rimessaggi da incassare</span>

    <strong>
      {riepilogo.rimessaggiDaIncassare}{" "}
      <span
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#93c5fd",
        }}
      >
        ({euro(riepilogo.totaleRimessaggiDaIncassare)})
      </span>
    </strong>
  </div>

</div>
</div>

{(vista === "lavori" || vista === "incassi") && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "10px",
      margin: "14px 0 18px",
      flexWrap: "wrap",
    }}
  >
    <select
      value={filtroAnnoLavori}
      onChange={(e) => setFiltroAnnoLavori(e.target.value)}
      style={{
        padding: "8px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "white",
      }}
    >
      <option value="Tutti">Tutti gli anni</option>
      <option value="2026">2026</option>
      <option value="2025">2025</option>
      <option value="2024">2024</option>
    </select>

    <select
      value={filtroStato}
      onChange={(e) => setFiltroStato(e.target.value)}
      style={{
        padding: "8px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "white",
      }}
    >
      <option value="Tutti">Tutti gli stati</option>
      <option value="In lavorazione">In lavorazione</option>
      <option value="Terminato">Terminato</option>
    </select>

    <select
      value={filtroPagamento}
      onChange={(e) => setFiltroPagamento(e.target.value)}
      style={{
        padding: "8px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "white",
      }}
    >
      <option value="Tutti">Tutti pagamenti</option>
      <option value="Non pagato">Non pagato</option>
      <option value="Pagato">Pagato</option>
      <option value="Fatturato">Fatturato</option>
    </select>

    <button
      type="button"
      onClick={() => {
        setStampaElencoLavori(true);

        setTimeout(() => {
          window.print();
          setStampaElencoLavori(false);
        }, 300);
      }}
      style={{
        padding: "8px 14px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "white",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      PDF Lavori aperti
    </button>
  </div>
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

<main
  className="layout"
  style={{
    gridTemplateColumns:
  vista === "clienti" ||
  vista === "incassi" ||
  vista === "allievi" ||
  vista === "incassiScuola"
    ? "1fr"
    : "minmax(0, 1fr) minmax(620px, 1.35fr)",
  }}
>
  {sezione === "scuola" && vista === "allievi" && (
  <section
    style={{
      width: "100%",
      background: "#ffffff",
      borderRadius: "14px",
      padding: "22px",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "22px",
            color: "#0f172a",
          }}
        >
          Allievi
        </h2>

        <div
          style={{
            marginTop: "4px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Archivio allievi della scuola nautica
        </div>
      </div>

      <button
  type="button"
  className="primary"
  onClick={() => setMostraFormAllievo(true)}
>
  + Nuovo allievo
</button>
    </div>

    {!mostraFormAllievo && (
  <>
    {allievi.length === 0 ? (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
          color: "#94a3b8",
          border: "1px dashed #cbd5e1",
          borderRadius: "10px",
        }}
      >
        Nessun allievo inserito
      </div>
    ) : (
      <div
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        {allievi.map((allievo) => (
  <div
    key={allievo.firebaseId}
    style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "16px 18px",
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1fr 190px",
      gap: "16px",
      alignItems: "center",
    }}
  >
    <div>
      <strong
        style={{
          fontSize: "16px",
          color: "#0f172a",
        }}
      >
        {allievo.nome} {allievo.cognome}
      </strong>

      <div
        style={{
          marginTop: "4px",
          fontSize: "13px",
          color: "#64748b",
        }}
      >
        {allievo.codiceFiscale || "-"}
      </div>
    </div>

    <div
      style={{
        fontSize: "14px",
        color: "#334155",
      }}
    >
      {allievo.cellulare || "-"}
    </div>

    <div
      style={{
        fontSize: "14px",
        color: "#334155",
        textAlign: "right",
      }}
    >
      {allievo.citta || "-"}
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
      }}
    >
    <button
  type="button"
  className="clientBtn"
  onClick={() => generaEstrattoContoAllievo(allievo)}
  style={{
    background: "#2563eb",
    color: "white",
  }}
>
  Estratto conto
</button>
      <button
        type="button"
        className="clientBtn editBtn"
        onClick={() => {
          setFormAllievo({
            nome: allievo.nome || "",
            cognome: allievo.cognome || "",
            luogoNascita: allievo.luogoNascita || "",
provinciaNascita: allievo.provinciaNascita || "",
dataNascita: allievo.dataNascita || "",
            indirizzo: allievo.indirizzo || "",
            civico: allievo.civico || "",
            cap: allievo.cap || "",
            citta: allievo.citta || "",
            provincia: allievo.provincia || "",
            codiceFiscale: allievo.codiceFiscale || "",
            cellulare: allievo.cellulare || "",
            email: allievo.email || "",
            documenti: {
  documentoIdentita: allievo.documenti?.documentoIdentita || false,
  codiceFiscale: allievo.documenti?.codiceFiscale || false,
  certificatoMedico: allievo.documenti?.certificatoMedico || false,
  fototessere: allievo.documenti?.fototessere || false,
  bollettini: allievo.documenti?.bollettini || false,
  privacy: allievo.documenti?.privacy || false,
  autocertificazione: allievo.documenti?.autocertificazione || false,
},
            costoCorso: allievo.costoCorso || "",
versamenti: allievo.versamenti || [],
          });

          setAllievoInModifica(allievo.firebaseId);
          setMostraFormAllievo(true);
        }}
      >
        Modifica
      </button>

      <button
        type="button"
        className="clientBtn"
        style={{
          background: "#dc2626",
          color: "white",
        }}
        onClick={() => eliminaAllievo(allievo)}
      >
        Elimina
      </button>
    </div>
  </div>
))}
      </div>
    )}
  </>
)}

{mostraFormAllievo && (
  <form
  onSubmit={salvaAllievo}
  style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "18px",
      
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "18px",
          color: "#0f172a",
        }}
      >
        {allievoInModifica ? "Modifica allievo" : "Nuovo allievo"}
      </h3>

      <button
        type="button"
        onClick={() => setMostraFormAllievo(false)}
        style={{
          border: "none",
          background: "transparent",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
    <div
  style={{
    marginBottom: "12px",
    fontSize: "13px",
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }}
>
  Dati anagrafici
</div>

   <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 120px 0.5fr",
    gap: "16px",
    width: "100%",
  }}
>
  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
    Nome
  </span>

  <input
    type="text"
    value={formAllievo.nome}
    onChange={(e) =>
      setFormAllievo({
        ...formAllievo,
        nome: e.target.value,
      })
    }
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
    }}
  />
</label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Cognome
    </span>
    <input
  type="text"
  value={formAllievo.cognome}
  onChange={(e) =>
    setFormAllievo({
      ...formAllievo,
      cognome: e.target.value,
    })
  }
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
  }}
/>
  </label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Luogo di nascita
    </span>
    <input
  type="text"
  value={formAllievo.luogoNascita}
  onChange={(e) =>
    setFormAllievo({
      ...formAllievo,
      luogoNascita: e.target.value,
    })
  }
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
  }}
/>
  </label>
  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
    Provincia
  </span>

  <input
    type="text"
    value={formAllievo.provinciaNascita}
    onChange={(e) =>
      setFormAllievo({
        ...formAllievo,
        provinciaNascita: e.target.value.toUpperCase(),
      })
    }
    maxLength={2}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
      textTransform: "uppercase",
    }}
  />
</label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Data di nascita
    </span>
    <input
  type="date"
  value={formAllievo.dataNascita}
  onChange={(e) =>
    setFormAllievo({
      ...formAllievo,
      dataNascita: e.target.value,
    })
  }
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
  }}
/>
  </label>
</div>
<div
  style={{
    marginTop: "24px",
    marginBottom: "12px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }}
>
  Residenza
</div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "20% 60px 200px 50px 70px 180px 120px 290px",
    gap: "16px",
    marginTop: "18px",
  }}
>
  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Indirizzo
    </span>

    <input
      type="text"
      value={formAllievo.indirizzo}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          indirizzo: e.target.value,
        })
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
  </label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Civico
    </span>

    <input
      type="text"
      value={formAllievo.civico}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          civico: e.target.value,
        })
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
  </label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Città
    </span>

    <input
      type="text"
      value={formAllievo.citta}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          citta: e.target.value,
        })
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
  </label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      Provincia
    </span>

    <input
      type="text"
      value={formAllievo.provincia}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          provincia: e.target.value.toUpperCase(),
        })
      }
      maxLength={2}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
        textTransform: "uppercase",
      }}
    />
  </label>

  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
      CAP
    </span>

    <input
      type="text"
      value={formAllievo.cap}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          cap: e.target.value,
        })
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
  </label>
  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
    Codice fiscale
  </span>

  <input
    type="text"
    value={formAllievo.codiceFiscale}
    onChange={(e) =>
      setFormAllievo({
        ...formAllievo,
        codiceFiscale: e.target.value.toUpperCase(),
      })
    }
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
      textTransform: "uppercase",
    }}
  />
</label>

<label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
    Cellulare
  </span>

  <input
    type="tel"
    value={formAllievo.cellulare}
    onChange={(e) =>
      setFormAllievo({
        ...formAllievo,
        cellulare: e.target.value,
      })
    }
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
    }}
  />
</label>
<label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
    Email
  </span>

  <input
    type="email"
    value={formAllievo.email}
    onChange={(e) =>
      setFormAllievo({
        ...formAllievo,
        email: e.target.value,
      })
    }
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
    }}
  />
</label>
</div>
<div
  style={{
    marginTop: "24px",
    marginBottom: "12px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "800",
    color: "#dc2626",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }}
>
  Dati finanziari
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "180px",
    gap: "16px",
  }}
>
  <label
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }}
  >
    <span
      style={{
        fontSize: "13px",
        fontWeight: "700",
        color: "#334155",
      }}
    >
      Costo corso €
    </span>

    <input
      type="number"
      step="0.01"
      min="0"
      value={formAllievo.costoCorso}
      onChange={(e) =>
        setFormAllievo({
          ...formAllievo,
          costoCorso: e.target.value,
        })
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
  </label>
</div>
<div
  style={{
    marginTop: "18px",
  }}
>
  <div
    style={{
      fontSize: "13px",
      fontWeight: "800",
      color: "#334155",
      marginBottom: "10px",
    }}
  >
    Versamenti
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "150px 160px 180px 120px",
      gap: "12px",
      alignItems: "end",
    }}
  >
    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
        Data
      </span>

      <input
        type="date"
        value={nuovoVersamento.data}
        onChange={(e) =>
          setNuovoVersamento({
            ...nuovoVersamento,
            data: e.target.value,
          })
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          fontSize: "14px",
        }}
      />
    </label>

    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
        Importo €
      </span>

      <input
        type="number"
        step="0.01"
        min="0"
        value={nuovoVersamento.importo}
        onChange={(e) =>
          setNuovoVersamento({
            ...nuovoVersamento,
            importo: e.target.value,
          })
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          fontSize: "14px",
        }}
      />
    </label>

    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
        Metodo
      </span>

      <select
        value={nuovoVersamento.metodo}
        onChange={(e) =>
          setNuovoVersamento({
            ...nuovoVersamento,
            metodo: e.target.value,
          })
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          fontSize: "14px",
          background: "white",
        }}
      >
        <option value="">Seleziona</option>
        <option value="Contanti">Contanti</option>
        <option value="Bonifico">Bonifico</option>
        <option value="POS">POS</option>
      </select>
    </label>

    <button
      type="button"
      className="primary"
      onClick={() => {
        if (!nuovoVersamento.data || !nuovoVersamento.importo) {
          alert("Inserisci data e importo");
          return;
        }

        setFormAllievo({
          ...formAllievo,
          versamenti: [
            ...(formAllievo.versamenti || []),
            nuovoVersamento,
          ],
        });

        setNuovoVersamento({
          data: "",
          importo: "",
          metodo: "",
        });
      }}
    >
      + Aggiungi
    </button>
  </div>
</div>
{(formAllievo.versamenti || []).length > 0 && (
  <div
    style={{
      marginTop: "18px",
      borderTop: "1px solid #e2e8f0",
      paddingTop: "14px",
    }}
  >
    {(formAllievo.versamenti || []).map((versamento, index) => (
      <div
        key={index}
        style={{
          display: "grid",
          gridTemplateColumns: "150px 160px 180px 220px",
          gap: "12px",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div>
  {versamento.data
    ? new Date(versamento.data + "T00:00:00").toLocaleDateString("it-IT")
    : "-"}
</div>

        <div>
          € {Number(versamento.importo || 0).toFixed(2)}
        </div>

        <div>{versamento.metodo || "-"}</div>

        <div
  style={{
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  }}
>
  <button
    type="button"
    onClick={() =>
      generaRicevutaVersamento(
        formAllievo,
        versamento,
        index
      )
    }
    style={{
      padding: "7px 12px",
      border: "none",
      borderRadius: "7px",
      background: "#2563eb",
      color: "white",
      fontWeight: "700",
      cursor: "pointer",
    }}
  >
    Ricevuta
  </button>

  <button
    type="button"
    onClick={() => {
      const nuoviVersamenti = [
        ...(formAllievo.versamenti || []),
      ];

      nuoviVersamenti.splice(index, 1);

      setFormAllievo({
        ...formAllievo,
        versamenti: nuoviVersamenti,
      });
    }}
    style={{
      padding: "7px 12px",
      border: "none",
      borderRadius: "7px",
      background: "#dc2626",
      color: "white",
      fontWeight: "700",
      cursor: "pointer",
    }}
  >
    Elimina
  </button>
</div>
      </div>
    ))}

    <div
      style={{
        marginTop: "16px",
        display: "flex",
        justifyContent: "flex-end",
        gap: "30px",
        fontWeight: "700",
      }}
    >
      <div>
        Totale versato: €
        {" "}
        {(formAllievo.versamenti || [])
          .reduce(
            (totale, versamento) =>
              totale + Number(versamento.importo || 0),
            0
          )
          .toFixed(2)}
      </div>

      <div
  style={{
    color:
      Math.max(
        0,
        Number(formAllievo.costoCorso || 0) -
          (formAllievo.versamenti || []).reduce(
            (totale, versamento) =>
              totale + Number(versamento.importo || 0),
            0
          )
      ) > 0
        ? "#dc2626"
        : "#334155",
    fontWeight: "800",
  }}
>
  Saldo mancante: €
  {" "}
  {Math.max(
    0,
    Number(formAllievo.costoCorso || 0) -
      (formAllievo.versamenti || []).reduce(
        (totale, versamento) =>
          totale + Number(versamento.importo || 0),
        0
      )
  ).toFixed(2)}
</div>
    </div>
  </div>
)}
<div
  style={{
    marginTop: "24px",
    marginBottom: "12px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }}
>
  Documenti
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px 16px",
  }}
>
  {[
    ["documentoIdentita", "Documento di identità"],
    ["codiceFiscale", "Codice fiscale / Tessera sanitaria"],
    ["certificatoMedico", "Certificato medico"],
    ["fototessere", "Fototessere"],
    ["bollettini", "Ricevute / Bollettini"],
    ["privacy", "Modulo privacy"],
    ["autocertificazione", "Autocertificazione"],
  ].map(([chiave, etichetta]) => (
    <label
      key={chiave}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        color: "#334155",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={formAllievo.documenti?.[chiave] || false}
        onChange={(e) =>
          setFormAllievo({
            ...formAllievo,
            documenti: {
              ...(formAllievo.documenti || {}),
              [chiave]: e.target.checked,
            },
          })
        }
      />

      {etichetta}
    </label>
  ))}
</div>
<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  }}
>
  <button
    type="button"
    onClick={() => {
      setMostraFormAllievo(false);
      setAllievoInModifica(null);

      setFormAllievo({
        nome: "",
        cognome: "",
        luogoNascita: "",
        provinciaNascita: "",
        dataNascita: "",
        indirizzo: "",
        civico: "",
        cap: "",
        citta: "",
        provincia: "",
        codiceFiscale: "",
        cellulare: "",
        email: "",
        costoCorso: "",
        versamenti: [],
      });
    }}
  >
    Annulla
  </button>

  <button type="submit" className="primary">
    {allievoInModifica ? "Salva modifiche" : "Salva allievo"}
  </button>
</div>
</form>
)}

</section>
)}
{sezione === "scuola" && vista === "incassiScuola" && (
  <section
    style={{
      width: "100%",
      background: "#ffffff",
      borderRadius: "14px",
      padding: "22px",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px",
      }}
    >
            <div>
        <h2
          style={{
            margin: 0,
            fontSize: "22px",
            color: "#0f172a",
          }}
        >
          Incassi
        </h2>

        <div
          style={{
            marginTop: "4px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
         Situazione economica degli allievi
        </div>
      </div>

      <button
        type="button"
        className="primary"
        onClick={generaPdfDaIncassare}
      >
        Stampa situazione PDF
      </button>
      
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "16px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          Totale incassato
        </div>

        <div
          style={{
            marginTop: "6px",
            fontSize: "24px",
            fontWeight: "800",
            color: "#0f172a",
          }}
        >
          €{" "}
          {allievi
            .reduce(
              (totale, allievo) =>
                totale +
                (allievo.versamenti || []).reduce(
                  (somma, versamento) =>
                    somma + Number(versamento.importo || 0),
                  0
                ),
              0
            )
            .toFixed(2)}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #fecaca",
          borderRadius: "12px",
          padding: "16px",
          background: "#fff7f7",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#991b1b",
            textTransform: "uppercase",
          }}
        >
          Totale da incassare
        </div>

        <div
          style={{
            marginTop: "6px",
            fontSize: "24px",
            fontWeight: "800",
            color: "#dc2626",
          }}
        >
          €{" "}
          {allievi
            .reduce((totale, allievo) => {
              const versato = (allievo.versamenti || []).reduce(
                (somma, versamento) =>
                  somma + Number(versamento.importo || 0),
                0
              );

              return (
                totale +
                Math.max(
                  0,
                  Number(allievo.costoCorso || 0) - versato
                )
              );
            }, 0)
            .toFixed(2)}
        </div>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gap: "10px",
      }}
    >
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "1.5fr 140px 140px 140px 120px",
    gap: "16px",
    alignItems: "center",
    padding: "0 16px 8px 16px",
    fontSize: "12px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  }}
>
  <div>Allievo</div>
  <div>Costo corso</div>
  <div>Versato</div>
  <div>Da incassare</div>
  <div>Stato</div>
</div>
      {allievi
  .filter((allievo) => {
    const totaleVersato = (allievo.versamenti || []).reduce(
      (somma, versamento) =>
        somma + Number(versamento.importo || 0),
      0
    );

    const residuo = Math.max(
      0,
      Number(allievo.costoCorso || 0) - totaleVersato
    );

    return residuo > 0;
  })
  .map((allievo) => {
        const totaleVersato = (allievo.versamenti || []).reduce(
          (somma, versamento) =>
            somma + Number(versamento.importo || 0),
          0
        );

        const residuo = Math.max(
          0,
          Number(allievo.costoCorso || 0) - totaleVersato
        );

        return (
          <div
            key={allievo.firebaseId}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 140px 140px 140px 120px",
              gap: "16px",
              alignItems: "center",
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontWeight: "700", color: "#0f172a" }}>
              {allievo.nome} {allievo.cognome}
            </div>

            <div>
              € {Number(allievo.costoCorso || 0).toFixed(2)}
            </div>

            <div>
              € {totaleVersato.toFixed(2)}
            </div>

            <div
              style={{
                fontWeight: "800",
                color: residuo > 0 ? "#dc2626" : "#15803d",
              }}
            >
              € {residuo.toFixed(2)}
            </div>

            <div
              style={{
                fontWeight: "700",
                color: residuo > 0 ? "#dc2626" : "#15803d",
              }}
            >
              {residuo > 0 ? "Da saldare" : "Saldato"}
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

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
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  }}
>
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
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  }}
>
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
</div>

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
          {(vista === "lavori" || vista === "incassi") && (
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
<div
  className="twoCols"
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    width: "100%",
  }}
>
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
</div>

<div className="twoCols">
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
</div>

<Input
  label="Matricola"
  value={form.matricola || ""}
  onChange={(v) => setForm({ ...form, matricola: v })}
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
  <div
    className="cards"
    style={{
      width: "100%",
      maxWidth: "none",
    }}
  >
    <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "14px",
  }}
>
  <button
    type="button"
    className="primary"
    onClick={() => {
  setFormCliente({
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    note: "",
  });
  setClienteInModifica(null);
  setMostraFormCliente(true);
}}
  >
    + Nuovo cliente
  </button>
</div>
{mostraFormCliente && (
  <form
  className="clientForm"
    onSubmit={salvaCliente}
    style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      padding: "24px",
      marginBottom: "20px",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    }}
  >
    {/* Intestazione */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "22px",
        paddingBottom: "14px",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            color: "#0f172a",
          }}
        >
          Nuovo cliente
        </h2>

        <div
          style={{
            marginTop: "4px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Inserisci i dati anagrafici e dell'imbarcazione
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMostraFormCliente(false)}
        style={{
          border: "none",
          background: "#f1f5f9",
          borderRadius: "8px",
          width: "34px",
          height: "34px",
          cursor: "pointer",
          fontSize: "18px",
          color: "#475569",
        }}
      >
        ×
      </button>
    </div>

    {/* Dati cliente */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "14px",
        marginBottom: "16px",
      }}
    >
      <Input
        label="Nome e cognome *"
        value={formCliente.cliente}
        onChange={(v) =>
          setFormCliente({ ...formCliente, cliente: v })
        }
      />

  

      <Input
        label="Telefono"
        value={formCliente.telefono}
        onChange={(v) =>
          setFormCliente({ ...formCliente, telefono: v })
        }
      />
    </div>

    {/* Dati imbarcazione */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "14px",
        marginBottom: "16px",
      }}
    >
      <Input
        label="Imbarcazione"
        value={formCliente.barca}
        onChange={(v) =>
          setFormCliente({ ...formCliente, barca: v })
        }
      />

      <Input
        label="Motore"
        value={formCliente.motore}
        onChange={(v) =>
          setFormCliente({ ...formCliente, motore: v })
        }
      />

      <Input
        label="Matricola"
        value={formCliente.matricola}
        onChange={(v) =>
          setFormCliente({ ...formCliente, matricola: v })
        }
      />
    </div>

    {/* Note */}
    <div style={{ marginBottom: "20px" }}>
      <Textarea
        label="Note"
        value={formCliente.note}
        onChange={(v) =>
          setFormCliente({ ...formCliente, note: v })
        }
      />
    </div>

    {/* Pulsanti */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        paddingTop: "16px",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <button
        type="button"
        onClick={() => setMostraFormCliente(false)}
        style={{
          padding: "9px 18px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: "#ffffff",
          cursor: "pointer",
          fontWeight: "600",
          color: "#475569",
        }}
      >
        Annulla
      </button>

      <button
        type="submit"
        className="primary"
        style={{
          padding: "9px 20px",
          borderRadius: "8px",
          fontWeight: "700",
        }}
      >
        Salva cliente
      </button>
    </div>
  </form>
)}

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
  className="job clientJob"
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
      <strong
  style={{
    display: "block",
    textAlign: "left",
    marginBottom: "8px",
    fontSize: "18px",
  }}
>
  {cliente.cliente}
</strong>

      <div
        style={{
          fontSize: "13px",
          color: "#666",
          marginTop: "4px",
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "320px 220px",
    gap: "8px 28px",
    marginTop: "8px",
    fontSize: "13px",
    color: "#666",
    alignItems: "center",
  }}
>
  <div>
    Barca / Motore:{" "}
    <strong>
      {cliente.barca || "-"} | {cliente.motore || "-"}
    </strong>
  </div>

  <div>
    Saldo lavori: <strong>{euro(saldoLavoriCliente)}</strong>
  </div>

  <div>
    Lavori: <strong>{lavoriCliente.length}</strong> | Preventivi:{" "}
    <strong>{preventiviCliente.length}</strong> | Rimessaggi:{" "}
    <strong>{rimessaggiCliente.length}</strong>
  </div>

  <div>
    Saldo rimessaggi: <strong>{euro(saldoRimessaggiCliente)}</strong>
  </div>

  <div>
    Stato:
    <span
      style={{
        marginLeft: "8px",
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

  <div>
    Saldo totale: <strong>{euro(saldoTotaleCliente)}</strong>
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


