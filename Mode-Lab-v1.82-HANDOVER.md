# Mode Lab v1.82 — handover

Base: gated v1.73 (Dr. Music PASS, 58-variation Jam engine). Dale's v1.80 features ported on top (3-way merge v1.70 → v1.73 / v1.80, then hand review).

## Ported from v1.80
- Study Lab (Study-Lab-v1.82.html) + recordings in study-audio/*.bin (window.KL_AUDIO base "study-audio/")
- Know-Lab-v1.82.html redirect stub → Study Lab; index.html routes ?lab=study / ?lab=know
- Study pill in every lab header (7 gold pills; phone portrait grid now 7 columns)
- Tuner: flat/sharp labels, slower needle, smoothed cents with "in tune / flat / sharp" (Mode, Jam, Fret, Chord, Tab, Song)
- Mode: VexFlow fallback staff now barred 4/4 with beaming; Instrument select wiring
- Jam: More menu (Shuffle, Click, Count-in, Loop: Straight / With you); With-you thins the guitar on bars 7–8 and uses echo cancel on the built-in mic
- Fret: bass neck (4/5 strings, 5-string B), bass clef + Bass track in notation, string-count select follows instrument
- Chord: Instrument select (guitar/bass neck)
- Song: bass opens when Instrument = bass; "Quick tip" wording
- Tab: transport bar (Start, Back, Play, Pause, Stop, On, Fwd, tempo, shuttle, Follow), opens on Both (score + tab), tab-only shows rhythm with bars, click-to-position

## New in v1.82
- Mode notation renders with alphaTab (score + tab, barred 4/4, Bravura); gold playhead marker; VexFlow → home staff only as fallback
- Fret: Play always sounds. Scale / study Test plays the root as a reference (never the answer); Practice plays the scale in the box

## Kept from v1.71–v1.73 (not overwritten)
58-variation Jam genre engine, LINK_RE links, U4 shift labels (shiftNote()), J6/J8/jgTonic, mic fixes, phone header, iPhone landscape buttons, scroll guard, Song copyright expanded, all v1.73 theory tables (byte-identical scale lines), 8-string tunings.

## Not ported (conflicts)
- v1.80 Jam JAM_VIBES / jamPocket rhythm engine, renamed/re-ordered banks, Waltz 3/4 bank, country-chuck guitar, new bass feels, swing 0.33: these replace the gated 58-variation engine (and left jamPocket undefined in a merge). Needs Dr. Music before any of it goes in.
- Jam Track (Loop/Song) + Back: in v1.80 they had no visible target (no formName element) and Back depended on the replaced bank picker.
- v1.80 Mode/Fret "bass resets range to 1 octave / direction Both" on boot: broke the shared selection; Fret now only does it when the user switches instrument.
- v1.80 8-string "F/E Standard" retune: kept v1.73 values (v1.80's E Standard duplicated Drop E). For Dr. Music.
