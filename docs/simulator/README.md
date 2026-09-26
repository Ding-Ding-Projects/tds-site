# Tower simulator

Source values and derived values are stored separately. Keep unlock cost distinct from in-match placement and upgrade costs. Record units and source-specific exceptions for burst, charge, cooldown, rev-up, abilities, buffs, targeting, defense, splash, mode variants, player count, and rounding.

The current extractor processes all 83 source pages with a `TowerInfobox` and reads regular upgrade rows from the same dated revision snapshot. Each level shows its source revision and the simulator uses the extracted base and regular upgrade damage, interval, range, and detection values. Missing placement costs display as unknown. Towers marked with a special cycle, including Accelerator, do not receive a generic DPS estimate.

For a simple single-hit tower, derive steady-state DPS as damage divided by the attack interval in seconds. This is only a theoretical rate and does not account for target gaps, startup time, overkill, range uptime, or enemy defense. Use a tower-specific cycle formula for burst or charge-based towers and keep the source-listed value separate from simulator estimates.
