const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const repo = require("path").join(__dirname, "..");
const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");

const CSSVARS = {
  "--bg":"#f4f5f7","--panel":"#ffffff","--fg":"#1b1f24","--muted":"#69707a",
  "--border":"#d8dde3","--accent":"#2563eb","--chip":"#eef1f5","--grid":"#e3e7ec","--axis":"#98a1ab"
};

const vc = new VirtualConsole();
const errors = [];
vc.on("jsdomError", e => errors.push("jsdomError: " + (e.detail ? (e.detail.stack || e.detail.message) : e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

function boot(){
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window){
      window.SVGElement.prototype.getBBox = function(){
        return { x: 0, y: 0, width: Math.max(4, (this.textContent || "").length * 6.2), height: 12 };
      };
      window.HTMLElement.prototype.scrollIntoView = function(){};
      window.getComputedStyle = () => ({ getPropertyValue: n => CSSVARS[n] || "" });
    }
  });
  return dom;
}
function whenLoaded(dom){
  return new Promise(resolve => {
    if (dom.window.document.readyState === "complete") return resolve();
    dom.window.addEventListener("load", () => resolve());
  });
}

let passed = 0, failed = 0;
function check(name, cond){
  if (cond){ passed++; console.log("  ok  " + name); }
  else { failed++; console.log("  FAIL " + name); }
}

async function main(){
  const dom = boot();
  await whenLoaded(dom);
  const w = dom.window;
  const run = code => w.eval(code);
  const q = s => w.document.querySelector(s);
  const qa = s => w.document.querySelectorAll(s);
  const svgText = () => (q("#report svg") || {textContent:""}).textContent;

  check("report svg rendered after init", !!q("#report svg"));
  check("demo events all drawn (24 groups)", qa("#report svg [data-eid]").length === 24);
  check("title block present", svgText().includes("Incident IR-2026-042"));
  check("lane labels drawn", svgText().includes("Initial Access") && svgText().includes("Containment & Recovery"));
  check("category legend chips: all 6 present (wrap works)", qa("#report svg [data-catid]").length === 6);
  check("footer present", svgText().includes("All times shown in UTC"));

  run("state.view.mode='milestones'; render()");
  check("milestones mode renders 24 events", qa("#report svg [data-eid]").length === 24);
  check("milestones auto draws card labels", Array.from(qa("#report svg [data-eid]")).some(g => g.querySelector("rect")));

  run("state.view.mode='density'; render()");
  check("density mode renders all events", qa("#report svg [data-eid]").length === 24);
  check("brush overlay present in density", !!q("#report svg [data-brush]"));

  const confStyles = () => {
    const out = {solid:0, hollow:0, dashed:0, dashedBars:0};
    qa("#report svg [data-eid] circle").forEach(c => {
      const dash = c.getAttribute("stroke-dasharray");
      const fill = c.getAttribute("fill");
      if (dash) out.dashed++;
      else if (fill === "#ffffff" || fill === "none") out.hollow++;
      else out.solid++;
    });
    qa("#report svg [data-eid] rect").forEach(r => { if (r.getAttribute("stroke-dasharray")) out.dashedBars++; });
    return out;
  };

  run("state.view.labelMode='numbers'; render()");
  check("numbers mode produces event key", svgText().includes("Event key"));
  check("numbers mode still draws all 24 events", qa("#report svg [data-eid]").length === 24);
  let cs = confStyles();
  check("numbered pins encode confidence: solid vs hollow vs dashed", cs.solid >= 1 && cs.hollow >= 1 && cs.dashed >= 1);
  run("state.view.labelMode='auto'; state.view.mode='swimlane'; render()");

  cs = confStyles();
  check("confidence: solid (confirmed) markers drawn", cs.solid >= 1);
  check("confidence: hollow (probable) markers drawn", cs.hollow >= 1);
  check("confidence: dashed (uncertain) markers drawn", cs.dashed >= 1);
  check("confidence: dashed (uncertain) duration bar drawn", cs.dashedBars >= 1);

  check("band separator lines drawn", qa("#report svg [data-band]").length >= 3);
  check("alternating band background fills drawn", qa("#report svg [data-bandbg]").length >= 3);

  run("state.view.groupBy='machine'; render()");
  check("machine lanes: host names in gutter", svgText().includes("WKSTN-114") && svgText().includes("SRV-FS-02"));
  check("machine lanes: unattributed group shown", svgText().includes("(no machine)"));
  check("machine lanes: categories preserved as sub-rows", svgText().includes("Execution") && svgText().includes("Containment & Recovery"));
  check("machine lanes: all 24 events drawn", qa("#report svg [data-eid]").length === 24);
  check("groupBy control synced", q("#groupBy").value === "machine");

  check("machine colors: name strip drawn per machine", qa("#report svg [data-mname]").length >= 5);

  // regression: distinct machines must never share a colour
  const manyNames = Array.from({length:30}, (_, i) => `HOST-${String(i+1).padStart(2,"0")}`);
  const manyEvents = manyNames.map((n, i) => ({
    timestamp: new Date(Date.UTC(2026,0,1+i)).toISOString(), title:"E"+i, category:"c1", machine:n}));
  run(`applyImport(importText(${JSON.stringify(JSON.stringify({title:"M",timezone:"UTC",categories:[{id:"c1",label:"C",color:"#c0392b"}],events:manyEvents}))}, null))`);
  for (const theme of ["light","dark"]){
    run(`state.view.theme='${theme}'; render()`);
    const cols = JSON.parse(run("JSON.stringify(machineNames().map(n => machineColor(n)))"));
    check(`${theme}: 30 machines get 30 distinct colours`, new Set(cols).size === 30);
  }
  run("state.view.theme='light'; render()");
  const beforeAdd = JSON.parse(run("JSON.stringify(machineNames().map(n => [n, machineColor(n)]))"));
  run(`state.events.push({id:'probe1', timestamp: Date.UTC(2026,2,1), title:'New', category:'c1', machine:'AAA-NEW'}); render()`);
  const afterAdd = JSON.parse(run("JSON.stringify(machineNames().map(n => [n, machineColor(n)]))"));
  const mapB = Object.fromEntries(beforeAdd), mapA = Object.fromEntries(afterAdd);
  const recoloured = Object.keys(mapB).filter(n => mapB[n] !== mapA[n]);
  check("adding a machine does not recolour existing ones", recoloured.length === 0);
  check("new machine still gets a distinct colour",
    new Set(Object.values(mapA)).size === Object.keys(mapA).length);
  run("loadDemo(false)");
  run("state.view.machineSlots={}; state.view.machineColors={}; render()");
  const demoCols = JSON.parse(run("JSON.stringify(machineNames().map(n => machineColor(n)))"));
  check("demo machines all distinct", new Set(demoCols).size === demoCols.length);
  check("slot map persisted for stable colours", Object.keys(JSON.parse(run("JSON.stringify(state.view.machineSlots)"))).length >= 4);

  check("machine colors: lane tint drawn per machine", qa("#report svg [data-lanetint]").length >= 5);
  const machineTints = new Set(Array.from(qa("#report svg [data-lanetint]")).map(r => r.getAttribute("fill")));
  check("machine colors: each machine tinted a distinct color", machineTints.size >= 4);
  const wName = Array.from(qa("#report svg [data-mname]")).find(e => e.getAttribute("data-mname") === "WKSTN-114");
  const wTint = Array.from(qa("#report svg [data-lanetint]")).find(e => e.getAttribute("data-lanetint") === "WKSTN-114");
  check("machine colors: lane tint matches its machine color", !!wName && !!wTint && wTint.getAttribute("fill") === run("machineTint('WKSTN-114')"));
  const c1 = run("machineColor('WKSTN-114')");
  const c2 = run("machineColor('WKSTN-114')");
  check("machine colors: deterministic across calls", c1 === c2 && /^#[0-9a-f]{6}$/.test(c1));
  check("machine colors: differ between two hosts", run("machineColor('WKSTN-114')") !== run("machineColor('SRV-FS-02')"));
  run("state.view.theme='dark'; render()");
  check("machine colors: tint recomputed for dark theme", run("machineTint('WKSTN-114')") !== c1);
  check("machine colors: dark render keeps tint element", qa("#report svg [data-lanetint]").length >= 5);
  run("state.view.theme='light'; render()");

  run("state.view.machineColors={'WKSTN-114':'#123456'}; render()");
  check("machine color override applied", run("machineColor('WKSTN-114')") === "#123456");
  const wTint2 = Array.from(qa("#report svg [data-lanetint]")).find(e => e.getAttribute("data-lanetint") === "WKSTN-114");
  check("machine color override flows to lane tint", !!wTint2 && wTint2.getAttribute("fill") === run("machineTint('WKSTN-114')"));
  check("machine override list shows custom color", q("#machList input[type=color]").value === "#123456" ||
    Array.from(qa("#machList input[type=color]")).some(i => i.value === "#123456"));
  run("state.view.machineColors={}; render()");

  run("state.view.groupBy='category'; render()");
  check("back to category lanes", svgText().includes("Initial Access") && qa("#report svg [data-eid]").length === 24);

  // --- category mode: symmetric lane colouring + machine mark ---
  const catTints = Array.from(qa("#report svg [data-lanetint]"));
  check("category mode: one tint per category lane", catTints.length === 6);
  check("category mode: lane tints use category colours",
    catTints.some(r => r.getAttribute("fill") === "#c98a1e"));
  check("category mode: machine mark drawn for hosted events", qa("#report svg [data-mmark]").length >= 1);
  check("category mode: machine key rendered", svgText().includes("Machines"));
  const marks = new Set(Array.from(qa("#report svg [data-mmark]")).map(e => e.getAttribute("data-mmark")));
  check("category mode: machine marks carry host names", marks.size >= 2);

  // --- long span: adaptive band units ---
  const longDoc = {
    title: "Year Long", timezone: "UTC",
    categories: [{id:"c1", label:"Cat One", color:"#c0392b"}],
    events: Array.from({length:40}, (_, i) => ({
      timestamp: new Date(Date.UTC(2025,0,1) + i*9*864e5).toISOString(),
      title:"Event "+i, category:"c1", source:"s", confidence:"confirmed"}))
  };
  run(`applyImport(importText(${JSON.stringify(JSON.stringify(longDoc))}, null))`);
  for (const mode of ["swimlane","milestones","density"]){
    run(`state.view.mode='${mode}'; render()`);
    const bands = qa("#report svg [data-band]").length;
    const bgs = qa("#report svg [data-bandbg]").length;
    check(`${mode}: 1-year span keeps separators under 40 (got ${bands})`, bands > 0 && bands < 40);
    check(`${mode}: 1-year span keeps fills under 40 (got ${bgs})`, bgs > 0 && bgs < 40);
    check(`${mode}: band unit is month`, qa("#report svg [data-band='month']").length > 0);
    const lbls = Array.from(qa("#report svg [data-bandlabel]")).map(t => t.textContent);
    check(`${mode}: month labels rendered`, lbls.length >= 6 && lbls.some(l => /202[45]/.test(l)));
  }
  check("long span: no per-day separator explosion", qa("#report svg [data-band='day']").length === 0);
  run("state.view.mode='swimlane'; render()");
  run(`applyImport(importText(${JSON.stringify(JSON.stringify({title:"Week",timezone:"UTC",categories:[{id:"c1",label:"C",color:"#c0392b"}],events:[{timestamp:"2026-03-02T00:00:00Z",title:"A",category:"c1"},{timestamp:"2026-03-09T00:00:00Z",title:"B",category:"c1"}]}))}, null))`);
  check("short span: day band unit used", qa("#report svg [data-band='day']").length >= 1);
  run(`applyImport(importText(${JSON.stringify(JSON.stringify({title:"Months",timezone:"UTC",categories:[{id:"c1",label:"C",color:"#c0392b"}],events:[{timestamp:"2026-01-05T00:00:00Z",title:"A",category:"c1"},{timestamp:"2026-04-05T00:00:00Z",title:"B",category:"c1"}]}))}, null))`);
  check("90-day span: week band unit used", qa("#report svg [data-band='week']").length >= 1);
  run("loadDemo(false)");

  // --- JSON export / import round trip ---
  const payload = run("JSON.stringify(exportPayload())");
  const p = JSON.parse(payload);
  check("export payload has FTV format marker", p.format === "ftv-timeline" && p.schema === 1);
  check("export payload has version", p.ftvVersion === run("APP_VERSION"));
  check("export payload keeps 24 events", p.events.length === 24);
  check("export payload keeps categories with colour", p.categories.length === 6 && p.categories[0].color === "#c98a1e");
  check("export payload keeps machine values", p.events.some(e => e.machine === "WKSTN-114"));
  check("export payload keeps durations", p.events.filter(e => e.end).length === 7);
  check("export payload keeps confidence", p.events.some(e => e.confidence === "probable"));
  check("export payload keeps view state", p.view && p.view.mode === "swimlane" && p.view.groupBy === "category");
  const reimport = run(`importText(${JSON.stringify(payload)}, null)`);
  check("re-import: 24 events", reimport.events.length === 24);
  check("re-import: 6 categories", reimport.categories.length === 6);
  check("re-import: view state restored", reimport.view && reimport.view.mode === "swimlane");
  check("re-import: machine colours restored", !!reimport.view && !!reimport.view.machineColors);
  check("re-import: machine slots restored", !!reimport.view && !!reimport.view.machineSlots);
  check("export payload carries machine slots", p.view && p.view.machineSlots && Object.keys(p.view.machineSlots).length >= 4);
  run(`applyImport(importText(${JSON.stringify(payload)}, null))`);
  check("re-import applied: 24 events in state", run("state.events.length") === 24);
  const reExported = JSON.parse(run("JSON.stringify(exportPayload())"));
  delete p.exportedAt; delete reExported.exportedAt;
  check("export -> import -> export is idempotent", JSON.stringify(p) === JSON.stringify(reExported));
  check("round trip preserves category colours", run("state.categories[0].color") === "#c98a1e");
  check("round trip preserves machine values", run("state.events.some(e=>e.machine==='WKSTN-114')"));

  const csvText = fs.readFileSync(path.join(repo, "samples/incident.csv"), "utf8");
  const jsonText = fs.readFileSync(path.join(repo, "samples/incident.json"), "utf8");

  const csvRes = run(`importText(${JSON.stringify(csvText)}, null)`);
  check("CSV sample imports 13 events", csvRes.events.length === 13);
  check("CSV quoted-field row parsed", csvRes.events.some(e => e.description.includes("240 failed logons")));
  check("CSV categories derived (5+)", csvRes.categories.length >= 5);

  const jsonRes = run(`importText(${JSON.stringify(jsonText)}, null)`);
  check("JSON sample imports 24 events", jsonRes.events.length === 24);
  check("JSON durations preserved (7)", jsonRes.events.filter(e => e.end != null).length === 7);

  run(`applyImport(importText(${JSON.stringify(csvText)}, null))`);
  check("applyImport of CSV renders 13 events", qa("#report svg [data-eid]").length === 13);
  run(`applyImport(importText(${JSON.stringify(jsonText)}, null))`);
  check("applyImport of JSON renders 24 events", qa("#report svg [data-eid]").length === 24);
  run("doUndo()");
  check("undo restores previous import (13)", run("state.events.length") === 13);
  run("doUndo()");
  check("second undo restores demo (24)", run("state.events.length") === 24 && run("state.doc.caseId") === "IR-2026-042");

  let threw = false;
  try { run(`importText(${JSON.stringify("timestamp,title\nnotadate,Oops\n")}, null)`); } catch(e){ threw = true; }
  check("all-bad CSV throws", threw);

  const badRes = run(`(function(){ try { return importText(${JSON.stringify("timestamp,title\n2026-10-09T08:00:00Z,Good\nnope,Bad row\n")}, null); } catch(e){ return e; } })()`);
  check("partial-bad CSV imports good row, reports skipped", badRes.events && badRes.events.length === 1 && badRes.msgs.some(m => m.sev === "err"));

  run("zoomBy(0.6)");
  check("zoom narrows domain", !!run("state.view.zoom"));
  check("render under zoom keeps events", qa("#report svg [data-eid]").length >= 1);

  // zoom out must actually widen the view (it used to be clamped to the data extent)
  run("state.view.zoom=null; render()");
  const spanOf = () => { const d = run("JSON.stringify(activeDomain())"); const [a,b] = JSON.parse(d); return b-a; };
  const fitSpan = spanOf();
  run("zoomBy(1/0.6)");
  check("zoom out widens the visible range", spanOf() > fitSpan * 1.2);
  run("zoomBy(1/0.6)");
  check("second zoom out widens further", spanOf() > fitSpan * 1.2);
  // in and out must unwind symmetrically
  run("state.view.zoom=null; render()");
  run("zoomBy(0.6); zoomBy(0.6); zoomBy(0.6)");
  run("zoomBy(1/0.6); zoomBy(1/0.6); zoomBy(1/0.6)");
  check("zoom in then out returns to the fit view", Math.abs(spanOf() - fitSpan) < fitSpan * 0.35);
  // zooming in must keep the events in view (anchored on the data, not the empty centre)
  run("state.view.zoom=null; render()");
  run("zoomBy(0.6); zoomBy(0.6); zoomBy(0.6); zoomBy(0.6)");
  check("deep zoom still shows events", qa("#report svg [data-eid]").length >= 1);
  run("state.view.zoom=null; render()");

  run("fitZoom()");
  check("fit resets zoom", run("state.view.zoom") === null);

  // the zoom window must not be persisted: a stale zoom restored on reload
  // leaves the chart showing a fraction of the timeline with no way back
  run("zoomBy(0.6); saveLocal()");
  const savedView = JSON.parse(w.localStorage.getItem("ftv.autosave.v1")).view;
  check("zoom is not persisted to localStorage", savedView.zoom === undefined);
  run("fitZoom()");

  // the zoom indicator reflects the level
  run("zoomBy(0.6)");
  check("zoom indicator shows a zoom level", q("#zoomInfo").textContent !== "100%");
  run("fitZoom()");
  check("zoom indicator returns to 100%", q("#zoomInfo").textContent === "100%");

  // --- left-edge events must keep their text inside the graph ---
  const edgeDoc = {
    title:"Edge", timezone:"UTC",
    categories:[{id:"c1", label:"Cat", color:"#c0392b"}],
    events:[{timestamp:"2026-03-01T00:00:00Z", title:"Initial compromise on the edge server", category:"c1"}]
      .concat(Array.from({length:8}, (_,i) => ({
        timestamp: new Date(Date.UTC(2026,2,1) + (i+1)*3600e3).toISOString(), title:"Event "+(i+1), category:"c1"})))
  };
  run(`applyImport(importText(${JSON.stringify(JSON.stringify(edgeDoc))}, null))`);
  for (const mode of ["swimlane","milestones","density"]){
    run(`state.view.mode='${mode}'; state.view.zoom=null; render()`);
    const g0 = qa("#report svg [data-eid]")[0];
    const circ = g0 && g0.querySelector("circle");
    check(`${mode}: leftmost event has a marker`, !!circ);
    if (circ){
      const pl = mode === "swimlane" ? 214 : 40;
      const cx = parseFloat(circ.getAttribute("cx"));
      check(`${mode}: leftmost event is clear of the plot frame`, cx >= pl);
    }
    const rects = Array.from(g0 ? g0.querySelectorAll("rect") : []);
    const badX = rects.filter(r => { const v = r.getAttribute("x"); return v != null && (v === "NaN" || v === "undefined" || isNaN(parseFloat(v))); });
    check(`${mode}: card coordinates are valid (no NaN)`, badX.length === 0);
    const texts = Array.from(g0 ? g0.querySelectorAll("text") : []);
    const badT = texts.filter(t => { const v = parseFloat(t.getAttribute("x")); return isNaN(v); });
    check(`${mode}: label coordinates are valid (no NaN)`, badT.length === 0);
  }

  // --- events at the very RIGHT edge must keep their text too ---
  const rightDoc = {
    title:"RightEdge", timezone:"UTC",
    categories:[{id:"c1", label:"Cat", color:"#c0392b"}],
    events: Array.from({length:8}, (_, i) => ({
        timestamp: new Date(Date.UTC(2026,2,1) + i*3600e3).toISOString(), title:"Event "+i, category:"c1"}))
      .concat([{timestamp:"2026-03-01T08:00:00Z", title:"Rightmost event with a long descriptive title", category:"c1"}])
  };
  run(`applyImport(importText(${JSON.stringify(JSON.stringify(rightDoc))}, null))`);
  for (const mode of ["swimlane","milestones","density"]){
    run(`state.view.mode='${mode}'; state.view.zoom=null; render()`);
    const groups = qa("#report svg [data-eid]");
    const last = groups[groups.length - 1];
    const circ = last && last.querySelector("circle");
    const pr = 1280 - 30;
    check(`${mode}: rightmost event has a marker`, !!circ);
    if (circ){
      const cx = parseFloat(circ.getAttribute("cx"));
      check(`${mode}: rightmost event is clear of the right frame`, cx <= pr - 12);
    }
    // the label must be real text, not a numbered pin standing in for it
    const texts = Array.from(last ? last.querySelectorAll("text") : []);
    const isPin = texts.length === 1 && /^\d+$/.test(texts[0].textContent.trim());
    check(`${mode}: rightmost event keeps its label (not replaced by a pin)`, !isPin);
    const over = texts.filter(t => {
      const x = parseFloat(t.getAttribute("x"));
      const w = t.getBBox ? t.getBBox().width : 0;
      return x + w > pr + 1;
    });
    check(`${mode}: rightmost label stays inside the plot frame`, over.length === 0);
  }
  run("loadDemo(false)");

  q("#btnTheme").click();
  check("theme toggles to dark", w.document.body.dataset.theme === "dark");
  check("dark render ok", !!q("#report svg"));
  q("#btnTheme").click();
  check("theme back to light", w.document.body.dataset.theme === "light");

  run("loadEventForm(null)");
  q("#fTitle").value = "Smoke test event";
  q("#fTs").value = "2026-10-10T12:00";
  q("#fCat").value = run("state.categories[0].id");
  q("#fMachine").value = "SRV-TEST-01";
  q("#evForm").dispatchEvent(new w.Event("submit", {cancelable:true}));
  check("add-event form appends event", run("state.events.length") === 25);
  check("machine saved from event form", run("state.events[state.events.length-1].machine") === "SRV-TEST-01");
  check("added event visible in render", qa("#report svg [data-eid]").length === 25);
  run("doUndo()");
  check("undo removes added event", run("state.events.length") === 24);

  check("editor table has 24 rows", qa("#evTable tbody tr").length === 24);
  check("category manager lists 6", qa("#catList .catrow").length === 6);

  run(`deleteCategory(${JSON.stringify("c2")})`);
  check("category delete reassigns events", run("state.categories.length") === 5 && run("state.events.filter(e=>e.category==='c2').length") === 0);
  run("doUndo()");
  check("undo restores category", run("state.categories.length") === 6);

  check("machine field parsed from CSV sample", csvRes.events.some(e => e.machine === "SRV-FS-02"));

  q("#btnAddCat").click();
  check("add-category form opens", !q("#catAddForm").classList.contains("hidden"));
  check("preset dropdown populated", q("#newCatPreset").options.length >= 17 && q("#newCatPreset").value === "0");
  q("#newCatPreset").value = "2";
  q("#newCatPreset").dispatchEvent(new w.Event("change"));
  q("#catAddOk").click();
  check("preset category added", run("state.categories.length") === 7 && run("state.categories[6].label") === "Persistence");
  check("add form closed after add", q("#catAddForm").classList.contains("hidden"));

  q("#btnAddCat").click();
  q("#newCatPreset").value = "0";
  q("#catAddOk").click();
  check("duplicate preset rejected", run("state.categories.length") === 7);

  q("#newCatPreset").value = "custom";
  q("#newCatPreset").dispatchEvent(new w.Event("change"));
  check("custom fields shown for Custom", !q("#customCatFields").classList.contains("hidden"));
  q("#newCatLabel").value = "DNS Tunneling";
  q("#newCatColor").value = "#336699";
  q("#catAddOk").click();
  check("custom category added with unique id", run("state.categories.length") === 8 &&
    run("state.categories[7].label") === "DNS Tunneling" && run("state.categories[7].color") === "#336699");
  run("doUndo(); doUndo()");
  check("undo removes added categories", run("state.categories.length") === 6);

  run("saveLocal()");
  const stored = JSON.parse(w.localStorage.getItem("ftv.autosave.v1"));
  check("autosave persisted", stored && stored.events.length === 24);

  check("version shown in toolbar", q("#verChip").textContent === "v" + run("APP_VERSION"));
  run("render()");
  check("version stamped in report footer", svgText().includes("FTV v" + run("APP_VERSION")));
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
  check("package.json version matches app version", pkg.version === run("APP_VERSION"));

  // --- "Both - labels and numbers" mode ---
  run("state.view.labelMode='both'; state.view.mode='swimlane'; render()");
  check("both mode: numbers assigned to every visible event", run("labelNums.size") === 24);
  const bothNums = Array.from(qa("#report svg text")).map(t => t.textContent).filter(t => /^\d+$/.test(t));
  check("both mode: number badges drawn on the chart", bothNums.length >= 24);
  check("both mode: event key lists the numbered events", svgText().includes("Event key"));
  run("state.view.labelMode='both'; state.view.mode='milestones'; render()");
  check("both mode works in milestones", qa("#report svg [data-eid]").length === 24);
  run("state.view.labelMode='both'; state.view.mode='density'; render()");
  check("both mode works in density", qa("#report svg [data-eid]").length === 24);
  run("state.view.labelMode='auto'; state.view.mode='swimlane'; render()");

  // the Labels dropdown must not leak escape sequences into the UI
  const bothOption = Array.prototype.slice.call(w.document.querySelectorAll("#labelMode option"))
    .filter(o => o.value === "both")[0];
  check("labels dropdown: 'both' option has no escape sequence",
    bothOption && !/\\\\u[0-9a-f]{4}/i.test(bothOption.textContent));
  check("labels dropdown: 'both' option reads 'Both — labels and numbers'",
    bothOption && bothOption.textContent === "Both \u2014 labels and numbers");

  // --- the swimlane must lay itself out, not pile labels on each other ---
  run("state.view.mode='swimlane'; state.view.groupBy='category'; state.view.labelMode='auto'; render()");
  const swimCount = run("state.events.filter(e => !e.hidden).length");
  check("swimlane: every event is either labelled or pinned, none lost",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      return svg.querySelectorAll("[data-lt]").length + svg.querySelectorAll("g[data-eid][data-pinned]").length;
    })()`) === swimCount);
  check("swimlane: no two labels collide in the same lane track",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const groups = {};
      Array.prototype.slice.call(svg.querySelectorAll("[data-lt]")).forEach(t => {
        const k = t.getAttribute("data-lt");
        const lx = parseFloat(t.getAttribute("data-lx"));
        const w = parseFloat(t.getAttribute("data-lw"));
        (groups[k] = groups[k] || []).push([lx, lx + w]);
      });
      let bad = 0;
      Object.keys(groups).forEach(k => {
        const a = groups[k].sort((p, q) => p[0] - q[0]);
        for (let i = 1; i < a.length; i++) if (a[i][0] < a[i - 1][1] - 0.5) bad++;
      });
      return bad;
    })()`) === 0);
  check("swimlane: a crowded lane grows taller instead of overlapping",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const hs = Array.prototype.slice.call(svg.querySelectorAll("[data-lanetint]"))
        .map(l => parseFloat(l.getAttribute("height")));
      return hs.length > 0 && Math.max.apply(null, hs) > 64;
    })()`) === true);
  run("state.view.groupBy='machine'; render()");
  check("swimlane by machine: no two labels collide in the same lane track",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const groups = {};
      Array.prototype.slice.call(svg.querySelectorAll("[data-lt]")).forEach(t => {
        const k = t.getAttribute("data-lt");
        const lx = parseFloat(t.getAttribute("data-lx"));
        const w = parseFloat(t.getAttribute("data-lw"));
        (groups[k] = groups[k] || []).push([lx, lx + w]);
      });
      let bad = 0;
      Object.keys(groups).forEach(k => {
        const a = groups[k].sort((p, q) => p[0] - q[0]);
        for (let i = 1; i < a.length; i++) if (a[i][0] < a[i - 1][1] - 0.5) bad++;
      });
      return bad;
    })()`) === 0);
  run("state.view.groupBy='category'; state.view.labelMode='both'; render()");
  check("swimlane: in 'both' mode the number sits inside the dot that marks the event",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const groups = Array.prototype.slice.call(svg.querySelectorAll("g[data-eid]"));
      let ok = 0;
      groups.forEach(g => {
        const dots = Array.prototype.slice.call(g.querySelectorAll("circle"))
          .filter(c => parseFloat(c.getAttribute("r")) >= 7);
        if (dots.length !== 1) return;
        const n = g.querySelector("text");
        if (n && /^\\d+$/.test((n.textContent || "").trim())) ok++;
      });
      return groups.length > 0 && ok === groups.length;
    })()`) === true);
  check("swimlane: every labelled event has a leader line tying its dot to its title",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const labels = svg.querySelectorAll("[data-lt]").length;
      const leaders = svg.querySelectorAll("[data-leader]").length;
      return labels > 0 && leaders === labels;
    })()`) === true);
  check("swimlane: dots that fall close together are staggered, never stacked",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const dots = Array.prototype.slice.call(svg.querySelectorAll("g[data-eid] circle"))
        .filter(c => parseFloat(c.getAttribute("r")) >= 7)
        .map(c => ({x:parseFloat(c.getAttribute("cx")), y:parseFloat(c.getAttribute("cy")),
                    r:parseFloat(c.getAttribute("r"))}));
      if (!dots.length) return false;
      let bad = 0;
      for (let i = 0; i < dots.length; i++)
        for (let j = i + 1; j < dots.length; j++){
          const dx = Math.abs(dots[i].x - dots[j].x), dy = Math.abs(dots[i].y - dots[j].y);
          if (dx < dots[i].r + dots[j].r - 0.5 && dy < dots[i].r + dots[j].r - 0.5) bad++;
        }
      return bad === 0;
    })()`) === true);
  check("swimlane: the lane column is separated from the plot by a divider",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const edge = svg.querySelector("[data-gutteredge]");
      const head = svg.querySelector("[data-gutterhead]");
      if (!edge || !head) return false;
      return Math.abs(parseFloat(edge.getAttribute("x1")) - 214) < 1
        && head.textContent === "Category";
    })()`) === true);
  check("swimlane: every lane is framed in its own colour and reaches the name column",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const lanes = Array.prototype.slice.call(svg.querySelectorAll("[data-lanetint]"));
      if (!lanes.length) return false;
      const edge = parseFloat(svg.querySelector("[data-gutteredge]").getAttribute("x1"));
      return lanes.every(l => !!l.getAttribute("stroke")
        && l.getAttribute("stroke") === l.getAttribute("fill")
        && parseFloat(l.getAttribute("x")) < edge);
    })()`) === true);
  check("swimlane: the machine lane column carries its own divider and heading",
    run(`(function(){
      state.view.groupBy = "machine"; render();
      const svg = document.querySelector("#report svg");
      const edge = svg.querySelector("[data-gutteredge]");
      const head = svg.querySelector("[data-gutterhead]");
      const blocks = Array.prototype.slice.call(svg.querySelectorAll("[data-lanetint]"));
      const framed = blocks.length > 0 && blocks.every(b => !!b.getAttribute("stroke")
        && b.getAttribute("stroke") === machineColor(b.getAttribute("data-lanetint"))
        && parseFloat(b.getAttribute("x")) < parseFloat(edge.getAttribute("x1")));
      const machines = machineNames().length;
      const unique = new Set(blocks.map(b => b.getAttribute("data-lanetint"))).size;
      state.view.groupBy = "category"; render();
      if (!edge || !head) return false;
      return head.textContent === "Machine" && framed
        && unique === blocks.length
        && blocks.length <= machines + 1;   // one band per host, not per category
    })()`) === true);
  check("editor: the malicious switch marks an event red, and takes the red away again",
    run(`(function(){
      const ev = state.events.find(e => (e.role || "observed") === "observed");
      if (!ev) return false;
      const orig = JSON.parse(JSON.stringify(ev));
      const form = document.querySelector("#evForm");
      const fire = () => form.dispatchEvent(new Event("submit", {cancelable:true, bubbles:true}));
      loadEventForm(ev);
      document.querySelector("#fMal").checked = true;
      fire();
      const marked = state.events.find(e => e.id === ev.id);
      if (!marked || marked.role !== "fraudulent"){ Object.assign(ev, orig); render(); return false; }
      const svg = document.querySelector("#report svg");
      const g = svg.querySelector('g[data-eid="' + ev.id + '"]');
      const c = g && g.querySelector("circle");
      const red = !!(c && (c.getAttribute("fill") === "#E53935" || c.getAttribute("stroke") === "#E53935"));
      loadEventForm(marked);
      document.querySelector("#fMal").checked = false;
      fire();
      const cleared = state.events.find(e => e.id === ev.id);
      const ok = red && cleared && cleared.role === "observed";
      Object.assign(ev, orig);
      render();
      return ok;
    })()`) === true);
  check("editor: tagging an event never moves its time",
    run(`(function(){
      // the demo runs on UTC while the browser may sit in any timezone, and
      // one event carries seconds: both must survive a round trip
      const ev = state.events.find(e => e.timestamp % 60000 !== 0) || state.events[0];
      const orig = JSON.parse(JSON.stringify(ev));
      const form = document.querySelector("#evForm");
      const fire = () => form.dispatchEvent(new Event("submit", {cancelable:true, bubbles:true}));
      loadEventForm(ev);
      document.querySelector("#fMal").checked = true;
      fire();
      const after = state.events.find(e => e.id === ev.id);
      const ok = after.timestamp === orig.timestamp
        && (orig.end == null || after.end === orig.end);
      Object.assign(ev, orig);
      loadEventForm(ev);
      render();
      return ok;
    })()`) === true);
  check("editor: the form shows the exact second of an event",
    run(`(function(){
      const ev = state.events.find(e => e.timestamp % 60000 !== 0);
      if (!ev) return true;
      loadEventForm(ev);
      const v = document.querySelector("#fTs").value;
      const ss = String(Math.floor(ev.timestamp / 1000) % 60).padStart(2, "0");
      return new RegExp("T\\\\d{2}:\\\\d{2}:(" + ss + ")").test(v);
    })()`) === true);
  check("editor: the wall clock is read back in the timeline's own timezone",
    run(`(function(){
      const stamps = [Date.UTC(2026, 9, 9, 9, 2, 30), Date.UTC(2026, 9, 14, 22, 45, 7),
                     Date.UTC(2026, 0, 1, 0, 0, 0)];
      const zones = ["UTC", "Local"];
      const old = state.doc.timezone;
      for (const z of zones){
        state.doc.timezone = z;
        for (const s of stamps)
          if (inputToMs(msToInput(s)) !== s) { state.doc.timezone = old; return false; }
      }
      state.doc.timezone = old;
      return true;
    })()`) === true);
  check("timezone: the label is honoured exactly, whatever the browser's zone",
    run(`(function(){
      const ms = Date.UTC(2026, 0, 15, 12, 0, 0);      // 15 Jan 2026, 12:00 UTC
      const want = {"UTC":"12:00", "utc":"12:00", "":"12:00", "GMT":"12:00",
                    "UTC+2":"14:00", "utc+02:00":"14:00", "UTC-2":"10:00",
                    "America/New_York":"07:00"};
      const old = state.doc.timezone;
      for (const z in want){
        state.doc.timezone = z;
        if (fmtTimeOnly(ms) !== want[z]){ state.doc.timezone = old; return false; }
      }
      state.doc.timezone = old;
      return true;
    })()`) === true);
  check("timezone: an ISO stamp with Z is read as UTC, never as local time",
    run(`(function(){
      const t = parseDate("2026-02-03T12:13:25Z");
      if (t !== Date.UTC(2026, 1, 3, 12, 13, 25)) return false;
      const off = parseDate("2026-02-03T12:13:25+02:00");
      return off === Date.UTC(2026, 1, 3, 10, 13, 25);
    })()`) === true);
  check("import: a 'machine name' column and a duration column are both read",
    run(`(function(){
      const csv = [
        "timestamp,,machine name,title,description,category,duration,source,confidence",
        "2026-02-03T12:12:49Z,,SRV-FS-02,Archive copied to file share,x,Collection,0d 00:56:18,evtx,Confirmed",
        "2026-02-03T12:13:25Z,,SRV-FS-02,Second detection on the share,Defender event,Detection,momentary burst,evtx,Confirmed"
      ].join("\\n");
      const res = importText(csv, null);
      if (res.events.length !== 2) return false;
      const e = res.events[0];
      if (e.machine !== "SRV-FS-02") return false;
      if (e.end !== e.timestamp + (56*60 + 18) * 1000) return false;
      if (res.events[1].end != null) return false;      // free text is not guessed at
      return res.events[1].machine === "SRV-FS-02";
    })()`) === true);
  check("import: a timestamp with no UTC marker is called out",
    run(`(function(){
      const csv = [
        "timestamp,title,category",
        "2026-02-03T12:12:49,Event A,Other"
      ].join("\\n");
      const res = importText(csv, null);
      return res.msgs.some(m => m.sev === "warn" && /UTC/.test(m.msg));
    })()`) === true);
  check("range: the chart shows only what the range covers, and says so",
    run(`(function(){
      state.view.mode = "swimlane"; state.view.groupBy = "category";
      const all = visibleEvents().length;
      const evs = state.events.slice().sort((a,b) => a.timestamp - b.timestamp);
      const mid = evs[Math.floor(evs.length/2)].timestamp;
      state.view.range = {from: mid, to: mid + 3600000};
      render();
      const shown = document.querySelectorAll("#report svg g[data-eid]").length;
      const said = Array.prototype.slice.call(document.querySelectorAll("#report svg text"))
        .some(t => /Showing/.test(t.textContent));
      state.view.range = {from:null, to:null};
      render();
      return shown < all && shown > 0 && said
        && document.querySelectorAll("#report svg g[data-eid]").length === all;
    })()`) === true);
  check("timezone: the dropdown recalculates every time, and moves no instant",
    run(`(function(){
      const sel = document.querySelector("#docTz");
      if (!sel || sel.options.length < 10) return false;
      const ev = state.events.find(e => (e.role || "observed") === "fraudulent");
      const stored = ev.timestamp;
      const before = fmtShort(ev.timestamp);
      sel.value = "America/New_York";
      sel.dispatchEvent(new Event("change", {bubbles:true}));
      const after = fmtShort(ev.timestamp);
      const moved = ev.timestamp === stored && after !== before;
      sel.value = "UTC";
      sel.dispatchEvent(new Event("change", {bubbles:true}));
      return moved && fmtShort(ev.timestamp) === before;
    })()`) === true);
  check("timezone: the zone dropdown sits in the toolbar, at the top of the dashboard",
    run(`(function(){
      const sel = document.querySelector("#docTz");
      const bar = document.querySelector("#toolbar");
      if (!sel || !bar) return false;
      if (!bar.contains(sel)) return false;
      const grp = document.querySelector("#grpTz");
      if (!grp || !bar.contains(grp)) return false;
      /* it must be near the front of the toolbar, not buried at the end */
      const kids = Array.prototype.slice.call(bar.children);
      return kids.indexOf(grp) <= 1;
    })()`) === true);
  check("swimlane: seconds are resolved on the axis and in the labels",
    run(`(function(){
      const ev = state.events.find(e => (e.role || "observed") === "fraudulent");
      state.view.mode = "swimlane"; state.view.groupBy = "category"; state.view.labelMode = "both";
      state.view.zoom = [ev.timestamp - 60000, ev.timestamp + 60000];
      render();
      const texts = Array.prototype.slice.call(document.querySelectorAll("#report svg text"))
        .map(t => t.textContent);
      const stamp = /^\\d{2}:\\d{2}:\\d{2}$/;
      const ticks = texts.filter(t => stamp.test(t)).length;
      state.view.zoom = null;
      render();
      return ticks >= 2;
    })()`) === true);
  check("swimlane: a duration bar never drags the zoom window out to its end",
    run(`(function(){
      const ev = state.events.find(e => e.end != null && e.end - e.timestamp > 36e5);
      if (!ev) return true;
      const from = ev.timestamp + 60000;
      state.view.zoom = [from, from + 60000];
      render();
      const a = activeDomain();
      const span = a[1] - a[0];
      state.view.zoom = null;
      render();
      return span < 30 * 60000;         // not stretched to the end of the bar
    })()`) === true);
  check("swimlane: the machine lanes are plates with no rules between them",
    run(`(function(){
      state.view.mode = "swimlane"; state.view.groupBy = "machine";
      render();
      const svg = document.querySelector("#report svg");
      const plates = Array.prototype.slice.call(svg.querySelectorAll("[data-lanetint]"));
      const rules = Array.prototype.slice.call(svg.querySelectorAll("line")).filter(l => {
        const x1 = parseFloat(l.getAttribute("x1")), x2 = parseFloat(l.getAttribute("x2"));
        return x1 < 40 && x2 > 600;          // a rule spanning names and plot
      });
      state.view.groupBy = "category";
      render();
      return plates.length > 0 && rules.length === 0;
    })()`) === true);
  check("swimlane: the category sub-lanes are back inside each machine plate",
    run(`(function(){
      state.view.mode = "swimlane"; state.view.groupBy = "machine";
      render();
      const svg = document.querySelector("#report svg");
      const subs = Array.prototype.slice.call(svg.querySelectorAll("[data-catsub]"));
      const plates = svg.querySelectorAll("[data-lanetint]").length;
      const names = Array.prototype.slice.call(svg.querySelectorAll("text"))
        .map(t => t.textContent);
      state.view.groupBy = "category";
      render();
      return plates > 0 && subs.length > plates
        && names.some(t => /Command & Control/.test(t))
        && names.some(t => /Lateral Movement/.test(t));
    })()`) === true);
  check("swimlane: the lane reads from the upper left, downward and rightward",
    run(`(function(){
      state.view.mode = "swimlane"; state.view.groupBy = "category";
      state.view.labelMode = "labels";
      render();
      const svg = document.querySelector("#report svg");
      /* the time line of a lane is its top edge: every mark sits on it, and
         the titles hang below it */
      const lane = svg.querySelector("[data-lanetint]");
      const top = parseFloat(lane.getAttribute("y"));
      const bottom = top + parseFloat(lane.getAttribute("height"));
      const marks = Array.prototype.slice.call(svg.querySelectorAll("g[data-eid] circle"))
        .filter(c => parseFloat(c.getAttribute("r")) >= 4);
      const labels = Array.prototype.slice.call(svg.querySelectorAll("[data-lt]"));
      if (!marks.length || !labels.length) return false;
      const labelY = labels.map(t => parseFloat(t.getAttribute("y")));
      state.view.labelMode = "auto";
      render();
      /* no label may sit above the lane it belongs to */
      return labelY.every(y => y > top);
    })()`) === true);
  check("swimlane: dragging the chart moves it through time",
    run(`(function(){
      state.view.mode = "swimlane"; state.view.groupBy = "category";
      state.view.zoom = null;
      render();
      const holder = document.querySelector("#report");
      const mk = (type, x) => new MouseEvent(type, {bubbles:true, clientX:x, clientY:100, button:0});
      holder.dispatchEvent(mk("mousedown", 500));
      holder.dispatchEvent(mk("mousemove", 300));
      holder.dispatchEvent(mk("mouseup", 300));
      const moved = !!state.view.zoom;
      const span = moved ? state.view.zoom[1] - state.view.zoom[0] : 0;
      state.view.zoom = null;
      render();
      return moved && span > 0;
    })()`) === true);
  check("zoom: the analyst can go deep enough to see events a second apart",
    run(`(function(){
      state.view.zoom = null;
      for (let i = 0; i < 10; i++) zoomBy(0.6);
      const a = activeDomain();
      const span = a[1] - a[0];
      state.view.zoom = null;
      render();
      return span <= 2000;          // two seconds or less
    })()`) === true);
  check("zoom: zooming in and back out returns to the same window",
    run(`(function(){
      state.view.zoom = null; state.view.zoomStack = [];
      const before = activeDomain();
      zoomBy(0.6); zoomBy(0.6); zoomBy(0.6);
      zoomBy(1/0.6); zoomBy(1/0.6); zoomBy(1/0.6);
      const after = activeDomain();
      const ok = Math.abs((after[1]-after[0]) - (before[1]-before[0])) < (before[1]-before[0]) * 0.1;
      state.view.zoom = null; state.view.zoomStack = [];
      render();
      return ok;
    })()`) === true);
  check("editor: clicking a dot opens the editor with that event loaded",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const g = svg.querySelector("g[data-eid]");
      if (!g) return false;
      const ev = state.events.find(e => e.id === g.getAttribute("data-eid"));
      const ed = document.querySelector("#editor");
      ed.classList.add("collapsed");
      g.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:10, clientY:10, button:0}));
      g.dispatchEvent(new MouseEvent("click", {bubbles:true}));
      if (ed.classList.contains("collapsed")) return false;
      const title = document.querySelector("#fTitle").value;
      const role = ev.role || "observed";
      const sw = document.querySelector("#fMal").checked;
      return title === ev.title && sw === (role === "fraudulent" || role === "fraudMilestone");
    })()`) === true);
  check("swimlane: a malicious event is marked red",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const ev = state.events.find(e => (e.role || "observed") === "fraudulent");
      if (!ev) return false;
      const g = svg.querySelector('g[data-eid="' + ev.id + '"]');
      if (!g) return false;
      const c = g.querySelector("circle");
      return c && (c.getAttribute("fill") === "#E53935" || c.getAttribute("stroke") === "#E53935");
    })()`) === true);
  check("swimlane: the legend explains the red mark",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      return /Malicious/.test(svg.textContent);
    })()`) === true);
  run("state.view.labelMode='auto'; state.view.mode='milestones'; render()");
  check("milestones: the cards below the axis clear the axis date labels",
    run(`(function(){
      const svg = document.querySelector("#report svg");
      const labels = Array.prototype.slice.call(svg.querySelectorAll("text"))
        .filter(t => /^Oct \\d+$/.test(t.textContent));
      const cards = Array.prototype.slice.call(svg.querySelectorAll("rect")).filter(r => r.getAttribute("rx") === "7");
      return labels.every(l => cards.every(c =>
        parseFloat(l.getAttribute("y")) + 4 < parseFloat(c.getAttribute("y")) ||
        parseFloat(l.getAttribute("y")) > parseFloat(c.getAttribute("y")) + parseFloat(c.getAttribute("height"))));
    })()`) === true);
  run("state.view.mode='swimlane'; render()");

  // --- the legend switches categories on and off, in every view ---
  check("legend: every category is listed, so a hidden one can be shown again",
    run(`(function(){
      state.view.mode="swimlane"; render();
      var before = document.querySelectorAll("#report svg [data-catid]").length;
      var id = state.categories[0].id;
      state.categories[0].enabled = false; render();
      var after = document.querySelectorAll("#report svg [data-catid]").length;
      var listed = Array.prototype.slice.call(document.querySelectorAll("#report svg [data-catid]"))
        .some(function(g){ return g.getAttribute("data-catid") === id; });
      state.categories[0].enabled = true; render();
      return before === state.categories.length && after === before && listed;
    })()`) === true);
  // --- role round trip ---
  const rolePayload = JSON.parse(run(`(function(){
    const ev = state.events.find(e => e.role === "fraudulent");
    return JSON.stringify({role: ev ? ev.role : null});
  })()`));
  check("demo has a fraudulent event to mark red", rolePayload.role === "fraudulent");
  run(`applyImport(importText(${JSON.stringify(JSON.stringify({title:"R",timezone:"UTC",categories:[{id:"c1",label:"C",color:"#c0392b"}],events:[{timestamp:"2026-01-01T00:00:00Z",title:"Bad act",category:"c1",role:"fraudulent"}]}))}, null))`);
  check("role imported from JSON", run("state.events[0].role") === "fraudulent");
  run("loadDemo(false)");

  check("no runtime errors logged", errors.length === 0);
  if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("TEST CRASH:", e.stack); console.log("captured errors:\n" + errors.join("\n")); process.exit(1); });
