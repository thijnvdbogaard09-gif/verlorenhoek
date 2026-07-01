'use strict';

// ===== NAVIGATIE =====
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link[data-sec]');

function showSection(id) {
  sections.forEach(s => s.classList.toggle('active', s.id === 'sec-' + id));
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.sec === id));
  document.documentElement.scrollTop = 0;
}

document.body.addEventListener('click', e => {
  const btn = e.target.closest('[data-sec]');
  if (!btn) return;
  const sec = btn.dataset.sec;
  if (btn.dataset.acco) {
    const sel = document.getElementById('wAcco');
    if (sel) {
      const opt = [...sel.options].find(o => o.value === btn.dataset.acco);
      if (opt) sel.value = btn.dataset.acco;
    }
  }
  showSection(sec);
});

// ===== VERBLIJVEN: UITKLAPPANELS =====
document.querySelectorAll('[data-toggle]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.toggle;
    const panel = document.getElementById('panel-' + id);
    if (!panel) return;
    const opening = !panel.classList.contains('open');
    document.querySelectorAll('.feats-panel').forEach(p => p.classList.remove('open'));
    if (opening) panel.classList.add('open');
  });
});
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('panel-' + btn.dataset.close)?.classList.remove('open');
  });
});

// ===== KALENDER =====
const KAL_SRC = {
  zwaluwnest: 'https://dashboard.vakantieadressen.nl/widget/1748/6034dd5d0808f',
  kievitsnest: 'https://dashboard.vakantieadressen.nl/widget/1749/6034dd5d0ee76'
};
const kalFrame = document.getElementById('kalFrame');
document.querySelectorAll('.kal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.kal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (kalFrame) kalFrame.src = KAL_SRC[btn.dataset.kal] || KAL_SRC.zwaluwnest;
  });
});

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
document.querySelectorAll('[data-lb]').forEach(el => {
  el.addEventListener('click', () => {
    lbImg.src = el.dataset.lb;
    lightbox.classList.add('open');
  });
});
document.getElementById('lbClose')?.addEventListener('click', () => lightbox.classList.remove('open'));
lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });

// ===== AANVRAAG FORMULIER =====
const wSubmit = document.getElementById('wSubmit');
const wReset  = document.getElementById('wReset');
let wCurrentLang = 'nl';

wSubmit?.addEventListener('click', () => {
  const name = document.getElementById('wName').value.trim();
  if (!name) { document.getElementById('wName').focus(); return; }

  const sel   = document.getElementById('wAcco');
  const acco  = sel.options[sel.selectedIndex].text;
  const from  = document.getElementById('wFrom').value;
  const to    = document.getElementById('wTo').value;
  const people = document.getElementById('wPeople').value;
  const loc   = wCurrentLang === 'de' ? 'de-DE' : wCurrentLang === 'en' ? 'en-GB' : 'nl-NL';
  const fmt   = d => d ? new Date(d).toLocaleDateString(loc, {day:'numeric',month:'long',year:'numeric'}) : '—';
  const L = wCurrentLang === 'de'
    ? {acco:'Unterkunft', from:'Anreise', to:'Abreise', people:'Personen', name:'Name'}
    : wCurrentLang === 'en'
    ? {acco:'Accommodation', from:'Arrival', to:'Departure', people:'People', name:'Name'}
    : {acco:'Accommodatie', from:'Aankomst', to:'Vertrek', people:'Personen', name:'Naam'};

  document.getElementById('wRecap').innerHTML = [
    [L.acco, acco], [L.from, fmt(from)], [L.to, fmt(to)],
    [L.people, people||'—'], [L.name, name]
  ].map(([k,v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('');

  document.getElementById('bookFormView').style.display = 'none';
  document.getElementById('bookSuccess').classList.add('show');
});

wReset?.addEventListener('click', () => {
  document.getElementById('bookFormView').style.display = '';
  document.getElementById('bookSuccess').classList.remove('show');
  ['wFrom','wTo','wPeople','wName','wEmail','wPhone','wNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
});

// ===== PRIJSCALCULATOR =====
const CALC_PRICES = {
  zwaluwnest: {
    laag:  {weekend:1100, langweekend:1250, midweek:1375, week:1700},
    laag2: {weekend:1100, langweekend:1250, midweek:1475, week:1800},
    hoog:  {weekend:1100, langweekend:1325, midweek:1575, week:1975}
  },
  kievitsnest: {
    laag:  {weekend:1225, langweekend:1275, midweek:1500, week:2250},
    laag2: {weekend:1275, langweekend:1375, midweek:1500, week:2250},
    hoog:  {weekend:1375, langweekend:1425, midweek:1575, week:2375}
  }
};
const CALC_TREKKERSHUT   = {weekend:140, langweekend:210, week:390, ppn:37.50};
const CALC_ENERGIE       = {weekend:90, langweekend:90, midweek:180, week:315};
const CALC_MAX_PERSONEN  = {zwaluwnest:18, kievitsnest:22, trekkershut:2};
const CALC_VASTE_NACHTEN = {weekend:2, langweekend:3, midweek:5};

const cAccoSel    = document.getElementById('cAcco');
const cPeriodeSel = document.getElementById('cPeriode');
const cPersonenEl = document.getElementById('cPersonen');
const cNachtenEl  = document.getElementById('cNachten');
const cSeizoenWrap = document.getElementById('cSeizoenWrap');
const cNachtenWrap = document.getElementById('cNachtenWrap');

function calcUpdate() {
  const acco   = cAccoSel.value;
  const periode = cPeriodeSel.value;
  cSeizoenWrap.style.display = acco === 'trekkershut' ? 'none' : '';
  const maxP = CALC_MAX_PERSONEN[acco] || 25;
  cPersonenEl.max = maxP;
  if (parseInt(cPersonenEl.value) > maxP) cPersonenEl.value = maxP;
  if (periode === 'week') {
    cNachtenWrap.style.display = '';
    cNachtenEl.disabled = false;
  } else {
    cNachtenWrap.style.display = 'none';
    cNachtenEl.disabled = true;
    cNachtenEl.value = CALC_VASTE_NACHTEN[periode] || 7;
  }
}
cAccoSel?.addEventListener('change', calcUpdate);
cPeriodeSel?.addEventListener('change', calcUpdate);
calcUpdate();

document.getElementById('cBereken')?.addEventListener('click', () => {
  const acco     = cAccoSel.value;
  const periode  = cPeriodeSel.value;
  const seizoen  = document.getElementById('cSeizoen').value;
  const personen = Math.max(1, parseInt(cPersonenEl.value) || 1);
  const nachten  = Math.max(1, parseInt(cNachtenEl.value) || 1);
  const hond     = document.getElementById('cHond').checked;
  const lakens   = document.getElementById('cLakens').checked;
  const handdk   = document.getElementById('cHanddoeken').checked;

  const pLabel = {weekend:'Weekend', langweekend:'Lang weekend', midweek:'Midweek', week:'Week'};
  const rows = [];
  let basis = 0;

  if (acco === 'trekkershut') {
    if (periode === 'midweek') {
      basis = CALC_TREKKERSHUT.ppn * personen * nachten;
      rows.push([`Trekkershut, ${nachten} nachten × ${personen} pers.`, basis]);
    } else {
      basis = CALC_TREKKERSHUT[periode] || 0;
      rows.push([`Trekkershut, ${pLabel[periode]}`, basis]);
    }
  } else {
    basis = CALC_PRICES[acco]?.[seizoen]?.[periode] || 0;
    rows.push([`${acco === 'zwaluwnest' ? 'Zwaluwnest' : 'Kievitsnest'}, ${pLabel[periode]}`, basis]);
    const energie = CALC_ENERGIE[periode] || 0;
    basis += energie + 145;
    rows.push(['Energiekosten', energie], ['Schoonmaakkosten', 145]);
  }

  const toerBel = 2.50 * personen * nachten;
  basis += toerBel;
  rows.push([`Toeristenbelasting (${personen} × ${nachten} nachten)`, toerBel]);
  if (hond)   { basis += 25;                      rows.push(['Hond', 25]); }
  if (lakens) { const v = 7.25*personen; basis += v; rows.push([`Lakenpakket (${personen} pers.)`, v]); }
  if (handdk) { const v = 4.75*personen; basis += v; rows.push([`Handdoekpakket (${personen} pers.)`, v]); }

  const fmt = n => '€\u00a0' + n.toLocaleString('nl-NL', {minimumFractionDigits: n%1?2:0, maximumFractionDigits:2});
  document.getElementById('cBreakdown').innerHTML =
    rows.map(([l,v]) => `<div class="crow"><span>${l}</span><strong>${fmt(v)}</strong></div>`).join('');
  document.getElementById('cTotaal').textContent = fmt(basis);
  document.getElementById('cResult').style.display = 'block';
});

// ===== I18N =====
const MAP_DE = {
  "Samen weg,":"Gemeinsam weg,","midden in de natuur":"mitten in der Natur",
  "Een vrijliggend verblijf voor 18 tot 22 personen, omringd door bos en heide in Weert.":"Eine frei gelegene Unterkunft für 18 bis 22 Personen, umgeben von Wald und Heide in Weert.",
  "Aanvraag doen":"Anfrage senden","Bekijk verblijven":"Unterkünfte ansehen",
  "Welkom op de hoeve":"Willkommen auf dem Hof","Ruimte, gastvrijheid en rust":"Raum, Gastfreundschaft und Ruhe",
  "Op zoek naar een fijn onderkomen voor een weekendje weg, familieweekend of groepsuitje? Bij Hans en Eric van den Bogaard ben je aan het juiste adres. Jong of oud, valide of mindervalide — iedereen is welkom.":"Auf der Suche nach einer schönen Unterkunft für ein Wochenende, ein Familienwochenende oder einen Gruppenausflug? Bei Hans und Eric van den Bogaard sind Sie an der richtigen Adresse. Jung oder alt, mit oder ohne Einschränkung — bei uns ist jeder willkommen.",
  "Twee accommodaties":"Zwei Unterkünfte","Kievitsnest (22) en Zwaluwnest (18), geheel vrijliggend.":"Kievitsnest (22) und Zwaluwnest (18), komplett frei gelegen.",
  "Voor iedereen":"Für jeden","Zorgfaciliteiten en goede toegankelijkheid op aanvraag.":"Pflegeeinrichtungen und gute Barrierefreiheit auf Anfrage.",
  "Midden in de natuur":"Mitten in der Natur","Direct gelegen aan bos en heide in de Groene Regio.":"Direkt an Wald und Heide in der Groene Regio gelegen.",
  "Van alles te doen":"Viel zu erleben","Dierenpark, zwemparadijs, bowlen en meer in de buurt.":"Tierpark, Schwimmparadies, Bowling und mehr in der Nähe.",
  "Last minute":"Last Minute","Spontaan een weekend vrij?":"Spontan ein Wochenende frei?",
  "Vraag naar onze last-minute mogelijkheden — we kijken graag samen wat er kan.":"Fragen Sie nach unseren Last-Minute-Angeboten — wir schauen gern gemeinsam, was möglich ist.",
  "Verblijven":"Unterkünfte","Omgeving":"Umgebung","Aanvragen":"Anfragen","Faciliteiten":"Ausstattung","Info":"Info",
  "Kies jullie plek":"Wählt euren Platz",
  "Twee ruime, vrijliggende groepsaccommodaties en een trekkershut — elk met een eigen sfeer. Klik op een verblijf voor meer details.":"Zwei geräumige, frei gelegene Gruppenunterkünfte und eine Trekkinghütte — jede mit eigenem Charakter. Klicken Sie auf eine Unterkunft für mehr Details.",
  "8 tot 18 personen":"8 bis 18 Personen","Tot 22 personen":"Bis 22 Personen","Kleine groep":"Kleine Gruppe",
  "Hooggelegen accommodatie voor verenigingen, families en vriendengroepen. Met stapelbedden en gewone bedden, een groot overdekt terras en een ruime buitenspeelweide.":"Erhöht gelegene Unterkunft für Vereine, Familien und Freundesgruppen. Mit Etagenbetten und normalen Betten, einer großen überdachten Terrasse und einem weitläufigen Außenspielfeld.",
  "Geheel gelijkvloers en rolstoeltoegankelijk. Perfect voor families met kinderen en groepen met een zorgvraag. 10 slaapkamers, waarvan 5 met eigen sanitair.":"Komplett ebenerdig und rollstuhlgerecht. Perfekt für Familien mit Kindern und Gruppen mit Pflegebedarf. 10 Schlafzimmer, davon 5 mit eigenem Sanitärbereich.",
  "Een knus, eenvoudig verblijf voor een klein gezelschap. Ideaal voor wandelaars en fietsers die de omgeving willen verkennen.":"Eine gemütliche, einfache Unterkunft für eine kleine Gruppe. Ideal für Wanderer und Radfahrer, die die Umgebung erkunden möchten.",
  "Bekijk voorzieningen":"Ausstattung ansehen",
  "Grote luxe keuken (oven, vaatwasser, 6-pits fornuis, koelcel)":"Große Luxusküche (Backofen, Spülmaschine, 6-flammiger Herd, Kühlraum)",
  "Eet- en recreatiezaal met tv, dvd-speler, poolbiljart en dartbord":"Ess- und Aufenthaltsraum mit TV, DVD-Player, Poolbillard und Dartscheibe",
  "Groot overdekt terras met bbq-plek en vuurschaal":"Große überdachte Terrasse mit BBQ-Platz und Feuerschale",
  "Grote luxe keuken (oven, vaatwasser, 4-pits fornuis, koelcel)":"Große Luxusküche (Backofen, Spülmaschine, 4-flammiger Herd, Kühlraum)",
  "Eigen kinderspeelkamer met keukentje, poolbiljart en dartbord":"Eigenes Kinderspielzimmer mit Spielküche, Poolbillard und Dartscheibe",
  "Geheel gelijkvloers en rolstoeltoegankelijk":"Komplett ebenerdig und rollstuhlgerecht",
  "Knus verblijf met basisvoorzieningen":"Gemütliche Unterkunft mit Grundausstattung",
  "Midden in de natuur":"Mitten in der Natur","Perfect voor wandel- en fietstochten":"Perfekt für Wander- und Radtouren",
  "Aanvraag voor Zwaluwnest":"Anfrage für Zwaluwnest","Aanvraag voor Kievitsnest":"Anfrage für Kievitsnest","Aanvraag voor Trekkershut":"Anfrage für Trekkershut",
  "Sluiten":"Schließen",
  "Zwaluwnest — alle voorzieningen":"Zwaluwnest — alle Ausstattung","Kievitsnest — alle voorzieningen":"Kievitsnest — alle Ausstattung","Trekkershut — alle voorzieningen":"Trekkershut — alle Ausstattung",
  "Wifi aanwezig":"WLAN vorhanden","Stapelbedden en gewone bedden":"Etagenbetten und normale Betten",
  "Groot speelveld met doelen, trampoline en volleybalnet":"Großes Spielfeld mit Toren, Trampolin und Volleyballnetz",
  "Kindvriendelijk — veel mogelijkheden binnen en buiten":"Kinderfreundlich — viele Möglichkeiten drinnen und draußen",
  "Ruimtelijk en bosrijk gelegen met veel privé":"Geräumig und waldreich gelegen mit viel Privatsphäre",
  "Gratis parkeergelegenheid":"Kostenlose Parkmöglichkeiten",
  "Eet- en recreatiezaal met tv, dvd-speler en wifi":"Ess- und Aufenthaltsraum mit TV, DVD-Player und WLAN",
  "10 slaapkamers (eenpersoonsbedden), 5 met eigen sanitair":"10 Schlafzimmer (Einzelbetten), 5 mit eigenem Sanitärbereich",
  "Groot overdekt terras met vuurschaal":"Große überdachte Terrasse mit Feuerschale",
  "Groot speelveld met schommel, wipwap, trampoline en volleybalnet":"Großes Spielfeld mit Schaukel, Wippe, Trampolin und Volleyballnetz",
  "Speelmogelijkheden voor kinderen (skelters)":"Spielmöglichkeiten für Kinder (Kettcars)",
  "Groot wandelpad om het recreatieveld":"Großer Wanderweg um das Freizeitgelände",
  "Diverse rustige zitplekken in de tuin":"Verschiedene ruhige Sitzplätze im Garten",
  "2 eenpersoonsbedden":"2 Einzelbetten",
  "Eigen keukentje met magnetron, koffiezetapparaat en waterkoker":"Eigene Küchenzeile mit Mikrowelle, Kaffeemaschine und Wasserkocher",
  "Verwarming, toilet en warme douche":"Heizung, Toilette und warme Dusche",
  "Eigen terrasje":"Eigene kleine Terrasse",
  "Aan fietsknooppuntenroute gelegen":"An Fahrradknotenpunktroute gelegen",
  "LAW-wandelpaden Grenslandpad en Pelgrimspad":"LAW-Wanderwege Grenzlandpfad und Pilgerweg",
  "Zorg & toegankelijkheid":"Pflege & Barrierefreiheit",
  "Is iemand in de groep mindervalide? De St.Jozefhoeve beschikt over de juiste zorgfaciliteiten of regelt deze desgewenst. Bel of stuur een aanvraag, dan bespreken we samen de mogelijkheden.":"Ist jemand in der Gruppe gehbehindert? Die St.Jozefhoeve verfügt über die passende Pflegeausstattung oder organisiert diese auf Wunsch. Rufen Sie an oder senden Sie eine Anfrage, dann besprechen wir gemeinsam die Möglichkeiten.",
  "Bespreek de mogelijkheden":"Möglichkeiten besprechen",
  "Faciliteiten & zorg":"Ausstattung & Pflege","Goed uitgerust, voor iedereen":"Gut ausgestattet, für jeden",
  "De accommodaties zijn ruim uitgerust en geschikt voor gasten met een zorgvraag. Het Kievitsnest is bovendien geheel gelijkvloers en drempelvrij.":"Die Unterkünfte sind umfangreich ausgestattet und für Gäste mit Pflegebedarf geeignet. Das Kievitsnest ist zudem komplett ebenerdig und barrierefrei.",
  "Plattegronden":"Grundrisse","Indeling van de verblijven":"Aufteilung der Unterkünfte",
  "Zorgvoorzieningen":"Pflegeausstattung","Goed verzorgd verblijven":"Gut versorgt übernachten",
  "Hoog-laagbedden":"Höhenverstellbare Betten","In hoogte verstelbare zorgbedden.":"Höhenverstellbare Pflegebetten.",
  "Tilliften":"Patientenlifter","Voor veilige transfers, op aanvraag.":"Für sichere Transfers, auf Anfrage.",
  "Douchestoelen":"Duschstühle","Veilig en comfortabel douchen.":"Sicher und komfortabel duschen.",
  "Rolstoeltoilet & -badkamer":"Rollstuhl-WC & -Bad","Aangepast, ruim en toegankelijk sanitair.":"Angepasste, geräumige und barrierefreie Sanitäranlagen.",
  "Brede deuren":"Breite Türen","Drempelvrije, ruime doorgangen.":"Schwellenlose, breite Durchgänge.",
  "Gelijkvloers":"Ebenerdig","Alles op de begane grond (Kievitsnest).":"Alles im Erdgeschoss (Kievitsnest).",
  "Zorg op maat":"Pflege nach Maß","Overige hulpmiddelen op aanvraag.":"Weitere Hilfsmittel auf Anfrage.",
  "Goed om te weten":"Gut zu wissen","Aankomst & vertrek":"An- & Abreise",
  "Aankomst vanaf 15:00, vertrek om 10:00 (zondag 16:00)":"Anreise ab 15:00 Uhr, Abreise um 10:00 Uhr (sonntags 16:00 Uhr)",
  "Voorzieningen":"Ausstattung","Luxe keuken, recreatiezaal, wifi en eigen parkeerplek":"Luxusküche, Aufenthaltsraum, WLAN und eigener Parkplatz",
  "Te huur":"Zu mieten","Laken- en handdoekpakketten beschikbaar":"Bettwäsche- und Handtuchpakete verfügbar",
  "Huisdier":"Haustier","Hond welkom in overleg":"Hund nach Absprache willkommen",
  "Bespreek je zorgwensen":"Pflegewünsche besprechen",
  "Specifieke zorgwensen of hulpmiddelen nodig? Geef het door bij je aanvraag — dan kijken we graag wat mogelijk is.":"Besondere Pflegewünsche oder Hilfsmittel nötig? Geben Sie es bei Ihrer Anfrage an — dann schauen wir gern, was möglich ist.",
  "Activiteiten & omgeving":"Aktivitäten & Umgebung","Genoeg te beleven":"Viel zu erleben",
  "De hoeve ligt aan bos en heide, met volop activiteiten in de buurt — ook bij minder weer hoef je je niet te vervelen.":"Der Hof liegt an Wald und Heide, mit zahlreichen Aktivitäten in der Nähe — auch bei schlechtem Wetter wird es nicht langweilig.",
  "Voor een sportieve dag is golf om de hoek.":"Für einen sportlichen Tag ist Golf gleich um die Ecke.",
  "In de buurt ·":"In der Nähe ·","Overdekt zwemparadijs":"Überdachtes Schwimmparadies",
  "Lekker zwemmen, ook als het buiten regent.":"Schön schwimmen, auch bei Regen.",
  "Korte rit ·":"Kurze Fahrt ·","Overdekte speeltuin":"Überdachter Spielplatz",
  "Binnenpret voor de kinderen, weer of geen weer.":"Spielspaß drinnen für die Kinder, bei jedem Wetter.",
  "Twee moderne bowlingbanen, ook te combineren met een arrangement.":"Zwei moderne Bowlingbahnen, auch mit einem Arrangement kombinierbar.",
  "Wandelen in bos & heide":"Wandern in Wald & Heide","Vanaf de voordeur zo de natuur in.":"Von der Haustür direkt in die Natur.",
  "Direct gelegen ·":"Direkt gelegen ·","Fietsen in de Groene Regio":"Radfahren in der Groene Regio",
  "Mooie routes door het Limburgse landschap.":"Schöne Routen durch die Limburger Landschaft.",
  "Vanaf de hoeve ·":"Ab dem Hof ·","Golfclinic":"Golfclinic",
  "Rondvaart over de Maasplassen naar het witte stadje Thorn.":"Rundfahrt über die Maasplassen zum weißen Städtchen Thorn.",
  "Dierentuin met meer dan 60 diersoorten, dicht bij Eindhoven.":"Zoo mit mehr als 60 Tierarten, in der Nähe von Eindhoven.",
  "Wereldreis langs meer dan 100 diersoorten, met DinoDome voor de kinderen.":"Weltreise entlang von mehr als 100 Tierarten, mit DinoDome für die Kinder.",
  "Ambachtelijke bakker in Weert, bekend om de Limburgse vlaai.":"Handwerksbäckerei in Weert, bekannt für den Limburger Flan.",
  "Thuiszorgwinkel in Weert voor rolstoelen, rollators en andere hulpmiddelen.":"Pflegehilfsmittelgeschäft in Weert für Rollstühle, Rollatoren und andere Hilfsmittel.",
  "Spannende escape rooms voor groepen vanaf 2 tot 8 personen.":"Spannende Escape Rooms für Gruppen von 2 bis 8 Personen.",
  "Lasergamen, axe throwing en meer dan 60 activiteiten voor groepen.":"Lasertag, Axtwerfen und mehr als 60 Aktivitäten für Gruppen.",
  "Activiteitenboerderij in Haler: koe knuffelen, boerenvoetgolf en GPS-tochten.":"Aktivitätenhof in Haler: Kuh kuscheln, Bauern-Fußgolf und GPS-Touren.",
  "Pretpark met attracties voor jong en oud, in Sevenum.":"Freizeitpark mit Attraktionen für Jung und Alt, in Sevenum.",
  "Sprookjesbos en pretpark, een klassieker voor een dagje uit.":"Märchenwald und Freizeitpark, ein Klassiker für einen Tagesausflug.",
  "Iets verder rijden ·":"Etwas weitere Fahrt ·",
  "Glowgolf, bowlen en andere activiteiten op het vakantiepark.":"Glowgolf, Bowling und weitere Aktivitäten im Ferienpark.",
  "Natuurlijke zwemplas in bos en heide.":"Natürlicher Badesee in Wald und Heide.",
  "Beschikbaarheid":"Verfügbarkeit","Controleer de beschikbaarheid":"Verfügbarkeit prüfen",
  "Aanvraag":"Anfrage","Vraag jullie verblijf aan":"Fragt eure Unterkunft an",
  "Vul je gegevens en wensen in — we nemen zo snel mogelijk contact op om de mogelijkheden en beschikbaarheid door te nemen.":"Geben Sie Ihre Daten und Wünsche ein — wir melden uns so schnell wie möglich, um Möglichkeiten und Verfügbarkeit zu besprechen.",
  "Accommodatie":"Unterkunft","Zwaluwnest (18 pers.)":"Zwaluwnest (18 Pers.)","Kievitsnest (22 pers.)":"Kievitsnest (22 Pers.)","Weet ik nog niet":"Weiß ich noch nicht",
  "Aankomst":"Anreise","Vertrek":"Abreise","Aantal personen":"Anzahl Personen","Naam":"Name","E-mail":"E-Mail","Telefoon":"Telefon",
  "Wensen of vragen":"Wünsche oder Fragen","Aanvraag versturen":"Anfrage absenden",
  "Dit is een aanvraag, nog geen definitieve boeking. In een latere versie koppelen we hier een echte beschikbaarheidskalender en bevestiging aan.":"Dies ist eine Anfrage, noch keine verbindliche Buchung.",
  "Of neem direct contact op":"Oder nehmen Sie direkt Kontakt auf",
  "Aanvraag verstuurd!":"Anfrage gesendet!","Bedankt voor je aanvraag. We nemen zo snel mogelijk contact met je op.":"Vielen Dank für Ihre Anfrage. Wir melden uns so schnell wie möglich.",
  "Nieuwe aanvraag":"Neue Anfrage",
  "Belangrijke informatie":"Wichtige Informationen","Prijzen & praktische zaken":"Preise & praktische Hinweise",
  "Een overzicht van prijzen, aankomst- en vertrektijden en bijkomende kosten, overgenomen van jozefhoeve.nl.":"Eine Übersicht der Preise, An- und Abreisezeiten und Nebenkosten, übernommen von jozefhoeve.nl.",
  "Aankomst (ma. & vr.)":"Anreise (Mo. & Fr.)","15:00 uur, in overleg eventueel anders":"15:00 Uhr, nach Absprache eventuell anders",
  "Vertrek (ma. & vr.)":"Abreise (Mo. & Fr.)","10:00 uur, in overleg eventueel anders":"10:00 Uhr, nach Absprache eventuell anders",
  "Vertrek (zondag)":"Abreise (Sonntag)","16:00 uur, in overleg eventueel anders":"16:00 Uhr, nach Absprache eventuell anders",
  "Zwaluwnest — prijzen 2023":"Zwaluwnest — Preise 2023","Kievitsnest — prijzen 2023":"Kievitsnest — Preise 2023","Trekkershut — prijzen 2023":"Trekkershut — Preise 2023",
  "Bijkomende kosten (Zwaluwnest & Kievitsnest)":"Nebenkosten (Zwaluwnest & Kievitsnest)",
  "Contact & adres":"Kontakt & Adresse","Adres":"Adresse","KvK":"Handelsregister",
  "Periode":"Zeitraum","Weekend":"Wochenende","Lang weekend":"Langes Wochenende","Midweek":"Wochenmitte","Week":"Woche",
  "Jan, feb, mrt":"Jan., Feb., März","Nov, dec":"Nov., Dez.","Apr t/m okt":"Apr. bis Okt.","Prijs":"Preis",
  "Vanaf 2 nachten (1 pers.)":"Ab 2 Nächten (1 Pers.)","Weekend vr. t/m zo. (2 pers.)":"Wochenende Fr. bis So. (2 Pers.)",
  "Lang weekend vr. t/m ma. (2 pers.)":"Langes Wochenende Fr. bis Mo. (2 Pers.)","Week (2 pers.)":"Woche (2 Pers.)",
  "Schoonmaakkosten":"Reinigungskosten","Toeristenbelasting":"Kurtaxe",
  "Huur lakenpakket (1 pers.)":"Miete Bettwäschepaket (1 Pers.)","Huur handdoekpakket":"Miete Handtuchpaket",
  "Hond":"Hund","Energiekosten weekend":"Energiekosten Wochenende","Energiekosten midweek":"Energiekosten Wochenmitte","Energiekosten week":"Energiekosten Woche",
  "Bereken je prijsindicatie":"Berechne deine Preisschätzung","Verblijfsduur":"Aufenthaltsdauer",
  "Seizoen":"Saison","Januari, februari, maart":"Januar, Februar, März","November, december":"November, Dezember","April t/m oktober":"April bis Oktober",
  "Aantal nachten":"Anzahl Nächte","Hond meenemen":"Hund mitnehmen",
  "Lakenpakket huren (per persoon)":"Bettwäschepaket mieten (pro Person)","Handdoekpakket huren (per persoon)":"Handtuchpaket mieten (pro Person)",
  "Bereken prijsindicatie":"Preisschätzung berechnen","Totale prijsindicatie":"Gesamte Preisschätzung",
  "Home":"Home","bijv. 18":"z. B. 18","Voor- en achternaam":"Vor- und Nachname",
  "Bijv. zorgwensen, aankomsttijd of bijzonderheden":"z. B. Pflegewünsche, Ankunftszeit oder Besonderheiten",
  "DD-MM-JJJJ":"TT-MM-JJJJ","naam@mail.nl":"name@mail.nl"
};

const MAP_EN = {
  "Samen weg,":"Get away together,","midden in de natuur":"in the heart of nature",
  "Een vrijliggend verblijf voor 18 tot 22 personen, omringd door bos en heide in Weert.":"A secluded retreat for 18 to 22 people, surrounded by forest and heathland in Weert.",
  "Aanvraag doen":"Make a request","Bekijk verblijven":"View accommodations",
  "Welkom op de hoeve":"Welcome to the farm","Ruimte, gastvrijheid en rust":"Space, hospitality and peace",
  "Op zoek naar een fijn onderkomen voor een weekendje weg, familieweekend of groepsuitje? Bij Hans en Eric van den Bogaard ben je aan het juiste adres. Jong of oud, valide of mindervalide — iedereen is welkom.":"Looking for a great place to stay for a weekend away, family weekend or group outing? At Hans and Eric van den Bogaard's, you've come to the right place. Young or old, able-bodied or with a disability — everyone is welcome.",
  "Twee accommodaties":"Two accommodations","Kievitsnest (22) en Zwaluwnest (18), geheel vrijliggend.":"Kievitsnest (22) and Zwaluwnest (18), both fully secluded.",
  "Voor iedereen":"For everyone","Zorgfaciliteiten en goede toegankelijkheid op aanvraag.":"Care facilities and good accessibility upon request.",
  "Midden in de natuur":"In the heart of nature","Direct gelegen aan bos en heide in de Groene Regio.":"Located directly on forest and heathland in the Groene Regio.",
  "Van alles te doen":"Plenty to do","Dierenpark, zwemparadijs, bowlen en meer in de buurt.":"Animal park, swimming paradise, bowling and more nearby.",
  "Last minute":"Last minute","Spontaan een weekend vrij?":"A free weekend on short notice?",
  "Vraag naar onze last-minute mogelijkheden — we kijken graag samen wat er kan.":"Ask about our last-minute options — we're happy to look at what's possible together.",
  "Verblijven":"Accommodations","Omgeving":"Surroundings","Aanvragen":"Request","Faciliteiten":"Facilities","Info":"Info",
  "Kies jullie plek":"Choose your place",
  "Twee ruime, vrijliggende groepsaccommodaties en een trekkershut — elk met een eigen sfeer. Klik op een verblijf voor meer details.":"Two spacious, secluded group accommodations and a hiker's hut — each with its own character. Click an accommodation for more details.",
  "8 tot 18 personen":"8 to 18 people","Tot 22 personen":"Up to 22 people","Kleine groep":"Small group",
  "Hooggelegen accommodatie voor verenigingen, families en vriendengroepen. Met stapelbedden en gewone bedden, een groot overdekt terras en een ruime buitenspeelweide.":"Elevated accommodation for clubs, families and groups of friends. With bunk beds and regular beds, a large covered terrace and a spacious outdoor play area.",
  "Geheel gelijkvloers en rolstoeltoegankelijk. Perfect voor families met kinderen en groepen met een zorgvraag. 10 slaapkamers, waarvan 5 met eigen sanitair.":"Entirely on one level and wheelchair-accessible. Perfect for families with children and groups with care needs. 10 bedrooms, 5 with en-suite facilities.",
  "Een knus, eenvoudig verblijf voor een klein gezelschap. Ideaal voor wandelaars en fietsers die de omgeving willen verkennen.":"A cosy, simple stay for a small group. Ideal for hikers and cyclists wanting to explore the surroundings.",
  "Bekijk voorzieningen":"View amenities",
  "Grote luxe keuken (oven, vaatwasser, 6-pits fornuis, koelcel)":"Large luxury kitchen (oven, dishwasher, 6-burner stove, cold room)",
  "Eet- en recreatiezaal met tv, dvd-speler, poolbiljart en dartbord":"Dining and recreation room with TV, DVD player, pool table and dartboard",
  "Groot overdekt terras met bbq-plek en vuurschaal":"Large covered terrace with BBQ spot and fire bowl",
  "Grote luxe keuken (oven, vaatwasser, 4-pits fornuis, koelcel)":"Large luxury kitchen (oven, dishwasher, 4-burner stove, cold room)",
  "Eigen kinderspeelkamer met keukentje, poolbiljart en dartbord":"Dedicated children's playroom with kitchenette, pool table and dartboard",
  "Geheel gelijkvloers en rolstoeltoegankelijk":"Entirely on one level and wheelchair-accessible",
  "Knus verblijf met basisvoorzieningen":"Cosy stay with basic amenities",
  "Midden in de natuur":"In the heart of nature","Perfect voor wandel- en fietstochten":"Perfect for hiking and cycling trips",
  "Aanvraag voor Zwaluwnest":"Request for Zwaluwnest","Aanvraag voor Kievitsnest":"Request for Kievitsnest","Aanvraag voor Trekkershut":"Request for Trekkershut",
  "Sluiten":"Close",
  "Zwaluwnest — alle voorzieningen":"Zwaluwnest — all amenities","Kievitsnest — alle voorzieningen":"Kievitsnest — all amenities","Trekkershut — alle voorzieningen":"Trekkershut — all amenities",
  "Wifi aanwezig":"Wifi available","Stapelbedden en gewone bedden":"Bunk beds and regular beds",
  "Groot speelveld met doelen, trampoline en volleybalnet":"Large playing field with goals, trampoline and volleyball net",
  "Kindvriendelijk — veel mogelijkheden binnen en buiten":"Child-friendly — plenty of options indoors and out",
  "Ruimtelijk en bosrijk gelegen met veel privé":"Spacious and wooded setting with plenty of privacy",
  "Gratis parkeergelegenheid":"Free parking",
  "Eet- en recreatiezaal met tv, dvd-speler en wifi":"Dining and recreation room with TV, DVD player and wifi",
  "10 slaapkamers (eenpersoonsbedden), 5 met eigen sanitair":"10 bedrooms (single beds), 5 with en-suite facilities",
  "Groot overdekt terras met vuurschaal":"Large covered terrace with fire bowl",
  "Groot speelveld met schommel, wipwap, trampoline en volleybalnet":"Large playing field with swing, see-saw, trampoline and volleyball net",
  "Speelmogelijkheden voor kinderen (skelters)":"Play options for children (go-karts)",
  "Groot wandelpad om het recreatieveld":"Large walking path around the recreational field",
  "Diverse rustige zitplekken in de tuin":"Various quiet seating spots in the garden",
  "2 eenpersoonsbedden":"2 single beds",
  "Eigen keukentje met magnetron, koffiezetapparaat en waterkoker":"Own kitchenette with microwave, coffee maker and kettle",
  "Verwarming, toilet en warme douche":"Heating, toilet and hot shower",
  "Eigen terrasje":"Own small terrace",
  "Aan fietsknooppuntenroute gelegen":"Located on a cycle junction route",
  "LAW-wandelpaden Grenslandpad en Pelgrimspad":"LAW walking trails: Border Land Path and Pilgrim's Path",
  "Zorg & toegankelijkheid":"Care & accessibility",
  "Is iemand in de groep mindervalide? De St.Jozefhoeve beschikt over de juiste zorgfaciliteiten of regelt deze desgewenst. Bel of stuur een aanvraag, dan bespreken we samen de mogelijkheden.":"Is someone in your group living with a disability? St.Jozefhoeve has the right care facilities, or can arrange them on request. Call or send a request, and we'll discuss the possibilities together.",
  "Bespreek de mogelijkheden":"Discuss the possibilities",
  "Faciliteiten & zorg":"Facilities & care","Goed uitgerust, voor iedereen":"Well-equipped, for everyone",
  "De accommodaties zijn ruim uitgerust en geschikt voor gasten met een zorgvraag. Het Kievitsnest is bovendien geheel gelijkvloers en drempelvrij.":"The accommodations are well-equipped and suitable for guests with care needs. The Kievitsnest is also entirely on one level and threshold-free.",
  "Plattegronden":"Floor plans","Indeling van de verblijven":"Layout of the accommodations",
  "Zorgvoorzieningen":"Care facilities","Goed verzorgd verblijven":"A well looked-after stay",
  "Hoog-laagbedden":"Height-adjustable beds","In hoogte verstelbare zorgbedden.":"Height-adjustable care beds.",
  "Tilliften":"Patient lifts","Voor veilige transfers, op aanvraag.":"For safe transfers, on request.",
  "Douchestoelen":"Shower chairs","Veilig en comfortabel douchen.":"Safe and comfortable showering.",
  "Rolstoeltoilet & -badkamer":"Wheelchair-accessible toilet & bathroom","Aangepast, ruim en toegankelijk sanitair.":"Adapted, spacious and accessible facilities.",
  "Brede deuren":"Wide doorways","Drempelvrije, ruime doorgangen.":"Threshold-free, spacious passageways.",
  "Gelijkvloers":"Single level","Alles op de begane grond (Kievitsnest).":"Everything on the ground floor (Kievitsnest).",
  "Zorg op maat":"Tailored care","Overige hulpmiddelen op aanvraag.":"Other aids available on request.",
  "Goed om te weten":"Good to know","Aankomst & vertrek":"Arrival & departure",
  "Aankomst vanaf 15:00, vertrek om 10:00 (zondag 16:00)":"Arrival from 3:00 PM, departure at 10:00 AM (Sunday 4:00 PM)",
  "Voorzieningen":"Amenities","Luxe keuken, recreatiezaal, wifi en eigen parkeerplek":"Luxury kitchen, recreation room, wifi and private parking",
  "Te huur":"For hire","Laken- en handdoekpakketten beschikbaar":"Bed linen and towel packages available",
  "Huisdier":"Pets","Hond welkom in overleg":"Dogs welcome by arrangement",
  "Bespreek je zorgwensen":"Discuss your care needs",
  "Specifieke zorgwensen of hulpmiddelen nodig? Geef het door bij je aanvraag — dan kijken we graag wat mogelijk is.":"Specific care needs or aids required? Let us know with your request — we're happy to look at what's possible.",
  "Activiteiten & omgeving":"Activities & surroundings","Genoeg te beleven":"Plenty to experience",
  "De hoeve ligt aan bos en heide, met volop activiteiten in de buurt — ook bij minder weer hoef je je niet te vervelen.":"The farm sits on forest and heathland, with plenty of activities nearby — so even in bad weather there's no need to be bored.",
  "Voor een sportieve dag is golf om de hoek.":"For a sporty day out, golf is just around the corner.",
  "In de buurt ·":"Nearby ·","Overdekt zwemparadijs":"Indoor swimming paradise",
  "Lekker zwemmen, ook als het buiten regent.":"Great for swimming, even when it's raining outside.",
  "Korte rit ·":"Short drive ·","Overdekte speeltuin":"Indoor playground",
  "Binnenpret voor de kinderen, weer of geen weer.":"Indoor fun for the kids, rain or shine.",
  "Twee moderne bowlingbanen, ook te combineren met een arrangement.":"Two modern bowling lanes, also combinable with a package deal.",
  "Wandelen in bos & heide":"Walking in forest & heathland","Vanaf de voordeur zo de natuur in.":"Straight into nature from the front door.",
  "Direct gelegen ·":"Right here ·","Fietsen in de Groene Regio":"Cycling in the Groene Regio",
  "Mooie routes door het Limburgse landschap.":"Beautiful routes through the Limburg landscape.",
  "Vanaf de hoeve ·":"From the farm ·","Golfclinic":"Golf clinic",
  "Rondvaart over de Maasplassen naar het witte stadje Thorn.":"Boat trip across the Maasplassen lakes to the white town of Thorn.",
  "Dierentuin met meer dan 60 diersoorten, dicht bij Eindhoven.":"Zoo with more than 60 animal species, close to Eindhoven.",
  "Wereldreis langs meer dan 100 diersoorten, met DinoDome voor de kinderen.":"A world tour past more than 100 animal species, with DinoDome for the kids.",
  "Ambachtelijke bakker in Weert, bekend om de Limburgse vlaai.":"Artisan bakery in Weert, known for its Limburg flan.",
  "Thuiszorgwinkel in Weert voor rolstoelen, rollators en andere hulpmiddelen.":"Home care store in Weert for wheelchairs, walkers and other aids.",
  "Spannende escape rooms voor groepen vanaf 2 tot 8 personen.":"Exciting escape rooms for groups of 2 to 8 people.",
  "Lasergamen, axe throwing en meer dan 60 activiteiten voor groepen.":"Laser tag, axe throwing and more than 60 activities for groups.",
  "Activiteitenboerderij in Haler: koe knuffelen, boerenvoetgolf en GPS-tochten.":"Activity farm in Haler: cow cuddling, farm footgolf and GPS treasure hunts.",
  "Pretpark met attracties voor jong en oud, in Sevenum.":"Amusement park with rides for young and old, in Sevenum.",
  "Sprookjesbos en pretpark, een klassieker voor een dagje uit.":"Fairytale forest and amusement park, a classic day out.",
  "Iets verder rijden ·":"A bit further away ·",
  "Glowgolf, bowlen en andere activiteiten op het vakantiepark.":"Glow golf, bowling and other activities at the holiday park.",
  "Natuurlijke zwemplas in bos en heide.":"Natural swimming lake in forest and heathland.",
  "Beschikbaarheid":"Availability","Controleer de beschikbaarheid":"Check availability",
  "Aanvraag":"Request","Vraag jullie verblijf aan":"Request your stay",
  "Vul je gegevens en wensen in — we nemen zo snel mogelijk contact op om de mogelijkheden en beschikbaarheid door te nemen.":"Fill in your details and preferences — we'll get in touch as soon as possible to go over the options and availability.",
  "Accommodatie":"Accommodation","Zwaluwnest (18 pers.)":"Zwaluwnest (18 pers.)","Kievitsnest (22 pers.)":"Kievitsnest (22 pers.)","Weet ik nog niet":"Don't know yet",
  "Aankomst":"Arrival","Vertrek":"Departure","Aantal personen":"Number of people","Naam":"Name","E-mail":"Email","Telefoon":"Phone",
  "Wensen of vragen":"Comments or questions","Aanvraag versturen":"Send request",
  "Dit is een aanvraag, nog geen definitieve boeking. In een latere versie koppelen we hier een echte beschikbaarheidskalender en bevestiging aan.":"This is a request, not yet a confirmed booking.",
  "Of neem direct contact op":"Or get in touch directly",
  "Aanvraag verstuurd!":"Request sent!","Bedankt voor je aanvraag. We nemen zo snel mogelijk contact met je op.":"Thank you for your request. We'll get back to you as soon as possible.",
  "Nieuwe aanvraag":"New request",
  "Belangrijke informatie":"Important information","Prijzen & praktische zaken":"Prices & practical information",
  "Een overzicht van prijzen, aankomst- en vertrektijden en bijkomende kosten, overgenomen van jozefhoeve.nl.":"An overview of prices, arrival and departure times, and additional costs, taken from jozefhoeve.nl.",
  "Aankomst (ma. & vr.)":"Arrival (Mon. & Fri.)","15:00 uur, in overleg eventueel anders":"3:00 PM, other times possible by arrangement",
  "Vertrek (ma. & vr.)":"Departure (Mon. & Fri.)","10:00 uur, in overleg eventueel anders":"10:00 AM, other times possible by arrangement",
  "Vertrek (zondag)":"Departure (Sunday)","16:00 uur, in overleg eventueel anders":"4:00 PM, other times possible by arrangement",
  "Zwaluwnest — prijzen 2023":"Zwaluwnest — 2023 prices","Kievitsnest — prijzen 2023":"Kievitsnest — 2023 prices","Trekkershut — prijzen 2023":"Trekkershut — 2023 prices",
  "Bijkomende kosten (Zwaluwnest & Kievitsnest)":"Additional costs (Zwaluwnest & Kievitsnest)",
  "Contact & adres":"Contact & address","Adres":"Address","KvK":"Chamber of Commerce",
  "Periode":"Period","Weekend":"Weekend","Lang weekend":"Long weekend","Midweek":"Midweek","Week":"Week",
  "Jan, feb, mrt":"Jan, Feb, Mar","Nov, dec":"Nov, Dec","Apr t/m okt":"Apr to Oct","Prijs":"Price",
  "Vanaf 2 nachten (1 pers.)":"From 2 nights (1 pers.)","Weekend vr. t/m zo. (2 pers.)":"Weekend Fri. to Sun. (2 pers.)",
  "Lang weekend vr. t/m ma. (2 pers.)":"Long weekend Fri. to Mon. (2 pers.)","Week (2 pers.)":"Week (2 pers.)",
  "Schoonmaakkosten":"Cleaning costs","Toeristenbelasting":"Tourist tax",
  "Huur lakenpakket (1 pers.)":"Bed linen package rental (1 pers.)","Huur handdoekpakket":"Towel package rental",
  "Hond":"Dog","Energiekosten weekend":"Energy costs weekend","Energiekosten midweek":"Energy costs midweek","Energiekosten week":"Energy costs week",
  "Bereken je prijsindicatie":"Calculate your price estimate","Verblijfsduur":"Length of stay",
  "Seizoen":"Season","Januari, februari, maart":"January, February, March","November, december":"November, December","April t/m oktober":"April to October",
  "Aantal nachten":"Number of nights","Hond meenemen":"Bringing a dog",
  "Lakenpakket huren (per persoon)":"Rent bed linen package (per person)","Handdoekpakket huren (per persoon)":"Rent towel package (per person)",
  "Bereken prijsindicatie":"Calculate price estimate","Totale prijsindicatie":"Total price estimate",
  "Home":"Home","bijv. 18":"e.g. 18","Voor- en achternaam":"First and last name",
  "Bijv. zorgwensen, aankomsttijd of bijzonderheden":"E.g. care needs, arrival time or other details",
  "DD-MM-JJJJ":"DD-MM-YYYY","naam@mail.nl":"name@mail.com"
};

const MAPS = {de: MAP_DE, en: MAP_EN};

// Collect text nodes
const i18nNodes = [];
(function collect() {
  const skip = {SCRIPT:1,STYLE:1,SVG:1,PATH:1,CIRCLE:1,RECT:1,SYMBOL:1};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      let p = n.parentNode;
      while (p && p !== document.body) {
        if (skip[p.nodeName.toUpperCase()]) return NodeFilter.FILTER_REJECT;
        p = p.parentNode;
      }
      if (!n.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n; while ((n = walker.nextNode())) i18nNodes.push({node: n, raw: n.nodeValue});
})();
const i18nPh = [...document.querySelectorAll('[placeholder]')].map(el => ({el, raw: el.getAttribute('placeholder')}));

let currentLang = 'nl';
function setLang(lang) {
  currentLang = lang;
  wCurrentLang = lang;
  document.documentElement.lang = lang;
  const MAP = MAPS[lang];
  i18nNodes.forEach(({node, raw}) => {
    const key = raw.trim();
    node.nodeValue = (MAP && MAP[key] !== undefined)
      ? raw.replace(key, MAP[key])
      : raw;
  });
  i18nPh.forEach(({el, raw}) => {
    el.setAttribute('placeholder', (MAP && MAP[raw] !== undefined) ? MAP[raw] : raw);
  });
  document.querySelectorAll('select option').forEach(opt => {
    const key = opt.dataset.nl || opt.textContent.trim();
    if (!opt.dataset.nl) opt.dataset.nl = key;
    opt.textContent = (MAP && MAP[key] !== undefined) ? MAP[key] : key;
  });
  ['nl','de','en'].forEach(l =>
    document.getElementById('flag' + l[0].toUpperCase() + l[1]).classList.toggle('active', lang === l)
  );
  // Sync nav labels
  const navLabels = {
    home:        {nl:'Home',        de:'Home',       en:'Home'},
    verblijven:  {nl:'Verblijven',  de:'Unterkünfte',en:'Accommodations'},
    faciliteiten:{nl:'Faciliteiten',de:'Ausstattung',en:'Facilities'},
    omgeving:    {nl:'Omgeving',    de:'Umgebung',   en:'Surroundings'},
    aanvraag:    {nl:'Aanvragen',   de:'Anfragen',   en:'Request'},
    info:        {nl:'Info',        de:'Info',       en:'Info'},
  };
  Object.entries(navLabels).forEach(([sec, labels]) => {
    const btn = document.querySelector(`.nav-link[data-sec="${sec}"]`);
    if (btn) btn.childNodes[btn.childNodes.length - 1].nodeValue = '\n        ' + labels[lang];
  });
}

['nl','de','en'].forEach(l =>
  document.getElementById('flag' + l[0].toUpperCase() + l[1])
    .addEventListener('click', () => setLang(l))
);
