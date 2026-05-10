import React, { useEffect, useMemo, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
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
    id: `LAV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    lavoro: "",
    stato: "Accettazione",
    priorita: "Normale",
    tecnico: "",
    ingresso: new Date().toISOString().slice(0, 10),
    consegna: "",
    ricambi: "",
    costoRicambi: "",
oreManodopera: "",
prezzoOra: "45",
altro: "",
    note: "",
  };
}

function nuovoPreventivoVuoto() {
  return {
    id: `PREV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    data: new Date().toISOString().slice(0, 10),
    cliente: "",
    telefono: "",
    barca: "",
    motore: "",
    matricola: "",
    descrizione: "",
    ricambi: "",
    costoRicambi: "",
    oreManodopera: "",
    prezzoOra: "45",
    altro: "",
    stato: "Da preparare",
    note: "",
  };
}

export default function App() {
  const [lavori, setLavori] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clientiDb, setClientiDb] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [utente, setUtente] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erroreLogin, setErroreLogin] = useState("");
  

  const [form, setForm] = useState(nuovoLavoroVuoto());
  const [lavoroInModifica, setLavoroInModifica] = useState(null);
  const [formPreventivo, setFormPreventivo] = useState(nuovoPreventivoVuoto());
  const [formCliente, setFormCliente] = useState({
  cliente: "",
  telefono: "",
  barca: "",
  motore: "",
  matricola: "",
  note: "",
});
const [clienteInModifica, setClienteInModifica] = useState(null);
  const [preventivoInModifica, setPreventivoInModifica] = useState(null);
  const [ricerca, setRicerca] = useState("");
  const [ricercaClienteLavoro, setRicercaClienteLavoro] = useState("");
  const [filtroStato, setFiltroStato] = useState("Tutti");
  const [vista, setVista] = useState("lavori");
  const [preventivoDaStampare, setPreventivoDaStampare] = useState(null);
  
  const [lavoroDaStampare, setLavoroDaStampare] = useState(null);
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

    const stopPreventivi = onSnapshot(collection(db, "preventivi"), (snapshot) => {
      const stopClienti = onSnapshot(collection(db, "clienti"), (snapshot) => {
  const dati = snapshot.docs.map((documento) => ({
    firebaseId: documento.id,
    ...documento.data(),
  }));

  setClientiDb(dati);
});
      const dati = snapshot.docs.map((documento) => ({
        firebaseId: documento.id,
        ...documento.data(),
      }));
      setPreventivi(dati);
    });

    return () => {
      stopLavori();
      stopPreventivi();
      stopClienti();
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

  const datiLavoro = { ...form };
  delete datiLavoro.firebaseId;

  if (lavoroInModifica) {
    await updateDoc(doc(db, "lavori", lavoroInModifica), datiLavoro);
    setLavoroInModifica(null);
  } else {
    await addDoc(collection(db, "lavori"), datiLavoro);
  }

  setForm(nuovoLavoroVuoto());
}

  async function aggiungiPreventivo(e) {
    e.preventDefault();

    if (!formPreventivo.cliente.trim() || !formPreventivo.descrizione.trim()) {
      alert("Inserisci almeno cliente e descrizione preventivo.");
      return;
    }

    const datiPreventivo = { ...formPreventivo };
    delete datiPreventivo.firebaseId;

    if (preventivoInModifica) {
      await updateDoc(doc(db, "preventivi", preventivoInModifica), datiPreventivo);
      setPreventivoInModifica(null);
    } else {
      await addDoc(collection(db, "preventivi"), datiPreventivo);
    }

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
  if (!firebaseId) {
    alert("ID lavoro mancante");
    return;
  }

  const conferma = window.confirm("Vuoi eliminare questo lavoro?");
  if (!conferma) return;

  try {
    await deleteDoc(doc(db, "lavori", firebaseId));
    alert("Lavoro eliminato");
  } catch (errore) {
    console.error("Errore eliminazione lavoro:", errore);
    alert("Errore durante eliminazione lavoro: " + errore.message);
  }
}

  async function eliminaPreventivo(firebaseId) {
    if (!firebaseId) return;
    if (!confirm("Vuoi eliminare questo preventivo?")) return;
    await deleteDoc(doc(db, "preventivi", firebaseId));

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
  margin-top: 4px;
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
            padding: 16px;
            margin-bottom: 16px;
            border-radius: 10px;
          }

          .twoCols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
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
            margin-top: 45px;
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
          <h2>Descrizione lavori</h2>
          <p>${preventivo.descrizione || "-"}</p>
        </div>

        <div class="section">
          <h2>Ricambi / materiali</h2>
          <p>${preventivo.ricambi || "-"}</p>
        </div>

        <div class="section">
          <h2>Dettaglio economico</h2>
          <div class="priceRows">
            <div><span>Ricambi / materiali</span><strong>${euro(numero(preventivo.costoRicambi))}</strong></div>
            <div><span>Manodopera (${preventivo.oreManodopera || 0} h x ${euro(numero(preventivo.prezzoOra))})</span><strong>${euro(manodopera)}</strong></div>
            <div><span>Altro</span><strong>${euro(numero(preventivo.altro))}</strong></div>
            <div class="total"><span>Totale preventivo</span><strong>${euro(totale)}</strong></div>
          </div>
        </div>

        <div class="section">
          <h2>Note</h2>
          <p>${preventivo.note || "-"}</p>
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

        <p class="small">
          Preventivo salvo diversa indicazione. Eventuali lavorazioni aggiuntive verranno comunicate prima dell'esecuzione.
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
    async function creaLavoroDaPreventivo(preventivo) {
  if (!confirm("Vuoi trasformare questo preventivo in un lavoro?")) return;

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

  
}
  async function creaLavoroDaPreventivo(preventivo) {
  if (!confirm("Vuoi trasformare questo preventivo in un lavoro?")) return;

  if (!preventivo.firebaseId) {
    alert("Errore: ID preventivo mancante. Il lavoro è stato bloccato per evitare duplicati.");
    return;
  }

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

  setVista("lavori");
}
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
      ricambi: lavoro.ricambi || "",
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
      const testo = Object.values(lavoro).join(" ").toLowerCase();
      const matchRicerca = testo.includes(ricerca.toLowerCase());
      const matchStato = filtroStato === "Tutti" || lavoro.stato === filtroStato;
      return matchRicerca && matchStato;
    });
  }, [lavori, ricerca, filtroStato]);

  const clientiFiltrati = useMemo(() => {
    return clienti.filter((cliente) => {
      const testo = Object.values(cliente).join(" ").toLowerCase();
      return testo.includes(ricerca.toLowerCase());
    });
  }, [clienti, ricerca]);

  const preventiviFiltrati = useMemo(() => {
    return preventivi.filter((preventivo) => {
      const testo = Object.values(preventivo).join(" ").toLowerCase();
      return testo.includes(ricerca.toLowerCase());
    });
  }, [preventivi, ricerca]);

  const riepilogo = {
    aperti: lavori.filter((l) => !["Terminato", "Consegnato"].includes(l.stato)).length,
    urgenti: lavori.filter((l) => ["Alta", "Urgente"].includes(l.priorita)).length,
    attesaRicambi: lavori.filter((l) => l.stato === "Attesa ricambi").length,
    preventivi: preventivi.length,
  };

  const totaleFormPreventivo = calcolaTotale(formPreventivo);
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

  return testo.includes(ricercaClienteLavoro.toLowerCase());
});

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
      {preventivoDaStampare && <PreventivoStampabile preventivo={preventivoDaStampare} />}
      {lavoroDaStampare && (
  <LavoroStampabile lavoro={lavoroDaStampare} />
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
          <div className="stat"><span>Priorità alta</span><strong>{riepilogo.urgenti}</strong></div>
          <div className="stat"><span>Attesa ricambi</span><strong>{riepilogo.attesaRicambi}</strong></div>
          <div className="stat"><span>Preventivi</span><strong>{riepilogo.preventivi}</strong></div>
        </section>

        <div className="tabs">
          <button className={vista === "lavori" ? "active" : ""} onClick={() => setVista("lavori")}>Lavori officina</button>
          <button className={vista === "clienti" ? "active" : ""} onClick={() => setVista("clienti")}>Archivio clienti</button>
          <button className={vista === "preventivi" ? "active" : ""} onClick={() => setVista("preventivi")}>Preventivi</button>
        </div>

        <main className="layout">
          {vista === "lavori" && (
            <section className="panel">
              <h2>Nuovo lavoro</h2>
<form onSubmit={aggiungiLavoro} className="form">

  {!form.cliente && (    <>
      <label>
        Cerca cliente registrato

  <input
    type="text"
    placeholder="Scrivi nome, cognome, telefono, motore o matricola"
    value={ricercaClienteLavoro}
    onChange={(e) => setRicercaClienteLavoro(e.target.value)}
  />
</label>

{ricercaClienteLavoro && (
  <div className="clientSearchResults">
    {clientiRicercatiLavoro.map((cliente) => (
      <button
        type="button"
        key={cliente.firebaseId}
        onClick={() => {
  setForm({
    ...form,
            cliente: cliente.cliente || "",
            telefono: cliente.telefono || "",
            barca: cliente.barca || "",
            motore: cliente.motore || "",
            matricola: cliente.matricola || "",
          });

          setRicercaClienteLavoro("");
        }}
      >
        <strong>{cliente.cliente}</strong>

        <span>
          {cliente.telefono || "Telefono non indicato"} ·{" "}
          {cliente.motore || "Motore non indicato"}
        </span>
      </button>
    ))}
  </div>
)}
  </>
)}
<Input
  label="Titolo lavoro"
  value={form.titolo || ""}
  onChange={(v) => setForm({ ...form, titolo: v })}
/>

                <Input label="Cliente *" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} />
                <Input label="Telefono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
                <Input label="Imbarcazione" value={form.barca} onChange={(v) => setForm({ ...form, barca: v })} />
                <Input label="Motore" value={form.motore} onChange={(v) => setForm({ ...form, motore: v })} />
                <Input label="Matricola" value={form.matricola} onChange={(v) => setForm({ ...form, matricola: v })} />
                <Textarea label="Lavoro richiesto *" value={form.lavoro} onChange={(v) => setForm({ ...form, lavoro: v })} />

                <div className="twoCols">
                  <Select label="Stato" value={form.stato} options={stati} onChange={(v) => setForm({ ...form, stato: v })} />
                                  </div>

                <Input label="Tecnico" value={form.tecnico} onChange={(v) => setForm({ ...form, tecnico: v })} />

                <div className="twoCols">
                  <Input label="Ingresso" type="date" value={form.ingresso} onChange={(v) => setForm({ ...form, ingresso: v })} />
                  <Input label="Consegna" type="date" value={form.consegna} onChange={(v) => setForm({ ...form, consegna: v })} />
                </div>

                <Textarea
  label="Ricambi"
  value={form.ricambi}
  onChange={(v) => setForm({ ...form, ricambi: v })}
  
/>
<div className="twoCols">
  <Input
    label="Costo ricambi euro"
    value={form.costoRicambi}
    onChange={(v) => setForm({ ...form, costoRicambi: v })}
  />

  <Input
    label="Ore manodopera"
    value={form.oreManodopera}
    onChange={(v) => setForm({ ...form, oreManodopera: v })}
  />
</div>

<div className="twoCols">
  <Input
    label="Prezzo ora euro"
    value={form.prezzoOra}
    onChange={(v) => setForm({ ...form, prezzoOra: v })}
  />

  <Input
    label="Altro euro"
    value={form.altro}
    onChange={(v) => setForm({ ...form, altro: v })}
  />
</div>
                <Textarea label="Note" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />

                <button className="primary" type="submit">
  {lavoroInModifica ? "Aggiorna lavoro" : "Aggiungi lavoro"}
</button>
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
    placeholder="Scrivi nome, cognome, telefono, motore o matricola"
    value={ricercaClienteLavoro}
    onChange={(e) => setRicercaClienteLavoro(e.target.value)}
  />
</label>

{ricercaClienteLavoro && (
  <div className="clientSearchResults">
    {clientiRicercatiLavoro.map((cliente) => (
      <button
        type="button"
        key={cliente.firebaseId}
        onClick={() => {
          setFormPreventivo({
  ...formPreventivo,
            cliente: cliente.cliente || "",
            telefono: cliente.telefono || "",
            barca: cliente.barca || "",
            motore: cliente.motore || "",
            matricola: cliente.matricola || "",
          });

          setRicercaClienteLavoro("");
        }}
      >
        <strong>{cliente.cliente}</strong>

        <span>
          {cliente.telefono || "Telefono non indicato"} ·{" "}
          {cliente.motore || "Motore non indicato"}
        </span>
      </button>
    ))}
  </div>
)}
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

          <section className="content">
            {vista !== "clienti" && (
  <div className="filters">
    <input
      placeholder="Cerca cliente, motore, matricola, lavoro, preventivo..."
      value={ricerca}
      onChange={(e) => setRicerca(e.target.value)}
    />

    {vista === "lavori" && (
      <select value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)}>
        <option>Tutti</option>
        {stati.map((s) => <option key={s}>{s}</option>)}
      </select>
    )}
  </div>
)}

            {vista === "lavori" && (
              <div className="cards">
                {lavoriFiltrati.map((lavoro) => (
                  <article className="job lavoro" key={lavoro.firebaseId || lavoro.id}>
                    <div className="jobTop">
                      <div>
                        <span className="id">{lavoro.id}</span>
                        <h3 className="titoloLavoro">
  <strong>Titolo:</strong> {lavoro.titolo || "Lavoro officina"}
</h3>

<p>
  <strong>Cliente:</strong> {lavoro.cliente}
</p>

<p>{lavoro.telefono}</p>
                      </div>
                     <div className="actions">
  <button
  className="actionBtn editBtn"
  onClick={() => {
    setForm({ ...lavoro });
    setLavoroInModifica(lavoro.firebaseId);
  }}
>
  ✏️ Modifica
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
  📄 PDF
</button>

<button
  type="button"
  className="actionBtn deleteBtn"
  onClick={() => eliminaLavoro(lavoro.firebaseId)}
>
  🗑 Elimina
</button>
</div>
                    </div>

                    <div className="badges">
  
</div>

                    <div className="gridInfo">
                      <p><strong>Barca:</strong> {lavoro.barca || "-"}</p>
                      <p><strong>Motore:</strong> {lavoro.motore || "-"}</p>
                      <p><strong>Matricola:</strong> {lavoro.matricola || "-"}</p>
                      <p><strong>Tecnico:</strong> {lavoro.tecnico || "-"}</p>
                      <p><strong>Ingresso:</strong> {formatData(lavoro.ingresso)}</p>
                      <p><strong>Consegna:</strong> {formatData(lavoro.consegna)}</p>
                    </div>

                  
                  
                    {lavoro.note && <p><strong>Note:</strong> {lavoro.note}</p>}
                                      </article>
                ))}
              </div>
            )}


                    
                       

    {vista === "clienti" && (
  <>
    <label className="clientSearchBox">
      Cerca cliente

      <input
        type="text"
        placeholder="Nome, telefono, motore, matricola..."
        value={ricercaClienteLavoro}
        onChange={(e) => setRicercaClienteLavoro(e.target.value)}
      />
    </label>

   <div className="cards">
  {clientiRicercatiLavoro.map((cliente) => {
    const lavoriCliente = lavori.filter(
      (lavoro) => lavoro.cliente === cliente.cliente
    );

    const preventiviCliente = preventivi.filter(
      (preventivo) => preventivo.cliente === cliente.cliente
    );

    return (
      <article className="job" key={cliente.firebaseId}>
        <div className="jobTop">
          <div>
            <span className="id">CLIENTE</span>
            <h3>{cliente.cliente}</h3>
            <p>{cliente.telefono || "Telefono non indicato"}</p>
          </div>

          <div className="clientActions">
            <button
              className="clientBtn editBtn"
              onClick={() => modificaCliente(cliente)}
            >
              ✏️ Modifica
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
              ➕ Nuovo preventivo
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
              🔧 Nuovo lavoro
            </button>
          </div>
        </div>

        <div className="gridInfo">
          <p><strong>Imbarcazione:</strong> {cliente.barca || "-"}</p>
<p><strong>Motore:</strong> {cliente.motore || "-"}</p>

<p><strong>Matricola:</strong> {cliente.matricola || "-"}</p>
<p></p>

<p><strong>Lavori:</strong> {lavoriCliente.length}</p>
<p><strong>Preventivi:</strong> {preventiviCliente.length}</p>
        </div>

        {cliente.note && (
          <p className="work">
            <strong>Note:</strong> {cliente.note}
          </p>
        )}
            </article>
    );
  })}
</div>
  </>
)}
            {vista === "preventivi" && (
              <div className="cards">
                {preventiviFiltrati.map((preventivo) => (
                  <article className="job preventivo" key={preventivo.firebaseId || preventivo.id}>
                    <div className="jobTop">
                      <div>
                        <span className="id">{preventivo.id}</span>
                        <h3 className="titoloPreventivo">
  <strong>Titolo:</strong> {preventivo.titolo || "Preventivo"}
</h3>

<p>
  <strong>Cliente:</strong> {preventivo.cliente}
</p>

<p>{preventivo.telefono}</p>
                      </div>
                      <div className="actions">
                        <button className="actionBtn editBtn" onClick={() => modificaPreventivo(preventivo)}>
  ✏️ Modifica
</button>

<button
  className="actionBtn pdfBtn"
  onClick={() => stampaPreventivo(preventivo)}
>
  📄 PDF
</button>

<button
  className="actionBtn lavoroBtn"
  onClick={() => creaLavoroDaPreventivo(preventivo)}
>
  🔧 Lavoro
</button>

<button
  className="actionBtn deleteBtn"
  onClick={() => eliminaPreventivo(preventivo.firebaseId)}
>
  🗑 Elimina
</button>
                      </div>
                    </div>

                    <div className="badges">
                      <span>{preventivo.stato}</span>
                      <span>Totale: {euro(calcolaTotale(preventivo))}</span>
                    </div>

                    <div className="gridInfo">
                      <p><strong>Data:</strong> {formatData(preventivo.data)}</p>
                      <p><strong>Barca:</strong> {preventivo.barca || "-"}</p>
                      <p><strong>Motore:</strong> {preventivo.motore || "-"}</p>
                      <p><strong>Matricola:</strong> {preventivo.matricola || "-"}</p>
                      <p><strong>Ricambi euro:</strong> {euro(numero(preventivo.costoRicambi))}</p>
                      <p><strong>Manodopera:</strong> {preventivo.oreManodopera || 0} h x {euro(numero(preventivo.prezzoOra))}</p>
                    </div>

                  
                  
                    {preventivo.note && <p><strong>Note:</strong> {preventivo.note}</p>}

                    
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function PreventivoStampabile({ preventivo }) {
  const totale = calcolaTotale(preventivo);
  const manodopera = numero(preventivo.oreManodopera) * numero(preventivo.prezzoOra);

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

      <div className="printSection">
        <h2>Ricambi / materiali</h2>
        <p>{preventivo.ricambi || "-"}</p>
      </div>

      <div className="printSection">
        <h2>Dettaglio economico</h2>
        <div className="priceRows">
          <div><span>Ricambi / materiali</span><strong>{euro(numero(preventivo.costoRicambi))}</strong></div>
          <div><span>Manodopera ({preventivo.oreManodopera || 0} h x {euro(numero(preventivo.prezzoOra))})</span><strong>{euro(manodopera)}</strong></div>
          <div><span>Altro</span><strong>{euro(numero(preventivo.altro))}</strong></div>
          <div className="total"><span>Totale preventivo</span><strong>{euro(totale)}</strong></div>
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

      <div className="printSection">
        <h2>Titolo lavoro</h2>
        <p>{lavoro.titolo || "-"}</p>
      </div>

      <div className="printSection">
        <h2>Lavoro richiesto</h2>
        <p>{lavoro.lavoro || "-"}</p>
      </div>

      <div className="printSection">
        <h2>Ricambi / materiali</h2>
        <p>{lavoro.ricambi || "-"}</p>
      </div>
      <div className="printSection">
  <h2>Dettaglio economico</h2>

  <div className="priceRows">
    <div>
      <span>Ricambi / materiali</span>
      <strong>{euro(numero(lavoro.costoRicambi))}</strong>
    </div>

    <div>
      <span>
        Manodopera ({lavoro.oreManodopera || 0} h x {euro(numero(lavoro.prezzoOra))})
      </span>
      <strong>
        {euro(
  (parseFloat(lavoro.oreManodopera || 0)) *
  (parseFloat(lavoro.prezzoOra || 0))
)}
      </strong>
    </div>

    <div>
      <span>Altro</span>
      <strong>{euro(numero(lavoro.altro))}</strong>
    </div>

    <div className="total">
  <span>Totale lavoro</span>

  <strong>
    {euro(
      numero(lavoro.costoRicambi) +
      (parseFloat(lavoro.oreManodopera || 0)) *
      (parseFloat(lavoro.prezzoOra || 0)) +
      numero(lavoro.altro)
    )}
  </strong>
</div>
  </div>
</div>

      {lavoro.note && (
        <div className="printSection">
          <h2>Note</h2>
          <p>{lavoro.note}</p>
        </div>
      )}

      <div className="printFooter">
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

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows="3" />
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
  const ricambi = numero(preventivo.costoRicambi);
  const manodopera = numero(preventivo.oreManodopera) * numero(preventivo.prezzoOra);
  const altro = numero(preventivo.altro);
  return ricambi + manodopera + altro;
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
