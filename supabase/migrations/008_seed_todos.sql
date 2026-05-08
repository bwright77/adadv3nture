-- ============================================================
-- adadv3nture — Todos Seed Data
-- All home category (covers house + truck per portfolio model)
-- Truck items prefixed with [TRUCK] in title for filtering
-- ============================================================

insert into todos (user_id, category, title, notes, weather_required, effort, who_required, priority_order, status) values

-- ============================================================
-- HOUSE
-- ============================================================

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Trim tree back from chimney',
 'Safety priority — do before summer. Check fire clearance. Morning only before afternoon winds. Tools: ladder, loppers, pruning saw.',
 'sunny', 'half_day', 'solo', 10, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Redo swamp cooler lines',
 'Coordinate with Peter before first hot week. Call him to set a date. Confirm new lines + fittings with Peter first.',
 'dry', 'full_day', 'peter', 20, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Fix backsplash window',
 '30-min assessment before buying anything. Good rainy day task. Likely caulk + trim pieces.',
 'any', 'half_day', 'solo', 30, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Redo tarp hang points',
 'Assess current setup first. Order hardware if needed — eye bolts, cord, anchors.',
 'dry', 'quick', 'solo', 40, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Fix garage trim',
 'Measure first. Caulk needs 24hr dry — check forecast. Paint matching may require Sherwin-Williams trip.',
 'dry', 'quick', 'solo', 50, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Fix north side window trim',
 'Pair with garage trim day — same materials, same caulk. Caulk needs 24hr dry.',
 'dry', 'quick', 'solo', 60, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Redo trim under bedroom window',
 'Good rainy day task. Pair with backsplash window if in a groove. Trim, interior caulk, paint.',
 'any', 'quick', 'solo', 70, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Fix soffit trim buttresses',
 'Assess solo first then decide if Richard needed depending on height/access. Trim, fasteners, caulk, paint.',
 'dry', 'half_day', 'richard', 80, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Bedroom closet — planning phase only',
 '60-day horizon project. Measure, sketch, get contractor quotes. Decide DIY or hire before committing.',
 'any', 'multi_day', 'hire', 90, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Kids room: hooks + tighten bunk beds',
 'Let kids pick the hooks — buy-in helps. Wall anchors + wrench. Quick win, do on a weekday morning.',
 'any', 'quick', 'solo', 100, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Living room: replace sconces + cable management',
 'Research sconces first — style decision. Cable management can happen independently. Two sub-tasks: do cable mgmt first, sconces second.',
 'any', 'half_day', 'solo', 110, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Yard: patch grass',
 'Do while temps still mild. Grass seed, topsoil.',
 'dry', 'quick', 'solo', 120, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Yard: weed tree lawn',
 'Independent of grass patch. Weed killer or hand pull.',
 'any', 'quick', 'solo', 130, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Yard: turn garden beds',
 'Before planting season. Garden tools, compost if adding.',
 'any', 'quick', 'solo', 140, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Replace playground wood chips with turf',
 'Biggest outdoor project. Get quotes first — may be worth hiring out. Do after grass patching.',
 'dry', 'multi_day', 'hire', 150, 'todo'),

-- ============================================================
-- TRUCK (FJ62 V3NTRUS)
-- ============================================================

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: fix rear left taillight wiring',
 'Diagnose with multimeter first — likely grounding issue or broken lead at assembly. Assembly already replaced so wire is the culprit. Richard may help.',
 'any', 'quick', 'solo', 160, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: fix gas gauge — sender unit diagnosis',
 'Reads empty at 50% = almost certainly the sender float in the tank. Test resistance at sender connector first. If bad, drop tank and replace. Toyota sender widely available. Do before any long mountain drive.',
 'any', 'half_day', 'solo', 170, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: source double DIN mount bracket (005-L and 005-R)',
 'OEM Toyota part numbers: 86211-90A06 (left) and 86212-90A03 (right). Currently talking to CruiserParts.net. Also try IH8MUD classifieds and eBay. Do NOT pull the dash until this is solved.',
 'any', 'quick', 'solo', 180, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: clean headliner',
 'Try deep clean first with Folex + stiff brush before considering replacement. Work in sections, may take 2 passes. If it does not come clean, TMI Products makes an FJ62-specific replacement kit.',
 'any', 'half_day', 'solo', 190, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: driver seat — assess and decide repair vs replace',
 'Check foam integrity, fabric tears, frame condition. FJ62 seats findable at junkyards. Reupholstery kits exist. Decide before spending anything.',
 'any', 'quick', 'solo', 200, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: dent pulling — panel by panel',
 'Start with worst structural dents first, cosmetic second. Work one panel per session. Pull slow, check progress. Tools: slide hammer dent puller, body hammer, dolly.',
 'sunny', 'half_day', 'solo', 210, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: Bondo + skim coat — panel by panel',
 'Apply after dent pulling each panel. Bondo only where metal is compromised. Feather edges well. Temp must be 50F+ — Bondo will not cure below that.',
 'sunny', 'half_day', 'solo', 220, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: spot prime — bare metal protection',
 'Prime bare metal and Bondo spots after sanding. Self-etching primer rattle can. Does not have to be perfect — just protecting the metal.',
 'sunny', 'quick', 'solo', 230, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: panel-match paint — worst panels',
 'Patina preserve approach — match aged gray, not showroom. Get color matched at auto paint shop. Panel by panel, worst structural panels first.',
 'sunny', 'half_day', 'solo', 240, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: full dash pull — stereo + soundproofing + wiring',
 'One tear-down, do everything: connect parking brake wire to brake signal, run RCA cables to rear for amp, install mount + head unit, soundproof firewall. BLOCKED until 005-L/005-R brackets arrive.',
 'any', 'full_day', 'solo', 250, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: soundproofing throughout',
 'Noico over Dynamat — 60% of price, 80% of performance. Floor and firewall during dash pull. Doors when pulling panels for bodywork. Coordinate with dash pull session.',
 'any', 'full_day', 'solo', 260, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: tailgate upgrade — Mountain Hatch cutting board panel',
 'Replace carpet/cardboard with Mountain Hatch FDA-approved half-inch plastic overlay. No modification required. mountainhatch.org — FJ62 specific.',
 'any', 'quick', 'solo', 270, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: Orikawa interior quarter panels',
 'Replace rear cardboard/carpet panels. orikawa.net — FJ62 specific set. Coordinate with headliner and soundproofing work for clean interior refresh.',
 'any', 'half_day', 'solo', 280, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: rear speaker cages + modern drivers',
 'Source OEM cage assemblies: speaker box 86151-90K01, outer grille 86269-90K01. Drop in Kicker 6.5" or Polk DB652 — trim 4 frame tabs so OEM grille fits. Pairs with Orikawa quarter panels.',
 'any', 'half_day', 'solo', 290, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: amplifier + subwoofer install',
 'Plan amp location first — under rear seat or cargo area. Run power wire from battery through firewall DURING dash pull session. Amp/sub is its own session after that.',
 'any', 'full_day', 'solo', 300, 'todo'),

('a2bcae76-355c-4771-949f-2a5928b056ff', 'home', 'Truck: panel replacements — welded panels',
 'Need MIG welder ($400-600 Hobart/Lincoln) OR hire local fab shop for specific panels. Get quote first. Do not let this block all other bodywork.',
 'dry', 'full_day', 'hire', 310, 'todo');
