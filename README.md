# Void Explorer

Run `npm install`, then `npm run dev`. Build with `npm run build`.

The ship starts stationary. Hold W to fly, release to slow down, or hold S to brake. A/D turns. In space, up/down arrows pitch the ship; Q/E provides independent vertical thrust. Shift boosts. Space pauses, H toggles the HUD, F enters fullscreen, and R resets.

Inside the planet, descent continues to about 150 metres before terrain-following levels the ship, with a minimum clearance of 120 metres. W moves forward, A/D turns, Q/E changes clearance even while stationary, and up/down arrows aim the cannons independently of altitude. Surface cruise speed is 135 m/s; Shift ramps up to 540 m/s (4x). S overrides forward boost and brakes; Q/E vertical thrust still works while braking. Hold Q to climb out of the atmosphere.

Left-drag or one-finger drag looks around the ship through 360 degrees without steering it. Scroll zooms; V restores chase view. Orbit works while paused too.

The orbital view uses a round exterior globe. A complementary pixel transition reveals the interior terrain on entry. Once inside, terrain remains visible through minor climbs and fades to the exterior between 1,200 and 1,800 metres above the entry boundary. Mountains, valleys, teal water and rocks form the surface landscape. Camera and flight use the terrain heightfield for clearance.

The supplied Main.glb is the hero ship. Both reference images and sampled video frames in REFER informed the scene. Distances are compressed at 100 metres per rendered unit. Landing and walking are not implemented. Browser visual verification is pending; current checks cover builds and numerical movement/camera behavior.

Terrain regions: Saffron dunes, Sandstone mesas, Jade riverlands, Emerald lowlands, Azure coast, Violet highlands, Glacial reaches, and Ember caldera. Biome blends produce broad rolling shapes, low dunes, raised plateaus, water channels, polar terrain and three crater volcanoes. Crater floors use emissive lava shading. Vegetated regions contain low groves; rock placement avoids water and lava. The navigation HUD names the current region. All terrain heights remain shared with flight and camera clearance.

Engine lighting scales intensity with the square of ship scale and reduces light range, glow halos and bloom on the surface. This preserves readable hull materials near terrain. The HUD explicitly shows BOOST x4 during acceleration; boost is available with either Shift key, including while using altitude hold.

Mixed landscape update: biome patches are interleaved at shorter travel distances instead of separated into continent-sized regions. Broad mountain ridges border dunes, mesas and green valleys. River trunks and tributaries cut to the shared water surface, including through desert regions. Fifteen localized volcanic fields, including one near the initial approach area, make calderas easier to discover.

Current art direction: a coherent Emerald valley around the initial approach, one meandering Jade river with a tributary and estuary, two broad violet mountain shoulders, and desert beyond the eastern foothills. One volcanic caldera sits away from the main valley. Snow is restricted to high peaks. Muted regional colors and gentler per-face variation replace the earlier dense biome patchwork.

Weapons: hold J or right mouse to fire twin pulse cannons. Hold W + J to fly and fire together; Ctrl is not a game control because Ctrl+W closes the browser tab. The reticle projects the barrel direction without locking to enemies. Land hits carve and scorch craters, remove nearby small scenery, and change the heightfield used by flight and camera clearance. Water hits produce splash flashes. Impacts persist through flight reset until page reload. Nearby hits deepen existing craters, with a 250-metre depth cap and at most 256 distinct crater sites per session. Pause and the menu stop weapon simulation. Left-drag remains camera orbit.

Pulse-cannon update: shots are visible, straight-moving plasma projectiles that converge from the barrels at the manual reticle, with a twin burst every 0.18 seconds. Ground auto-targeting is removed. Aim using the ship heading; the reticle projects the barrel direction. Swept segment collision triggers terrain damage only when a projectile actually reaches the ground. Projectiles expire after seven seconds and freeze with the simulation when paused.

Mission flow: approach Aurelia Veil (G then hold W), spend 20 seconds surveying peacefully, and press Enter when ready to start a three-wave patrol. Clear 2, then 3, then 4 enemies. Waves never overlap; each clear restores shields, repairs 25 hull, clears incoming bolts, and grants a 15-second recovery break. The final clear ends reinforcements. Hold Q to return to orbit and complete the expedition, then explore freely.

Combat: cannons fire manually along the barrel direction without target snapping or automatic lead. A/D turns and up/down aims on the surface; The reticle turns green when the manual shot path intersects an enemy, and flashes on confirmed hits. Enemies launch 2.5 seconds apart, approach visibly, and wait three seconds or more before firing. Slower red bolts, flashing engines, and incoming-fire labels give warning. Enemy shots are spaced at least 1.1 seconds apart globally. Shields regenerate after four seconds without damage; consecutive hits have a 0.65-second damage grace period.

Z/C gives an immediate 0.22-second lateral burst with temporary projectile protection and a 0.7-second recharge. Holding Z/C continues lateral thrust between bursts and repeats the burst when ready. Taps during recharge still provide a short lateral thrust pulse. Evading works in space and at the surface, preserving terrain clearance. The HUD shows recharge and mission progress. Hull depletion leaves the world visible and offers Enter or a button to retry the patrol in place with full health; R restarts the expedition. Losing window focus suspends flight and clears held controls. A visible pause panel appears; a flight key, canvas click, Space, or Resume Flight restores focus suspension. A manual Space pause remains paused until Space or Resume Flight is used. The menu Resume button clears both pause states. Leaving the atmosphere suspends combat.

Feedback refinements: plasma bolts launch at 160 units/s relative to the ship and inherit its actual world velocity; their speed exceeds maximum forward boost even when fired before acceleration. Q/E supplies independent vertical thrust, including while stationary; arrows pitch in space and aim on the surface. The exterior sphere now uses 131,220 triangles with smooth normals and continuous geographic colors; terrain uses 456,020 triangles, and the post-processing targets enable hardware multisampling for cleaner edges.

Return assist: press G while outside the atmosphere to turn smoothly toward Aurelia Veil and travel back at an assisted approach speed. Press G again to cancel; W still adds normal thrust. It disengages automatically at atmospheric entry, then terrain flight resumes. The HUD shows planet distance and RETURN ASSIST.

Steering clarification: A/D and left/right arrows now cancel Return Assist immediately and apply a stronger yaw rate in both space and terrain flight. Return Assist only holds course while no manual steering input is present.

Manual combat tuning: patrol bearings stay independent of player steering, with slower lateral movement and closer formations. Enemy hit volumes have modest padding. Twin shots converge at the manual reticle; neither shots nor aim track a target after launch.

Aiming controls: move the mouse over the flight view to point the cannons, then hold J or right-click to fire. Mouse aiming follows the cursor ray without selecting or tracking enemies. Left-drag still orbits the camera; V centers aim and restores chase view. On the surface, all four arrow keys provide fine cannon aim independently of A/D steering; Q/E controls altitude.

Universe: a seamless, camera-centered 360-degree nebula replaces the near-black background, with cyan/rose clouds, violet dust lanes, 6,500 colored stars, and three distant spiral galaxies. The cloud texture is baked once at startup; the backdrop uses five draw calls, follows the camera without drifting, and fades beneath the planetary atmosphere.
