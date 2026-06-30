const screensEl = document.getElementById('screens');

  function go(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id===id));
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.go===id));
    // restart stagger animation on the active screen
    const active = document.getElementById(id);
    const stag = active.querySelector('.stagger');
    if(stag){ stag.style.animation='none'; void stag.offsetWidth; stag.style.animation=''; }
    screensEl.scrollTo({top:0, behavior:'instant' in screensEl ? 'instant' : 'auto'});
  }

  document.querySelectorAll('[data-go]').forEach(el=>{
    el.addEventListener('click', ()=>go(el.dataset.go));
  });

  // Accordion for stays
  document.querySelectorAll('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.closest('[data-stay]').classList.toggle('open');
    });
  });

  // "Aanvraag voor X" buttons -> jump to form with accommodation preselected
  document.querySelectorAll('[data-book]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.book;
      const sel = document.getElementById('acco');
      if(val){ const m=[...sel.options].find(o=>o.value===val); if(m) sel.value=val; }
      go('boeken');
    });
  });

  // Form submit (in-memory demo)
  document.getElementById('submitBook').addEventListener('click', ()=>{
    const sel = document.getElementById('acco');
    const acco = sel.options[sel.selectedIndex].text;
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const people = document.getElementById('people').value;
    const name = document.getElementById('name').value.trim();

    if(!name){ document.getElementById('name').focus(); return; }

    const loc = currentLang==='de' ? 'de-DE' : 'nl-NL';
    const fmt = d => d ? new Date(d).toLocaleDateString(loc,{day:'numeric',month:'long',year:'numeric'}) : '—';
    const L = currentLang==='de'
      ? {acco:'Unterkunft', from:'Anreise', to:'Abreise', people:'Personen', name:'Name'}
      : {acco:'Accommodatie', from:'Aankomst', to:'Vertrek', people:'Personen', name:'Naam'};
    const recap = document.getElementById('recap');
    recap.innerHTML = `
      <div><span>${L.acco}</span><span>${acco}</span></div>
      <div><span>${L.from}</span><span>${fmt(from)}</span></div>
      <div><span>${L.to}</span><span>${fmt(to)}</span></div>
      <div><span>${L.people}</span><span>${people || '—'}</span></div>
      <div><span>${L.name}</span><span>${name}</span></div>`;

    document.getElementById('bookFormView').style.display='none';
    document.getElementById('bookSuccess').style.display='block';
    screensEl.scrollTo({top:0});
  });

  document.getElementById('resetBook').addEventListener('click', ()=>{
    document.getElementById('bookSuccess').style.display='none';
    document.getElementById('bookFormView').style.display='block';
    ['from','to','people','name','email','phone','msg'].forEach(id=>document.getElementById(id).value='');
  });

  // Beschikbaarheidskalender wisselen tussen Zwaluwnest en Kievitsnest
  const KAL_SRC = {
    zwaluwnest: 'https://dashboard.vakantieadressen.nl/widget/1748/6034dd5d0808f',
    kievitsnest: 'https://dashboard.vakantieadressen.nl/widget/1749/6034dd5d0ee76'
  };
  document.querySelectorAll('[data-kal]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.kal;
      document.querySelectorAll('[data-kal]').forEach(b=>b.classList.toggle('active', b===btn));
      const iframe = document.getElementById('kalIframe');
      if(iframe && KAL_SRC[key]) iframe.src = KAL_SRC[key];
    });
  });

  // Lightbox (plattegrond vergroten)
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  document.querySelectorAll('[data-zoom]').forEach(b=>{
    b.addEventListener('click', ()=>{ lbImg.src = b.dataset.zoom; lb.classList.add('show'); });
  });
  function closeLb(){ lb.classList.remove('show'); lbImg.src=''; }
  lb.addEventListener('click', e=>{ if(e.target!==lbImg) closeLb(); });
  document.getElementById('lightboxClose').addEventListener('click', closeLb);

  // Prijscalculator (Info-pagina)
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
  // Trekkershut: vaste pakketprijzen (2 pers.) per verblijfsduur, plus p.p.p.n. tarief als basis
  const CALC_TREKKERSHUT = {weekend:140, langweekend:210, midweek:null, week:390, ppn:37.50};

  const CALC_ENERGIE = {weekend:90, langweekend:90, midweek:180, week:315};
  const CALC_SCHOONMAAK = 145;
  const CALC_TOERISTENBELASTING = 2.50; // per persoon per nacht
  const CALC_HOND = 25;
  const CALC_LAKENS = 7.25; // per persoon
  const CALC_HANDDOEKEN = 4.75; // per persoon

  const calcAccoSel = document.getElementById('calcAcco');
  const calcSeizoenWrap = document.getElementById('calcSeizoenWrap');
  const calcPersonenInput = document.getElementById('calcPersonen');
  const calcPeriodeSel = document.getElementById('calcPeriode');
  const calcNachtenWrap = document.getElementById('calcNachtenWrap');
  const calcNachtenInput = document.getElementById('calcNachten');

  const CALC_MAX_PERSONEN = {zwaluwnest:18, kievitsnest:22, trekkershut:2};
  // Vaste nachten per periode (alleen "week" heeft een variabel, zelf in te vullen aantal nachten)
  const CALC_VASTE_NACHTEN = {weekend:2, langweekend:3, midweek:5};

  function calcUpdateVisibility(){
    const acco = calcAccoSel.value;

    // Trekkershut heeft geen seizoensprijzen, dus seizoenkeuze verbergen
    calcSeizoenWrap.style.display = (acco === 'trekkershut') ? 'none' : '';

    // Maximaal aantal personen aanpassen op gekozen accommodatie
    const maxP = CALC_MAX_PERSONEN[acco] || 25;
    calcPersonenInput.max = maxP;
    if(parseInt(calcPersonenInput.value, 10) > maxP) calcPersonenInput.value = maxP;

    // Aantal nachten alleen relevant (en invulbaar) bij "week"; anders ligt het vast
    const periode = calcPeriodeSel.value;
    if(periode === 'week'){
      calcNachtenWrap.style.display = '';
      calcNachtenInput.disabled = false;
    } else {
      calcNachtenWrap.style.display = 'none';
      calcNachtenInput.disabled = true;
      calcNachtenInput.value = CALC_VASTE_NACHTEN[periode] || 7;
    }
  }
  if(calcAccoSel){
    calcAccoSel.addEventListener('change', calcUpdateVisibility);
    calcPeriodeSel.addEventListener('change', calcUpdateVisibility);
    calcUpdateVisibility();
  }

  const calcBerekenBtn = document.getElementById('calcBereken');
  if(calcBerekenBtn){
    calcBerekenBtn.addEventListener('click', ()=>{
      const acco = document.getElementById('calcAcco').value;
      const periode = document.getElementById('calcPeriode').value;
      const seizoen = document.getElementById('calcSeizoen').value;
      const personen = Math.max(1, parseInt(document.getElementById('calcPersonen').value, 10) || 1);
      const nachten = Math.max(1, parseInt(document.getElementById('calcNachten').value, 10) || 1);
      const hond = document.getElementById('calcHond').checked;
      const lakens = document.getElementById('calcLakens').checked;
      const handdoeken = document.getElementById('calcHanddoeken').checked;

      const periodeLabels = {weekend:'Weekend', langweekend:'Lang weekend', midweek:'Midweek', week:'Week'};
      const rows = [];
      let basisprijs = 0;
      let basisOk = true;

      if(acco === 'trekkershut'){
        if(periode === 'midweek'){
          // Geen vast pakket voor midweek: bereken op basis van p.p.p.n. tarief
          basisprijs = CALC_TREKKERSHUT.ppn * personen * nachten;
          rows.push({label:`Trekkershut, ${nachten} nachten × ${personen} pers. × € ${CALC_TREKKERSHUT.ppn.toFixed(2)} p.p.p.n.`, value:basisprijs});
        } else {
          basisprijs = CALC_TREKKERSHUT[periode];
          rows.push({label:`Trekkershut, ${periodeLabels[periode]} (max. 2 pers.)`, value:basisprijs});
          if(personen > 2){
            rows.push({label:'Let op: trekkershut is bedoeld voor max. 2 personen', value:null});
          }
        }
      } else {
        const tabel = CALC_PRICES[acco] && CALC_PRICES[acco][seizoen];
        if(tabel){
          basisprijs = tabel[periode];
          rows.push({label:`${acco === 'zwaluwnest' ? 'Zwaluwnest' : 'Kievitsnest'}, ${periodeLabels[periode]}`, value:basisprijs});
        } else {
          basisOk = false;
        }
      }

      let totaal = basisprijs;

      // Energiekosten (niet van toepassing op trekkershut, daar zit het in het pakket)
      if(acco !== 'trekkershut'){
        const energie = CALC_ENERGIE[periode] || 0;
        totaal += energie;
        rows.push({label:'Energiekosten', value:energie});

        const schoonmaak = CALC_SCHOONMAAK;
        totaal += schoonmaak;
        rows.push({label:'Schoonmaakkosten', value:schoonmaak});
      }

      // Toeristenbelasting: alle accommodaties, per persoon per nacht
      const toeristenbelasting = CALC_TOERISTENBELASTING * personen * nachten;
      totaal += toeristenbelasting;
      rows.push({label:`Toeristenbelasting (${personen} pers. × ${nachten} nachten × € ${CALC_TOERISTENBELASTING.toFixed(2)})`, value:toeristenbelasting});

      if(hond){
        totaal += CALC_HOND;
        rows.push({label:'Hond', value:CALC_HOND});
      }
      if(lakens){
        const lakensTotaal = CALC_LAKENS * personen;
        totaal += lakensTotaal;
        rows.push({label:`Lakenpakket (${personen} pers. × € ${CALC_LAKENS.toFixed(2)})`, value:lakensTotaal});
      }
      if(handdoeken){
        const handdoekenTotaal = CALC_HANDDOEKEN * personen;
        totaal += handdoekenTotaal;
        rows.push({label:`Handdoekpakket (${personen} pers. × € ${CALC_HANDDOEKEN.toFixed(2)})`, value:handdoekenTotaal});
      }

      const fmt = n => '€ ' + n.toLocaleString('nl-NL', {minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits:2});

      const breakdownEl = document.getElementById('calcBreakdown');
      breakdownEl.innerHTML = rows.map(r=>
        r.value === null
          ? `<div class="crow"><span>${r.label}</span></div>`
          : `<div class="crow"><span>${r.label}</span><b>${fmt(r.value)}</b></div>`
      ).join('');

      document.getElementById('calcTotaal').textContent = basisOk ? fmt(totaal) : 'Onbekend';
      document.getElementById('calcResult').style.display = 'block';
    });
  }

  /* ===================== Taal (NL / DE) ===================== */
  const MAP = {
    // App-balk / hero
    "🌿 Groepsaccommodatie":"🌿 Gruppenunterkunft",
    "Samen weg,":"Gemeinsam weg,",
    "midden in de natuur":"mitten in der Natur",
    "Een vrijliggend verblijf voor 18 tot 22 personen, omringd door bos en heide in Weert.":"Eine frei gelegene Unterkunft für 18 bis 22 Personen, umgeben von Wald und Heide in Weert.",
    "Aanvraag doen":"Anfrage senden",
    "Bekijk verblijven":"Unterkünfte ansehen",
    // Welkom
    "Welkom op de hoeve":"Willkommen auf dem Hof",
    "Ruimte, gastvrijheid en rust":"Raum, Gastfreundschaft und Ruhe",
    "Op zoek naar een fijn onderkomen voor een weekendje weg, familieweekend of groepsuitje? Bij Hans en Eric van den Bogaard ben je aan het juiste adres. Jong of oud, valide of mindervalide — iedereen is welkom.":"Auf der Suche nach einer schönen Unterkunft für ein Wochenende, ein Familienwochenende oder einen Gruppenausflug? Bei Hans und Eric van den Bogaard sind Sie an der richtigen Adresse. Jung oder alt, mit oder ohne Einschränkung — bei uns ist jeder willkommen.",
    "Twee accommodaties":"Zwei Unterkünfte",
    "Kievitsnest (22) en Zwaluwnest (18), geheel vrijliggend.":"Kievitsnest (22) und Zwaluwnest (18), komplett frei gelegen.",
    "Voor iedereen":"Für jeden",
    "Zorgfaciliteiten en goede toegankelijkheid op aanvraag.":"Pflegeeinrichtungen und gute Barrierefreiheit auf Anfrage.",
    "Midden in de natuur":"Mitten in der Natur",
    "Direct gelegen aan bos en heide in de Groene Regio.":"Direkt an Wald und Heide in der Groene Regio gelegen.",
    "Van alles te doen":"Viel zu erleben",
    "Dierenpark, zwemparadijs, bowlen en meer in de buurt.":"Tierpark, Schwimmparadies, Bowling und mehr in der Nähe.",
    "Last minute":"Last Minute",
    "Spontaan een weekend vrij?":"Spontan ein Wochenende frei?",
    "Vraag naar onze last-minute mogelijkheden — we kijken graag samen wat er kan.":"Fragen Sie nach unseren Last-Minute-Angeboten — wir schauen gern gemeinsam, was möglich ist.",
    // Quick links & tabs
    "Verblijven":"Unterkünfte",
    "Omgeving":"Umgebung",
    "Aanvragen":"Anfragen",
    "Verblijf":"Unterkunft",
    "Faciliteiten":"Ausstattung",
    // Verblijf
    "Kies jullie plek":"Wählt euren Platz",
    "Twee ruime, vrijliggende groepsaccommodaties en een trekkershut — elk met een eigen sfeer. Tik op een verblijf voor meer details.":"Zwei geräumige, frei gelegene Gruppenunterkünfte und eine Trekkinghütte — jede mit eigenem Charakter. Tippen Sie auf eine Unterkunft für mehr Details.",
    "Tot 25 personen":"Bis 25 Personen",
    "Tot 20 personen":"Bis 20 Personen",
    "Kleine groep":"Kleine Gruppe",
    "De grootste accommodatie: ruim opgezet en geknipt voor grotere families of groepen die er samen even helemaal tussenuit willen.":"Die größte Unterkunft: großzügig angelegt und ideal für größere Familien oder Gruppen, die gemeinsam richtig entspannen möchten.",
    "Gezellig en compleet ingericht, met genoeg ruimte voor jong en oud. Een fijne uitvalsbasis voor een weekend in de natuur.":"Gemütlich und komplett eingerichtet, mit genug Platz für Jung und Alt. Ein schöner Ausgangspunkt für ein Wochenende in der Natur.",
    "Een knus, eenvoudig verblijf voor een klein gezelschap. Ideaal voor wandelaars en fietsers die de omgeving willen verkennen.":"Eine gemütliche, einfache Unterkunft für eine kleine Gruppe. Ideal für Wanderer und Radfahrer, die die Umgebung erkunden möchten.",
    "Bekijk voorzieningen":"Ausstattung ansehen",
    "Volledig uitgeruste keuken":"Voll ausgestattete Küche",
    "Ruime woon- en eetkamer":"Geräumiges Wohn- und Esszimmer",
    "Meerdere slaapkamers, voldoende sanitair":"Mehrere Schlafzimmer, ausreichend Sanitäranlagen",
    "Groot buitenterras en eigen parkeerplek":"Große Außenterrasse und eigener Parkplatz",
    "Goed uitgeruste keuken":"Gut ausgestattete Küche",
    "Comfortabele slaapkamers":"Komfortable Schlafzimmer",
    "Genoeg badkamers voor de hele groep":"Genug Badezimmer für die ganze Gruppe",
    "Tuin met terras, rustig gelegen":"Garten mit Terrasse, ruhig gelegen",
    "Knus verblijf met basisvoorzieningen":"Gemütliche Unterkunft mit Grundausstattung",
    "Perfect voor wandel- en fietstochten":"Perfekt für Wander- und Radtouren",
    "Aanvraag voor Zwaluwnest":"Anfrage für Zwaluwnest",
    "Aanvraag voor Kievitsnest":"Anfrage für Kievitsnest",
    "Aanvraag voor Trekkershut":"Anfrage für Trekkershut",
    "Zorg & toegankelijkheid":"Pflege & Barrierefreiheit",
    "Is iemand in de groep mindervalide? De St.Jozefhoeve beschikt over de juiste zorgfaciliteiten of regelt deze desgewenst. Bel of stuur een aanvraag, dan bespreken we samen de mogelijkheden.":"Ist jemand in der Gruppe gehbehindert? Die St.Jozefhoeve verfügt über die passende Pflegeausstattung oder organisiert diese auf Wunsch. Rufen Sie an oder senden Sie eine Anfrage, dann besprechen wir gemeinsam die Möglichkeiten.",
    "Bespreek de mogelijkheden":"Möglichkeiten besprechen",
    // Faciliteiten
    "Faciliteiten & zorg":"Ausstattung & Pflege",
    "De accommodaties zijn ruim uitgerust en geschikt voor gasten met een zorgvraag. Het Kievitsnest is bovendien geheel gelijkvloers en drempelvrij.":"Die Unterkünfte sind umfangreich ausgestattet und für Gäste mit Pflegebedarf geeignet. Das Kievitsnest ist zudem komplett ebenerdig und barrierefrei.",
    "Plattegronden":"Grundrisse",
    "Indeling van de verblijven":"Aufteilung der Unterkünfte",
    "Tik om te vergroten":"Zum Vergrößern tippen",
    "Zorgvoorzieningen":"Pflegeausstattung",
    "Goed verzorgd verblijven":"Gut versorgt übernachten",
    "Hoog-laagbedden":"Höhenverstellbare Betten",
    "In hoogte verstelbare zorgbedden.":"Höhenverstellbare Pflegebetten.",
    "Tilliften":"Patientenlifter",
    "Voor veilige transfers, op aanvraag.":"Für sichere Transfers, auf Anfrage.",
    "Douchestoelen":"Duschstühle",
    "Veilig en comfortabel douchen.":"Sicher und komfortabel duschen.",
    "Rolstoeltoilet & -badkamer":"Rollstuhl-WC & -Bad",
    "Aangepast, ruim en toegankelijk sanitair.":"Angepasste, geräumige und barrierefreie Sanitäranlagen.",
    "Brede deuren":"Breite Türen",
    "Drempelvrije, ruime doorgangen.":"Schwellenlose, breite Durchgänge.",
    "Gelijkvloers":"Ebenerdig",
    "Alles op de begane grond (Kievitsnest).":"Alles im Erdgeschoss (Kievitsnest).",
    "Zorg op maat":"Pflege nach Maß",
    "Overige hulpmiddelen op aanvraag.":"Weitere Hilfsmittel auf Anfrage.",
    "Goed om te weten":"Gut zu wissen",
    "Aankomst & vertrek":"An- & Abreise",
    "Aankomst vanaf 15:00, vertrek om 10:00 (zondag 16:00)":"Anreise ab 15:00 Uhr, Abreise um 10:00 Uhr (sonntags 16:00 Uhr)",
    "Voorzieningen":"Ausstattung",
    "Luxe keuken, recreatiezaal, wifi en eigen parkeerplek":"Luxusküche, Aufenthaltsraum, WLAN und eigener Parkplatz",
    "Te huur":"Zu mieten",
    "Laken- en handdoekpakketten beschikbaar":"Bettwäsche- und Handtuchpakete verfügbar",
    "Huisdier":"Haustier",
    "Hond welkom in overleg":"Hund nach Absprache willkommen",
    "Bespreek je zorgwensen":"Pflegewünsche besprechen",
    "Specifieke zorgwensen of hulpmiddelen nodig? Geef het door bij je aanvraag — dan kijken we graag wat mogelijk is.":"Besondere Pflegewünsche oder Hilfsmittel nötig? Geben Sie es bei Ihrer Anfrage an — dann schauen wir gern, was möglich ist.",
    // Omgeving
    "Activiteiten & omgeving":"Aktivitäten & Umgebung",
    "Genoeg te beleven":"Viel zu erleben",
    "De hoeve ligt aan bos en heide, met volop activiteiten in de buurt — ook bij minder weer hoef je je niet te vervelen.":"Der Hof liegt an Wald und Heide, mit zahlreichen Aktivitäten in der Nähe — auch bei schlechtem Wetter wird es nicht langweilig.",
    "Kangoeroepark":"Kängurupark",
    "Vlak tegenover het terrein — leuk voor jong en oud.":"Direkt gegenüber dem Gelände — schön für Jung und Alt.",
    "Op loopafstand":"Fußläufig erreichbar",
    "Voor een sportieve dag is golf om de hoek.":"Für einen sportlichen Tag ist Golf gleich um die Ecke.",
    "In de buurt ·":"In der Nähe ·",
    "Overdekt zwemparadijs":"Überdachtes Schwimmparadies",
    "Lekker zwemmen, ook als het buiten regent.":"Schön schwimmen, auch bei Regen.",
    "Korte rit ·":"Kurze Fahrt ·",
    "Overdekte speeltuin":"Überdachter Spielplatz",
    "Binnenpret voor de kinderen, weer of geen weer.":"Spielspaß drinnen für die Kinder, bei jedem Wetter.",
    "Bowlingbaan":"Bowlingbahn",
    "Gezellige avond met de hele groep.":"Gemütlicher Abend mit der ganzen Gruppe.",
    "Wandelen in bos & heide":"Wandern in Wald & Heide",
    "Vanaf de voordeur zo de natuur in.":"Von der Haustür direkt in die Natur.",
    "Direct gelegen ·":"Direkt gelegen ·",
    "Fietsen in de Groene Regio":"Radfahren in der Groene Regio",
    "Mooie routes door het Limburgse landschap.":"Schöne Routen durch die Limburger Landschaft.",
    "Vanaf de hoeve ·":"Ab dem Hof ·",
    "Golfclinic":"Golfclinic",
    "Rederij Cascade — Tour de Thorn":"Reederei Cascade — Tour de Thorn",
    "Rondvaart over de Maasplassen naar het witte stadje Thorn.":"Rundfahrt über die Maasplassen zum weißen Städtchen Thorn.",
    "Eindhoven Zoo (Mierlo)":"Eindhoven Zoo (Mierlo)",
    "Dierentuin met meer dan 60 diersoorten, dicht bij Eindhoven.":"Zoo mit mehr als 60 Tierarten, in der Nähe von Eindhoven.",
    "GaiaZOO Kerkrade":"GaiaZOO Kerkrade",
    "Wereldreis langs meer dan 100 diersoorten, met DinoDome voor de kinderen.":"Weltreise entlang von mehr als 100 Tierarten, mit DinoDome für die Kinder.",
    "Bakkerij De Vries":"Bäckerei De Vries",
    "Ambachtelijke bakker in Weert, bekend om de Limburgse vlaai.":"Handwerksbäckerei in Weert, bekannt für den Limburger Flan.",
    "Medicura Zorgwinkel":"Medicura Pflegegeschäft",
    "Thuiszorgwinkel in Weert voor rolstoelen, rollators en andere hulpmiddelen.":"Pflegehilfsmittelgeschäft in Weert für Rollstühle, Rollatoren und andere Hilfsmittel.",
    "Escape Room Weert":"Escape Room Weert",
    "Spannende escape rooms voor groepen vanaf 2 tot 8 personen.":"Spannende Escape Rooms für Gruppen von 2 bis 8 Personen.",
    "Fun Thrills Weert":"Fun Thrills Weert",
    "Lasergamen, axe throwing en meer dan 60 activiteiten voor groepen.":"Lasertag, Axtwerfen und mehr als 60 Aktivitäten für Gruppen.",
    "Het Hobbyschuurtje":"Het Hobbyschuurtje",
    "Activiteitenboerderij in Haler: koe knuffelen, boerenvoetgolf en GPS-tochten.":"Aktivitätenhof in Haler: Kuh kuscheln, Bauern-Fußgolf und GPS-Touren.",
    "Bowlen bij De Sluis":"Bowling bei De Sluis",
    "Twee moderne bowlingbanen, ook te combineren met een arrangement.":"Zwei moderne Bowlingbahnen, auch mit einem Arrangement kombinierbar.",
    "Toverland":"Toverland",
    "Pretpark met attracties voor jong en oud, in Sevenum.":"Freizeitpark mit Attraktionen für Jung und Alt, in Sevenum.",
    "Efteling":"Efteling",
    "Sprookjesbos en pretpark, een klassieker voor een dagje uit.":"Märchenwald und Freizeitpark, ein Klassiker für einen Tagesausflug.",
    "Iets verder rijden ·":"Etwas weitere Fahrt ·",
    "Weerterbergen & Blauwe Meertje":"Weerterbergen & Blauwe Meertje",
    "Natuurgebied met heide, bos en een mooie zwemplas.":"Naturgebiet mit Heide, Wald und einem schönen Badesee.",
    "Tik voor website →":"Für Website tippen →",
    "Direct gelegen":"Direkt gelegen",
    // Boeken
    "Aanvraag":"Anfrage",
    "Vraag jullie verblijf aan":"Fragt eure Unterkunft an",
    "Vul je gegevens en wensen in — we nemen zo snel mogelijk contact op om de mogelijkheden en beschikbaarheid door te nemen.":"Geben Sie Ihre Daten und Wünsche ein — wir melden uns so schnell wie möglich, um Möglichkeiten und Verfügbarkeit zu besprechen.",
    "Accommodatie":"Unterkunft",
    "Zwaluwnest (18 pers.)":"Zwaluwnest (18 Pers.)",
    "Kievitsnest (22 pers.)":"Kievitsnest (22 Pers.)",
    "Weet ik nog niet":"Weiß ich noch nicht",
    "Beschikbaarheid":"Verfügbarkeit",
    "Controleer de beschikbaarheid":"Verfügbarkeit prüfen",
    "Aankomst":"Anreise",
    "Vertrek":"Abreise",
    "Aantal personen":"Anzahl Personen",
    "Naam":"Name",
    "E-mail":"E-Mail",
    "Telefoon":"Telefon",
    "Wensen of vragen":"Wünsche oder Fragen",
    "Aanvraag versturen":"Anfrage absenden",
    "Dit is een aanvraag, nog geen definitieve boeking. In een latere versie koppelen we hier een echte beschikbaarheidskalender en bevestiging aan.":"Dies ist eine Anfrage, noch keine verbindliche Buchung. In einer späteren Version verknüpfen wir hier einen echten Verfügbarkeitskalender und eine Bestätigung.",
    "Of neem direct contact op":"Oder nehmen Sie direkt Kontakt auf",
    "Aanvraag verstuurd!":"Anfrage gesendet!",
    "Bedankt voor je aanvraag. We nemen zo snel mogelijk contact met je op.":"Vielen Dank für Ihre Anfrage. Wir melden uns so schnell wie möglich bei Ihnen.",
    "Nieuwe aanvraag":"Neue Anfrage",
    // Info
    "Belangrijke informatie":"Wichtige Informationen",
    "Prijzen & praktische zaken":"Preise & praktische Hinweise",
    "Een overzicht van prijzen, aankomst- en vertrektijden en bijkomende kosten, overgenomen van jozefhoeve.nl.":"Eine Übersicht der Preise, An- und Abreisezeiten und Nebenkosten, übernommen von jozefhoeve.nl.",
    "Aankomst (ma. & vr.)":"Anreise (Mo. & Fr.)",
    "15:00 uur, in overleg eventueel anders":"15:00 Uhr, nach Absprache eventuell anders",
    "Vertrek (ma. & vr.)":"Abreise (Mo. & Fr.)",
    "10:00 uur, in overleg eventueel anders":"10:00 Uhr, nach Absprache eventuell anders",
    "Vertrek (zondag)":"Abreise (Sonntag)",
    "16:00 uur, in overleg eventueel anders":"16:00 Uhr, nach Absprache eventuell anders",
    "Zwaluwnest — prijzen 2023":"Zwaluwnest — Preise 2023",
    "Kievitsnest — prijzen 2023":"Kievitsnest — Preise 2023",
    "Trekkershut — prijzen 2023":"Trekkershut — Preise 2023",
    "Bijkomende kosten (Zwaluwnest & Kievitsnest)":"Nebenkosten (Zwaluwnest & Kievitsnest)",
    "Contact & adres":"Kontakt & Adresse",
    "Adres":"Adresse",
    "Laurabosweg 4, 6006 VR Weert":"Laurabosweg 4, 6006 VR Weert",
    "Telefoon":"Telefon",
    "E-mail":"E-Mail",
    "KvK":"Handelsregister",
    "Roermond 13025630":"Roermond 13025630",
    "IBAN":"IBAN",
    "NL57 RABO 0176 9001 60 (BIC: RABONL2U)":"NL57 RABO 0176 9001 60 (BIC: RABONL2U)",
    "Bekijk actuele prijzen op jozefhoeve.nl":"Aktuelle Preise auf jozefhoeve.nl ansehen",
    "Periode":"Zeitraum",
    "Weekend":"Wochenende",
    "Lang weekend":"Langes Wochenende",
    "Midweek":"Wochenmitte",
    "Week":"Woche",
    "Jan, feb, mrt":"Jan., Feb., März",
    "Nov, dec":"Nov., Dez.",
    "Apr t/m okt":"Apr. bis Okt.",
    "Prijs":"Preis",
    "Vanaf 2 nachten (1 pers.)":"Ab 2 Nächten (1 Pers.)",
    "Weekend vr. t/m zo. (2 pers.)":"Wochenende Fr. bis So. (2 Pers.)",
    "Lang weekend vr. t/m ma. (2 pers.)":"Langes Wochenende Fr. bis Mo. (2 Pers.)",
    "Week (2 pers.)":"Woche (2 Pers.)",
    "Schoonmaakkosten":"Reinigungskosten",
    "Toeristenbelasting":"Kurtaxe",
    "Huur lakenpakket (1 pers.)":"Miete Bettwäschepaket (1 Pers.)",
    "Huur handdoekpakket":"Miete Handtuchpaket",
    "Hond":"Hund",
    "Energiekosten weekend":"Energiekosten Wochenende",
    "Energiekosten midweek":"Energiekosten Wochenmitte",
    "Energiekosten week":"Energiekosten Woche",
    "Info":"Info",
    "Bereken je prijsindicatie":"Berechne deine Preisschätzung",
    "Accommodatie":"Unterkunft",
    "Zwaluwnest":"Zwaluwnest",
    "Kievitsnest":"Kievitsnest",
    "Trekkershut":"Trekkershut",
    "Verblijfsduur":"Aufenthaltsdauer",
    "Weekend":"Wochenende",
    "Lang weekend":"Langes Wochenende",
    "Midweek":"Wochenmitte",
    "Week":"Woche",
    "Seizoen":"Saison",
    "Januari, februari, maart":"Januar, Februar, März",
    "November, december":"November, Dezember",
    "April t/m oktober":"April bis Oktober",
    "Aantal personen":"Anzahl Personen",
    "Aantal nachten":"Anzahl Nächte",
    "Hond meenemen":"Hund mitnehmen",
    "Lakenpakket huren (per persoon)":"Bettwäschepaket mieten (pro Person)",
    "Handdoekpakket huren (per persoon)":"Handtuchpaket mieten (pro Person)",
    "Bereken prijsindicatie":"Preisschätzung berechnen",
    "Totale prijsindicatie":"Gesamte Preisschätzung",
    "Dit is een indicatie op basis van de tarieven van 2023 en geen definitieve prijs. Schoonmaakkosten en energiekosten worden los van de verblijfsprijs in rekening gebracht en zijn hierin meegenomen.":"Dies ist eine Schätzung basierend auf den Tarifen von 2023 und kein endgültiger Preis. Reinigungs- und Energiekosten werden separat vom Aufenthaltspreis berechnet und sind hier bereits enthalten.",
    "Deze prijzen zijn overgenomen van de officiële website en dateren van":"Diese Preise wurden von der offiziellen Website übernommen und stammen aus dem Jahr",
    "— de meest recente tarieven die daar gepubliceerd staan. Vraag bij je aanvraag altijd naar de actuele prijs, of bel":"— die aktuellsten dort veröffentlichten Tarife. Fragen Sie bei Ihrer Anfrage immer nach dem aktuellen Preis, oder rufen Sie an:",
    ". Laatst gecontroleerd: juni 2026.":". Zuletzt geprüft: Juni 2026.",
    // Verblijf kaarten NL->DE
    "8 tot 18 personen":"8 bis 18 Personen",
    "Hooggelegen accommodatie voor verenigingen, families en vriendengroepen. Met stapelbedden en gewone bedden, een groot overdekt terras en een ruime buitenspeelweide.":"Erhöht gelegene Unterkunft für Vereine, Familien und Freundesgruppen. Mit Etagenbetten und normalen Betten, einer großen überdachten Terrasse und einem weitläufigen Außenspielfeld.",
    "Grote luxe keuken (oven, vaatwasser, 6-pits fornuis, koelcel)":"Große Luxusküche (Backofen, Spülmaschine, 6-flammiger Herd, Kühlraum)",
    "Eet- en recreatiezaal met tv, dvd-speler, poolbiljart en dartbord":"Ess- und Aufenthaltsraum mit TV, DVD-Player, Poolbillard und Dartscheibe",
    "Wifi aanwezig":"WLAN vorhanden",
    "Stapelbedden en gewone bedden":"Etagenbetten und normale Betten",
    "Groot overdekt terras met bbq-plek en vuurschaal":"Große überdachte Terrasse mit BBQ-Platz und Feuerschale",
    "Groot speelveld met doelen, trampoline en volleybalnet":"Großes Spielfeld mit Toren, Trampolin und Volleyballnetz",
    "Kindvriendelijk — veel mogelijkheden binnen en buiten":"Kinderfreundlich — viele Möglichkeiten drinnen und draußen",
    "Ruimtelijk en bosrijk gelegen met veel privé":"Geräumig und waldreich gelegen mit viel Privatsphäre",
    "Gratis parkeergelegenheid":"Kostenlose Parkmöglichkeiten",
    "Tot 22 personen":"Bis 22 Personen",
    "Geheel gelijkvloers en rolstoeltoegankelijk. Perfect voor families met kinderen en groepen met een zorgvraag. 10 slaapkamers, waarvan 5 met eigen sanitair.":"Komplett ebenerdig und rollstuhlgerecht. Perfekt für Familien mit Kindern und Gruppen mit Pflegebedarf. 10 Schlafzimmer, davon 5 mit eigenem Sanitärbereich.",
    "Grote luxe keuken (oven, vaatwasser, 4-pits fornuis, koelcel)":"Große Luxusküche (Backofen, Spülmaschine, 4-flammiger Herd, Kühlraum)",
    "Eet- en recreatiezaal met tv, dvd-speler en wifi":"Ess- und Aufenthaltsraum mit TV, DVD-Player und WLAN",
    "Eigen kinderspeelkamer met keukentje, poolbiljart en dartbord":"Eigenes Kinderspielzimmer mit Spielküche, Poolbillard und Dartscheibe",
    "10 slaapkamers (eenpersoonsbedden), 5 met eigen sanitair":"10 Schlafzimmer (Einzelbetten), 5 mit eigenem Sanitärbereich",
    "Geheel gelijkvloers en rolstoeltoegankelijk":"Komplett ebenerdig und rollstuhlgerecht",
    "Groot overdekt terras met vuurschaal":"Große überdachte Terrasse mit Feuerschale",
    "Groot speelveld met schommel, wipwap, trampoline en volleybalnet":"Großes Spielfeld mit Schaukel, Wippe, Trampolin und Volleyballnetz",
    "Speelmogelijkheden voor kinderen (skelters)":"Spielmöglichkeiten für Kinder (Kettcars)",
    "Groot wandelpad om het recreatieveld":"Großer Wanderweg um das Freizeitgelände",
    "Diverse rustige zitplekken in de tuin":"Verschiedene ruhige Sitzplätze im Garten",
    "Ruimtelijk en bosrijk gelegen met veel privé":"Geräumig und waldreich gelegen mit viel Privatsphäre",
    // Placeholders
    "bijv. 18":"z. B. 18",
    "Voor- en achternaam":"Vor- und Nachname",
    "Bijv. zorgwensen, aankomsttijd of bijzonderheden":"z. B. Pflegewünsche, Ankunftszeit oder Besonderheiten",
    "DD-MM-JJJJ":"TT-MM-JJJJ",
    "naam@mail.nl":"name@mail.nl",
    "06 ...":"06 ...",
    // Tabbalk
    "Home":"Home"
  };

  // Verzamel alle vertaalbare tekstknopen + placeholders (eenmalig, in het Nederlands)
  const i18nNodes = [];
  (function collect(){
    const skip = {SCRIPT:1, STYLE:1, SVG:1, PATH:1, CIRCLE:1, RECT:1};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        let p = n.parentNode;
        while(p && p !== document.body){
          if(skip[p.nodeName.toUpperCase()]) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        if(skip[n.parentNode.nodeName.toUpperCase()]) return NodeFilter.FILTER_REJECT;
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while((n = walker.nextNode())) i18nNodes.push({node:n, raw:n.nodeValue});
  })();
  const i18nPh = [];
  document.querySelectorAll('[placeholder]').forEach(el=>i18nPh.push({el, raw:el.getAttribute('placeholder')}));

  let currentLang = 'nl';
  function setLang(lang){
    currentLang = lang;
    document.documentElement.lang = lang;
    i18nNodes.forEach(({node, raw})=>{
      const key = raw.trim();
      if(lang==='de' && MAP[key]!==undefined){
        const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        node.nodeValue = lead + MAP[key] + trail;
      } else {
        node.nodeValue = raw;
      }
    });
    i18nPh.forEach(({el, raw})=>{
      el.setAttribute('placeholder', (lang==='de' && MAP[raw]!==undefined) ? MAP[raw] : raw);
    });
    // Vertaal ook option-teksten in de select
    document.querySelectorAll('select option').forEach(opt=>{
      const key = opt.dataset.nl || opt.textContent.trim();
      if(!opt.dataset.nl) opt.dataset.nl = key;
      opt.textContent = (lang==='de' && MAP[key]!==undefined) ? MAP[key] : key;
    });
    document.getElementById('flagNl').classList.toggle('active', lang==='nl');
    document.getElementById('flagDe').classList.toggle('active', lang==='de');
  }

  document.getElementById('flagNl').addEventListener('click', ()=>setLang('nl'));
  document.getElementById('flagDe').addEventListener('click', ()=>setLang('de'));
