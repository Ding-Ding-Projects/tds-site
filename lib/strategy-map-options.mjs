const STANDARD_MAPS = Object.freeze(["Mode default", "Gilded Path", "U-Turn", "Forest Camp", "Derelict Outpost", "Unknown Garden", "Wretched Front", "Outskirts Commune", "Space City"]);
const MODE_MAPS = Object.freeze({
  "Pizza Party": ["Pizza Party"],
  "Badlands II": ["Badlands II"],
  "Polluted Wasteland II": ["Polluted Wasteland II"],
  "Hidden Wave": ["Fungi Island", "Wrecked Battlefield", "Summer Castle"],
  "Challenge Trials": ["Current trial map"],
  PVP: ["Current arena"],
  "Story Mode": ["Current chapter"],
});

export function getStrategyMapOptions(mode) {
  return MODE_MAPS[mode] ?? STANDARD_MAPS;
}

export function getEffectiveStrategyMap(mode, selectedMap) {
  const options = getStrategyMapOptions(mode);
  return options.includes(selectedMap) ? selectedMap : options[0];
}
