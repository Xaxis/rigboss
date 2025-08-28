# Rigboss Backend Refactor Blueprint (Fresh Slate, WS‑only, Radio‑agnostic)

This is the authoritative plan to rebuild the backend from a near‑empty package so the whole stack works reliably, fast, and cleanly with the frontend:
- Real‑time, bidirectional radio control and telemetry (radio ⇄ backend ⇄ frontend)
- Radio‑agnostic via Hamlib (rigctld daemon first)
- WebSocket‑only for control; HTTP only for health/debug reads
- Clean modular code, minimal logs, strong typing, cross‑network support

You said you will delete most of the existing backend code. This plan assumes a fresh slate and prescribes exactly what we will re‑create and how we will verify it.

---

## 0) Goals & Non‑Goals

- Goals:
  - Frontend always receives live radio_state updates (≤1s latency)
  - UI changes (frequency/mode/power/PTT/Tune) immediately command the radio and are confirmed by state broadcasts
  - Radio‑agnostic via Hamlib; no model‑specific logic in app code
  - Cross‑network operation by default (frontend on laptop ⇄ backend on Pi)
  - Clean WS contracts; minimal/no legacy HTTP control
  - Minimal, high‑signal logs only
- Non‑Goals (for initial refactor):
  - No auto‑fallback adapter file (keep code minimal). If explicitly requested later, we can add a rigctl command adapter.
  - No broad feature creep; spectrum and audio are added after core parity is restored.

---

## 1) High‑Level Architecture

- Server: Fastify (HTTP) + Socket.IO (WS) on the same server
- Services:
  - RadioService (state orchestration, emits radio_state, executes commands via adapter)
  - SpectrumService (phase 2) — produces FFT frames
  - AudioService (phase 2) — transport/status only, no streaming in this pass
- Adapters:
  - RigctldAdapter (TCP client for rigctld daemon; one short‑lived socket per command)
  - (Optional later) RigctlCommandAdapter — only if explicitly requested
- Transport:
  - Events over root namespace WS only (no per‑feature namespaces)
  - HTTP only for /api/health and optional /api/radio/state (read‑only debugging)

---

## 2) Directory Layout (packages/backend)

- src/
  - index.ts — bootstrap (config, server, CORS, Socket.IO, WS handlers, health route, retry/poll wiring)
  - config.ts — env parsing via zod (typed config)
  - events.ts — central event names (const EVENTS)
  - dtos.ts — zod schemas + TS types for WS payloads and RADIO_STATE
  - services/
    - radio.ts — RadioService (source of truth)
    - spectrum.ts — stub (phase 2)
    - audio.ts — stub (phase 2)
  - adapters/
    - rigctld.ts — core adapter, clean IO + parsing
  - routes/
    - radio.ts — GET /api/radio/state (debug only)

No shared packages; only two workspaces remain (backend, frontend), as required.

---

## 3) Environment & Config

- Required env with defaults:
  - BACKEND_PORT=3001
  - USE_REAL_RADIO=true
  - RIGCTLD_HOST=127.0.0.1
  - RIGCTLD_PORT=4532
  - LOG_LEVEL=info
  - NODE_ENV=development
  - CORS_ORIGIN (comma‑separated allowlist; "*" only in development)
- Rules:
  - Bind HTTP to 0.0.0.0 (LAN)
  - WS CORS use the same origin allowlist

---

## 4) Events & Contracts

- EVENTS (events.ts):
  - radio_state
  - connection_status
  - spectrum_frame (phase 2)
  - audio_status (phase 2)

- RADIO_STATE payload (normalized):
  - connected: boolean
  - frequencyHz: number
  - mode: string
  - bandwidthHz?: number
  - power?: number (0–100)
  - ptt?: boolean
  - rigModel?: string
  - swr?: number
  - signalStrength?: number (approx dBm)

- WS Commands (root namespace, error‑first ack):
  - radio:connect { host?: string, port?: number }
  - radio:disconnect {}
  - radio:setFrequency { frequency: number }
  - radio:setMode { mode: string, bandwidthHz?: number }
  - radio:setPower { power: number(0–100) }
  - radio:setPTT { ptt: boolean }
  - radio:tune { ms?: number }  // brief low‑power PTT burst helper (not ATU control)

---

## 5) RigctldAdapter (Core I/O & Parsing)

- Design:
  - Per‑command TCP connection to RIGCTLD_HOST:RIGCTLD_PORT
  - Write: `${command}\n`
  - Read until a line beginning with `RPRT`, collect payload lines before it
  - Timeout 5s; destroy socket on error/timeout; throw
- connect(host, port): save args; send `f`; only set connected=true on success
- Methods:
  - getFrequency(): `f` → number
  - setFrequency(hz): `F ${hz}`
  - getMode(): `m` → first line is mode, second line (optional) is bandwidth in Hz
  - setMode(mode, bw): `M ${mode} ${bw}`
  - getPower(): `l RFPOWER` → parse 0..1 → clamp to 0–100
  - setPower(%): `L RFPOWER ${%/100}`
  - getPTT(): `t` → '1' | '0'
  - setPtt(bool): `T 1|0`
  - getSWR(): optional `l SWR` (if supported)
  - getSignalStrength(): optional `l STRENGTH` or `l SMETER` (map 0..1 → ≈ dBm)
- getState(): Promise.all of above; include only available optional fields; on adapter error return minimal `{ connected:false }` and allow retry loop to reconnect
- Logging: high‑signal errors only; no spammy per‑poll logs

---

## 6) RadioService

- Holds the current state and adapter instance
- Methods:
  - connect(host, port) → adapter.connect → set internal connected
  - disconnect() → adapter.disconnect → set connected=false
  - refreshState() → state = { ...state, ...await adapter.getState() } → emit EVENTS.RADIO_STATE
  - setFrequency/mode/power/ptt → call adapter → (optionally) refreshState to confirm and broadcast
- Emits only via an injected emitter (index wires to Socket.IO root namespace)

---

## 7) Bootstrap (index.ts)

- Create Fastify logger per env; CORS using allowlist
- Start HTTP server (0.0.0.0:BACKEND_PORT)
- Attach Socket.IO (path /socket.io) with same CORS policy
- Wire relays: radio.on(RADIO_STATE, state => io.emit('radio_state', state))
- WS command handlers (error‑first ack):
  - radio:connect/disconnect/setFrequency/setMode/setPower/setPTT/tune
  - Validate payloads (zod), call service, and ack errors/success
- Connection lifecycle:
  - attemptConnect(backoffMs=1500)
    - try radio.connect(RIGCTLD_HOST, RIGCTLD_PORT)
    - on success: start polling (setInterval(refreshState, 1000))
    - on failure: emit a single `{ connected:false }` snapshot; schedule retry with exponential backoff (cap 15s)
  - Stop polling on failure; restart on next success

---

## 8) HTTP (Minimal)

- GET /api/health → { name, version, status, uptimeSec, services[] }
- GET /api/radio/state → current state (debug only)
- Remove all HTTP control endpoints after WS verified

---

## 9) Cross‑Network & CORS

- Backend binds to 0.0.0.0
- CORS allowlist from env (e.g., http://localhost:4321 and http://10.0.0.0/24 during development)
- Socket.IO CORS mirrors HTTP CORS
- Frontend VITE_BACKEND_URL controls base URL used by the client

---

## 10) Logging & Observability

- Lifecycle logs only: server listen, WS connect/disconnect, radio connect/connected/failure, poll error
- No per‑poll spam; keep errors concise with context (command, host:port)
- Optional health endpoint lists service metadata

---

## 11) Verification Plan (Backend & End‑to‑End)

- Backend alone:
  - With rigctld running on Pi: `echo "f" | nc 127.0.0.1 4532` must respond
  - Start backend: expect connect → connected → polling; no spam
  - WS commands: setFrequency/mode/power/PTT/tune → ack true, and state broadcast follows
- End‑to‑end with frontend:
  - WebSocket connects and begins receiving radio_state at ~1 Hz
  - Twisting the dial updates UI ≤1s
  - UI changes move the radio and are confirmed back via broadcast
  - Tune issues a brief TX burst and returns to RX without error
  - SWR/Signal populate if rig provides; otherwise omitted

---

## 12) Cleanup & Deletion Scope

Delete or omit entirely in the fresh slate:
- Legacy HTTP control routes (/api/radio/connect|frequency|mode|power|ptt)
- Any mock emit intervals in production paths
- Per‑feature Socket.IO namespaces (/radio, /spectrum, etc.) — emit on root namespace only
- Emoji/noisy logs and dead code paths

---

## 13) Spectrum (Phase 2, after core parity)

- Backend SpectrumService:
  - Source: prefer IQ; fallback to PCM (ALSA arecord/sox) — configurable via env
  - Pipeline: window → FFT → power dB bins → optional averaging/downsampling
  - Emit message: `{ timestamp, startHz, binSizeHz, bins:number[] }` at 15–30 fps
  - WS setting channel to adjust span, fps, averaging; echoed back by server
- Frontend Spectrum UI:
  - High‑perf Canvas/WebGL for spectrum + waterfall; precise wheel zoom/pan
  - Fullscreen modes: combined / spectrum‑only / waterfall‑only; mini‑embed in Radio Control panel

---

## 14) Implementation Order

1) Recreate scaffolding (config, events, types, index, RadioService, rigctld adapter)
2) Implement WS command handlers and event relays; add minimal HTTP reads
3) Wire connect→retry and polling lifecycle; verify live flow with frontend
4) Replace any remaining fetch control paths in frontend with WS; remove HTTP control on backend
5) Add optional sensors (SWR/Signal) and ensure clean logging
6) Begin spectrum service and UI (phase 2)

---

## 15) Operational Notes

- Start rigctld on the Pi (example):
  - `rigctld -m <MODEL> -r /dev/ttyUSB0 -s 19200 -T 127.0.0.1 -t 4532 &`
- Quick probes (on the Pi):
  - `echo "f" | nc 127.0.0.1 4532`
  - `echo "m" | nc 127.0.0.1 4532`
  - `echo "l RFPOWER" | nc 127.0.0.1 4532`

This blueprint is intentionally specific so we can rebuild fast, verify quickly, and avoid re‑introducing legacy/broken patterns. Once you confirm, I’ll execute the steps in this order and keep the file updated as we complete each milestone.
