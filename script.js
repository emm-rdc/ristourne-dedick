let etat = {
    rencontreActuelle: {
        date: "2026-08-22",
        beneficiaire: "",
        president: "",
        tresorier: "",
        fraisCaisseFC: 10000, fraisCaisseUSD: 0,
        fraisAdminFC: 5000, fraisAdminUSD: 0,
        membres: []
    },
    historique: [],
    membres: [],
    securite: { username: "admin", password: "rebate2026" }
};

const listeMembresBase = [];

function afficherEcran(id) {
    document.querySelectorAll(".ecran").forEach(e => e.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
}

window.onload = function() {
    afficherEcran("ecran-splash");
    init();
    setTimeout(() => {
        const s = sessionStorage.getItem("rebate_session");
        if (s) {
            document.getElementById("accueilUsername").textContent = s;
            afficherEcran("ecran-accueil");
            afficherAccueil();
        } else {
            afficherEcran("ecran-login");
        }
    }, 3000);
};

function seConnecter(e) {
    e.preventDefault();
    const u = document.getElementById("loginUsername").value.trim();
    const p = document.getElementById("loginPassword").value;
    const err = document.getElementById("loginErreur");
    if (!u || !p) { err.textContent = "❌ Remplissez tous les champs."; err.classList.add("active"); return; }
    if (u === etat.securite.username && p === etat.securite.password) {
        sessionStorage.setItem("rebate_session", u);
        document.getElementById("accueilUsername").textContent = u;
        err.classList.remove("active");
        document.getElementById("loginPassword").value = "";
        afficherEcran("ecran-accueil");
        afficherAccueil();
    } else {
        err.textContent = "❌ Identifiants incorrects.";
        err.classList.add("active");
        document.getElementById("loginPassword").value = "";
    }
}

function seDeconnecter() {
    if (!confirm("🚪 Se déconnecter ?")) return;
    sauvegarderSansAlerte();
    sessionStorage.removeItem("rebate_session");
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginErreur").classList.remove("active");
    afficherEcran("ecran-login");
}

function afficherAccueil() {
    const d = document.getElementById("accueilDate");
    if (d) d.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById("accueilMembres").textContent = etat.membres.length;
    document.getElementById("accueilRencontres").textContent = etat.historique.length;
    document.getElementById("accueilDettes").textContent = etat.membres.reduce((s, m) => s + m.detteFC, 0).toLocaleString();
    const s = document.getElementById("soldeFC");
    document.getElementById("accueilSolde").textContent = s ? s.textContent : "0";
    const p = etat.membres.find(m => m.totalRecuFC === 0);
    document.getElementById("accueilProchain").textContent = p ? "👤 " + p.nom : "➕ Ajoutez des membres";
}

function allerVersApp(ongletId, tabId) {
    afficherEcran("ecran-app");
    document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".onglet").forEach(o => o.classList.remove("active"));
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add("active");
    const ong = document.getElementById(ongletId);
    if (ong) ong.classList.add("active");
    if (ongletId === "onglet-membres") afficherMembres();
    if (ongletId === "onglet-historique") afficherHistorique();
    if (ongletId === "onglet-stats") afficherStats();
    if (ongletId === "onglet-parametres") majInfosParametres();
}

function retourAccueil() { afficherEcran("ecran-accueil"); afficherAccueil(); }

function ouvrirOnglet(id, btn) {
    document.querySelectorAll(".onglet").forEach(o => o.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    btn.classList.add("active");
    if (id === "onglet-membres") afficherMembres();
    if (id === "onglet-historique") afficherHistorique();
    if (id === "onglet-stats") afficherStats();
    if (id === "onglet-parametres") majInfosParametres();
}

function init() {
    const s = localStorage.getItem("rebate_tshisangilu_V1");
    if (s) {
        try {
            const d = JSON.parse(s);
            const sec = etat.securite;
            etat = d;
            if (!etat.securite) etat.securite = sec;
        } catch (e) { initialiserDonnees(); }
    } else {
        initialiserDonnees();
    }
    const select = document.getElementById("beneficiaireSelect");
    if (select) {
        select.innerHTML = "";
        if (etat.membres.length === 0) {
            const o = document.createElement("option");
            o.value = ""; o.textContent = "— Ajoutez des membres —";
            select.appendChild(o);
        } else {
            etat.membres.forEach(m => {
                const o = document.createElement("option");
                o.value = m.nom; o.textContent = m.nom;
                if (m.nom === etat.rencontreActuelle.beneficiaire) o.selected = true;
                select.appendChild(o);
            });
        }
    }
    if (document.getElementById("dateRencontre")) {
        document.getElementById("dateRencontre").value = etat.rencontreActuelle.date;
        document.getElementById("presidentInput").value = etat.rencontreActuelle.president;
        document.getElementById("tresorierInput").value = etat.rencontreActuelle.tresorier;
        document.getElementById("fraisCaisseFC").value = etat.rencontreActuelle.fraisCaisseFC;
        document.getElementById("fraisCaisseUSD").value = etat.rencontreActuelle.fraisCaisseUSD;
        document.getElementById("fraisAdminFC").value = etat.rencontreActuelle.fraisAdminFC;
        document.getElementById("fraisAdminUSD").value = etat.rencontreActuelle.fraisAdminUSD;
    }
    genererTableau();
    calculerTotaux();
    afficherMembres();
    afficherHistorique();
    afficherStats();
    mettreAJourSignatures();
    majInfosParametres();
    activerEcouteurs();
}

function initialiserDonnees() {
    etat.membres = listeMembresBase.map((nom, i) => ({
        id: i + 1, nom: nom,
        totalRecuFC: 0, totalRecuUSD: 0,
        totalRembourseFC: 0, totalRembourseUSD: 0,
        detteFC: 0, detteUSD: 0
    }));
    etat.rencontreActuelle.membres = etat.membres.map(m => ({
        id: m.id, nom: m.nom, fc: 0, usd: 0, statut: "", aPasseLeTour: false
    }));
    etat.historique = [];
}

function activerEcouteurs() {
    ["presidentInput", "tresorierInput"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.removeEventListener("input", mettreAJourSignatures); el.addEventListener("input", mettreAJourSignatures); }
    });
    const d = document.getElementById("dateRencontre");
    if (d) { d.removeEventListener("change", mettreAJourSignatures); d.addEventListener("change", mettreAJourSignatures); }
    const b = document.getElementById("beneficiaireSelect");
    if (b) { b.removeEventListener("change", reinitialiserBeneficiaire); b.addEventListener("change", reinitialiserBeneficiaire); }
}

function reinitialiserBeneficiaire() {
    etat.rencontreActuelle.beneficiaire = document.getElementById("beneficiaireSelect").value;
    etat.rencontreActuelle.membres.forEach(m => { if (m.statut === "RECU") m.statut = ""; });
    genererTableau();
    calculerTotaux();
    sauvegarderSansAlerte();
}

function genererTableau() {
    const tb = document.getElementById("tableBody");
    if (!tb) return;
    tb.innerHTML = "";
    if (etat.rencontreActuelle.membres.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:15px;">Aucun membre. Allez dans "Membres" pour en ajouter.</td></tr>';
        return;
    }
    etat.rencontreActuelle.membres.forEach((m, i) => {
        const tr = document.createElement("tr");
        tr.id = "row-" + m.id;
        const g = etat.membres.find(x => x.id === m.id);
        const d = (g && g.detteFC > 0) ? `<br><small style="color:#cc0000;">Dette: ${g.detteFC.toLocaleString()} FC</small>` : "";
        if (m.statut === "PASSE") tr.classList.add("statut-PASSE");
        if (m.statut === "RECU") tr.classList.add("statut-RECU");
        if (m.statut === "REMBOURSER") tr.classList.add("statut-REMBOURSER");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${m.nom}${d}</td>
            <td><input type="number" value="${m.fc}" onchange="modifierMontant(${m.id}, 'fc', this.value)"></td>
            <td><input type="number" value="${m.usd}" onchange="modifierMontant(${m.id}, 'usd', this.value)"></td>
            <td><select onchange="modifierStatut(${m.id}, this.value)">
                <option value="">-</option>
                <option value="COTISÉ" ${m.statut === "COTISÉ" ? "selected" : ""}>COTISÉ</option>
                <option value="PASSE" ${m.statut === "PASSE" ? "selected" : ""}>PASSE</option>
                <option value="RECU" ${m.statut === "RECU" ? "selected" : ""}>REÇU</option>
                <option value="REMBOURSER" ${m.statut === "REMBOURSER" ? "selected" : ""}>REMBOURSER</option>
            </select></td>
            <td><button onclick="marquerPasse(${m.id})">⏭️</button></td>
        `;
        tb.appendChild(tr);
    });
}

function modifierMontant(id, ch, v) {
    const m = etat.rencontreActuelle.membres.find(x => x.id === id);
    if (m) {
        m[ch] = parseFloat(v) || 0;
        if (m[ch] > 0 && m.statut !== "RECU" && m.statut !== "REMBOURSER") m.statut = "COTISÉ";
        calculerTotaux();
    }
}

function modifierStatut(id, s) {
    const m = etat.rencontreActuelle.membres.find(x => x.id === id);
    if (m) {
        m.statut = s;
        if (s === "PASSE") { m.fc = 0; m.usd = 0; m.aPasseLeTour = true; }
        else m.aPasseLeTour = false;
        genererTableau();
        calculerTotaux();
    }
}

function marquerPasse(id) { modifierStatut(id, "PASSE"); alert("⏭️ Ce membre a passé le tour."); }

function calculerTotaux() {
    let tFC = 0, tUSD = 0;
    etat.rencontreActuelle.membres.forEach(m => { if (m.statut !== "RECU") { tFC += m.fc; tUSD += m.usd; } });
    etat.rencontreActuelle.fraisCaisseFC = parseFloat(document.getElementById("fraisCaisseFC").value) || 0;
    etat.rencontreActuelle.fraisCaisseUSD = parseFloat(document.getElementById("fraisCaisseUSD").value) || 0;
    etat.rencontreActuelle.fraisAdminFC = parseFloat(document.getElementById("fraisAdminFC").value) || 0;
    etat.rencontreActuelle.fraisAdminUSD = parseFloat(document.getElementById("fraisAdminUSD").value) || 0;
    const sFC = etat.rencontreActuelle.fraisCaisseFC + etat.rencontreActuelle.fraisAdminFC;
    const sUSD = etat.rencontreActuelle.fraisCaisseUSD + etat.rencontreActuelle.fraisAdminUSD;
    const soldeFC = tFC - sFC;
    const soldeUSD = tUSD - sUSD;
    document.getElementById("totalFC").textContent = tFC.toLocaleString();
    document.getElementById("totalUSD").textContent = tUSD.toLocaleString();
    document.getElementById("totalSoustractionFC").textContent = sFC.toLocaleString();
    document.getElementById("totalSoustractionUSD").textContent = sUSD.toLocaleString();
    document.getElementById("soldeFC").textContent = soldeFC.toLocaleString();
    document.getElementById("soldeUSD").textContent = soldeUSD.toLocaleString();
    const bn = document.getElementById("beneficiaireSelect").value;
    if (!bn) return;
    const b = etat.rencontreActuelle.membres.find(m => m.nom === bn);
    if (b) {
        b.statut = "RECU"; b.fc = soldeFC; b.usd = soldeUSD;
        const row = document.getElementById("row-" + b.id);
        if (row) {
            row.querySelector("td:nth-child(3) input").value = soldeFC;
            row.querySelector("td:nth-child(4) input").value = soldeUSD;
            row.classList.add("statut-RECU");
        }
    }
}

function mettreAJourSignatures() {
    const p = document.getElementById("presidentInput");
    const t = document.getElementById("tresorierInput");
    const d = document.getElementById("dateRencontre");
    if (p) { const v = p.value.trim() || "—"; etat.rencontreActuelle.president = v; document.getElementById("signaturePresident").textContent = v; }
    if (t) { const v = t.value.trim() || "—"; etat.rencontreActuelle.tresorier = v; document.getElementById("signatureTresorier").textContent = v; }
    if (d) etat.rencontreActuelle.date = d.value;
    sauvegarderSansAlerte();
}

function validerRencontre() {
    if (!etat.rencontreActuelle.beneficiaire) { alert("⚠️ Sélectionnez un bénéficiaire."); return; }
    if (!confirm("⚠️ Valider cette rencontre ?")) return;
    const bn = document.getElementById("beneficiaireSelect").value;
    const bg = etat.membres.find(m => m.nom === bn);
    const sFC = parseFloat(document.getElementById("soldeFC").textContent.replace(/\s/g, '').replace(/,/g, '')) || 0;
    const sUSD = parseFloat(document.getElementById("soldeUSD").textContent.replace(/\s/g, '').replace(/,/g, '')) || 0;
    if (bg) { bg.totalRecuFC += sFC; bg.totalRecuUSD += sUSD; bg.detteFC += sFC; bg.detteUSD += sUSD; }
    etat.rencontreActuelle.membres.forEach(m => {
        const g = etat.membres.find(x => x.id === m.id);
        if (g && m.statut === "REMBOURSER") {
            g.totalRembourseFC += m.fc; g.totalRembourseUSD += m.usd;
            g.detteFC -= m.fc; g.detteUSD -= m.usd;
            if (g.detteFC < 0) g.detteFC = 0;
            if (g.detteUSD < 0) g.detteUSD = 0;
        }
    });
    const arch = JSON.parse(JSON.stringify(etat.rencontreActuelle));
    arch.id = Date.now();
    etat.historique.push(arch);
    sauvegarderSansAlerte();
    alert(`✅ Rencontre validée !\n${bn} a reçu ${sFC.toLocaleString()} FC.`);
    afficherMembres();
    afficherHistorique();
    afficherStats();
    afficherAccueil();
}

function afficherMembres() {
    const tb = document.getElementById("tableMembresBody");
    if (!tb) return;
    const r = (document.getElementById("rechercheMembre")?.value || "").toLowerCase();
    tb.innerHTML = "";
    let c = 0;
    etat.membres.forEach(m => {
        if (r && !m.nom.toLowerCase().includes(r)) return;
        c++;
        const st = m.detteFC > 0 ? `<span class="badge-dette">Doit ${m.detteFC.toLocaleString()}</span>` : `<span class="badge-solde">À jour</span>`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.nom}</td>
            <td>${m.totalRecuFC.toLocaleString()}</td>
            <td>${m.totalRembourseFC.toLocaleString()}</td>
            <td>${m.detteFC.toLocaleString()}</td>
            <td>${st}</td>
            <td>
                <button class="btn-action btn-edit" onclick="modifierMembre(${m.id})">✏️</button>
                <button class="btn-action btn-delete" onclick="supprimerMembre(${m.id})">🗑️</button>
            </td>
        `;
        tb.appendChild(tr);
    });
    if (c === 0) tb.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666;">Aucun membre</td></tr>`;
}

function modifierMembre(id) {
    const m = etat.membres.find(x => x.id === id);
    if (!m) return;
    const nn = prompt("Nouveau nom :", m.nom);
    if (!nn || nn.trim() === "") return;
    const an = m.nom;
    m.nom = nn.trim();
    const mr = etat.rencontreActuelle.membres.find(x => x.id === id);
    if (mr) mr.nom = nn.trim();
    etat.historique.forEach(h => {
        h.membres.forEach(hm => { if (hm.id === id) hm.nom = nn.trim(); });
        if (h.beneficiaire === an) h.beneficiaire = nn.trim();
    });
    if (etat.rencontreActuelle.beneficiaire === an) etat.rencontreActuelle.beneficiaire = nn.trim();
    sauvegarderSansAlerte();
    init();
    alert("✅ Membre modifié !");
}

function supprimerMembre(id) {
    const m = etat.membres.find(x => x.id === id);
    if (!m) return;
    if (m.detteFC > 0) { if (!confirm(`⚠️ ${m.nom} a une dette. Supprimer ?`)) return; }
    else if (!confirm(`Supprimer ${m.nom} ?`)) return;
    etat.membres = etat.membres.filter(x => x.id !== id);
    etat.rencontreActuelle.membres = etat.rencontreActuelle.membres.filter(x => x.id !== id);
    sauvegarderSansAlerte();
    init();
    alert("🗑️ Supprimé.");
}

function ajouterMembre() {
    const n = prompt("Nom du nouveau membre :");
    if (!n || n.trim() === "") return;
    const id = Math.max(...etat.membres.map(m => m.id), 0) + 1;
    etat.membres.push({ id, nom: n.trim(), totalRecuFC: 0, totalRecuUSD: 0, totalRembourseFC: 0, totalRembourseUSD: 0, detteFC: 0, detteUSD: 0 });
    etat.rencontreActuelle.membres.push({ id, nom: n.trim(), fc: 0, usd: 0, statut: "", aPasseLeTour: false });
    if (!etat.rencontreActuelle.beneficiaire) etat.rencontreActuelle.beneficiaire = n.trim();
    sauvegarderSansAlerte();
    init();
    alert(`✅ ${n} ajouté !`);
}

function afficherHistorique() {
    const c = document.getElementById("historiqueListe");
    if (!c) return;
    const r = (document.getElementById("rechercheHistorique")?.value || "").toLowerCase();
    c.innerHTML = "";
    let l = [...etat.historique].reverse();
    if (r) l = l.filter(h => h.beneficiaire.toLowerCase().includes(r) || h.date.includes(r));
    if (l.length === 0) { c.innerHTML = "<p style='text-align:center; color:#666; padding:20px;'>Aucune rencontre.</p>"; return; }
    l.forEach(h => {
        const d = document.createElement("div");
        d.className = "historique-item";
        const b = h.membres.find(m => m.nom === h.beneficiaire);
        const t = h.membres.reduce((s, m) => s + m.fc, 0);
        d.innerHTML = `
            <button class="btn-suppr-hist" onclick="supprimerHistorique(${h.id})">🗑️</button>
            <h3>📅 ${h.date} - ${h.beneficiaire}</h3>
            <p>👤 ${h.president} | ${h.tresorier}</p>
            <p>💰 Total : ${t.toLocaleString()} FC</p>
            <p class="solde-hist">🎯 Reçu : ${b ? b.fc.toLocaleString() : 0} FC</p>
        `;
        c.appendChild(d);
    });
}

function supprimerHistorique(id) {
    if (!confirm("Supprimer cette rencontre ?")) return;
    etat.historique = etat.historique.filter(h => h.id !== id);
    sauvegarderSansAlerte();
    afficherHistorique();
    afficherStats();
}

function afficherStats() {
    document.getElementById("statTotalMembres").textContent = etat.membres.length;
    document.getElementById("statTotalRencontres").textContent = etat.historique.length;
    document.getElementById("statTotalCollecte").textContent = etat.historique.reduce((s, h) => s + h.membres.reduce((a, m) => a + m.fc, 0), 0).toLocaleString();
    document.getElementById("statTotalDistribue").textContent = etat.membres.reduce((s, m) => s + m.totalRecuFC, 0).toLocaleString();
    document.getElementById("statTotalDette").textContent = etat.membres.reduce((s, m) => s + m.detteFC, 0).toLocaleString();
    document.getElementById("statMembresAJour").textContent = etat.membres.filter(m => m.detteFC === 0).length + "/" + etat.membres.length;
    const cl = [...etat.membres].filter(m => m.totalRecuFC > 0).sort((a, b) => b.totalRecuFC - a.totalRecuFC);
    const c = document.getElementById("classementBenef");
    if (cl.length === 0) { c.innerHTML = "<p style='text-align:center; color:#666; padding:10px;'>Aucun bénéficiaire.</p>"; return; }
    c.innerHTML = cl.map((m, i) => `<div class="classement-item"><span class="rang">#${i + 1}</span><span>${m.nom}</span><span>${m.totalRecuFC.toLocaleString()} FC</span></div>`).join("");
}

function majInfosParametres() {
    const a = document.getElementById("infoMembres");
    const b = document.getElementById("infoRencontres");
    if (a) a.textContent = etat.membres.length;
    if (b) b.textContent = etat.historique.length;
}

function exporterDonnees() {
    const blob = new Blob([JSON.stringify(etat, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rebate_" + new Date().toISOString().split('T')[0] + ".json";
    a.click();
    alert("📤 Exporté !");
}

function importerDonnees(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = function(ev) {
        try {
            const d = JSON.parse(ev.target.result);
            if (!d.membres) throw new Error("invalide");
            if (!confirm("Remplacer les données ?")) return;
            etat = d;
            sauvegarderSansAlerte();
            init();
            alert("📥 Importé !");
        } catch (err) { alert("❌ Fichier invalide"); }
    };
    r.readAsText(f);
}

function effacerHistorique() {
    if (!confirm("Effacer tout l'historique ?")) return;
    etat.historique = [];
    sauvegarderSansAlerte();
    afficherHistorique();
    afficherStats();
    alert("🗑️ Effacé.");
}

function ouvrirModalSecurite() {
    document.getElementById("newUsername").value = etat.securite.username;
    document.getElementById("newPassword").value = "";
    document.getElementById("modalSecurite").classList.add("active");
}

function changerIdentifiants() {
    const u = document.getElementById("newUsername").value.trim();
    const p = document.getElementById("newPassword").value;
    if (!u) { alert("Le nom est vide."); return; }
    if (!p || p.length < 4) { alert("Mot de passe : minimum 4 caractères."); return; }
    etat.securite.username = u;
    etat.securite.password = p;
    sauvegarderSansAlerte();
    document.getElementById("modalSecurite").classList.remove("active");
    alert("✅ Identifiants modifiés !");
}

function genererMessageRecap() {
    const date = document.getElementById("dateRencontre").value;
    const b = document.getElementById("beneficiaireSelect").value;
    const p = document.getElementById("presidentInput").value;
    const t = document.getElementById("tresorierInput").value;
    const tFC = document.getElementById("totalFC").textContent;
    const tUSD = document.getElementById("totalUSD").textContent;
    const sFC = document.getElementById("soldeFC").textContent;
    const sUSD = document.getElementById("soldeUSD").textContent;
    let m = "*💰 REBATE-TSHISANGILU*\n\n📅 Date : " + date + "\n🎯 Bénéficiaire : " + b + "\n👤 Président : " + p + "\n👤 Trésorier : " + t + "\n\n📊 Total : " + tFC + " FC | " + tUSD + " USD\n🎯 Solde : " + sFC + " FC | " + sUSD + " USD\n\n👥 Détail :\n";
    etat.rencontreActuelle.membres.forEach((x, i) => {
        if (x.statut === "PASSE") m += (i + 1) + ". ⏭️ " + x.nom + " (passé)\n";
        else if (x.statut === "RECU") m += (i + 1) + ". 🎁 " + x.nom + " : REÇOIT " + x.fc.toLocaleString() + " FC\n";
        else if (x.statut === "REMBOURSER") m += (i + 1) + ". 🔄 " + x.nom + " : rembourse " + x.fc.toLocaleString() + " FC\n";
        else if (x.statut === "COTISÉ") m += (i + 1) + ". ✅ " + x.nom + " : " + (x.usd > 0 ? x.usd + " USD" : x.fc.toLocaleString() + " FC") + "\n";
        else m += (i + 1) + ". ⚠️ " + x.nom + "\n";
    });
    return m;
}

function ouvrirWhatsApp(msg) {
    const t = encodeURIComponent(msg);
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) {
        const fb = setTimeout(() => { window.location.href = "https://api.whatsapp.com/send?text=" + t; }, 2000);
        document.addEventListener("visibilitychange", function h() { if (document.hidden) { clearTimeout(fb); document.removeEventListener("visibilitychange", h); } });
        window.location.href = "whatsapp://send?text=" + t;
    } else { window.open("https://api.whatsapp.com/send?text=" + t, "_blank"); }
}

function ouvrirWhatsAppBusiness(msg) {
    const t = encodeURIComponent(msg);
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) {
        const fb = setTimeout(() => { window.location.href = "https://api.whatsapp.com/send?text=" + t; }, 2000);
        document.addEventListener("visibilitychange", function h() { if (document.hidden) { clearTimeout(fb); document.removeEventListener("visibilitychange", h); } });
        window.location.href = "whatsapp-business://send?text=" + t;
    } else { window.open("https://api.whatsapp.com/send?text=" + t, "_blank"); }
}

function ouvrirMessenger(msg) {
    copier(msg);
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) {
        const fb = setTimeout(() => { window.location.href = "https://www.messenger.com/"; }, 2000);
        document.addEventListener("visibilitychange", function h() { if (document.hidden) { clearTimeout(fb); document.removeEventListener("visibilitychange", h); } });
        window.location.href = "fb-messenger://";
        setTimeout(() => alert("📋 Texte copié ! Collez-le dans Messenger."), 2500);
    } else {
        window.open("https://www.messenger.com/", "_blank");
        alert("📋 Texte copié !");
    }
}

function copierTexte(msg) { copier(msg); alert("📋 Texte copié !"); }

function copier(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    else {
        const ta = document.createElement("textarea");
        ta.value = t; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
    }
}

function partagerNatif(m) {
    if (navigator.share) navigator.share({ title: "REBATE-TSHISANGILU", text: m }).catch(() => {});
    else copierTexte(m);
}

function genererPDF() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { alert("⏳ PDF en chargement, attendez 5s."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = document.getElementById("dateRencontre").value;
        const b = document.getElementById("beneficiaireSelect").value;
        const p = document.getElementById("presidentInput").value;
        const t = document.getElementById("tresorierInput").value;
        doc.setFillColor(204, 0, 0);
        doc.rect(0, 0, 210, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REBATE-TSHISANGILU", 105, 13, { align: "center" });
        doc.setFillColor(0, 0, 204);
        doc.rect(0, 20, 210, 25, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("Date : " + date, 10, 28);
        doc.text("Beneficiaire : " + b, 10, 34);
        doc.text("President : " + p, 10, 40);
        doc.text("Tresorier : " + t, 110, 28);
        const rows = etat.rencontreActuelle.membres.map((x, i) => [i + 1, x.nom, x.fc.toLocaleString(), x.usd.toLocaleString(), x.statut || "-"]);
        if (typeof doc.autoTable === "function") {
            doc.autoTable({ startY: 50, head: [["N", "NOMS", "FC", "USD", "OBS"]], body: rows, theme: "grid",
                headStyles: { fillColor: [0, 0, 204], textColor: 255, fontStyle: "bold", halign: "center" },
                bodyStyles: { halign: "center", fontSize: 10 },
                alternateRowStyles: { fillColor: [230, 242, 255] }
            });
        }
        let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : 60;
        const tFC = document.getElementById("totalFC").textContent;
        const tUSD = document.getElementById("totalUSD").textContent;
        const sFC = document.getElementById("soldeFC").textContent;
        const sUSD = document.getElementById("soldeUSD").textContent;
        doc.setFillColor(204, 0, 0);
        doc.rect(10, y, 190, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.text("TOTAL COTISATION", 15, y + 5.5);
        doc.text(tFC + " FC", 130, y + 5.5);
        doc.text(tUSD + " USD", 165, y + 5.5);
        y += 15;
        doc.setFillColor(0, 0, 0);
        doc.rect(10, y, 190, 15, "F");
        doc.setTextColor(255, 215, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("SOLDE BENEFICIAIRE", 15, y + 6);
        doc.setFontSize(14);
        doc.text(sFC + " FC  |  " + sUSD + " USD", 15, y + 12);
        doc.save("REBATE_" + date.replace(/\//g, '-') + "_" + b.replace(/\s/g, '_') + ".pdf");
        alert("✅ PDF généré !");
    } catch (e) { alert("❌ Erreur : " + e.message); }
}

function genererWord() {
    try {
        if (typeof window.docx === "undefined") { alert("⏳ Word en chargement, attendez 5s."); return; }
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = window.docx;
        const date = document.getElementById("dateRencontre").value;
        const b = document.getElementById("beneficiaireSelect").value;
        const p = document.getElementById("presidentInput").value;
        const t = document.getElementById("tresorierInput").value;
        const tFC = document.getElementById("totalFC").textContent;
        const sFC = document.getElementById("soldeFC").textContent;
        const titre = new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REBATE-TSHISANGILU", bold: true, size: 32, color: "CC0000" })] });
        const infos = new Paragraph({ spacing: { before: 200, after: 200 }, children: [
            new TextRun({ text: "Date : " + date + "\n" }),
            new TextRun({ text: "Beneficiaire : " + b + "\n" }),
            new TextRun({ text: "President : " + p + "      Tresorier : " + t + "\n" })
        ]});
        const rows = etat.rencontreActuelle.membres.map((x, i) => new TableRow({ children: [
            new TableCell({ children: [new Paragraph(String(i + 1))] }),
            new TableCell({ children: [new Paragraph(x.nom)] }),
            new TableCell({ children: [new Paragraph(x.fc.toLocaleString())] }),
            new TableCell({ children: [new Paragraph(x.usd.toLocaleString())] }),
            new TableCell({ children: [new Paragraph(x.statut || "-")] })
        ]}));
        const tab = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
            new TableRow({ tableHeader: true, children: [
                new TableCell({ children: [new Paragraph("N")] }),
                new TableCell({ children: [new Paragraph("NOMS")] }),
                new TableCell({ children: [new Paragraph("FC")] }),
                new TableCell({ children: [new Paragraph("USD")] }),
                new TableCell({ children: [new Paragraph("OBS")] })
            ]}),
            ...rows
        ]});
        const tot = new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "TOTAL : " + tFC + " FC", bold: true })] });
        const sol = new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SOLDE : " + sFC + " FC", bold: true, size: 28, color: "CC0000" })] });
        const doc = new Document({ sections: [{ children: [titre, infos, tab, tot, sol] }] });
        Packer.toBlob(doc).then(blob => {
            if (typeof saveAs === "function") saveAs(blob, "REBATE_" + date.replace(/\//g, '-') + "_" + b.replace(/\s/g, '_') + ".docx");
            else {
                const u = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = u; a.download = "rebate.docx"; a.click();
            }
            alert("✅ Word généré !");
        });
    } catch (e) { alert("❌ Erreur : " + e.message); }
}

function nouvelleRencontre() {
    if (!confirm("Créer une nouvelle rencontre ?")) return;
    etat.rencontreActuelle.membres.forEach(m => { m.fc = 0; m.usd = 0; m.statut = ""; m.aPasseLeTour = false; });
    const p = etat.membres.find(m => m.totalRecuFC === 0);
    if (p) etat.rencontreActuelle.beneficiaire = p.nom;
    etat.rencontreActuelle.date = new Date().toISOString().split('T')[0];
    sauvegarderSansAlerte();
    init();
    alert("🆕 Nouvelle rencontre prête !");
}

function sauvegarder() { mettreAJourSignatures(); sauvegarderSansAlerte(); alert("💾 Sauvegardé !"); }

function sauvegarderSansAlerte() {
    if (document.getElementById("dateRencontre")) {
        etat.rencontreActuelle.date = document.getElementById("dateRencontre").value;
        etat.rencontreActuelle.beneficiaire = document.getElementById("beneficiaireSelect").value;
        etat.rencontreActuelle.president = document.getElementById("presidentInput").value;
        etat.rencontreActuelle.tresorier = document.getElementById("tresorierInput").value;
    }
    localStorage.setItem("rebate_tshisangilu_V1", JSON.stringify(etat));
}

function reinitialiser() {
    if (!confirm("⚠️ Toutes les données seront effacées. Continuer ?")) return;
    if (!confirm("Vraiment sûr ?")) return;
    localStorage.removeItem("rebate_tshisangilu_V1");
    sessionStorage.removeItem("rebate_session");
    location.reload();
}

function exporterPDF() { window.print(); }