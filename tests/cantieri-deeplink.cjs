/* Safety checks for launching a selected major route from Varga Cantieri. */
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const source=fs.readFileSync("app.js","utf8");
new Function(source);
const routeBoot=source.slice(source.indexOf("async function bootWorkSession()"),source.indexOf("let cloudRouteEdits=[]"));
assert.ok(routeBoot.includes("const saved=readMajorWorkSession()"));
assert.ok(routeBoot.includes("saved?.active"),"an existing active work session must be restored first");
assert.ok(routeBoot.indexOf("saved?.active")<routeBoot.indexOf("vargaMajorRoute"),"never override active sessions with a deep link");
assert.ok(routeBoot.includes("new URLSearchParams(window.location.search).get('vargaMajorRoute')"));
assert.ok(routeBoot.includes("if(/^[012]$/.test"),"only three major salting routes are accepted");
assert.ok(routeBoot.includes("await finishStartupSelection('major',Number(requested))"),"linked route is selected");
assert.ok(!routeBoot.includes("startMajorWork"),"deep-link cannot start an unattended GPS work session");
assert.ok(source.includes("if(saved?.active&&saved.routeIndex!==n)"),"route switching while another tour is active must be refused");
console.log("OK: Salatura Strada deep links select red/blue/yellow while preserving active work.");
