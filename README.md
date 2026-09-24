# Void Explorer

Run `npm install`, then `npm run dev`. Build with `npm run build`.

The ship starts stationary. Hold W to fly, release to slow down, or hold S to brake. A/D turns. In space, up/down arrows (or Q/E) pitch the ship. Shift boosts. Space pauses, H toggles the HUD, F enters fullscreen, and R resets.

Inside the planet, altitude hold engages below 500 metres. W moves forward, A/D turns gently, and up/down adjusts terrain clearance while thrust is held. Releasing up/down holds the chosen clearance; it does not leave the ship climbing. Surface cruise speed is 135 m/s; holding Shift ramps up to 540 m/s (4x). S overrides boost and brakes. Clearance changes at 90 metres per second. Sustained ascent can leave the atmosphere, but small adjustments preserve the terrain view.

Left-drag or one-finger drag looks around the ship through 360 degrees without steering it. Scroll zooms; V restores chase view. Orbit works while paused too.

The orbital view uses a round exterior globe. A complementary pixel transition reveals the interior terrain on entry. Once inside, terrain remains visible through minor climbs and fades to the exterior between 1,200 and 1,800 metres above the entry boundary. Mountains, valleys, teal water and rocks form the surface landscape. Camera and flight use the terrain heightfield for clearance.

The supplied Main.glb is the hero ship. Both reference images and sampled video frames in REFER informed the scene. Distances are compressed at 100 metres per rendered unit. Landing and walking are not implemented. Browser visual verification is pending; current checks cover builds and numerical movement/camera behavior.

Terrain regions: Saffron dunes, Sandstone mesas, Jade riverlands, Emerald lowlands, Azure coast, Violet highlands, Glacial reaches, and Ember caldera. Biome blends produce broad rolling shapes, low dunes, raised plateaus, water channels, polar terrain and three crater volcanoes. Crater floors use emissive lava shading. Vegetated regions contain low groves; rock placement avoids water and lava. The navigation HUD names the current region. All terrain heights remain shared with flight and camera clearance.

Engine lighting scales intensity with the square of ship scale and reduces light range, glow halos and bloom on the surface. This preserves readable hull materials near terrain. The HUD explicitly shows BOOST x4 during acceleration; boost is available with either Shift key, including while using altitude hold.

Mixed landscape update: biome patches are interleaved at shorter travel distances instead of separated into continent-sized regions. Broad mountain ridges border dunes, mesas and green valleys. River trunks and tributaries cut to the shared water surface, including through desert regions. Fifteen localized volcanic fields, including one near the initial approach area, make calderas easier to discover.

Current art direction: a coherent Emerald valley around the initial approach, one meandering Jade river with a tributary and estuary, two broad violet mountain shoulders, and desert beyond the eastern foothills. One volcanic caldera sits away from the main valley. Snow is restricted to high peaks. Muted regional colors and gentler per-face variation replace the earlier dense biome patchwork.

Weapons: hold Ctrl or right mouse to fire twin pulse cannons. The reticle indicates the current ground lock; the terrain camera supplies a ground target when looking along the horizon. Land hits carve and scorch craters, remove nearby small scenery, and change the heightfield used by flight and camera clearance. Water hits produce splash flashes. Impacts persist through flight reset until page reload. Nearby hits deepen existing craters, with a 250-metre depth cap and at most 256 distinct crater sites per session. Pause and the menu stop weapon simulation. Left-drag remains camera orbit.

Pulse-cannon update: shots are now visible, straight-moving plasma projectiles fired from the barrels, with a twin burst every 0.18 seconds. Ground auto-targeting is removed. Aim using the ship heading; the reticle projects the barrel direction. Swept segment collision triggers terrain damage only when a projectile actually reaches the ground. Projectiles expire after seven seconds and freeze with the simulation when paused.

Atmospheric combat: a three-ship patrol uses the supplied Corvette_03.fbx and Frigate_01.fbx with the shared T_Spase_64 texture. Enemies appear during low-altitude flight, maneuver above terrain, and fire visible red bolts after a warning period. Player shots damage enemies before terrain when an enemy is the nearer collision. A small forward aim-assist cone leads nearby targets. HUD markers show enemy health; player shields regenerate after six seconds without damage. Hull depletion disables the ship; R restarts combat and flight. Leaving low-altitude flight suspends the patrol. Defeating all three clears the encounter; no automatic endless waves. Original model/license files remain in enemies.

Escalating combat replaces the single patrol: five enemies in wave 1, then two more per wave up to 24 per group. Reinforcements arrive about every 25 seconds, gradually shortening to 18 seconds; clearing all hostiles brings the next wave in five seconds. Health, damage, fire rate and movement improve with tier. Frigates become more common, and the supplied Frigate_05 model represents heavy dreadnoughts from wave 3 onward. At most 24 hostiles fight simultaneously; additional ships queue and enter as slots open. Leaving the atmosphere pauses the encounter clock and preserves difficulty. R resets waves and player health.

Reinforcement arrival: wave members launch at 0.55-second intervals from roughly 10-14 km away, with approach trails and inbound distance markers. They physically fly toward the encounter, slow near their combat positions, and cannot fire until arrival plus a short arming delay. A brief material fade hides their initial creation at long range. Incoming ships count toward the 24-active-ship budget; queued reinforcements use the same distant approach.
