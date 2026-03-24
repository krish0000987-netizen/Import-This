export interface MarkerData {
  id?: string;
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
}

export function buildMapHtml(
  lat: number,
  lng: number,
  zoom: number,
  showUser: boolean,
  markers: MarkerData[],
  isDark: boolean,
  _token: string,
  gold: string,
  apiBase: string = ""
): string {
  const styleUrl = isDark
    ? "https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json"
    : "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json";
  const bg = isDark ? "#0F0F0F" : "#F5F3EF";
  const panelBg = isDark ? "rgba(13,13,13,0.98)" : "rgba(255,255,255,0.98)";
  const inputBg = isDark ? "rgba(28,28,28,1)" : "rgba(246,244,240,1)";
  const textColor = isDark ? "#F0EDE6" : "#1A1A18";
  const subColor = isDark ? "#8A8A8A" : "#666";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const suggHover = isDark ? "#1A1A1A" : "#F5F3EF";
  const dropBg = isDark ? "rgba(10,10,10,0.99)" : "rgba(255,255,255,0.99)";
  const cardBg = isDark ? "rgba(22,22,22,1)" : "rgba(248,246,242,1)";
  const cardSel = isDark ? "rgba(197,165,90,0.13)" : "rgba(197,165,90,0.1)";

  const markersJson = JSON.stringify(
    (markers || []).map((m) => ({
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      title: m.title || "",
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@4.5.2/dist/maplibre-gl.css" rel="stylesheet"/>
<script src="https://unpkg.com/maplibre-gl@4.5.2/dist/maplibre-gl.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{width:100%;height:100%;overflow:hidden;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
#map{position:absolute;inset:0;}

/* ── Bottom sheet panel ── */
#panel{
  position:absolute;bottom:0;left:0;right:0;
  background:${panelBg};
  backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
  border-top:1px solid ${borderColor};
  border-radius:22px 22px 0 0;
  box-shadow:0 -8px 40px rgba(0,0,0,0.22);
  padding:12px 14px 18px;
  z-index:100;
  transition:transform 0.32s cubic-bezier(0.22,1,0.36,1);
}
#panel::before{
  content:'';display:block;
  width:36px;height:4px;border-radius:2px;
  background:${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.14)"};
  margin:0 auto 10px;
}

/* ── Input rows ── */
.inputs-wrap{position:relative;}
.input-row{
  display:flex;align-items:center;gap:10px;
  background:${inputBg};
  border-radius:14px;padding:0 12px;height:48px;
  border:1.5px solid transparent;
  transition:border-color 0.2s,box-shadow 0.2s;
  cursor:text;margin-bottom:6px;
}
.input-row:last-of-type{margin-bottom:0;}
.input-row.focused{border-color:${gold};box-shadow:0 0 0 3px ${gold}22;}
.dot-pickup{
  width:11px;height:11px;border-radius:50%;
  background:#27AE60;border:2.5px solid ${isDark ? "#1A1A1A" : "#fff"};
  box-shadow:0 1px 4px rgba(0,0,0,0.22);flex-shrink:0;
}
.dot-dest{
  width:11px;height:11px;border-radius:3px;
  background:#E74C3C;border:2.5px solid ${isDark ? "#1A1A1A" : "#fff"};
  box-shadow:0 1px 4px rgba(0,0,0,0.22);flex-shrink:0;
}
input{
  flex:1;border:none;outline:none;background:transparent;
  font-size:14px;color:${textColor};font-weight:500;min-width:0;
}
input::placeholder{color:${subColor};}
.clear-btn{
  background:none;border:none;cursor:pointer;padding:4px;
  color:${subColor};display:none;align-items:center;justify-content:center;
  border-radius:50%;transition:background 0.12s;flex-shrink:0;
}
.clear-btn:hover{background:rgba(128,128,128,0.12);}
.conn{
  position:absolute;left:21.5px;top:48px;
  width:2px;height:12px;background:${borderColor};z-index:1;
}
.swap-btn{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  width:32px;height:32px;border-radius:50%;
  background:${isDark ? "rgba(38,38,38,0.9)" : "rgba(255,255,255,0.9)"};
  border:1.5px solid ${borderColor};cursor:pointer;
  display:flex;align-items:center;justify-content:center;z-index:10;
  box-shadow:0 2px 8px rgba(0,0,0,0.14);color:${textColor};
  transition:transform 0.28s cubic-bezier(0.34,1.3,0.64,1),box-shadow 0.15s;
}
.swap-btn:hover{box-shadow:0 4px 14px rgba(0,0,0,0.2);}
.swap-btn.spinning{transform:translateY(-50%) rotate(180deg);}

/* ── Dropdown (opens upward, slide-up animation) ── */
#dropdown{
  position:absolute;
  bottom:calc(100% + 8px);
  left:0;right:0;
  background:${dropBg};
  border-radius:18px;
  box-shadow:0 -6px 40px rgba(0,0,0,0.22),0 2px 0 ${borderColor};
  max-height:300px;overflow-y:auto;
  z-index:200;border:1px solid ${borderColor};
  display:none;
  transform-origin:bottom center;
}
#dropdown.open{
  display:block;
  animation:ddSlideUp 0.24s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes ddSlideUp{
  from{opacity:0;transform:translateY(12px) scaleY(0.94);}
  to{opacity:1;transform:translateY(0) scaleY(1);}
}

/* ── Dropdown rows ── */
.sugg-item{
  display:flex;align-items:center;gap:11px;
  padding:10px 14px;cursor:pointer;
  transition:background 0.1s;
  border-bottom:1px solid ${isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)"};
}
.sugg-item:last-child{border-bottom:none;}
.sugg-item:hover,.sugg-item.active{background:${suggHover};}
.sugg-icon{
  width:34px;height:34px;border-radius:10px;flex-shrink:0;
  background:${isDark ? "rgba(197,165,90,0.12)" : "rgba(197,165,90,0.08)"};
  display:flex;align-items:center;justify-content:center;font-size:16px;
}
.sugg-icon.recent-ic{background:${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};}
.sugg-texts{flex:1;min-width:0;}
.sugg-name{font-size:13px;font-weight:600;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sugg-name mark.hl{background:none;color:${gold};font-weight:800;}
.sugg-sub{font-size:11px;color:${subColor};margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sugg-dist{font-size:10.5px;color:${gold};font-weight:700;flex-shrink:0;margin-left:6px;
  background:${isDark ? "rgba(197,165,90,0.1)" : "rgba(197,165,90,0.08)"};
  padding:2px 6px;border-radius:6px;
}

/* ── Section header ── */
.dd-section{
  display:flex;align-items:center;gap:8px;
  padding:10px 14px 4px;
  font-size:10px;font-weight:800;color:${subColor};
  text-transform:uppercase;letter-spacing:0.8px;
}
.dd-section-line{flex:1;height:1px;background:${borderColor};}

/* ── Use my location button ── */
#use-curr{
  display:flex;align-items:center;gap:11px;
  padding:12px 14px;cursor:pointer;
  background:${isDark ? "rgba(25,118,210,0.06)" : "rgba(25,118,210,0.04)"};
  border-bottom:1px solid ${borderColor};
  transition:background 0.14s;
}
#use-curr:hover{background:${isDark ? "rgba(25,118,210,0.12)" : "rgba(25,118,210,0.09)"};}
.curr-loc-icon{
  width:34px;height:34px;border-radius:10px;flex-shrink:0;
  background:rgba(25,118,210,0.14);
  display:flex;align-items:center;justify-content:center;
}
.curr-loc-texts{flex:1;}
.curr-loc-name{font-size:13px;font-weight:700;color:#2196F3;}
.curr-loc-sub{font-size:11px;color:${subColor};margin-top:1px;}
.curr-loc-badge{
  font-size:10px;font-weight:700;color:#2196F3;
  background:rgba(25,118,210,0.1);padding:2px 7px;border-radius:6px;flex-shrink:0;
}

/* ── Home / Work shortcut grid ── */
.shortcuts-wrap{padding:8px 10px 4px;display:flex;gap:7px;}
.shortcut-btn{
  flex:1;display:flex;align-items:center;gap:7px;
  background:${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"};
  border:1px solid ${borderColor};
  border-radius:12px;padding:9px 10px;cursor:pointer;
  transition:background 0.12s,border-color 0.12s;min-width:0;
}
.shortcut-btn:hover{
  background:${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
  border-color:${gold}55;
}
.shortcut-icon{font-size:17px;flex-shrink:0;}
.shortcut-texts{flex:1;min-width:0;}
.shortcut-name{font-size:12px;font-weight:700;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.shortcut-addr{font-size:10.5px;color:${subColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.shortcut-set{font-size:10.5px;color:${gold};font-weight:600;}

/* ── Misc ── */
.dropdown-empty{padding:18px 14px;text-align:center;font-size:12.5px;color:${subColor};}
.dropdown-searching{padding:14px 16px;display:flex;align-items:center;gap:10px;}
.search-spinner{
  width:16px;height:16px;border-radius:50%;flex-shrink:0;
  border:2px solid ${borderColor};border-top-color:${gold};
  animation:spin 0.7s linear infinite;
}
.searching-text{font-size:12.5px;color:${subColor};}

/* ── Driver ETA badge ── */
#driver-eta{
  display:none;
  align-items:center;gap:8px;
  background:${isDark ? "rgba(39,174,96,0.12)" : "rgba(39,174,96,0.08)"};
  border:1px solid rgba(39,174,96,0.25);
  border-radius:12px;padding:8px 12px;margin-top:8px;
}
#driver-eta.visible{display:flex;}
.eta-pulse{
  width:8px;height:8px;border-radius:50%;background:#27AE60;flex-shrink:0;
  animation:etaPulse 1.4s ease-in-out infinite;
}
@keyframes etaPulse{0%,100%{box-shadow:0 0 0 0 rgba(39,174,96,0.5);}50%{box-shadow:0 0 0 6px rgba(39,174,96,0);}}
#driver-eta-text{font-size:12.5px;font-weight:600;color:#27AE60;}
#driver-eta-sub{font-size:11px;color:${subColor};margin-left:auto;}

/* ── Ride type selector ── */
#ride-types-wrap{display:none;margin-top:10px;}
#ride-types-wrap.visible{display:block;}

#surge-row{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:8px;padding:0 2px;
}
.surge-label{font-size:12px;font-weight:600;color:${subColor};display:flex;align-items:center;gap:6px;}
.surge-badge{
  background:linear-gradient(135deg,#E74C3C,#C0392B);
  color:#fff;font-size:10px;font-weight:800;
  padding:2px 7px;border-radius:20px;letter-spacing:0.3px;
  display:none;
}
.surge-badge.on{display:inline-block;}
.toggle-wrap{display:flex;align-items:center;gap:6px;}
.toggle-lbl{font-size:11.5px;color:${subColor};}
.toggle{
  position:relative;width:38px;height:22px;
  background:${isDark ? "#333" : "#ddd"};
  border-radius:11px;cursor:pointer;
  transition:background 0.22s;flex-shrink:0;
}
.toggle.on{background:${gold};}
.toggle::after{
  content:'';position:absolute;top:3px;left:3px;
  width:16px;height:16px;border-radius:50%;
  background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);
  transition:transform 0.22s cubic-bezier(0.34,1.3,0.64,1);
}
.toggle.on::after{transform:translateX(16px);}

#ride-cards-scroll{
  display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;
  scrollbar-width:none;-ms-overflow-style:none;
}
#ride-cards-scroll::-webkit-scrollbar{display:none;}
.ride-card{
  flex:1;min-width:88px;
  background:${cardBg};
  border:2px solid transparent;
  border-radius:16px;padding:10px 8px;
  cursor:pointer;text-align:center;
  transition:all 0.2s cubic-bezier(0.34,1.2,0.64,1);
  flex-shrink:0;
}
.ride-card:hover{transform:translateY(-1px);}
.ride-card.selected{
  background:${cardSel};
  border-color:${gold};
  box-shadow:0 3px 14px ${gold}30;
}
.ride-icon{font-size:24px;line-height:1;margin-bottom:4px;}
.ride-name{font-size:12.5px;font-weight:700;color:${textColor};margin-bottom:2px;}
.ride-cap{font-size:10.5px;color:${subColor};margin-bottom:5px;}
.ride-fare{font-size:14px;font-weight:800;color:${gold};}
.ride-eta-badge{font-size:10px;font-weight:600;color:${isDark ? "#aaa" : "#888"};margin-top:3px;}

/* ── Ride info row ── */
#ride-info{
  display:none;
  background:${isDark ? "rgba(197,165,90,0.08)" : "rgba(197,165,90,0.06)"};
  border:1px solid ${gold}2A;
  border-radius:14px;padding:10px 12px;
  margin-top:10px;
  align-items:center;justify-content:space-between;gap:4px;
}
#ride-info.visible{display:flex;}
.ri-block{text-align:center;flex:1;}
.ri-val{font-size:16px;font-weight:800;color:${textColor};}
.ri-label{font-size:9.5px;color:${subColor};margin-top:1px;text-transform:uppercase;letter-spacing:0.4px;}
.ri-sep{width:1px;height:28px;background:${borderColor};}
.fare-val{font-size:18px;font-weight:900;color:${gold};}

/* ── Surge banner ── */
#surge-banner{
  display:none;align-items:center;justify-content:center;gap:6px;
  background:linear-gradient(135deg,rgba(231,76,60,0.15),rgba(192,57,43,0.1));
  border:1px solid rgba(231,76,60,0.25);
  border-radius:10px;padding:6px 10px;margin-top:6px;
}
#surge-banner.visible{display:flex;}
.surge-icon{font-size:14px;}
.surge-text{font-size:12px;font-weight:700;color:#E74C3C;}

/* ── Book button ── */
#book-btn{
  display:none;
  width:100%;height:48px;border-radius:14px;border:none;cursor:pointer;
  background:linear-gradient(135deg,${gold},#A88B3D);
  color:#0A0A08;font-size:14.5px;font-weight:700;
  box-shadow:0 4px 16px ${gold}44;
  align-items:center;justify-content:center;gap:8px;
  margin-top:10px;letter-spacing:0.2px;
  transition:transform 0.14s,box-shadow 0.14s;
}
#book-btn.visible{display:flex;}
#book-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px ${gold}55;}
#book-btn:active{transform:scale(0.98);}

/* ── Locate button ── */
#locate-btn{
  position:absolute;right:12px;bottom:calc(var(--panel-h, 170px) + 14px);
  width:40px;height:40px;border-radius:50%;
  background:${panelBg};border:1px solid ${borderColor};
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;z-index:50;color:${gold};
  transition:transform 0.15s;
}
#locate-btn:hover{transform:scale(1.08);}
#locate-btn:active{transform:scale(0.94);}

/* ── Shimmer loading ── */
#shimmer{
  position:absolute;inset:0;z-index:400;display:none;
  align-items:flex-end;justify-content:stretch;
  pointer-events:none;
}
#shimmer.visible{display:flex;}
.shimmer-panel{
  width:100%;padding:14px;
  border-radius:22px 22px 0 0;
  background:${panelBg};
}
.shimmer-line{
  height:12px;border-radius:6px;
  background:linear-gradient(90deg,${isDark ? "#1E1E1E" : "#eee"} 25%,${isDark ? "#2A2A2A" : "#f5f5f5"} 50%,${isDark ? "#1E1E1E" : "#eee"} 75%);
  background-size:200% 100%;
  animation:shim 1.2s infinite;margin-bottom:10px;
}
@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Spinner ── */
#loading{
  position:absolute;top:45%;left:50%;
  transform:translate(-50%,-50%);
  width:36px;height:36px;border-radius:50%;
  border:3px solid ${gold}30;border-top-color:${gold};
  animation:spin 0.8s linear infinite;z-index:300;display:none;
}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* ── Pulsing pickup marker ── */
@keyframes markerPulse{
  0%{box-shadow:0 0 0 0 rgba(39,174,96,0.6);}
  70%{box-shadow:0 0 0 12px rgba(39,174,96,0);}
  100%{box-shadow:0 0 0 0 rgba(39,174,96,0);}
}

/* ── MapLibre overrides ── */
.maplibregl-ctrl-logo{display:none!important;}
.maplibregl-ctrl-attrib{font-size:9px!important;}
.maplibregl-ctrl-group{box-shadow:0 2px 12px rgba(0,0,0,0.18)!important;border-radius:12px!important;overflow:hidden;}
.maplibregl-ctrl-group button{width:32px!important;height:32px!important;}
.maplibregl-ctrl-top-right{top:10px!important;right:10px!important;}
.maplibregl-popup-content{
  border-radius:12px;padding:7px 12px;
  font-size:12px;font-weight:600;color:${textColor};
  background:${isDark ? "#1C1C1C" : "#FFF"};
  box-shadow:0 4px 16px rgba(0,0,0,0.18);
}
</style>
</head>
<body>
<div id="map"></div>
<div id="loading"></div>

<!-- ── Shimmer loading overlay ── -->
<div id="shimmer">
  <div class="shimmer-panel">
    <div class="shimmer-line" style="width:60%;height:14px;margin-bottom:14px;"></div>
    <div class="shimmer-line" style="width:100%;"></div>
    <div class="shimmer-line" style="width:80%;"></div>
    <div class="shimmer-line" style="width:40%;margin-top:14px;height:14px;"></div>
  </div>
</div>

<!-- ── Bottom sheet ── -->
<div id="panel">
  <div class="inputs-wrap" id="inputs-wrap">
    <div class="input-row" id="row-pickup">
      <div class="dot-pickup"></div>
      <input id="inp-pickup" type="text" placeholder="Pickup location" autocomplete="off" autocorrect="off" spellcheck="false"/>
      <button class="clear-btn" id="clr-pickup">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="conn"></div>
    <div class="input-row" id="row-dest">
      <div class="dot-dest"></div>
      <input id="inp-dest" type="text" placeholder="Where to?" autocomplete="off" autocorrect="off" spellcheck="false"/>
      <button class="clear-btn" id="clr-dest">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <button class="swap-btn" id="swap-btn" title="Swap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="7 16 3 12 7 8"/><line x1="3" y1="12" x2="21" y2="12"/>
        <polyline points="17 8 21 12 17 16"/>
      </svg>
    </button>
    <div id="dropdown"></div>
  </div>

  <div id="driver-eta">
    <div class="eta-pulse"></div>
    <div id="driver-eta-text">Driver arriving in -- min</div>
    <div id="driver-eta-sub">Nearby driver found</div>
  </div>

  <div id="ride-types-wrap">
    <div id="surge-row">
      <div class="surge-label">
        Choose ride
        <span class="surge-badge" id="surge-badge">⚡ Surge</span>
      </div>
      <div class="toggle-wrap">
        <span class="toggle-lbl">Surge</span>
        <div class="toggle" id="surge-toggle" title="Toggle surge pricing"></div>
      </div>
    </div>
    <div id="ride-cards-scroll">
      <div class="ride-card selected" data-id="mini">
        <div class="ride-icon">🚗</div>
        <div class="ride-name">Mini</div>
        <div class="ride-cap">4 seats</div>
        <div class="ride-fare" id="fare-mini">₹--</div>
        <div class="ride-eta-badge" id="eta-mini">-- min</div>
      </div>
      <div class="ride-card" data-id="sedan">
        <div class="ride-icon">🚙</div>
        <div class="ride-name">Sedan</div>
        <div class="ride-cap">4 seats</div>
        <div class="ride-fare" id="fare-sedan">₹--</div>
        <div class="ride-eta-badge" id="eta-sedan">-- min</div>
      </div>
      <div class="ride-card" data-id="suv">
        <div class="ride-icon">🚐</div>
        <div class="ride-name">SUV</div>
        <div class="ride-cap">6 seats</div>
        <div class="ride-fare" id="fare-suv">₹--</div>
        <div class="ride-eta-badge" id="eta-suv">-- min</div>
      </div>
    </div>
  </div>

  <div id="surge-banner">
    <span class="surge-icon">⚡</span>
    <span class="surge-text">1.8× Surge pricing active</span>
  </div>

  <div id="ride-info">
    <div class="ri-block">
      <div class="fare-val" id="stat-fare">₹--</div>
      <div class="ri-label">Fare</div>
    </div>
    <div class="ri-sep"></div>
    <div class="ri-block">
      <div class="ri-val" id="stat-dist">--</div>
      <div class="ri-label">km</div>
    </div>
    <div class="ri-sep"></div>
    <div class="ri-block">
      <div class="ri-val" id="stat-dur">--</div>
      <div class="ri-label">min</div>
    </div>
    <div class="ri-sep"></div>
    <div class="ri-block">
      <div class="ri-val" id="stat-eta">--</div>
      <div class="ri-label">ETA</div>
    </div>
  </div>

  <button id="book-btn">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/></svg>
    Confirm Ride
  </button>
</div>

<div id="locate-btn" title="My location">
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19a7 7 0 110-14 7 7 0 010 14z"/>
  </svg>
</div>

<script>
(function(){
'use strict';
function postToParent(d){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(d));else window.parent.postMessage(d,'*');}catch(e){}}
window.__nativeMsg=function(d){try{window.dispatchEvent(new MessageEvent('message',{data:d}));}catch(e){}};

var API_BASE='${apiBase}';
var GOLD='${gold}';
var INIT_LAT=${lat},INIT_LNG=${lng},INIT_ZOOM=${zoom};
var SHOW_USER=${showUser ? "true" : "false"};
var INIT_MARKERS=${markersJson};

/* ── Ride type definitions ── */
var RIDE_TYPES=[
  {id:'mini',  name:'Mini',  icon:'🚗', baseFare:30, rateUnder:14, rateOver:11, etaOffset:0,  capacity:4},
  {id:'sedan', name:'Sedan', icon:'🚙', baseFare:50, rateUnder:18, rateOver:15, etaOffset:2,  capacity:4},
  {id:'suv',   name:'SUV',  icon:'🚐', baseFare:80, rateUnder:25, rateOver:20, etaOffset:5,  capacity:6},
];
var SURGE_MULT=1.8;

/* ── State ── */
var pickupCoords=null,destCoords=null;
var pickupText='',destText='';
var activeField=null;
var debounceTimer=null;
var suggIdx=-1,suggestions=[];
var routeSourceId=null;
var pickupMarker=null,destMarker=null,userMarker=null;
var carMarker=null;
var driverMarkers=[];
var userPos=null;
var selectedRide='mini';
var surgeOn=false;
var routeDistKm=0,routeDurMin=0;
var driverEtaRemaining=0;
var carAnimPath=[],carAnimStep=0,carAnimTimer=null;
var olaToken=null;
var olaApiKey=null;

/* ── Helpers ── */
function haversine(a,b,c,d){var R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180;var x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)*Math.sin(dN/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function fmtDist(km){return km<1?(Math.round(km*1000)+'m'):(km<10?km.toFixed(1)+'km':Math.round(km)+'km');}
function eta(mins){var d=new Date();d.setMinutes(d.getMinutes()+Math.round(mins));return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function loading(on){document.getElementById('loading').style.display=on?'block':'none';}
function shimmer(on){document.getElementById('shimmer').classList.toggle('visible',on);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function panelH(){return document.getElementById('panel').offsetHeight||200;}
function updateLocateBtn(){document.getElementById('locate-btn').style.bottom=(panelH()+14)+'px';}

/* ── Fare calculator ── */
function calcFare(km, rideId, surge){
  var rt=RIDE_TYPES.find(function(r){return r.id===rideId;});
  var rate=km<10?rt.rateUnder:rt.rateOver;
  var f=Math.round(rt.baseFare+km*rate);
  return surge?Math.round(f*SURGE_MULT):f;
}

/* ── OSM fallback style (no auth needed) ── */
var OSM_STYLE={
  version:8,
  sources:{
    'osm-tiles':{
      type:'raster',
      tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize:256,
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers:[{id:'osm-layer',type:'raster',source:'osm-tiles',minzoom:0,maxzoom:19}]
};

/* ── Fetch Ola credentials via backend proxy ── */
function fetchOlaCreds(cb){
  if(olaToken||olaApiKey){cb(olaToken,olaApiKey);return;}
  fetch(API_BASE+'/api/ola/token')
    .then(function(r){return r.json();})
    .then(function(d){
      olaToken=d.token||null;
      olaApiKey=d.apiKey||null;
      cb(olaToken,olaApiKey);
    })
    .catch(function(){cb(null,null);});
}

/* ── Map init ── */
var map=new maplibregl.Map({
  container:'map',
  style:OSM_STYLE,
  center:[INIT_LNG,INIT_LAT],
  zoom:INIT_ZOOM,
  attributionControl:false,
  transformRequest:function(url,resourceType){
    if(url.indexOf('api.olamaps.io')>=0){
      if(olaToken)return{url:url,headers:{Authorization:'Bearer '+olaToken}};
      if(olaApiKey){
        var sep=url.indexOf('?')>=0?'&':'?';
        return{url:url+sep+'api_key='+olaApiKey};
      }
    }
    return{url:url};
  }
});
map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');

/* Fetch Ola credentials then load style directly — simplest reliable approach */
fetch(API_BASE+'/api/ola/token')
  .then(function(r){return r.json();})
  .then(function(d){
    var key=d.apiKey||null;
    var tok=d.token||null;
    if(!key&&!tok)return; /* no credentials → stay on OSM */
    olaApiKey=key;
    olaToken=tok;
    var styleUrl='${styleUrl}';
    if(key) styleUrl+=styleUrl.indexOf('?')>=0?'&api_key='+key:'?api_key='+key;
    map.setStyle(styleUrl);
  })
  .catch(function(){}); /* stay on OSM if token fetch fails */

/* ── User dot ── */
function placeUserDot(lng,lat){
  if(userMarker)userMarker.remove();
  var el=document.createElement('div');
  el.style.cssText='width:18px;height:18px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(66,133,244,0.18);';
  userMarker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([lng,lat]).addTo(map);
}

map.once('load',function(){
  if(SHOW_USER){
    navigator.geolocation&&navigator.geolocation.getCurrentPosition(function(pos){
      userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      placeUserDot(userPos.lng,userPos.lat);
      map.flyTo({center:[userPos.lng,userPos.lat],zoom:13,duration:1000});
      reverseGeocode(userPos.lat,userPos.lng,function(name){
        if(name&&!pickupText){
          document.getElementById('inp-pickup').value=name;
          pickupText=name;pickupCoords={lat:userPos.lat,lng:userPos.lng};
          updateClearBtns();
        }
      });
    },null,{timeout:7000,enableHighAccuracy:false,maximumAge:60000});
  }
  INIT_MARKERS.forEach(addDriverMarker);
  postToParent({type:'MAP_READY'});
  updateLocateBtn();
});

/* ── Driver markers ── */
function addDriverMarker(m){
  var el=document.createElement('div');
  el.style.cssText='width:32px;height:32px;background:'+GOLD+';border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25);cursor:pointer;font-size:15px;';
  el.textContent='🚗';
  var mk=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([m.lng,m.lat]).addTo(map);
  driverMarkers.push(mk);
}

/* ── Animated car marker ── */
function placeCarMarker(lat,lng){
  if(carMarker)carMarker.remove();
  var el=document.createElement('div');
  el.id='car-el';
  el.style.cssText='font-size:22px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));';
  el.textContent='🚗';
  carMarker=new maplibregl.Marker({element:el,anchor:'center',rotationAlignment:'map'}).setLngLat([lng,lat]).addTo(map);
}

function simulateDriver(pickupLat,pickupLng){
  if(carAnimTimer)clearInterval(carAnimTimer);
  var angle=Math.random()*2*Math.PI;
  var distKm=2+Math.random()*2;
  var dLat=(distKm/111)*Math.cos(angle);
  var dLng=(distKm/(111*Math.cos(pickupLat*Math.PI/180)))*Math.sin(angle);
  var dLat0=pickupLat+dLat, dLng0=pickupLng+dLng;
  var steps=40;
  carAnimPath=[];
  for(var i=0;i<=steps;i++){
    carAnimPath.push({lat:dLat0+(pickupLat-dLat0)*(i/steps),lng:dLng0+(pickupLng-dLng0)*(i/steps)});
  }
  carAnimStep=0;
  driverEtaRemaining=Math.max(1,Math.ceil(distKm/0.4));
  placeCarMarker(dLat0,dLng0);
  updateDriverEta(driverEtaRemaining);
  document.getElementById('driver-eta').classList.add('visible');
  carAnimTimer=setInterval(function(){
    if(carAnimStep>=carAnimPath.length-1){clearInterval(carAnimTimer);return;}
    carAnimStep++;
    var p=carAnimPath[carAnimStep];
    if(carMarker)carMarker.setLngLat([p.lng,p.lat]);
    if(carAnimStep<carAnimPath.length-1){
      var next=carAnimPath[carAnimStep+1];
      var bearing=Math.atan2(next.lng-p.lng,next.lat-p.lat)*180/Math.PI;
      var el=document.getElementById('car-el');
      if(el)el.style.transform='rotate('+(bearing-45)+'deg)';
    }
    var stepsLeft=carAnimPath.length-1-carAnimStep;
    driverEtaRemaining=Math.max(1,Math.ceil(stepsLeft*distKm/(steps*2.5)));
    updateDriverEta(driverEtaRemaining);
    updateLocateBtn();
  },700);
}

function updateDriverEta(mins){
  var el=document.getElementById('driver-eta-text');
  if(el)el.textContent=mins<=1?'Driver arriving now':'Driver arriving in '+mins+' min';
}

/* ── Ride type UI ── */
function updateRideCards(){
  RIDE_TYPES.forEach(function(rt){
    var f=calcFare(routeDistKm,rt.id,surgeOn);
    var fEl=document.getElementById('fare-'+rt.id);
    var eEl=document.getElementById('eta-'+rt.id);
    if(fEl)fEl.textContent='₹'+f.toLocaleString('en-IN');
    var arrEta=driverEtaRemaining+rt.etaOffset;
    if(eEl)eEl.textContent=arrEta+' min away';
  });
  var selFare=calcFare(routeDistKm,selectedRide,surgeOn);
  document.getElementById('stat-fare').textContent='₹'+selFare.toLocaleString('en-IN');
  document.getElementById('surge-banner').classList.toggle('visible',surgeOn);
  document.getElementById('surge-badge').classList.toggle('on',surgeOn);
}

function selectRideType(id){
  selectedRide=id;
  document.querySelectorAll('.ride-card').forEach(function(el){
    el.classList.toggle('selected',el.getAttribute('data-id')===id);
  });
  updateRideCards();
}

document.querySelectorAll('.ride-card').forEach(function(el){
  el.addEventListener('click',function(){selectRideType(el.getAttribute('data-id'));});
});

document.getElementById('surge-toggle').addEventListener('click',function(){
  surgeOn=!surgeOn;
  this.classList.toggle('on',surgeOn);
  updateRideCards();
});

/* ── Geocoding via backend proxy (Ola Maps) ── */
var geocodeCache={};
var recentSearches=[];

function showSearchSpinner(){
  var dd=document.getElementById('dropdown');
  dd.innerHTML='<div class="dropdown-searching"><div class="search-spinner"></div><span class="searching-text">Searching locations...</span></div>';
  dd.classList.add('open');
  dd.style.display='';
}

function geocode(query,bLat,bLng,cb){
  clearTimeout(debounceTimer);
  showSearchSpinner();
  var cacheKey=query.toLowerCase().trim();
  if(geocodeCache[cacheKey]){cb(geocodeCache[cacheKey]);return;}
  debounceTimer=setTimeout(function(){
    if(!query||query.trim().length<2){cb([]);return;}
    var params=new URLSearchParams({q:query.trim()});
    if(bLat&&bLng){params.append('lat',String(bLat));params.append('lon',String(bLng));}
    fetch(API_BASE+'/api/ola/search?'+params)
      .then(function(r){return r.json();})
      .then(function(d){
        var preds=d.predictions||[];
        var results=preds.map(function(p){
          var lat=p.geometry&&p.geometry.location?p.geometry.location.lat:null;
          var lng=p.geometry&&p.geometry.location?p.geometry.location.lng:null;
          var name=p.structured_formatting?p.structured_formatting.main_text||p.description:p.description||'';
          var sub=p.structured_formatting?p.structured_formatting.secondary_text||'':p.description||'';
          if(sub===name)sub='';
          var dist=(bLat&&bLng&&lat&&lng)?haversine(bLat,bLng,lat,lng):null;
          return{name:name,sub:sub,fullName:p.description||name,lat:lat,lng:lng,type:p.types&&p.types[0]||'place',dist:dist,placeId:p.place_id};
        }).filter(function(r){return r.name;});
        geocodeCache[cacheKey]=results;
        cb(results);
      })
      .catch(function(){cb([]);});
  },300);
}

function reverseGeocode(lat,lng,cb){
  fetch(API_BASE+'/api/ola/reverse?lat='+lat+'&lon='+lng)
    .then(function(r){return r.json();})
    .then(function(d){
      var results=d.results||d.geocodingResults||[];
      var first=results[0];
      if(!first){cb(null);return;}
      /* Ola reverse geocode: first result has formatted_address */
      var addr=first.formatted_address||first.name||null;
      /* Short name: area + city */
      var comps=first.address_components||[];
      var area='',city='';
      comps.forEach(function(c){
        var t=c.types||[];
        if(t.indexOf('sublocality_level_1')>=0||t.indexOf('neighborhood')>=0)area=c.long_name;
        if(t.indexOf('locality')>=0||t.indexOf('administrative_area_level_3')>=0)city=c.long_name;
      });
      var short=[area,city].filter(Boolean).join(', ')||addr;
      cb(short);
    })
    .catch(function(){cb(null);});
}

/* ── Markers ── */
function placePickupMarker(lat,lng){
  if(pickupMarker)pickupMarker.remove();
  var el=document.createElement('div');
  el.style.cssText='width:15px;height:15px;background:#27AE60;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.28);animation:markerPulse 2s infinite;';
  pickupMarker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([lng,lat]).addTo(map);
}
function placeDestMarker(lat,lng){
  if(destMarker)destMarker.remove();
  var el=document.createElement('div');
  el.style.cssText='display:flex;flex-direction:column;align-items:center;';
  el.innerHTML='<div style="width:13px;height:13px;background:#E74C3C;border-radius:3px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);"></div>'
    +'<div style="width:2px;height:10px;background:#E74C3C;margin-top:-1px;"></div>';
  destMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([lng,lat]).addTo(map);
}

/* ── Route via Ola Maps Directions (backend proxy) ── */
function clearRoute(){
  ['route-c','route-l'].forEach(function(id){if(map.getLayer(id))map.removeLayer(id);});
  if(routeSourceId&&map.getSource(routeSourceId))map.removeSource(routeSourceId);
  routeSourceId=null;
  document.getElementById('ride-info').classList.remove('visible');
  document.getElementById('book-btn').classList.remove('visible');
  document.getElementById('ride-types-wrap').classList.remove('visible');
  document.getElementById('surge-banner').classList.remove('visible');
  document.getElementById('driver-eta').classList.remove('visible');
  if(carMarker){carMarker.remove();carMarker=null;}
  if(carAnimTimer){clearInterval(carAnimTimer);carAnimTimer=null;}
  routeDistKm=0;routeDurMin=0;
  updateLocateBtn();
}

function decodePolyline(encoded){
  var coords=[],idx=0,len=encoded.length;
  var lat=0,lng=0;
  while(idx<len){
    var b,shift=0,result=0;
    do{b=encoded.charCodeAt(idx++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
    lat+=(result&1)?~(result>>1):(result>>1);
    shift=0;result=0;
    do{b=encoded.charCodeAt(idx++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
    lng+=(result&1)?~(result>>1):(result>>1);
    coords.push([lng*1e-5,lat*1e-5]);
  }
  return coords;
}

function drawRoute(fLat,fLng,tLat,tLng){
  shimmer(true);clearRoute();
  var params=new URLSearchParams({origin:fLat+','+fLng,destination:tLat+','+tLng});
  fetch(API_BASE+'/api/ola/directions?'+params)
    .then(function(r){return r.json();})
    .then(function(d){
      shimmer(false);
      var routes=d.routes||[];
      if(!routes[0]){
        /* Fallback: straight-line estimate if API unavailable */
        routeDistKm=Math.round(haversine(fLat,fLng,tLat,tLng)*12)/10;
        routeDurMin=Math.round(routeDistKm*3);
        renderRouteStats();
        return;
      }
      var route=routes[0];
      var leg=route.legs&&route.legs[0];
      routeDistKm=leg?Math.round(leg.distance/100)/10:Math.round(haversine(fLat,fLng,tLat,tLng)*12)/10;
      routeDurMin=leg?Math.round(leg.duration/60):Math.round(routeDistKm*3);

      /* Draw polyline — Ola returns overview_polyline as string; Google/OSRM use {points:string} */
      var coords=[];
      var op=route.overview_polyline;
      if(typeof op==='string'&&op.length>0){
        coords=decodePolyline(op);
      } else if(op&&op.points){
        coords=decodePolyline(op.points);
      } else if(op&&Array.isArray(op)){
        coords=op.map(function(c){return[c[1]||c.lng,c[0]||c.lat];});
      }
      if(coords.length<2){
        coords=[[fLng,fLat],[tLng,tLat]];
      }

      routeSourceId='rt-'+Date.now();
      map.addSource(routeSourceId,{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords}}});
      map.addLayer({id:'route-c',type:'line',source:routeSourceId,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':9,'line-opacity':0.55}});
      map.addLayer({id:'route-l',type:'line',source:routeSourceId,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':GOLD,'line-width':5,'line-opacity':1}});

      var bounds=coords.reduce(function(b,c){
        if(c[0]<b[0])b[0]=c[0];if(c[1]<b[1])b[1]=c[1];
        if(c[0]>b[2])b[2]=c[0];if(c[1]>b[3])b[3]=c[1];
        return b;
      },[coords[0][0],coords[0][1],coords[0][0],coords[0][1]]);
      map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:{top:80,bottom:panelH()+160,left:50,right:50},maxZoom:14,duration:900});

      renderRouteStats();
    })
    .catch(function(){
      shimmer(false);
      /* Fallback to straight-line on network error */
      routeDistKm=Math.round(haversine(fLat,fLng,tLat,tLng)*12)/10;
      routeDurMin=Math.round(routeDistKm*3);
      renderRouteStats();
    });
}

function renderRouteStats(){
  document.getElementById('stat-dist').textContent=routeDistKm.toFixed(1);
  document.getElementById('stat-dur').textContent=Math.round(routeDurMin);
  document.getElementById('stat-eta').textContent=eta(routeDurMin);
  document.getElementById('ride-info').classList.add('visible');
  document.getElementById('book-btn').classList.add('visible');
  document.getElementById('ride-types-wrap').classList.add('visible');
  setTimeout(function(){
    if(pickupCoords){simulateDriver(pickupCoords.lat,pickupCoords.lng);updateRideCards();}
    updateLocateBtn();
  },600);
  postToParent({type:'ROUTE_READY',distanceKm:routeDistKm,durationMin:routeDurMin,fare:calcFare(routeDistKm,'mini',false)});
}

/* ── Dropdown helpers ── */
var savedHome=null;
var savedWork=null;

function highlightText(text,query){
  if(!query||query.trim().length<2)return esc(text);
  var q=query.trim().toLowerCase();
  var lo=text.toLowerCase();
  var out='',pos=0;
  while(pos<text.length){
    var idx=lo.indexOf(q,pos);
    if(idx<0){out+=esc(text.slice(pos));break;}
    out+=esc(text.slice(pos,idx));
    out+='<mark class="hl">'+esc(text.slice(idx,idx+q.length))+'</mark>';
    pos=idx+q.length;
  }
  return out||esc(text);
}

function iconSvg(type){
  var c=GOLD;
  if(type==='poi'||type==='establishment')return '<svg width="15" height="15" viewBox="0 0 24 24" fill="'+c+'"><path d="M12 3c-4.2 0-8 3.22-8 8.2 0 3.18 2.45 6.92 7.34 11.23a1 1 0 001.32 0C17.55 18.12 20 14.38 20 11.2 20 6.22 16.2 3 12 3zm0 10a2 2 0 110-4 2 2 0 010 4z"/></svg>';
  if(type==='address'||type==='street_address')return '<svg width="15" height="15" viewBox="0 0 24 24" fill="'+c+'"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="'+c+'"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
}

function sectionHdr(label){
  return '<div class="dd-section"><span>'+label+'</span><div class="dd-section-line"></div></div>';
}

function buildSuggItem(s,i,query){
  return '<div class="sugg-item" data-i="'+i+'">'
    +'<div class="sugg-icon">'+iconSvg(s.type)+'</div>'
    +'<div class="sugg-texts">'
    +'<div class="sugg-name">'+highlightText(s.name,query)+'</div>'
    +(s.sub?'<div class="sugg-sub">'+esc(s.sub)+'</div>':'')
    +'</div>'
    +(s.dist!=null?'<div class="sugg-dist">'+fmtDist(s.dist)+'</div>':'')
    +'</div>';
}

function buildShortcuts(){
  var html='<div class="shortcuts-wrap">';
  html+='<div class="shortcut-btn" id="sc-home"><div class="shortcut-icon">🏠</div><div class="shortcut-texts"><div class="shortcut-name">Home</div><div class="'+(savedHome?'shortcut-addr':'shortcut-set')+'">'+esc(savedHome?savedHome.name:'Add home address')+'</div></div></div>';
  html+='<div class="shortcut-btn" id="sc-work"><div class="shortcut-icon">💼</div><div class="shortcut-texts"><div class="shortcut-name">Work</div><div class="'+(savedWork?'shortcut-addr':'shortcut-set')+'">'+esc(savedWork?savedWork.name:'Add work address')+'</div></div></div>';
  html+='</div>';
  return html;
}

var _ddActiveField='';

function showDropdown(items,field,query){
  var dd=document.getElementById('dropdown');
  _ddActiveField=field;
  var html='';
  if(field==='pickup'){
    html+='<div id="use-curr"><div class="curr-loc-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="#2196F3"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19a7 7 0 110-14 7 7 0 010 14z"/></svg></div><div class="curr-loc-texts"><div class="curr-loc-name">📍 Use my location</div><div class="curr-loc-sub">Auto-detect via GPS</div></div><div class="curr-loc-badge">GPS</div></div>';
  }
  var q=(query||'').trim();
  if(q.length<2)html+=buildShortcuts();
  if(items.length>0){
    html+=sectionHdr('Results');
    items.forEach(function(s,i){html+=buildSuggItem(s,i,q);});
  }else if(q.length>=2){
    html+='<div class="dropdown-empty">No results for "'+esc(q)+'". Try a city or landmark.</div>';
  }
  if(recentSearches.length>0&&items.length===0){
    html+=sectionHdr('Recent');
    recentSearches.slice(0,4).forEach(function(s,i){
      html+='<div class="sugg-item" data-i="r'+i+'"><div class="sugg-icon recent-ic" style="font-size:15px;">🕐</div><div class="sugg-texts"><div class="sugg-name">'+esc(s.name)+'</div>'+(s.sub?'<div class="sugg-sub">'+esc(s.sub)+'</div>':'')+'</div></div>';
    });
  }
  dd.innerHTML=html;
  dd.style.display='';
  dd.classList.add('open');

  dd.querySelectorAll('.sugg-item').forEach(function(el){
    el.addEventListener('mousedown',function(e){e.preventDefault();});
    el.addEventListener('click',function(){
      var idx=el.getAttribute('data-i');
      if(idx&&idx.startsWith('r')){selectSugg(recentSearches[parseInt(idx.slice(1))],field);}
      else if(idx!=null){selectSugg(suggestions[+idx],field);}
    });
  });
  var curr=dd.querySelector('#use-curr');
  if(curr){curr.addEventListener('mousedown',function(e){e.preventDefault();});curr.addEventListener('click',useCurrLoc);}
  var scHome=dd.querySelector('#sc-home');
  if(scHome){scHome.addEventListener('mousedown',function(e){e.preventDefault();});scHome.addEventListener('click',function(){if(savedHome)selectSugg(savedHome,field);else window._setPendingSaved='home';});}
  var scWork=dd.querySelector('#sc-work');
  if(scWork){scWork.addEventListener('mousedown',function(e){e.preventDefault();});scWork.addEventListener('click',function(){if(savedWork)selectSugg(savedWork,field);else window._setPendingSaved='work';});}
}

function hideDropdown(){
  var dd=document.getElementById('dropdown');
  dd.classList.remove('open');
  dd.style.display='none';
  suggestions=[];suggIdx=-1;
}
function saveRecent(s){
  recentSearches=recentSearches.filter(function(r){return r.name!==s.name;});
  recentSearches.unshift(s);
  if(recentSearches.length>6)recentSearches.pop();
  if(window._setPendingSaved==='home'){savedHome={name:s.name,lat:s.lat,lng:s.lng,sub:s.sub||''};window._setPendingSaved=null;}
  else if(window._setPendingSaved==='work'){savedWork={name:s.name,lat:s.lat,lng:s.lng,sub:s.sub||''};window._setPendingSaved=null;}
}

function selectSugg(s,field){
  hideDropdown();
  if(!s.lat||!s.lng){
    /* Coords missing — skip invalid suggestion */
    return;
  }
  saveRecent(s);
  if(field==='pickup'){
    pickupText=s.name;pickupCoords={lat:s.lat,lng:s.lng};
    document.getElementById('inp-pickup').value=s.name;
    placePickupMarker(s.lat,s.lng);
    map.flyTo({center:[s.lng,s.lat],zoom:14,duration:800});
  }else{
    destText=s.name;destCoords={lat:s.lat,lng:s.lng};
    document.getElementById('inp-dest').value=s.name;
    placeDestMarker(s.lat,s.lng);
    map.flyTo({center:[s.lng,s.lat],zoom:13,duration:800});
  }
  updateClearBtns();
  document.getElementById('row-pickup').classList.remove('focused');
  document.getElementById('row-dest').classList.remove('focused');
  activeField=null;
  if(pickupCoords&&destCoords)drawRoute(pickupCoords.lat,pickupCoords.lng,destCoords.lat,destCoords.lng);
  postToParent({type:field==='pickup'?'PICKUP_SELECTED':'DEST_SELECTED',name:s.name,lat:s.lat,lng:s.lng});
}

function useCurrLoc(){
  hideDropdown();
  if(!userPos)return;
  pickupCoords={lat:userPos.lat,lng:userPos.lng};
  reverseGeocode(userPos.lat,userPos.lng,function(name){
    pickupText=name||'Current Location';
    document.getElementById('inp-pickup').value=pickupText;
    placePickupMarker(userPos.lat,userPos.lng);
    map.flyTo({center:[userPos.lng,userPos.lat],zoom:14,duration:800});
    updateClearBtns();
    if(pickupCoords&&destCoords)drawRoute(pickupCoords.lat,pickupCoords.lng,destCoords.lat,destCoords.lng);
    postToParent({type:'PICKUP_SELECTED',name:pickupText,lat:userPos.lat,lng:userPos.lng});
  });
}

function updateClearBtns(){
  document.getElementById('clr-pickup').style.display=pickupText?'flex':'none';
  document.getElementById('clr-dest').style.display=destText?'flex':'none';
}

/* ── Wire inputs ── */
function wireInput(inpId,rowId,field){
  var inp=document.getElementById(inpId),row=document.getElementById(rowId);
  inp.addEventListener('focus',function(){
    activeField=field;row.classList.add('focused');
    var q=inp.value.trim();
    if(q.length>=2){
      geocode(q,userPos&&userPos.lat,userPos&&userPos.lng,function(res){suggestions=res;showDropdown(res,field,q);});
    }else{
      suggestions=[];
      showDropdown([],field,'');
    }
  });
  inp.addEventListener('blur',function(){
    row.classList.remove('focused');
    setTimeout(function(){
      var dd=document.getElementById('dropdown');
      if(!dd.contains(document.activeElement))hideDropdown();
    },220);
  });
  inp.addEventListener('input',function(){
    var q=inp.value.trim();
    if(field==='pickup')pickupText='';else destText='';
    clearRoute();
    if(q.length<2){suggestions=[];showDropdown([],field,q);return;}
    geocode(q,userPos&&userPos.lat,userPos&&userPos.lng,function(res){
      if(activeField!==field)return;
      suggestions=res;
      showDropdown(res,field,q);
    });
  });
  inp.addEventListener('keydown',function(e){
    var items=document.querySelectorAll('.sugg-item');
    if(e.key==='ArrowDown'){e.preventDefault();suggIdx=Math.min(suggIdx+1,items.length-1);items.forEach(function(el,i){el.classList.toggle('active',i===suggIdx);});}
    else if(e.key==='ArrowUp'){e.preventDefault();suggIdx=Math.max(suggIdx-1,0);items.forEach(function(el,i){el.classList.toggle('active',i===suggIdx);});}
    else if(e.key==='Enter'&&suggIdx>=0&&suggestions[suggIdx])selectSugg(suggestions[suggIdx],field);
    else if(e.key==='Escape')hideDropdown();
  });
}
wireInput('inp-pickup','row-pickup','pickup');
wireInput('inp-dest','row-dest','dest');

/* ── Clear buttons ── */
document.getElementById('clr-pickup').addEventListener('click',function(){
  pickupText='';pickupCoords=null;
  document.getElementById('inp-pickup').value='';
  if(pickupMarker){pickupMarker.remove();pickupMarker=null;}
  clearRoute();updateClearBtns();
  document.getElementById('inp-pickup').focus();
});
document.getElementById('clr-dest').addEventListener('click',function(){
  destText='';destCoords=null;
  document.getElementById('inp-dest').value='';
  if(destMarker){destMarker.remove();destMarker=null;}
  clearRoute();updateClearBtns();
  document.getElementById('inp-dest').focus();
});

/* ── Swap ── */
document.getElementById('swap-btn').addEventListener('click',function(){
  var btn=this;
  btn.classList.add('spinning');
  setTimeout(function(){btn.classList.remove('spinning');},350);
  var tT=pickupText,tC=pickupCoords;
  pickupText=destText;pickupCoords=destCoords;
  destText=tT;destCoords=tC;
  document.getElementById('inp-pickup').value=pickupText;
  document.getElementById('inp-dest').value=destText;
  updateClearBtns();
  if(pickupMarker){pickupMarker.remove();pickupMarker=null;}
  if(destMarker){destMarker.remove();destMarker=null;}
  if(pickupCoords)placePickupMarker(pickupCoords.lat,pickupCoords.lng);
  if(destCoords)placeDestMarker(destCoords.lat,destCoords.lng);
  if(pickupCoords&&destCoords)drawRoute(pickupCoords.lat,pickupCoords.lng,destCoords.lat,destCoords.lng);
  else clearRoute();
});

/* ── Map click → reverse geocode ── */
map.on('click',function(e){
  if(!activeField)return;
  var lat=e.lngLat.lat,lng=e.lngLat.lng;
  loading(true);
  reverseGeocode(lat,lng,function(name){
    loading(false);
    if(name)selectSugg({name:name,lat:lat,lng:lng,type:'address',sub:'',dist:0},activeField);
  });
});

/* ── Locate button ── */
document.getElementById('locate-btn').addEventListener('click',function(){
  if(userPos){map.flyTo({center:[userPos.lng,userPos.lat],zoom:14,duration:800});}
  else{
    navigator.geolocation&&navigator.geolocation.getCurrentPosition(function(pos){
      userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      placeUserDot(userPos.lng,userPos.lat);
      map.flyTo({center:[userPos.lng,userPos.lat],zoom:14,duration:800});
    });
  }
});

/* ── Book button ── */
document.getElementById('book-btn').addEventListener('click',function(){
  if(!pickupCoords||!destCoords)return;
  postToParent({
    type:'BOOK_RIDE',
    pickup:pickupText,destination:destText,
    pickupLat:pickupCoords.lat,pickupLng:pickupCoords.lng,
    destLat:destCoords.lat,destLng:destCoords.lng,
    distanceKm:routeDistKm,durationMin:routeDurMin,
    fare:calcFare(routeDistKm,selectedRide,surgeOn),
    rideType:selectedRide,surge:surgeOn
  });
});

/* ── postMessage from parent ── */
window.addEventListener('message',function(e){
  if(!e.data)return;var d=e.data;
  if(d.type==='UPDATE_MARKERS'){driverMarkers.forEach(function(m){m.remove();});driverMarkers=[];(d.markers||[]).forEach(addDriverMarker);}
  if(d.type==='PAN_TO')map.flyTo({center:[d.lng,d.lat],zoom:d.zoom||13,duration:800});
  if(d.type==='SHOW_ROUTE')drawRoute(d.fromLat,d.fromLng,d.toLat,d.toLng);
  if(d.type==='SET_PICKUP'&&d.name){document.getElementById('inp-pickup').value=d.name;pickupText=d.name;if(d.lat&&d.lng){pickupCoords={lat:d.lat,lng:d.lng};placePickupMarker(d.lat,d.lng);}updateClearBtns();}
  if(d.type==='SET_DEST'&&d.name){document.getElementById('inp-dest').value=d.name;destText=d.name;if(d.lat&&d.lng){destCoords={lat:d.lat,lng:d.lng};placeDestMarker(d.lat,d.lng);}updateClearBtns();if(pickupCoords&&destCoords)drawRoute(pickupCoords.lat,pickupCoords.lng,destCoords.lat,destCoords.lng);}
});

/* ── Resize observer ── */
var ro=new ResizeObserver(function(){updateLocateBtn();});
ro.observe(document.getElementById('panel'));
})();
</script>
</body>
</html>`;
}
